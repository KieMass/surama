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

// Every plugin the backend knows about. Selectable at checkout is a
// filtered subset — see LIVE_PLUGIN_IDS below.
const ALL_PAYMENT_PLUGINS = [
  { id: 'mmg', label: 'MMG' },
  { id: 'paypal', label: 'PayPal' },
  { id: 'test', label: 'Test payment (no real money)' },
]

// Gated here until each plugin has real credentials configured in the
// deployed Functions environment (functions/.env — see .env.example).
// Without that, selecting PayPal or MMG would fail with a clean but
// unhelpful error, since nothing is configured server-side yet. Add
// 'paypal' and/or 'mmg' back to this set once their credentials are in
// place and each has been verified against its real sandbox.
const LIVE_PLUGIN_IDS = new Set(['test'])

export const PAYMENT_PLUGINS = ALL_PAYMENT_PLUGINS.filter((p) => LIVE_PLUGIN_IDS.has(p.id))

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
