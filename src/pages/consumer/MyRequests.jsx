import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../../firebase'
import { useAuth } from '../../context/AuthContext'
import { asset } from '../../lib/asset'
import {
  getRequestsForConsumer,
  updateRequestStatus,
  sortByNewest,
  REQUEST_STATUS,
  STATUS_LABEL,
  STATUS_BADGE,
} from '../../lib/requests'
import { createReview, updateReview, getReviewedRequestIds } from '../../lib/reviews'

function formatDate(timestamp) {
  if (!timestamp?.toDate) return ''
  return timestamp.toDate().toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

export default function MyRequests() {
  const { userDoc } = useAuth()
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState(null)
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
    const sorted = sortByNewest(data)
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
            💬 Inbox
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

                    {r.status === REQUEST_STATUS.COMPLETED && isReviewed && !isReviewing && (
                      <div className="flex flex-col items-end gap-1.5">
                        {isSuccessFlash && (
                          <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-1.5">
                            ✅ Thank you for your review!
                          </span>
                        )}
                        <button
                          onClick={() => openReviewForm(r)}
                          className="text-xs font-semibold text-primary-600 border border-primary-200 hover:bg-primary-50 px-3 py-2 rounded-lg transition-colors"
                        >
                          ✏️ Update review
                        </button>
                      </div>
                    )}
                  </div>
                </div>

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
                        disabled={submittingReview}
                        className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm"
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
