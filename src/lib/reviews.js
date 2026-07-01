import {
  collection,
  addDoc,
  doc,
  updateDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  increment,
} from 'firebase/firestore'
import { db } from '../firebase'

export async function createReview({ service, requestId, consumerId, consumerName, rating, comment }) {
  const ref = await addDoc(collection(db, 'reviews'), {
    serviceId: service.id,
    providerId: service.providerId,
    requestId,
    consumerId,
    consumerName,
    rating,
    comment: comment || '',
    createdAt: serverTimestamp(),
  })

  await updateDoc(doc(db, 'services', service.id), {
    ratingSum: increment(rating),
    ratingCount: increment(1),
  })

  return ref.id
}

export async function updateReview(reviewId, serviceId, { rating, comment, oldRating }) {
  await updateDoc(doc(db, 'reviews', reviewId), {
    rating,
    comment: comment || '',
    updatedAt: serverTimestamp(),
  })
  // Adjust aggregate by the difference — count stays the same
  await updateDoc(doc(db, 'services', serviceId), {
    ratingSum: increment(rating - oldRating),
  })
}

export async function getReviewsForService(serviceId) {
  const q = query(collection(db, 'reviews'), where('serviceId', '==', serviceId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function hasReviewForRequest(requestId) {
  const q = query(collection(db, 'reviews'), where('requestId', '==', requestId))
  const snap = await getDocs(q)
  return !snap.empty
}

// Returns Map<requestId, { id: reviewId, rating, comment }>
export async function getReviewedRequestIds(requestIds) {
  if (requestIds.length === 0) return new Map()
  const chunks = []
  for (let i = 0; i < requestIds.length; i += 30) chunks.push(requestIds.slice(i, i + 30))

  const map = new Map()
  for (const chunk of chunks) {
    const q = query(collection(db, 'reviews'), where('requestId', 'in', chunk))
    const snap = await getDocs(q)
    snap.docs.forEach((d) => {
      const data = d.data()
      map.set(data.requestId, { id: d.id, rating: data.rating, comment: data.comment ?? '' })
    })
  }
  return map
}

export function averageRating(service) {
  if (!service?.ratingCount) return null
  return service.ratingSum / service.ratingCount
}
