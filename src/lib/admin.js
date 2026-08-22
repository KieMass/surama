import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'

export const ROLES = ['consumer', 'provider', 'admin']

// Fetches every user document for the admin users table, newest signups
// first. Users lacking a createdAt (e.g. a role hand-set via console)
// sort to the end rather than erroring out an orderBy() query.
export async function fetchAllUsers() {
  const snap = await getDocs(collection(db, 'users'))
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
}

// Soft-disables an account. Firestore-only (there's no Admin SDK / Cloud
// Function in this project to revoke Firebase Auth tokens), so a disabled
// user is signed out the next time AuthContext observes their doc — on
// their next page load or auth state change, not instantly mid-session.
export async function setUserDisabled(uid, disabled) {
  await updateDoc(doc(db, 'users', uid), { disabled })
}

export async function setUserRole(uid, role) {
  await updateDoc(doc(db, 'users', uid), { role })
}
