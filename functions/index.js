const { initializeApp } = require('firebase-admin/app')

initializeApp()

const payments = require('./payments')

exports.createPaymentSession = payments.createPaymentSession
exports.confirmTestPayment = payments.confirmTestPayment
