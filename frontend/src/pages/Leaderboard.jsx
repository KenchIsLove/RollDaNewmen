import { useEffect, useState } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { api } from '../api/client'
import PageWrapper from '../components/PageWrapper'

const BOARDS = [
  { key: 'rarity_score', label: 'Rarity Score' },
  { key: 'total_rolls',  label: 'Total Rolls' },
  { key: 'rarest_char',  label: 'Rarest Pull' },
]

const RANK_LABELS = ['1st', '2nd', '3rd']
const RANK_COLORS = ['text-yellow-400', 'text-gray-300', 'text-amber-600']

const rowVariants = {
  hidden:  { opacity: 0, x: -16 },
  visible: i => ({
    opacity: 1, x: 0,
    transition: { type: 'spring', stiffness: 200, damping: 22, delay: i * 0.04 },
  }),
  exit:    { opacity: 0, x: 16, transition: { duration: 0.12 } },
}

export default function Leaderboard() {
  const [board,   setBoard]   = useState('rarity_score')
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.leaderboard(board)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [board])

  return (
    <PageWrapper>
      <motion.h1
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-purple-400 mb-6"
      >
        Leaderboard
      </motion.h1>

      {/* Tabs */}
      <LayoutGroup>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="flex gap-2 mb-6 flex-wrap"
        >
          {BOARDS.map(b => (
            <button
              key={b.key}
              onClick={() => setBoard(b.key)}
              className="relative px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {board === b.key && (
                <motion.div
                  layoutId="tab-bg"
                  className="absolute inset-0 bg-purple-700 rounded-lg"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className={`relative z-10 ${board === b.key ? 'text-white' : 'text-gray-400 hover:text-white'}`}>
                {b.label}
              </span>
            </button>
          ))}
        </motion.div>
      </LayoutGroup>

      {board === 'rarity_score' && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-gray-600 text-xs mb-4"
        >
          Score is earned per roll based on rarity — rarer pulls award exponentially more points.
        </motion.p>
      )}

      {/* Table */}
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
              className="w-7 h-7 border-2 border-purple-500 border-t-transparent rounded-full"
            />
          </motion.div>
        ) : !data?.entries?.length ? (
          <motion.p
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center text-gray-500 py-16"
          >
            No data yet.
          </motion.p>
        ) : (
          <motion.div
            key={board}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden"
          >
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-5 py-3.5 text-xs text-gray-600 font-medium uppercase tracking-wider w-16">Rank</th>
                  <th className="text-left px-4 py-3.5 text-xs text-gray-600 font-medium uppercase tracking-wider">Player</th>
                  <th className="text-right px-5 py-3.5 text-xs text-gray-600 font-medium uppercase tracking-wider">
                    {BOARDS.find(b => b.key === board)?.label}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((entry, i) => (
                  <motion.tr
                    key={`${board}-${entry.rank}`}
                    custom={i}
                    variants={rowVariants}
                    initial="hidden"
                    animate="visible"
                    className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/40 transition-colors"
                  >
                    <td className={`px-5 py-3.5 font-bold ${RANK_COLORS[entry.rank - 1] ?? 'text-gray-600'}`}>
                      {RANK_LABELS[entry.rank - 1] ?? `#${entry.rank}`}
                    </td>
                    <td className="px-4 py-3.5 text-white font-medium">{entry.username}</td>
                    <td className="px-5 py-3.5 text-right text-gray-300 tabular-nums">
                      {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </AnimatePresence>
    </PageWrapper>
  )
}
