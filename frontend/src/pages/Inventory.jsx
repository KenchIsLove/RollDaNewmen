import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../api/client'
import { rarityHex } from '../utils/rarity'
import { cn } from '../utils/cn'
import { CHAR_MAP } from '../utils/gameData'
import PageWrapper from '../components/PageWrapper'

const ACCENT = '#f59e42'

const RARITY_ORDER = {
  Common: 0, Unusual: 1, Uncommon: 2, Superior: 3,
  Rare: 4, Mystic: 5, Epic: 6, Ancient: 7,
  Legendary: 8, Divine: 9, Mythic: 10, Celestial: 11, Transcendent: 12,
  Ethereal: 13, Cosmic: 14, Omnipotent: 15, Singularity: 16,
}

const SORT_OPTIONS = [
  { value: 'rarest',   label: 'Rarest First' },
  { value: 'lowest',   label: 'Lowest Rarity' },
  { value: 'quantity', label: 'Most Copies' },
  { value: 'name',     label: 'Name A–Z' },
]

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
}

const card = {
  hidden:  { opacity: 0, y: 20, scale: 0.92 },
  visible: { opacity: 1, y: 0,  scale: 1,
    transition: { type: 'spring', stiffness: 220, damping: 22 } },
}

export default function Inventory() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [sortBy,  setSortBy]  = useState('rarest')

  useEffect(() => {
    api.myInventory()
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex justify-center py-24">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="w-8 h-8 border-2 rounded-full"
        style={{ borderColor: ACCENT, borderTopColor: 'transparent' }}
      />
    </div>
  )

  if (error) return (
    <PageWrapper>
      <p className="text-center text-red-400 py-20">{error}</p>
    </PageWrapper>
  )

  if (!data?.items?.length) return (
    <PageWrapper>
      <div className="text-center py-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-5xl mb-4 text-text-muted"
        >
          ?
        </motion.div>
        <p className="text-text-secondary">Your inventory is empty.</p>
        <p className="text-text-muted text-sm mt-2">Go open some cases!</p>
      </div>
    </PageWrapper>
  )

  const sortedItems = [...data.items].sort((a, b) => {
    switch (sortBy) {
      case 'rarest':   return (RARITY_ORDER[b.rarity] ?? 0) - (RARITY_ORDER[a.rarity] ?? 0)
      case 'lowest':   return (RARITY_ORDER[a.rarity] ?? 0) - (RARITY_ORDER[b.rarity] ?? 0)
      case 'quantity': return b.count - a.count
      case 'name':     return a.character_name.localeCompare(b.character_name)
      default:         return 0
    }
  })

  return (
    <PageWrapper>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap justify-between items-center gap-3 mb-6"
      >
        <div>
          <h1
            className="text-2xl text-text-primary"
            style={{ fontWeight: 800 }}
          >
            Inventory
          </h1>
          <p className="text-text-muted text-xs mt-0.5">{data.items.length} unique characters</p>
        </div>
        <span
          className="text-sm tabular-nums"
          style={{ color: ACCENT, fontWeight: 700 }}
        >
          🪙 {data.total_value.toLocaleString()} coins total
        </span>
      </motion.div>

      {/* Sort controls — horizontal scroll on phone, wraps on md+ */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex gap-2 mb-5 overflow-x-auto md:flex-wrap pb-1 -mx-3 px-3 sm:mx-0 sm:px-0"
      >
        {SORT_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setSortBy(opt.value)}
            className="shrink-0 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all"
            style={
              sortBy === opt.value
                ? { backgroundColor: ACCENT, color: '#1a1b23', fontWeight: 700, border: '2px solid transparent' }
                : { backgroundColor: 'transparent', color: '#e4e4e7', fontWeight: 500, border: '2px solid #3d3e4a' }
            }
          >
            {opt.label}
          </button>
        ))}
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div
          key={sortBy}
          variants={container}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
        >
          {sortedItems.map(item => {
            const charData = CHAR_MAP[item.character_name]
            const img      = charData?.image ?? null
            const color    = rarityHex(item.rarity)

            return (
              <motion.div
                key={item.character_name}
                variants={card}
                whileHover={{ y: -4 }}
                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                className={cn(
                  'relative rounded-xl flex flex-col overflow-hidden cursor-default bg-card',
                )}
                style={{ border: `2.5px solid ${color}` }}
              >
                {/* Count badge */}
                {item.count > 1 && (
                  <div
                    className="absolute top-2 right-2 z-10 text-[10px] px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor: '#1a1b23',
                      border: `1.5px solid ${color}`,
                      color,
                      fontWeight: 800,
                    }}
                  >
                    ×{item.count}
                  </div>
                )}

                {/* Art — takes up most of the card */}
                <div className="flex items-center justify-center pt-4 pb-2 px-3" style={{ minHeight: 110 }}>
                  {img ? (
                    <img
                      src={img}
                      alt={item.character_name}
                      draggable={false}
                      className="object-contain w-full"
                      style={{ maxHeight: 110 }}
                    />
                  ) : (
                    <span
                      className="text-5xl select-none"
                      style={{ color, fontWeight: 800 }}
                    >
                      {item.character_name[0]}
                    </span>
                  )}
                </div>

                {/* Name + rarity */}
                <div className="px-2 pb-3 text-center">
                  <div
                    className="leading-tight truncate text-text-primary"
                    style={{ fontSize: 14, fontWeight: 700 }}
                  >
                    {item.character_name}
                  </div>
                  <div
                    className="uppercase mt-0.5"
                    style={{
                      color,
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: '0.5px',
                    }}
                  >
                    {item.rarity}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </AnimatePresence>
    </PageWrapper>
  )
}
