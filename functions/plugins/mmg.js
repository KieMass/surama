// MMG (Mobile Money Guyana) hosted checkout. Modeled on the field names
// and flow documented by an open-source reference implementation
// (Revamped-GY/MMG-Checkout-Woocommerce-Guyana on GitHub) — MMG's own
// developer docs (mmg.gy/developer) weren't reachable while building
// this, so treat exact field names/endpoints as "very likely accurate,
// third-party-documented" and verify against the credential package MMG
// Merchant Services issues before relying on this for real money.
//
// Unlike PayPal, MMG settles natively in GYD — no currency conversion.
// Also unlike PayPal, starting a session is a pure local operation (build
// + encrypt a payload, construct a redirect URL) with no API call at all;
// nothing happens on MMG's side until the consumer actually completes the
// OTP approval on MMG's hosted page.
const crypto = require('node:crypto')

exports.id = 'mmg'

// Transaction-lookup result codes documented by the reference plugin's
// callback handler — reused here since MMG's own API docs weren't
// reachable to confirm them independently.
const RESULT_OUTCOME = {
  0: 'success',
  1: 'failed', // agent not registered
  2: 'failed',
  3: 'error', // invalid secret key
  4: 'error', // merchant ID mismatch
  5: 'error', // token decryption failed
  6: 'cancelled',
  7: 'timeout',
}

function config(mode) {
  const prefix = mode === 'live' ? 'MMG_LIVE_' : 'MMG_SANDBOX_'
  const pem = (name) => {
    const raw = process.env[prefix + name]
    return raw ? raw.replace(/\\n/g, '\n') : undefined
  }
  return {
    checkoutUrl: process.env[prefix + 'CHECKOUT_URL'],
    merchantId: process.env[prefix + 'MERCHANT_ID'],
    clientId: process.env[prefix + 'CLIENT_ID'],
    merchantName: process.env[prefix + 'MERCHANT_NAME'],
    secretKey: process.env[prefix + 'SECRET_KEY'],
    publicKey: pem('PUBLIC_KEY'),
    privateKey: pem('PRIVATE_KEY'),
    apiBase: process.env[prefix + 'API_BASE'],
    wssMid: process.env[prefix + 'WSS_MID'],
    wssMkey: process.env[prefix + 'WSS_MKEY'],
    wssMsecret: process.env[prefix + 'WSS_MSECRET'],
    apiKey: process.env[prefix + 'API_KEY'],
  }
}

function base64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function fromBase64url(str) {
  return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
}

// Standard RSA-OAEP-SHA256 (hash and MGF1 both SHA-256, empty label).
// The reference plugin hand-rolls this in PHP only because PHP's OpenSSL
// binding can't select the OAEP hash — Node's can, so the built-in
// crypto module is a correct, direct implementation, no custom padding
// logic needed.
function encryptPayload(payload, publicKeyPem) {
  const json = Buffer.from(JSON.stringify(payload), 'latin1')
  return crypto.publicEncrypt(
    { key: publicKeyPem, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    json
  )
}

function decryptPayload(ciphertext, privateKeyPem) {
  const plaintext = crypto.privateDecrypt(
    { key: privateKeyPem, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    ciphertext
  )
  return JSON.parse(plaintext.toString('latin1'))
}

exports.createSession = async ({ paymentId, amount }) => {
  const mode = process.env.MMG_MODE === 'live' ? 'live' : 'sandbox'
  const cfg = config(mode)
  if (!cfg.checkoutUrl || !cfg.publicKey) {
    throw new Error(`MMG is not configured for mode "${mode}" — see functions/.env.example.`)
  }

  // Our own payment id prefixes this so mmgReturn can recover which
  // payment a callback is about — MMG's callback URL is one fixed
  // endpoint shared across every transaction, not per-payment.
  const merchantTransactionId = `${paymentId}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`

  const payload = {
    secretKey: cfg.secretKey,
    amount: amount.toFixed(2),
    merchantId: cfg.merchantId,
    merchantName: cfg.merchantName,
    merchantTransactionId,
    productDescription: `Surama payment ${paymentId}`,
    requestInitiationTime: String(Date.now()),
  }

  const token = base64url(encryptPayload(payload, cfg.publicKey))

  const url = new URL(cfg.checkoutUrl)
  url.searchParams.set('token', token)
  url.searchParams.set('merchantId', cfg.merchantId)
  url.searchParams.set('X-Client-ID', cfg.clientId)

  return { redirectUrl: url.toString(), externalSessionId: merchantTransactionId, mode }
}

// Decrypts MMG's callback token, trying both modes' private keys like the
// reference plugin does (whichever mode actually issued the transaction
// decrypts successfully; the other throws and is ignored).
exports.decryptCallback = (token) => {
  const ciphertext = fromBase64url(token)
  for (const mode of ['sandbox', 'live']) {
    const { privateKey } = config(mode)
    if (!privateKey) continue
    try {
      return { mode, data: decryptPayload(ciphertext, privateKey) }
    } catch {
      // Wrong key for this mode — try the other one.
    }
  }
  throw new Error('Could not decrypt MMG callback with any configured private key.')
}

exports.resultOutcome = (resultCode) => RESULT_OUTCOME[Number(resultCode)] ?? 'failed'

// Best-effort independent check against MMG's Merchant Initiated API,
// mirroring the reference plugin's practice of cross-checking a numeric
// transaction ID. Not treated as the sole source of truth here (unlike
// PayPal's capture call) — MMG's own lookup response schema wasn't
// confirmed while building this, only its request shape, so a decrypted
// callback with a matching merchantTransactionId and a success result
// code is the primary signal; this is a corroborating check logged for
// review, not a hard gate.
exports.lookupTransaction = async (transactionId, mode) => {
  if (!/^\d{1,64}$/.test(String(transactionId))) return null
  const cfg = config(mode)
  if (!cfg.apiBase) return null
  try {
    const res = await fetch(
      `${cfg.apiBase.replace(/\/$/, '')}/e-merchant-initiated-transactions/lookup?transactionId=${encodeURIComponent(transactionId)}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'x-wss-mid': cfg.wssMid,
          'x-wss-mkey': cfg.wssMkey,
          'x-wss-msecret': cfg.wssMsecret,
          'x-api-key': cfg.apiKey,
          'x-wss-correlationid': crypto.randomUUID(),
        },
      }
    )
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}
