// Small bits shared by every admin page (Users/Listings/Reviews).

export function formatDate(ts) {
  const d = ts?.toDate?.()
  if (!d) return '—'
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <p className="text-2xl font-extrabold text-gray-900">{value ?? '—'}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  )
}
