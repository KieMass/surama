import { useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import ConfirmDialog from '../../components/ConfirmDialog'
import AdminLayout from './AdminLayout'
import { formatDate } from './shared'
import { fetchPaymentSettings, savePaymentSettings } from '../../lib/admin'

// Same ranges firestore.rules and functions/payments.js enforce — checked
// here first so the admin gets a readable message instead of a rules denial.
const FIELDS = [
  {
    key: 'depositPercent',
    label: 'Deposit',
    suffix: '%',
    help: 'Share of the job price the consumer pays up front, once the provider accepts.',
    min: 1,
    max: 99,
    step: 1,
  },
  {
    key: 'commissionPercent',
    label: 'Platform commission',
    suffix: '%',
    help: 'Taken from each payment (deposit and balance) before the provider’s share.',
    min: 0,
    max: 50,
    step: 0.5,
  },
  {
    key: 'gydUsdRate',
    label: 'GYD per 1 USD',
    suffix: 'GYD',
    help: 'Used to convert GYD prices for plugins that can only charge in USD (PayPal). Keep this current.',
    min: 0.01,
    max: null,
    step: 0.01,
  },
]

const EXAMPLE_PRICE = 10000

function validate(form) {
  const errors = {}
  for (const f of FIELDS) {
    const v = Number(form[f.key])
    if (form[f.key] === '' || !Number.isFinite(v)) errors[f.key] = 'Enter a number.'
    else if (v < f.min || (f.max != null && v > f.max)) {
      errors[f.key] = f.max != null ? `Must be between ${f.min} and ${f.max}.` : `Must be greater than 0.`
    }
  }
  return errors
}

function money(n) {
  return (Math.round(n * 100) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })
}

export default function AdminPayments() {
  const [saved, setSaved] = useState(null)
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [confirmAction, setConfirmAction] = useState(null)
  const [confirmBusy, setConfirmBusy] = useState(false)

  const applySettings = (s) => {
    setSaved(s)
    setForm({
      depositPercent: String(s.depositPercent),
      commissionPercent: String(s.commissionPercent),
      gydUsdRate: String(s.gydUsdRate),
    })
  }

  useEffect(() => {
    fetchPaymentSettings()
      .then(applySettings, () => setError('Could not load payment settings. Please refresh to try again.'))
      .finally(() => setLoading(false))
  }, [])

  const errors = form ? validate(form) : {}
  const valid = form && Object.keys(errors).length === 0
  const dirty = form && saved && FIELDS.some((f) => Number(form[f.key]) !== saved[f.key])

  const save = async () => {
    setError('')
    setNotice('')
    const values = Object.fromEntries(FIELDS.map((f) => [f.key, Number(form[f.key])]))
    try {
      await savePaymentSettings(values)
    } catch {
      setError('Could not save payment settings. Please try again.')
      return
    }
    setNotice('Payment settings saved.')
    // Re-read so "Last saved" reflects the server timestamp just written.
    try {
      applySettings(await fetchPaymentSettings())
    } catch { /* save went through — the stale "Last saved" fixes itself on refresh */ }
  }

  const runConfirmed = async () => {
    if (!confirmAction) return
    setConfirmBusy(true)
    await confirmAction.run()
    setConfirmBusy(false)
    setConfirmAction(null)
  }

  const requestSave = (e) => {
    e.preventDefault()
    if (!valid || !dirty) return
    const changes = FIELDS
      .filter((f) => Number(form[f.key]) !== saved[f.key])
      .map((f) => `${f.label}: ${saved[f.key]} → ${Number(form[f.key])}`)
      .join(', ')
    setConfirmAction({
      title: 'Update payment settings?',
      message: `${changes}. This applies to jobs whose first payment starts from now on — jobs already paying keep their rates.`,
      confirmLabel: 'Save',
      run: save,
    })
  }

  // Worked example of what the current form values mean for one job,
  // computed the same way createPaymentSession does.
  let example = null
  if (valid) {
    const deposit = (EXAMPLE_PRICE * Number(form.depositPercent)) / 100
    const balance = EXAMPLE_PRICE - deposit
    const commission = (EXAMPLE_PRICE * Number(form.commissionPercent)) / 100
    example = {
      deposit,
      balance,
      commission,
      provider: EXAMPLE_PRICE - commission,
      depositUsd: deposit / Number(form.gydUsdRate),
    }
  }

  return (
    <AdminLayout title="Payments" subtitle="Deposit, commission and currency conversion for new payments">
      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
      )}
      {notice && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
          <CheckCircle2 size={16} /> {notice}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <form onSubmit={requestSave} className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
          {loading || !form ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse space-y-2">
                <div className="h-4 bg-gray-100 rounded w-32" />
                <div className="h-10 bg-gray-100 rounded-xl w-48" />
              </div>
            ))
          ) : (
            <>
              {FIELDS.map((f) => (
                <div key={f.key}>
                  <label htmlFor={f.key} className="block text-sm font-semibold text-gray-900 mb-1">{f.label}</label>
                  <p className="text-xs text-gray-500 mb-2">{f.help}</p>
                  <div className="flex items-center gap-2">
                    <input
                      id={f.key}
                      type="number"
                      inputMode="decimal"
                      min={f.min}
                      max={f.max ?? undefined}
                      step={f.step}
                      value={form[f.key]}
                      onChange={(e) => {
                        setNotice('')
                        setForm((prev) => ({ ...prev, [f.key]: e.target.value }))
                      }}
                      className={`w-40 border rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition ${
                        errors[f.key] ? 'border-red-300' : 'border-gray-200'
                      }`}
                    />
                    <span className="text-sm text-gray-500">{f.suffix}</span>
                  </div>
                  {errors[f.key] && <p className="text-xs text-red-500 mt-1">{errors[f.key]}</p>}
                </div>
              ))}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  {saved?.updatedAt
                    ? `Last saved ${formatDate(saved.updatedAt)}`
                    : 'Using built-in defaults — not saved yet'}
                </p>
                <button
                  type="submit"
                  disabled={!valid || !dirty}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save changes
                </button>
              </div>
            </>
          )}
        </form>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4 h-fit">
          <h2 className="text-sm font-bold text-gray-900">Example: a GYD {money(EXAMPLE_PRICE)} job</h2>
          {example ? (
            <dl className="text-sm space-y-2">
              <div className="flex justify-between"><dt className="text-gray-500">Deposit</dt><dd className="font-semibold text-gray-900">GYD {money(example.deposit)}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Balance</dt><dd className="font-semibold text-gray-900">GYD {money(example.balance)}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Platform keeps</dt><dd className="font-semibold text-gray-900">GYD {money(example.commission)}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Provider receives</dt><dd className="font-semibold text-gray-900">GYD {money(example.provider)}</dd></div>
              <div className="flex justify-between pt-2 border-t border-gray-100"><dt className="text-gray-500">Deposit via PayPal</dt><dd className="font-semibold text-gray-900">USD {example.depositUsd.toFixed(2)}</dd></div>
            </dl>
          ) : (
            <p className="text-sm text-gray-400">Fix the highlighted fields to see an example.</p>
          )}
          <p className="text-xs text-gray-400 leading-relaxed">
            Changes apply to jobs whose first payment starts after you save. A job that has already started
            paying keeps the deposit and commission rates it started with, for both payments.
          </p>
        </div>
      </div>

      <ConfirmDialog
        action={confirmAction}
        busy={confirmBusy}
        onConfirm={runConfirmed}
        onCancel={() => setConfirmAction(null)}
      />
    </AdminLayout>
  )
}
