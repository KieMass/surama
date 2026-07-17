import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs, doc, getDoc, orderBy, limit } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { db, auth } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { asset } from '../lib/asset'
import {
  SprayCan, Wrench, Zap, Hammer, BookOpen, ChefHat,
  Camera, Sparkles, Leaf, Laptop, Car, PartyPopper,
} from 'lucide-react'

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
    image: asset('hero-1.png'),
    cta: 'Browse Services',
    ctaScroll: true,
  },
  {
    badge: '✓  Verified Local Providers',
    headline: 'Find skilled professionals right in your community',
    sub: 'From cleaning to IT support — trusted providers across Guyana are ready to help when you need them.',
    image: asset('hero-2.png'),
    cta: 'Explore Categories',
    ctaScroll: true,
  },
  {
    badge: '💰  Affordable Rates',
    headline: 'Quality services at prices that work for everyone',
    sub: 'Compare providers, see real pricing upfront, and choose the best fit for your needs and budget.',
    image: asset('hero-3.png'),
    cta: 'Get Started',
    ctaScroll: true,
  },
  {
    badge: '🚀  For Service Providers',
    headline: 'Grow your business on Surama.net',
    sub: 'Join providers already earning by listing your services free. Reach clients across Guyana today.',
    image: asset('hero-4.png'),
    cta: 'Become a Provider →',
    ctaLink: '/register',
  },
]

const FEATURED_CATEGORIES = [
  { name: 'Cleaning',          Icon: SprayCan,    from: '#0ea5e9', to: '#0369a1' },
  { name: 'Plumbing',          Icon: Wrench,      from: '#64748b', to: '#334155' },
  { name: 'Electrical',        Icon: Zap,         from: '#f59e0b', to: '#b45309' },
  { name: 'Carpentry',         Icon: Hammer,      from: '#92400e', to: '#78350f' },
  { name: 'Tutoring',          Icon: BookOpen,    from: '#8b5cf6', to: '#6d28d9' },
  { name: 'Catering',          Icon: ChefHat,     from: '#f97316', to: '#c2410c' },
  { name: 'Photography',       Icon: Camera,      from: '#ec4899', to: '#be185d' },
  { name: 'Beauty & Wellness', Icon: Sparkles,    from: '#e879f9', to: '#a21caf' },
  { name: 'Landscaping',       Icon: Leaf,        from: '#22c55e', to: '#15803d' },
  { name: 'IT Support',        Icon: Laptop,      from: '#6366f1', to: '#4338ca' },
  { name: 'Transportation',    Icon: Car,         from: '#3b82f6', to: '#1d4ed8' },
  { name: 'Event Planning',    Icon: PartyPopper, from: '#a855f7', to: '#7e22ce' },
]

const TRUST = [
  { icon: '✅', title: 'Verified Providers', desc: 'All providers are reviewed before listing on the platform.' },
  { icon: '💸', title: 'No Upfront Costs',   desc: 'Browse and connect with service providers completely free.' },
  { icon: '🔒', title: 'Secure Platform',    desc: 'Your data and dealings are protected at every step.' },
]

const HOW_IT_WORKS = [
  { emoji: '🔍', n: '01', title: 'Browse services',  desc: 'Filter by category to find exactly what you need from verified local providers.' },
  { emoji: '📩', n: '02', title: 'Book a provider',  desc: 'Send a request with your details and agree on a time that works for both of you.' },
  { emoji: '✅', n: '03', title: 'Get it done',       desc: 'Your provider shows up and delivers — rate the experience when complete.' },
]

const STATS = [
  { value: '24+',  label: 'Service categories' },
  { value: '100%', label: 'Guyana-based' },
  { value: 'Free', label: 'To browse & list' },
  { value: '24/7', label: 'Active listings' },
]

// ─── Reusable section badge ───────────────────────────────────────────────────
function SectionBadge({ children }) {
  return (
    <span className="inline-block bg-primary-50 text-primary-600 text-xs font-bold px-3 py-1.5 rounded-full mb-3 tracking-widest uppercase">
      {children}
    </span>
  )
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar({ onBrowse }) {
  const { user, userDoc } = useAuth()
  const navigate = useNavigate()

  const dashboardPath = userDoc?.role === 'provider' ? '/provider/dashboard' : '/consumer/dashboard'
  const dashboardLabel = userDoc?.role === 'provider' ? 'Provider Dashboard' : 'My Dashboard'

  const handleSignOut = async () => {
    await signOut(auth)
    navigate('/')
  }

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link to="/">
          <img src={asset('logo-dark.png')} alt="Surama.net" className="h-10 w-auto" />
        </Link>

        <div className="hidden md:flex items-center gap-7 text-sm font-medium text-gray-600">
          <Link to="/" className="hover:text-primary-600 transition-colors">Home</Link>
          <button onClick={onBrowse} className="hover:text-primary-600 transition-colors">Browse Services</button>
          <a href="#how-it-works" className="hover:text-primary-600 transition-colors">How it Works</a>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                to={dashboardPath}
                className="text-sm text-gray-600 hover:text-primary-600 font-medium hidden sm:block transition-colors"
              >
                {dashboardLabel}
              </Link>
              <button
                onClick={handleSignOut}
                className="text-sm border border-gray-200 hover:border-primary-300 text-gray-600 hover:text-primary-600 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm text-gray-600 hover:text-gray-900 font-medium hidden sm:block">
                Sign In
              </Link>
              <Link
                to="/register"
                className="text-sm bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-lg font-semibold transition-colors shadow-sm shadow-primary-100"
              >
                Get Started
              </Link>
            </>
          )}
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
      goTo((prev) => (prev + 1) % SLIDES.length)
    }, 5500)
    return () => clearInterval(timer)
  }, [goTo])

  const slide = SLIDES[current]

  return (
    <section className="border-b border-gray-100 overflow-hidden bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[560px]">

          {/* Left — text */}
          <div
            className="flex flex-col justify-center px-8 lg:px-14 py-16 lg:py-20 relative"
            style={{ background: 'linear-gradient(160deg, rgba(255,241,242,0.55) 0%, rgba(255,255,255,0) 55%)' }}
          >
            {/* Subtle decorative ring */}
            <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full border-[40px] border-primary-50 opacity-60 pointer-events-none" />

            <div
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(10px)',
                transition: 'opacity 0.35s ease, transform 0.35s ease',
              }}
            >
              <span className="inline-flex items-center gap-1.5 bg-primary-50 text-primary-700 text-xs font-bold px-3 py-1.5 rounded-full mb-5 tracking-wide">
                {slide.badge}
              </span>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight mb-5">
                {slide.headline}
              </h1>

              <p className="text-gray-500 text-base lg:text-lg mb-8 leading-relaxed max-w-md">
                {slide.sub}
              </p>

              <div className="flex gap-3 flex-wrap relative z-10">
                {slide.ctaLink ? (
                  <Link
                    to={slide.ctaLink}
                    className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors shadow-md shadow-primary-100"
                  >
                    {slide.cta}
                  </Link>
                ) : (
                  <button
                    onClick={onBrowse}
                    className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors shadow-md shadow-primary-100"
                  >
                    {slide.cta} →
                  </button>
                )}
                <Link
                  to="/register"
                  className="border-2 border-gray-200 text-gray-700 hover:border-primary-400 hover:text-primary-600 px-6 py-3 rounded-xl font-semibold transition-colors bg-white"
                >
                  Join Free
                </Link>
              </div>
            </div>

            {/* Dot nav */}
            <div className="flex gap-2 mt-10 relative z-10">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === current ? 'w-8 bg-primary-600' : 'w-2 bg-gray-200 hover:bg-gray-300'
                  }`}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Right — image */}
          <div className="hidden lg:block relative overflow-hidden bg-gray-50">
            <img
              src={slide.image}
              alt=""
              className="w-full h-full object-cover"
              style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.35s ease' }}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Trust Strip ──────────────────────────────────────────────────────────────
function TrustStrip() {
  return (
    <section className="bg-gray-50 border-b border-gray-100">
      <div className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-1 sm:grid-cols-3 gap-5">
        {TRUST.map((t) => (
          <div
            key={t.title}
            className="relative bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center overflow-hidden hover:shadow-md hover:border-primary-100 transition-all"
          >
            {/* Colored top accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-400 to-primary-600 rounded-t-2xl" />
            <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-4 text-2xl mt-2">
              {t.icon}
            </div>
            <h3 className="font-bold text-gray-900 mb-1">{t.title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{t.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Stats ────────────────────────────────────────────────────────────────────
function StatsStrip({ stats }) {
  return (
    <section className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #ff5a5f 0%, #e8464b 50%, #c93338 100%)' }}>
      {/* Dot pattern overlay */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}
      />
      <div className="relative max-w-4xl mx-auto px-6 py-10 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
        {(stats ?? STATS).map((s) => (
          <div key={s.label}>
            <p className="text-3xl font-extrabold text-white">{s.value}</p>
            <p className="text-sm text-primary-100 mt-1">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Top Rated Strip ──────────────────────────────────────────────────────────
function TopRatedStrip({ services }) {
  const topRated = services
    .filter((s) => (s.ratingCount ?? 0) >= 1)
    .sort((a, b) => (b.ratingSum / b.ratingCount) - (a.ratingSum / a.ratingCount))
    .slice(0, 8)

  if (topRated.length === 0) return null

  return (
    <section className="bg-white py-14 px-6 border-b border-gray-100">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <SectionBadge>Top Rated</SectionBadge>
          <h2 className="text-3xl font-extrabold text-gray-900">Highest-rated services</h2>
          <p className="text-gray-500 text-sm mt-2">Loved by customers across Guyana</p>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2" style={{ scrollbarWidth: 'none' }}>
          {topRated.map((s) => {
            const avg = s.ratingSum / s.ratingCount
            return (
              <Link
                key={s.id}
                to={`/services/${s.id}`}
                className="flex-shrink-0 w-52 bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-primary-200 hover:shadow-xl transition-all hover:-translate-y-0.5"
              >
                {s.imageUrl ? (
                  <img src={s.imageUrl} alt={s.title} className="w-full h-32 object-cover" />
                ) : (
                  <div className="w-full h-32 flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #fff1f2, #ffcdd0)' }}>
                    <span className="text-4xl font-black text-primary-200 select-none">
                      {s.category?.[0] ?? 'S'}
                    </span>
                  </div>
                )}
                <div className="p-3">
                  <p className="text-xs font-bold text-primary-600 mb-0.5">{s.category}</p>
                  <p className="font-semibold text-gray-800 text-sm leading-snug line-clamp-2 mb-1.5">{s.title}</p>
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-amber-400 text-xs">{'★'.repeat(Math.round(avg))}{'☆'.repeat(5 - Math.round(avg))}</span>
                    <span className="text-xs text-gray-400">({s.ratingCount})</span>
                  </div>
                  <p className="text-primary-600 font-bold text-sm">{s.currency} {s.price?.toLocaleString()}</p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─── Category Showcase ────────────────────────────────────────────────────────
function CategoryShowcase({ onSelect, listingsRef }) {
  const scrollAndFilter = (name) => {
    onSelect(name)
    setTimeout(() => listingsRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  return (
    <section id="categories" className="bg-white py-20 px-6 border-b border-gray-100">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-3">
          <div>
            <SectionBadge>Services</SectionBadge>
            <h2 className="text-3xl font-extrabold text-gray-900">Browse by category</h2>
            <p className="text-gray-500 text-sm mt-2">Find exactly the service you're looking for</p>
          </div>
          <button
            onClick={() => scrollAndFilter('All')}
            className="text-sm text-primary-600 hover:text-primary-700 font-semibold hover:underline transition-colors self-start sm:self-auto"
          >
            View all listings →
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {FEATURED_CATEGORIES.map(({ name, Icon, from, to }) => (
            <button
              key={name}
              onClick={() => scrollAndFilter(name)}
              className="group relative rounded-2xl overflow-hidden text-left p-5 shadow-sm hover:shadow-xl transition-all duration-200 hover:-translate-y-1"
              style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
            >
              {/* Large ghosted background icon */}
              <div className="absolute -bottom-3 -right-3 opacity-[0.15] group-hover:opacity-[0.22] transition-opacity pointer-events-none">
                <Icon size={100} strokeWidth={1.5} color="#fff" />
              </div>

              {/* Foreground content */}
              <div className="relative z-10">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-4 group-hover:bg-white/30 transition-colors">
                  <Icon size={20} strokeWidth={2} color="#fff" />
                </div>
                <p className="text-white font-bold text-sm leading-tight tracking-wide">{name}</p>
                <p className="text-white/60 text-xs mt-1 group-hover:text-white/80 transition-colors">Browse →</p>
              </div>
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
      <div className="w-full h-48 bg-gray-100" />
      <div className="p-4 space-y-3">
        <div className="h-3 bg-gray-100 rounded w-1/3" />
        <div className="h-4 bg-gray-100 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-full" />
        <div className="h-3 bg-gray-100 rounded w-5/6" />
        <div className="h-9 bg-gray-100 rounded mt-2" />
      </div>
    </div>
  )
}

// ─── Service Card ─────────────────────────────────────────────────────────────
function ServiceCard({ service }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-primary-200 hover:shadow-xl transition-all hover:-translate-y-0.5 flex flex-col">
      <div className="relative">
        {service.imageUrl ? (
          <img src={service.imageUrl} alt={service.title} className="w-full h-48 object-cover" />
        ) : (
          <div
            className="w-full h-48 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #fff1f2, #ffcdd0)' }}
          >
            <span className="text-6xl font-black text-primary-200 select-none">
              {service.category?.[0] ?? 'S'}
            </span>
          </div>
        )}
        <span className="absolute top-3 left-3 bg-primary-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
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

// ─── Listings Section ─────────────────────────────────────────────────────────
function ListingsSection({ services, loading, activeCategory, onCategoryChange }) {
  return (
    <section id="listings" className="py-20 px-6" style={{ background: '#f8f9fb' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-3">
          <div>
            <SectionBadge>Live Listings</SectionBadge>
            <h2 className="text-3xl font-extrabold text-gray-900">Services near you</h2>
            <p className="text-gray-500 text-sm mt-2">Real services from providers across Guyana</p>
          </div>
          {activeCategory !== 'All' && (
            <button
              onClick={() => onCategoryChange('All')}
              className="text-sm text-primary-600 hover:underline font-medium self-start sm:self-auto"
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
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                activeCategory === cat
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-400 hover:text-primary-600'
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
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-4 text-3xl">🔍</div>
            <p className="text-gray-700 font-semibold text-lg mb-1">No services here yet</p>
            <p className="text-gray-400 text-sm mb-6">Be the first to offer this service in Guyana!</p>
            <Link
              to="/register"
              className="inline-block bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-colors shadow-sm"
            >
              Become a Provider →
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

// ─── How it Works ─────────────────────────────────────────────────────────────
function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-white py-20 px-6 border-t border-gray-100">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <SectionBadge>Simple process</SectionBadge>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Simple, trusted, local</h2>
          <p className="text-gray-500 text-sm">Getting help has never been simpler</p>
        </div>

        <div className="relative">
          {/* Connecting line (desktop) */}
          <div className="hidden sm:block absolute top-[3.25rem] left-[16.67%] right-[16.67%] h-px bg-gradient-to-r from-primary-200 via-primary-400 to-primary-200 z-0" />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.n} className="text-center relative">
                {/* Ghost number */}
                <div className="absolute inset-x-0 top-0 h-20 overflow-hidden pointer-events-none select-none z-0 flex justify-center items-start">
                  <span className="text-9xl font-black text-primary-50 leading-none -mt-3">{step.n}</span>
                </div>
                {/* Content */}
                <div className="relative z-10 pt-6">
                  <div className="w-16 h-16 rounded-2xl bg-primary-600 flex items-center justify-center mx-auto mb-5 text-2xl shadow-lg shadow-primary-100">
                    {step.emoji}
                  </div>
                  <span className="text-xs font-bold text-primary-500 tracking-widest uppercase mb-2 block">
                    Step {step.n}
                  </span>
                  <h3 className="font-bold text-gray-900 mb-2 text-lg">{step.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Testimonials ─────────────────────────────────────────────────────────────
function TestimonialsSection({ testimonials, services }) {
  if (testimonials.length === 0) return null
  const serviceMap = Object.fromEntries(services.map((s) => [s.id, s]))
  const display = testimonials.slice(0, 3)

  return (
    <section className="bg-white py-20 px-6 border-t border-gray-100">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <SectionBadge>Reviews</SectionBadge>
          <h2 className="text-3xl font-extrabold text-gray-900">What customers are saying</h2>
          <p className="text-gray-500 text-sm mt-2">Real feedback from real people across Guyana</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {display.map((review) => {
            const svc = serviceMap[review.serviceId]
            return (
              <div key={review.id} className="bg-gray-50 rounded-2xl p-6 border border-gray-100 flex flex-col">
                <div className="flex gap-0.5 mb-3">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span key={n} className={`text-lg ${n <= review.rating ? 'text-amber-400' : 'text-gray-200'}`}>★</span>
                  ))}
                </div>
                <p className="text-sm text-gray-700 italic leading-relaxed flex-1">
                  "{review.comment}"
                </p>
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <p className="text-sm font-semibold text-gray-800">{review.consumerName || 'Verified customer'}</p>
                  {svc && (
                    <Link
                      to={`/services/${svc.id}`}
                      className="text-xs text-primary-600 hover:underline mt-0.5 block truncate"
                    >
                      {svc.title}
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
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
      style={{ background: 'linear-gradient(135deg, #ff5a5f 0%, #e8464b 50%, #c93338 100%)' }}
    >
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }}
      />
      {/* Decorative circles */}
      <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
      <div className="absolute -bottom-16 -right-16 w-72 h-72 rounded-full bg-white/5 pointer-events-none" />

      <div className="relative max-w-2xl mx-auto">
        <SectionBadge>For providers</SectionBadge>
        <h2 className="text-3xl font-extrabold text-white mb-3">Ready to grow your business?</h2>
        <p className="text-primary-100 mb-8 text-lg leading-relaxed">
          Join providers already earning on Surama.net.<br className="hidden sm:block" /> List your first service free.
        </p>
        <Link
          to="/register"
          className="inline-block bg-white text-primary-700 hover:bg-primary-50 px-8 py-4 rounded-xl font-bold transition-colors shadow-lg text-sm"
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
    <footer className="bg-gray-900 text-gray-400 py-14 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 pb-10 mb-8 border-b border-gray-800">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <img src={asset('logo-white.png')} alt="Surama.net" className="h-9 w-auto mb-4" />
            <p className="text-sm text-gray-500 leading-relaxed">
              Guyana's home for local services. Find trusted professionals or list your own — free.
            </p>
          </div>

          {/* Explore */}
          <div>
            <h4 className="text-gray-200 text-sm font-semibold mb-4 uppercase tracking-wide">Explore</h4>
            <ul className="space-y-3 text-sm">
              <li><a href="#categories" className="hover:text-white transition-colors">All Categories</a></li>
              <li><a href="#listings"   className="hover:text-white transition-colors">Browse Services</a></li>
              <li><a href="#how-it-works" className="hover:text-white transition-colors">How it Works</a></li>
            </ul>
          </div>

          {/* Providers */}
          <div>
            <h4 className="text-gray-200 text-sm font-semibold mb-4 uppercase tracking-wide">Providers</h4>
            <ul className="space-y-3 text-sm">
              <li><Link to="/register" className="hover:text-white transition-colors">Become a Provider</Link></li>
              <li><Link to="/provider/listings/create" className="hover:text-white transition-colors">Post a Service</Link></li>
              <li><Link to="/login"    className="hover:text-white transition-colors">Provider Login</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-gray-200 text-sm font-semibold mb-4 uppercase tracking-wide">Company</h4>
            <ul className="space-y-3 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">About Surama</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
          <span>© 2025 Surama.net — All rights reserved.</span>
          <span className="flex items-center gap-1.5">🇬🇾 Built for Guyana</span>
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
  const [testimonials, setTestimonials] = useState([])
  const [liveStats, setLiveStats] = useState(STATS)
  const listingsRef = useRef(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [servicesSnap, testimonialsSnap] = await Promise.all([
          getDocs(query(collection(db, 'services'), where('active', '==', true))),
          getDocs(query(
            collection(db, 'reviews'),
            where('rating', '>=', 4),
            orderBy('rating', 'desc'),
            orderBy('createdAt', 'desc'),
            limit(6)
          )).catch(() => ({ docs: [] })),
        ])

        const raw = servicesSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

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

        const sorted = raw
          .map((s) => ({ ...s, providerName: nameMap[s.providerId] }))
          .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))

        setServices(sorted)

        const reviewsTotal   = raw.reduce((sum, s) => sum + (s.ratingCount ?? 0), 0)
        const uniqueProviders = new Set(raw.map((s) => s.providerId).filter(Boolean)).size
        setLiveStats([
          { value: raw.length.toString(),        label: 'Active listings' },
          { value: uniqueProviders.toString(),    label: 'Local providers' },
          { value: reviewsTotal > 0 ? reviewsTotal.toString() : '100%', label: reviewsTotal > 0 ? 'Reviews left' : 'Guyana-based' },
          { value: 'Free',                        label: 'To browse & list' },
        ])

        setTestimonials(
          testimonialsSnap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((r) => r.comment?.trim())
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
    <div className="min-h-screen">
      <Navbar onBrowse={scrollToListings} />
      <HeroSlider onBrowse={scrollToListings} />
      <TrustStrip />
      <StatsStrip stats={liveStats} />
      <TopRatedStrip services={services} />
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
      <TestimonialsSection testimonials={testimonials} services={services} />
      <CTABanner />
      <Footer />
    </div>
  )
}
