import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))

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
    'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500'

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-teal-600 text-white px-6 py-4 flex items-center justify-between">
        <span className="text-xl font-semibold tracking-tight">Surama</span>
        <button
          type="button"
          onClick={() => navigate('/provider/dashboard')}
          className="text-sm hover:underline"
        >
          Dashboard
        </button>
      </nav>

      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-semibold text-gray-800 mb-6">Create New Listing</h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 shadow-sm space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service Title</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={set('title')}
              placeholder="e.g. Professional House Cleaning"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select value={form.category} onChange={set('category')} className={inputClass}>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              required
              rows={4}
              value={form.description}
              onChange={set('description')}
              placeholder="Describe your service, availability, and what's included…"
              className={`${inputClass} resize-none`}
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={form.price}
                onChange={set('price')}
                placeholder="0.00"
                className={inputClass}
              />
            </div>
            <div className="w-28">
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <select value={form.currency} onChange={set('currency')} className={inputClass}>
                <option>GYD</option>
                <option>USD</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Image <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files[0] || null)}
              className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer"
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/provider/listings')}
              className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Publishing…' : 'Publish Listing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
