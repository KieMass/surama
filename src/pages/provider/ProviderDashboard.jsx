import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { auth, db } from '../../firebase'
import { useAuth } from '../../context/AuthContext'
import { asset } from '../../lib/asset'
import { getRequestsForProvider, REQUEST_STATUS, STATUS_LABEL, STATUS_BADGE } from '../../lib/requests'
import { useNotifications } from '../../context/NotificationContext'
import NavBadge from '../../components/NavBadge'

function formatDate(ts) {
  if (!ts) return '—'
  const d = typeof ts === 'string' ? new Date(ts) : ts?.toDate?.()
  if (!d) return ts
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function isUpcoming(preferredDate) {
  if (!preferredDate) return false
  return new Date(preferredDate) >= new Date(new Date().toDateString())
}

function StatCard({ label, value, sub, accent, icon }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
        style={{ background: accent + '18' }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-extrabold text-gray-900 leading-none mb-1">{value}</p>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function ProviderDashboard() {
  const { userDoc } = useAuth()
  const navigate = useNavigate()
  const { inboxCount, requestCount } = useNotifications()

  const [requests, setRequests]   = useState([])
  const [listings, setListings]   = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    if (!auth.currentUser) return
    const uid = auth.currentUser.uid

    Promise.all([
      getRequestsForProvider(uid),
      getDocs(query(collection(db, 'services'), where('providerId', '==', uid))),
    ]).then(([reqs, snap]) => {
      setRequests(reqs.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)))
      setListings(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
  }, [])

  const handleSignOut = async () => {
    await signOut(auth)
    navigate('/login')
  }

  const firstName = userDoc?.name?.split(' ')[0] ?? 'there'

  // ── Derived stats ──────────────────────────────────────────────────────────
  const pending           = requests.filter((r) => r.status === REQUEST_STATUS.PENDING)
  const accepted          = requests.filter((r) => r.status === REQUEST_STATUS.ACCEPTED)
  const priceProposed     = requests.filter((r) => r.status === REQUEST_STATUS.PRICE_PROPOSED)
  const pendingCompletion = requests.filter((r) => r.status === REQUEST_STATUS.PENDING_COMPLETION)
  const disputed          = requests.filter((r) => r.status === REQUEST_STATUS.DISPUTED)
  const completed         = requests.filter((r) => r.status === REQUEST_STATUS.COMPLETED)
  const activeListings = listings.filter((l) => l.active)

  // Group completed earnings by currency
  const earnings = completed.reduce((acc, r) => {
    if (!r.price) return acc
    const cur = r.currency ?? 'GYD'
    acc[cur] = (acc[cur] ?? 0) + r.price
    return acc
  }, {})
  const earningsDisplay = Object.entries(earnings)
    .map(([cur, total]) => `${cur} ${total.toLocaleString()}`)
    .join(' · ') || '—'

  // Upcoming: accepted or pending-confirmation jobs with a future date
  const upcoming = [...accepted, ...pendingCompletion]
    .filter((r) => isUpcoming(r.preferredDate))
    .sort((a, b) => new Date(a.preferredDate) - new Date(b.preferredDate))

  // Recent 5 requests
  const recent = requests.slice(0, 5)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between sticky top-0 z-40">
        <Link to="/"><img src={asset('logo-dark.png')} alt="Surama.net" className="h-10 w-auto" /></Link>
        <div className="flex items-center gap-5">
          <Link to="/provider/requests" className="text-sm text-gray-600 hover:text-primary-600 font-medium transition-colors">
            <NavBadge count={requestCount}>Requests</NavBadge>
          </Link>
          <Link to="/inbox" className="text-sm text-gray-600 hover:text-primary-600 font-medium transition-colors">
            <NavBadge count={inboxCount}>💬 Inbox</NavBadge>
          </Link>
          <button onClick={handleSignOut} className="text-sm text-gray-600 hover:text-primary-600 font-medium transition-colors">
            Sign out
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #ff5a5f 0%, #e8464b 55%, #c93338 100%)' }}>
        <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute top-4 left-1/3 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-6 py-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-primary-100 text-sm font-medium mb-1">Provider Dashboard</p>
            <h1 className="text-3xl font-extrabold text-white mb-1">Hello, {firstName}! 👋</h1>
            <p className="text-primary-100 text-sm">Here's what's happening with your business today.</p>
          </div>
          {pending.length > 0 && (
            <Link
              to="/provider/requests"
              className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors border border-white/20 flex-shrink-0"
            >
              🔔 {pending.length} request{pending.length !== 1 ? 's' : ''} need action
            </Link>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Active listings"  value={loading ? '—' : activeListings.length}  icon="📋" accent="#ff5a5f" />
          <StatCard label="Pending requests" value={loading ? '—' : pending.length}          icon="⏳" accent="#f59e0b"
            sub={pending.length > 0 ? 'Need your response' : 'All caught up'} />
          <StatCard label="Jobs completed"   value={loading ? '—' : completed.length}        icon="✅" accent="#22c55e" />
          <StatCard label="Total earned"     value={loading ? '—' : earningsDisplay}         icon="💰" accent="#6366f1"
            sub="From completed jobs" />
        </div>

        {/* ── Main two-column ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left — upcoming + recent */}
          <div className="lg:col-span-2 space-y-6">

            {/* Upcoming scheduled jobs */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
                <h2 className="font-bold text-gray-900">Upcoming Scheduled Jobs</h2>
                <Link to="/provider/requests" className="text-xs text-primary-600 font-semibold hover:underline">View all →</Link>
              </div>
              {loading ? (
                <div className="flex justify-center py-10">
                  <div className="w-6 h-6 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : upcoming.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <p className="text-3xl mb-2">📅</p>
                  <p className="text-sm">No upcoming scheduled jobs.</p>
                  <p className="text-xs mt-1">Accepted requests with a date will appear here.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {upcoming.map((r) => (
                    <div key={r.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                      {/* Date pill */}
                      <div className="flex-shrink-0 w-14 text-center bg-primary-50 rounded-xl py-2">
                        <p className="text-xs font-bold text-primary-600 uppercase tracking-wide leading-none">
                          {new Date(r.preferredDate).toLocaleDateString(undefined, { month: 'short' })}
                        </p>
                        <p className="text-xl font-extrabold text-primary-700 leading-tight">
                          {new Date(r.preferredDate).getDate()}
                        </p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{r.serviceTitle}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {r.consumerName || 'Customer'} · {r.currency} {r.price?.toLocaleString()}
                        </p>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${STATUS_BADGE[r.status]}`}>
                        {STATUS_LABEL[r.status]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent requests */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
                <h2 className="font-bold text-gray-900">Recent Requests</h2>
                <Link to="/provider/requests" className="text-xs text-primary-600 font-semibold hover:underline">View all →</Link>
              </div>
              {loading ? (
                <div className="flex justify-center py-10">
                  <div className="w-6 h-6 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : recent.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <p className="text-3xl mb-2">📭</p>
                  <p className="text-sm">No requests yet.</p>
                  <p className="text-xs mt-1">When customers request your services they'll show up here.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {recent.map((r) => (
                    <div key={r.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{r.serviceTitle}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {r.consumerName || 'Customer'} · {formatDate(r.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-sm font-semibold text-gray-700">
                          {r.currency} {r.price?.toLocaleString()}
                        </span>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_BADGE[r.status]}`}>
                          {STATUS_LABEL[r.status]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right — quick actions + breakdown */}
          <div className="space-y-5">

            {/* Quick actions */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-50">
                <h2 className="font-bold text-gray-900">Quick Actions</h2>
              </div>
              <div className="p-4 space-y-2">
                <Link to="/provider/requests"
                  className="relative flex items-center gap-3 p-3.5 rounded-xl hover:bg-primary-50 transition-colors group">
                  <span className="text-xl">📥</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800 group-hover:text-primary-700">Requests</p>
                    <p className="text-xs text-gray-400">Review & respond</p>
                  </div>
                  {pending.length > 0 && (
                    <span className="bg-primary-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                      {pending.length}
                    </span>
                  )}
                </Link>
                <Link to="/provider/listings"
                  className="flex items-center gap-3 p-3.5 rounded-xl hover:bg-gray-50 transition-colors group">
                  <span className="text-xl">📋</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800 group-hover:text-primary-700">My Listings</p>
                    <p className="text-xs text-gray-400">{loading ? '…' : `${activeListings.length} active`}</p>
                  </div>
                </Link>
                <Link to="/provider/listings/create"
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-primary-600 hover:bg-primary-700 transition-colors group">
                  <span className="text-xl">✨</span>
                  <div>
                    <p className="text-sm font-bold text-white">New Listing</p>
                    <p className="text-xs text-primary-100">Add a service</p>
                  </div>
                </Link>
                <Link to="/inbox"
                  className="relative flex items-center gap-3 p-3.5 rounded-xl hover:bg-gray-50 transition-colors group border border-gray-100">
                  <span className="text-xl">💬</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800 group-hover:text-primary-700">Messages</p>
                    <p className="text-xs text-gray-400">Chat with customers</p>
                  </div>
                  {inboxCount > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold min-w-[20px] h-5 rounded-full flex items-center justify-center px-1">
                      {inboxCount > 9 ? '9+' : inboxCount}
                    </span>
                  )}
                </Link>
              </div>
            </div>

            {/* Request breakdown */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-50">
                <h2 className="font-bold text-gray-900">Request Breakdown</h2>
              </div>
              <div className="p-5 space-y-3">
                {[
                  { label: 'Pending',          count: pending.length,                                                         color: 'bg-amber-400' },
                  { label: 'Accepted',         count: accepted.length,                                                        color: 'bg-emerald-400' },
                  { label: 'Price pending',    count: priceProposed.length,                                                   color: 'bg-indigo-400' },
                  { label: 'Awaiting confirm', count: pendingCompletion.length,                                               color: 'bg-purple-400' },
                  { label: 'Disputed',         count: disputed.length,                                                        color: 'bg-orange-400' },
                  { label: 'Completed',        count: completed.length,                                                       color: 'bg-primary-500' },
                  { label: 'Declined',         count: requests.filter((r) => r.status === REQUEST_STATUS.DECLINED).length,   color: 'bg-red-400' },
                  { label: 'Cancelled',        count: requests.filter((r) => r.status === REQUEST_STATUS.CANCELLED).length,  color: 'bg-gray-300' },
                ].map(({ label, count, color }) => {
                  const pct = requests.length ? Math.round((count / requests.length) * 100) : 0
                  return (
                    <div key={label}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-600 font-medium">{label}</span>
                        <span className="text-gray-400">{count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
                {requests.length === 0 && !loading && (
                  <p className="text-xs text-gray-400 text-center py-2">No requests yet</p>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
