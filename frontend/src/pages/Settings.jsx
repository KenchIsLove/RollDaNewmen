import { useState } from 'react'
import { motion } from 'framer-motion'
import PageWrapper from '../components/PageWrapper'
import { getSfxVolume, playTick, SFX_VOLUME_KEY } from '../utils/sounds'

const ACCENT = '#f59e42'

export default function Settings() {
  const [volume, setVolume] = useState(getSfxVolume)

  function handleChange(e) {
    const next = Number(e.target.value)
    setVolume(next)
    try { localStorage.setItem(SFX_VOLUME_KEY, String(next)) } catch {}
  }

  return (
    <PageWrapper>
      <motion.h1
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl text-text-primary mb-1"
        style={{ fontWeight: 800 }}
      >
        Settings
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.05 }}
        className="text-text-muted text-sm mb-6"
      >
        Local preferences — saved in this browser only.
      </motion.p>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 22 }}
      >
        <h2
          className="uppercase mb-3"
          style={{ color: ACCENT, fontSize: 11, fontWeight: 700, letterSpacing: '1px' }}
        >
          Sound
        </h2>
        <div
          className="bg-card rounded-xl p-5 flex flex-col gap-5"
          style={{ border: '2px solid #3d3e4a' }}
        >
          <div>
            <label htmlFor="sfx-volume" className="flex items-center justify-between text-sm text-text-secondary mb-2">
              <span>Sound effects volume</span>
              <span
                className="tabular-nums"
                style={{ color: ACCENT, fontWeight: 800 }}
              >
                {volume}
              </span>
            </label>
            <input
              id="sfx-volume"
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={handleChange}
              className="w-full cursor-pointer"
              style={{ accentColor: ACCENT }}
            />
            <div className="flex justify-between text-[10px] text-text-muted mt-1">
              <span>0</span>
              <span>50</span>
              <span>100</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1 border-t border-line">
            <p className="text-xs text-text-muted">
              Adjust to taste — changes apply to the next sound that plays.
            </p>
            <motion.button
              type="button"
              onClick={() => playTick()}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="shrink-0 px-4 py-2 text-sm rounded-lg transition-all"
              style={{
                background: 'transparent',
                border: '2px solid #3d3e4a',
                color: '#e4e4e7',
                fontWeight: 700,
              }}
            >
              Test sound
            </motion.button>
          </div>
        </div>
      </motion.section>
    </PageWrapper>
  )
}
