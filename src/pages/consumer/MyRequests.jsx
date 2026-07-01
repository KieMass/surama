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

  const loadRequests = async () => {
    setLoading(true)
    const data = await getRequestsForConsumer(auth.currentUser.uid)
    setRequests(sortByNewest(data))
    setLoading(false)
  }

  useEffect(() => {
    let cancelled = false
    getRequestsForConsumer(auth.currentUser.uid).then((data) => {
      if (cancelled) return
      setRequests(sortByNewest(data))
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const handleCancel = async (id) => {
    setCancellingId(id)
    await updateRequestStatus(id, REQUEST_STATUS.CANCELLED)
    await loadRequests()
    setCancellingId(null)
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
        <button onClick={handleSignOut} className="text-sm text-gray-600 hover:text-primary-600 font-medium transition-colors">
          Sign out
        </button>
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
          {requests.map((r) => (
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

                {r.status === REQUEST_STATUS.PENDING && (
                  <button
                    onClick={() => handleCancel(r.id)}
                    disabled={cancellingId === r.id}
                    className="text-xs font-semibold text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-200 px-3 py-2 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
                  >
                    {cancellingId === r.id ? 'Cancelling…' : 'Cancel request'}
                  </button>
                )}

                {r.status === REQUEST_STATUS.ACCEPTED && (
                  <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 flex-shrink-0 text-center">
                    Provider accepted 🎉<br />They'll be in touch to arrange payment.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
