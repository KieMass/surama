import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, Ban, CheckCircle2, BadgeCheck, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import ConfirmDialog from '../../components/ConfirmDialog'
import AdminLayout from './AdminLayout'
import { formatDate, StatCard } from './shared'
import {
  fetchUsersPage,
  fetchUserStats,
  fetchUserDetail,
  setUserDisabled,
  setUserRole,
  setUserVerified,
  ROLES,
} from '../../lib/admin'
import { STATUS_LABEL, STATUS_BADGE } from '../../lib/requests'

const PAGE_SIZE = 50

const ROLE_BADGE = {
  admin: 'bg-purple-50 text-purple-700 border border-purple-100',
  provider: 'bg-primary-50 text-primary-700 border border-primary-100',
  consumer: 'bg-blue-50 text-blue-700 border border-blue-100',
}

const ROLE_LABEL = { admin: 'Admin', provider: 'Provider', consumer: 'Consumer' }

function initials(name) {
  if (!name) return '?'
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('')
}

// ─── Status counts for one side of a user's booking history ────────────────
function StatusBreakdown({ requests }) {
  if (requests.length === 0) return <p className="text-xs text-gray-400">None yet.</p>
  const counts = {}
  requests.forEach((r) => { counts[r.status] = (counts[r.status] ?? 0) + 1 })
  return (
    <div className="flex flex-wrap gap-1.5">
      {Object.entries(counts).map(([status, count]) => (
        <span key={status} className={`text-[11px] font-semibold px-2 py-1 rounded-full ${STATUS_BADGE[status] ?? 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
          {STATUS_LABEL[status] ?? status} · {count}
        </span>
      ))}
    </div>
  )
}

// ─── Slide-over with a user's listings, bookings, and reviews written ──────
function UserDetailDrawer({ user, data, loading, onClose }) {
  if (!user) return null
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md h-full overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <h3 className="font-bold text-gray-900">User details</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Identity */}
          <div className="flex items-center gap-4">
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="w-16 h-16 rounded-full object-cover border border-gray-100 flex-shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xl font-bold flex-shrink-0">
                {initials(user.name)}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-bold text-gray-900 text-lg truncate">{user.name || 'Unnamed'}</p>
              <p className="text-sm text-gray-500 truncate">{user.email}</p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${ROLE_BADGE[user.role] ?? ROLE_BADGE.consumer}`}>
                  {ROLE_LABEL[user.role] ?? user.role}
                </span>
                {user.role === 'provider' && user.verified && (
                  <span className="text-[11px] font-semibold rounded-full px-2 py-0.5 bg-sky-50 text-sky-700 border border-sky-100 flex items-center gap-1">
                    <BadgeCheck size={11} /> Verified
                  </span>
                )}
                <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${
                  user.disabled ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                }`}>
                  {user.disabled ? 'Disabled' : 'Active'}
                </span>
              </div>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-gray-400">Phone</dt>
              <dd className="text-gray-800">{user.phone || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">Joined</dt>
              <dd className="text-gray-800">{formatDate(user.createdAt)}</dd>
            </div>
          </dl>

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {user.role === 'provider' && (
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                    Listings ({data.listings.length})
                  </h4>
                  {data.listings.length === 0 ? (
                    <p className="text-xs text-gray-400">No listings yet.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {data.listings.slice(0, 5).map((l) => (
                        <li key={l.id} className="flex items-center justify-between gap-2 text-sm">
                          <a href={`/services/${l.id}`} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline truncate">
                            {l.title}
                          </a>
                          <span className={`text-[11px] font-semibold flex-shrink-0 ${l.active ? 'text-emerald-600' : 'text-gray-400'}`}>
                            {l.active ? 'Active' : 'Inactive'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                  Bookings as customer ({data.requestsAsConsumer.length})
                </h4>
                <StatusBreakdown requests={data.requestsAsConsumer} />
              </div>

              {user.role === 'provider' && (
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                    Bookings as provider ({data.requestsAsProvider.length})
                  </h4>
                  <StatusBreakdown requests={data.requestsAsProvider} />
                </div>
              )}

              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                  Reviews written ({data.reviewsWritten.length})
                </h4>
                {data.reviewsWritten.length === 0 ? (
                  <p className="text-xs text-gray-400">None yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {data.reviewsWritten.slice(0, 3).map((r) => (
                      <li key={r.id} className="bg-gray-50 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-gray-700 truncate">{r.serviceTitle ?? 'Listing removed'}</span>
                          <span className="text-amber-400 text-xs flex-shrink-0">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                        </div>
                        {r.comment && <p className="text-xs text-gray-500 line-clamp-2">{r.comment}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AdminUsers() {
  const { user } = useAuth()

  const [users, setUsers] = useState([])
  const [cursor, setCursor] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [rowError, setRowError] = useState({})
  const [confirmAction, setConfirmAction] = useState(null)
  const [confirmBusy, setConfirmBusy] = useState(false)

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const [detailUser, setDetailUser] = useState(null)
  const [detailData, setDetailData] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  // Tracks which user's detail fetch is the most recent one, so an older
  // fetch resolving after a newer one was started can't clobber it.
  const latestDetailRequest = useRef(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [page, userStats] = await Promise.all([fetchUsersPage({ pageSize: PAGE_SIZE }), fetchUserStats()])
      setUsers(page.users)
      setCursor(page.cursor)
      setHasMore(page.hasMore)
      setStats(userStats)
    } catch {
      setError('Could not load users. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const loadMore = async () => {
    setLoadingMore(true)
    try {
      const page = await fetchUsersPage({ pageSize: PAGE_SIZE, cursor })
      setUsers((prev) => [...prev, ...page.users])
      setCursor(page.cursor)
      setHasMore(page.hasMore)
    } catch {
      setError('Could not load more users. Please try again.')
    } finally {
      setLoadingMore(false)
    }
  }

  const withRow = async (uid, action) => {
    setBusyId(uid)
    setRowError((prev) => ({ ...prev, [uid]: '' }))
    try {
      await action()
    } catch {
      setRowError((prev) => ({ ...prev, [uid]: 'Update failed — try again.' }))
    } finally {
      setBusyId(null)
    }
  }

  const toggleDisabled = (u) =>
    withRow(u.id, async () => {
      await setUserDisabled(u.id, !u.disabled)
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, disabled: !u.disabled } : x)))
      setStats((prev) => prev && {
        ...prev,
        disabled: prev.disabled + (u.disabled ? -1 : 1),
        activeAdmins: prev.activeAdmins + (u.role === 'admin' ? (u.disabled ? 1 : -1) : 0),
      })
    })

  const changeRole = (u, role) =>
    withRow(u.id, async () => {
      await setUserRole(u.id, role)
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role } : x)))
      setStats((prev) => {
        if (!prev) return prev
        const key = { admin: 'admins', provider: 'providers', consumer: 'consumers' }
        const activeAdminDelta = u.disabled ? 0 : (role === 'admin' ? 1 : 0) - (u.role === 'admin' ? 1 : 0)
        return {
          ...prev,
          [key[u.role]]: prev[key[u.role]] - 1,
          [key[role]]: prev[key[role]] + 1,
          activeAdmins: prev.activeAdmins + activeAdminDelta,
        }
      })
    })

  const toggleVerified = (u) =>
    withRow(u.id, async () => {
      await setUserVerified(u.id, !u.verified)
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, verified: !u.verified } : x)))
    })

  const runConfirmed = async () => {
    if (!confirmAction) return
    setConfirmBusy(true)
    await confirmAction.run()
    setConfirmBusy(false)
    setConfirmAction(null)
  }

  // Re-checks the active-admin count against the server immediately before
  // blocking (rather than trusting the possibly-stale `stats` in state) —
  // this narrows, though can't fully close without a transaction/Cloud
  // Function, the window where two admins racing this action at once could
  // both pass a stale check and leave zero admins.
  const stillLastAdmin = async (u) => {
    setBusyId(u.id)
    try {
      const fresh = await fetchUserStats()
      setStats(fresh)
      return fresh.activeAdmins <= 1
    } finally {
      setBusyId(null)
    }
  }

  const requestDisableToggle = async (u) => {
    // Re-enabling isn't destructive — just do it.
    if (u.disabled) {
      toggleDisabled(u)
      return
    }
    if (u.role === 'admin' && (await stillLastAdmin(u))) {
      setRowError((prev) => ({ ...prev, [u.id]: "Can't disable the last remaining admin." }))
      return
    }
    setConfirmAction({
      title: 'Disable this account?',
      message: `${u.name || u.email} will be signed out and won't be able to log in until you re-enable them.`,
      confirmLabel: 'Disable account',
      run: () => toggleDisabled(u),
    })
  }

  const requestRoleChange = async (u, role) => {
    if (role === u.role) return
    // Routine consumer ↔ provider changes don't need a confirmation.
    if (u.role !== 'admin' && role !== 'admin') {
      changeRole(u, role)
      return
    }
    if (u.role === 'admin' && (await stillLastAdmin(u))) {
      setRowError((prev) => ({ ...prev, [u.id]: "Can't remove the last remaining admin." }))
      return
    }
    setConfirmAction({
      title: role === 'admin' ? 'Grant admin access?' : 'Remove admin access?',
      message: role === 'admin'
        ? `Grant ${u.name || u.email} admin access? They'll be able to manage every user's role and account status.`
        : `Remove ${u.name || u.email}'s admin access? They'll become a ${ROLE_LABEL[role].toLowerCase()}.`,
      confirmLabel: role === 'admin' ? 'Grant admin' : 'Remove admin',
      run: () => changeRole(u, role),
    })
  }

  const openDetail = async (u) => {
    latestDetailRequest.current = u.id
    setDetailUser(u)
    setDetailLoading(true)
    try {
      const data = await fetchUserDetail(u.id)
      if (latestDetailRequest.current === u.id) setDetailData(data)
    } catch {
      if (latestDetailRequest.current === u.id) {
        setDetailData({ listings: [], requestsAsConsumer: [], requestsAsProvider: [], reviewsWritten: [] })
      }
    } finally {
      if (latestDetailRequest.current === u.id) setDetailLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false
      if (statusFilter === 'active' && u.disabled) return false
      if (statusFilter === 'disabled' && !u.disabled) return false
      if (q && !`${u.name ?? ''} ${u.email ?? ''}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [users, search, roleFilter, statusFilter])

  return (
    <AdminLayout title="Users" subtitle="View every account and manage access">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <StatCard label="Total users" value={stats?.total} />
        <StatCard label="Consumers" value={stats?.consumers} />
        <StatCard label="Providers" value={stats?.providers} />
        <StatCard label="Admins" value={stats?.admins} />
        <StatCard label="Disabled" value={stats?.disabled} />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search loaded users by name or email…"
            className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>
      {hasMore && (search || roleFilter !== 'all' || statusFilter !== 'all') && (
        <p className="text-xs text-amber-600 -mt-3">
          Search and filters only cover the {users.length} users loaded so far — load more to widen the results.
        </p>
      )}

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Verified</th>
                <th className="px-5 py-3">Joined</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50 animate-pulse">
                    <td className="px-5 py-4"><div className="h-4 bg-gray-100 rounded w-32" /></td>
                    <td className="px-5 py-4"><div className="h-4 bg-gray-100 rounded w-40" /></td>
                    <td className="px-5 py-4"><div className="h-4 bg-gray-100 rounded w-20" /></td>
                    <td className="px-5 py-4"><div className="h-4 bg-gray-100 rounded w-16" /></td>
                    <td className="px-5 py-4"><div className="h-4 bg-gray-100 rounded w-24" /></td>
                    <td className="px-5 py-4"><div className="h-4 bg-gray-100 rounded w-16" /></td>
                    <td className="px-5 py-4"><div className="h-4 bg-gray-100 rounded w-20 ml-auto" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-gray-400">
                    No users match these filters.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => {
                  const isSelf = u.id === user?.uid
                  const busy = busyId === u.id
                  return (
                    <tr key={u.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-4">
                        <button onClick={() => openDetail(u)} className="flex items-center gap-3 text-left group">
                          {u.photoURL ? (
                            <img src={u.photoURL} alt="" className="w-9 h-9 rounded-full object-cover border border-gray-100 flex-shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {initials(u.name)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate group-hover:text-primary-600 transition-colors">{u.name || 'Unnamed'}</p>
                            {isSelf && <span className="text-[11px] font-semibold text-primary-600">You</span>}
                          </div>
                        </button>
                      </td>
                      <td className="px-5 py-4 text-gray-600 truncate max-w-[220px]">{u.email}</td>
                      <td className="px-5 py-4">
                        <select
                          value={u.role ?? 'consumer'}
                          disabled={isSelf || busy}
                          onChange={(e) => requestRoleChange(u, e.target.value)}
                          className={`text-xs font-semibold rounded-full px-2.5 py-1.5 border focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-60 disabled:cursor-not-allowed ${ROLE_BADGE[u.role] ?? ROLE_BADGE.consumer}`}
                        >
                          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                        </select>
                      </td>
                      <td className="px-5 py-4">
                        {u.role === 'provider' ? (
                          <button
                            onClick={() => toggleVerified(u)}
                            disabled={busy}
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-full border transition-colors disabled:opacity-50 ${
                              u.verified
                                ? 'bg-sky-50 text-sky-700 border-sky-100 hover:bg-sky-100'
                                : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            <BadgeCheck size={12} /> {u.verified ? 'Verified' : 'Verify'}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-gray-500">{formatDate(u.createdAt)}</td>
                      <td className="px-5 py-4">
                        {u.disabled ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-100 rounded-full px-2.5 py-1">
                            <Ban size={12} /> Disabled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-1">
                            <CheckCircle2 size={12} /> Active
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {isSelf ? (
                          <span className="text-xs text-gray-400">—</span>
                        ) : (
                          <button
                            onClick={() => requestDisableToggle(u)}
                            disabled={busy}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
                              u.disabled
                                ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                                : 'border-red-200 text-red-600 hover:bg-red-50'
                            }`}
                          >
                            {busy ? 'Saving…' : u.disabled ? 'Enable' : 'Disable'}
                          </button>
                        )}
                        {rowError[u.id] && (
                          <p className="text-[11px] text-red-500 mt-1">{rowError[u.id]}</p>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && hasMore && (
          <div className="border-t border-gray-100 p-4 text-center">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="text-sm font-semibold text-primary-600 hover:text-primary-700 disabled:opacity-50 transition-colors"
            >
              {loadingMore ? 'Loading…' : `Load more (${users.length} of ${stats?.total ?? '…'} loaded)`}
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        action={confirmAction}
        busy={confirmBusy}
        onConfirm={runConfirmed}
        onCancel={() => setConfirmAction(null)}
      />

      <UserDetailDrawer
        user={detailUser}
        data={detailData}
        loading={detailLoading}
        onClose={() => { setDetailUser(null); setDetailData(null) }}
      />
    </AdminLayout>
  )
}
