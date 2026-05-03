import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { cn } from '../utils/cn'

const HTTP_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'
const WS_BASE   = import.meta.env.VITE_WS_BASE  || 'ws://localhost:8000'
const MAX_LEN   = 240

const USER_COLORS = [
  '#60a5fa', // blue
  '#4ade80', // green
  '#f87171', // red
  '#c084fc', // purple
  '#fb923c', // orange
  '#2dd4bf', // teal
]

function colorForUser(name) {
  if (!name) return USER_COLORS[0]
  let h = 0
  for (let i = 0; i < name.length; i++) {
    h = ((h << 5) - h + name.charCodeAt(i)) | 0
  }
  return USER_COLORS[Math.abs(h) % USER_COLORS.length]
}

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

export default function Chat({ mode = 'sidebar' }) {
  const { token, username } = useAuth()
  const [messages,  setMessages]  = useState([])
  const [text,      setText]      = useState('')
  const [connected, setConnected] = useState(false)
  const [error,     setError]     = useState(null)
  const [open,      setOpen]      = useState(false)
  const [hasUnseen, setHasUnseen] = useState(false)

  const wsRef     = useRef(null)
  const scrollRef = useRef(null)
  const openRef   = useRef(false)

  useEffect(() => { openRef.current = open }, [open])

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
        if (mode === 'drawer' && !openRef.current) setHasUnseen(true)
      } catch {}
    }

    return () => {
      try { ws.close() } catch {}
    }
  }, [token, mode])

  // Auto-scroll the message list when new messages arrive (sidebar always, drawer only when open).
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (mode === 'drawer' && !open) return
    el.scrollTop = el.scrollHeight
  }, [messages, open, mode])

  function toggleOpen() {
    setOpen(prev => {
      const next = !prev
      if (next) setHasUnseen(false)
      return next
    })
  }

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

  function MessageList() {
    return (
      <div ref={scrollRef} className="flex-1 overflow-y-auto flex flex-col gap-1.5 pr-1">
        {messages.length === 0 ? (
          <p className="text-text-muted text-xs text-center py-3">No messages yet — say hi!</p>
        ) : (
          messages.map((m, i) => {
            const mine        = m.username === username
            const userColor   = colorForUser(m.username)
            return (
              <div
                key={i}
                className="text-xs leading-snug px-2 py-1 break-words"
                style={mine
                  ? { backgroundColor: '#f59e4215', border: '1.5px solid #f59e4235', borderRadius: 8 }
                  : { backgroundColor: '#2d2e3a', borderRadius: 8 }
                }
              >
                <div className="flex items-baseline justify-between gap-2 mb-0.5">
                  {mine ? (
                    <span className="font-bold" style={{ color: '#f59e42' }}>{m.username}</span>
                  ) : (
                    <Link
                      to={`/profile/${m.username}`}
                      className="font-bold hover:underline transition-colors"
                      style={{ color: userColor }}
                    >
                      {m.username}
                    </Link>
                  )}
                  <span className="text-[9px] text-text-dim tabular-nums">{formatTime(m.timestamp)}</span>
                </div>
                <span className="text-text-secondary" style={{ fontWeight: 400 }}>{m.text}</span>
              </div>
            )
          })
        )}
      </div>
    )
  }

  function InputForm({ extraClass = '' }) {
    return (
      <form onSubmit={handleSend} className={cn('flex gap-1.5 mt-2', extraClass)}>
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          maxLength={MAX_LEN}
          disabled={!connected}
          placeholder={connected ? 'Send a message…' : 'Connecting…'}
          className="flex-1 min-w-0 bg-surface border-[1.5px] border-line rounded-lg px-2.5 py-1.5 text-xs text-text-primary placeholder-text-dim focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!connected || !text.trim()}
          className="shrink-0 px-3 py-1.5 bg-green-500 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed text-base text-xs rounded-lg transition-all"
          style={{ fontWeight: 700 }}
        >
          Send
        </button>
      </form>
    )
  }

  // ── Mobile bottom drawer ────────────────────────────────────────────────────
  if (mode === 'drawer') {
    return (
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-card shadow-2xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)', borderTop: '4px solid #22c55e' }}
      >
        <button
          type="button"
          onClick={toggleOpen}
          aria-expanded={open}
          aria-label={open ? 'Collapse chat' : 'Expand chat'}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface transition-colors"
        >
          <div className="flex items-center gap-2">
            <span
              className="text-[11px] uppercase"
              style={{ color: '#22c55e', fontWeight: 700, letterSpacing: '1px' }}
            >
              Chat
            </span>
            <span className={cn('w-1.5 h-1.5 rounded-full', connected ? 'bg-green-500' : 'bg-text-dim')} />
            {hasUnseen && !open && (
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            )}
          </div>
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-text-muted text-sm"
          >
            ▲
          </motion.span>
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="chat-body"
              initial={{ height: 0 }}
              animate={{ height: '70vh' }}
              exit={{ height: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="h-full flex flex-col px-3 pb-3 pt-2">
                <MessageList />
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
                <InputForm />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // ── Desktop sidebar (unchanged) ────────────────────────────────────────────
  return (
    <div
      className="bg-card rounded-xl p-3 flex flex-col h-[520px]"
      style={{ border: '2px solid #3d3e4a', borderTop: '4px solid #22c55e' }}
    >
      <div className="flex items-center justify-between mb-2 px-1">
        <h3
          className="text-[11px] uppercase"
          style={{ color: '#22c55e', fontWeight: 700, letterSpacing: '1px' }}
        >
          Chat
        </h3>
        <span className={cn('text-[10px]', connected ? 'text-green-500' : 'text-text-muted')}>
          {connected ? '● live' : '○ offline'}
        </span>
      </div>

      <MessageList />

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

      <InputForm />
    </div>
  )
}
