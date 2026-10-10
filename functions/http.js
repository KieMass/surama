const { onRequest } = require('firebase-functions/v2/https')
const { getFirestore } = require('firebase-admin/firestore')
const paypal = require('./plugins/paypal')
const mmg = require('./plugins/mmg')
const { applyPaymentOutcome } = require('./paymentOutcome')

// Where the consumer actually lands after a redirect-based plugin
// resolves — set via functions/.env (see .env.example). Falls back to
// localhost so this doesn't crash in dev before it's configured.
const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:5173'

function redirectToResult(res, status) {
  res.redirect(302, `${APP_BASE_URL}/pay/result?status=${status}`)
}

// PayPal sends the browser here (GET) after the consumer approves on
// PayPal's site. Captures the order server-side — that call, not the mere
// fact that the browser came back, is what's actually authoritative.
exports.paypalReturn = onRequest(async (req, res) => {
  const { paymentId, token: orderId } = req.query
  if (!paymentId || !orderId) return redirectToResult(res, 'failed')

  const db = getFirestore()
  const paymentRef = db.doc(`payments/${paymentId}`)
  const paymentSnap = await paymentRef.get()
  if (!paymentSnap.exists) return redirectToResult(res, 'failed')
  const payment = paymentSnap.data()

  if (payment.pluginId !== 'paypal' || payment.externalSessionId !== orderId) {
    return redirectToResult(res, 'failed')
  }
  if (payment.status !== 'pending') {
    // Already resolved — most likely the webhook beat us here. Reflect
    // whatever it decided rather than re-capturing.
    return redirectToResult(res, payment.status === 'succeeded' ? 'succeeded' : 'failed')
  }

  let captured = false
  try {
    const result = await paypal.captureOrder(orderId)
    captured = result.succeeded
  } catch {
    captured = false
  }

  await applyPaymentOutcome(paymentRef, captured ? 'succeeded' : 'failed')
  redirectToResult(res, captured ? 'succeeded' : 'failed')
})

// PayPal sends the browser here if the consumer backs out on PayPal's site
// instead of approving.
exports.paypalCancel = onRequest(async (req, res) => {
  const { paymentId } = req.query
  if (paymentId) {
    await applyPaymentOutcome(getFirestore().doc(`payments/${paymentId}`), 'cancelled')
  }
  redirectToResult(res, 'cancelled')
})

// Asynchronous, server-to-server confirmation from PayPal — a safety net
// for cases where the consumer closes the browser before the return
// redirect completes but PayPal still captured the payment. Verifies the
// request really came from PayPal before acting on it; applyPaymentOutcome
// is idempotent, so it's safe if this fires after (or instead of, or as
// well as) paypalReturn already resolved the same payment.
exports.paypalWebhook = onRequest(async (req, res) => {
  let verified = false
  try {
    verified = await paypal.verifyWebhookSignature(req.headers, req.body)
  } catch {
    verified = false
  }
  if (!verified) return res.status(400).send('Invalid signature')

  const event = req.body
  const orderId = event?.resource?.supplementary_data?.related_ids?.order_id
    ?? (event?.resource?.id && event?.event_type?.startsWith('CHECKOUT.ORDER.') ? event.resource.id : null)

  if (!orderId || !['PAYMENT.CAPTURE.COMPLETED', 'PAYMENT.CAPTURE.DENIED'].includes(event.event_type)) {
    // Nothing for us to do with this event type — ack so PayPal stops retrying.
    return res.status(200).send('ignored')
  }

  const db = getFirestore()
  const matches = await db.collection('payments').where('externalSessionId', '==', orderId).limit(1).get()
  if (matches.empty) return res.status(200).send('no matching payment')

  const outcome = event.event_type === 'PAYMENT.CAPTURE.COMPLETED' ? 'succeeded' : 'failed'
  await applyPaymentOutcome(matches.docs[0].ref, outcome)
  res.status(200).send('ok')
})

// MMG's hosted checkout calls back to one fixed URL for every merchant —
// not a per-transaction one — so the only way to know which payment this
// is about is to decrypt the token and read the merchantTransactionId we
// embedded in it at createSession time (see mmg.js). Accepts either GET
// (token in the query string, mirroring the outbound redirect) or POST
// (token in the body) since which shape MMG actually uses for this wasn't
// confirmed while building this — see mmg.js's header comment.
exports.mmgReturn = onRequest(async (req, res) => {
  const token = req.query.token || req.body?.token
  if (!token) return redirectToResult(res, 'failed')

  let decrypted
  try {
    decrypted = mmg.decryptCallback(token)
  } catch {
    return redirectToResult(res, 'failed')
  }

  const { mode, data } = decrypted
  const merchantTransactionId = data.merchantTransactionId ?? data.MerchantTransactionId
  const resultCode = data.resultCode ?? data.ResultCode ?? data.transactionStatusCode
  const transactionId = data.transactionId ?? data.TransactionId ?? data.transactionReference

  const paymentId = String(merchantTransactionId || '').split('-')[0]
  if (!paymentId) return redirectToResult(res, 'failed')

  const db = getFirestore()
  const paymentRef = db.doc(`payments/${paymentId}`)
  const paymentSnap = await paymentRef.get()
  if (!paymentSnap.exists) return redirectToResult(res, 'failed')
  const payment = paymentSnap.data()

  if (payment.pluginId !== 'mmg' || payment.externalSessionId !== merchantTransactionId) {
    return redirectToResult(res, 'failed')
  }
  if (payment.status !== 'pending') {
    return redirectToResult(res, payment.status === 'succeeded' ? 'succeeded' : 'failed')
  }

  // Best-effort corroboration — logged for review, not a hard gate (see
  // mmg.js's lookupTransaction comment for why).
  const lookup = await mmg.lookupTransaction(transactionId, mode)
  if (lookup) console.log('[mmgReturn] transaction lookup', JSON.stringify(lookup))

  const outcome = mmg.resultOutcome(resultCode) === 'success' ? 'succeeded' : 'failed'
  await applyPaymentOutcome(paymentRef, outcome)
  redirectToResult(res, outcome)
})
