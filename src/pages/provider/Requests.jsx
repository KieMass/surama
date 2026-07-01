import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../../firebase'
import { useAuth } from '../../context/AuthContext'
import { asset } from '../../lib/asset'
import {
  getRequestsForProvider,
  updateRequestStatus,
  sortByNewest,
  REQUEST_STATUS,
  STATUS_LABEL,
  STATUS_BADGE,
} from '../../lib/requests'

const FILTERS = ['All', 'Pending', 'Accepted', 'Declined', 'Completed', 'Cancelled']

function formatDate(timestamp) {
  if (!timestamp?.toDate) return ''
  return timestamp.toDate().toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

export default function Requests() {
  const { userDoc } = useAuth()
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('Pending')
  const [busyId, setBusyId] = useState(null)

  const loadRequests = async () => {
    setLoading(true)
    const data = await getRequestsForProvider(auth.currentUser.uid)
    setRequests(sortByNewest(data))
    setLoading(false)
  }

  useEffect(() => {
    let cancelled = false
    getRequestsForProvider(auth.currentUser.uid).then((data) => {
      if (cancelled) return
      setRequests(sortByNewest(data))
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const handleStatusChange = async (id, status) => {
    setBusyId(id)
    await updateRequestStatus(id, status)
    await loadRequests()
    setBusyId(null)
  }

  const handleSignOut = async () => {
    await signOut(auth)
    navigate('/login')
  }

  const pendingCount = requests.filter((r) => r.status === REQUEST_STATUS.PENDING).length

  const filtered = requests.filter((r) => filter === 'All' || STATUS_LABEL[r.status] === filter)

  const firstName = userDoc?.name?.split(' ')[0] ?? 'there'

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
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-primary-100 text-sm font-medium mb-1">Hello, {firstName}</p>
              <h1 className="text-3xl font-extrabold text-white mb-1">Incoming Requests</h1>
              <p className="text-primary-100 text-sm">
                {pendingCount > 0
                  ? `${pendingCount} request${pendingCount !== 1 ? 's' : ''} waiting on you`
                  : "You're all caught up"}
              </p>
            </div>
            <Link
              to="/provider/dashboard"
              className="bg-white/15 hover:bg-white/25 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
            >
              ← Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Filter pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-gray-600 font-medium">No {filter !== 'All' ? filter.toLowerCase() : ''} requests</p>
            <p className="text-gray-400 text-sm mt-1">New requests from customers will show up here</p>
          </div>
        )}

        <div className="space-y-4">
          {filtered.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="text-xs text-primary-600 font-bold uppercase tracking-wide">
                      {r.serviceCategory}
                    </span>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${STATUS_BADGE[r.status]}`}>
                      {STATUS_LABEL[r.status]}
                    </span>
                  </div>
                  <p className="font-semibold text-gray-900">{r.serviceTitle}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    From <span className="font-medium text-gray-700">{r.consumerName || 'A customer'}</span>
                    {r.preferredDate && ` · Preferred: ${r.preferredDate}`}
                  </p>
                  {r.message && (
                    <p className="text-sm text-gray-600 mt-2 bg-gray-50 rounded-xl p-3">{r.message}</p>
                  )}

                  {r.status !== REQUEST_STATUS.PENDING && (
                    <p className="text-xs text-gray-500 mt-3 bg-primary-50 border border-primary-100 rounded-lg px-3 py-2 inline-block">
                      📧 {r.consumerEmail}
                    </p>
                  )}

                  <p className="text-xs text-gray-400 mt-2">Requested {formatDate(r.createdAt)}</p>
                </div>

                {r.status === REQUEST_STATUS.PENDING && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleStatusChange(r.id, REQUEST_STATUS.DECLINED)}
                      disabled={busyId === r.id}
                      className="text-xs font-semibold text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-200 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => handleStatusChange(r.id, REQUEST_STATUS.ACCEPTED)}
                      disabled={busyId === r.id}
                      className="text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {busyId === r.id ? 'Saving…' : 'Accept'}
                    </button>
                  </div>
                )}

                {r.status === REQUEST_STATUS.ACCEPTED && (
                  <button
                    onClick={() => handleStatusChange(r.id, REQUEST_STATUS.COMPLETED)}
                    disabled={busyId === r.id}
                    className="text-xs font-semibold text-white bg-gray-800 hover:bg-gray-900 px-3 py-2 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
                  >
                    Mark completed
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
