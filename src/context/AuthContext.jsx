import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
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
        const data = snap.exists() ? snap.data() : null

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
