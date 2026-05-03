import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { rarityHex } from '../utils/rarity'
import { CHAR_MAP } from '../utils/gameData'
import { STATUS_LABEL, STATUS_COLOR } from '../utils/tradeFormat'
import PageWrapper from '../components/PageWrapper'

const ACCENT         = '#f59e42'
const NEUTRAL_BORDER = '#3d3e4a'
const ACCEPT_GREEN   = '#22c55e'
const DANGER_RED     = '#ef4444'

function ItemPanel({ title, titleColor, items }) {
  return (
    <div
      className="bg-card rounded-xl p-4 flex-1"
      style={{ border: `2px solid ${NEUTRAL_BORDER}` }}
    >
      <h3
        className="uppercase mb-3"
        style={{
          color: titleColor,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '1px',
        }}
      >
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-text-muted text-xs text-center py-4">Nothing on this side.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {items.map((item, i) => {
            // Prefer the frontend's CHAR_MAP image (knows about null art);
            // fall back to the backend-supplied path if we ever ship a
            // character the frontend hasn't seen yet.
            const img   = CHAR_MAP[item.character_name]?.image ?? item.image
            const color = rarityHex(item.rarity)
            return (
              <div
                key={i}
                className="rounded-lg p-2 flex flex-col items-center text-center"
                style={{
                  backgroundColor: '#1c1d27',
                  border: `2.5px solid ${color}`,
                }}
              >
                {item.count > 1 && (
                  <div
                    className="self-end px-1.5 py-0.5 rounded text-[10px] -mt-1"
                    style={{ backgroundColor: ACCENT, color: '#1a1b23', fontWeight: 800 }}
                  >
                    ×{item.count}
                  </div>
                )}
                <div className="h-[64px] flex items-center justify-center mt-1 mb-1">
                  {img ? (
                    <img src={img} alt="" className="max-h-[64px] object-contain" />
                  ) : (
                    <span className="text-3xl" style={{ color, fontWeight: 800 }}>
                      {item.character_name[0]}
                    </span>
                  )}
                </div>
                <div
                  className="text-[12px] truncate w-full text-text-primary leading-tight"
                  style={{ fontWeight: 700 }}
                >
                  {item.character_name}
                </div>
                <div
                  className="text-[9px] uppercase mt-0.5"
                  style={{ color, fontWeight: 800, letterSpacing: '0.5px' }}
                >
                  {item.rarity}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ConfirmDialog({ open, onCancel, onConfirm, busy }) {
  if (!open) return null
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-card rounded-xl p-6 max-w-sm w-full"
        style={{ border: `2px solid ${NEUTRAL_BORDER}` }}
      >
        <h3
          className="text-lg text-text-primary mb-2"
          style={{ fontWeight: 800 }}
        >
          Accept this trade?
        </h3>
        <p className="text-text-secondary text-sm mb-5">
          This will transfer the items between both accounts immediately. This cannot be undone.
        </p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 text-sm rounded-lg transition-all"
            style={{
              background: 'transparent',
              border: '2px solid #3d3e4a',
              color: '#e4e4e7',
              fontWeight: 700,
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="px-5 py-2 text-sm rounded-lg transition-all disabled:opacity-50"
            style={{
              backgroundColor: ACCEPT_GREEN,
              color: '#1a1b23',
              fontWeight: 800,
            }}
          >
            {busy ? 'Accepting…' : 'Yes, Accept'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function TradeDetail() {
  const { id } = useParams()
  const { username } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()

  const [trade,    setTrade]    = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [acting,   setActing]   = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const data = await api.getTrade(id)
      setTrade(data)
      setError(null)
    } catch (err) {
      setTrade(null)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id]) // eslint-disable-line

  async function doAccept() {
    setActing(true)
    try {
      await api.acceptTrade(trade.id)
      addToast('Trade completed!', 'success')
      navigate('/trades?tab=history')
    } catch (err) {
      addToast(err.message, 'error')
      await load()
    } finally {
      setActing(false)
      setConfirmOpen(false)
    }
  }

  async function doDecline() {
    setActing(true)
    try {
      await api.declineTrade(trade.id)
      addToast('Trade declined', 'success')
      navigate('/trades?tab=history')
    } catch (err) {
      addToast(err.message, 'error')
      await load()
    } finally {
      setActing(false)
    }
  }

  async function doCancel() {
    setActing(true)
    try {
      await api.cancelTrade(trade.id)
      addToast('Trade cancelled', 'success')
      navigate('/trades?tab=history')
    } catch (err) {
      addToast(err.message, 'error')
      await load()
    } finally {
      setActing(false)
    }
  }

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex justify-center py-24">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-2 rounded-full"
            style={{ borderColor: ACCENT, borderTopColor: 'transparent' }}
          />
        </div>
      </PageWrapper>
    )
  }

  if (error || !trade) {
    return (
      <PageWrapper>
        <div className="text-center py-20">
          <p className="text-text-secondary text-lg mb-2">Trade not found</p>
          <p className="text-text-muted text-sm mb-6">{error || 'This trade does not exist or you cannot view it.'}</p>
          <Link
            to="/trades"
            className="inline-block px-4 py-2 rounded-lg text-sm transition-all"
            style={{ backgroundColor: ACCENT, color: '#1a1b23', fontWeight: 800 }}
          >
            Back to trades
          </Link>
        </div>
      </PageWrapper>
    )
  }

  const isReceiver = trade.receiver_username === username
  const isSender   = trade.sender_username   === username
  const otherUser  = isReceiver ? trade.sender_username : trade.receiver_username
  const isPending  = trade.status === 'pending'

  const offered   = trade.items.filter(i => i.type === 'offered')
  const requested = trade.items.filter(i => i.type === 'requested')

  return (
    <PageWrapper>
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Link
          to="/trades"
          className="text-text-muted hover:text-accent transition-colors text-sm"
        >
          ← Back
        </Link>
        <h1
          className="text-2xl text-text-primary"
          style={{ fontWeight: 800 }}
        >
          Trade with{' '}
          <Link to={`/profile/${otherUser}`} className="text-accent hover:underline">
            {otherUser}
          </Link>
        </h1>
        <span
          className="text-[10px] uppercase px-2 py-1 rounded ml-auto"
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

      <p className="text-text-muted text-xs mb-4">
        {new Date(trade.created_at).toLocaleString([], {
          dateStyle: 'medium', timeStyle: 'short',
        })}
      </p>

      <div className="flex flex-col lg:flex-row items-stretch gap-3 mb-6">
        <ItemPanel
          title={`${trade.sender_username} offers`}
          titleColor={ACCEPT_GREEN}
          items={offered}
        />
        <div className="flex items-center justify-center lg:px-2">
          <div
            className="text-2xl"
            aria-hidden="true"
            style={{ color: ACCENT, fontWeight: 800 }}
          >
            ↔
          </div>
        </div>
        <ItemPanel
          title={`${trade.sender_username} requests`}
          titleColor={ACCENT}
          items={requested}
        />
      </div>

      {/* Action buttons */}
      <div className="flex justify-end gap-2 flex-wrap">
        {isPending && isReceiver && (
          <>
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={doDecline}
              disabled={acting}
              className="px-5 py-2 text-sm rounded-lg transition-all disabled:opacity-50"
              style={{
                background: 'transparent',
                border: `2px solid ${DANGER_RED}`,
                color: DANGER_RED,
                fontWeight: 700,
              }}
            >
              Decline
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={() => setConfirmOpen(true)}
              disabled={acting}
              className="px-5 py-2 text-sm rounded-lg transition-all disabled:opacity-50"
              style={{
                backgroundColor: ACCEPT_GREEN,
                color: '#1a1b23',
                fontWeight: 800,
              }}
            >
              Accept Trade
            </motion.button>
          </>
        )}
        {isPending && isSender && (
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={doCancel}
            disabled={acting}
            className="px-5 py-2 text-sm rounded-lg transition-all disabled:opacity-50"
            style={{
              backgroundColor: DANGER_RED,
              color: '#ffffff',
              fontWeight: 700,
            }}
          >
            Cancel Trade
          </motion.button>
        )}
        {!isPending && (
          <span className="text-text-muted text-sm self-center">
            This trade is {STATUS_LABEL[trade.status]?.toLowerCase() ?? trade.status}.
          </span>
        )}
      </div>

      <AnimatePresence>
        {confirmOpen && (
          <ConfirmDialog
            open={confirmOpen}
            busy={acting}
            onCancel={() => setConfirmOpen(false)}
            onConfirm={doAccept}
          />
        )}
      </AnimatePresence>
    </PageWrapper>
  )
}
