import { Star, X, ImagePlus } from 'lucide-react'
import { checkImageFile, MAX_LISTING_PHOTOS } from '../lib/images'

// Gallery editor for the create/edit listing forms. `items` come from
// photosFromListing (lib/images.js) plus newly picked files; the first one
// is the listing's cover.
export default function ListingPhotosEditor({ items, onChange, onError, disabled }) {
  const addFiles = (e) => {
    const files = [...(e.target.files ?? [])]
    e.target.value = ''
    const room = MAX_LISTING_PHOTOS - items.length
    const problems = []
    const added = []
    for (const file of files) {
      const problem = checkImageFile(file)
      if (problem) problems.push(`${file.name}: ${problem}`)
      else if (added.length < room) added.push({ key: `${Date.now()}_${file.name}_${added.length}`, file, preview: URL.createObjectURL(file) })
    }
    if (files.length - problems.length > room) problems.push(`Only ${MAX_LISTING_PHOTOS} photos per listing — the extra ones weren't added.`)
    onError(problems.join(' '))
    if (added.length) onChange([...items, ...added])
  }

  const remove = (key) => {
    const item = items.find((i) => i.key === key)
    if (item?.preview) URL.revokeObjectURL(item.preview)
    onChange(items.filter((i) => i.key !== key))
  }

  const makeCover = (key) => {
    const item = items.find((i) => i.key === key)
    onChange([item, ...items.filter((i) => i.key !== key)])
  }

  return (
    <div className="p-6 border-b border-gray-100">
      <div className="flex items-baseline justify-between mb-3">
        <p className="text-sm font-semibold text-gray-700">Photos</p>
        <p className="text-xs text-gray-400">{items.length}/{MAX_LISTING_PHOTOS} · the first photo is the cover</p>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {items.map((item, i) => (
          <div key={item.key} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group">
            <img src={item.url ?? item.preview} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
            {i === 0 ? (
              <span className="absolute bottom-1.5 left-1.5 text-[10px] font-bold uppercase tracking-wide bg-white/90 text-gray-800 rounded-md px-1.5 py-0.5">Cover</span>
            ) : (
              <button
                type="button"
                onClick={() => makeCover(item.key)}
                disabled={disabled}
                title="Make cover photo"
                className="absolute bottom-1.5 left-1.5 bg-black/50 hover:bg-black/70 text-white rounded-md px-1.5 py-0.5 text-[10px] font-semibold flex items-center gap-1 transition-colors disabled:opacity-50"
              >
                <Star size={10} /> Cover
              </button>
            )}
            <button
              type="button"
              onClick={() => remove(item.key)}
              disabled={disabled}
              aria-label={`Remove photo ${i + 1}`}
              className="absolute top-1.5 right-1.5 bg-black/50 hover:bg-black/70 text-white w-7 h-7 rounded-full flex items-center justify-center transition-colors disabled:opacity-50"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        {items.length < MAX_LISTING_PHOTOS && (
          <label className={`aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center gap-1 transition-colors ${disabled ? 'opacity-50' : 'cursor-pointer hover:border-primary-300 hover:bg-primary-50'}`}>
            <ImagePlus size={22} className="text-gray-400" />
            <span className="text-xs font-medium text-gray-500">Add photos</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={addFiles} disabled={disabled} />
          </label>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-3">Optional. JPG, PNG or WEBP — large photos are resized automatically.</p>
    </div>
  )
}
