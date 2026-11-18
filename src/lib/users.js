import { doc, updateDoc } from 'firebase/firestore'
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  updateProfile,
  verifyBeforeUpdateEmail,
} from 'firebase/auth'
import { auth, db } from '../firebase'
import { AVATAR_MAX_SIZE, uploadResizedImage, deleteImageByUrl } from './images'
import { syncProfile } from './profiles'

// Updates the account-owner's editable profile fields (name, phone).
// photoURL is the current photo, passed through so the public profile
// keeps it alongside the new name.
export async function updateUserProfile(uid, { name, phone, photoURL }) {
  await updateDoc(doc(db, 'users', uid), {
    name,
    phone: phone || '',
  })
  if (auth.currentUser && auth.currentUser.displayName !== name) {
    await updateProfile(auth.currentUser, { displayName: name })
  }
  await syncProfile(uid, { name, photoURL })
}

// Uploads a new display picture (shrunk in the browser first — see
// lib/images.js), points the user doc, auth profile and public profile at
// it, and best-effort deletes the previous photo so storage doesn't
// accumulate.
export async function uploadAvatar(uid, file, previousUrl, name) {
  const photoURL = await uploadResizedImage(file, `avatars/${uid}`, AVATAR_MAX_SIZE)

  await updateDoc(doc(db, 'users', uid), { photoURL })
  if (auth.currentUser) {
    await updateProfile(auth.currentUser, { photoURL })
  }
  await syncProfile(uid, { name, photoURL })
  await deleteImageByUrl(previousUrl)

  return photoURL
}

export async function removeAvatar(uid, previousUrl, name) {
  await updateDoc(doc(db, 'users', uid), { photoURL: null })
  if (auth.currentUser) {
    await updateProfile(auth.currentUser, { photoURL: null })
  }
  await syncProfile(uid, { name, photoURL: null })
  await deleteImageByUrl(previousUrl)
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
