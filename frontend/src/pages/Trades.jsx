import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { rarityText } from '../utils/rarity'
import { cn } from '../utils/cn'
import { ALL_CHARACTERS } from '../utils/characters'
import PageWrapper from '../components/PageWrapper'

// ── Item selector ─────────────────────────────────────────────────────────────

function ItemSelector({ label, characters, items, onAdd, onRemove }) {
  const [charName, setCharName] = useState('')
  const [count,    setCount]    = useState(1)

  function handleAdd() {
    if (!charName) return
    onAdd({ character_name: charName, count: Math.max(1, Number(count)) })
    setCharName('')
    setCount(1)
  }

  return (
    <div>
      <label className="block text-sm text-gray-400 mb-2">{label}</label>
      <div className="flex gap-2 mb-2">
        <select
          value={charName}
          onChange={e => setCharName(e.target.value)}
          className="flex-1 min-w-0 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
        >
          <option value="">Select character...</option>
          {characters.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input
          type="number"
          min={1} max={999}
          value={count}
          onChange={e => setCount(e.target.value)}
          className="w-20 shrink-0 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!charName}
          className="shrink-0 px-3 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 text-white text-sm rounded-lg transition-colors"
        >
          Add
        </button>
      </div>
      <AnimatePresence>
        {items.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-1 overflow-hidden"
          >
            {items.map((item, i) => (
              <motion.button
                key={i}
                type="button"
                onClick={() => onRemove(i)}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileHover={{ scale: 1.05 }}
                className="text-xs px-2 py-1 bg-zinc-800 hover:bg-red-900/50 border border-zinc-700 hover:border-red-700 rounded text-gray-300 transition-colors"
              >
                {item.character_name} ×{item.count} ×
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Trade card ────────────────────────────────────────────────────────────────

function TradeItems({ items, type }) {
  const filtered = items.filter(i => i.type === type)
  if (!filtered.length) return <span className="text-gray-700 text-sm">—</span>
  return (
    <div className="flex flex-wrap gap-1">
      {filtered.map((item, i) => (
        <span key={i} className={cn('text-xs px-2 py-1 bg-zinc-800 rounded border border-zinc-700', rarityText(item.rarity))}>
          {item.character_name} ×{item.count}
        </span>
      ))}
    </div>
  )
}

function TradeCard({ trade, username, onRefresh, index }) {
  const [acting,   setActing]   = useState(false)
  const isReceiver = trade.receiver_username === username
  const isSender   = trade.sender_username   === username

  async function doAction(fn) {
    setActing(true)
    try { await fn(); onRefresh() }
    finally { setActing(false) }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 220, damping: 24, delay: index * 0.05 }}
      className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="text-sm">
          <span className="text-white font-medium">{trade.sender_username}</span>
          <span className="text-gray-600 mx-1">→</span>
          <span className="text-white font-medium">{trade.receiver_username}</span>
          {isReceiver && <span className="ml-2 text-xs text-purple-400 font-medium">(incoming)</span>}
          {isSender   && <span className="ml-2 text-xs text-gray-600 font-medium">(sent)</span>}
        </div>
        <span className="text-xs text-gray-700 shrink-0 ml-3">
          {new Date(trade.created_at).toLocaleDateString()}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-xs text-gray-600 mb-1.5">Offering</div>
          <TradeItems items={trade.items} type="offered" />
        </div>
        <div>
          <div className="text-xs text-gray-600 mb-1.5">Requesting</div>
          <TradeItems items={trade.items} type="requested" />
        </div>
      </div>

      <div className="flex gap-2">
        {isReceiver && (
          <>
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={() => doAction(() => api.acceptTrade(trade.id))}
              disabled={acting}
              className="px-4 py-1.5 bg-green-800 hover:bg-green-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
            >
              Accept
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={() => doAction(() => api.declineTrade(trade.id))}
              disabled={acting}
              className="px-4 py-1.5 bg-red-900 hover:bg-red-800 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
            >
              Decline
            </motion.button>
          </>
        )}
        {isSender && (
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => doAction(() => api.cancelTrade(trade.id))}
            disabled={acting}
            className="px-4 py-1.5 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
          >
            Cancel
          </motion.button>
        )}
      </div>
    </motion.div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Trades() {
  const [trades,     setTrades]     = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showForm,   setShowForm]   = useState(false)
  const [inventory,  setInventory]  = useState([])
  const [receiver,   setReceiver]   = useState('')
  const [offered,    setOffered]    = useState([])
  const [requested,  setRequested]  = useState([])
  const [submitting, setSubmitting] = useState(false)
  const { username } = useAuth()
  const { addToast } = useToast()

  const loadTrades = useCallback(() =>
    api.listTrades()
      .then(setTrades)
      .catch(err => addToast(err.message, 'error'))
  , []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadTrades().finally(() => setLoading(false))
  }, [loadTrades])

  async function handleToggleForm() {
    if (!showForm) {
      const inv = await api.myInventory().catch(() => ({ items: [] }))
      setInventory(inv.items ?? [])
    }
    setShowForm(v => !v)
  }

  function resetForm() {
    setReceiver(''); setOffered([]); setRequested([]); setShowForm(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (offered.length === 0 && requested.length === 0) {
      addToast('Add at least one item to the trade', 'error')
      return
    }
    setSubmitting(true)
    try {
      await api.createTrade({ receiver_username: receiver, offered, requested })
      addToast('Trade sent!', 'success')
      resetForm()
      await loadTrades()
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const inventoryNames = inventory.map(i => i.character_name)

  return (
    <PageWrapper>
      <div className="flex justify-between items-center mb-6">
        <motion.h1
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-purple-400"
        >
          Trades
        </motion.h1>
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={handleToggleForm}
          className={cn(
            'px-4 py-2 text-sm rounded-lg font-medium transition-colors',
            showForm
              ? 'bg-zinc-700 hover:bg-zinc-600 text-gray-300'
              : 'bg-gradient-to-r from-purple-700 to-violet-600 hover:from-purple-600 hover:to-violet-500 text-white',
          )}
        >
          {showForm ? 'Cancel' : '+ New Trade'}
        </motion.button>
      </div>

      {/* Create trade form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, height: 0, y: -12 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -12 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6 flex flex-col gap-5 overflow-hidden"
          >
            <h2 className="font-semibold text-white">New Trade</h2>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Send to</label>
              <input
                type="text"
                value={receiver}
                onChange={e => setReceiver(e.target.value)}
                required
                placeholder="Username"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            <ItemSelector
              label="You Offer (from your inventory)"
              characters={inventoryNames.length ? inventoryNames : ALL_CHARACTERS}
              items={offered}
              onAdd={item => setOffered(prev => [...prev, item])}
              onRemove={i => setOffered(prev => prev.filter((_, idx) => idx !== i))}
            />

            <ItemSelector
              label="You Request"
              characters={ALL_CHARACTERS}
              items={requested}
              onAdd={item => setRequested(prev => [...prev, item])}
              onRemove={i => setRequested(prev => prev.filter((_, idx) => idx !== i))}
            />

            <motion.button
              type="submit"
              disabled={submitting}
              whileHover={!submitting ? { scale: 1.02 } : {}}
              whileTap={!submitting  ? { scale: 0.97 } : {}}
              className="w-full bg-gradient-to-r from-purple-700 to-violet-600 hover:from-purple-600 hover:to-violet-500 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium transition-all"
            >
              {submitting ? 'Sending...' : 'Send Trade'}
            </motion.button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Trade list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-7 h-7 border-2 border-purple-500 border-t-transparent rounded-full"
          />
        </div>
      ) : !trades.length ? (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-gray-600 py-16"
        >
          No pending trades.
        </motion.p>
      ) : (
        <AnimatePresence>
          <div className="flex flex-col gap-3">
            {trades.map((trade, i) => (
              <TradeCard
                key={trade.id}
                trade={trade}
                username={username}
                onRefresh={loadTrades}
                index={i}
              />
            ))}
          </div>
        </AnimatePresence>
      )}
    </PageWrapper>
  )
}
