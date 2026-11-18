// End-to-end check of photo uploads and moderation against the local
// emulators — Firestore rules (public profiles, listing galleries, admin
// photo removal) and Storage rules (who may upload or delete what, including
// the admin check Storage reads across from Firestore). Driven through the
// same client SDK calls the app makes, not mocks.
//
// Run with `npm run test:images` — it starts the emulators, seeds them,
// runs this, and shuts everything down.

import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { getStorage, connectStorageEmulator, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'

const app = initializeApp({ apiKey: 'demo-api-key', projectId: 'demo-surama', storageBucket: 'demo-surama.appspot.com' })
const auth = getAuth(app)
const db = getFirestore(app)
const storage = getStorage(app)
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
connectFirestoreEmulator(db, '127.0.0.1', 8080)
connectStorageEmulator(storage, '127.0.0.1', 9199)

let failures = 0
function check(label, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok || !detail ? '' : ` — ${detail}`}`)
  if (!ok) failures++
}

async function expectOk(label, promise) {
  try {
    const value = await promise
    check(label, true)
    return value
  } catch (err) {
    check(label, false, err.code ?? err.message)
  }
}

async function expectDenied(label, promise) {
  try {
    await promise
    check(label, false, 'expected a denial, call succeeded')
  } catch (err) {
    check(label, ['permission-denied', 'storage/unauthorized'].includes(err.code), `got ${err.code}`)
  }
}

const signInAs = (role) => signInWithEmailAndPassword(auth, `${role}@test.local`, 'password123')

// A tiny stand-in for a resized photo — the rules check type and size, not pixels.
const JPEG = new Uint8Array(1024).fill(0xff)
async function upload(path, contentType = 'image/jpeg', bytes = JPEG) {
  const snap = await uploadBytes(ref(storage, path), bytes, { contentType })
  return getDownloadURL(snap.ref)
}

// ── Consumer: avatar upload and public profile ─────────────────────────────
await signInAs('consumer')

const avatarUrl = await expectOk('consumer can upload their own avatar', upload('avatars/test-consumer/me.jpg'))
await expectDenied('a non-image upload is rejected', upload('avatars/test-consumer/notes.txt', 'text/plain'))
await expectDenied('an over-5 MB upload is rejected', upload('avatars/test-consumer/huge.jpg', 'image/jpeg', new Uint8Array(5 * 1024 * 1024 + 1)))
await expectDenied('consumer cannot upload into someone else\'s avatar folder', upload('avatars/test-provider/x.jpg'))

await expectOk('consumer can publish their profile with their uploaded photo',
  setDoc(doc(db, 'profiles', 'test-consumer'), { name: 'Test Consumer', photoURL: avatarUrl }))
await expectDenied('a profile photo hotlinked from another site is rejected',
  setDoc(doc(db, 'profiles', 'test-consumer'), { name: 'Test Consumer', photoURL: 'https://example.com/photo.jpg' }))
await expectDenied('a profile photo from someone else\'s avatar folder is rejected',
  setDoc(doc(db, 'profiles', 'test-consumer'), { name: 'Test Consumer', photoURL: avatarUrl.replace('test-consumer', 'test-provider') }))
await expectDenied('extra profile fields are rejected',
  setDoc(doc(db, 'profiles', 'test-consumer'), { name: 'Test Consumer', photoURL: null, role: 'admin' }))
await expectDenied('consumer cannot write someone else\'s profile',
  setDoc(doc(db, 'profiles', 'test-provider'), { name: 'Hijacked', photoURL: null }))
await signOut(auth)

// ── Signed-out visitor ─────────────────────────────────────────────────────
{
  const profile = await expectOk('signed-out visitors can read public profiles', getDoc(doc(db, 'profiles', 'test-consumer')))
  check('the public profile carries the photo', profile?.data()?.photoURL === avatarUrl)
  await expectDenied('signed-out visitors still cannot read private user docs', getDoc(doc(db, 'users', 'test-consumer')))
}

// ── Provider: listing gallery ──────────────────────────────────────────────
await signInAs('provider')
const listingPhotos = []
for (let i = 0; i < 2; i++) listingPhotos.push(await upload(`listings/test-provider/${i}.jpg`))
check('provider can upload listing photos', listingPhotos.length === 2)

await expectOk('provider can save a gallery on their listing',
  updateDoc(doc(db, 'services', 'test-service'), { images: listingPhotos, imageUrl: listingPhotos[0] }))
await expectDenied('a gallery of more than 6 photos is rejected',
  updateDoc(doc(db, 'services', 'test-service'), { images: Array(7).fill(listingPhotos[0]) }))
await signOut(auth)

await signInAs('consumer')
await expectDenied('consumer cannot delete a provider\'s listing photo', deleteObject(ref(storage, listingPhotos[1])))
await signOut(auth)

// ── Admin: moderation ──────────────────────────────────────────────────────
await signInAs('admin')
await expectOk('admin can remove a photo from a listing\'s gallery',
  updateDoc(doc(db, 'services', 'test-service'), { images: [listingPhotos[0]], imageUrl: listingPhotos[0] }))
await expectOk('admin can delete the removed listing photo file', deleteObject(ref(storage, listingPhotos[1])))
await expectDenied('admin still cannot edit a listing\'s other details',
  updateDoc(doc(db, 'services', 'test-service'), { title: 'Edited by admin' }))

await expectOk('admin can clear a user\'s photo', updateDoc(doc(db, 'users', 'test-consumer'), { photoURL: null }))
await expectDenied('admin cannot set a user\'s photo to something else',
  updateDoc(doc(db, 'users', 'test-consumer'), { photoURL: 'https://example.com/photo.jpg' }))
await expectOk('admin can clear a public profile photo', updateDoc(doc(db, 'profiles', 'test-consumer'), { photoURL: null }))
await expectDenied('admin cannot rename a public profile', updateDoc(doc(db, 'profiles', 'test-consumer'), { name: 'Renamed' }))
await expectOk('admin can delete the user\'s avatar file', deleteObject(ref(storage, avatarUrl)))
await signOut(auth)

console.log(failures ? `\n${failures} check(s) failed.` : '\nAll image checks passed.')
process.exit(failures ? 1 : 0)
