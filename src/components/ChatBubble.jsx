import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  subscribeToConversations,
  subscribeToMessages,
  sendMessage,
  markConversationRead,
} from '../lib/conversations'

function timeAgo(ts) {
  if (!ts?.toDate) return ''
  const ms = Date.now() - ts.toDate().getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

function playDing() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.value = 830
    gain.gain.setValueAtTime(0.35, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.6)
    setTimeout(() => ctx.close(), 1000)
  } catch {}
}

export default function ChatBubble() {
  const { user, userDoc } = useAuth()
  const [open, setOpen]               = useState(false)
  const [activeConvId, setActiveConvId] = useState(null)
  const [conversations, setConversations] = useState([])
  const [messages, setMessages]       = useState([])
  const [text, setText]               = useState('')
  const [sending, setSending]         = useState(false)

  const prevConvsRef    = useRef({})
  const initializedRef  = useRef(false)
  const messagesEndRef  = useRef(null)

  // Real-time conversation list + ding detection
  useEffect(() => {
    if (!user) return
    const unsub = subscribeToConversations(user.uid, (convs) => {
      let shouldDing = false
      convs.forEach((conv) => {
        const prev = prevConvsRef.current[conv.id] ?? 0
        const curr = conv.lastMessageAt?.toMillis?.() ?? 0
        if (initializedRef.current && curr > prev && conv.lastMessageBy !== user.uid) {
          shouldDing = true
        }
        prevConvsRef.current[conv.id] = curr
      })
      initializedRef.current = true
      if (shouldDing) playDing()
      setConversations(convs)
    })
    return unsub
  }, [user])

  // Messages for the active conversation
  useEffect(() => {
    if (!activeConvId) { setMessages([]); return }
    const unsub = subscribeToMessages(activeConvId, setMessages)
    return unsub
  }, [activeConvId])

  // Mark read when opening a conversation
  useEffect(() => {
    if (activeConvId && user?.uid) markConversationRead(activeConvId, user.uid)
  }, [activeConvId, user?.uid])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!user) return null

  const unreadCount = conversations.filter((conv) => {
    const lastMsg  = conv.lastMessageAt?.toMillis?.() ?? 0
    const lastRead = conv.readBy?.[user.uid]?.toMillis?.() ?? 0
    return lastMsg > lastRead && conv.lastMessageBy !== user.uid
  }).length

  const handleSend = async (e) => {
    e.preventDefault()
    if (!text.trim() || sending) return
    const t = text.trim()
    setText('')
    setSending(true)
    await sendMessage(activeConvId, {
      senderId: user.uid,
      senderName: userDoc?.name ?? 'Me',
      text: t,
    })
    setSending(false)
  }

  const activeConv = conversations.find((c) => c.id === activeConvId)
  const otherName  = activeConv
    ? (user.uid === activeConv.consumerId ? activeConv.providerName : activeConv.consumerName)
    : ''

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">

      {/* ── Panel ── */}
      {open && (
        <div
          className="w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
          style={{ height: 500 }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b border-white/20 flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #ff5a5f, #c93338)' }}
          >
            {activeConv ? (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <button
                  onClick={() => setActiveConvId(null)}
                  className="text-white/80 hover:text-white text-lg font-bold flex-shrink-0 transition-colors leading-none"
                >
                  ←
                </button>
                <div className="min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{otherName || 'Chat'}</p>
                  {activeConv.serviceTitle && (
                    <p className="text-white/70 text-xs truncate">{activeConv.serviceTitle}</p>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <p className="text-white font-bold text-sm">Messages</p>
                {unreadCount > 0 && (
                  <p className="text-white/70 text-xs">{unreadCount} unread</p>
                )}
              </div>
            )}
            <button
              onClick={() => { setOpen(false); setActiveConvId(null) }}
              className="text-white/70 hover:text-white w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors flex-shrink-0 ml-2 text-xl leading-none"
            >
              ×
            </button>
          </div>

          {activeConv ? (
            /* ── Chat view ── */
            <>
              <div className="flex-1 overflow-y-auto px-3 py-3 bg-gray-50 space-y-1">
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center text-gray-400">
                    <p className="text-2xl mb-1">👋</p>
                    <p className="text-xs font-medium">Start the conversation</p>
                    {activeConv.serviceTitle && (
                      <p className="text-xs mt-0.5 text-primary-500">Re: {activeConv.serviceTitle}</p>
                    )}
                  </div>
                )}
                {messages.map((msg) => {
                  const isMe = msg.senderId === user.uid
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} pt-0.5`}>
                      <div
                        className={`px-3 py-2 rounded-2xl text-sm max-w-[82%] break-words leading-relaxed ${
                          isMe
                            ? 'text-white rounded-br-sm shadow-sm'
                            : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm'
                        }`}
                        style={isMe ? { background: 'linear-gradient(135deg, #ff5a5f, #c93338)' } : {}}
                      >
                        {msg.text}
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>
              <form
                onSubmit={handleSend}
                className="flex gap-2 px-3 py-2.5 border-t border-gray-100 bg-white flex-shrink-0"
              >
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type a message…"
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition min-w-0"
                />
                <button
                  type="submit"
                  disabled={!text.trim() || sending}
                  className="bg-primary-600 hover:bg-primary-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-40 flex-shrink-0 shadow-sm"
                >
                  Send
                </button>
              </form>
            </>
          ) : (
            /* ── Conversation list ── */
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-6 text-gray-400">
                  <p className="text-3xl mb-2">💬</p>
                  <p className="text-sm font-medium text-gray-500">No conversations yet</p>
                  <p className="text-xs mt-1 leading-relaxed">
                    Open a service listing and tap "Message Provider" to start chatting
                  </p>
                </div>
              ) : (
                conversations.map((conv) => {
                  const isConsumer = user.uid === conv.consumerId
                  const name    = isConsumer ? conv.providerName : conv.consumerName
                  const initials = name?.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() ?? '?'
                  const lastMsg  = conv.lastMessageAt?.toMillis?.() ?? 0
                  const lastRead = conv.readBy?.[user.uid]?.toMillis?.() ?? 0
                  const isUnread = lastMsg > lastRead && conv.lastMessageBy !== user.uid

                  return (
                    <button
                      key={conv.id}
                      onClick={() => setActiveConvId(conv.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0 ${
                        isUnread ? 'bg-primary-50/40' : ''
                      }`}
                    >
                      <div className="relative flex-shrink-0">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs"
                          style={{ background: 'linear-gradient(135deg, #ff5a5f, #c93338)' }}
                        >
                          {initials}
                        </div>
                        {isUnread && (
                          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <p className={`text-sm truncate ${isUnread ? 'font-bold text-gray-900' : 'font-medium text-gray-800'}`}>
                            {name || 'User'}
                          </p>
                          <p className="text-xs text-gray-400 flex-shrink-0">{timeAgo(conv.lastMessageAt)}</p>
                        </div>
                        {conv.serviceTitle && (
                          <p className="text-xs text-primary-600 truncate mb-0.5">{conv.serviceTitle}</p>
                        )}
                        <p className={`text-xs truncate ${isUnread ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                          {conv.lastMessage || 'Start the conversation…'}
                        </p>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Floating button ── */}
      <button
        onClick={() => { setOpen((o) => !o); if (open) setActiveConvId(null) }}
        className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-transform relative"
        style={{ background: 'linear-gradient(135deg, #ff5a5f, #c93338)' }}
        aria-label={open ? 'Close messages' : 'Open messages'}
      >
        <span className="text-2xl select-none">{open ? '✕' : '💬'}</span>
        {!open && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-sm border-2 border-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  )
}
