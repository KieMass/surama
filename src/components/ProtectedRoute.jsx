import { useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { sendEmailVerification } from 'firebase/auth'
import { auth } from '../firebase'
import { useAuth } from '../context/AuthContext'

const roleDashboard = {
  provider: '/provider/dashboard',
  consumer: '/consumer/dashboard',
}

function VerificationBanner({ user }) {
  const [sent, setSent] = useState(false)

  const resend = async () => {
    try {
      await sendEmailVerification(user)
      setSent(true)
    } catch {}
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-center text-xs text-amber-800 flex items-center justify-center gap-3 flex-wrap">
      <span>📬 Please verify your email address to keep your account secure.</span>
      {sent ? (
        <span className="font-semibold text-emerald-700">Verification email sent!</span>
      ) : (
        <button onClick={resend} className="font-semibold underline hover:text-amber-900 transition-colors">
          Resend email
        </button>
      )}
    </div>
  )
}

export default function ProtectedRoute({ children, allowedRole }) {
  const { user, userDoc, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (allowedRole && userDoc?.role !== allowedRole) {
    const redirect = roleDashboard[userDoc?.role] ?? '/login'
    return <Navigate to={redirect} replace />
  }

  return (
    <>
      {!user.emailVerified && <VerificationBanner user={user} />}
      {children}
    </>
  )
}
