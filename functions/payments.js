const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { getFirestore, FieldValue } = require('firebase-admin/firestore')
const PLUGINS = require('./plugins')

const DEFAULT_SETTINGS = { depositPercent: 25, commissionPercent: 10 }

function roundMoney(n) {
  return Math.round(n * 100) / 100
}

async function getPaymentSettings(db) {
  const snap = await db.doc('settings/payments').get()
  return { ...DEFAULT_SETTINGS, ...(snap.exists ? snap.data() : {}) }
}

// Creates a payment session for one leg (deposit or balance) of a request.
// Reads + validates + stakes out the request's payment state inside a
// transaction so two concurrent calls can't both start a payment for the
// same leg. The actual session (and its redirect) comes from the plugin;
// everything about splitting the commission out is plugin-agnostic.
exports.createPaymentSession = onCall(async (callReq) => {
  const uid = callReq.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.')

  const { requestId, type, pluginId } = callReq.data || {}
  if (!requestId || !['deposit', 'balance'].includes(type) || !pluginId) {
    throw new HttpsError('invalid-argument', 'requestId, type, and pluginId are required.')
  }
  const plugin = PLUGINS[pluginId]
  if (!plugin) throw new HttpsError('invalid-argument', `Unknown payment plugin "${pluginId}".`)

  const db = getFirestore()
  const settings = await getPaymentSettings(db)
  const reqRef = db.doc(`requests/${requestId}`)
  const paymentRef = db.collection('payments').doc()

  const { amount, currency, providerId } = await db.runTransaction(async (tx) => {
    const reqSnap = await tx.get(reqRef)
    if (!reqSnap.exists) throw new HttpsError('not-found', 'Request not found.')
    const reqData = reqSnap.data()

    if (reqData.consumerId !== uid) {
      throw new HttpsError('permission-denied', 'Only the consumer on this request can pay.')
    }
    if (typeof reqData.price !== 'number') {
      throw new HttpsError('failed-precondition', 'This request has no price set yet.')
    }

    let { depositAmount, balanceAmount } = reqData
    const updates = {}
    // Split is computed once per request and then reused for both legs, so
    // an admin changing the platform rate mid-booking can't shift what a
    // request already in flight owes.
    if (depositAmount == null || balanceAmount == null) {
      depositAmount = roundMoney((reqData.price * settings.depositPercent) / 100)
      balanceAmount = roundMoney(reqData.price - depositAmount)
      updates.depositAmount = depositAmount
      updates.balanceAmount = balanceAmount
      updates.depositPercent = settings.depositPercent
    }

    if (type === 'deposit') {
      if (reqData.status !== 'accepted') {
        throw new HttpsError('failed-precondition', 'The provider needs to accept this request before the deposit can be paid.')
      }
      if (reqData.paymentStatus && reqData.paymentStatus !== 'unpaid') {
        throw new HttpsError('failed-precondition', 'A deposit payment has already been started or completed.')
      }
      updates.paymentStatus = 'deposit_pending'
    } else {
      if (!['pending_completion', 'completed'].includes(reqData.status)) {
        throw new HttpsError('failed-precondition', 'The job needs to be marked complete before the balance can be paid.')
      }
      if (reqData.paymentStatus !== 'deposit_paid') {
        throw new HttpsError('failed-precondition', 'The deposit must be paid before the balance.')
      }
      updates.paymentStatus = 'balance_pending'
    }

    tx.update(reqRef, updates)

    return {
      amount: type === 'deposit' ? depositAmount : balanceAmount,
      currency: reqData.currency || 'GYD',
      providerId: reqData.providerId,
    }
  })

  const commissionAmount = roundMoney((amount * settings.commissionPercent) / 100)
  const providerAmount = roundMoney(amount - commissionAmount)

  const session = await plugin.createSession({ paymentId: paymentRef.id, amount, currency })

  await paymentRef.set({
    requestId,
    consumerId: uid,
    providerId,
    type,
    pluginId,
    mode: session.mode ?? 'sandbox',
    amount,
    currency,
    commissionPercent: settings.commissionPercent,
    commissionAmount,
    providerAmount,
    status: 'pending',
    externalSessionId: session.externalSessionId ?? null,
    redirectUrl: session.redirectUrl,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })

  return { paymentId: paymentRef.id, redirectUrl: session.redirectUrl }
})

// Resolves a *test-plugin* payment directly from the client, standing in
// for the webhook a real plugin would receive instead. Hard-restricted to
// pluginId "test" — a real plugin's payment can only move to "succeeded"
// via its own verifyWebhook() path (not built yet), never this callable.
exports.confirmTestPayment = onCall(async (callReq) => {
  const uid = callReq.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.')

  const { paymentId, outcome } = callReq.data || {}
  if (!paymentId || !['succeeded', 'failed', 'cancelled'].includes(outcome)) {
    throw new HttpsError('invalid-argument', 'paymentId and a valid outcome are required.')
  }

  const db = getFirestore()
  const paymentRef = db.doc(`payments/${paymentId}`)

  await db.runTransaction(async (tx) => {
    const paymentSnap = await tx.get(paymentRef)
    if (!paymentSnap.exists) throw new HttpsError('not-found', 'Payment not found.')
    const payment = paymentSnap.data()

    if (payment.pluginId !== 'test') {
      throw new HttpsError('permission-denied', 'Only test payments can be confirmed this way.')
    }
    if (payment.consumerId !== uid) {
      throw new HttpsError('permission-denied', 'Not your payment.')
    }
    if (payment.status !== 'pending') {
      throw new HttpsError('failed-precondition', 'This payment has already been resolved.')
    }

    tx.update(paymentRef, {
      status: outcome,
      updatedAt: FieldValue.serverTimestamp(),
      ...(outcome === 'succeeded' ? { confirmedAt: FieldValue.serverTimestamp() } : {}),
    })

    // Payment status is tracked independently of the request's job-status
    // (pending/accepted/completed/...) — paying never changes the job
    // status itself, it only unlocks/records the money side.
    const reqRef = db.doc(`requests/${payment.requestId}`)
    if (outcome === 'succeeded') {
      tx.update(reqRef, { paymentStatus: payment.type === 'deposit' ? 'deposit_paid' : 'paid' })
    } else {
      // Failed/cancelled — fall back to the state before this attempt so the
      // consumer can retry.
      tx.update(reqRef, { paymentStatus: payment.type === 'deposit' ? 'unpaid' : 'deposit_paid' })
    }
  })

  return { status: outcome }
})
