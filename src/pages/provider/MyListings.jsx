import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db, auth } from '../../firebase'

export default function MyListings() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchListings = async () => {
    const q = query(collection(db, 'services'), where('providerId', '==', auth.currentUser.uid))
    const snap = await getDocs(q)
    setListings(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    setLoading(false)
  }

  useEffect(() => { fetchListings() }, [])

  const toggleActive = async (id, current) => {
    await updateDoc(doc(db, 'services', id), { active: !current })
    setListings((prev) => prev.map((l) => (l.id === id ? { ...l, active: !current } : l)))
  }

  const deleteListing = async (id) => {
    if (!window.confirm('Delete this listing? This cannot be undone.')) return
    await deleteDoc(doc(db, 'services', id))
    setListings((prev) => prev.filter((l) => l.id !== id))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between">
        <Link to="/">
          <img src="/logo-dark.png" alt="Surama.net" className="h-10 w-auto" />
        </Link>
        <Link
          to="/provider/listings/create"
          className="text-sm bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          + New Listing
        </Link>
      </nav>

      <div className="max-w-4xl mx-auto p-6 pt-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Listings</h1>
          <Link to="/provider/dashboard" className="text-sm text-primary-600 hover:underline">
            ← Dashboard
          </Link>
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && listings.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="mb-4 text-lg">You haven't created any listings yet.</p>
            <Link to="/provider/listings/create" className="text-primary-600 hover:underline font-medium">
              Create your first listing →
            </Link>
          </div>
        )}

        <div className="grid gap-4">
          {listings.map((listing) => (
            <div key={listing.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
              {listing.imageUrl ? (
                <img src={listing.imageUrl} alt={listing.title} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-300 text-2xl">S</span>
                </div>
              )}

              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-gray-800 truncate">{listing.title}</h2>
                <p className="text-sm text-gray-500">
                  {listing.category} · {listing.currency} {listing.price?.toLocaleString()}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => toggleActive(listing.id, listing.active)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    listing.active
                      ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {listing.active ? 'Active' : 'Inactive'}
                </button>
                <button
                  onClick={() => deleteListing(listing.id)}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
