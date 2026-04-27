import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { rarityText, rarityBorder, rarityBg } from '../utils/rarity'
import { cn } from '../utils/cn'
import PageWrapper from '../components/PageWrapper'
import Chat from '../components/Chat'
import { CHARACTERS, randomChar, CHAR_MAP } from '../utils/gameData'
import { playClick, playTick, playReveal } from '../utils/sounds'

// ── Constants ─────────────────────────────────────────────────────────────────

const CARD_W     = 128
const CARD_H     = 148
const CARD_GAP   = 10
const CARD_STEP  = CARD_W + CARD_GAP
const STRIP_H    = 178
const STRIP_LEN  = 75
const RESULT_IDX = 63
const SPIN_MS    = 6500

// ── Helpers ───────────────────────────────────────────────────────────────────

function easeOutQuint(t) { return 1 - Math.pow(1 - t, 5) }

function buildStrip(resultName, resultRarity) {
  const strip = Array.from({ length: STRIP_LEN }, randomChar)
  const resultChar = CHARACTERS.find(c => c.name === resultName)
    ?? { name: resultName, rarity: resultRarity, image: null }
  strip[RESULT_IDX] = resultChar
  return strip
}

// ── Rarity data ───────────────────────────────────────────────────────────────

const RARITY_RANK = {
  Common: 0, Unusual: 1, Uncommon: 2, Superior: 3,
  Rare: 4, Mystic: 5, Epic: 6, Ancient: 7,
  Legendary: 8, Divine: 9, Mythic: 10, Celestial: 11, Transcendent: 12,
  Ethereal: 13, Cosmic: 14, Omnipotent: 15, Singularity: 16,
}

const RARITY_GLOW_CARD = {
  Uncommon:     '0 0 18px rgba(74,  222,128,0.45)',
  Superior:     '0 0 18px rgba(34,  211,238,0.45)',
  Rare:         '0 0 26px rgba(96,  165,250,0.60)',
  Mystic:       '0 0 26px rgba(45,  212,191,0.60)',
  Epic:         '0 0 34px rgba(168,  85,247,0.70)',
  Ancient:      '0 0 34px rgba(245, 158, 11,0.70)',
  Legendary:    '0 0 48px rgba(250, 204, 21,0.80)',
  Divine:       '0 0 48px rgba(251, 146, 60,0.80)',
  Mythic:       '0 0 56px rgba(248, 113,113,0.85)',
  Celestial:    '0 0 56px rgba(244, 114,182,0.85)',
  Transcendent: '0 0 70px rgba(255, 255,255,0.95)',
  Ethereal:     '0 0 80px rgba(186, 230,253,0.95)',
  Cosmic:       '0 0 90px rgba(167, 139,250,1.00)',
  Omnipotent:   '0 0 100px rgba(253,230,138,1.00)',
  Singularity:  '0 0 120px rgba(254,243,199,1.00)',
}

const RARITY_FLASH = {
  Rare:         'rgba(96,  165,250,0.12)',
  Mystic:       'rgba(45,  212,191,0.12)',
  Epic:         'rgba(168,  85,247,0.18)',
  Ancient:      'rgba(245, 158, 11,0.18)',
  Legendary:    'rgba(250, 204, 21,0.22)',
  Divine:       'rgba(251, 146, 60,0.22)',
  Mythic:       'rgba(248, 113,113,0.28)',
  Celestial:    'rgba(244, 114,182,0.28)',
  Transcendent: 'rgba(255, 255,255,0.35)',
  Ethereal:     'rgba(186, 230,253,0.38)',
  Cosmic:       'rgba(167, 139,250,0.42)',
  Omnipotent:   'rgba(253, 230,138,0.48)',
  Singularity:  'rgba(254, 243,199,0.60)',
}

const RARITY_RING = {
  Rare:         'ring-blue-500/50',
  Mystic:       'ring-teal-500/50',
  Epic:         'ring-purple-500/60',
  Ancient:      'ring-amber-500/60',
  Legendary:    'ring-yellow-400/60',
  Divine:       'ring-orange-400/60',
  Mythic:       'ring-red-400/70',
  Celestial:    'ring-pink-400/70',
  Transcendent: 'ring-white/70',
  Ethereal:     'ring-sky-200/80',
  Cosmic:       'ring-violet-400/85',
  Omnipotent:   'ring-yellow-200/85',
  Singularity:  'ring-amber-100/90',
}

const CONFETTI_COLORS = {
  Rare:         ['#60a5fa','#93c5fd','#ffffff'],
  Mystic:       ['#2dd4bf','#5eead4','#ffffff'],
  Epic:         ['#a855f7','#c084fc','#e879f9'],
  Ancient:      ['#f59e0b','#fbbf24','#fde68a'],
  Legendary:    ['#fbbf24','#fde047','#ffffff'],
  Divine:       ['#fb923c','#fbbf24','#ffffff'],
  Mythic:       ['#f87171','#fb923c','#fbbf24'],
  Celestial:    ['#f472b6','#e879f9','#c084fc'],
  Transcendent: ['#ffffff','#e0f2fe','#fde68a'],
  Ethereal:     ['#bae6fd','#7dd3fc','#ffffff'],
  Cosmic:       ['#a78bfa','#7c3aed','#ddd6fe'],
  Omnipotent:   ['#fef9c3','#fde047','#ffffff'],
  Singularity:  ['#ffffff','#fef3c7','#fde68a'],
}

function fireConfetti(rarity) {
  const rank = RARITY_RANK[rarity] ?? 0
  if (rank < 4) return
  const colors = CONFETTI_COLORS[rarity] ?? ['#a855f7','#fbbf24']
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
  const colors = CONFETTI_COLORS[rarity] ?? ['#a855f7','#fbbf24']
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
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Recent Rare Drops</h3>
        <span className="text-[10px] text-gray-600">live · Epic+</span>
      </div>
      {drops.length === 0 ? (
        <p className="text-gray-600 text-xs text-center py-3">No rare drops yet...</p>
      ) : (
        <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto">
          <AnimatePresence initial={false}>
            {drops.map((d, i) => (
              <motion.div
                key={`${d.username}-${d.character}-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center justify-between gap-2 py-1 px-2 rounded-lg bg-zinc-800/50"
              >
                <span className="text-gray-400 text-xs truncate max-w-[90px]">{d.username}</span>
                <div className="flex items-center gap-1.5 min-w-0">
                  {CHAR_MAP[d.character]?.image && (
                    <img src={CHAR_MAP[d.character].image} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
                  )}
                  <span className={cn('text-xs font-medium truncate', rarityText(d.rarity))}>{d.character}</span>
                </div>
                <span className={cn('text-[10px] font-bold flex-shrink-0', rarityText(d.rarity))}>{d.rarity}</span>
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
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Your Last Rolls</h3>
      <div className="flex flex-col gap-1.5">
        {rolls.map((r, i) => {
          const rank = RARITY_RANK[r.rarity] ?? 0
          const img  = CHAR_MAP[r.character]?.image
          return (
            <div key={i} className={cn('flex items-center gap-2 px-2 py-1.5 rounded-lg', rank >= 4 ? 'bg-zinc-800/70' : 'bg-zinc-900/50')}>
              {img ? (
                <img src={img} alt="" className="w-6 h-6 object-contain flex-shrink-0" />
              ) : (
                <div className={cn('w-6 h-6 rounded flex items-center justify-center text-[10px] font-black', rarityText(r.rarity))}>
                  {r.character[0]}
                </div>
              )}
              <span className={cn('text-xs font-medium flex-1 truncate', rank >= 4 ? rarityText(r.rarity) : 'text-gray-400')}>
                {r.character}
              </span>
              <span className={cn('text-[10px] font-bold flex-shrink-0', rarityText(r.rarity))}>{r.rarity}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function OddsDisplay() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Drop Odds</h3>
      <div className="flex flex-col gap-0.5 max-h-64 overflow-y-auto pr-1">
        {ODDS.map(({ rarity, chance }) => (
          <div key={rarity} className="flex items-center justify-between py-1 px-1">
            <span className={cn('text-xs font-medium', rarityText(rarity))}>{rarity}</span>
            <span className="text-[11px] text-gray-500 tabular-nums">{chance}</span>
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
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Top Inventory</h3>
      <div className="flex flex-col gap-2">
        {top.map(item => {
          const img = CHAR_MAP[item.character_name]?.image
          return (
            <div key={item.character_name} className={cn('flex items-center gap-2.5 px-2.5 py-2 rounded-xl border', rarityBorder(item.rarity), rarityBg(item.rarity))}>
              {img ? (
                <img src={img} alt="" className="w-9 h-9 object-contain flex-shrink-0" />
              ) : (
                <div className={cn('w-9 h-9 rounded flex items-center justify-center text-lg font-black', rarityText(item.rarity))}>
                  {item.character_name[0]}
                </div>
              )}
              <div className="min-w-0">
                <div className={cn('text-xs font-semibold leading-tight truncate', rarityText(item.rarity))}>{item.character_name}</div>
                <div className={cn('text-[9px] uppercase tracking-wider opacity-60', rarityText(item.rarity))}>{item.rarity} · ×{item.count}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Strip card ────────────────────────────────────────────────────────────────

function StripCard({ char, isResult, revealed }) {
  const highlighted = isResult && revealed
  return (
    <div
      className={cn(
        'relative flex-shrink-0 flex flex-col rounded-xl border-2 overflow-hidden select-none',
        highlighted ? rarityBorder(char.rarity) : 'border-zinc-700',
        highlighted ? rarityBg(char.rarity)     : 'bg-zinc-800/90',
        highlighted ? 'scale-[1.07]' : '',
        'transition-transform duration-300',
      )}
      style={{ width: CARD_W, height: CARD_H, boxShadow: highlighted ? RARITY_GLOW_CARD[char.rarity] : undefined }}
    >
      {highlighted && <div className="absolute inset-0 bg-white animate-shimmer rounded-xl pointer-events-none z-10" />}
      <div className="flex-1 flex items-center justify-center px-2 pt-2">
        {char.image
          ? <img src={char.image} alt={char.name} draggable={false} className="object-contain w-full" style={{ height: CARD_H - 46 }} />
          : <span className={cn('text-4xl font-black', rarityText(char.rarity))}>{char.name[0]}</span>
        }
      </div>
      <div className="px-1.5 pb-2 text-center">
        <div className="text-[10px] text-gray-200 leading-tight truncate">{char.name}</div>
        <div className={cn('text-[9px] font-bold uppercase tracking-wider', rarityText(char.rarity))}>{char.rarity}</div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Roll() {
  const [phase, _setPhase]        = useState('idle')
  const [strip,       setStrip]      = useState([])
  const [stripOffset, setStripOffset] = useState(0)
  const [apiResult,   setApiResult]   = useState(null)
  const [revealKey,   setRevealKey]   = useState(0)
  const [autoRoll,    setAutoRoll]    = useState(false)
  const [rollTick,    setRollTick]    = useState(0)

  const containerRef = useRef(null)
  const rafRef       = useRef(null)
  const phaseRef     = useRef('idle')

  const { updateCoins } = useAuth()
  const { addToast }    = useToast()

  function setPhase(p) { phaseRef.current = p; _setPhase(p) }

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }, [])

  useEffect(() => {
    if (!autoRoll || phase !== 'reveal') return
    const t = setTimeout(handleOpen, 1800)
    return () => clearTimeout(t)
  }, [phase, autoRoll]) // eslint-disable-line

  async function handleOpen() {
    if (phaseRef.current === 'spinning' || phaseRef.current === 'loading') return
    if (rafRef.current) cancelAnimationFrame(rafRef.current)

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
        }
      }

      rafRef.current = requestAnimationFrame(tick)
    } catch (err) {
      addToast(err.message, 'error')
      setPhase('idle')
    }
  }

  const rank       = apiResult ? (RARITY_RANK[apiResult.rarity] ?? 0) : 0
  const flashColor = apiResult ? RARITY_FLASH[apiResult.rarity] : null
  const isIdle     = phase === 'idle'
  const isLoading  = phase === 'loading'
  const isSpinning = phase === 'spinning'
  const isReveal   = phase === 'reveal'

  const stripRing = isReveal && apiResult
    ? (RARITY_RING[apiResult.rarity] ?? 'ring-purple-500/40')
    : isSpinning ? 'ring-purple-500/40'
    : isIdle     ? 'ring-purple-500/15'
    : ''

  return (
    <PageWrapper>
      <AnimatePresence>
        {isReveal && flashColor && (
          <motion.div
            key={revealKey}
            className="fixed inset-0 pointer-events-none z-30"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 1.6, ease: 'easeOut' }}
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
        <div className="hidden 2xl:flex flex-col gap-4 absolute top-0 right-[calc(100%+1.5rem)] w-64">
          <Chat />
        </div>

        {/* ── Right sidebar: floats outside the content box on 2xl+ screens ── */}
        <div className="hidden 2xl:flex flex-col gap-4 absolute top-0 left-[calc(100%+1.5rem)] w-56">
          <OddsDisplay />
          <QuickInventoryPreview refreshKey={rollTick} />
        </div>

        {/* ── Title ── */}
        <div className="text-center">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-extrabold tracking-tight"
          >
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
              Open Case
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-gray-500 text-sm mt-1"
          >
            17 rarities · 1 in 93,000,000 for Singularity
          </motion.p>
        </div>

        {/* ── Strip (full content width, unchanged) ── */}
        <div className="relative">
          {isIdle && (
            <motion.div
              className="absolute -inset-[3px] rounded-[14px] border-2 border-purple-500/25 pointer-events-none"
              animate={{ opacity: [0.25, 0.7, 0.25] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
          <div
            ref={containerRef}
            className={cn('relative overflow-hidden rounded-xl bg-[#16162a] ring-2 transition-all duration-500', stripRing)}
            style={{
              height: STRIP_H,
              ...(isReveal && apiResult ? { boxShadow: `0 0 40px ${RARITY_FLASH[apiResult.rarity] ?? 'transparent'}` } : {}),
            }}
          >
            {(isIdle || isLoading) && strip.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                {isLoading
                  ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
                      className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full" />
                  : <span className="text-gray-700 text-sm">Open a case to begin</span>
                }
              </div>
            )}

            {strip.length > 0 && (
              <div
                className="absolute flex items-center"
                style={{ top: '50%', left: 0, gap: CARD_GAP, transform: `translateX(${stripOffset}px) translateY(-50%)`, willChange: 'transform' }}
              >
                {strip.map((char, i) => (
                  <StripCard key={i} char={char} isResult={i === RESULT_IDX} revealed={isReveal} />
                ))}
              </div>
            )}

            <div className="absolute inset-y-0 left-0 w-32 pointer-events-none z-10"
              style={{ background: 'linear-gradient(to right, #0a0a12, transparent)' }} />
            <div className="absolute inset-y-0 right-0 w-32 pointer-events-none z-10"
              style={{ background: 'linear-gradient(to left, #0a0a12, transparent)' }} />

            <div className="absolute inset-y-0 left-1/2 w-[3px] -translate-x-[1.5px] bg-red-500 z-20 pointer-events-none shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
              style={{ width:0,height:0,borderLeft:'9px solid transparent',borderRight:'9px solid transparent',borderTop:'13px solid #ef4444',filter:'drop-shadow(0 0 4px rgba(239,68,68,0.8))' }} />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
              style={{ width:0,height:0,borderLeft:'9px solid transparent',borderRight:'9px solid transparent',borderBottom:'13px solid #ef4444',filter:'drop-shadow(0 0 4px rgba(239,68,68,0.8))' }} />
          </div>
        </div>

        {/* ── Controls ── */}
        <div className="flex justify-center items-center gap-3 flex-wrap">
          <motion.button
            onClick={handleOpen}
            disabled={isSpinning || isLoading}
            whileHover={!isSpinning && !isLoading ? { scale: 1.05 } : {}}
            whileTap={!isSpinning && !isLoading ? { scale: 0.95 } : {}}
            animate={isIdle ? {
              boxShadow: ['0 0 16px rgba(34,197,94,0.25)','0 0 36px rgba(34,197,94,0.55)','0 0 16px rgba(34,197,94,0.25)'],
            } : { boxShadow: 'none' }}
            transition={isIdle ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }}
            className={cn(
              'px-10 py-3.5 rounded-xl font-bold text-lg tracking-wide transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60',
              isSpinning || isLoading
                ? 'bg-zinc-800 text-gray-400'
                : 'bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white',
            )}
          >
            {isLoading  && <motion.span animate={{ opacity:[1,.5,1] }} transition={{ duration:.8,repeat:Infinity }}>Preparing...</motion.span>}
            {isSpinning && 'Opening...'}
            {isReveal   && 'Open Again'}
            {isIdle     && 'Open Case'}
          </motion.button>

          <motion.button
            onClick={() => setAutoRoll(a => !a)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className={cn(
              'px-4 py-3 rounded-xl text-sm font-semibold border-2 transition-all duration-200',
              autoRoll
                ? 'bg-purple-600/25 border-purple-500 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                : 'bg-zinc-900 border-zinc-700 text-gray-500 hover:border-zinc-600 hover:text-gray-400',
            )}
          >
            Auto {autoRoll ? 'ON' : 'OFF'}
          </motion.button>
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
              className={cn('relative rounded-2xl border-2 p-6 text-center overflow-hidden', rarityBorder(apiResult.rarity), rarityBg(apiResult.rarity))}
              style={{ boxShadow: RARITY_GLOW_CARD[apiResult.rarity] }}
            >
              {rank >= 7 && (
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  animate={{ backgroundPosition: ['0% 50%','100% 50%','0% 50%'] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                  style={{ background: 'linear-gradient(270deg,transparent,rgba(255,255,255,0.06),transparent)', backgroundSize: '200% 100%' }}
                />
              )}
              <div className="relative z-10">
                {apiResult.is_rare && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                    className="text-yellow-400 text-xs font-bold tracking-[0.3em] uppercase mb-3"
                  >✦  Rare Pull  ✦</motion.div>
                )}
                {(() => {
                  const img = CHAR_MAP[apiResult.character_name]?.image
                  return img ? (
                    <motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 240, damping: 20, delay: 0.08 }}
                      className="flex justify-center mb-3">
                      <img src={img} alt={apiResult.character_name} draggable={false}
                        className="object-contain drop-shadow-2xl" style={{ width: 120, height: 120 }} />
                    </motion.div>
                  ) : null
                })()}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                  className={cn('text-3xl font-black mb-1', rarityText(apiResult.rarity))}>
                  {apiResult.character_name}
                </motion.div>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.22 }}
                  className={cn('text-xs font-bold uppercase tracking-[0.22em] mb-4 opacity-80', rarityText(apiResult.rarity))}>
                  {apiResult.rarity}
                </motion.div>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                  className="text-gray-400 text-sm italic mb-5 px-4">
                  &ldquo;{apiResult.description}&rdquo;
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}
                  className="flex justify-center gap-10">
                  <div className="text-center">
                    <div className="text-yellow-400 font-bold text-2xl tabular-nums">+{apiResult.value_earned.toLocaleString()}</div>
                    <div className="text-gray-500 text-xs mt-0.5">coins earned</div>
                  </div>
                  <div className="w-px bg-zinc-700" />
                  <div className="text-center">
                    <div className="text-yellow-400 font-bold text-2xl tabular-nums">{apiResult.coins_total.toLocaleString()}</div>
                    <div className="text-gray-500 text-xs mt-0.5">total coins</div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Live feed + last rolls ── */}
        <RecentDropsFeed />
        <YourLastRolls refreshKey={rollTick} />

        {/* ── Odds + inventory preview: shown below the fold on screens < 2xl ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 2xl:hidden">
          <OddsDisplay />
          <QuickInventoryPreview refreshKey={rollTick} />
        </div>

      </div>
    </PageWrapper>
  )
}
