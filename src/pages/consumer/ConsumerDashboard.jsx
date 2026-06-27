import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { db, auth } from '../../firebase'
import { useAuth } from '../../context/AuthContext'
import { asset } from '../../lib/asset'

const ALL = 'All'

export default function ConsumerDashboard() {
  const { userDoc } = useAuth()
  const navigate = useNavigate()
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState(ALL)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchServices = async () => {
      const q = query(collection(db, 'services'), where('active', '==', true))
      const snap = await getDocs(q)
      setServices(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }
    fetchServices()
  }, [])

  const categories = [ALL, ...new Set(services.map((s) => s.category))]

  const filtered = services.filter((s) => {
    const matchesCat = activeCategory === ALL || s.category === activeCategory
    const matchesSearch = search === '' ||
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.category.toLowerCase().includes(search.toLowerCase())
    return matchesCat && matchesSearch
  })

  const handleSignOut = async () => {
    await signOut(auth)
    navigate('/login')
  }

  const firstName = userDoc?.name?.split(' ')[0] ?? ''

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between sticky top-0 z-40">
        <img src={asset('logo-dark.png')} alt="Surama.net" className="h-10 w-auto" />
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
        <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute top-4 left-1/3 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-6 py-10">
          <p className="text-primary-100 text-sm font-medium mb-1">Find Services</p>
          <h1 className="text-3xl font-extrabold text-white mb-4">
            {firstName ? `Hello, ${firstName}! 👋` : 'What can we help you with?'}
          </h1>

          {/* Integrated search bar */}
          <div className="flex items-center bg-white rounded-xl shadow-md overflow-hidden max-w-xl">
            <span className="px-4 text-gray-400 text-lg">🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search services — e.g. plumber, tutor…"
              className="flex-1 py-3 pr-4 text-sm text-gray-800 focus:outline-none placeholder-gray-400"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="px-4 text-gray-400 hover:text-gray-600 text-lg"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Category pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">
            {loading ? 'Loading…' : `${filtered.length} service${filtered.length !== 1 ? 's' : ''} found`}
          </p>
          {(activeCategory !== ALL || search) && (
            <button
              onClick={() => { setActiveCategory(ALL); setSearch('') }}
              className="text-sm text-primary-600 hover:underline"
            >
              Clear filters ×
            </button>
          )}
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-gray-600 font-medium">No services found</p>
            <p className="text-gray-400 text-sm mt-1">Try a different category or search term</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((service) => (
            <div
              key={service.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:border-primary-200 hover:shadow-md transition-all"
            >
              {service.imageUrl ? (
                <img src={service.imageUrl} alt={service.title} className="w-full h-44 object-cover" />
              ) : (
                <div className="w-full h-44 flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #fff1f2, #ffcdd0)' }}>
                  <span className="text-5xl font-black text-primary-200 select-none">
                    {service.category?.[0] ?? 'S'}
                  </span>
                </div>
              )}
              <div className="p-4">
                <span className="text-xs text-primary-600 font-bold uppercase tracking-wide">
                  {service.category}
                </span>
                <h2 className="font-semibold text-gray-800 mt-1 mb-1 leading-snug">{service.title}</h2>
                <p className="text-sm text-gray-500 line-clamp-2 mb-3">{service.description}</p>
                <p className="text-primary-600 font-bold">
                  {service.currency} {service.price?.toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
