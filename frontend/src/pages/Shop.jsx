import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import PageWrapper from '../components/PageWrapper'

const ACCENT = '#f59e42'

function upgradePrice(level) {
  return 500 * Math.pow(2, level)
}

function UpgradeCard({ id, label, description, level, coins, onBuy, buying, index }) {
  const price     = upgradePrice(level)
  const canAfford = coins !== null && coins >= price
  const [flash, setFlash] = useState(false)

  async function handleBuy() {
    await onBuy(id)
    setFlash(true)
    setTimeout(() => setFlash(false), 600)
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: index % 2 === 0 ? -24 : 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 22, delay: index * 0.1 }}
      className="relative bg-card rounded-2xl p-6 overflow-hidden transition-all duration-300"
      style={{
        border: '2px solid #3d3e4a',
        borderLeftWidth: '4px',
        borderLeftColor: ACCENT,
        boxShadow: flash ? `0 0 24px ${ACCENT}55` : undefined,
      }}
    >
      {flash && (
        <motion.div
          initial={{ opacity: 0.18 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundColor: ACCENT }}
        />
      )}

      <div className="flex justify-between items-start mb-5">
        <div className="flex-1">
          <h3 className="text-lg text-text-primary" style={{ fontWeight: 700 }}>{label}</h3>
          <p className="text-text-muted text-sm mt-1">{description}</p>
        </div>
        <div className="text-right ml-4 shrink-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={level}
              initial={{ y: -12, opacity: 0 }}
              animate={{ y: 0,   opacity: 1 }}
              exit={{   y:  12, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              className="text-3xl tabular-nums"
              style={{ color: ACCENT, fontWeight: 800 }}
            >
              {level}
            </motion.div>
          </AnimatePresence>
          <div className="text-xs text-text-muted mt-0.5">current level</div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <div className="tabular-nums" style={{ color: ACCENT, fontWeight: 700 }}>
            🪙 {price.toLocaleString()} coins
          </div>
          <div className="text-text-muted text-xs mt-0.5">→ level {level + 1}</div>
        </div>
        <motion.button
          onClick={handleBuy}
          disabled={buying || !canAfford}
          whileHover={!buying && canAfford ? { scale: 1.04 } : {}}
          whileTap={!buying  && canAfford ? { scale: 0.96 } : {}}
          className="px-5 py-2 rounded-lg text-sm transition-all disabled:cursor-not-allowed"
          style={{
            backgroundColor: ACCENT,
            color: '#1a1b23',
            fontWeight: 800,
            opacity: buying || !canAfford ? 0.4 : 1,
          }}
        >
          {buying      ? 'Buying...'         :
           !canAfford  ? 'Not enough coins'  : 'Buy'}
        </motion.button>
      </div>
    </motion.div>
  )
}

export default function Shop() {
  const [upgrades, setUpgrades] = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [buying,   setBuying]   = useState(null)
  const { coins, updateCoins } = useAuth()
  const { addToast }           = useToast()

  useEffect(() => {
    api.myProfile()
      .then(p => setUpgrades(p.upgrades))
      .catch(err => addToast(err.message, 'error'))
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleBuy(item) {
    setBuying(item)
    try {
      const res = await api.buyUpgrade(item)
      updateCoins(res.coins_remaining)
      setUpgrades(prev => ({ ...prev, [`${item}_level`]: res.new_level }))
      addToast(`${item.charAt(0).toUpperCase() + item.slice(1)} → level ${res.new_level}!`, 'success')
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setBuying(null)
    }
  }

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

  return (
    <PageWrapper>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1
          className="text-2xl text-text-primary"
          style={{ fontWeight: 800 }}
        >
          Shop
        </h1>
        <p className="text-text-muted text-sm mt-1">Spend coins to get an edge</p>
      </motion.div>

      <div className="flex flex-col gap-4">
        <UpgradeCard
          index={0}
          id="luck"
          label="Luck Upgrade"
          description="Reduces Common weight, pushing rolls toward rarer tiers"
          level={upgrades?.luck_level ?? 0}
          coins={coins}
          onBuy={handleBuy}
          buying={buying === 'luck'}
        />
        <UpgradeCard
          index={1}
          id="speed"
          label="Speed Upgrade"
          description="Increases your roll rate limit so you can roll faster"
          level={upgrades?.speed_level ?? 0}
          coins={coins}
          onBuy={handleBuy}
          buying={buying === 'speed'}
        />
      </div>
    </PageWrapper>
  )
}
