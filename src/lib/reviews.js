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

/**
 * Creates a review for a completed request and rolls the rating into the
 * service doc's aggregate fields (ratingSum / ratingCount) so listing cards
 * can show an average without re-fetching every review.
 */
export async function createReview({ service, requestId, consumerId, consumerName, rating, comment }) {
  await addDoc(collection(db, 'reviews'), {
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
}

/** All reviews left for a given service, newest first is handled by caller. */
export async function getReviewsForService(serviceId) {
  const q = query(collection(db, 'reviews'), where('serviceId', '==', serviceId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

/** Whether a given completed request has already been reviewed. */
export async function hasReviewForRequest(requestId) {
  const q = query(collection(db, 'reviews'), where('requestId', '==', requestId))
  const snap = await getDocs(q)
  return !snap.empty
}

/** Fetch review-state (already reviewed or not) for a batch of request IDs at once. */
export async function getReviewedRequestIds(requestIds) {
  if (requestIds.length === 0) return new Set()
  // Firestore 'in' queries cap at 30 values — chunk defensively.
  const chunks = []
  for (let i = 0; i < requestIds.length; i += 30) chunks.push(requestIds.slice(i, i + 30))

  const ids = new Set()
  for (const chunk of chunks) {
    const q = query(collection(db, 'reviews'), where('requestId', 'in', chunk))
    const snap = await getDocs(q)
    snap.docs.forEach((d) => ids.add(d.data().requestId))
  }
  return ids
}

export function averageRating(service) {
  if (!service?.ratingCount) return null
  return service.ratingSum / service.ratingCount
}
