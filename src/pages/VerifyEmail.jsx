import { useState } from 'react'
import { sendEmailVerification, signOut } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { auth } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { asset } from '../lib/asset'

export default function VerifyEmail() {
  const { user, userDoc } = useAuth()
  const navigate = useNavigate()
  const [resent, setResent] = useState(false)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')

  const handleResend = async () => {
    setError('')
    try {
      await sendEmailVerification(user)
      setResent(true)
    } catch (err) {
      setError(err.message)
    }
  }

  const goToDashboard = () => {
    const role = userDoc?.role
    navigate(role === 'provider' ? '/provider/dashboard' : '/consumer/dashboard', { replace: true })
  }

  const handleContinue = async () => {
    setChecking(true)
    setError('')
    try {
      await auth.currentUser.reload()
      goToDashboard()
    } catch {
      goToDashboard()
    } finally {
      setChecking(false)
    }
  }

  const handleSignOut = async () => {
    await signOut(auth)
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="max-w-sm w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <img src={asset('logo-dark.png')} alt="Surama.net" className="h-8 w-auto mx-auto mb-6" />
        <div className="text-4xl mb-4">📬</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Verify your email</h1>
        <p className="text-sm text-gray-500 mb-1">We sent a verification link to</p>
        <p className="text-sm font-semibold text-gray-800 mb-6 break-all">{user?.email}</p>
        <p className="text-xs text-gray-400 mb-6">
          Click the link in that email, then come back here and press Continue.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">
            {error}
          </div>
        )}
        {resent && !error && (
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm px-4 py-3 rounded-xl mb-4">
            Verification email resent — check your inbox.
          </div>
        )}

        <button
          onClick={handleContinue}
          disabled={checking}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 mb-3"
        >
          {checking ? 'Checking…' : "I've verified — Continue"}
        </button>
        <button
          onClick={handleResend}
          className="w-full border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors mb-4"
        >
          Resend verification email
        </button>
        <button
          onClick={handleSignOut}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
