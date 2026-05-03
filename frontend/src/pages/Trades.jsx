import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { rarityHex } from '../utils/rarity'
import { CHAR_MAP } from '../utils/gameData'
import { cn } from '../utils/cn'
import { summarizeItems, STATUS_LABEL, STATUS_COLOR } from '../utils/tradeFormat'
import PageWrapper from '../components/PageWrapper'

const ACCENT          = '#f59e42'
const NEUTRAL_BORDER  = '#3d3e4a'

const TABS = [
  { key: 'received', label: 'Received' },
  { key: 'sent',     label: 'Sent' },
  { key: 'history',  label: 'History' },
]

function TradeRow({ trade, currentUsername, onCancel, cancelling }) {
  const isReceiver = trade.receiver_username === currentUsername
  const otherUser  = isReceiver ? trade.sender_username : trade.receiver_username
  const offered    = trade.items.filter(i => i.type === 'offered')
  const requested  = trade.items.filter(i => i.type === 'requested')

  // Show up to 4 thumbnails on the row — enough to convey the trade
  // without overwhelming the layout.
  const thumbs = (isReceiver ? offered : offered).slice(0, 4)

  return (
    <Link
      to={`/trades/${trade.id}`}
      className="block bg-card rounded-xl p-4 transition-all hover:-translate-y-0.5"
      style={{ border: `2px solid ${NEUTRAL_BORDER}` }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-base shrink-0"
            style={{ backgroundColor: ACCENT, color: '#1a1b23', fontWeight: 800 }}
          >
            {otherUser?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0">
            <div className="text-text-primary truncate" style={{ fontWeight: 700 }}>
              {isReceiver ? 'From ' : 'To '}
              <span className="text-accent">{otherUser}</span>
            </div>
            <div className="text-text-muted text-xs mt-0.5">
              {new Date(trade.created_at).toLocaleString([], {
                dateStyle: 'medium', timeStyle: 'short',
              })}
            </div>
          </div>
        </div>

        <span
          className="text-[10px] uppercase px-2 py-0.5 rounded shrink-0"
          style={{
            color: STATUS_COLOR[trade.status],
            border: `1.5px solid ${STATUS_COLOR[trade.status]}`,
            fontWeight: 800,
            letterSpacing: '0.5px',
          }}
        >
          {STATUS_LABEL[trade.status] ?? trade.status}
        </span>
      </div>

      {/* Thumbnail strip: shows the offered side as art, plus a textual summary */}
      <div className="flex items-center gap-2 mb-2">
        {thumbs.map((item, i) => {
          const img = CHAR_MAP[item.character_name]?.image
          const color = rarityHex(item.rarity)
          return (
            <div
              key={i}
              className="w-9 h-9 rounded bg-surface flex items-center justify-center shrink-0"
              style={{ border: `2px solid ${color}` }}
              title={`${item.character_name} ×${item.count}`}
            >
              {img ? (
                <img src={img} alt="" className="w-7 h-7 object-contain" />
              ) : (
                <span className="text-[10px]" style={{ color, fontWeight: 800 }}>
                  {item.character_name[0]}
                </span>
              )}
            </div>
          )
        })}
        {offered.length > thumbs.length && (
          <span className="text-text-muted text-xs">+{offered.length - thumbs.length}</span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div>
          <span
            className="uppercase mr-1"
            style={{ color: '#22c55e', fontWeight: 700, letterSpacing: '0.5px' }}
          >
            Offering:
          </span>
          <span className="text-text-secondary">
            {summarizeItems(trade.items, 'offered')}
          </span>
        </div>
        <div>
          <span
            className="uppercase mr-1"
            style={{ color: ACCENT, fontWeight: 700, letterSpacing: '0.5px' }}
          >
            Requesting:
          </span>
          <span className="text-text-secondary">
            {summarizeItems(trade.items, 'requested')}
          </span>
        </div>
      </div>

      {trade.status === 'pending' && !isReceiver && onCancel && (
        <div className="flex justify-end mt-3">
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onCancel(trade.id)
            }}
            disabled={cancelling}
            className="text-xs px-3 py-1 rounded-lg transition-all disabled:opacity-50"
            style={{
              background: 'transparent',
              border: '1.5px solid #ef4444',
              color: '#ef4444',
              fontWeight: 700,
            }}
          >
            {cancelling ? 'Cancelling…' : 'Cancel Trade'}
          </button>
        </div>
      )}
    </Link>
  )
}

function EmptyState({ tab }) {
  const messages = {
    received: { emoji: '📭', text: 'No incoming trades. When someone sends you an offer, it shows up here.' },
    sent:     { emoji: '📤', text: "You haven't sent any trades yet. Hit New Trade to start one." },
    history:  { emoji: '🗄️', text: 'No completed trades yet.' },
  }
  const m = messages[tab] ?? messages.received
  return (
    <div className="text-center py-16">
      <div className="text-5xl mb-3" aria-hidden="true">{m.emoji}</div>
      <p className="text-text-muted">{m.text}</p>
    </div>
  )
}

export default function Trades() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = TABS.find(t => t.key === searchParams.get('tab'))?.key ?? 'received'

  const [tab,        setTab]        = useState(initialTab)
  const [trades,     setTrades]     = useState([])
  const [counts,     setCounts]     = useState({ received: 0, sent: 0, history: 0 })
  const [loading,    setLoading]    = useState(true)
  const [cancelling, setCancelling] = useState(null)

  const { username } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()

  const loadTab = useCallback(async (which) => {
    setLoading(true)
    try {
      const data = await api.listTrades(which)
      setTrades(Array.isArray(data) ? data : [])
    } catch (err) {
      addToast(err.message, 'error')
      setTrades([])
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh per-tab counts so the badges in the tab bar are accurate.
  // One light request per tab — totals only.
  const refreshCounts = useCallback(async () => {
    try {
      const [received, sent, history] = await Promise.all([
        api.listTrades('received'),
        api.listTrades('sent'),
        api.listTrades('history'),
      ])
      setCounts({
        received: received.length,
        sent:     sent.length,
        history:  history.length,
      })
    } catch {
      /* noop — leave previous counts visible */
    }
  }, [])

  useEffect(() => {
    loadTab(tab)
    refreshCounts()
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('tab', tab)
      return next
    }, { replace: true })
  }, [tab, loadTab, refreshCounts, setSearchParams])

  async function handleCancel(id) {
    setCancelling(id)
    try {
      await api.cancelTrade(id)
      addToast('Trade cancelled', 'success')
      await loadTab(tab)
      refreshCounts()
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setCancelling(null)
    }
  }

  return (
    <PageWrapper>
      <div className="flex justify-between items-center mb-6">
        <motion.h1
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl text-text-primary"
          style={{ fontWeight: 800 }}
        >
          Trades
        </motion.h1>
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate('/trades/new')}
          className="px-4 py-2 text-sm rounded-lg transition-all"
          style={{ backgroundColor: ACCENT, color: '#1a1b23', fontWeight: 800 }}
        >
          + New Trade
        </motion.button>
      </div>

      {/* Tabs with count badges + orange underline */}
      <LayoutGroup>
        <div
          className="flex gap-1 mb-6 overflow-x-auto md:flex-wrap pb-1 -mx-3 px-3 sm:mx-0 sm:px-0"
          style={{ borderBottom: `1px solid ${NEUTRAL_BORDER}` }}
        >
          {TABS.map(t => {
            const active = tab === t.key
            const count  = counts[t.key]
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="relative shrink-0 px-3 sm:px-4 py-2.5 text-sm transition-colors whitespace-nowrap flex items-center gap-2"
                style={{
                  color: active ? ACCENT : '#8b8b98',
                  fontWeight: active ? 700 : 500,
                }}
              >
                <span className="relative z-10">{t.label}</span>
                <span
                  className="text-[11px] px-1.5 py-0.5 rounded tabular-nums"
                  style={{
                    backgroundColor: active ? ACCENT : '#2d2e3a',
                    color: active ? '#1a1b23' : '#8b8b98',
                    fontWeight: 800,
                    minWidth: 20,
                    textAlign: 'center',
                  }}
                >
                  {count}
                </span>
                {active && (
                  <motion.div
                    layoutId="trades-tab-underline"
                    className="absolute left-0 right-0 -bottom-px h-[2px]"
                    style={{ backgroundColor: ACCENT }}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </LayoutGroup>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex justify-center py-16"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-7 h-7 border-2 rounded-full"
              style={{ borderColor: ACCENT, borderTopColor: 'transparent' }}
            />
          </motion.div>
        ) : trades.length === 0 ? (
          <motion.div
            key={`empty-${tab}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <EmptyState tab={tab} />
          </motion.div>
        ) : (
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className={cn('flex flex-col gap-3')}
          >
            {trades.map(t => (
              <TradeRow
                key={t.id}
                trade={t}
                currentUsername={username}
                onCancel={tab === 'sent' ? handleCancel : null}
                cancelling={cancelling === t.id}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </PageWrapper>
  )
}
