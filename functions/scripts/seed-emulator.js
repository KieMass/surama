// Seeds the local Firebase Emulator Suite with a consumer, a provider, a
// listing, and requests parked at each point of the payment flow, so the
// deposit and balance legs can be tested end to end without first clicking
// through registration, booking and acceptance by hand.
//
// Run with the emulators up: `npm run seed` (from the repo root).
// Safe to re-run — every doc and user uses a fixed ID and is reset.

process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080'
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= '127.0.0.1:9099'

const { initializeApp } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
const { getFirestore, FieldValue } = require('firebase-admin/firestore')

const PROJECT_ID = 'demo-surama'
const PASSWORD = 'password123'

// Fail closed: this deletes and rewrites data, so it must only ever run
// against the offline demo project, never a real one.
if (!PROJECT_ID.startsWith('demo-')) throw new Error('Refusing to seed a non-demo project.')

initializeApp({ projectId: PROJECT_ID })
const auth = getAuth()
const db = getFirestore()

const USERS = [
  { uid: 'test-consumer', email: 'consumer@test.local', name: 'Test Consumer', role: 'consumer' },
  { uid: 'test-provider', email: 'provider@test.local', name: 'Test Provider', role: 'provider' },
  { uid: 'test-admin', email: 'admin@test.local', name: 'Test Admin', role: 'admin' },
]

const SERVICE = {
  id: 'test-service',
  title: 'House Cleaning (test listing)',
  description: 'Seeded listing for payment testing.',
  category: 'Cleaning',
  price: 20000,
  currency: 'GYD',
  providerId: 'test-provider',
  providerName: 'Test Provider',
  active: true,
}

const consumer = USERS[0]
const baseRequest = {
  serviceId: SERVICE.id,
  serviceTitle: SERVICE.title,
  serviceCategory: SERVICE.category,
  price: SERVICE.price,
  currency: SERVICE.currency,
  providerId: SERVICE.providerId,
  consumerId: consumer.uid,
  consumerName: consumer.name,
  consumerEmail: consumer.email,
  message: '',
  preferredDate: '',
}

// One request per stage of the payment flow.
const REQUESTS = {
  // Provider still has to accept in the UI before a deposit can be paid.
  'test-req-pending': { status: 'pending' },
  // Ready for the consumer to pay the deposit.
  'test-req-deposit': { status: 'accepted', paymentStatus: 'unpaid' },
  // Also deposit-ready — the e2e suite pays this one after changing the
  // admin payment settings, to check the new rates take effect.
  'test-req-settings': { status: 'accepted', paymentStatus: 'unpaid' },
  // Deposit already paid and job marked complete — ready for the balance.
  'test-req-balance': {
    status: 'pending_completion',
    paymentStatus: 'deposit_paid',
    depositAmount: 5000,
    balanceAmount: 15000,
    depositPercent: 25,
    commissionPercent: 10,
    completionRequestedAt: FieldValue.serverTimestamp(),
  },
  // Same stage — the e2e suite pays its balance after raising the
  // commission, to check the job keeps the 10% it was locked at.
  'test-req-locked': {
    status: 'pending_completion',
    paymentStatus: 'deposit_paid',
    depositAmount: 5000,
    balanceAmount: 15000,
    depositPercent: 25,
    commissionPercent: 10,
    completionRequestedAt: FieldValue.serverTimestamp(),
  },
}

async function upsertUser({ uid, email, name, role }) {
  try {
    await auth.deleteUser(uid)
  } catch (err) {
    if (err.code !== 'auth/user-not-found') throw err
  }
  await auth.createUser({ uid, email, password: PASSWORD, displayName: name, emailVerified: true })
  await db.doc(`users/${uid}`).set({
    name,
    email,
    role,
    emailVerified: true,
    createdAt: FieldValue.serverTimestamp(),
  })
}

async function main() {
  for (const user of USERS) await upsertUser(user)

  const { id, ...service } = SERVICE
  await db.doc(`services/${id}`).set({ ...service, createdAt: FieldValue.serverTimestamp() })

  // Clear payment attempts left over from earlier runs.
  const stale = await db.collection('payments').where('consumerId', '==', consumer.uid).get()
  await Promise.all(stale.docs.map((d) => d.ref.delete()))
  // Back to the built-in payment defaults (25% deposit, 10% commission).
  await db.doc('settings/payments').delete()

  for (const [reqId, fields] of Object.entries(REQUESTS)) {
    await db.doc(`requests/${reqId}`).set({
      ...baseRequest,
      ...fields,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
  }

  console.log('Seeded demo-surama emulator. Sign in with password', PASSWORD)
  for (const u of USERS) console.log(`  ${u.role.padEnd(8)} ${u.email}`)
}

main().then(() => process.exit(0), (err) => {
  console.error(err)
  process.exit(1)
})
