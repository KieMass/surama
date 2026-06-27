import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'

// ─── Data ─────────────────────────────────────────────────────────────────────

export const CATEGORIES = [
  'All', 'Cleaning', 'Plumbing', 'Electrical', 'Carpentry',
  'Tutoring', 'Catering', 'Photography', 'Beauty & Wellness',
  'Landscaping', 'IT Support', 'Transportation', 'Pest Control',
  'Auto Repair', 'Event Planning', 'Security', 'Moving & Storage',
  'Painting', 'Interior Design', 'Childcare', 'Fitness Training',
  'Tailoring', 'Music Lessons', 'Pet Care', 'Other',
]

const SLIDES = [
  {
    badge: '🇬🇾  Guyana\'s Service Marketplace',
    headline: 'Hire our Experts to get your services done',
    sub: 'Work with talented local people at affordable prices to get the most out of your time and budget on a secure platform.',
    image: '/hero-1.png',
    cta: 'Browse Services',
    ctaScroll: true,
  },
  {
    badge: '✓  Verified Local Providers',
    headline: 'Find skilled professionals right in your community',
    sub: 'From cleaning to IT support — trusted providers across Guyana are ready to help when you need them.',
    image: '/hero-2.png',
    cta: 'Explore Categories',
    ctaScroll: true,
  },
  {
    badge: '💰  Affordable Rates',
    headline: 'Quality services at prices that work for everyone',
    sub: 'Compare providers, see real pricing upfront, and choose the best fit for your needs and budget.',
    image: '/hero-3.png',
    cta: 'Get Started',
    ctaScroll: true,
  },
  {
    badge: '🚀  For Service Providers',
    headline: 'Grow your business on Surama.net',
    sub: 'Join providers already earning by listing your services free. Reach clients across Guyana today.',
    image: '/hero-4.png',
    cta: 'Become a Provider',
    ctaLink: '/register',
  },
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

const TRUST = [
  {
    icon: '✅',
    title: 'Verified Providers',
    desc: 'All providers are reviewed before listing on the platform.',
  },
  {
    icon: '💸',
    title: 'No Upfront Costs',
    desc: 'Browse and connect with service providers completely free.',
  },
  {
    icon: '🔒',
    title: 'Secure Platform',
    desc: 'Your data and dealings are protected at every step.',
  },
]

const HOW_IT_WORKS = [
  { emoji: '🔍', n: '01', title: 'Browse services', desc: 'Filter by category to find exactly what you need from verified local providers.' },
  { emoji: '📩', n: '02', title: 'Book a provider', desc: 'Send a request with your details and agree on a time that works for both of you.' },
  { emoji: '✅', n: '03', title: 'Get it done', desc: 'Your provider shows up and delivers — rate the experience when complete.' },
]

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar({ onBrowse }) {
  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link to="/">
          <img src="/logo-dark.png" alt="Surama.net" className="h-10 w-auto" />
        </Link>

        <div className="hidden md:flex items-center gap-7 text-sm font-medium text-gray-600">
          <Link to="/" className="hover:text-primary-600 transition-colors">Home</Link>
          <button onClick={onBrowse} className="hover:text-primary-600 transition-colors">Browse Services</button>
          <a href="#how-it-works" className="hover:text-primary-600 transition-colors">How it Works</a>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm text-gray-600 hover:text-gray-900 font-medium hidden sm:block">
            Sign In
          </Link>
          <Link
            to="/register"
            className="text-sm bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-lg font-semibold transition-colors"
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  )
}

// ─── Hero Slider ──────────────────────────────────────────────────────────────
function HeroSlider({ onBrowse }) {
  const [current, setCurrent] = useState(0)
  const [visible, setVisible] = useState(true)

  const goTo = useCallback((idx) => {
    setVisible(false)
    setTimeout(() => {
      setCurrent(idx)
      setVisible(true)
    }, 280)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      goTo((prev) => {
        const next = (prev + 1) % SLIDES.length
        return next
      })
    }, 5500)
    return () => clearInterval(timer)
  }, [goTo])

  const slide = SLIDES[current]

  return (
    <section className="bg-white border-b border-gray-100 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[540px]">

          {/* Left — text content */}
          <div className="flex flex-col justify-center px-8 lg:px-14 py-16 lg:py-20">
            <div
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(10px)',
                transition: 'opacity 0.35s ease, transform 0.35s ease',
              }}
            >
              <span className="inline-block bg-primary-50 text-primary-700 text-xs font-bold px-3 py-1.5 rounded-full mb-5 tracking-wide">
                {slide.badge}
              </span>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight mb-5">
                {slide.headline}
              </h1>

              <p className="text-gray-500 text-base lg:text-lg mb-8 leading-relaxed max-w-md">
                {slide.sub}
              </p>

              <div className="flex gap-3 flex-wrap">
                {slide.ctaLink ? (
                  <Link
                    to={slide.ctaLink}
                    className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors shadow-sm"
                  >
                    {slide.cta}
                  </Link>
                ) : (
                  <button
                    onClick={onBrowse}
                    className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors shadow-sm"
                  >
                    {slide.cta}
                  </button>
                )}
                <Link
                  to="/register"
                  className="border-2 border-gray-200 text-gray-700 hover:border-primary-400 hover:text-primary-600 px-6 py-3 rounded-xl font-semibold transition-colors"
                >
                  Join Free
                </Link>
              </div>
            </div>

            {/* Dot indicators */}
            <div className="flex gap-2 mt-10">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === current ? 'w-8 bg-primary-600' : 'w-2 bg-gray-300 hover:bg-gray-400'
                  }`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Right — image */}
          <div className="hidden lg:block relative bg-gray-50 overflow-hidden">
            <img
              src={slide.image}
              alt=""
              className="w-full h-full object-cover"
              style={{
                opacity: visible ? 1 : 0,
                transition: 'opacity 0.35s ease',
              }}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Trust indicators ─────────────────────────────────────────────────────────
function TrustStrip() {
  return (
    <section className="bg-gray-50 border-b border-gray-100">
      <div className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-1 sm:grid-cols-3 gap-6">
        {TRUST.map((t) => (
          <div key={t.title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
            <div className="text-3xl mb-3">{t.icon}</div>
            <h3 className="font-bold text-gray-900 mb-1">{t.title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{t.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Stats ────────────────────────────────────────────────────────────────────
function StatsStrip() {
  const stats = [
    { value: '24+', label: 'Service categories' },
    { value: '100%', label: 'Guyana-based' },
    { value: 'Free', label: 'To browse & list' },
    { value: '24/7', label: 'Active listings' },
  ]
  return (
    <section className="bg-primary-600">
      <div className="max-w-4xl mx-auto px-6 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
        {stats.map((s) => (
          <div key={s.label}>
            <p className="text-2xl font-extrabold text-white">{s.value}</p>
            <p className="text-sm text-primary-100 mt-0.5">{s.label}</p>
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
    <section id="categories" className="bg-white py-16 px-6 border-b border-gray-100">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-2">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Browse by category</h2>
            <p className="text-gray-500 text-sm mt-1">Find exactly the service you're looking for</p>
          </div>
          <button onClick={() => scrollAndFilter('All')} className="text-sm text-primary-600 hover:underline font-medium">
            View all listings →
          </button>
        </div>

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
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-primary-200 hover:shadow-lg transition-all flex flex-col">
      <div className="relative">
        {service.imageUrl ? (
          <img src={service.imageUrl} alt={service.title} className="w-full h-48 object-cover" />
        ) : (
          <div className="w-full h-48 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #fff1f2, #ffcdd0)' }}>
            <span className="text-6xl font-black text-primary-200 select-none">
              {service.category?.[0] ?? 'S'}
            </span>
          </div>
        )}
        <span className="absolute top-3 left-3 bg-primary-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow">
          {service.category}
        </span>
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-gray-900 leading-snug mb-1">{service.title}</h3>
        <p className="text-xs text-gray-400 line-clamp-2 mb-2">{service.description}</p>
        <p className="text-xs text-gray-400 mb-3">by {service.providerName ?? 'Local Provider'}</p>
        <div className="mt-auto">
          <p className="font-bold text-gray-900 text-lg mb-3">
            {service.currency} {service.price?.toLocaleString()}
          </p>
          <Link
            to={`/services/${service.id}`}
            className="block w-full text-center border-2 border-primary-600 text-primary-600 hover:bg-primary-600 hover:text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            View details
          </Link>
        </div>
      </div>
    </div>
  )
}

// ─── Listings ─────────────────────────────────────────────────────────────────
function ListingsSection({ services, loading, activeCategory, onCategoryChange }) {
  return (
    <section id="listings" className="bg-gray-50 py-16 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Live listings</h2>
            <p className="text-gray-500 text-sm mt-1">Real services from providers near you</p>
          </div>
          {activeCategory !== 'All' && (
            <button onClick={() => onCategoryChange('All')} className="text-sm text-primary-600 hover:underline self-start sm:self-auto">
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
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-400'
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
            <Link to="/register"
              className="inline-block mt-5 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
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
      </div>
    </section>
  )
}

// ─── How it works ─────────────────────────────────────────────────────────────
function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-white py-16 px-6 border-t border-gray-100">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">How Surama works</h2>
          <p className="text-gray-500 text-sm">Getting help has never been simpler</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
          {HOW_IT_WORKS.map((step) => (
            <div key={step.n} className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-4 text-2xl shadow-sm">
                {step.emoji}
              </div>
              <span className="text-xs font-bold text-primary-500 tracking-widest uppercase mb-1 block">
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
    <section className="relative py-20 px-6 text-center overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #ff5a5f 0%, #e8464b 50%, #c93338 100%)' }}>
      <div className="absolute inset-0 opacity-10"
        style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      <div className="relative max-w-2xl mx-auto">
        <p className="text-primary-100 text-sm font-semibold uppercase tracking-widest mb-3">For service providers</p>
        <h2 className="text-3xl font-extrabold text-white mb-3">Ready to grow your business?</h2>
        <p className="text-primary-100 mb-8 text-lg">
          Join providers already earning on Surama.net. List your first service free.
        </p>
        <Link to="/register"
          className="inline-block bg-white text-primary-700 hover:bg-primary-50 px-8 py-4 rounded-xl font-bold transition-colors shadow-md text-sm"
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
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <img src="/logo-white.png" alt="Surama.net" className="h-9 w-auto" />
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
            } catch { /* skip */ }
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

  const filtered = activeCategory === 'All'
    ? services
    : services.filter((s) => s.category === activeCategory)

  const scrollToListings = () =>
    listingsRef.current?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onBrowse={scrollToListings} />
      <HeroSlider onBrowse={scrollToListings} />
      <TrustStrip />
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
