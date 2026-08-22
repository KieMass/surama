import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, ShieldCheck, Ban, CheckCircle2 } from 'lucide-react'
import { signOut } from 'firebase/auth'
import { auth } from '../../firebase'
import { useAuth } from '../../context/AuthContext'
import { asset } from '../../lib/asset'
import { fetchAllUsers, setUserDisabled, setUserRole, ROLES } from '../../lib/admin'

const GRADIENT = 'linear-gradient(135deg, #ff5a5f 0%, #e8464b 55%, #c93338 100%)'

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

function formatDate(ts) {
  const d = ts?.toDate?.()
  if (!d) return '—'
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <p className="text-2xl font-extrabold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  )
}

export default function AdminUsers() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [rowError, setRowError] = useState({})

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      setUsers(await fetchAllUsers())
    } catch {
      setError('Could not load users. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleSignOut = async () => {
    await signOut(auth)
    navigate('/login')
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
    })

  const changeRole = (u, role) => {
    if (role === u.role) return
    withRow(u.id, async () => {
      await setUserRole(u.id, role)
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role } : x)))
    })
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

  const stats = useMemo(() => ({
    total: users.length,
    consumers: users.filter((u) => u.role === 'consumer').length,
    providers: users.filter((u) => u.role === 'provider').length,
    admins: users.filter((u) => u.role === 'admin').length,
    disabled: users.filter((u) => u.disabled).length,
  }), [users])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <Link to="/"><img src={asset('logo-dark.png')} alt="Surama.net" className="h-10 w-auto" /></Link>
        <div className="flex items-center gap-5">
          <Link to="/account" className="text-sm text-gray-600 hover:text-primary-600 font-medium transition-colors">
            Account
          </Link>
          <button onClick={handleSignOut} className="text-sm text-gray-600 hover:text-primary-600 font-medium transition-colors">
            Sign out
          </button>
        </div>
      </nav>

      {/* Header */}
      <div className="relative overflow-hidden" style={{ background: GRADIENT }}>
        <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-white/5 pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-6 py-10">
          <p className="text-primary-100 text-sm font-medium mb-1 flex items-center gap-1.5">
            <ShieldCheck size={16} /> Admin
          </p>
          <h1 className="text-3xl font-extrabold text-white mb-1">Users</h1>
          <p className="text-primary-100 text-sm">View every account and manage access</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <StatCard label="Total users" value={stats.total} />
          <StatCard label="Consumers" value={stats.consumers} />
          <StatCard label="Providers" value={stats.providers} />
          <StatCard label="Admins" value={stats.admins} />
          <StatCard label="Disabled" value={stats.disabled} />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email…"
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
                      <td className="px-5 py-4"><div className="h-4 bg-gray-100 rounded w-24" /></td>
                      <td className="px-5 py-4"><div className="h-4 bg-gray-100 rounded w-16" /></td>
                      <td className="px-5 py-4"><div className="h-4 bg-gray-100 rounded w-20 ml-auto" /></td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center text-gray-400">
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
                          <div className="flex items-center gap-3">
                            {u.photoURL ? (
                              <img src={u.photoURL} alt="" className="w-9 h-9 rounded-full object-cover border border-gray-100 flex-shrink-0" />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {initials(u.name)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 truncate">{u.name || 'Unnamed'}</p>
                              {isSelf && <span className="text-[11px] font-semibold text-primary-600">You</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-gray-600 truncate max-w-[220px]">{u.email}</td>
                        <td className="px-5 py-4">
                          <select
                            value={u.role ?? 'consumer'}
                            disabled={isSelf || busy}
                            onChange={(e) => changeRole(u, e.target.value)}
                            className={`text-xs font-semibold rounded-full px-2.5 py-1.5 border focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-60 disabled:cursor-not-allowed ${ROLE_BADGE[u.role] ?? ROLE_BADGE.consumer}`}
                          >
                            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                          </select>
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
                              onClick={() => toggleDisabled(u)}
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
        </div>
      </div>
    </div>
  )
}
