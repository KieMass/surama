import {
  doc, getDoc, setDoc, addDoc, collection,
  query, where, orderBy, onSnapshot, serverTimestamp, updateDoc,
} from 'firebase/firestore'
import { db } from '../firebase'

// Deterministic ID so the same two parties on the same service always get one thread
export function buildConversationId(consumerId, providerId, serviceId) {
  return `${consumerId}__${providerId}__${serviceId ?? 'general'}`
}

export async function getOrCreateConversation({
  consumerId, consumerName,
  providerId, providerName,
  serviceId, serviceTitle,
}) {
  const id = buildConversationId(consumerId, providerId, serviceId)
  const ref = doc(db, 'conversations', id)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    await setDoc(ref, {
      consumerId,
      consumerName: consumerName ?? '',
      providerId,
      providerName: providerName ?? '',
      serviceId: serviceId ?? null,
      serviceTitle: serviceTitle ?? null,
      participants: [consumerId, providerId],
      lastMessage: '',
      lastMessageAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    })
  }
  return id
}

export async function sendMessage(conversationId, { senderId, senderName, text }) {
  await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
    senderId,
    senderName,
    text,
    createdAt: serverTimestamp(),
  })
  // Mark the sender as having read their own message so their inbox count stays 0.
  await updateDoc(doc(db, 'conversations', conversationId), {
    lastMessage: text,
    lastMessageAt: serverTimestamp(),
    lastMessageBy: senderId,
    [`readBy.${senderId}`]: serverTimestamp(),
  })
}

// Call when a user opens a chat — clears the unread signal for that conversation.
export async function markConversationRead(conversationId, userId) {
  return updateDoc(doc(db, 'conversations', conversationId), {
    [`readBy.${userId}`]: serverTimestamp(),
  })
}

export function subscribeToMessages(conversationId, callback) {
  const q = query(
    collection(db, 'conversations', conversationId, 'messages'),
    orderBy('createdAt', 'asc')
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}

export function subscribeToConversations(userId, callback) {
  // No orderBy here — combining array-contains with orderBy needs a composite
  // index. Sort client-side instead so the query works without extra setup.
  const q = query(
    collection(db, 'conversations'),
    where('participants', 'array-contains', userId)
  )
  return onSnapshot(q, (snap) => {
    const sorted = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.lastMessageAt?.toMillis?.() ?? 0) - (a.lastMessageAt?.toMillis?.() ?? 0))
    callback(sorted)
  })
}
