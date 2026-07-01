import {
  collection,
  addDoc,
  doc,
  updateDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'

export const REQUEST_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
}

export const STATUS_LABEL = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

// Tailwind classes for status badges — kept here so every page renders
// statuses identically without copy-pasting the color map.
export const STATUS_BADGE = {
  pending: 'bg-amber-50 text-amber-700 border border-amber-100',
  accepted: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  declined: 'bg-red-50 text-red-700 border border-red-100',
  completed: 'bg-primary-50 text-primary-700 border border-primary-100',
  cancelled: 'bg-gray-100 text-gray-500 border border-gray-200',
}

/**
 * Creates a new service request (a consumer asking a provider to fulfil a listing).
 */
export async function createRequest({
  service,
  consumerId,
  consumerName,
  consumerEmail,
  message,
  preferredDate,
}) {
  return addDoc(collection(db, 'requests'), {
    serviceId: service.id,
    serviceTitle: service.title,
    serviceCategory: service.category ?? null,
    price: service.price ?? null,
    currency: service.currency ?? 'GYD',
    providerId: service.providerId,
    consumerId,
    consumerName,
    consumerEmail,
    message: message || '',
    preferredDate: preferredDate || '',
    status: REQUEST_STATUS.PENDING,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

/** Fetch every request a given consumer has made. */
export async function getRequestsForConsumer(consumerId) {
  const q = query(collection(db, 'requests'), where('consumerId', '==', consumerId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

/** Fetch every request sent to a given provider (across all their listings). */
export async function getRequestsForProvider(providerId) {
  const q = query(collection(db, 'requests'), where('providerId', '==', providerId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

/** Update a request's status (accept / decline / complete / cancel). */
export async function updateRequestStatus(requestId, status) {
  return updateDoc(doc(db, 'requests', requestId), {
    status,
    updatedAt: serverTimestamp(),
  })
}

/** Sort newest first — Firestore timestamps expose .toMillis(); fall back gracefully. */
export function sortByNewest(requests) {
  return [...requests].sort((a, b) => {
    const aMs = a.createdAt?.toMillis?.() ?? 0
    const bMs = b.createdAt?.toMillis?.() ?? 0
    return bMs - aMs
  })
}
