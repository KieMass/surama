// Small presentational star row. `rating` can be fractional (e.g. 4.3) —
// stars render as filled/half/empty in 0.5 increments.
export default function StarRating({ rating, count, size = 'text-sm', showCount = true }) {
  if (!rating) return null

  const stars = [1, 2, 3, 4, 5].map((n) => {
    if (rating >= n) return '★'
    if (rating >= n - 0.5) return '★' // treat half as filled visually; keep simple
    return '☆'
  })

  return (
    <span className={`inline-flex items-center gap-1 ${size}`}>
      <span className="text-amber-400 tracking-tight">{stars.join('')}</span>
      <span className="text-gray-500 font-medium">{rating.toFixed(1)}</span>
      {showCount && count != null && (
        <span className="text-gray-400">({count})</span>
      )}
    </span>
  )
}
