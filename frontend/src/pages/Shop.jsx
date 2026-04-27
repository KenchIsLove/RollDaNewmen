import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { cn } from '../utils/cn'
import PageWrapper from '../components/PageWrapper'

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
      className={cn(
        'relative bg-zinc-900 border rounded-2xl p-6 overflow-hidden transition-colors duration-300',
        flash ? 'border-purple-500' : 'border-zinc-800',
      )}
      style={flash ? { boxShadow: '0 0 32px rgba(168,85,247,0.35)' } : undefined}
    >
      {flash && (
        <motion.div
          initial={{ opacity: 0.4 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0 bg-purple-600/10 pointer-events-none"
        />
      )}

      <div className="flex justify-between items-start mb-5">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-white">{label}</h3>
          <p className="text-gray-500 text-sm mt-1">{description}</p>
        </div>
        <div className="text-right ml-4 shrink-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={level}
              initial={{ y: -12, opacity: 0 }}
              animate={{ y: 0,   opacity: 1 }}
              exit={{   y:  12, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              className="text-3xl font-bold text-purple-400 tabular-nums"
            >
              {level}
            </motion.div>
          </AnimatePresence>
          <div className="text-xs text-gray-600 mt-0.5">current level</div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <div className="text-yellow-400 font-semibold tabular-nums">{price.toLocaleString()} coins</div>
          <div className="text-gray-600 text-xs mt-0.5">→ level {level + 1}</div>
        </div>
        <motion.button
          onClick={handleBuy}
          disabled={buying || !canAfford}
          whileHover={!buying && canAfford ? { scale: 1.05 } : {}}
          whileTap={!buying  && canAfford ? { scale: 0.95 } : {}}
          className="bg-gradient-to-r from-purple-700 to-violet-600 hover:from-purple-600 hover:to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg text-sm font-medium transition-all"
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
        className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full"
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
        <h1 className="text-2xl font-bold text-purple-400">Shop</h1>
        <p className="text-gray-500 text-sm mt-1">Spend coins to get an edge</p>
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
