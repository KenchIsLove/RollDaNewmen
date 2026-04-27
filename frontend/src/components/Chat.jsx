import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { cn } from '../utils/cn'

const HTTP_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'
const WS_BASE   = import.meta.env.VITE_WS_BASE  || 'ws://localhost:8000'
const MAX_LEN   = 240

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

export default function Chat() {
  const { token, username } = useAuth()
  const [messages,  setMessages]  = useState([])
  const [text,      setText]      = useState('')
  const [connected, setConnected] = useState(false)
  const [error,     setError]     = useState(null)

  const wsRef     = useRef(null)
  const scrollRef = useRef(null)

  useEffect(() => {
    fetch(`${HTTP_BASE}/chat/history`)
      .then(r => r.ok ? r.json() : [])
      .then(h => setMessages(Array.isArray(h) ? h : []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!token) return
    const ws = new WebSocket(`${WS_BASE}/ws/chat?token=${encodeURIComponent(token)}`)
    wsRef.current = ws

    ws.onopen    = () => setConnected(true)
    ws.onclose   = () => setConnected(false)
    ws.onerror   = () => setConnected(false)
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data)
        if (data.error) {
          setError(data.error)
          setTimeout(() => setError(null), 1500)
          return
        }
        setMessages(prev => [...prev.slice(-99), data])
      } catch {}
    }

    return () => {
      try { ws.close() } catch {}
    }
  }, [token])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  function handleSend(e) {
    e.preventDefault()
    const trimmed = text.trim().slice(0, MAX_LEN)
    if (!trimmed || !connected) return
    try {
      wsRef.current.send(JSON.stringify({ text: trimmed }))
      setText('')
    } catch {
      setConnected(false)
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex flex-col h-[520px]">
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Chat</h3>
        <span className={cn('text-[10px]', connected ? 'text-green-500' : 'text-gray-600')}>
          {connected ? '● live' : '○ offline'}
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto flex flex-col gap-1.5 pr-1">
        {messages.length === 0 ? (
          <p className="text-gray-600 text-xs text-center py-3">No messages yet — say hi!</p>
        ) : (
          messages.map((m, i) => {
            const mine = m.username === username
            return (
              <div
                key={i}
                className={cn(
                  'text-xs leading-snug px-2 py-1 rounded-lg break-words',
                  mine ? 'bg-purple-600/15 border border-purple-600/30' : 'bg-zinc-800/60',
                )}
              >
                <div className="flex items-baseline justify-between gap-2 mb-0.5">
                  <span className={cn('font-semibold', mine ? 'text-purple-300' : 'text-gray-300')}>
                    {m.username}
                  </span>
                  <span className="text-[9px] text-gray-600 tabular-nums">{formatTime(m.timestamp)}</span>
                </div>
                <span className="text-gray-200">{m.text}</span>
              </div>
            )
          })
        )}
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-[10px] text-red-400 text-center mt-1"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSend} className="flex gap-1.5 mt-2">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          maxLength={MAX_LEN}
          disabled={!connected}
          placeholder={connected ? 'Send a message…' : 'Connecting…'}
          className="flex-1 min-w-0 bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!connected || !text.trim()}
          className="shrink-0 px-2.5 py-1.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs rounded-lg transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  )
}
