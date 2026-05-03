import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { rarityHex } from '../utils/rarity'
import { useMediaQuery } from '../utils/useMediaQuery'
import PageWrapper from '../components/PageWrapper'
import Chat from '../components/Chat'
import { CHARACTERS, randomChar, CHAR_MAP } from '../utils/gameData'
import { playClick, playTick, playReveal } from '../utils/sounds'

// ── Constants ─────────────────────────────────────────────────────────────────

const CARD_GAP   = 10
const STRIP_LEN  = 75
const RESULT_IDX = 63
const SPIN_MS    = 6500
const ACCENT     = '#f59e42'
const PURPLE_FEED = '#a855f7'

// ── Helpers ───────────────────────────────────────────────────────────────────

function easeOutQuint(t) { return 1 - Math.pow(1 - t, 5) }

function buildStrip(resultName, resultRarity) {
  const strip = Array.from({ length: STRIP_LEN }, randomChar)
  const resultChar = CHARACTERS.find(c => c.name === resultName)
    ?? { name: resultName, rarity: resultRarity, image: null }
  strip[RESULT_IDX] = resultChar
  return strip
}

function getStripDims(isMobile, isTablet) {
  if (isMobile) return { cardW: 80,  cardH: 100, stripH: 130 }
  if (isTablet) return { cardW: 104, cardH: 124, stripH: 154 }
  return                 { cardW: 128, cardH: 148, stripH: 178 }
}

// Convert a hex color to an rgba string with the given alpha (0..1).
function hexAlpha(hex, alpha) {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// ── Rarity data ───────────────────────────────────────────────────────────────

const RARITY_RANK = {
  Common: 0, Unusual: 1, Uncommon: 2, Superior: 3,
  Rare: 4, Mystic: 5, Epic: 6, Ancient: 7,
  Legendary: 8, Divine: 9, Mythic: 10, Celestial: 11, Transcendent: 12,
  Ethereal: 13, Cosmic: 14, Omnipotent: 15, Singularity: 16,
}

const CONFETTI_COLORS = {
  Rare:         ['#3b82f6','#60a5fa','#ffffff'],
  Mystic:       ['#06b6d4','#22d3ee','#ffffff'],
  Epic:         ['#eab308','#facc15','#fde047'],
  Ancient:      ['#f97316','#fb923c','#fdba74'],
  Legendary:    ['#ef4444','#f87171','#ffffff'],
  Divine:       ['#fbbf24','#fcd34d','#ffffff'],
  Mythic:       ['#a855f7','#c084fc','#e9d5ff'],
  Celestial:    ['#ec4899','#f472b6','#fbcfe8'],
  Transcendent: ['#f0abfc','#ffffff','#fde68a'],
  Ethereal:     ['#38bdf8','#bae6fd','#ffffff'],
  Cosmic:       ['#818cf8','#a5b4fc','#ffffff'],
  Omnipotent:   ['#fde047','#fef08a','#ffffff'],
  Singularity:  ['#ffffff','#fef3c7','#fde68a'],
}

function fireConfetti(rarity) {
  const rank = RARITY_RANK[rarity] ?? 0
  if (rank < 4) return
  const colors = CONFETTI_COLORS[rarity] ?? [ACCENT, '#fbbf24']
  const count  = Math.min(70 + rank * 28, 380)
  const spread = Math.min(65 + rank * 8, 135)
  confetti({ particleCount: count, spread, origin: { y: 0.52 }, colors, ticks: 240 })
  if (rank >= 8) {
    setTimeout(() => {
      confetti({ particleCount: 45, angle: 60,  spread: 65, origin: { x: 0, y: 0.55 }, colors })
      confetti({ particleCount: 45, angle: 120, spread: 65, origin: { x: 1, y: 0.55 }, colors })
    }, 230)
  }
  if (rank >= 11) {
    setTimeout(() => confetti({ particleCount: 90, spread: 180, origin: { y: 0.45 }, colors }), 520)
  }
  if (rank >= 13) {
    setTimeout(() => confetti({ particleCount: 150, spread: 360, origin: { y: 0.4 }, colors, ticks: 300, startVelocity: 45 }), 750)
  }
}

function fireRevealBurst(rarity) {
  const rank = RARITY_RANK[rarity] ?? 0
  if (rank < 2) return
  const colors = CONFETTI_COLORS[rarity] ?? [ACCENT, '#fbbf24']
  confetti({
    particleCount: 35 + rank * 10,
    spread: 360,
    startVelocity: 16 + rank * 2,
    origin: { x: 0.5, y: 0.42 },
    colors,
    ticks: 150,
    gravity: 0.85,
    scalar: 0.8,
    shapes: ['circle'],
  })
}

// ── Hardcoded odds (total weight = 93,040,603) ────────────────────────────────

const ODDS = [
  { rarity: 'Common',       chance: '1 in 2' },
  { rarity: 'Unusual',      chance: '1 in 4' },
  { rarity: 'Uncommon',     chance: '1 in 9' },
  { rarity: 'Superior',     chance: '1 in 19' },
  { rarity: 'Rare',         chance: '1 in 47' },
  { rarity: 'Mystic',       chance: '1 in 133' },
  { rarity: 'Epic',         chance: '1 in 465' },
  { rarity: 'Ancient',      chance: '1 in 1,329' },
  { rarity: 'Legendary',    chance: '1 in 2,326' },
  { rarity: 'Divine',       chance: '1 in 6,203' },
  { rarity: 'Mythic',       chance: '1 in 9,304' },
  { rarity: 'Celestial',    chance: '1 in 23,260' },
  { rarity: 'Transcendent', chance: '1 in 93,041' },
  { rarity: 'Ethereal',     chance: '1 in 186,081' },
  { rarity: 'Cosmic',       chance: '1 in 1,000,000' },
  { rarity: 'Omnipotent',   chance: '1 in 10,000,000' },
  { rarity: 'Singularity',  chance: '1 in 93,000,000' },
]

// ── Section header (small uppercase, colored to section accent) ──────────────

function SectionHeader({ children, color }) {
  return (
    <h3
      className="uppercase"
      style={{
        color,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '1px',
      }}
    >
      {children}
    </h3>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function RecentDropsFeed() {
  const [drops, setDrops] = useState([])

  useEffect(() => {
    let mounted = true
    const fetch = () => {
      api.recentDrops(10)
        .then(d => { if (mounted) setDrops(d) })
        .catch(() => {})
    }
    fetch()
    const id = setInterval(fetch, 5000)
    return () => { mounted = false; clearInterval(id) }
  }, [])

  return (
    <div
      className="bg-card rounded-xl p-4"
      style={{ border: '2px solid #3d3e4a', borderLeft: `4px solid ${PURPLE_FEED}` }}
    >
      <div className="flex items-center justify-between mb-3">
        <SectionHeader color={PURPLE_FEED}>Recent Rare Drops</SectionHeader>
        <span className="text-[10px] text-text-muted">live · Epic+</span>
      </div>
      {drops.length === 0 ? (
        <p className="text-text-muted text-xs text-center py-3">No rare drops yet...</p>
      ) : (
        <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto">
          <AnimatePresence initial={false}>
            {drops.map((d, i) => (
              <motion.div
                key={`${d.username}-${d.character}-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center justify-between gap-2 py-1 px-2 rounded-lg bg-surface"
              >
                <Link
                  to={`/profile/${d.username}`}
                  className="text-text-secondary text-xs truncate max-w-[90px] hover:text-accent transition-colors"
                >
                  {d.username}
                </Link>
                <div className="flex items-center gap-1.5 min-w-0">
                  {CHAR_MAP[d.character]?.image && (
                    <img src={CHAR_MAP[d.character].image} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
                  )}
                  <span
                    className="text-[13px] truncate"
                    style={{ color: rarityHex(d.rarity), fontWeight: 700 }}
                  >
                    {d.character}
                  </span>
                </div>
                <span
                  className="text-[10px] uppercase flex-shrink-0"
                  style={{ color: rarityHex(d.rarity), fontWeight: 800, letterSpacing: '0.5px' }}
                >
                  {d.rarity}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

function YourLastRolls({ refreshKey }) {
  const [rolls, setRolls] = useState([])

  useEffect(() => {
    api.myRolls(5).then(setRolls).catch(() => {})
  }, [refreshKey])

  if (rolls.length === 0) return null

  return (
    <div
      className="bg-card rounded-xl p-4"
      style={{ border: '2px solid #3d3e4a', borderLeft: `4px solid ${ACCENT}` }}
    >
      <SectionHeader color={ACCENT}>Last Rolls</SectionHeader>
      <div className="flex flex-col gap-1.5 mt-3">
        {rolls.map((r, i) => {
          const img = CHAR_MAP[r.character]?.image
          return (
            <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-surface">
              {img ? (
                <img src={img} alt="" className="w-6 h-6 object-contain flex-shrink-0" />
              ) : (
                <div
                  className="w-6 h-6 rounded flex items-center justify-center text-[10px]"
                  style={{ color: rarityHex(r.rarity), fontWeight: 800 }}
                >
                  {r.character[0]}
                </div>
              )}
              <span
                className="text-[13px] flex-1 truncate"
                style={{ color: rarityHex(r.rarity), fontWeight: 700 }}
              >
                {r.character}
              </span>
              <span
                className="text-[10px] flex-shrink-0 uppercase"
                style={{ color: rarityHex(r.rarity), fontWeight: 800, letterSpacing: '0.5px' }}
              >
                {r.rarity}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function OddsDisplay() {
  return (
    <div className="bg-card rounded-xl p-4 border-2 border-line">
      <SectionHeader color="#b4b4be">Drop Odds</SectionHeader>
      <div className="flex flex-col gap-0.5 max-h-64 overflow-y-auto pr-1 mt-3">
        {ODDS.map(({ rarity, chance }) => (
          <div key={rarity} className="flex items-center justify-between py-1 px-1">
            <span
              className="text-xs uppercase"
              style={{ color: rarityHex(rarity), fontWeight: 700, letterSpacing: '0.5px' }}
            >
              {rarity}
            </span>
            <span className="text-[11px] text-text-muted tabular-nums">{chance}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function QuickInventoryPreview({ refreshKey }) {
  const [top, setTop] = useState([])

  useEffect(() => {
    api.myInventory()
      .then(data => {
        const sorted = [...(data.items ?? [])].sort(
          (a, b) => (RARITY_RANK[b.rarity] ?? 0) - (RARITY_RANK[a.rarity] ?? 0)
        )
        setTop(sorted.slice(0, 3))
      })
      .catch(() => {})
  }, [refreshKey])

  if (top.length === 0) return null

  return (
    <div
      className="bg-card rounded-xl p-4"
      style={{ border: '2px solid #3d3e4a', borderTop: '4px solid #eab308' }}
    >
      <SectionHeader color="#eab308">Top Inventory</SectionHeader>
      <div className="flex flex-col gap-2 mt-3">
        {top.map(item => {
          const img = CHAR_MAP[item.character_name]?.image
          return (
            <div
              key={item.character_name}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-surface"
              style={{ border: `2.5px solid ${rarityHex(item.rarity)}` }}
            >
              {img ? (
                <img src={img} alt="" className="w-9 h-9 object-contain flex-shrink-0" />
              ) : (
                <div
                  className="w-9 h-9 rounded flex items-center justify-center text-lg"
                  style={{ color: rarityHex(item.rarity), fontWeight: 800 }}
                >
                  {item.character_name[0]}
                </div>
              )}
              <div className="min-w-0">
                <div
                  className="text-[13px] leading-tight truncate"
                  style={{ color: rarityHex(item.rarity), fontWeight: 700 }}
                >
                  {item.character_name}
                </div>
                <div
                  className="text-[10px] uppercase mt-0.5"
                  style={{ color: rarityHex(item.rarity), fontWeight: 800, letterSpacing: '0.5px', opacity: 0.85 }}
                >
                  {item.rarity} · ×{item.count}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Strip card ────────────────────────────────────────────────────────────────

function StripCard({ char, isResult, revealed, cardW, cardH }) {
  const highlighted = isResult && revealed
  const color = rarityHex(char.rarity)
  return (
    <div
      className="relative flex-shrink-0 flex flex-col rounded-lg overflow-hidden select-none transition-transform duration-300"
      style={{
        width: cardW,
        height: cardH,
        backgroundColor: '#1c1d27',
        border: highlighted ? `4px solid ${color}` : `2.5px solid ${color}`,
        transform: highlighted ? 'scale(1.07)' : 'none',
        boxShadow: highlighted ? `0 0 24px ${hexAlpha(color, 0.3)}` : undefined,
      }}
    >
      {highlighted && <div className="absolute inset-0 bg-white animate-shimmer rounded-lg pointer-events-none z-10" />}
      <div className="flex-1 flex items-center justify-center px-2 pt-2">
        {char.image
          ? <img src={char.image} alt={char.name} draggable={false} className="object-contain w-full" style={{ height: cardH - 46 }} />
          : <span className="text-4xl" style={{ color, fontWeight: 800 }}>{char.name[0]}</span>
        }
      </div>
      <div className="px-1.5 pb-2 text-center">
        <div className="text-[11px] text-text-primary leading-tight truncate" style={{ fontWeight: 700 }}>{char.name}</div>
        <div
          className="text-[9px] uppercase"
          style={{ color, fontWeight: 800, letterSpacing: '0.5px' }}
        >
          {char.rarity}
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

// Fallback button-reset window when a 409 hits — covers the case where the
// server-side lock genuinely is held (other tab) and something else goes
// wrong before that lock auto-clears (server side is 30s).
const ROLL_LOCK_FALLBACK_MS = 10_000

export default function Roll() {
  const [phase, _setPhase]        = useState('idle')
  const [strip,       setStrip]      = useState([])
  const [stripOffset, setStripOffset] = useState(0)
  const [apiResult,   setApiResult]   = useState(null)
  const [revealKey,   setRevealKey]   = useState(0)
  const [autoRoll,    setAutoRoll]    = useState(false)
  const [rollTick,    setRollTick]    = useState(0)
  // True from click until the spinner animation finishes (or an error
  // resets it). Used to disable the roll button on top of the server-side
  // /roll lock, so a user can't fire a second request mid-animation.
  const [rolling,     setRolling]     = useState(false)

  const containerRef       = useRef(null)
  const rafRef             = useRef(null)
  const phaseRef           = useRef('idle')
  const lockFallbackRef    = useRef(null)

  const { updateCoins } = useAuth()
  const { addToast }    = useToast()

  const isMobile = useMediaQuery('(max-width: 639px)')
  const isTablet = useMediaQuery('(min-width: 640px) and (max-width: 1023px)')
  const isXxl    = useMediaQuery('(min-width: 1536px)')
  const { cardW: CARD_W, cardH: CARD_H, stripH: STRIP_H } = getStripDims(isMobile, isTablet)
  const CARD_STEP = CARD_W + CARD_GAP

  function setPhase(p) { phaseRef.current = p; _setPhase(p) }

  function clearLockFallback() {
    if (lockFallbackRef.current) {
      clearTimeout(lockFallbackRef.current)
      lockFallbackRef.current = null
    }
  }

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    clearLockFallback()
  }, [])

  useEffect(() => {
    if (!autoRoll || phase !== 'reveal') return
    const t = setTimeout(handleOpen, 1800)
    return () => clearTimeout(t)
  }, [phase, autoRoll]) // eslint-disable-line

  async function handleOpen() {
    if (phaseRef.current === 'spinning' || phaseRef.current === 'loading') return
    if (rolling) return
    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    setRolling(true)
    clearLockFallback()
    setPhase('loading')
    setApiResult(null)
    playClick()

    try {
      const data = await api.roll()

      const newStrip    = buildStrip(data.character_name, data.rarity)
      setStrip(newStrip)

      const W           = containerRef.current.offsetWidth
      const startOffset = W / 2 - 4 * CARD_STEP - CARD_W / 2
      const endOffset   = W / 2 - RESULT_IDX * CARD_STEP - CARD_W / 2

      setStripOffset(startOffset)
      setPhase('spinning')

      const startTime  = performance.now()
      let lastCardIdx  = -1
      let lastTickTime = -999

      function tick(now) {
        const t      = Math.min((now - startTime) / SPIN_MS, 1)
        const eased  = easeOutQuint(t)
        const offset = startOffset + (endOffset - startOffset) * eased
        setStripOffset(offset)

        const cardAtCenter = Math.floor((W / 2 - offset - CARD_W / 2) / CARD_STEP)
        if (cardAtCenter !== lastCardIdx) {
          lastCardIdx = cardAtCenter
          if (now - lastTickTime > 42) { lastTickTime = now; playTick() }
        }

        if (t < 1) {
          rafRef.current = requestAnimationFrame(tick)
        } else {
          setPhase('reveal')
          setRevealKey(k => k + 1)
          setApiResult(data)
          setRollTick(k => k + 1)
          updateCoins(data.coins_total)
          fireConfetti(data.rarity)
          fireRevealBurst(data.rarity)
          playReveal(data.rarity)
          // Animation finished — release the local roll lock.
          setRolling(false)
        }
      }

      rafRef.current = requestAnimationFrame(tick)
    } catch (err) {
      setPhase('idle')
      if (err?.status === 409) {
        // Another tab is rolling. Keep the button disabled so the user
        // can't hammer it; auto-recover after the fallback in case the
        // server lock somehow stays stuck.
        addToast('Roll already in progress', 'error')
        lockFallbackRef.current = setTimeout(() => {
          setRolling(false)
          lockFallbackRef.current = null
        }, ROLL_LOCK_FALLBACK_MS)
      } else {
        // Any other failure (rate limit, 500, network) — re-enable so
        // the user can retry immediately.
        addToast(err.message, 'error')
        setRolling(false)
      }
    }
  }

  const isIdle     = phase === 'idle'
  const isLoading  = phase === 'loading'
  const isSpinning = phase === 'spinning'
  const isReveal   = phase === 'reveal'

  // Flat-color screen flash on rare reveals (no gradient, no glow — just a
  // solid colored overlay that fades out).
  const flashColor = isReveal && apiResult && (RARITY_RANK[apiResult.rarity] ?? 0) >= 6
    ? hexAlpha(rarityHex(apiResult.rarity), 0.18)
    : null

  return (
    <PageWrapper>
      <AnimatePresence>
        {flashColor && (
          <motion.div
            key={revealKey}
            className="fixed inset-0 pointer-events-none z-30"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 1.4, ease: 'easeOut' }}
            style={{ backgroundColor: flashColor }}
          />
        )}
      </AnimatePresence>
      {/*
        Outer wrapper is `relative` so the sidebar can be positioned absolutely
        to the right of the content box without shrinking the main column.
      */}
      <div className="relative flex flex-col gap-6">

        {/* ── Left sidebar: live chat, floats outside content box on 2xl+ ── */}
        {isXxl && (
          <div className="flex flex-col gap-4 absolute top-0 right-[calc(100%+1.5rem)] w-64">
            <Chat />
          </div>
        )}

        {/* ── Right sidebar: floats outside the content box on 2xl+ screens ── */}
        {isXxl && (
          <div className="flex flex-col gap-4 absolute top-0 left-[calc(100%+1.5rem)] w-56">
            <OddsDisplay />
            <QuickInventoryPreview refreshKey={rollTick} />
          </div>
        )}

        {/* ── Title ── */}
        <div className="text-center">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl tracking-tight text-text-primary"
            style={{ fontWeight: 800 }}
          >
            Open Case
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-text-muted text-sm mt-1"
          >
            17 rarities · 1 in 93,000,000 for Singularity
          </motion.p>
        </div>

        {/* ── Strip (full content width, unchanged) ── */}
        <div className="relative">
          <div
            ref={containerRef}
            className="relative overflow-hidden rounded-xl bg-card border-2 border-line"
            style={{ height: STRIP_H }}
          >
            {(isIdle || isLoading) && strip.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                {isLoading
                  ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
                      className="w-6 h-6 border-2 rounded-full"
                      style={{ borderColor: ACCENT, borderTopColor: 'transparent' }} />
                  : <span className="text-text-muted text-sm">Open a case to begin</span>
                }
              </div>
            )}

            {strip.length > 0 && (
              <div
                className="absolute flex items-center"
                style={{ top: '50%', left: 0, gap: CARD_GAP, transform: `translateX(${stripOffset}px) translateY(-50%)`, willChange: 'transform' }}
              >
                {strip.map((char, i) => (
                  <StripCard
                    key={i}
                    char={char}
                    isResult={i === RESULT_IDX}
                    revealed={isReveal}
                    cardW={CARD_W}
                    cardH={CARD_H}
                  />
                ))}
              </div>
            )}

            {/* Picker line — solid orange, subtle drop shadow only */}
            <div
              className="absolute inset-y-0 left-1/2 w-[3px] -translate-x-[1.5px] z-20 pointer-events-none"
              style={{ backgroundColor: ACCENT, boxShadow: '0 0 6px rgba(245,158,66,0.55)' }}
            />
            {/* Top triangle indicator */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
              style={{
                width: 0,
                height: 0,
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderTop: `12px solid ${ACCENT}`,
              }}
            />
          </div>
        </div>

        {/* ── Controls ── */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex justify-center items-center gap-3 flex-wrap">
            <motion.button
              onClick={handleOpen}
              disabled={rolling}
              whileHover={!rolling ? { scale: 1.04 } : {}}
              whileTap={!rolling ? { scale: 0.96 } : {}}
              className="px-10 py-3.5 rounded-lg text-lg tracking-wide transition-all duration-200 disabled:cursor-not-allowed flex items-center gap-2"
              style={{
                backgroundColor: rolling ? '#2d2e3a' : ACCENT,
                color: rolling ? '#8b8b98' : '#1a1b23',
                fontWeight: 800,
                opacity: rolling ? 0.6 : 1,
              }}
            >
              <span aria-hidden="true">🎲</span>
              {isLoading  && <motion.span animate={{ opacity:[1,.5,1] }} transition={{ duration:.8,repeat:Infinity }}>Preparing...</motion.span>}
              {isSpinning && 'Opening...'}
              {isReveal   && !rolling && 'Roll Again'}
              {isIdle     && !rolling && 'Roll'}
              {/* `rolling` can be true while phase is idle when a 409
                  fallback is pending — show a stalled label so the
                  disabled state is legible. */}
              {rolling && !isLoading && !isSpinning && (
                <span>Locked…</span>
              )}
            </motion.button>

            <motion.button
              onClick={() => setAutoRoll(a => !a)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="px-4 py-3 rounded-lg text-sm transition-all duration-200"
              style={{
                background: 'transparent',
                border: `2px solid ${autoRoll ? ACCENT : '#3d3e4a'}`,
                color: autoRoll ? ACCENT : '#e4e4e7',
                fontWeight: 700,
              }}
            >
              Auto {autoRoll ? 'ON' : 'OFF'}
            </motion.button>
          </div>

          <div className="text-center" style={{ color: '#8b8b98', fontSize: 12 }}>
            spin the strip · rarer pulls grant more coins
          </div>
        </div>

        {/* ── Result panel ── */}
        <AnimatePresence mode="wait">
          {isReveal && apiResult && (
            <motion.div
              key={revealKey}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: 'spring', stiffness: 200, damping: 22, delay: 0.1 }}
              className="relative rounded-2xl p-6 text-center overflow-hidden bg-card"
              style={{
                border: `2.5px solid ${rarityHex(apiResult.rarity)}`,
                boxShadow: `0 0 32px ${hexAlpha(rarityHex(apiResult.rarity), 0.3)}`,
              }}
            >
              <div className="relative z-10">
                {apiResult.is_rare && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                    className="text-[11px] uppercase mb-3"
                    style={{ color: ACCENT, fontWeight: 800, letterSpacing: '3px' }}
                  >✦  Rare Pull  ✦</motion.div>
                )}
                {(() => {
                  const img = CHAR_MAP[apiResult.character_name]?.image
                  return img ? (
                    <motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 240, damping: 20, delay: 0.08 }}
                      className="flex justify-center mb-3">
                      <img src={img} alt={apiResult.character_name} draggable={false}
                        className="object-contain" style={{ width: 120, height: 120 }} />
                    </motion.div>
                  ) : null
                })()}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                  className="text-3xl mb-1"
                  style={{ color: rarityHex(apiResult.rarity), fontWeight: 800 }}>
                  {apiResult.character_name}
                </motion.div>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.22 }}
                  className="text-xs uppercase mb-4"
                  style={{ color: rarityHex(apiResult.rarity), fontWeight: 800, letterSpacing: '1px' }}>
                  {apiResult.rarity}
                </motion.div>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                  className="text-text-secondary text-sm italic mb-5 px-4">
                  &ldquo;{apiResult.description}&rdquo;
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}
                  className="flex justify-center gap-10">
                  <div className="text-center">
                    <div className="text-2xl tabular-nums" style={{ color: ACCENT, fontWeight: 800 }}>+{apiResult.value_earned.toLocaleString()}</div>
                    <div className="text-text-muted text-xs mt-0.5">coins earned</div>
                  </div>
                  <div className="w-px bg-line" />
                  <div className="text-center">
                    <div className="text-2xl tabular-nums" style={{ color: ACCENT, fontWeight: 800 }}>{apiResult.coins_total.toLocaleString()}</div>
                    <div className="text-text-muted text-xs mt-0.5">total coins</div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Live feed + last rolls (mobile order: last rolls → recent drops) ── */}
        <YourLastRolls refreshKey={rollTick} />
        <RecentDropsFeed />

        {/* ── Odds + inventory preview: shown below the fold on screens < 2xl ── */}
        <div className="flex flex-col gap-4 2xl:hidden">
          <OddsDisplay />
          <QuickInventoryPreview refreshKey={rollTick} />
        </div>

      </div>
    </PageWrapper>
  )
}
