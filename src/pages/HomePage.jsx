import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'

export const CATEGORIES = [
  'All', 'Cleaning', 'Plumbing', 'Electrical', 'Carpentry',
  'Tutoring', 'Catering', 'Photography', 'Beauty & Wellness',
  'Landscaping', 'IT Support', 'Transportation', 'Pest Control',
  'Auto Repair', 'Event Planning', 'Security', 'Moving & Storage',
  'Painting', 'Interior Design', 'Childcare', 'Fitness Training',
  'Tailoring', 'Music Lessons', 'Pet Care', 'Other',
]

const FEATURED_CATEGORIES = [
  { name: 'Cleaning',          emoji: '🧹', from: '#0ea5e9', to: '#0369a1' },
  { name: 'Plumbing',          emoji: '🔧', from: '#64748b', to: '#334155' },
  { name: 'Electrical',        emoji: '⚡', from: '#f59e0b', to: '#b45309' },
  { name: 'Carpentry',         emoji: '🪚', from: '#92400e', to: '#78350f' },
  { name: 'Tutoring',          emoji: '📚', from: '#8b5cf6', to: '#6d28d9' },
  { name: 'Catering',          emoji: '🍽️', from: '#f97316', to: '#c2410c' },
  { name: 'Photography',       emoji: '📸', from: '#ec4899', to: '#be185d' },
  { name: 'Beauty & Wellness', emoji: '💆', from: '#e879f9', to: '#a21caf' },
  { name: 'Landscaping',       emoji: '🌿', from: '#22c55e', to: '#15803d' },
  { name: 'IT Support',        emoji: '💻', from: '#6366f1', to: '#4338ca' },
  { name: 'Transportation',    emoji: '🚗', from: '#3b82f6', to: '#1d4ed8' },
  { name: 'Event Planning',    emoji: '🎉', from: '#a855f7', to: '#7e22ce' },
]

const STATS = [
  { value: '20+', label: 'Service categories' },
  { value: '100%', label: 'Guyana-based' },
  { value: 'Free', label: 'To browse & list' },
  { value: '24/7', label: 'Available listings' },
]

const HOW_IT_WORKS = [
  { emoji: '🔍', n: '01', title: 'Browse services', desc: 'Filter by category to find exactly what you need from verified local providers.' },
  { emoji: '📩', n: '02', title: 'Book a provider', desc: 'Send a request with your details and agree on a time that works for both of you.' },
  { emoji: '✅', n: '03', title: 'Get it done', desc: 'Your provider shows up and delivers — rate the experience when complete.' },
]

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar() {
  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-teal-600 tracking-tight">
          Surama.net
        </Link>
        <div className="flex items-center gap-5">
          <a href="#listings" className="text-sm text-gray-600 hover:text-gray-900 hidden sm:block">
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

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero({ onBrowse }) {
  return (
    <section
      className="relative overflow-hidden py-24 px-6 text-center"
      style={{ background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 40%, #134e4a 100%)' }}
    >
      {/* dot pattern overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      <div className="relative max-w-3xl mx-auto">
        <span className="inline-block bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-6 tracking-wide">
          🇬🇾 &nbsp;The #1 service marketplace in Guyana
        </span>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-white leading-tight mb-5 tracking-tight">
          Find trusted services
          <br />
          <span className="text-teal-200">across Guyana</span>
        </h1>

        <p className="text-lg text-teal-100 mb-10 max-w-xl mx-auto leading-relaxed">
          Connect with skilled local providers for cleaning, plumbing, tutoring,
          catering, photography and more — all in one place.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onBrowse}
            className="bg-white text-teal-700 hover:bg-teal-50 px-7 py-3.5 rounded-xl font-semibold transition-colors shadow-md"
          >
            Browse Services
          </button>
          <Link
            to="/register"
            className="border-2 border-white/60 text-white hover:bg-white/10 px-7 py-3.5 rounded-xl font-semibold transition-colors"
          >
            Offer Your Services
          </Link>
        </div>
      </div>
    </section>
  )
}

// ─── Stats ────────────────────────────────────────────────────────────────────
function StatsStrip() {
  return (
    <section className="bg-white border-b border-gray-100">
      <div className="max-w-4xl mx-auto px-6 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
        {STATS.map((s) => (
          <div key={s.label}>
            <p className="text-2xl font-bold text-teal-600">{s.value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Category showcase ────────────────────────────────────────────────────────
function CategoryShowcase({ onSelect, listingsRef }) {
  const scrollAndFilter = (name) => {
    onSelect(name)
    setTimeout(() => listingsRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  return (
    <section className="bg-gray-50 py-14 px-6">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Browse by category</h2>
        <p className="text-gray-500 mb-8 text-sm">Find exactly what you're looking for</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {FEATURED_CATEGORIES.map((cat) => (
            <button
              key={cat.name}
              onClick={() => scrollAndFilter(cat.name)}
              className="group relative rounded-2xl overflow-hidden text-left p-5 shadow-sm hover:shadow-md transition-shadow"
              style={{ background: `linear-gradient(135deg, ${cat.from}, ${cat.to})` }}
            >
              <span className="text-3xl mb-3 block">{cat.emoji}</span>
              <p className="text-white font-semibold text-sm leading-tight">{cat.name}</p>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-2xl" />
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
      <div className="w-full h-48 bg-gray-200" />
      <div className="p-4 space-y-3">
        <div className="h-3 bg-gray-200 rounded w-1/3" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-full" />
        <div className="h-3 bg-gray-200 rounded w-5/6" />
        <div className="h-9 bg-gray-200 rounded mt-2" />
      </div>
    </div>
  )
}

// ─── Service card ─────────────────────────────────────────────────────────────
function ServiceCard({ service }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-teal-200 hover:shadow-lg transition-all flex flex-col">
      <div className="relative">
        {service.imageUrl ? (
          <img src={service.imageUrl} alt={service.title} className="w-full h-48 object-cover" />
        ) : (
          <div
            className="w-full h-48 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #f0fdfa, #ccfbf1)' }}
          >
            <span className="text-6xl font-black text-teal-200 select-none">
              {service.category?.[0] ?? 'S'}
            </span>
          </div>
        )}
        <span className="absolute top-3 left-3 bg-teal-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow">
          {service.category}
        </span>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-gray-900 leading-snug mb-1">{service.title}</h3>
        <p className="text-xs text-gray-400 line-clamp-2 mb-2">{service.description}</p>
        <p className="text-xs text-gray-400 mb-3">by {service.providerName ?? 'Local Provider'}</p>
        <div className="mt-auto">
          <p className="font-bold text-gray-900 text-lg mb-3">
            {service.currency}{' '}
            <span>{service.price?.toLocaleString()}</span>
          </p>
          <Link
            to={`/services/${service.id}`}
            className="block w-full text-center border-2 border-teal-600 text-teal-600 hover:bg-teal-600 hover:text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            View details
          </Link>
        </div>
      </div>
    </div>
  )
}

// ─── Listings grid ────────────────────────────────────────────────────────────
function ListingsSection({ services, loading, activeCategory, onCategoryChange }) {
  return (
    <section id="listings" className="max-w-6xl mx-auto px-6 py-14">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Live listings</h2>
          <p className="text-gray-500 text-sm mt-1">Real services from providers near you</p>
        </div>
        {activeCategory !== 'All' && (
          <button
            onClick={() => onCategoryChange('All')}
            className="text-sm text-teal-600 hover:underline self-start sm:self-auto"
          >
            Clear filter ×
          </button>
        )}
      </div>

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-3 mb-8">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => onCategoryChange(cat)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeCategory === cat
                ? 'bg-teal-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-teal-400'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <p className="text-4xl mb-4">🔍</p>
          <p className="text-gray-500 font-medium">No services in this category yet.</p>
          <p className="text-gray-400 text-sm mt-1">Be the first to offer this service!</p>
          <Link
            to="/register"
            className="inline-block mt-5 bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            Become a provider
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      )}
    </section>
  )
}

// ─── How it works ─────────────────────────────────────────────────────────────
function HowItWorks() {
  return (
    <section className="bg-white py-16 px-6 border-t border-gray-100">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">How Surama works</h2>
          <p className="text-gray-500 text-sm">Getting help has never been simpler</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 relative">
          {/* connector line desktop */}
          <div className="hidden sm:block absolute top-8 left-1/4 right-1/4 h-px bg-teal-100" />

          {HOW_IT_WORKS.map((step) => (
            <div key={step.n} className="text-center relative">
              <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4 text-2xl shadow-sm">
                {step.emoji}
              </div>
              <span className="text-xs font-bold text-teal-500 tracking-widest uppercase mb-1 block">
                Step {step.n}
              </span>
              <h3 className="font-bold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── CTA Banner ───────────────────────────────────────────────────────────────
function CTABanner() {
  return (
    <section
      className="relative py-20 px-6 text-center overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 50%, #134e4a 100%)' }}
    >
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
      <div className="relative max-w-2xl mx-auto">
        <p className="text-teal-200 text-sm font-semibold uppercase tracking-widest mb-3">
          For service providers
        </p>
        <h2 className="text-3xl font-extrabold text-white mb-3">
          Ready to grow your business?
        </h2>
        <p className="text-teal-100 mb-8 text-lg">
          Join providers already earning on Surama.net. List your first service free.
        </p>
        <Link
          to="/register"
          className="inline-block bg-white text-teal-700 hover:bg-teal-50 px-8 py-4 rounded-xl font-bold transition-colors shadow-md text-sm"
        >
          Start offering services →
        </Link>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-10 px-6">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="text-white font-bold text-lg">Surama.net</span>
        <span className="text-sm">© 2025 Surama.net. Built for Guyana.</span>
        <div className="flex gap-5 text-sm">
          <a href="#" className="hover:text-white transition-colors">Privacy</a>
          <a href="#" className="hover:text-white transition-colors">Terms</a>
          <a href="#" className="hover:text-white transition-colors">Contact</a>
        </div>
      </div>
    </footer>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
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
              // skip
            }
          })
        )

        setServices(
          raw
            .map((s) => ({ ...s, providerName: nameMap[s.providerId] }))
            .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
        )
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
      <Hero onBrowse={scrollToListings} />
      <StatsStrip />
      <CategoryShowcase onSelect={setActiveCategory} listingsRef={listingsRef} />
      <div ref={listingsRef}>
        <ListingsSection
          services={filtered}
          loading={loading}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />
      </div>
      <HowItWorks />
      <CTABanner />
      <Footer />
    </div>
  )
}
