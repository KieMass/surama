import { useEffect, useMemo, useState } from 'react'
import { Search, Star, Trash2 } from 'lucide-react'
import ConfirmDialog from '../../components/ConfirmDialog'
import AdminLayout from './AdminLayout'
import { fetchAllReviews, deleteReview } from '../../lib/admin'

function formatDate(ts) {
  const d = ts?.toDate?.()
  if (!d) return '—'
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <p className="text-2xl font-extrabold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  )
}

export default function AdminReviews() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [rowError, setRowError] = useState({})
  const [confirmAction, setConfirmAction] = useState(null)
  const [confirmBusy, setConfirmBusy] = useState(false)

  const [search, setSearch] = useState('')
  const [ratingFilter, setRatingFilter] = useState('all')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      setReviews(await fetchAllReviews())
    } catch {
      setError('Could not load reviews. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const runConfirmed = async () => {
    if (!confirmAction) return
    setConfirmBusy(true)
    setBusyId(confirmAction.id)
    try {
      await confirmAction.run()
      setReviews((prev) => prev.filter((r) => r.id !== confirmAction.id))
    } catch {
      setRowError((prev) => ({ ...prev, [confirmAction.id]: 'Delete failed — try again.' }))
    } finally {
      setConfirmBusy(false)
      setBusyId(null)
      setConfirmAction(null)
    }
  }

  const requestDelete = (r) => {
    setRowError((prev) => ({ ...prev, [r.id]: '' }))
    setConfirmAction({
      id: r.id,
      title: 'Delete this review?',
      message: `This permanently removes ${r.consumerName || 'this customer'}'s ${r.rating}-star review and corrects the listing's rating. This can't be undone.`,
      confirmLabel: 'Delete review',
      run: () => deleteReview(r),
    })
  }

  const stats = useMemo(() => ({
    total: reviews.length,
    avg: reviews.length ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : '—',
    fiveStar: reviews.filter((r) => r.rating === 5).length,
    oneStar: reviews.filter((r) => r.rating === 1).length,
  }), [reviews])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return reviews.filter((r) => {
      if (ratingFilter !== 'all' && r.rating !== Number(ratingFilter)) return false
      if (q && !`${r.consumerName ?? ''} ${r.comment ?? ''}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [reviews, search, ratingFilter])

  return (
    <AdminLayout title="Reviews" subtitle="Moderate reviews left across the marketplace">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total reviews" value={stats.total} />
        <StatCard label="Average rating" value={stats.avg} />
        <StatCard label="5-star" value={stats.fiveStar} />
        <StatCard label="1-star" value={stats.oneStar} />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by reviewer or comment…"
            className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
          />
        </div>
        <select
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All ratings</option>
          {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n !== 1 ? 's' : ''}</option>)}
        </select>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 py-16 text-center text-gray-400">
          No reviews match these filters.
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((r) => {
            const busy = busyId === r.id
            return (
              <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900">{r.consumerName || 'Verified customer'}</p>
                      <span className="text-amber-400 text-sm flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} size={13} fill={i < r.rating ? 'currentColor' : 'none'} className={i < r.rating ? '' : 'text-gray-200'} />
                        ))}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">{formatDate(r.createdAt)}</p>
                    {r.comment && <p className="text-sm text-gray-600 leading-relaxed">{r.comment}</p>}
                  </div>
                  <button
                    onClick={() => requestDelete(r)}
                    disabled={busy}
                    className="flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={13} /> {busy ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
                {rowError[r.id] && (
                  <p className="text-[11px] text-red-500 mt-2 text-right">{rowError[r.id]}</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        action={confirmAction}
        busy={confirmBusy}
        onConfirm={runConfirmed}
        onCancel={() => setConfirmAction(null)}
      />
    </AdminLayout>
  )
}
