import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { asset } from '../lib/asset'
import { subscribeToConversations } from '../lib/conversations'

function timeAgo(ts) {
  if (!ts?.toDate) return ''
  const ms = Date.now() - ts.toDate().getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function Inbox() {
  const { user, userDoc } = useAuth()
  const navigate = useNavigate()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const unsub = subscribeToConversations(user.uid, (convs) => {
      setConversations(convs)
      setLoading(false)
    })
    return unsub
  }, [user])

  const handleSignOut = async () => {
    await signOut(auth)
    navigate('/login')
  }

  const dashboardPath = userDoc?.role === 'provider' ? '/provider/dashboard' : '/consumer/dashboard'

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <Link to="/"><img src={asset('logo-dark.png')} alt="Surama.net" className="h-10 w-auto" /></Link>
        <div className="flex items-center gap-4">
          <Link to={dashboardPath} className="text-sm text-gray-600 hover:text-primary-600 font-medium transition-colors">
            ← Dashboard
          </Link>
          <button onClick={handleSignOut} className="text-sm text-gray-600 hover:text-primary-600 font-medium transition-colors">
            Sign out
          </button>
        </div>
      </nav>

      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #ff5a5f 0%, #e8464b 55%, #c93338 100%)' }}>
        <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-white/5 pointer-events-none" />
        <div className="relative max-w-2xl mx-auto px-6 py-10">
          <p className="text-primary-100 text-sm font-medium mb-1">Messages</p>
          <h1 className="text-3xl font-extrabold text-white">Inbox</h1>
          <p className="text-primary-100 text-sm mt-1">
            {!loading && `${conversations.length} conversation${conversations.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && conversations.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <p className="text-4xl mb-3">💬</p>
            <p className="text-gray-600 font-medium">No messages yet</p>
            <p className="text-gray-400 text-sm mt-2 max-w-xs mx-auto">
              {userDoc?.role === 'consumer'
                ? 'Find a service and tap "Message Provider" to start a conversation'
                : 'Conversations with customers will appear here'}
            </p>
            {userDoc?.role === 'consumer' && (
              <Link to="/" className="inline-block mt-4 text-sm text-primary-600 font-semibold hover:underline">
                Browse services →
              </Link>
            )}
          </div>
        )}

        <div className="space-y-2">
          {conversations.map((conv) => {
            const isConsumer = user.uid === conv.consumerId
            const otherName = isConsumer ? conv.providerName : conv.consumerName
            const initials = otherName?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '?'

            const lastMsg  = conv.lastMessageAt?.toMillis?.() ?? 0
            const lastRead = conv.readBy?.[user.uid]?.toMillis?.() ?? 0
            const isUnread = lastMsg > lastRead && conv.lastMessageBy !== user.uid

            return (
              <Link
                key={conv.id}
                to={`/chat/${conv.id}`}
                className={`flex items-center gap-4 bg-white rounded-2xl border px-5 py-4 hover:border-primary-200 hover:shadow-md transition-all ${
                  isUnread ? 'border-primary-200 shadow-sm' : 'border-gray-100'
                }`}
              >
                <div className="relative flex-shrink-0">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-sm"
                    style={{ background: 'linear-gradient(135deg, #ff5a5f, #c93338)' }}
                  >
                    {initials}
                  </div>
                  {isUnread && (
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p className={`truncate ${isUnread ? 'font-bold text-gray-900' : 'font-semibold text-gray-900'}`}>
                      {otherName || 'User'}
                    </p>
                    <p className={`text-xs flex-shrink-0 ${isUnread ? 'text-primary-600 font-semibold' : 'text-gray-400'}`}>
                      {timeAgo(conv.lastMessageAt)}
                    </p>
                  </div>
                  {conv.serviceTitle && (
                    <p className="text-xs text-primary-600 font-medium truncate mb-0.5">{conv.serviceTitle}</p>
                  )}
                  <p className={`text-sm truncate ${isUnread ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>
                    {conv.lastMessage || 'Start the conversation…'}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
