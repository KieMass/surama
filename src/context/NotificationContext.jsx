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
            const count = snap.docs.filter((d) => {
              const { status, priceProposedBy } = d.data()
              return (
                (status === 'price_proposed' && priceProposedBy === 'provider') ||
                status === 'pending_completion'
              )
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
