import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { api } from '../api/client'
import { rarityHex } from '../utils/rarity'
import PageWrapper from '../components/PageWrapper'

const ACCENT = '#f59e42'

const BOARDS = [
  { key: 'rarity_score', label: 'Rarity Score' },
  { key: 'total_rolls',  label: 'Total Rolls' },
  { key: 'rarest_char',  label: 'Rarest Pull' },
]

const RANK_LABELS = ['1st', '2nd', '3rd']
const RANK_COLORS = ['#eab308', '#cbd5e1', '#b45309']

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
        className="text-2xl text-text-primary mb-6"
        style={{ fontWeight: 800 }}
      >
        Leaderboard
      </motion.h1>

      {/* Tabs — orange underline on active */}
      <LayoutGroup>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="flex gap-1 mb-6 overflow-x-auto md:flex-wrap pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 border-b border-line"
        >
          {BOARDS.map(b => {
            const active = board === b.key
            return (
              <button
                key={b.key}
                onClick={() => setBoard(b.key)}
                className="relative shrink-0 px-3 sm:px-4 py-2.5 text-sm transition-colors whitespace-nowrap"
                style={{
                  color: active ? ACCENT : '#8b8b98',
                  fontWeight: active ? 700 : 500,
                }}
              >
                <span className="relative z-10">{b.label}</span>
                {active && (
                  <motion.div
                    layoutId="lb-tab-underline"
                    className="absolute left-0 right-0 -bottom-px h-[2px]"
                    style={{ backgroundColor: ACCENT }}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            )
          })}
        </motion.div>
      </LayoutGroup>

      {board === 'rarity_score' && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-text-muted text-xs mb-4"
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
              className="w-7 h-7 border-2 rounded-full"
              style={{ borderColor: ACCENT, borderTopColor: 'transparent' }}
            />
          </motion.div>
        ) : !data?.entries?.length ? (
          <motion.p
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center text-text-muted py-16"
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
            className="bg-card border-2 border-line rounded-xl overflow-hidden"
          >
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '2px solid #3d3e4a' }}>
                  <th
                    className="text-left px-3 sm:px-5 py-3.5 uppercase w-12 sm:w-16"
                    style={{ color: ACCENT, fontSize: 11, fontWeight: 700, letterSpacing: '1px' }}
                  >
                    Rank
                  </th>
                  <th
                    className="text-left px-2 sm:px-4 py-3.5 uppercase"
                    style={{ color: ACCENT, fontSize: 11, fontWeight: 700, letterSpacing: '1px' }}
                  >
                    Player
                  </th>
                  <th
                    className="text-right px-3 sm:px-5 py-3.5 uppercase"
                    style={{ color: ACCENT, fontSize: 11, fontWeight: 700, letterSpacing: '1px' }}
                  >
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
                    style={{ backgroundColor: i % 2 === 0 ? '#1a1b23' : '#22232d' }}
                    className="hover:brightness-110 transition-all"
                  >
                    <td
                      className="px-3 sm:px-5 py-3.5 tabular-nums"
                      style={{
                        color: RANK_COLORS[entry.rank - 1] ?? '#8b8b98',
                        fontWeight: 800,
                      }}
                    >
                      {RANK_LABELS[entry.rank - 1] ?? `#${entry.rank}`}
                    </td>
                    <td className="px-2 sm:px-4 py-3.5 max-w-[140px] sm:max-w-none">
                      <Link
                        to={`/profile/${entry.username}`}
                        className="text-text-primary hover:text-accent transition-colors block truncate"
                        style={{ fontWeight: 700 }}
                      >
                        {entry.username}
                      </Link>
                    </td>
                    <td className="px-3 sm:px-5 py-3.5 text-right text-text-secondary tabular-nums">
                      {board === 'rarest_char' ? (
                        entry.rarest_character_name ? (
                          <span className="whitespace-nowrap inline-flex items-center gap-2 justify-end">
                            <span
                              aria-hidden="true"
                              className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: rarityHex(entry.rarest_character_rarity) }}
                            />
                            <span className="text-text-primary" style={{ fontWeight: 700 }}>
                              {entry.rarest_character_name}
                            </span>
                            <span
                              className="uppercase"
                              style={{
                                color: rarityHex(entry.rarest_character_rarity),
                                fontWeight: 800,
                                letterSpacing: '0.5px',
                                fontSize: 11,
                              }}
                            >
                              {entry.rarest_character_rarity}
                            </span>
                          </span>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )
                      ) : (
                        typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value
                      )}
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
