import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db, auth } from '../../firebase'

const GRADIENT = 'linear-gradient(135deg, #ff5a5f 0%, #e8464b 55%, #c93338 100%)'

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

  const activeCount = listings.filter((l) => l.active).length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <Link to="/">
          <img src="/logo-dark.png" alt="Surama.net" className="h-10 w-auto" />
        </Link>
        <Link
          to="/provider/listings/create"
          className="text-sm bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors shadow-sm"
        >
          + New Listing
        </Link>
      </nav>

      {/* Gradient header */}
      <div className="relative overflow-hidden" style={{ background: GRADIENT }}>
        <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-6 py-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-primary-100 text-sm font-medium mb-1">Provider</p>
            <h1 className="text-2xl font-extrabold text-white mb-1">My Listings</h1>
            <p className="text-primary-100 text-sm">
              {loading ? 'Loading…' : `${activeCount} active · ${listings.length - activeCount} inactive`}
            </p>
          </div>
          <Link
            to="/provider/dashboard"
            className="self-start sm:self-auto bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors border border-white/20"
          >
            ← Dashboard
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && listings.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-4 text-3xl">📋</div>
            <p className="text-gray-700 font-semibold text-lg mb-1">No listings yet</p>
            <p className="text-gray-400 text-sm mb-6">Create your first listing to start reaching clients</p>
            <Link
              to="/provider/listings/create"
              className="inline-block bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-colors"
            >
              Create first listing →
            </Link>
          </div>
        )}

        <div className="grid gap-4">
          {listings.map((listing) => (
            <div
              key={listing.id}
              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:border-primary-100 hover:shadow-md transition-all flex items-center gap-4"
            >
              {listing.imageUrl ? (
                <img
                  src={listing.imageUrl}
                  alt={listing.title}
                  className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #fff1f2, #ffcdd0)' }}
                >
                  <span className="text-primary-300 text-2xl font-black">{listing.category?.[0] ?? 'S'}</span>
                </div>
              )}

              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-gray-800 truncate">{listing.title}</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {listing.category} · {listing.currency} {listing.price?.toLocaleString()}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => toggleActive(listing.id, listing.active)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                    listing.active
                      ? 'bg-green-50 text-green-700 hover:bg-green-100'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {listing.active ? '● Active' : '○ Inactive'}
                </button>
                <button
                  onClick={() => deleteListing(listing.id)}
                  className="px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
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
