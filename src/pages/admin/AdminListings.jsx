import { useEffect, useMemo, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { Search, CheckCircle2, Ban, X, Images } from 'lucide-react'
import { db } from '../../firebase'
import ConfirmDialog from '../../components/ConfirmDialog'
import AdminLayout from './AdminLayout'
import { formatDate, StatCard } from './shared'
import { fetchAllListings, setListingActive, removeListingPhoto } from '../../lib/admin'
import { listingPhotoUrls } from '../../lib/images'

// Every photo on one listing, each removable (moderation).
function ListingPhotosPanel({ listing, busyUrl, error, onRemove, onClose }) {
  if (!listing) return null
  const urls = listingPhotoUrls(listing)
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900 truncate">{listing.title}</h3>
            <p className="text-xs text-gray-500">{urls.length} photo{urls.length === 1 ? '' : 's'} · the first is the cover</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-700 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          {error && <div className="mb-4 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}
          {urls.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">This listing has no photos.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {urls.map((url, i) => (
                <div key={url} className="space-y-2">
                  <a href={url} target="_blank" rel="noopener noreferrer" className="block aspect-square rounded-xl overflow-hidden bg-gray-100">
                    <img src={url} alt={`Photo ${i + 1}`} loading="lazy" className="w-full h-full object-cover" />
                  </a>
                  <button
                    onClick={() => onRemove(listing, url)}
                    disabled={busyUrl === url}
                    className="w-full text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {busyUrl === url ? 'Removing…' : 'Remove photo'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AdminListings() {
  const [listings, setListings] = useState([])
  const [providerNames, setProviderNames] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [rowError, setRowError] = useState({})
  const [confirmAction, setConfirmAction] = useState(null)
  const [confirmBusy, setConfirmBusy] = useState(false)
  const [photosListingId, setPhotosListingId] = useState(null)
  const [photoBusyUrl, setPhotoBusyUrl] = useState(null)
  const [photoError, setPhotoError] = useState('')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const all = await fetchAllListings()
      setListings(all)

      const providerIds = [...new Set(all.map((l) => l.providerId).filter(Boolean))]
      const names = {}
      await Promise.all(
        providerIds.map(async (uid) => {
          try {
            const snap = await getDoc(doc(db, 'users', uid))
            if (snap.exists()) names[uid] = snap.data().name
          } catch { /* provider doc unavailable — listing still shows without a name */ }
        })
      )
      setProviderNames(names)
    } catch {
      setError('Could not load listings. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const withRow = async (id, action) => {
    setBusyId(id)
    setRowError((prev) => ({ ...prev, [id]: '' }))
    try {
      await action()
    } catch {
      setRowError((prev) => ({ ...prev, [id]: 'Update failed — try again.' }))
    } finally {
      setBusyId(null)
    }
  }

  const toggleActive = (l) =>
    withRow(l.id, async () => {
      await setListingActive(l.id, !l.active)
      setListings((prev) => prev.map((x) => (x.id === l.id ? { ...x, active: !l.active } : x)))
    })

  const runConfirmed = async () => {
    if (!confirmAction) return
    setConfirmBusy(true)
    await confirmAction.run()
    setConfirmBusy(false)
    setConfirmAction(null)
  }

  const requestToggle = (l) => {
    // Restoring a listing isn't destructive — just do it.
    if (!l.active) {
      toggleActive(l)
      return
    }
    setConfirmAction({
      title: 'Take down this listing?',
      message: `"${l.title}" will be hidden from the marketplace until you restore it.`,
      confirmLabel: 'Take down',
      run: () => toggleActive(l),
    })
  }

  const requestRemovePhoto = (listing, url) => {
    setConfirmAction({
      title: 'Remove this photo?',
      message: `It will be deleted from "${listing.title}". The provider can't restore it, but can upload new photos.`,
      confirmLabel: 'Remove photo',
      run: async () => {
        setPhotoBusyUrl(url)
        setPhotoError('')
        try {
          const updated = await removeListingPhoto(listing.id, url)
          setListings((prev) => prev.map((x) => (x.id === listing.id ? { ...x, ...updated } : x)))
        } catch {
          setPhotoError('Could not remove that photo — try again.')
        } finally {
          setPhotoBusyUrl(null)
        }
      },
    })
  }

  const stats = useMemo(() => ({
    total: listings.length,
    active: listings.filter((l) => l.active).length,
    inactive: listings.filter((l) => !l.active).length,
  }), [listings])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return listings.filter((l) => {
      if (statusFilter === 'active' && !l.active) return false
      if (statusFilter === 'inactive' && l.active) return false
      if (q && !`${l.title ?? ''} ${l.category ?? ''} ${providerNames[l.providerId] ?? ''}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [listings, search, statusFilter, providerNames])

  return (
    <AdminLayout title="Listings" subtitle="Review and moderate every service on the marketplace">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total listings" value={stats.total} />
        <StatCard label="Active" value={stats.active} />
        <StatCard label="Taken down" value={stats.inactive} />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, category, or provider…"
            className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Taken down</option>
        </select>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
                <th className="px-5 py-3">Listing</th>
                <th className="px-5 py-3">Provider</th>
                <th className="px-5 py-3">Price</th>
                <th className="px-5 py-3">Listed</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50 animate-pulse">
                    <td className="px-5 py-4"><div className="h-4 bg-gray-100 rounded w-40" /></td>
                    <td className="px-5 py-4"><div className="h-4 bg-gray-100 rounded w-28" /></td>
                    <td className="px-5 py-4"><div className="h-4 bg-gray-100 rounded w-16" /></td>
                    <td className="px-5 py-4"><div className="h-4 bg-gray-100 rounded w-24" /></td>
                    <td className="px-5 py-4"><div className="h-4 bg-gray-100 rounded w-16" /></td>
                    <td className="px-5 py-4"><div className="h-4 bg-gray-100 rounded w-24 ml-auto" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-gray-400">
                    No listings match these filters.
                  </td>
                </tr>
              ) : (
                filtered.map((l) => {
                  const busy = busyId === l.id
                  return (
                    <tr key={l.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => { setPhotoError(''); setPhotosListingId(l.id) }}
                            title="Review photos"
                            className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center hover:ring-2 hover:ring-primary-300 transition"
                          >
                            {l.imageUrl ? (
                              <img src={l.imageUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
                            ) : (
                              <Images size={18} className="text-gray-300" />
                            )}
                            {listingPhotoUrls(l).length > 1 && (
                              <span className="absolute bottom-0.5 right-0.5 text-[10px] font-bold text-white bg-black/60 rounded px-1">
                                {listingPhotoUrls(l).length}
                              </span>
                            )}
                          </button>
                          <div className="min-w-0">
                            <a href={`/services/${l.id}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-gray-900 hover:text-primary-600 transition-colors">
                              {l.title}
                            </a>
                            <p className="text-xs text-gray-400 mt-0.5">{l.category}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-gray-600">{providerNames[l.providerId] ?? '—'}</td>
                      <td className="px-5 py-4 text-gray-600">{l.currency} {l.price?.toLocaleString()}</td>
                      <td className="px-5 py-4 text-gray-500">{formatDate(l.createdAt)}</td>
                      <td className="px-5 py-4">
                        {l.active ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-1">
                            <CheckCircle2 size={12} /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-100 rounded-full px-2.5 py-1">
                            <Ban size={12} /> Taken down
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => requestToggle(l)}
                          disabled={busy}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
                            l.active
                              ? 'border-red-200 text-red-600 hover:bg-red-50'
                              : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {busy ? 'Saving…' : l.active ? 'Take down' : 'Restore'}
                        </button>
                        {rowError[l.id] && (
                          <p className="text-[11px] text-red-500 mt-1">{rowError[l.id]}</p>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ListingPhotosPanel
        listing={listings.find((l) => l.id === photosListingId)}
        busyUrl={photoBusyUrl}
        error={photoError}
        onRemove={requestRemovePhoto}
        onClose={() => setPhotosListingId(null)}
      />

      <ConfirmDialog
        action={confirmAction}
        busy={confirmBusy}
        onConfirm={runConfirmed}
        onCancel={() => setConfirmAction(null)}
      />
    </AdminLayout>
  )
}
