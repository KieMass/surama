// PayPal Checkout (Orders v2 API). Needs PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET
// set (see functions/.env.example) — sandbox credentials from a PayPal
// developer app for testing, live ones only once that app is approved.
//
// Important, deliberate limitation: PayPal does not support GYD as a
// settlement currency, so this plugin converts the GYD amount to USD using
// settings.gydUsdRate (see payments.js) and charges that instead. The
// commission/providerAmount bookkeeping on the payment doc stays in GYD
// for consistency with every other plugin; chargedAmount/chargedCurrency
// record what PayPal actually took.
//
// Also deliberate: this charges straight into the platform's own PayPal
// account, not split to the provider's. A true per-provider split (so
// PayPal itself sends the provider their cut) needs PayPal's Partner/
// Marketplace program — a separate business approval and a per-provider
// onboarding flow this plugin doesn't attempt. Until that's in place,
// "provider gets paid minus commission" for PayPal means the platform
// collects the full charge and owes the provider a payout by some other
// means (not built yet).
const PAYPAL_API_BASE = process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com'

exports.id = 'paypal'

async function getAccessToken() {
  const basicAuth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64')
  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) throw new Error(`PayPal OAuth token request failed: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return data.access_token
}

exports.createSession = async ({ paymentId, amount, settings, returnUrl, cancelUrl }) => {
  const rate = settings.gydUsdRate
  const usdAmount = Math.round((amount / rate) * 100) / 100

  const token = await getAccessToken()
  const res = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: paymentId,
        amount: { currency_code: 'USD', value: usdAmount.toFixed(2) },
      }],
      application_context: {
        return_url: returnUrl,
        cancel_url: cancelUrl,
        user_action: 'PAY_NOW',
      },
    }),
  })
  if (!res.ok) throw new Error(`PayPal order creation failed: ${res.status} ${await res.text()}`)
  const order = await res.json()

  const approveLink = order.links?.find((l) => l.rel === 'approve')
  if (!approveLink) throw new Error('PayPal order response had no approve link.')

  return {
    redirectUrl: approveLink.href,
    externalSessionId: order.id,
    mode: PAYPAL_API_BASE.includes('sandbox') ? 'sandbox' : 'live',
    chargedAmount: usdAmount,
    chargedCurrency: 'USD',
    fxRate: rate,
  }
}

// Called by the paypalReturn HTTP function once the consumer approves on
// PayPal's site. This capture call — not the redirect itself — is the
// authoritative "did the money actually move" signal: it only succeeds if
// the order was really approved, so trusting *its* result (rather than the
// mere fact that the browser came back) is safe.
exports.captureOrder = async (orderId) => {
  const token = await getAccessToken()
  const res = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })
  const data = await res.json().catch(() => ({}))
  return { succeeded: res.ok && data.status === 'COMPLETED', raw: data }
}

// Belt-and-suspenders path for http.js's webhook handler: confirms a
// webhook payload really came from PayPal before acting on it. Required
// because unlike the return-redirect capture call, a webhook POST body is
// just an HTTP request anyone could forge without this check.
exports.verifyWebhookSignature = async (headers, body) => {
  const token = await getAccessToken()
  const res = await fetch(`${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      auth_algo: headers['paypal-auth-algo'],
      cert_url: headers['paypal-cert-url'],
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: process.env.PAYPAL_WEBHOOK_ID,
      webhook_event: body,
    }),
  })
  if (!res.ok) return false
  const data = await res.json()
  return data.verification_status === 'SUCCESS'
}
