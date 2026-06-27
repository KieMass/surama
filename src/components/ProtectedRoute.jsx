import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const roleDashboard = {
  provider: '/provider/dashboard',
  consumer: '/consumer/dashboard',
}

export default function ProtectedRoute({ children, allowedRole }) {
  const { user, userDoc, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (allowedRole && userDoc?.role !== allowedRole) {
    const redirect = roleDashboard[userDoc?.role] ?? '/login'
    return <Navigate to={redirect} replace />
  }

  return children
}
