import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../../firebase'
import { useAuth } from '../../context/AuthContext'
import { asset } from '../../lib/asset'
import {
  getRequestsForProvider,
  updateRequestStatus,
  updateRequestDetails,
  requestCompletion,
  proposePriceAdjustment,
  acceptPriceAdjustment,
  declinePriceAdjustment,
  sortByNewest,
  REQUEST_STATUS,
  STATUS_LABEL,
  STATUS_BADGE,
} from '../../lib/requests'
import { getOrCreateConversation } from '../../lib/conversations'

const FILTERS = ['All', 'Pending', 'Accepted', 'Price Pending', 'Awaiting Confirmation', 'Disputed', 'Completed', 'Declined', 'Cancelled']

function formatDate(timestamp) {
  if (!timestamp?.toDate) return ''
  return timestamp.toDate().toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function JobDetailPanel({ r, onStatusChange, onRequestCompletion, onPricePropose, onPriceAccept, onPriceDecline, busyId, onSaved, currentUser, userDoc }) {
  const navigate = useNavigate()
  const [notes, setNotes]             = useState(r.providerNotes ?? '')
  const [scheduledDate, setScheduled] = useState(r.scheduledDate ?? r.preferredDate ?? '')
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)
  const [startingChat, setStartingChat] = useState(false)
  const [chatError, setChatError]     = useState('')
  const [showPriceForm, setShowPriceForm] = useState(false)
  const [newPrice, setNewPrice]           = useState('')
  const [priceNote, setPriceNote]         = useState('')
  const [proposingPrice, setProposingPrice] = useState(false)

  const handleOpenChat = async () => {
    setStartingChat(true)
    setChatError('')
    try {
      const convId = await getOrCreateConversation({
        consumerId: r.consumerId,
        consumerName: r.consumerName ?? '',
        providerId: currentUser.uid,
        providerName: userDoc?.name ?? '',
        serviceId: r.serviceId,
        serviceTitle: r.serviceTitle,
      })
      navigate(`/chat/${convId}`)
    } catch {
      setChatError('Could not open chat. Please try again.')
      setStartingChat(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    await updateRequestDetails(r.id, { providerNotes: notes, scheduledDate })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    onSaved({ ...r, providerNotes: notes, scheduledDate })
  }

  const isPending           = r.status === REQUEST_STATUS.PENDING
  const isAccepted          = r.status === REQUEST_STATUS.ACCEPTED
  const isPriceProposed     = r.status === REQUEST_STATUS.PRICE_PROPOSED
  const isPendingCompletion = r.status === REQUEST_STATUS.PENDING_COMPLETION
  const isDisputed          = r.status === REQUEST_STATUS.DISPUTED
  const isCompleted         = r.status === REQUEST_STATUS.COMPLETED
  const isLocked            = isCompleted || isPendingCompletion || isDisputed

  const handleProposePrice = async () => {
    if (!newPrice) return
    setProposingPrice(true)
    await onPricePropose(r.id, parseFloat(newPrice), priceNote)
    setShowPriceForm(false)
    setNewPrice('')
    setPriceNote('')
    setProposingPrice(false)
  }

  return (
    <div className="border-t border-gray-100 bg-gray-50 px-5 py-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

        {/* Left — job info */}
        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Service</p>
            <p className="text-sm font-semibold text-gray-800">{r.serviceTitle}</p>
            <p className="text-xs text-primary-600 font-medium">{r.serviceCategory}</p>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Customer</p>
            <p className="text-sm font-semibold text-gray-800">{r.consumerName || 'Customer'}</p>
            {(isAccepted || isCompleted) && r.consumerEmail && (
              <a href={`mailto:${r.consumerEmail}`}
                className="text-xs text-primary-600 hover:underline">{r.consumerEmail}</a>
            )}
          </div>

          {r.message && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Message from customer</p>
              <p className="text-sm text-gray-600 bg-white border border-gray-100 rounded-xl p-3 leading-relaxed">
                {r.message}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {r.preferredDate && (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Requested date</p>
                <p className="text-sm text-gray-700">{r.preferredDate}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Price</p>
              <p className="text-sm font-semibold text-gray-800">{r.currency} {r.price?.toLocaleString()}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Received</p>
            <p className="text-sm text-gray-500">{formatDate(r.createdAt)}</p>
          </div>
        </div>

        {/* Right — editable fields + actions */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">
              Confirmed Date
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduled(e.target.value)}
              disabled={isLocked}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition disabled:bg-gray-100 disabled:text-gray-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">
              Job Notes <span className="text-gray-300 font-normal normal-case tracking-normal">(internal — customer won't see this)</span>
            </label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isLocked}
              placeholder="Add details about the job, materials needed, access info, agreed scope…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition resize-none disabled:bg-gray-100 disabled:text-gray-400"
            />
          </div>

          {!isLocked && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full border border-primary-200 text-primary-600 hover:bg-primary-50 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Details'}
            </button>
          )}

          {/* Status actions */}
          <div className="pt-1 space-y-2">
            {isPending && (
              <div className="flex gap-2">
                <button
                  onClick={() => onStatusChange(r.id, REQUEST_STATUS.DECLINED)}
                  disabled={busyId === r.id}
                  className="flex-1 text-sm font-semibold text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-200 py-2.5 rounded-xl transition-colors disabled:opacity-50"
                >
                  Decline
                </button>
                <button
                  onClick={() => onStatusChange(r.id, REQUEST_STATUS.ACCEPTED)}
                  disabled={busyId === r.id}
                  className="flex-1 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 py-2.5 rounded-xl transition-colors disabled:opacity-50 shadow-sm"
                >
                  {busyId === r.id ? 'Saving…' : 'Accept Job'}
                </button>
              </div>
            )}

            {isAccepted && (
              <div className="space-y-2">
                <button
                  onClick={() => onRequestCompletion(r.id)}
                  disabled={busyId === r.id}
                  className="w-full text-sm font-bold text-white py-3 rounded-xl transition-colors disabled:opacity-50 shadow-sm"
                  style={{ background: 'linear-gradient(135deg, #22c55e, #15803d)' }}
                >
                  {busyId === r.id ? 'Submitting…' : '✓ Mark Job as Completed'}
                </button>

                {!showPriceForm ? (
                  <button
                    onClick={() => setShowPriceForm(true)}
                    className="w-full border border-dashed border-gray-200 text-gray-400 hover:border-indigo-300 hover:text-indigo-600 py-2 rounded-xl text-xs font-semibold transition-colors"
                  >
                    💰 Propose price adjustment
                  </button>
                ) : (
                  <div className="border border-indigo-100 bg-indigo-50 rounded-xl p-4 space-y-3">
                    <div>
                      <p className="text-xs font-bold text-indigo-700 uppercase tracking-wide">Propose Price Adjustment</p>
                      <p className="text-xs text-indigo-400 mt-0.5">Current: {r.currency} {r.price?.toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className="text-xs font-semibold text-gray-500 shrink-0">{r.currency}</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}
                        placeholder="New price"
                        className="flex-1 border border-indigo-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                    </div>
                    <textarea
                      rows={2}
                      value={priceNote}
                      onChange={(e) => setPriceNote(e.target.value)}
                      placeholder="Reason (e.g. extra materials, scope change)…"
                      className="w-full border border-indigo-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setShowPriceForm(false); setNewPrice(''); setPriceNote('') }}
                        className="flex-1 border border-gray-200 text-gray-500 py-2 rounded-lg text-xs font-medium hover:bg-white transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleProposePrice}
                        disabled={!newPrice || proposingPrice}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        {proposingPrice ? 'Sending…' : 'Send to Customer'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Provider proposed — awaiting consumer response */}
            {isPriceProposed && r.priceProposedBy === 'provider' && (
              <div className="space-y-2">
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                  <p className="text-sm font-semibold text-indigo-800">⏳ Price adjustment sent to customer</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-xs text-indigo-400">Original:</span>
                    <span className="text-xs font-semibold text-gray-500 line-through">{r.currency} {r.price?.toLocaleString()}</span>
                    <span className="text-indigo-300">→</span>
                    <span className="text-xs font-bold text-indigo-700">{r.currency} {r.proposedPrice?.toLocaleString()}</span>
                  </div>
                  {r.proposedPriceNote && (
                    <p className="text-xs text-indigo-500 italic mt-1">"{r.proposedPriceNote}"</p>
                  )}
                </div>
                <button
                  onClick={() => onPriceDecline(r.id)}
                  disabled={busyId === r.id}
                  className="w-full border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 py-2 rounded-xl text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {busyId === r.id ? 'Cancelling…' : 'Cancel this adjustment'}
                </button>
              </div>
            )}

            {/* Consumer made a counter-offer */}
            {isPriceProposed && r.priceProposedBy === 'consumer' && (
              <div className="space-y-2">
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                  <p className="text-sm font-semibold text-amber-800">Customer made a counter offer</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-xs text-amber-500">Their price:</span>
                    <span className="text-sm font-bold text-amber-700">{r.currency} {r.proposedPrice?.toLocaleString()}</span>
                    <span className="text-xs text-gray-400">(original: {r.currency} {r.price?.toLocaleString()})</span>
                  </div>
                  {r.proposedPriceNote && (
                    <p className="text-xs text-amber-600 italic mt-1">"{r.proposedPriceNote}"</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onPriceDecline(r.id)}
                    disabled={busyId === r.id}
                    className="flex-1 border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => onPriceAccept(r.id, r.proposedPrice)}
                    disabled={busyId === r.id}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 shadow-sm"
                  >
                    {busyId === r.id ? 'Accepting…' : '✅ Accept Counter'}
                  </button>
                </div>
              </div>
            )}

            {isPendingCompletion && (
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-center space-y-1">
                <p className="text-sm font-semibold text-purple-800">⏳ Awaiting customer confirmation</p>
                <p className="text-xs text-purple-500">Auto-confirms 2 days after submission. Customer can confirm or dispute.</p>
              </div>
            )}

            {isDisputed && (
              <div className="space-y-2">
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-center">
                  <p className="text-sm font-semibold text-orange-800">⚠️ Customer raised a dispute</p>
                  <p className="text-xs text-orange-500 mt-0.5">Check your inbox — a message has been sent. Resolve with the customer, then re-submit when ready.</p>
                </div>
                <button
                  onClick={() => onRequestCompletion(r.id)}
                  disabled={busyId === r.id}
                  className="w-full text-sm font-semibold text-white py-2.5 rounded-xl transition-colors disabled:opacity-50 shadow-sm"
                  style={{ background: 'linear-gradient(135deg, #22c55e, #15803d)' }}
                >
                  {busyId === r.id ? 'Submitting…' : 'Re-submit for Completion'}
                </button>
              </div>
            )}

            {isCompleted && (
              <div className="flex items-center justify-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-semibold py-3 rounded-xl">
                ✅ Job Completed
              </div>
            )}

            <div className="space-y-1">
              <button
                onClick={handleOpenChat}
                disabled={startingChat}
                className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-600 hover:border-primary-400 hover:text-primary-600 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
              >
                💬 {startingChat ? 'Opening…' : `Message ${r.consumerName || 'Customer'}`}
              </button>
              {chatError && <p className="text-xs text-red-500 text-center">{chatError}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Requests() {
  const { userDoc } = useAuth()
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('Pending')
  const [busyId, setBusyId]     = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  const load = async () => {
    setLoading(true)
    const data = await getRequestsForProvider(auth.currentUser.uid)
    setRequests(sortByNewest(data))
    setLoading(false)
  }

  useEffect(() => {
    let cancelled = false
    getRequestsForProvider(auth.currentUser.uid).then((data) => {
      if (cancelled) return
      setRequests(sortByNewest(data))
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const handleStatusChange = async (id, status) => {
    setBusyId(id)
    await updateRequestStatus(id, status)
    await load()
    setBusyId(null)
  }

  const handleRequestCompletion = async (id) => {
    setBusyId(id)
    await requestCompletion(id)
    await load()
    setBusyId(null)
  }

  const handlePricePropose = async (id, proposedPrice, note) => {
    setBusyId(id)
    await proposePriceAdjustment(id, { proposedPrice, proposedPriceNote: note, proposedBy: 'provider' })
    await load()
    setBusyId(null)
  }

  const handlePriceAccept = async (id, proposedPrice) => {
    setBusyId(id)
    await acceptPriceAdjustment(id, proposedPrice)
    await load()
    setBusyId(null)
  }

  const handlePriceDecline = async (id) => {
    setBusyId(id)
    await declinePriceAdjustment(id)
    await load()
    setBusyId(null)
  }

  const handleSaved = (updated) => {
    setRequests((prev) => prev.map((r) => r.id === updated.id ? updated : r))
  }

  const handleSignOut = async () => {
    await signOut(auth)
    navigate('/login')
  }

  const pendingCount = requests.filter((r) => r.status === REQUEST_STATUS.PENDING).length
  const filtered = requests.filter((r) => filter === 'All' || STATUS_LABEL[r.status] === filter)
  const firstName = userDoc?.name?.split(' ')[0] ?? 'there'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between sticky top-0 z-40">
        <Link to="/"><img src={asset('logo-dark.png')} alt="Surama.net" className="h-10 w-auto" /></Link>
        <div className="flex items-center gap-4">
          <Link to="/inbox" className="text-sm text-gray-600 hover:text-primary-600 font-medium transition-colors">
            💬 Inbox
          </Link>
          <button onClick={handleSignOut} className="text-sm text-gray-600 hover:text-primary-600 font-medium transition-colors">
            Sign out
          </button>
        </div>
      </nav>

      {/* Header */}
      <div className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #ff5a5f 0%, #e8464b 55%, #c93338 100%)' }}>
        <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-white/5 pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-6 py-10">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-primary-100 text-sm font-medium mb-1">Hello, {firstName}</p>
              <h1 className="text-3xl font-extrabold text-white mb-1">Job Requests</h1>
              <p className="text-primary-100 text-sm">
                {pendingCount > 0
                  ? `${pendingCount} request${pendingCount !== 1 ? 's' : ''} waiting on you`
                  : "You're all caught up"}
              </p>
            </div>
            <Link
              to="/provider/dashboard"
              className="bg-white/15 hover:bg-white/25 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
            >
              ← Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Filter pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300'
              }`}
            >
              {f}
              {f === 'Pending' && pendingCount > 0 && (
                <span className="ml-1.5 bg-white text-primary-600 text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-gray-600 font-medium">No {filter !== 'All' ? filter.toLowerCase() : ''} requests</p>
            <p className="text-gray-400 text-sm mt-1">New requests from customers will show up here</p>
          </div>
        )}

        <div className="space-y-3">
          {filtered.map((r) => {
            const isExpanded = expandedId === r.id
            return (
              <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Summary row — click to expand */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : r.id)}
                  className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors"
                >
                  {/* Expand chevron */}
                  <span className={`text-gray-300 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}>▶</span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-xs text-primary-600 font-bold uppercase tracking-wide">
                        {r.serviceCategory}
                      </span>
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${STATUS_BADGE[r.status]}`}>
                        {STATUS_LABEL[r.status]}
                      </span>
                    </div>
                    <p className="font-semibold text-gray-900 truncate">{r.serviceTitle}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {r.consumerName || 'Customer'}
                      {r.scheduledDate && ` · 📅 ${r.scheduledDate}`}
                      {!r.scheduledDate && r.preferredDate && ` · Requested: ${r.preferredDate}`}
                    </p>
                  </div>

                  <div className="flex-shrink-0 text-right">
                    <p className="text-sm font-bold text-gray-800">{r.currency} {r.price?.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">{formatDate(r.createdAt)}</p>
                  </div>
                </button>

                {/* Expanded detail panel */}
                {isExpanded && (
                  <JobDetailPanel
                    r={r}
                    onStatusChange={handleStatusChange}
                    onRequestCompletion={handleRequestCompletion}
                    onPricePropose={handlePricePropose}
                    onPriceAccept={handlePriceAccept}
                    onPriceDecline={handlePriceDecline}
                    busyId={busyId}
                    onSaved={handleSaved}
                    currentUser={auth.currentUser}
                    userDoc={userDoc}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
