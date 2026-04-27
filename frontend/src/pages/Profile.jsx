import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../api/client'
import { useToast } from '../context/ToastContext'
import { rarityText } from '../utils/rarity'
import { CHAR_MAP } from '../utils/gameData'
import { cn } from '../utils/cn'
import PageWrapper from '../components/PageWrapper'

const section = {
  hidden:  { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 22 } },
}

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
}

function StatCard({ label, value, valueClass = 'text-white' }) {
  return (
    <motion.div
      variants={section}
      className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center"
    >
      <div className={`text-xl font-bold tabular-nums ${valueClass}`}>{value}</div>
      <div className="text-gray-600 text-xs mt-1">{label}</div>
    </motion.div>
  )
}

export default function Profile() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [editing, setEditing] = useState(false)
  const [editAvatar,  setEditAvatar]  = useState('')
  const [editBio,     setEditBio]     = useState('')
  const [editBanner,  setEditBanner]  = useState('#7c3aed')
  const [saving,  setSaving]  = useState(false)

  const { addToast } = useToast()

  useEffect(() => {
    api.myProfile()
      .then(setProfile)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  function openEdit() {
    setEditAvatar(profile.avatar_url || '')
    setEditBio(profile.bio || '')
    setEditBanner(profile.banner_color || '#7c3aed')
    setEditing(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const updated = await api.updateProfile({
        avatar_url:   editAvatar.trim() || null,
        bio:          editBio.trim()    || null,
        banner_color: editBanner,
      })
      setProfile(updated)
      setEditing(false)
      addToast('Profile updated!', 'success')
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setSaving(false)
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

  if (error) return (
    <PageWrapper>
      <p className="text-center text-red-400 py-20">{error}</p>
    </PageWrapper>
  )

  const { username, coins, created_at, stats, upgrades, avatar_url, bio, banner_color } = profile
  const rarestImg = stats.rarest_character ? CHAR_MAP[stats.rarest_character]?.image : null

  return (
    <PageWrapper>
      <motion.div variants={stagger} initial="hidden" animate="visible" className="flex flex-col gap-6">

        {/* Banner + avatar + name */}
        <motion.div variants={section} className="rounded-2xl overflow-hidden border border-zinc-800">
          {/* Banner */}
          <div
            className="h-28 w-full"
            style={{ backgroundColor: banner_color || '#7c3aed' }}
          />

          {/* Avatar row */}
          <div className="bg-zinc-900 px-5 pb-4">
            <div className="flex items-end justify-between -mt-10 mb-3">
              {/* Avatar */}
              {avatar_url ? (
                <img
                  src={avatar_url}
                  alt="avatar"
                  className="w-20 h-20 rounded-full border-4 border-zinc-900 object-cover shadow-xl"
                />
              ) : (
                <div
                  className="w-20 h-20 rounded-full border-4 border-zinc-900 flex items-center justify-center text-2xl font-black text-white shadow-xl"
                  style={{ backgroundColor: banner_color || '#7c3aed' }}
                >
                  {username[0].toUpperCase()}
                </div>
              )}

              {/* Edit button */}
              <button
                onClick={openEdit}
                className="px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-gray-300 hover:text-white hover:border-zinc-600 transition-colors"
              >
                Edit Profile
              </button>
            </div>

            <h1 className="text-2xl font-bold text-white">{username}</h1>
            {bio && <p className="text-gray-400 text-sm mt-1 leading-relaxed">{bio}</p>}
            <p className="text-gray-600 text-xs mt-1.5">
              Joined {new Date(created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </motion.div>

        {/* Edit form */}
        <AnimatePresence>
          {editing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden"
            >
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-4">
                <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-widest">Edit Profile</h2>

                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">Avatar URL</label>
                  <input
                    type="url"
                    value={editAvatar}
                    onChange={e => setEditAvatar(e.target.value)}
                    placeholder="https://example.com/avatar.png"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">Bio</label>
                  <textarea
                    value={editBio}
                    onChange={e => setEditBio(e.target.value)}
                    maxLength={300}
                    rows={3}
                    placeholder="Tell the world about yourself..."
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors resize-none"
                  />
                  <div className="text-[11px] text-gray-600 text-right mt-1">{editBio.length}/300</div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">Banner Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={editBanner}
                      onChange={e => setEditBanner(e.target.value)}
                      className="w-12 h-10 rounded-lg cursor-pointer border-0 bg-transparent"
                    />
                    <div
                      className="flex-1 h-10 rounded-lg border border-zinc-700"
                      style={{ backgroundColor: editBanner }}
                    />
                    <span className="text-sm text-gray-400 font-mono w-20">{editBanner}</span>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-1">
                  <button
                    onClick={() => setEditing(false)}
                    className="px-4 py-2 text-sm rounded-lg bg-zinc-800 border border-zinc-700 text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-5 py-2 text-sm rounded-lg bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Balance */}
        <motion.section variants={section}>
          <h2 className="text-xs text-gray-600 uppercase tracking-widest mb-3">Balance</h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-3">
            <span className="text-yellow-500 text-xl">◈</span>
            <span className="text-yellow-400 text-2xl font-bold tabular-nums">{coins.toLocaleString()}</span>
            <span className="text-gray-600 text-sm">coins</span>
          </div>
        </motion.section>

        {/* Stats */}
        <motion.section variants={section}>
          <h2 className="text-xs text-gray-600 uppercase tracking-widest mb-3">Stats</h2>
          <motion.div variants={stagger} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total Rolls"   value={stats.total_rolls.toLocaleString()} />
            <StatCard label="Rarity Score"  value={stats.rarity_score.toLocaleString()} valueClass="text-purple-400" />
            {stats.rarest_character ? (
              <>
                <motion.div
                  variants={section}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center flex flex-col items-center gap-1"
                >
                  {rarestImg && (
                    <img src={rarestImg} alt={stats.rarest_character} className="w-10 h-10 object-contain" />
                  )}
                  <div className={cn('text-xs font-bold leading-snug', rarityText(stats.rarest_rarity))}>
                    {stats.rarest_character}
                  </div>
                  <div className="text-gray-600 text-xs">Rarest Owned</div>
                </motion.div>
                <motion.div
                  variants={section}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center"
                >
                  <div className={cn('text-lg font-bold', rarityText(stats.rarest_rarity))}>
                    {stats.rarest_rarity}
                  </div>
                  <div className="text-gray-600 text-xs mt-1">Rarity</div>
                </motion.div>
              </>
            ) : (
              <motion.div
                variants={section}
                className="col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center text-gray-600 text-sm"
              >
                No characters rolled yet
              </motion.div>
            )}
          </motion.div>
        </motion.section>

        {/* Upgrades */}
        <motion.section variants={section}>
          <h2 className="text-xs text-gray-600 uppercase tracking-widest mb-3">Upgrades</h2>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Luck Level"  value={`Lv ${upgrades.luck_level}`}  valueClass="text-purple-400" />
            <StatCard label="Speed Level" value={`Lv ${upgrades.speed_level}`} valueClass="text-purple-400" />
          </div>
        </motion.section>

      </motion.div>
    </PageWrapper>
  )
}
