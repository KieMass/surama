import { Link, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../../firebase'
import { useAuth } from '../../context/AuthContext'

export default function ProviderDashboard() {
  const { userDoc } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut(auth)
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-teal-600 text-white px-6 py-4 flex items-center justify-between">
        <img src="/logo-white.png" alt="Surama.net" className="h-9 w-auto" />
        <button onClick={handleSignOut} className="text-sm hover:underline">
          Sign out
        </button>
      </nav>

      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-semibold text-gray-800 mb-1">
          Welcome back{userDoc?.name ? `, ${userDoc.name}` : ''}!
        </h1>
        <p className="text-gray-500 mb-8">Manage your services and grow your business.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            to="/provider/listings"
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:border-teal-300 transition-colors group"
          >
            <div className="text-3xl mb-3">📋</div>
            <h2 className="text-lg font-medium text-gray-800 mb-1">My Listings</h2>
            <p className="text-sm text-gray-500">View, edit, and manage your service listings</p>
          </Link>

          <Link
            to="/provider/listings/create"
            className="bg-teal-600 rounded-xl p-6 shadow-sm hover:bg-teal-700 transition-colors"
          >
            <div className="text-3xl mb-3">✨</div>
            <h2 className="text-lg font-medium text-white mb-1">Create Listing</h2>
            <p className="text-sm text-teal-100">Add a new service for customers to find</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
