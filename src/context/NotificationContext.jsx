import { createContext, useContext, useEffect, useState } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from './AuthContext'

const NotificationContext = createContext({ inboxCount: 0, requestCount: 0 })

export function NotificationProvider({ children }) {
  const { user, userDoc } = useAuth()
  const [inboxCount, setInboxCount]     = useState(0)
  const [requestCount, setRequestCount] = useState(0)

  useEffect(() => {
    if (!user?.uid) {
      setInboxCount(0)
      setRequestCount(0)
      return
    }

    const unsubs = []

    // Unread conversations: lastMessageAt is newer than what this user last read,
    // and the last message wasn't sent by this user.
    const convQ = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid)
    )
    unsubs.push(
      onSnapshot(
        convQ,
        (snap) => {
          const count = snap.docs.filter((d) => {
            const data = d.data()
            if (!data.lastMessageAt || data.lastMessageBy === user.uid) return false
            const lastMsg  = data.lastMessageAt?.toMillis?.() ?? 0
            const lastRead = data.readBy?.[user.uid]?.toMillis?.() ?? 0
            return lastMsg > lastRead
          }).length
          setInboxCount(count)
        },
        () => setInboxCount(0)
      )
    )

    // Action-required requests — differs by role.
    const role = userDoc?.role
    if (role === 'provider') {
      const q = query(collection(db, 'requests'), where('providerId', '==', user.uid))
      unsubs.push(
        onSnapshot(
          q,
          (snap) => {
            const count = snap.docs.filter((d) => {
              const { status, priceProposedBy } = d.data()
              return (
                status === 'pending' ||
                (status === 'price_proposed' && priceProposedBy === 'consumer') ||
                status === 'disputed'
              )
            }).length
            setRequestCount(count)
          },
          () => setRequestCount(0)
        )
      )
    } else if (role === 'consumer') {
      const q = query(collection(db, 'requests'), where('consumerId', '==', user.uid))
      unsubs.push(
        onSnapshot(
          q,
          (snap) => {
            const now = Date.now()
            const HOUR = 60 * 60 * 1000
            const count = snap.docs.filter((d) => {
              const { status, priceProposedBy, updatedAt } = d.data()
              const age = now - (updatedAt?.toMillis?.() ?? 0)
              // Always badge: provider proposed price or marked job complete
              if (status === 'price_proposed' && priceProposedBy === 'provider') return true
              if (status === 'pending_completion') return true
              // Timed badge: provider accepted (48h) or declined (7 days)
              if (status === 'accepted' && age < 48 * HOUR) return true
              if (status === 'declined' && age < 7 * 24 * HOUR) return true
              return false
            }).length
            setRequestCount(count)
          },
          () => setRequestCount(0)
        )
      )
    }

    return () => unsubs.forEach((u) => u())
  }, [user?.uid, userDoc?.role])

  return (
    <NotificationContext.Provider value={{ inboxCount, requestCount }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  return useContext(NotificationContext)
}
