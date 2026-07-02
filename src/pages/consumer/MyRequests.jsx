import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../../firebase'
import { useAuth } from '../../context/AuthContext'
import { useNotifications } from '../../context/NotificationContext'
import NavBadge from '../../components/NavBadge'
import { asset } from '../../lib/asset'
import {
  getRequestsForConsumer,
  updateRequestStatus,
  confirmCompletion,
  disputeCompletion,
  acceptPriceAdjustment,
  declinePriceAdjustment,
  proposePriceAdjustment,
  sortByNewest,
  REQUEST_STATUS,
  STATUS_LABEL,
  STATUS_BADGE,
} from '../../lib/requests'
import { createReview, updateReview, getReviewedRequestIds } from '../../lib/reviews'
import { getOrCreateConversation, sendMessage } from '../../lib/conversations'

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000

function formatDate(timestamp) {
  if (!timestamp?.toDate) return ''
  return timestamp.toDate().toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function timeUntilAutoConfirm(completionRequestedAt) {
  if (!completionRequestedAt?.toMillis?.()) return '2 days'
  const remaining = TWO_DAYS_MS - (Date.now() - completionRequestedAt.toMillis())
  if (remaining <= 0) return 'soon'
  const days = Math.floor(remaining / (24 * 60 * 60 * 1000))
  const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
  if (days > 0) return `${days} day${days !== 1 ? 's' : ''}`
  return `${hours} hour${hours !== 1 ? 's' : ''}`
}

export default function MyRequests() {
  const { userDoc } = useAuth()
  const navigate = useNavigate()
  const { inboxCount } = useNotifications()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState(null)
  const [confirmingId, setConfirmingId] = useState(null)
  const [disputingId, setDisputingId] = useState(null)
  const [acceptingPriceId, setAcceptingPriceId] = useState(null)
  const [decliningPriceId, setDecliningPriceId] = useState(null)
  const [showCounterFormId, setShowCounterFormId] = useState(null)
  const [counterPrice, setCounterPrice] = useState('')
  const [counterNote, setCounterNote] = useState('')
  const [sendingCounter, setSendingCounter] = useState(false)
  // Map<requestId, { id: reviewId, rating, comment }>
  const [reviewMap, setReviewMap] = useState(new Map())
  const [reviewingId, setReviewingId] = useState(null)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewSuccessId, setReviewSuccessId] = useState(null)

  const loadRequests = async () => {
    setLoading(true)
    const data = await getRequestsForConsumer(auth.currentUser.uid)
    let sorted = sortByNewest(data)

    // Auto-complete any pending_completion older than 2 days
    const expired = sorted.filter(
      (r) =>
        r.status === REQUEST_STATUS.PENDING_COMPLETION &&
        r.completionRequestedAt?.toMillis?.() &&
        Date.now() - r.completionRequestedAt.toMillis() > TWO_DAYS_MS
    )
    if (expired.length > 0) {
      await Promise.all(expired.map((r) => confirmCompletion(r.id)))
      sorted = sorted.map((r) =>
        expired.some((e) => e.id === r.id) ? { ...r, status: REQUEST_STATUS.COMPLETED } : r
      )
    }

    setRequests(sorted)
    const completedIds = sorted
      .filter((r) => r.status === REQUEST_STATUS.COMPLETED)
      .map((r) => r.id)
    setReviewMap(await getReviewedRequestIds(completedIds))
    setLoading(false)
  }

  useEffect(() => {
    loadRequests()
  }, [])

  const handleCancel = async (id) => {
    setCancellingId(id)
    await updateRequestStatus(id, REQUEST_STATUS.CANCELLED)
    await loadRequests()
    setCancellingId(null)
  }

  const handleConfirm = async (r) => {
    setConfirmingId(r.id)
    try {
      await confirmCompletion(r.id)
      const updated = requests.map((req) =>
        req.id === r.id ? { ...req, status: REQUEST_STATUS.COMPLETED } : req
      )
      setRequests(updated)
      const completedIds = updated
        .filter((req) => req.status === REQUEST_STATUS.COMPLETED)
        .map((req) => req.id)
      setReviewMap(await getReviewedRequestIds(completedIds))
    } finally {
      setConfirmingId(null)
    }
  }

  const handleDispute = async (r) => {
    setDisputingId(r.id)
    try {
      await disputeCompletion(r.id)
      // Send automatic message to the provider so they're notified
      try {
        const convId = await getOrCreateConversation({
          consumerId: auth.currentUser.uid,
          consumerName: userDoc?.name ?? '',
          providerId: r.providerId,
          providerName: '',
          serviceId: r.serviceId,
          serviceTitle: r.serviceTitle,
        })
        await sendMessage(convId, {
          senderId: auth.currentUser.uid,
          senderName: userDoc?.name ?? 'Consumer',
          text: `I've raised a dispute for "${r.serviceTitle}". Please message me so we can resolve this.`,
        })
      } catch {
        // Messaging failed but dispute status is already saved — that's OK
      }
      setRequests((prev) =>
        prev.map((req) => req.id === r.id ? { ...req, status: REQUEST_STATUS.DISPUTED } : req)
      )
    } finally {
      setDisputingId(null)
    }
  }

  const handleAcceptPrice = async (r) => {
    setAcceptingPriceId(r.id)
    try {
      await acceptPriceAdjustment(r.id, r.proposedPrice)
      setRequests((prev) =>
        prev.map((req) =>
          req.id === r.id
            ? { ...req, status: REQUEST_STATUS.ACCEPTED, price: r.proposedPrice, proposedPrice: null, proposedPriceNote: null, priceProposedBy: null }
            : req
        )
      )
    } finally {
      setAcceptingPriceId(null)
    }
  }

  const handleDeclinePrice = async (r) => {
    setDecliningPriceId(r.id)
    try {
      await declinePriceAdjustment(r.id)
      setRequests((prev) =>
        prev.map((req) =>
          req.id === r.id
            ? { ...req, status: REQUEST_STATUS.ACCEPTED, proposedPrice: null, proposedPriceNote: null, priceProposedBy: null }
            : req
        )
      )
    } finally {
      setDecliningPriceId(null)
    }
  }

  const handleSendCounter = async (r) => {
    if (!counterPrice) return
    setSendingCounter(true)
    try {
      await proposePriceAdjustment(r.id, {
        proposedPrice: parseFloat(counterPrice),
        proposedPriceNote: counterNote,
        proposedBy: 'consumer',
      })
      setRequests((prev) =>
        prev.map((req) =>
          req.id === r.id
            ? { ...req, proposedPrice: parseFloat(counterPrice), proposedPriceNote: counterNote, priceProposedBy: 'consumer' }
            : req
        )
      )
      setShowCounterFormId(null)
      setCounterPrice('')
      setCounterNote('')
    } finally {
      setSendingCounter(false)
    }
  }

  const openReviewForm = (r) => {
    const existing = reviewMap.get(r.id)
    setReviewRating(existing?.rating ?? 5)
    setReviewComment(existing?.comment ?? '')
    setReviewingId(r.id)
  }

  const handleSubmitReview = async (r) => {
    setSubmittingReview(true)
    try {
      const existing = reviewMap.get(r.id)
      if (existing) {
        await updateReview(existing.id, r.serviceId, {
          rating: reviewRating,
          comment: reviewComment,
          oldRating: existing.rating,
        })
        setReviewMap((prev) => {
          const next = new Map(prev)
          next.set(r.id, { id: existing.id, rating: reviewRating, comment: reviewComment })
          return next
        })
      } else {
        const reviewId = await createReview({
          service: { id: r.serviceId, providerId: r.providerId },
          requestId: r.id,
          consumerId: auth.currentUser.uid,
          consumerName: userDoc?.name ?? '',
          rating: reviewRating,
          comment: reviewComment,
        })
        setReviewMap((prev) => {
          const next = new Map(prev)
          next.set(r.id, { id: reviewId, rating: reviewRating, comment: reviewComment })
          return next
        })
      }
      setReviewingId(null)
      setReviewComment('')
      setReviewRating(5)
      setReviewSuccessId(r.id)
      setTimeout(() => setReviewSuccessId((cur) => (cur === r.id ? null : cur)), 3000)
    } finally {
      setSubmittingReview(false)
    }
  }

  const handleSignOut = async () => {
    await signOut(auth)
    navigate('/login')
  }

  const firstName = userDoc?.name?.split(' ')[0] ?? ''

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between sticky top-0 z-40">
        <Link to="/"><img src={asset('logo-dark.png')} alt="Surama.net" className="h-10 w-auto" /></Link>
        <div className="flex items-center gap-5">
          <Link to="/inbox" className="text-sm text-gray-600 hover:text-primary-600 font-medium transition-colors">
            <NavBadge count={inboxCount}>💬 Inbox</NavBadge>
          </Link>
          <button onClick={handleSignOut} className="text-sm text-gray-600 hover:text-primary-600 font-medium transition-colors">
            Sign out
          </button>
        </div>
      </nav>

      {/* Header */}
      <div className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #ff5a5f 0%, #e8464b 55%, #c93338 100%)' }}>
        <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-white/5 pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-6 py-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-100 text-sm font-medium mb-1">
                {firstName ? `${firstName}'s Requests` : 'My Requests'}
              </p>
              <h1 className="text-3xl font-extrabold text-white mb-1">Track your bookings</h1>
              <p className="text-primary-100 text-sm">See the status of every service you've requested</p>
            </div>
            <Link
              to="/consumer/dashboard"
              className="hidden sm:inline-block bg-white/15 hover:bg-white/25 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
            >
              ← Browse services
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && requests.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-gray-600 font-medium">No requests yet</p>
            <p className="text-gray-400 text-sm mt-1 mb-5">Browse services and send a request to get started</p>
            <Link
              to="/consumer/dashboard"
              className="inline-block bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            >
              Browse services
            </Link>
          </div>
        )}

        <div className="space-y-4">
          {requests.map((r) => {
            const isReviewed = reviewMap.has(r.id)
            const isReviewing = reviewingId === r.id
            const isSuccessFlash = reviewSuccessId === r.id
            return (
              <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                {/* Top row — title / status / actions */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className="text-xs text-primary-600 font-bold uppercase tracking-wide">
                        {r.serviceCategory}
                      </span>
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${STATUS_BADGE[r.status]}`}>
                        {STATUS_LABEL[r.status]}
                      </span>
                    </div>
                    <Link
                      to={`/services/${r.serviceId}`}
                      className="font-semibold text-gray-900 hover:text-primary-600 transition-colors"
                    >
                      {r.serviceTitle}
                    </Link>
                    <p className="text-sm text-gray-500 mt-1">
                      {r.currency} {r.price?.toLocaleString()}
                      {r.preferredDate && ` · Preferred: ${r.preferredDate}`}
                    </p>
                    {r.message && (
                      <p className="text-sm text-gray-600 mt-2 bg-gray-50 rounded-xl p-3">{r.message}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">Sent {formatDate(r.createdAt)}</p>
                  </div>

                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    {r.status === REQUEST_STATUS.PENDING && (
                      <button
                        onClick={() => handleCancel(r.id)}
                        disabled={cancellingId === r.id}
                        className="text-xs font-semibold text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-200 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {cancellingId === r.id ? 'Cancelling…' : 'Cancel request'}
                      </button>
                    )}

                    {r.status === REQUEST_STATUS.ACCEPTED && (
                      <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 text-center">
                        Provider accepted 🎉<br />They'll be in touch to arrange payment.
                      </div>
                    )}

                    {r.status === REQUEST_STATUS.COMPLETED && !isReviewed && !isReviewing && (
                      <button
                        onClick={() => openReviewForm(r)}
                        className="text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 px-3 py-2 rounded-lg transition-colors"
                      >
                        ⭐ Leave a review
                      </button>
                    )}

                  </div>
                </div>

                {/* Price negotiation */}
                {r.status === REQUEST_STATUS.PRICE_PROPOSED && r.priceProposedBy === 'provider' && (
                  <div className="mt-4 pt-4 border-t border-indigo-100 space-y-3">
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                      <p className="text-sm font-bold text-indigo-800">Provider proposed a price adjustment</p>
                      <div className="flex items-center gap-4 mt-2">
                        <div>
                          <p className="text-xs text-indigo-400">Original</p>
                          <p className="text-sm font-semibold text-gray-400 line-through">{r.currency} {r.price?.toLocaleString()}</p>
                        </div>
                        <span className="text-indigo-300 text-xl">→</span>
                        <div>
                          <p className="text-xs text-indigo-400">Proposed</p>
                          <p className="text-xl font-extrabold text-indigo-700">{r.currency} {r.proposedPrice?.toLocaleString()}</p>
                        </div>
                      </div>
                      {r.proposedPriceNote && (
                        <div className="mt-2 bg-white rounded-lg px-3 py-2 border border-indigo-100">
                          <p className="text-xs text-gray-500 italic">"{r.proposedPriceNote}"</p>
                        </div>
                      )}
                    </div>

                    {showCounterFormId !== r.id ? (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDeclinePrice(r)}
                            disabled={decliningPriceId === r.id || acceptingPriceId === r.id}
                            className="flex-1 border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                          >
                            {decliningPriceId === r.id ? 'Declining…' : 'Decline'}
                          </button>
                          <button
                            onClick={() => setShowCounterFormId(r.id)}
                            className="flex-1 border border-indigo-200 text-indigo-600 hover:bg-indigo-50 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                          >
                            Counter Offer
                          </button>
                          <button
                            onClick={() => handleAcceptPrice(r)}
                            disabled={acceptingPriceId === r.id || decliningPriceId === r.id}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 shadow-sm"
                          >
                            {acceptingPriceId === r.id ? 'Accepting…' : '✅ Accept'}
                          </button>
                        </div>
                        <button
                          onClick={() => handleCancel(r.id)}
                          disabled={cancellingId === r.id}
                          className="w-full text-xs text-gray-400 hover:text-red-500 py-1 text-center transition-colors"
                        >
                          {cancellingId === r.id ? 'Cancelling…' : 'or cancel this request entirely'}
                        </button>
                      </div>
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                        <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Your Counter Offer</p>
                        <div className="flex gap-2 items-center">
                          <span className="text-xs font-semibold text-gray-500 shrink-0">{r.currency}</span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={counterPrice}
                            onChange={(e) => setCounterPrice(e.target.value)}
                            placeholder={r.proposedPrice}
                            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <textarea
                          rows={2}
                          value={counterNote}
                          onChange={(e) => setCounterNote(e.target.value)}
                          placeholder="Explain your counter offer…"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setShowCounterFormId(null); setCounterPrice(''); setCounterNote('') }}
                            className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-xs font-medium hover:bg-white transition-colors"
                          >
                            Back
                          </button>
                          <button
                            onClick={() => handleSendCounter(r)}
                            disabled={!counterPrice || sendingCounter}
                            className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                          >
                            {sendingCounter ? 'Sending…' : 'Send Counter'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Consumer counter sent — awaiting provider */}
                {r.status === REQUEST_STATUS.PRICE_PROPOSED && r.priceProposedBy === 'consumer' && (
                  <div className="mt-4 pt-4 border-t border-amber-100">
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                      <p className="text-sm font-bold text-amber-800">⏳ Counter offer sent to provider</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-amber-600">Your offer:</span>
                        <span className="text-base font-bold text-amber-700">{r.currency} {r.proposedPrice?.toLocaleString()}</span>
                        <span className="text-xs text-gray-400">(original: {r.currency} {r.price?.toLocaleString()})</span>
                      </div>
                      {r.proposedPriceNote && (
                        <p className="text-xs text-amber-500 italic mt-1">"{r.proposedPriceNote}"</p>
                      )}
                      <button
                        onClick={() => handleCancel(r.id)}
                        disabled={cancellingId === r.id}
                        className="mt-2 text-xs text-gray-400 hover:text-red-500 underline transition-colors"
                      >
                        {cancellingId === r.id ? 'Cancelling…' : 'Cancel request'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Pending completion — confirm or dispute */}
                {r.status === REQUEST_STATUS.PENDING_COMPLETION && (
                  <div className="mt-4 pt-4 border-t border-purple-100">
                    <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 space-y-3">
                      <div>
                        <p className="text-sm font-bold text-purple-800">The provider has marked this job as complete</p>
                        <p className="text-xs text-purple-500 mt-0.5">
                          Auto-confirms in {timeUntilAutoConfirm(r.completionRequestedAt)} if you take no action.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDispute(r)}
                          disabled={disputingId === r.id || confirmingId === r.id}
                          className="flex-1 border border-orange-200 text-orange-600 hover:bg-orange-50 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                        >
                          {disputingId === r.id ? 'Raising dispute…' : '⚠️ Dispute'}
                        </button>
                        <button
                          onClick={() => handleConfirm(r)}
                          disabled={confirmingId === r.id || disputingId === r.id}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 shadow-sm"
                        >
                          {confirmingId === r.id ? 'Confirming…' : '✅ Confirm Complete'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Disputed */}
                {r.status === REQUEST_STATUS.DISPUTED && (
                  <div className="mt-4 pt-4 border-t border-orange-100">
                    <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
                      <p className="text-sm font-bold text-orange-800">⚠️ Dispute raised</p>
                      <p className="text-xs text-orange-600 mt-1">
                        A message has been sent to the provider. Continue the conversation in your inbox to resolve this.
                      </p>
                      <Link
                        to="/inbox"
                        className="inline-block mt-2 text-xs font-semibold text-primary-600 hover:underline"
                      >
                        💬 Go to inbox →
                      </Link>
                    </div>
                  </div>
                )}

                {/* Submitted review display */}
                {r.status === REQUEST_STATUS.COMPLETED && isReviewed && !isReviewing && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    {isSuccessFlash && (
                      <div className="mb-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 flex items-center gap-2">
                        <span className="text-emerald-500 text-base">✅</span>
                        <p className="text-sm font-semibold text-emerald-700">Review submitted — thank you!</p>
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Your Review</p>
                        <div className="flex gap-0.5 mb-1.5">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <span key={n} className={`text-lg leading-none ${n <= (reviewMap.get(r.id)?.rating ?? 0) ? 'text-amber-400' : 'text-gray-200'}`}>★</span>
                          ))}
                        </div>
                        {reviewMap.get(r.id)?.comment && (
                          <p className="text-sm text-gray-600 italic">"{reviewMap.get(r.id).comment}"</p>
                        )}
                      </div>
                      <button
                        onClick={() => openReviewForm(r)}
                        className="text-xs font-semibold text-primary-600 border border-primary-200 hover:bg-primary-50 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
                      >
                        ✏️ Edit
                      </button>
                    </div>
                  </div>
                )}

                {/* Inline review form */}
                {r.status === REQUEST_STATUS.COMPLETED && isReviewing && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                    <p className="text-sm font-semibold text-gray-700">
                      {isReviewed ? 'Update your review' : 'Leave a review'}
                    </p>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">Your rating</label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setReviewRating(n)}
                            className={`text-2xl leading-none transition-colors ${n <= reviewRating ? 'text-amber-400' : 'text-gray-200'}`}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Comment <span className="text-gray-400 font-normal">(optional)</span>
                      </label>
                      <textarea
                        rows={2}
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="How did it go?"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition resize-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setReviewingId(null); setReviewComment(''); setReviewRating(5) }}
                        className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSubmitReview(r)}
                        disabled={submittingReview || (isReviewed && reviewRating === reviewMap.get(r.id)?.rating && reviewComment === (reviewMap.get(r.id)?.comment ?? ''))}
                        className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                      >
                        {submittingReview ? 'Submitting…' : isReviewed ? 'Update review' : 'Submit review'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
