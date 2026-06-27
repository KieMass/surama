import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { db, auth } from '../../firebase'
import { useAuth } from '../../context/AuthContext'

const ALL = 'All'

export default function ConsumerDashboard() {
  const { userDoc } = useAuth()
  const navigate = useNavigate()
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState(ALL)

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
  const filtered =
    activeCategory === ALL
      ? services
      : services.filter((s) => s.category === activeCategory)

  const handleSignOut = async () => {
    await signOut(auth)
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-teal-600 text-white px-6 py-4 flex items-center justify-between">
        <span className="text-xl font-semibold tracking-tight">Surama</span>
        <button onClick={handleSignOut} className="text-sm hover:underline">
          Sign out
        </button>
      </nav>

      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-2xl font-semibold text-gray-800 mb-1">
          {userDoc?.name ? `Hello, ${userDoc.name}!` : 'Browse Services'}
        </h1>
        <p className="text-gray-500 mb-6">Find trusted service providers in Guyana</p>

        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-teal-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-teal-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <p className="text-gray-400 text-center py-16 text-lg">
            No services found in this category.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((service) => (
            <div
              key={service.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:border-teal-200 hover:shadow-md transition-all"
            >
              {service.imageUrl ? (
                <img
                  src={service.imageUrl}
                  alt={service.title}
                  className="w-full h-44 object-cover"
                />
              ) : (
                <div className="w-full h-44 bg-teal-50 flex items-center justify-center">
                  <span className="text-teal-200 text-5xl font-bold">S</span>
                </div>
              )}
              <div className="p-4">
                <span className="text-xs text-teal-600 font-semibold uppercase tracking-wide">
                  {service.category}
                </span>
                <h2 className="font-semibold text-gray-800 mt-1 mb-1 leading-snug">
                  {service.title}
                </h2>
                <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                  {service.description}
                </p>
                <p className="text-teal-600 font-semibold">
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
