import { useState, useEffect, useRef } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { asset } from '../lib/asset'
import { subscribeToMessages, sendMessage, markConversationRead } from '../lib/conversations'

function formatTime(ts) {
  if (!ts?.toDate) return ''
  return ts.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDay(ts) {
  if (!ts?.toDate) return ''
  const d = ts.toDate()
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function Chat() {
  const { conversationId } = useParams()
  const { user, userDoc } = useAuth()
  const navigate = useNavigate()

  const [conversation, setConversation] = useState(null)
  const [messages, setMessages]         = useState([])
  const [text, setText]                 = useState('')
  const [sending, setSending]           = useState(false)
  const [loading, setLoading]           = useState(true)
  const bottomRef = useRef(null)

  useEffect(() => {
    getDoc(doc(db, 'conversations', conversationId)).then((snap) => {
      if (snap.exists()) {
        setConversation({ id: snap.id, ...snap.data() })
        if (user?.uid) markConversationRead(conversationId, user.uid)
      }
      setLoading(false)
    })
  }, [conversationId, user?.uid])

  useEffect(() => {
    const unsub = subscribeToMessages(conversationId, (msgs) => {
      setMessages(msgs)
      // Mark read whenever new messages arrive while this chat is open
      if (user?.uid) markConversationRead(conversationId, user.uid)
    })
    return unsub
  }, [conversationId, user?.uid])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!text.trim() || sending) return
    const t = text.trim()
    setText('')
    setSending(true)
    await sendMessage(conversationId, {
      senderId: user.uid,
      senderName: userDoc?.name ?? 'Me',
      text: t,
    })
    setSending(false)
  }

  const otherName = conversation
    ? (user?.uid === conversation.consumerId ? conversation.providerName : conversation.consumerName)
    : '…'

  // Group messages by day for date separators
  const grouped = []
  let lastDay = null
  for (const msg of messages) {
    const day = msg.createdAt ? formatDay(msg.createdAt) : null
    if (day && day !== lastDay) {
      grouped.push({ type: 'separator', day, id: `sep_${day}` })
      lastDay = day
    }
    grouped.push({ type: 'message', ...msg })
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <nav className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-40 shadow-sm">
        <button
          onClick={() => navigate('/inbox')}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 hover:text-primary-600 transition-colors flex-shrink-0"
        >
          ←
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm leading-tight truncate">
            {loading ? '…' : (otherName || 'Chat')}
          </p>
          {conversation?.serviceTitle && (
            <p className="text-xs text-primary-600 truncate">{conversation.serviceTitle}</p>
          )}
        </div>
        <Link to="/" className="flex-shrink-0">
          <img src={asset('logo-dark.png')} alt="Surama.net" className="h-8 w-auto" />
        </Link>
      </nav>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-2xl mx-auto space-y-1">
          {loading && (
            <div className="flex justify-center py-16">
              <div className="w-6 h-6 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && messages.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <p className="text-3xl mb-2">👋</p>
              <p className="text-sm font-medium">Start the conversation</p>
              {conversation?.serviceTitle && (
                <p className="text-xs mt-1 text-primary-500">Re: {conversation.serviceTitle}</p>
              )}
            </div>
          )}

          {grouped.map((item) => {
            if (item.type === 'separator') {
              return (
                <div key={item.id} className="flex items-center gap-3 py-3">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400 font-medium">{item.day}</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
              )
            }

            const isMe = item.senderId === user?.uid
            return (
              <div key={item.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} pt-1`}>
                <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && (
                    <p className="text-xs text-gray-400 mb-1 ml-1">{item.senderName}</p>
                  )}
                  <div
                    className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
                      isMe
                        ? 'text-white rounded-br-sm shadow-sm'
                        : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm'
                    }`}
                    style={isMe ? { background: 'linear-gradient(135deg, #ff5a5f, #c93338)' } : {}}
                  >
                    {item.text}
                  </div>
                  <p className="text-xs text-gray-400 mt-1 mx-1">{formatTime(item.createdAt)}</p>
                </div>
              </div>
            )
          })}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input bar */}
      <div className="bg-white border-t border-gray-100 px-4 py-3">
        <form onSubmit={handleSend} className="max-w-2xl mx-auto flex gap-3 items-center">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Message ${otherName || '…'}`}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 flex-shrink-0 shadow-sm"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}
