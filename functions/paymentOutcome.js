const { getFirestore, FieldValue } = require('firebase-admin/firestore')

// Resolves a pending payment to succeeded/failed/cancelled and reflects it
// onto the parent request — the one place this happens, so confirmTestPayment
// (client-driven) and the PayPal return/webhook handlers (server-driven)
// can't drift apart on what "succeeded" actually updates.
//
// Idempotent: a no-op (returns false) if the payment isn't "pending"
// anymore — PayPal's return-redirect capture and its webhook can both try
// to resolve the same payment, and a webhook can be delivered more than
// once.
async function applyPaymentOutcome(paymentRef, outcome) {
  return getFirestore().runTransaction(async (tx) => {
    const paymentSnap = await tx.get(paymentRef)
    if (!paymentSnap.exists) return false
    const payment = paymentSnap.data()
    if (payment.status !== 'pending') return false

    tx.update(paymentRef, {
      status: outcome,
      updatedAt: FieldValue.serverTimestamp(),
      ...(outcome === 'succeeded' ? { confirmedAt: FieldValue.serverTimestamp() } : {}),
    })

    // Payment status is tracked independently of the request's job-status
    // — paying never changes pending/accepted/completed, it only
    // unlocks/records the money side.
    const reqRef = getFirestore().doc(`requests/${payment.requestId}`)
    if (outcome === 'succeeded') {
      tx.update(reqRef, { paymentStatus: payment.type === 'deposit' ? 'deposit_paid' : 'paid' })
    } else {
      // Failed/cancelled — fall back to the state before this attempt so
      // the consumer can retry.
      tx.update(reqRef, { paymentStatus: payment.type === 'deposit' ? 'unpaid' : 'deposit_paid' })
    }

    return true
  })
}

module.exports = { applyPaymentOutcome }
