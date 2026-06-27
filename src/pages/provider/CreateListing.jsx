import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage, auth } from '../../firebase'

const CATEGORIES = [
  'Cleaning', 'Plumbing', 'Electrical', 'Carpentry',
  'Tutoring', 'Catering', 'Photography', 'Beauty & Wellness',
  'Landscaping', 'IT Support', 'Transportation', 'Pest Control',
  'Auto Repair', 'Event Planning', 'Security', 'Moving & Storage',
  'Painting', 'Interior Design', 'Childcare', 'Fitness Training',
  'Tailoring', 'Music Lessons', 'Pet Care', 'Other',
]

const GRADIENT = 'linear-gradient(135deg, #ff5a5f 0%, #e8464b 55%, #c93338 100%)'

export default function CreateListing() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    title: '',
    category: CATEGORIES[0],
    description: '',
    price: '',
    currency: 'GYD',
  })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const handleImageChange = (e) => {
    const file = e.target.files[0] || null
    setImageFile(file)
    if (file) {
      const reader = new FileReader()
      reader.onload = (ev) => setImagePreview(ev.target.result)
      reader.readAsDataURL(file)
    } else {
      setImagePreview(null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      let imageUrl = null
      if (imageFile) {
        const storageRef = ref(
          storage,
          `listings/${auth.currentUser.uid}/${Date.now()}_${imageFile.name}`
        )
        const snap = await uploadBytes(storageRef, imageFile)
        imageUrl = await getDownloadURL(snap.ref)
      }
      await addDoc(collection(db, 'services'), {
        title: form.title,
        category: form.category,
        description: form.description,
        price: parseFloat(form.price),
        currency: form.currency,
        imageUrl,
        providerId: auth.currentUser.uid,
        active: true,
        createdAt: serverTimestamp(),
      })
      navigate('/provider/listings')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <Link to="/">
          <img src="/logo-dark.png" alt="Surama.net" className="h-10 w-auto" />
        </Link>
        <button
          type="button"
          onClick={() => navigate('/provider/dashboard')}
          className="text-sm text-gray-600 hover:text-primary-600 font-medium transition-colors"
        >
          Dashboard
        </button>
      </nav>

      {/* Gradient header */}
      <div className="relative overflow-hidden" style={{ background: GRADIENT }}>
        <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />

        <div className="relative max-w-2xl mx-auto px-6 py-10">
          <p className="text-primary-100 text-sm font-medium mb-1">Provider</p>
          <h1 className="text-2xl font-extrabold text-white mb-1">Create New Listing</h1>
          <p className="text-primary-100 text-sm">List your service and reach clients across Guyana — free</p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

          {/* Image upload area */}
          <div className="relative">
            {imagePreview ? (
              <div className="relative">
                <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover" />
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreview(null) }}
                  className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white w-8 h-8 rounded-full flex items-center justify-center text-lg transition-colors"
                >
                  ×
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-40 cursor-pointer bg-gray-50 border-b border-gray-100 hover:bg-primary-50 transition-colors group">
                <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">📷</div>
                <p className="text-sm font-medium text-gray-600 group-hover:text-primary-600">Upload a photo</p>
                <p className="text-xs text-gray-400 mt-1">Optional — JPG, PNG, WEBP</p>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            )}
          </div>

          <div className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Service Title</label>
              <input
                type="text" required value={form.title} onChange={set('title')}
                placeholder="e.g. Professional House Cleaning"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category</label>
              <select value={form.category} onChange={set('category')} className={inputClass}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
              <textarea
                required rows={4} value={form.description} onChange={set('description')}
                placeholder="Describe your service, experience, availability, and what's included…"
                className={`${inputClass} resize-none`}
              />
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Price</label>
                <input
                  type="number" required min="0" step="0.01"
                  value={form.price} onChange={set('price')} placeholder="0.00"
                  className={inputClass}
                />
              </div>
              <div className="w-28">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Currency</label>
                <select value={form.currency} onChange={set('currency')} className={inputClass}>
                  <option>GYD</option>
                  <option>USD</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/provider/listings')}
                className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit" disabled={loading}
                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm"
              >
                {loading ? 'Publishing…' : 'Publish Listing →'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
