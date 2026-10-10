import { httpsCallable } from 'firebase/functions'
import { doc, getDoc } from 'firebase/firestore'
import { db, functions } from '../firebase'

export const PAYMENT_STATUS_LABEL = {
  unpaid: 'Unpaid',
  deposit_pending: 'Deposit processing…',
  deposit_paid: 'Deposit paid',
  balance_pending: 'Balance processing…',
  paid: 'Paid in full',
}

// Starts a payment session for one leg of a request ('deposit' or
// 'balance') through the given plugin. Returns a redirectUrl: an internal
// app path (e.g. the Test plugin's /pay/test/:id) for an in-app checkout,
// or an external URL for a real plugin — callers should branch on that
// rather than assuming either shape.
export async function createPaymentSession(requestId, type, pluginId) {
  const call = httpsCallable(functions, 'createPaymentSession')
  const { data } = await call({ requestId, type, pluginId })
  return data
}

// Resolves a Test-plugin payment directly (standing in for the webhook a
// real plugin would receive instead). Only ever valid for pluginId "test" —
// the Cloud Function enforces this regardless of what's passed here.
export async function confirmTestPayment(paymentId, outcome) {
  const call = httpsCallable(functions, 'confirmTestPayment')
  const { data } = await call({ paymentId, outcome })
  return data
}

export async function getPayment(paymentId) {
  const snap = await getDoc(doc(db, 'payments', paymentId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}
