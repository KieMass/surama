import { Link, useParams } from 'react-router-dom'
import { asset } from '../lib/asset'

export default function ServiceDetail() {
  const { id } = useParams()

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4">
        <Link to="/">
          <img src={asset('logo-dark.png')} alt="Surama.net" className="h-10 w-auto" />
        </Link>
      </nav>
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <p className="text-xs text-primary-600 font-semibold uppercase tracking-wide mb-2">
          Coming soon
        </p>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Service Details</h1>
        <p className="text-gray-500 mb-6">
          This page is under construction. Service ID: <code className="text-sm bg-gray-100 px-2 py-0.5 rounded">{id}</code>
        </p>
        <Link
          to="/"
          className="inline-block bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          ← Back to listings
        </Link>
      </div>
    </div>
  )
}
