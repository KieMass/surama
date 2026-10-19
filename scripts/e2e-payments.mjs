// End-to-end check of the payment flow against the local emulators, driven
// through the same client SDK calls the app makes (src/lib/payments.js) —
// so it exercises the real Cloud Functions, Firestore rules and
// transactions, not mocks.
//
// Run with `npm run test:payments` — it starts the emulators, seeds them,
// runs this, and shuts everything down.

import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator, doc, getDoc, updateDoc } from 'firebase/firestore'
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions'

const app = initializeApp({ apiKey: 'demo-api-key', projectId: 'demo-surama' })
const auth = getAuth(app)
const db = getFirestore(app)
const functions = getFunctions(app)
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
connectFirestoreEmulator(db, '127.0.0.1', 8080)
connectFunctionsEmulator(functions, '127.0.0.1', 5001)

const createPaymentSession = httpsCallable(functions, 'createPaymentSession')
const confirmTestPayment = httpsCallable(functions, 'confirmTestPayment')

let failures = 0
function check(label, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok || !detail ? '' : ` — ${detail}`}`)
  if (!ok) failures++
}

async function expectError(label, promise, code) {
  try {
    await promise
    check(label, false, 'expected an error, call succeeded')
  } catch (err) {
    check(label, err.code === code, `got ${err.code}`)
  }
}

const signInAs = (role) => signInWithEmailAndPassword(auth, `${role}@test.local`, 'password123')
const read = async (path) => (await getDoc(doc(db, path))).data()

async function pay(requestId, type, outcome) {
  const { data } = await createPaymentSession({ requestId, type, pluginId: 'test' })
  await confirmTestPayment({ paymentId: data.paymentId, outcome })
  return data.paymentId
}

// ── Deposit leg ────────────────────────────────────────────────────────────
await signInAs('consumer')

{
  const { data } = await createPaymentSession({ requestId: 'test-req-deposit', type: 'deposit', pluginId: 'test' })
  check('deposit session redirects to the in-app test checkout', data.redirectUrl === `/pay/test/${data.paymentId}`)

  const reqPending = await read('requests/test-req-deposit')
  check('request moves to deposit_pending', reqPending.paymentStatus === 'deposit_pending', reqPending.paymentStatus)
  check('deposit is 25% of the price', reqPending.depositAmount === 5000 && reqPending.balanceAmount === 15000,
    `${reqPending.depositAmount}/${reqPending.balanceAmount}`)

  await expectError('a second deposit session is rejected while one is pending',
    createPaymentSession({ requestId: 'test-req-deposit', type: 'deposit', pluginId: 'test' }), 'functions/failed-precondition')

  await confirmTestPayment({ paymentId: data.paymentId, outcome: 'succeeded' })
  const payment = await read(`payments/${data.paymentId}`)
  check('payment marked succeeded', payment.status === 'succeeded', payment.status)
  check('commission is 10% of the deposit', payment.commissionAmount === 500 && payment.providerAmount === 4500,
    `${payment.commissionAmount}/${payment.providerAmount}`)
  check('request moves to deposit_paid', (await read('requests/test-req-deposit')).paymentStatus === 'deposit_paid')

  await expectError('confirming the same payment twice is rejected',
    confirmTestPayment({ paymentId: data.paymentId, outcome: 'succeeded' }), 'functions/failed-precondition')
}

// ── Balance leg: failed attempt, then a retry that succeeds ────────────────
await pay('test-req-balance', 'balance', 'failed')
check('failed balance payment rolls back to deposit_paid',
  (await read('requests/test-req-balance')).paymentStatus === 'deposit_paid')

await pay('test-req-balance', 'balance', 'cancelled')
check('cancelled balance payment rolls back to deposit_paid',
  (await read('requests/test-req-balance')).paymentStatus === 'deposit_paid')

const balancePaymentId = await pay('test-req-balance', 'balance', 'succeeded')
check('balance payment charges the remaining 75%', (await read(`payments/${balancePaymentId}`)).amount === 15000)
check('request is paid in full', (await read('requests/test-req-balance')).paymentStatus === 'paid')

// ── Guard rails ────────────────────────────────────────────────────────────
await expectError('deposit cannot be paid before the provider accepts',
  createPaymentSession({ requestId: 'test-req-pending', type: 'deposit', pluginId: 'test' }), 'functions/failed-precondition')

await expectError('consumer cannot write paymentStatus directly',
  updateDoc(doc(db, 'requests', 'test-req-pending'), { paymentStatus: 'paid' }), 'permission-denied')

await signOut(auth)
await signInAs('provider')
await expectError('provider cannot pay on the consumer\'s behalf',
  createPaymentSession({ requestId: 'test-req-pending', type: 'deposit', pluginId: 'test' }), 'functions/permission-denied')

await signOut(auth)
await expectError('signed-out callers are rejected',
  createPaymentSession({ requestId: 'test-req-deposit', type: 'deposit', pluginId: 'test' }), 'functions/unauthenticated')

console.log(failures ? `\n${failures} check(s) failed.` : '\nAll payment checks passed.')
process.exit(failures ? 1 : 0)
