// Fake payment plugin for demos, QA, and exercising the booking flow without
// touching real money or a real network call. Confirmed by the consumer
// themselves via the confirmTestPayment callable instead of a webhook —
// see payments.js for why that path is restricted to pluginId "test" only.
//
// Every real plugin (PayPal, MMG, ...) implements the same createSession()
// shape, plus a verifyWebhook() the webhook HTTP function calls to confirm
// payment instead of trusting the client.
exports.id = 'test'

exports.createSession = async ({ paymentId }) => ({
  redirectUrl: `/pay/test/${paymentId}`,
  externalSessionId: null,
  mode: 'sandbox',
})
