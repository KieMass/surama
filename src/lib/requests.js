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
  PENDING_COMPLETION: 'pending_completion',
  DISPUTED: 'disputed',
}

export const STATUS_LABEL = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  completed: 'Completed',
  cancelled: 'Cancelled',
  pending_completion: 'Awaiting Confirmation',
  disputed: 'Disputed',
}

export const STATUS_BADGE = {
  pending: 'bg-amber-50 text-amber-700 border border-amber-100',
  accepted: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  declined: 'bg-red-50 text-red-700 border border-red-100',
  completed: 'bg-primary-50 text-primary-700 border border-primary-100',
  cancelled: 'bg-gray-100 text-gray-500 border border-gray-200',
  pending_completion: 'bg-purple-50 text-purple-700 border border-purple-100',
  disputed: 'bg-orange-50 text-orange-700 border border-orange-100',
}

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

export async function getRequestsForConsumer(consumerId) {
  const q = query(collection(db, 'requests'), where('consumerId', '==', consumerId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function getRequestsForProvider(providerId) {
  const q = query(collection(db, 'requests'), where('providerId', '==', providerId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function updateRequestStatus(requestId, status) {
  return updateDoc(doc(db, 'requests', requestId), {
    status,
    updatedAt: serverTimestamp(),
  })
}

// Provider signals the job is done — moves to pending_completion so the
// consumer can confirm. Records when the request was made for the 2-day
// auto-confirm timer.
export async function requestCompletion(requestId) {
  return updateDoc(doc(db, 'requests', requestId), {
    status: REQUEST_STATUS.PENDING_COMPLETION,
    completionRequestedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

// Consumer (or auto-confirm after 2 days) confirms the job is done.
export async function confirmCompletion(requestId) {
  return updateDoc(doc(db, 'requests', requestId), {
    status: REQUEST_STATUS.COMPLETED,
    completedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

// Consumer disputes the provider's completion claim.
export async function disputeCompletion(requestId) {
  return updateDoc(doc(db, 'requests', requestId), {
    status: REQUEST_STATUS.DISPUTED,
    disputedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function updateRequestDetails(requestId, { providerNotes, scheduledDate }) {
  return updateDoc(doc(db, 'requests', requestId), {
    providerNotes,
    scheduledDate,
    updatedAt: serverTimestamp(),
  })
}

export function sortByNewest(requests) {
  return [...requests].sort((a, b) => {
    const aMs = a.createdAt?.toMillis?.() ?? 0
    const bMs = b.createdAt?.toMillis?.() ?? 0
    return bMs - aMs
  })
}
