import { Link, useSearchParams } from 'react-router-dom'
import { asset } from '../lib/asset'

const COPY = {
  succeeded: { icon: '✅', title: 'Payment succeeded', body: 'Your request will reflect this shortly.' },
  failed: { icon: '❌', title: 'Payment failed', body: "It wasn't charged — you can try again from your requests." },
  cancelled: { icon: '🚫', title: 'Payment cancelled', body: 'Nothing was charged. You can try again any time.' },
}

// Where a redirect-based plugin (PayPal, eventually MMG) sends the
// consumer's browser back to after resolving a payment server-side — see
// functions/http.js. The Test plugin has its own interactive page
// (TestCheckout.jsx) instead of this, since it needs the simulate
// success/fail/cancel buttons.
export default function PaymentResult() {
  const [params] = useSearchParams()
  const copy = COPY[params.get('status')] ?? COPY.failed

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white border-b border-gray-100 px-6 py-3">
        <Link to="/"><img src={asset('logo-dark.png')} alt="Surama.net" className="h-10 w-auto" /></Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <p className="text-4xl mb-3">{copy.icon}</p>
          <p className="font-bold text-gray-900 text-lg mb-1">{copy.title}</p>
          <p className="text-sm text-gray-500 mb-6">{copy.body}</p>
          <Link
            to="/consumer/requests"
            className="inline-block bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            Back to my requests
          </Link>
        </div>
      </div>
    </div>
  )
}
