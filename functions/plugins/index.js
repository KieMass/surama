// Registry of payment plugins, keyed by the pluginId clients pass to
// createPaymentSession. Add paypal.js / mmg.js here once they're built —
// nothing else in payments.js needs to change to pick them up.
module.exports = {
  test: require('./test'),
  paypal: require('./paypal'),
  mmg: require('./mmg'),
}
