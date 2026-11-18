import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from '../firebase'

// Phone cameras routinely produce 5–15 MB photos; every image is shrunk in
// the browser before upload so any photo works, pages load fast, and the
// storage.rules 5 MB cap is never the thing a user runs into.
export const AVATAR_MAX_SIZE = 512
export const LISTING_MAX_SIZE = 1600

// What a user may pick before resizing — generous, since the upload is the
// resized copy, not this.
const MAX_INPUT_BYTES = 30 * 1024 * 1024

// Returns a user-facing problem with the chosen file, or '' if it's usable.
export function checkImageFile(file) {
  if (!file.type.startsWith('image/')) return 'Please choose an image file.'
  if (file.size > MAX_INPUT_BYTES) return 'That image is too large (over 30 MB).'
  return ''
}

// Scales an image down so its longest side is at most maxSize and
// re-encodes it as JPEG. Smaller images are re-encoded at their own size
// (still worthwhile: it strips EXIF metadata such as GPS location).
// Rejects with a readable message for formats the browser can't decode
// (e.g. HEIC on desktop Chrome).
export async function resizeImage(file, maxSize, quality = 0.85) {
  let bitmap
  try {
    // imageOrientation applies the EXIF rotation, so phone photos aren't
    // saved sideways.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error('This image format isn’t supported here — try a JPG or PNG.')
  }
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  // JPEG has no transparency — paint white so transparent PNGs don't go black.
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
  if (!blob) throw new Error('Could not process this image — try a different one.')
  return blob
}

// Resizes and uploads one image under `folder` (e.g. "avatars/{uid}"),
// returning its download URL.
export async function uploadResizedImage(file, folder, maxSize) {
  const blob = await resizeImage(file, maxSize)
  const name = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`
  const snap = await uploadBytes(ref(storage, `${folder}/${name}`), blob, { contentType: 'image/jpeg' })
  return getDownloadURL(snap.ref)
}

// ── Listing galleries ────────────────────────────────────────────────────

export const MAX_LISTING_PHOTOS = 6

// A listing's photo URLs in display order. `images` is the gallery; listings
// saved before galleries existed only have the single `imageUrl`.
export function listingPhotoUrls(listing) {
  if (listing?.images?.length) return listing.images
  return listing?.imageUrl ? [listing.imageUrl] : []
}

// Gallery items for the listing forms: already-uploaded photos are
// { key, url }; newly picked files are { key, file, preview }.
export function photosFromListing(listing) {
  return listingPhotoUrls(listing).map((url) => ({ key: url, url }))
}

// Uploads the new files (resized) and returns every photo's URL in display
// order — what gets saved as the listing's `images`.
export function uploadListingPhotos(items, providerId) {
  return Promise.all(items.map((item) => item.url ?? uploadResizedImage(item.file, `listings/${providerId}`, LISTING_MAX_SIZE)))
}

// Best-effort delete by download URL — the file may already be gone, and
// a leftover file is harmless, so failures are swallowed.
export async function deleteImageByUrl(url) {
  if (!url) return
  try {
    await deleteObject(ref(storage, url))
  } catch {
    // Already deleted, or not a Storage URL — nothing to clean up.
  }
}
