import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userDoc, setUserDoc] = useState(null)
  const [loading, setLoading] = useState(true)

  const refreshUserDoc = useCallback(async () => {
    if (!auth.currentUser) return
    const snap = await getDoc(doc(db, 'users', auth.currentUser.uid))
    setUserDoc(snap.exists() ? snap.data() : null)
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await firebaseUser.reload()
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid))
        let data = snap.exists() ? snap.data() : null

        // Account settings' email change sends a confirmation link to the
        // new address rather than updating Auth immediately, and there's no
        // Cloud Function here to react the moment it's clicked — so once
        // Auth's email has actually moved on (the link was clicked, at some
        // point since our last visit), reconcile the Firestore copy here.
        if (data && firebaseUser.email && data.email !== firebaseUser.email) {
          try {
            await updateDoc(doc(db, 'users', firebaseUser.uid), { email: firebaseUser.email })
            data = { ...data, email: firebaseUser.email }
          } catch {
            // Best-effort — worst case the Firestore copy stays stale until
            // the next successful sync attempt.
          }
        }

        // Soft-disabled by an admin — there's no Cloud Function here to
        // revoke the Auth token, so enforce it client-side by signing out
        // as soon as we see the flag (next load / auth state change).
        if (data?.disabled) {
          await signOut(auth)
          setUser(null)
          setUserDoc(null)
          setLoading(false)
          return
        }

        setUser(auth.currentUser)
        setUserDoc(data)
      } else {
        setUser(null)
        setUserDoc(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  return (
    <AuthContext.Provider value={{ user, userDoc, loading, refreshUserDoc }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
