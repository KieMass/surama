const { initializeApp } = require('firebase-admin/app')

initializeApp()

const payments = require('./payments')
const http = require('./http')

exports.createPaymentSession = payments.createPaymentSession
exports.confirmTestPayment = payments.confirmTestPayment

exports.paypalReturn = http.paypalReturn
exports.paypalCancel = http.paypalCancel
exports.paypalWebhook = http.paypalWebhook
exports.mmgReturn = http.mmgReturn
