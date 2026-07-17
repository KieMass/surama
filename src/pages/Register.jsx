import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { asset } from '../lib/asset'

const ROLE_INFO = {
  consumer: {
    headline: 'Find trusted services\nin your community',
    sub: 'Browse verified providers, compare prices, and book the help you need — all in one place.',
    perks: ['Free to browse all listings', 'Transparent pricing upfront', 'Local providers across Guyana'],
  },
  provider: {
    headline: 'Grow your business\nwith Surama.net',
    sub: 'Reach new clients across Guyana by listing your services free on the platform built for local providers.',
    perks: ['Free to create listings', 'Manage bookings online', 'Build your reputation with reviews'],
  },
}

export default function Register() {
  const navigate = useNavigate()
  const [role, setRole] = useState('consumer')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const info = ROLE_INFO[role]

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password)
      await setDoc(doc(db, 'users', cred.user.uid), {
        name: form.name,
        email: form.email,
        role,
        createdAt: serverTimestamp(),
        emailVerified: false,
      })
      await sendEmailVerification(cred.user)
      navigate(role === 'provider' ? '/provider/dashboard' : '/consumer/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left brand panel ── */}
      <div
        className="hidden lg:flex w-[45%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #ff5a5f 0%, #e8464b 60%, #c93338 100%)' }}
      >
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute top-1/2 -translate-y-1/2 -right-16 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full bg-white/5 pointer-events-none" />

        <Link to="/">
          <img src={asset('logo-white.png')} alt="Surama.net" className="h-9 w-auto relative z-10" />
        </Link>

        <div className="relative z-10">
          <h2 className="text-3xl font-extrabold text-white leading-tight mb-4 whitespace-pre-line">
            {info.headline}
          </h2>
          <p className="text-primary-100 text-base mb-8 leading-relaxed">{info.sub}</p>
          <div className="space-y-3">
            {info.perks.map((p) => (
              <div key={p} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  ✓
                </div>
                <span className="text-white/90 text-sm">{p}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/50 text-xs relative z-10">© 2025 Surama.net. Built for Guyana.</p>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex flex-col">
        <div className="lg:hidden px-6 py-4" style={{ background: '#ff5a5f' }}>
          <Link to="/">
            <img src={asset('logo-white.png')} alt="Surama.net" className="h-8 w-auto" />
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Create your account</h1>
            <p className="text-gray-500 text-sm mb-6">Join Surama.net — it's free</p>

            {/* Role toggle */}
            <div className="flex rounded-xl border border-gray-200 mb-6 overflow-hidden bg-gray-50">
              {['consumer', 'provider'].map((r) => (
                <button
                  key={r} type="button" onClick={() => setRole(r)}
                  className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                    role === r
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {r === 'consumer' ? '🔍 Find Services' : '🛠 Offer Services'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text" required value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Jane Smith"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email" required value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="jane@example.com"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password" required minLength={8} value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Min. 8 characters"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}

              <button
                type="submit" disabled={loading}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 mt-2"
              >
                {loading ? 'Creating account…' : 'Create Account'}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-600 font-semibold hover:underline">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
