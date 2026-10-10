import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FlaskConical } from 'lucide-react'
import { asset } from '../lib/asset'
import { getPayment, confirmTestPayment } from '../lib/payments'

const TYPE_LABEL = { deposit: 'Deposit', balance: 'Balance' }

export default function TestCheckout() {
  const { paymentId } = useParams()

  const [payment, setPayment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [resolving, setResolving] = useState(false)
  const [outcome, setOutcome] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        const p = await getPayment(paymentId)
        if (!p) { setError("This payment doesn't exist or you don't have access to it."); return }
        if (p.pluginId !== 'test') { setError('This checkout page only handles test payments.'); return }
        setPayment(p)
      } catch {
        setError('Could not load this payment.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [paymentId])

  const resolve = async (choice) => {
    setResolving(true)
    setError('')
    try {
      await confirmTestPayment(paymentId, choice)
      setOutcome(choice)
    } catch (err) {
      setError(err.message)
    } finally {
      setResolving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white border-b border-gray-100 px-6 py-3">
        <Link to="/"><img src={asset('logo-dark.png')} alt="Surama.net" className="h-10 w-auto" /></Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mb-6 text-xs font-semibold">
            <FlaskConical size={14} /> Test checkout — no real money moves here
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error && !payment ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : outcome ? (
            <div className="text-center py-6">
              <p className="text-3xl mb-2">{outcome === 'succeeded' ? '✅' : outcome === 'failed' ? '❌' : '🚫'}</p>
              <p className="font-semibold text-gray-900 mb-1">
                {outcome === 'succeeded' ? 'Payment succeeded' : outcome === 'failed' ? 'Payment failed' : 'Payment cancelled'}
              </p>
              <p className="text-sm text-gray-500 mb-6">You can go back and check the request's status.</p>
              <Link
                to="/consumer/requests"
                className="inline-block bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              >
                Back to my requests
              </Link>
            </div>
          ) : (
            <>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
                {TYPE_LABEL[payment.type] ?? payment.type} payment
              </p>
              <p className="text-3xl font-extrabold text-gray-900 mb-6">
                {payment.currency} {payment.amount?.toLocaleString()}
              </p>

              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>
              )}

              <div className="space-y-2">
                <button
                  onClick={() => resolve('succeeded')}
                  disabled={resolving}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
                >
                  {resolving ? 'Processing…' : 'Simulate success'}
                </button>
                <button
                  onClick={() => resolve('failed')}
                  disabled={resolving}
                  className="w-full border border-red-200 text-red-600 hover:bg-red-50 font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
                >
                  Simulate failure
                </button>
                <button
                  onClick={() => resolve('cancelled')}
                  disabled={resolving}
                  className="w-full border border-gray-200 text-gray-500 hover:bg-gray-50 font-medium py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
