import { useEffect, useState } from 'react'
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

const PLUGIN_LABELS = {
  mmg: 'MMG',
  paypal: 'PayPal',
  test: 'Test payment (no real money)',
}

// The payment methods this user can pay with, as [{ id, label, mode }].
// The server decides (listPaymentMethods in functions/payments.js): a
// method shows up once its credentials are configured, and while it's in
// sandbox mode only for accounts an admin has marked as payment testers.
// createPaymentSession enforces the same thing, so this list is only about
// not offering buttons that would be refused.
export function usePaymentMethods(uid) {
  const [state, setState] = useState({ uid: null, methods: [] })

  useEffect(() => {
    if (!uid) return
    let cancelled = false
    httpsCallable(functions, 'listPaymentMethods')()
      .then(({ data }) => data, () => [])
      .then((list) => {
        if (cancelled) return
        setState({
          uid,
          methods: list.map((m) => ({
            ...m,
            label: `${PLUGIN_LABELS[m.id] ?? m.id}${m.mode === 'sandbox' && m.id !== 'test' ? ' (sandbox — testers only)' : ''}`,
          })),
        })
      })
    return () => { cancelled = true }
  }, [uid])

  return { methods: state.methods, loading: !!uid && state.uid !== uid }
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
