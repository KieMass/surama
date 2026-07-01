import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../../firebase'
import { useAuth } from '../../context/AuthContext'
import { asset } from '../../lib/asset'
import { getRequestsForProvider, REQUEST_STATUS } from '../../lib/requests'

const BASE_QUICK_LINKS = [
  {
    to: '/provider/listings',
    emoji: '📋',
    label: 'My Listings',
    sub: 'View, edit and manage your active services',
    color: 'bg-white',
    textColor: 'text-gray-800',
    subColor: 'text-gray-500',
    border: 'border border-gray-100 hover:border-primary-300',
  },
  {
    to: '/provider/listings/create',
    emoji: '✨',
    label: 'Create Listing',
    sub: 'Add a new service for customers to find',
    color: 'bg-primary-600 hover:bg-primary-700',
    textColor: 'text-white',
    subColor: 'text-primary-100',
    border: '',
  },
]

export default function ProviderDashboard() {
  const { userDoc } = useAuth()
  const navigate = useNavigate()
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    const loadPending = async () => {
      if (!auth.currentUser) return
      const requests = await getRequestsForProvider(auth.currentUser.uid)
      setPendingCount(requests.filter((r) => r.status === REQUEST_STATUS.PENDING).length)
    }
    loadPending()
  }, [])

  const handleSignOut = async () => {
    await signOut(auth)
    navigate('/login')
  }

  const firstName = userDoc?.name?.split(' ')[0] ?? 'there'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between sticky top-0 z-40">
        <Link to="/">
          <img src={asset('logo-dark.png')} alt="Surama.net" className="h-10 w-auto" />
        </Link>
        <button
          onClick={handleSignOut}
          className="text-sm text-gray-600 hover:text-primary-600 font-medium transition-colors"
        >
          Sign out
        </button>
      </nav>

      {/* Hero header */}
      <div className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #ff5a5f 0%, #e8464b 55%, #c93338 100%)' }}>
        {/* Decorative circles */}
        <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute top-4 left-1/3 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-6 py-10">
          <p className="text-primary-100 text-sm font-medium mb-1">Provider Dashboard</p>
          <h1 className="text-3xl font-extrabold text-white mb-2">
            Hello, {firstName}! 👋
          </h1>
          <p className="text-primary-100 text-sm">
            Manage your services and grow your business on Surama.net
          </p>
          {pendingCount > 0 && (
            <Link
              to="/provider/requests"
              className="inline-flex items-center gap-2 mt-4 bg-white/15 hover:bg-white/25 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              🔔 {pendingCount} new request{pendingCount !== 1 ? 's' : ''} waiting
            </Link>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <h2 className="text-base font-semibold text-gray-500 uppercase tracking-wide mb-4">Quick actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            to="/provider/requests"
            className="relative rounded-2xl p-6 shadow-sm transition-all bg-white border border-gray-100 hover:border-primary-300"
          >
            {pendingCount > 0 && (
              <span className="absolute top-4 right-4 bg-primary-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                {pendingCount}
              </span>
            )}
            <div className="text-3xl mb-3">📥</div>
            <h2 className="text-lg font-bold mb-1 text-gray-800">Requests</h2>
            <p className="text-sm text-gray-500">Review and respond to booking requests</p>
          </Link>
          {BASE_QUICK_LINKS.map((q) => (
            <Link
              key={q.to}
              to={q.to}
              className={`rounded-2xl p-6 shadow-sm transition-all ${q.color} ${q.border}`}
            >
              <div className="text-3xl mb-3">{q.emoji}</div>
              <h2 className={`text-lg font-bold mb-1 ${q.textColor}`}>{q.label}</h2>
              <p className={`text-sm ${q.subColor}`}>{q.sub}</p>
            </Link>
          ))}
        </div>

        {/* Tips card */}
        <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-3">💡 Tips to get more clients</h3>
          <ul className="space-y-2 text-sm text-gray-500">
            <li>• Add a clear photo to every listing — it increases views by 3×</li>
            <li>• Keep your description specific: mention your experience and turnaround time</li>
            <li>• Respond to enquiries quickly to build your reputation</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
