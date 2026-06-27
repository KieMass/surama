import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'

const CATEGORIES = [
  'All', 'Cleaning', 'Plumbing', 'Electrical', 'Carpentry',
  'Tutoring', 'Catering', 'Photography', 'Landscaping', 'IT Support', 'Other',
]

const HOW_IT_WORKS = [
  {
    n: '1',
    title: 'Browse services',
    desc: 'Search and filter by category to find exactly what you need.',
  },
  {
    n: '2',
    title: 'Book a provider',
    desc: 'Send a request with your details and schedule a time that works.',
  },
  {
    n: '3',
    title: 'Get it done',
    desc: 'Provider confirms and delivers the service right to your door.',
  },
]

function Navbar() {
  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-teal-600 tracking-tight">
          Surama.net
        </Link>
        <div className="flex items-center gap-5">
          <a
            href="#listings"
            className="text-sm text-gray-600 hover:text-gray-900 hidden sm:block"
          >
            Browse Services
          </a>
          <Link to="/login" className="text-sm text-gray-600 hover:text-gray-900">
            Sign In
          </Link>
          <Link
            to="/register"
            className="text-sm bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
      <div className="w-full h-44 bg-gray-200" />
      <div className="p-4 space-y-3">
        <div className="h-3 bg-gray-200 rounded w-1/3" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-full" />
        <div className="h-3 bg-gray-200 rounded w-5/6" />
        <div className="h-8 bg-gray-200 rounded mt-2" />
      </div>
    </div>
  )
}

function ServiceCard({ service }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:border-teal-200 hover:shadow-md transition-all flex flex-col">
      <div className="relative">
        {service.imageUrl ? (
          <img
            src={service.imageUrl}
            alt={service.title}
            className="w-full h-44 object-cover"
          />
        ) : (
          <div className="w-full h-44 bg-gray-100 flex items-center justify-center">
            <span className="text-5xl font-bold text-gray-200">
              {service.category?.[0] ?? 'S'}
            </span>
          </div>
        )}
        <span className="absolute top-3 left-3 bg-teal-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
          {service.category}
        </span>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-medium text-gray-900 leading-snug mb-1">{service.title}</h3>
        <p className="text-xs text-gray-400 line-clamp-2 mb-2">{service.description}</p>
        <p className="text-xs text-gray-400 mb-3">
          by {service.providerName ?? 'Provider'}
        </p>
        <div className="mt-auto">
          <p className="font-semibold text-gray-900 mb-3">
            {service.currency} {service.price?.toLocaleString()}
          </p>
          <Link
            to={`/services/${service.id}`}
            className="block w-full text-center border border-teal-600 text-teal-600 hover:bg-teal-50 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            View details
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('All')
  const listingsRef = useRef(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const q = query(collection(db, 'services'), where('active', '==', true))
        const snap = await getDocs(q)
        const raw = snap.docs.map((d) => ({ id: d.id, ...d.data() }))

        const uniqueIds = [...new Set(raw.map((s) => s.providerId).filter(Boolean))]
        const nameMap = {}
        await Promise.all(
          uniqueIds.map(async (uid) => {
            try {
              const userSnap = await getDoc(doc(db, 'users', uid))
              if (userSnap.exists()) nameMap[uid] = userSnap.data().name
            } catch {
              // silently skip missing provider docs
            }
          })
        )

        const enriched = raw
          .map((s) => ({ ...s, providerName: nameMap[s.providerId] }))
          .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))

        setServices(enriched)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const filtered =
    activeCategory === 'All'
      ? services
      : services.filter((s) => s.category === activeCategory)

  const scrollToListings = () =>
    listingsRef.current?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero */}
      <section className="bg-white py-20 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight mb-4">
            Find trusted services
            <br />
            across Guyana
          </h1>
          <p className="text-lg text-gray-500 mb-8 max-w-xl mx-auto">
            Connect with skilled providers for cleaning, plumbing, tutoring, catering,
            photography and more — all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={scrollToListings}
              className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Browse Services
            </button>
            <Link
              to="/register"
              className="border border-teal-600 text-teal-600 hover:bg-teal-50 px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Offer Your Services
            </Link>
          </div>
        </div>
      </section>

      {/* Listings */}
      <section id="listings" ref={listingsRef} className="max-w-6xl mx-auto px-6 py-12">
        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-3 mb-8">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-teal-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-teal-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">No services in this category yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        )}
      </section>

      {/* How it works */}
      <section className="bg-white py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">
            How it works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.n} className="text-center">
                <div className="text-6xl font-bold text-teal-100 mb-3 leading-none">
                  {step.n}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-teal-600 py-16 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-2">
            Ready to grow your business?
          </h2>
          <p className="text-teal-100 mb-6">
            Join hundreds of providers already earning on Surama.net
          </p>
          <Link
            to="/register"
            className="inline-block bg-white text-teal-600 hover:bg-teal-50 px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Start offering services
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-teal-600 font-bold text-lg">Surama.net</span>
          <span className="text-sm text-gray-400">
            © 2025 Surama.net. Built for Guyana.
          </span>
          <div className="flex gap-4 text-sm text-gray-500">
            <a href="#" className="hover:text-gray-700">Privacy</a>
            <a href="#" className="hover:text-gray-700">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
