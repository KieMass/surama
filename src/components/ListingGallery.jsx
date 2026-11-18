import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// Service page hero: the selected photo large, with a thumbnail strip and
// prev/next arrows when a listing has more than one. `fallback` renders
// when it has none.
export default function ListingGallery({ urls, title, fallback }) {
  const [index, setIndex] = useState(0)
  if (urls.length === 0) return fallback

  const current = Math.min(index, urls.length - 1)
  const step = (delta) => setIndex((current + delta + urls.length) % urls.length)
  const arrowClass = 'absolute top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white w-9 h-9 rounded-full flex items-center justify-center transition-colors'

  return (
    <div>
      <div className="relative bg-gray-100">
        <img src={urls[current]} alt={title} className="w-full h-64 sm:h-96 object-cover" />
        {urls.length > 1 && (
          <>
            <button type="button" onClick={() => step(-1)} aria-label="Previous photo" className={`${arrowClass} left-3`}>
              <ChevronLeft size={20} />
            </button>
            <button type="button" onClick={() => step(1)} aria-label="Next photo" className={`${arrowClass} right-3`}>
              <ChevronRight size={20} />
            </button>
            <span className="absolute bottom-3 right-3 text-xs font-semibold text-white bg-black/50 rounded-full px-2.5 py-1">
              {current + 1} / {urls.length}
            </span>
          </>
        )}
      </div>
      {urls.length > 1 && (
        <div className="flex gap-2 p-2 bg-white overflow-x-auto">
          {urls.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show photo ${i + 1}`}
              className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                i === current ? 'border-primary-500' : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <img src={url} alt="" loading="lazy" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
