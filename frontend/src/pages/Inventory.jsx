import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../api/client'
import { rarityText, rarityBorder, rarityBg } from '../utils/rarity'
import { cn } from '../utils/cn'
import { CHAR_MAP } from '../utils/gameData'
import PageWrapper from '../components/PageWrapper'

const RARITY_ORDER = {
  Common: 0, Unusual: 1, Uncommon: 2, Superior: 3,
  Rare: 4, Mystic: 5, Epic: 6, Ancient: 7,
  Legendary: 8, Divine: 9, Mythic: 10, Celestial: 11, Transcendent: 12,
}

const RARITY_GLOW_HOVER = {
  Rare:         'hover:shadow-blue-500/25',
  Mystic:       'hover:shadow-teal-500/25',
  Epic:         'hover:shadow-purple-500/30',
  Ancient:      'hover:shadow-amber-500/30',
  Legendary:    'hover:shadow-yellow-400/35',
  Divine:       'hover:shadow-orange-400/35',
  Mythic:       'hover:shadow-red-400/40',
  Celestial:    'hover:shadow-pink-400/40',
  Transcendent: 'hover:shadow-white/30',
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
        className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full"
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
          className="text-5xl mb-4 text-gray-700"
        >
          ?
        </motion.div>
        <p className="text-gray-400">Your inventory is empty.</p>
        <p className="text-gray-600 text-sm mt-2">Go open some cases!</p>
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
          <h1 className="text-2xl font-bold text-purple-400">Inventory</h1>
          <p className="text-gray-600 text-xs mt-0.5">{data.items.length} unique characters</p>
        </div>
        <span className="text-yellow-400 text-sm tabular-nums">
          {data.total_value.toLocaleString()} coins total
        </span>
      </motion.div>

      {/* Sort controls */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex gap-2 mb-5 flex-wrap"
      >
        {SORT_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setSortBy(opt.value)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
              sortBy === opt.value
                ? 'bg-purple-600/30 border-purple-500 text-purple-300'
                : 'bg-zinc-900 border-zinc-800 text-gray-500 hover:text-gray-300 hover:border-zinc-700',
            )}
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

            return (
              <motion.div
                key={item.character_name}
                variants={card}
                whileHover={{ y: -5, scale: 1.04 }}
                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                className={cn(
                  'relative rounded-xl border-2 flex flex-col overflow-hidden cursor-default',
                  'shadow-md hover:shadow-xl transition-shadow duration-300',
                  RARITY_GLOW_HOVER[item.rarity] ?? '',
                  rarityBorder(item.rarity),
                  rarityBg(item.rarity),
                )}
              >
                {/* Count badge */}
                <div className={cn(
                  'absolute top-2 right-2 z-10 text-[10px] font-bold px-1.5 py-0.5 rounded',
                  'bg-black/50 backdrop-blur-sm',
                  rarityText(item.rarity),
                )}>
                  ×{item.count}
                </div>

                {/* Art */}
                <div className="flex items-center justify-center pt-4 pb-2 px-3" style={{ minHeight: 96 }}>
                  {img ? (
                    <img
                      src={img}
                      alt={item.character_name}
                      draggable={false}
                      className="object-contain w-full drop-shadow-lg"
                      style={{ maxHeight: 90 }}
                    />
                  ) : (
                    <span className={cn('text-4xl font-black select-none', rarityText(item.rarity))}>
                      {item.character_name[0]}
                    </span>
                  )}
                </div>

                {/* Name + rarity */}
                <div className="px-2 pb-3 text-center">
                  <div className={cn('text-xs font-semibold leading-tight truncate', rarityText(item.rarity))}>
                    {item.character_name}
                  </div>
                  <div className={cn('text-[9px] uppercase tracking-widest opacity-60 mt-0.5', rarityText(item.rarity))}>
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
