import { Link, useNavigate, useLocation } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { signOut } from 'firebase/auth'
import { auth } from '../../firebase'
import { asset } from '../../lib/asset'

const GRADIENT = 'linear-gradient(135deg, #ff5a5f 0%, #e8464b 55%, #c93338 100%)'

const TABS = [
  { path: '/admin/users', label: 'Users' },
  { path: '/admin/listings', label: 'Listings' },
  { path: '/admin/reviews', label: 'Reviews' },
]

export default function AdminLayout({ title, subtitle, children }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const handleSignOut = async () => {
    await signOut(auth)
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <Link to="/"><img src={asset('logo-dark.png')} alt="Surama.net" className="h-10 w-auto" /></Link>
        <div className="flex items-center gap-5">
          <Link to="/account" className="text-sm text-gray-600 hover:text-primary-600 font-medium transition-colors">
            Account
          </Link>
          <button onClick={handleSignOut} className="text-sm text-gray-600 hover:text-primary-600 font-medium transition-colors">
            Sign out
          </button>
        </div>
      </nav>

      {/* Header */}
      <div className="relative overflow-hidden" style={{ background: GRADIENT }}>
        <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-white/5 pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-6 pt-10 pb-6">
          <p className="text-primary-100 text-sm font-medium mb-1 flex items-center gap-1.5">
            <ShieldCheck size={16} /> Admin
          </p>
          <h1 className="text-3xl font-extrabold text-white mb-1">{title}</h1>
          <p className="text-primary-100 text-sm">{subtitle}</p>
        </div>

        {/* Tabs */}
        <div className="relative max-w-6xl mx-auto px-6 flex gap-1">
          {TABS.map((t) => (
            <Link
              key={t.path}
              to={t.path}
              className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-colors ${
                pathname === t.path
                  ? 'bg-gray-50 text-primary-700'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {children}
      </div>
    </div>
  )
}
