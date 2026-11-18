// Registry of payment plugins, keyed by the pluginId clients pass to
// createPaymentSession. Each plugin's status() reports whether it's
// configured (credentials present in functions/.env) and its mode:
// 'live' moves real money; 'sandbox' doesn't (the Test plugin, or a real
// provider's sandbox), and is only offered to accounts an admin has marked
// as payment testers — otherwise a real customer could "pay" with play
// money and have a real booking marked paid. payments.js enforces this.
module.exports = {
  test: require('./test'),
  paypal: require('./paypal'),
  mmg: require('./mmg'),
}
