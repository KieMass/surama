import { doc, updateDoc } from 'firebase/firestore'
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage'
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  updateProfile,
  verifyBeforeUpdateEmail,
} from 'firebase/auth'
import { auth, db, storage } from '../firebase'

// Updates the account-owner's editable profile fields (name, phone).
export async function updateUserProfile(uid, { name, phone }) {
  await updateDoc(doc(db, 'users', uid), {
    name,
    phone: phone || '',
  })
  if (auth.currentUser && auth.currentUser.displayName !== name) {
    await updateProfile(auth.currentUser, { displayName: name })
  }
}

// Uploads a new display picture, points the user doc + auth profile at it,
// and best-effort deletes the previous photo so storage doesn't accumulate.
export async function uploadAvatar(uid, file, previousUrl) {
  const storageRef = ref(storage, `avatars/${uid}/${Date.now()}_${file.name}`)
  const snap = await uploadBytes(storageRef, file)
  const photoURL = await getDownloadURL(snap.ref)

  await updateDoc(doc(db, 'users', uid), { photoURL })
  if (auth.currentUser) {
    await updateProfile(auth.currentUser, { photoURL })
  }

  if (previousUrl) {
    try {
      await deleteObject(ref(storage, previousUrl))
    } catch {
      // Old file may already be gone, or from a different bucket path — non-fatal.
    }
  }

  return photoURL
}

export async function removeAvatar(uid, previousUrl) {
  await updateDoc(doc(db, 'users', uid), { photoURL: null })
  if (auth.currentUser) {
    await updateProfile(auth.currentUser, { photoURL: null })
  }
  if (previousUrl) {
    try {
      await deleteObject(ref(storage, previousUrl))
    } catch {
      // Non-fatal — see uploadAvatar.
    }
  }
}

// Re-authenticates with the current password (required by Firebase for a
// sensitive op like this), then sets the new one.
export async function changePassword(currentPassword, newPassword) {
  const user = auth.currentUser
  const credential = EmailAuthProvider.credential(user.email, currentPassword)
  await reauthenticateWithCredential(user, credential)
  await updatePassword(user, newPassword)
}

// Re-authenticates, then sends a confirmation link to the NEW address.
// The Auth email doesn't actually change until that link is clicked — this
// project has no Cloud Function to react to that, so AuthContext instead
// reconciles the Firestore users/{uid}.email field against auth.currentUser
// on the next sign-in/reload after the switch is confirmed.
export async function changeEmail(currentPassword, newEmail) {
  const user = auth.currentUser
  const credential = EmailAuthProvider.credential(user.email, currentPassword)
  await reauthenticateWithCredential(user, credential)
  await verifyBeforeUpdateEmail(user, newEmail)
}
