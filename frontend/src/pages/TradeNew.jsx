import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { rarityHex } from '../utils/rarity'
import { CHAR_MAP } from '../utils/gameData'
import { cn } from '../utils/cn'
import PageWrapper from '../components/PageWrapper'

const ACCENT         = '#f59e42'
const NEUTRAL_BORDER = '#3d3e4a'

const RARITY_RANK = {
  Common: 0, Unusual: 1, Uncommon: 2, Superior: 3,
  Rare: 4, Mystic: 5, Epic: 6, Ancient: 7,
  Legendary: 8, Divine: 9, Mythic: 10, Celestial: 11, Transcendent: 12,
  Ethereal: 13, Cosmic: 14, Omnipotent: 15, Singularity: 16,
}

const SORT_OPTIONS = [
  { value: 'rarest',   label: 'Rarest' },
  { value: 'name',     label: 'A–Z' },
  { value: 'quantity', label: 'Most Copies' },
]

function sortItems(items, sortBy) {
  const arr = [...items]
  arr.sort((a, b) => {
    switch (sortBy) {
      case 'name':     return a.character_name.localeCompare(b.character_name)
      case 'quantity': return b.count - a.count
      default:         return (RARITY_RANK[b.rarity] ?? 0) - (RARITY_RANK[a.rarity] ?? 0)
    }
  })
  return arr
}

// ── Step 1: pick a user ──────────────────────────────────────────────────────

function UserPicker({ onPick }) {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      return
    }
    setSearching(true)
    const handle = setTimeout(() => {
      api.searchPlayers(q, 12)
        .then(r => setResults(Array.isArray(r) ? r : []))
        .catch(() => setResults([]))
        .finally(() => setSearching(false))
    }, 220)
    return () => clearTimeout(handle)
  }, [query])

  // Suggestions: top players by rarity_score, used as a fallback so the
  // empty state doesn't make users feel like they have to know a name.
  const [suggestions, setSuggestions] = useState([])
  useEffect(() => {
    api.leaderboard('rarity_score', 8)
      .then(d => setSuggestions(d?.entries ?? []))
      .catch(() => {})
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2
          className="uppercase mb-2"
          style={{ color: ACCENT, fontSize: 11, fontWeight: 700, letterSpacing: '1px' }}
        >
          Step 1 · Pick a player
        </h2>
        <input
          type="text"
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search for a player by username…"
          className="w-full bg-surface border-[1.5px] border-line rounded-lg px-3 py-2.5 text-text-primary placeholder-text-dim focus:outline-none focus:border-accent transition-colors"
        />
      </div>

      {query.trim().length >= 2 ? (
        <div>
          <div
            className="uppercase mb-2"
            style={{ color: '#b4b4be', fontSize: 11, fontWeight: 700, letterSpacing: '1px' }}
          >
            {searching ? 'Searching…' : `Results (${results.length})`}
          </div>
          {results.length === 0 && !searching ? (
            <p className="text-text-muted text-sm">No players match.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {results.map(r => (
                <UserCard key={r.username} user={r} onPick={onPick} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <div
            className="uppercase mb-2"
            style={{ color: '#b4b4be', fontSize: 11, fontWeight: 700, letterSpacing: '1px' }}
          >
            Suggestions
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {suggestions.map(s => (
              <UserCard
                key={s.username}
                user={{ username: s.username, rarity_score: s.value }}
                onPick={onPick}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function UserCard({ user, onPick }) {
  return (
    <button
      type="button"
      onClick={() => onPick(user.username)}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-card transition-all hover:-translate-y-0.5 text-left"
      style={{ border: `2px solid ${NEUTRAL_BORDER}` }}
    >
      {user.avatar_url ? (
        <img src={user.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
      ) : (
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-sm shrink-0"
          style={{ backgroundColor: ACCENT, color: '#1a1b23', fontWeight: 800 }}
        >
          {user.username[0].toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-text-primary truncate" style={{ fontWeight: 700 }}>
          {user.username}
        </div>
        {user.rarity_score != null && (
          <div className="text-text-muted text-[11px] tabular-nums">
            score {Number(user.rarity_score).toLocaleString()}
          </div>
        )}
      </div>
      <span
        className="text-xs uppercase shrink-0"
        style={{ color: ACCENT, fontWeight: 700, letterSpacing: '0.5px' }}
      >
        Pick →
      </span>
    </button>
  )
}

// ── Step 2: build the trade ──────────────────────────────────────────────────

function InventoryGrid({
  title,
  titleColor,
  items,
  loading,
  emptyMessage,
  selected,           // Map<character_name, count>
  ownedCounts,        // Map<character_name, total owned>
  onAdd,
  onRemove,
}) {
  const [sortBy, setSortBy] = useState('rarest')
  const [filter, setFilter] = useState('')

  const display = useMemo(() => {
    let arr = sortItems(items, sortBy)
    const q = filter.trim().toLowerCase()
    if (q) arr = arr.filter(i => i.character_name.toLowerCase().includes(q))
    return arr
  }, [items, sortBy, filter])

  return (
    <div
      className="bg-card rounded-xl flex flex-col"
      style={{ border: `2px solid ${NEUTRAL_BORDER}` }}
    >
      <div className="px-4 pt-4 pb-3 flex items-center justify-between gap-2 flex-wrap">
        <h3
          className="uppercase"
          style={{
            color: titleColor,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '1px',
          }}
        >
          {title}
        </h3>
        <div className="flex items-center gap-1.5">
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSortBy(opt.value)}
              className="text-[11px] px-2 py-1 rounded transition-all"
              style={
                sortBy === opt.value
                  ? { backgroundColor: ACCENT, color: '#1a1b23', fontWeight: 800 }
                  : { background: 'transparent', border: '1.5px solid #3d3e4a', color: '#8b8b98' }
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-3">
        <input
          type="text"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter characters…"
          className="w-full bg-surface border-[1.5px] border-line rounded-lg px-2.5 py-1.5 text-xs text-text-primary placeholder-text-dim focus:outline-none focus:border-accent transition-colors"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3" style={{ maxHeight: 460 }}>
        {loading ? (
          <div className="flex justify-center py-10">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-6 h-6 border-2 rounded-full"
              style={{ borderColor: ACCENT, borderTopColor: 'transparent' }}
            />
          </div>
        ) : display.length === 0 ? (
          <p className="text-text-muted text-xs text-center py-10">
            {filter.trim() ? 'No matches.' : emptyMessage}
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {display.map(item => {
              const owned    = ownedCounts.get(item.character_name) ?? item.count
              const inTrade  = selected.get(item.character_name) ?? 0
              const remaining = owned - inTrade
              const exhausted = remaining <= 0
              const img       = CHAR_MAP[item.character_name]?.image
              const color     = rarityHex(item.rarity)
              return (
                <button
                  key={item.character_name}
                  type="button"
                  onClick={() => exhausted ? onRemove(item.character_name) : onAdd(item.character_name, item.rarity)}
                  className={cn(
                    'relative rounded-lg p-2 flex flex-col items-center text-center transition-all',
                    exhausted ? 'opacity-50' : 'hover:-translate-y-0.5',
                  )}
                  style={{
                    backgroundColor: inTrade > 0 ? 'rgba(245,158,66,0.1)' : '#1c1d27',
                    border: inTrade > 0
                      ? `2.5px solid ${ACCENT}`
                      : `2.5px solid ${color}`,
                  }}
                  title={exhausted
                    ? `All ${owned} added — click to remove one`
                    : `${remaining} available`}
                >
                  {/* Selected count chip */}
                  {inTrade > 0 && (
                    <div
                      className="absolute top-1 right-1 px-1.5 py-0.5 rounded text-[10px]"
                      style={{ backgroundColor: ACCENT, color: '#1a1b23', fontWeight: 800 }}
                    >
                      ×{inTrade}
                    </div>
                  )}
                  {/* Owned count */}
                  <div
                    className="absolute top-1 left-1 px-1 rounded text-[10px] tabular-nums bg-base"
                    style={{ color: '#b4b4be', fontWeight: 700 }}
                  >
                    {remaining}/{owned}
                  </div>

                  <div className="h-[60px] flex items-center justify-center mt-3 mb-1">
                    {img ? (
                      <img src={img} alt="" className="max-h-[60px] object-contain" />
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
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryStrip({ label, items, color }) {
  return (
    <div>
      <div
        className="uppercase mb-1"
        style={{ color, fontSize: 11, fontWeight: 700, letterSpacing: '1px' }}
      >
        {label}
      </div>
      {items.length === 0 ? (
        <p className="text-text-muted text-xs">Nothing selected.</p>
      ) : (
        <div className="flex items-center gap-1.5 flex-wrap">
          {items.map((it, i) => {
            const img = CHAR_MAP[it.character_name]?.image
            const c   = rarityHex(it.rarity)
            return (
              <div
                key={i}
                className="flex items-center gap-1.5 px-1.5 py-1 rounded bg-card"
                style={{ border: `1.5px solid ${c}` }}
                title={`${it.character_name} ×${it.count}`}
              >
                {img ? (
                  <img src={img} alt="" className="w-5 h-5 object-contain" />
                ) : (
                  <span className="text-[10px]" style={{ color: c, fontWeight: 800 }}>
                    {it.character_name[0]}
                  </span>
                )}
                <span className="text-[11px] text-text-primary" style={{ fontWeight: 700 }}>
                  {it.character_name}
                </span>
                {it.count > 1 && (
                  <span
                    className="text-[10px] tabular-nums"
                    style={{ color: ACCENT, fontWeight: 800 }}
                  >
                    ×{it.count}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function TradeNew() {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const { username: myUsername } = useAuth()

  const [searchParams] = useSearchParams()
  const initialUser = searchParams.get('to') ?? null

  const [otherUser,   setOtherUser]   = useState(initialUser)
  const [myInv,       setMyInv]       = useState(null)
  const [theirInv,    setTheirInv]    = useState(null)
  const [loadingMine, setLoadingMine] = useState(true)
  const [loadingTheirs, setLoadingTheirs] = useState(false)
  const [theirsError, setTheirsError] = useState(null)
  const [submitting,  setSubmitting]  = useState(false)

  // selected[type] = Map<character_name, count>
  const [offered,   setOffered]   = useState(new Map())
  const [requested, setRequested] = useState(new Map())

  // Pulled once; never changes per-step.
  useEffect(() => {
    api.myInventory()
      .then(d => setMyInv(d?.items ?? []))
      .catch(err => addToast(err.message, 'error'))
      .finally(() => setLoadingMine(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Refetch their inventory whenever the chosen user changes.
  useEffect(() => {
    if (!otherUser) return
    setLoadingTheirs(true)
    setTheirsError(null)
    setRequested(new Map())
    api.playerInventory(otherUser)
      .then(d => setTheirInv(d?.items ?? []))
      .catch(err => {
        setTheirInv([])
        setTheirsError(err.message)
      })
      .finally(() => setLoadingTheirs(false))
  }, [otherUser])

  const myOwned = useMemo(() => {
    const m = new Map()
    for (const it of myInv ?? []) m.set(it.character_name, it.count)
    return m
  }, [myInv])

  const theirOwned = useMemo(() => {
    const m = new Map()
    for (const it of theirInv ?? []) m.set(it.character_name, it.count)
    return m
  }, [theirInv])

  function addOffered(name, rarity) {
    setOffered(prev => {
      const next = new Map(prev)
      const owned = myOwned.get(name) ?? 0
      const cur   = next.get(name) ?? 0
      if (cur >= owned) return prev
      next.set(name, cur + 1)
      next._meta = { ...(prev._meta ?? {}), [name]: { rarity } }
      return next
    })
  }

  function removeOffered(name) {
    setOffered(prev => {
      const next = new Map(prev)
      const cur = next.get(name) ?? 0
      if (cur <= 1) next.delete(name)
      else          next.set(name, cur - 1)
      return next
    })
  }

  function addRequested(name, rarity) {
    setRequested(prev => {
      const next = new Map(prev)
      const owned = theirOwned.get(name) ?? 0
      const cur   = next.get(name) ?? 0
      if (cur >= owned) return prev
      next.set(name, cur + 1)
      return next
    })
  }

  function removeRequested(name) {
    setRequested(prev => {
      const next = new Map(prev)
      const cur = next.get(name) ?? 0
      if (cur <= 1) next.delete(name)
      else          next.set(name, cur - 1)
      return next
    })
  }

  function offerSummary(map, sourceItems) {
    // Source items provide rarity for thumbnail coloring; map provides counts.
    const byName = new Map((sourceItems ?? []).map(i => [i.character_name, i]))
    const out = []
    for (const [name, count] of map.entries()) {
      const src = byName.get(name)
      if (!src) continue
      out.push({ character_name: name, rarity: src.rarity, count })
    }
    return out
  }

  const offeredArr   = offerSummary(offered,   myInv)
  const requestedArr = offerSummary(requested, theirInv)

  const canSend =
    !!otherUser &&
    !submitting &&
    offeredArr.length > 0 &&
    requestedArr.length > 0

  async function handleSend() {
    if (!canSend) return
    setSubmitting(true)
    try {
      await api.createTrade({
        receiver_username: otherUser,
        offered:   offeredArr.map(i => ({ character_name: i.character_name, count: i.count })),
        requested: requestedArr.map(i => ({ character_name: i.character_name, count: i.count })),
      })
      addToast(`Trade sent to ${otherUser}!`, 'success')
      navigate('/trades?tab=sent')
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // Hash-based color (matches Chat.jsx) for the other user's panel header
  const otherUserColor = useMemo(() => {
    if (!otherUser) return '#b4b4be'
    const palette = ['#60a5fa', '#4ade80', '#f87171', '#c084fc', '#fb923c', '#2dd4bf']
    let h = 0
    for (let i = 0; i < otherUser.length; i++) h = ((h << 5) - h + otherUser.charCodeAt(i)) | 0
    return palette[Math.abs(h) % palette.length]
  }, [otherUser])

  return (
    <PageWrapper>
      <div className="flex items-center gap-3 mb-6">
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
          New Trade
        </h1>
      </div>

      <AnimatePresence mode="wait">
        {!otherUser ? (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <UserPicker onPick={setOtherUser} />
          </motion.div>
        ) : (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-col gap-4"
          >
            {/* Selected user banner */}
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card"
              style={{ border: `2px solid ${NEUTRAL_BORDER}` }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: otherUserColor, color: '#1a1b23', fontWeight: 800 }}
              >
                {otherUser[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-text-muted text-[11px] uppercase" style={{ letterSpacing: '0.5px', fontWeight: 700 }}>
                  Trading with
                </div>
                <div className="text-text-primary truncate" style={{ fontWeight: 700 }}>
                  {otherUser}
                </div>
              </div>
              <button
                onClick={() => {
                  setOtherUser(null)
                  setRequested(new Map())
                }}
                className="text-xs px-3 py-1.5 rounded-lg transition-all"
                style={{
                  background: 'transparent',
                  border: '2px solid #3d3e4a',
                  color: '#e4e4e7',
                  fontWeight: 700,
                }}
              >
                Change
              </button>
            </div>

            {theirsError && (
              <div className="text-center py-4 text-red-400 text-sm">{theirsError}</div>
            )}

            {(theirInv?.length === 0 && !loadingTheirs && !theirsError) && (
              <div
                className="rounded-xl p-4 text-center text-text-muted text-sm bg-card"
                style={{ border: `2px solid ${NEUTRAL_BORDER}` }}
              >
                <span className="mr-1">🫥</span>
                {otherUser} has no items yet — there's nothing to request.
              </div>
            )}

            {/* Two-panel inventory builder */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <InventoryGrid
                title="Your Items"
                titleColor={ACCENT}
                items={myInv ?? []}
                loading={loadingMine}
                emptyMessage="Your inventory is empty."
                selected={offered}
                ownedCounts={myOwned}
                onAdd={addOffered}
                onRemove={removeOffered}
              />
              <InventoryGrid
                title={`${otherUser}'s Items`}
                titleColor={otherUserColor}
                items={theirInv ?? []}
                loading={loadingTheirs}
                emptyMessage="This user has no items."
                selected={requested}
                ownedCounts={theirOwned}
                onAdd={addRequested}
                onRemove={removeRequested}
              />
            </div>

            {/* Summary bar */}
            <div
              className="rounded-xl p-4 flex flex-col gap-3 bg-surface"
              style={{ border: `2px solid ${NEUTRAL_BORDER}` }}
            >
              <SummaryStrip label="You give"    items={offeredArr}   color={ACCENT} />
              <SummaryStrip label="You receive" items={requestedArr} color={otherUserColor} />
            </div>

            {/* Send button */}
            <div className="flex justify-end">
              <motion.button
                onClick={handleSend}
                disabled={!canSend}
                whileHover={canSend ? { scale: 1.03 } : {}}
                whileTap={canSend  ? { scale: 0.97 } : {}}
                className="px-6 py-2.5 rounded-lg transition-all disabled:cursor-not-allowed"
                style={{
                  backgroundColor: canSend ? ACCENT : '#2d2e3a',
                  color: canSend ? '#1a1b23' : '#8b8b98',
                  fontWeight: 800,
                  opacity: canSend ? 1 : 0.6,
                }}
                title={
                  !otherUser ? 'Pick a player first'
                  : offeredArr.length === 0   ? 'Add at least one of your items'
                  : requestedArr.length === 0 ? 'Add at least one of their items'
                  : undefined
                }
              >
                {submitting ? 'Sending…' : 'Send Trade Offer'}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageWrapper>
  )
}
