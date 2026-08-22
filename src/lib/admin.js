import {
  collection,
  getDocs,
  getDoc,
  getCountFromServer,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  increment,
  runTransaction,
} from 'firebase/firestore'
import { db } from '../firebase'

export const ROLES = ['consumer', 'provider', 'admin']

// ── Users ────────────────────────────────────────────────────────────────

// Fetches one page of users, newest signups first, for the admin users
// table. Users lacking a createdAt (e.g. a role hand-set via console)
// won't appear via this ordered query — give any hand-created account a
// createdAt so it shows up here.
export async function fetchUsersPage({ pageSize = 50, cursor = null } = {}) {
  const constraints = [orderBy('createdAt', 'desc'), limit(pageSize + 1)]
  if (cursor) constraints.push(startAfter(cursor))
  const snap = await getDocs(query(collection(db, 'users'), ...constraints))
  const docs = snap.docs.slice(0, pageSize)
  return {
    users: docs.map((d) => ({ id: d.id, ...d.data() })),
    cursor: docs.length > 0 ? docs[docs.length - 1] : null,
    hasMore: snap.docs.length > pageSize,
  }
}

// Aggregate counts across the whole collection (not just what's loaded on
// the current page), so the stat cards stay accurate regardless of how far
// the admin has paged through the table.
export async function fetchUserStats() {
  const usersCol = collection(db, 'users')
  const [total, consumers, providers, admins, disabled, disabledAdmins] = await Promise.all([
    getCountFromServer(usersCol),
    getCountFromServer(query(usersCol, where('role', '==', 'consumer'))),
    getCountFromServer(query(usersCol, where('role', '==', 'provider'))),
    getCountFromServer(query(usersCol, where('role', '==', 'admin'))),
    getCountFromServer(query(usersCol, where('disabled', '==', true))),
    // Equality-only compound query — no composite index needed.
    getCountFromServer(query(usersCol, where('role', '==', 'admin'), where('disabled', '==', true))),
  ])
  const adminCount = admins.data().count
  return {
    total: total.data().count,
    consumers: consumers.data().count,
    providers: providers.data().count,
    admins: adminCount,
    disabled: disabled.data().count,
    // Admins who could actually sign in right now — used to stop the admin
    // panel from disabling/demoting away the last one and locking everyone
    // out of admin access.
    activeAdmins: adminCount - disabledAdmins.data().count,
  }
}

// Soft-disables an account. Firestore-only (there's no Admin SDK / Cloud
// Function in this project to revoke Firebase Auth tokens), so a disabled
// user is signed out the next time AuthContext observes their doc — on
// their next page load or auth state change, not instantly mid-session.
export async function setUserDisabled(uid, disabled) {
  await updateDoc(doc(db, 'users', uid), { disabled })
}

export async function setUserRole(uid, role) {
  await updateDoc(doc(db, 'users', uid), { role })
}

// Toggles the "verified" badge shown on a provider's listings/profile.
export async function setUserVerified(uid, verified) {
  await updateDoc(doc(db, 'users', uid), { verified })
}

// Gathers everything the admin detail drawer shows about one user: their
// listings (if they're a provider), their booking history on both sides of
// the marketplace, and the reviews they've written.
export async function fetchUserDetail(uid) {
  const [listingsSnap, asConsumerSnap, asProviderSnap, reviewsSnap] = await Promise.all([
    getDocs(query(collection(db, 'services'), where('providerId', '==', uid))),
    getDocs(query(collection(db, 'requests'), where('consumerId', '==', uid))),
    getDocs(query(collection(db, 'requests'), where('providerId', '==', uid))),
    getDocs(query(collection(db, 'reviews'), where('consumerId', '==', uid))),
  ])

  const reviewsWritten = reviewsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

  // Best-effort: attach the listing title each review was left on.
  const serviceIds = [...new Set(reviewsWritten.map((r) => r.serviceId).filter(Boolean))]
  const titleMap = {}
  await Promise.all(
    serviceIds.map(async (id) => {
      try {
        const snap = await getDoc(doc(db, 'services', id))
        if (snap.exists()) titleMap[id] = snap.data().title
      } catch { /* listing may be gone — review still shows without a title */ }
    })
  )

  return {
    listings: listingsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    requestsAsConsumer: asConsumerSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    requestsAsProvider: asProviderSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    reviewsWritten: reviewsWritten.map((r) => ({ ...r, serviceTitle: titleMap[r.serviceId] })),
  }
}

// ── Listings ─────────────────────────────────────────────────────────────

// All listings, active or not — `services` is publicly readable, so this
// is a plain unfiltered fetch (unlike the homepage's active-only query).
export async function fetchAllListings() {
  const snap = await getDocs(collection(db, 'services'))
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
}

export async function setListingActive(id, active) {
  await updateDoc(doc(db, 'services', id), { active })
}

// ── Reviews ──────────────────────────────────────────────────────────────

export async function fetchAllReviews() {
  const snap = await getDocs(collection(db, 'reviews'))
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
}

// Removes an abusive/fake review and corrects the listing's rating
// aggregate to match (mirrors the increment createReview() applied).
// Runs as a transaction so the delete + aggregate correction either both
// happen or neither does, and re-reads the review inside the transaction
// so a double-click (or two admins deleting the same review at once) is a
// harmless no-op on the second attempt instead of double-decrementing the
// listing's rating.
export async function deleteReview(review) {
  await runTransaction(db, async (tx) => {
    const reviewRef = doc(db, 'reviews', review.id)
    const reviewSnap = await tx.get(reviewRef)
    if (!reviewSnap.exists()) return // already deleted — nothing to do

    const data = reviewSnap.data()
    tx.delete(reviewRef)

    if (data.serviceId) {
      const serviceRef = doc(db, 'services', data.serviceId)
      const serviceSnap = await tx.get(serviceRef)
      // Listing may have been deleted separately — the review delete still stands.
      if (serviceSnap.exists()) {
        tx.update(serviceRef, {
          ratingSum: increment(-data.rating),
          ratingCount: increment(-1),
        })
      }
    }
  })
}
