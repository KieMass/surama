import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { asset } from '../lib/asset'

function timeAgo(timestamp) {
  if (!timestamp) return ''
  const ms = Date.now() - timestamp.toMillis()
  const days = Math.floor(ms / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return months === 1 ? '1 month ago' : `${months} months ago`
}

export default function ServiceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [service, setService]   = useState(null)
  const [provider, setProvider] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [contacted, setContacted] = useState(false)

  useEffect(() => {
    const fetch = async () => {
      try {
        const svcSnap = await getDoc(doc(db, 'services', id))
        if (!svcSnap.exists()) { setNotFound(true); setLoading(false); return }

        const svcData = { id: svcSnap.id, ...svcSnap.data() }
        setService(svcData)

        // Fetch provider separately — don't fail the whole page if rules block it
        if (svcData.providerId) {
          try {
            const provSnap = await getDoc(doc(db, 'users', svcData.providerId))
            if (provSnap.exists()) setProvider(provSnap.data())
          } catch {
            // Provider profile unavailable — page still renders without it
          }
        }
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <nav className="bg-white border-b border-gray-100 px-6 py-3 sticky top-0 z-40 shadow-sm">
          <Link to="/"><img src={asset('logo-dark.png')} alt="Surama.net" className="h-10 w-auto" /></Link>
        </nav>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <nav className="bg-white border-b border-gray-100 px-6 py-3 sticky top-0 z-40 shadow-sm">
          <Link to="/"><img src={asset('logo-dark.png')} alt="Surama.net" className="h-10 w-auto" /></Link>
        </nav>
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <p className="text-5xl mb-4">🔍</p>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Service not found</h1>
          <p className="text-gray-500 mb-6">This listing may have been removed or is no longer active.</p>
          <Link to="/" className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-colors">
            Browse all services
          </Link>
        </div>
      </div>
    )
  }

  const initials = provider?.name
    ? provider.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 px-6 py-3 sticky top-0 z-40 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link to="/"><img src={asset('logo-dark.png')} alt="Surama.net" className="h-10 w-auto" /></Link>
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-gray-600 hover:text-primary-600 font-medium transition-colors flex items-center gap-1.5"
          >
            ← Back
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Hero image */}
        <div className="rounded-2xl overflow-hidden mb-8 shadow-sm">
          {service.imageUrl ? (
            <img src={service.imageUrl} alt={service.title} className="w-full h-64 sm:h-80 object-cover" />
          ) : (
            <div
              className="w-full h-64 sm:h-80 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #fff1f2 0%, #ffcdd0 100%)' }}
            >
              <span className="text-9xl font-black text-primary-200 select-none">
                {service.category?.[0] ?? 'S'}
              </span>
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left — details */}
          <div className="lg:col-span-2 space-y-6">

            {/* Title & category */}
            <div>
              <span className="inline-block bg-primary-50 text-primary-600 text-xs font-bold px-3 py-1.5 rounded-full mb-3 tracking-widest uppercase">
                {service.category}
              </span>
              <h1 className="text-3xl font-extrabold text-gray-900 leading-tight mb-2">
                {service.title}
              </h1>
              {service.createdAt && (
                <p className="text-xs text-gray-400">Listed {timeAgo(service.createdAt)}</p>
              )}
            </div>

            {/* Description */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-bold text-gray-900 mb-3 text-lg">About this service</h2>
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">{service.description}</p>
            </div>

            {/* Provider card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-bold text-gray-900 mb-4 text-lg">About the provider</h2>
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-extrabold text-lg flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #ff5a5f, #c93338)' }}
                >
                  {initials}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-lg">{provider?.name ?? 'Local Provider'}</p>
                  <p className="text-sm text-gray-500">Service Provider on Surama.net</p>
                </div>
              </div>
            </div>

            {/* What's included hints */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-bold text-gray-900 mb-4 text-lg">Why book on Surama?</h2>
              <ul className="space-y-3">
                {[
                  ['✅', 'Verified local provider'],
                  ['💸', 'Transparent pricing — no hidden fees'],
                  ['🔒', 'Secure, trusted platform'],
                ].map(([icon, text]) => (
                  <li key={text} className="flex items-center gap-3 text-sm text-gray-600">
                    <span className="text-lg">{icon}</span>
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right — pricing / CTA */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-20">
              {/* Price header */}
              <div
                className="px-6 py-5 text-white"
                style={{ background: 'linear-gradient(135deg, #ff5a5f, #c93338)' }}
              >
                <p className="text-primary-100 text-xs font-semibold uppercase tracking-widest mb-1">Starting from</p>
                <p className="text-3xl font-extrabold">
                  {service.currency} {service.price?.toLocaleString()}
                </p>
              </div>

              <div className="p-6 space-y-4">
                {/* Provider summary */}
                <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #ff5a5f, #c93338)' }}
                  >
                    {initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{provider?.name ?? 'Local Provider'}</p>
                    <p className="text-xs text-gray-400">Provider</p>
                  </div>
                </div>

                {/* CTA */}
                {!contacted ? (
                  <button
                    onClick={() => setContacted(true)}
                    className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3.5 rounded-xl transition-colors shadow-sm text-sm"
                  >
                    Contact Provider
                  </button>
                ) : (
                  <div className="bg-primary-50 border border-primary-100 rounded-xl p-4 text-center">
                    <p className="text-xs font-semibold text-primary-700 uppercase tracking-wide mb-1">Provider contact</p>
                    <p className="text-sm font-bold text-gray-800">{provider?.email ?? 'Contact via Surama'}</p>
                    <p className="text-xs text-gray-500 mt-2">Mention you found them on Surama.net</p>
                  </div>
                )}

                <Link
                  to="/"
                  className="block w-full text-center border-2 border-gray-200 text-gray-600 hover:border-primary-400 hover:text-primary-600 font-semibold py-3 rounded-xl transition-colors text-sm"
                >
                  Browse more services
                </Link>

                <p className="text-center text-xs text-gray-400 pt-1">
                  Free to contact — no account required
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
