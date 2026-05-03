import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { rarityHex } from '../utils/rarity'
import { THEMES, DEFAULT_THEME, getTheme } from '../utils/themes'
import { CHAR_MAP } from '../utils/gameData'
import { cn } from '../utils/cn'
import PageWrapper from '../components/PageWrapper'

const ACCENT          = '#f59e42'
const NEUTRAL_BORDER  = '#3d3e4a'
const DEFAULT_BANNER  = '#22232d'

const BIO_MAX_LEN     = 2000
const TITLE_MAX_LEN   = 60
const SHOWCASE_MAX    = 3

const section = {
  hidden:  { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 22 } },
}

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
}

function StatCard({ label, value, valueColor = '#f4f4f5' }) {
  return (
    <motion.div
      variants={section}
      className="bg-card rounded-xl p-4 text-center"
      style={{ border: `2px solid ${NEUTRAL_BORDER}` }}
    >
      <div
        className="text-xl tabular-nums"
        style={{ color: valueColor, fontWeight: 800 }}
      >
        {value}
      </div>
      <div className="text-text-muted text-xs mt-1">{label}</div>
    </motion.div>
  )
}

function SectionHeader({ children, color = ACCENT }) {
  return (
    <h2
      className="uppercase mb-3"
      style={{
        color,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '1px',
      }}
    >
      {children}
    </h2>
  )
}

// ── View-mode showcase shelf ──────────────────────────────────────────────────

function ShowcaseShelf({ characters }) {
  if (!characters || characters.length === 0) return null
  return (
    <motion.section variants={section}>
      <SectionHeader color={ACCENT}>Showcase</SectionHeader>
      <div className={cn(
        'grid gap-3',
        characters.length === 1 ? 'grid-cols-1 max-w-xs'
        : characters.length === 2 ? 'grid-cols-2'
        : 'grid-cols-3',
      )}>
        {characters.map(char => {
          const img   = CHAR_MAP[char.name]?.image
          const color = rarityHex(char.base_rarity)
          return (
            <div
              key={char.id}
              className="rounded-xl p-3 flex flex-col items-center gap-2 transition-all duration-200 hover:-translate-y-1 bg-card"
              style={{ border: `2.5px solid ${color}` }}
            >
              {img ? (
                <img src={img} alt={char.name} draggable={false} className="w-14 h-14 sm:w-16 sm:h-16 object-contain" />
              ) : (
                <div
                  className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center text-2xl"
                  style={{ color, fontWeight: 800 }}
                >
                  {char.name[0]}
                </div>
              )}
              <div
                className="text-center truncate w-full text-text-primary"
                style={{ fontSize: 14, fontWeight: 700 }}
              >
                {char.name}
              </div>
              <div
                className="uppercase"
                style={{
                  color,
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '0.5px',
                }}
              >
                {char.base_rarity}
              </div>
            </div>
          )
        })}
      </div>
    </motion.section>
  )
}

// ── Edit-mode theme picker ────────────────────────────────────────────────────

function ThemePicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
      {Object.entries(THEMES).map(([key, t]) => {
        const selected = value === key
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className="flex flex-col items-center gap-1.5 py-2 px-1 rounded-lg transition-all"
            style={{
              border: selected ? `2px solid ${ACCENT}` : '2px solid transparent',
              backgroundColor: selected ? '#2d2e3a' : 'transparent',
            }}
          >
            <div
              className="w-8 h-8 rounded-full"
              style={{ backgroundColor: t.primary }}
            />
            <span
              className="text-[11px]"
              style={{ color: selected ? '#f4f4f5' : '#8b8b98', fontWeight: selected ? 700 : 500 }}
            >
              {t.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ── Edit-mode showcase picker ─────────────────────────────────────────────────

function ShowcasePicker({ inventory, value, onChange }) {
  const isSelected = (id) => value.includes(id)
  const isFull     = value.length >= SHOWCASE_MAX

  function toggle(id) {
    if (isSelected(id)) onChange(value.filter(v => v !== id))
    else if (!isFull)   onChange([...value, id])
  }

  const ownedItems = useMemo(
    () => (inventory || []).filter(i => i.character_id != null && i.count > 0),
    [inventory],
  )

  if (ownedItems.length === 0) {
    return (
      <p className="text-xs text-text-muted italic px-1">
        Roll some characters first to fill your showcase.
      </p>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2 px-0.5">
        <span className="text-xs text-text-muted tabular-nums">{value.length}/{SHOWCASE_MAX} selected</span>
        {value.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-[11px] text-text-muted hover:text-red-400 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>
      <div
        className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-64 overflow-y-auto p-2 rounded-lg bg-base"
        style={{ border: `2px solid ${NEUTRAL_BORDER}` }}
      >
        {ownedItems.map(item => {
          const selected = isSelected(item.character_id)
          const disabled = isFull && !selected
          const img      = CHAR_MAP[item.character_name]?.image
          const color    = rarityHex(item.rarity)
          return (
            <button
              key={item.character_id}
              type="button"
              onClick={() => toggle(item.character_id)}
              disabled={disabled}
              className="relative rounded-lg p-1.5 text-center transition-all bg-card disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ border: selected ? `2.5px solid ${color}` : `2px solid ${NEUTRAL_BORDER}` }}
            >
              {img ? (
                <img src={img} alt={item.character_name} className="w-10 h-10 mx-auto object-contain" draggable={false} />
              ) : (
                <div
                  className="w-10 h-10 mx-auto flex items-center justify-center text-lg"
                  style={{ color, fontWeight: 800 }}
                >
                  {item.character_name[0]}
                </div>
              )}
              <div
                className="text-[10px] mt-1 truncate"
                style={{ color: selected ? color : '#b4b4be', fontWeight: 700 }}
              >
                {item.character_name}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Profile() {
  const { username: paramUsername } = useParams()
  const { username: myUsername }    = useAuth()

  const isSelf = paramUsername === 'me'
    || (paramUsername && myUsername && paramUsername.toLowerCase() === myUsername.toLowerCase())
  const targetUsername = paramUsername === 'me' ? myUsername : paramUsername?.toLowerCase()

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [editing, setEditing] = useState(false)

  const [editAvatar,       setEditAvatar]       = useState('')
  const [editBio,          setEditBio]          = useState('')
  const [editBanner,       setEditBanner]       = useState(ACCENT)
  const [editTitle,        setEditTitle]        = useState('')
  const [editBannerImg,    setEditBannerImg]    = useState('')
  const [editTheme,        setEditTheme]        = useState(DEFAULT_THEME)
  const [editShowcase,     setEditShowcase]     = useState([])
  const [inventory,        setInventory]        = useState(null)
  const [saving,           setSaving]           = useState(false)

  const { addToast } = useToast()

  useEffect(() => {
    if (!targetUsername) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setProfile(null)
    setEditing(false)
    const fetcher = isSelf ? api.myProfile() : api.playerProfile(targetUsername)
    fetcher
      .then(p => { if (!cancelled) setProfile(p) })
      .catch(err => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [targetUsername, isSelf])

  async function openEdit() {
    setEditAvatar(profile.avatar_url || '')
    setEditBio(profile.bio || '')
    setEditBanner(profile.banner_color || ACCENT)
    setEditTitle(profile.display_title || '')
    setEditBannerImg(profile.banner_image_url || '')
    setEditTheme(profile.theme_preset || DEFAULT_THEME)
    setEditShowcase((profile.showcase || []).map(c => c.id))
    setEditing(true)
    if (inventory == null) {
      try {
        const inv = await api.myInventory()
        setInventory(inv?.items ?? [])
      } catch {
        setInventory([])
      }
    }
  }

  const showcaseInvalid =
    editShowcase.length > SHOWCASE_MAX ||
    new Set(editShowcase).size !== editShowcase.length
  const bannerImgInvalid =
    editBannerImg.trim() !== '' && !/^https?:\/\//i.test(editBannerImg.trim())
  const avatarInvalid =
    editAvatar.trim() !== '' && !/^https?:\/\//i.test(editAvatar.trim())
  const saveDisabled = saving || showcaseInvalid || bannerImgInvalid || avatarInvalid
  const saveTooltip =
    showcaseInvalid  ? 'Showcase must be 0–3 unique characters'
    : bannerImgInvalid ? 'Banner image URL must start with http:// or https://'
    : avatarInvalid    ? 'Avatar URL must start with http:// or https://'
    : undefined

  async function handleSave() {
    setSaving(true)
    try {
      const updated = await api.updateProfile({
        avatar_url:             editAvatar.trim() || null,
        bio:                    editBio.trim()    || null,
        banner_color:           editBanner,
        display_title:          editTitle,
        banner_image_url:       editBannerImg.trim() || null,
        theme_preset:           editTheme,
        showcase_character_ids: editShowcase,
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
        className="w-8 h-8 border-2 rounded-full"
        style={{ borderColor: ACCENT, borderTopColor: 'transparent' }}
      />
    </div>
  )

  if (error || !profile) return (
    <PageWrapper>
      <div className="text-center py-20">
        <p className="text-text-secondary text-lg mb-2">User not found</p>
        <p className="text-text-muted text-sm">{error || `No player named "${paramUsername}".`}</p>
      </div>
    </PageWrapper>
  )

  const {
    username, created_at, stats, avatar_url, bio, banner_color,
    top_inventory, display_title, banner_image_url, theme_preset, showcase,
  } = profile
  const coins      = profile.coins
  const upgrades   = profile.upgrades
  const rarestImg  = stats.rarest_character ? CHAR_MAP[stats.rarest_character]?.image : null
  const theme      = getTheme(theme_preset)
  const bannerBg   = banner_color || DEFAULT_BANNER

  return (
    <PageWrapper>
      <motion.div variants={stagger} initial="hidden" animate="visible" className="flex flex-col gap-6">

        {/* Banner + avatar + name */}
        <motion.div
          variants={section}
          className="rounded-2xl overflow-hidden"
          style={{ border: `2px solid ${NEUTRAL_BORDER}` }}
        >
          <div
            className="h-36 sm:h-44 lg:h-56 w-full bg-cover bg-center"
            style={{
              backgroundColor: bannerBg,
              backgroundImage: banner_image_url ? `url(${banner_image_url})` : undefined,
            }}
          />

          {/* Bio area gets a warm tint via card surface, with subtle accent left edge */}
          <div
            className="bg-card px-5 pb-4"
            style={{ borderLeft: `4px solid ${ACCENT}` }}
          >
            <div className="flex items-end justify-between -mt-10 mb-3">
              {avatar_url ? (
                <img
                  src={avatar_url}
                  alt="avatar"
                  className="w-20 h-20 rounded-full object-cover shadow-xl"
                  style={{ border: `4px solid #22232d`, outline: `2px solid ${theme.primary}`, outlineOffset: -1 }}
                />
              ) : (
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-2xl text-text-primary shadow-xl"
                  style={{
                    backgroundColor: bannerBg,
                    border: '4px solid #22232d',
                    outline: `2px solid ${theme.primary}`,
                    outlineOffset: -1,
                    fontWeight: 800,
                  }}
                >
                  {username[0].toUpperCase()}
                </div>
              )}

              {isSelf && !editing && (
                <button
                  onClick={openEdit}
                  className="px-4 py-2 rounded-lg text-sm transition-all"
                  style={{
                    background: 'transparent',
                    border: '2px solid #3d3e4a',
                    color: '#e4e4e7',
                    fontWeight: 700,
                  }}
                >
                  Edit Profile
                </button>
              )}
            </div>

            <h1 className="text-2xl text-text-primary" style={{ fontWeight: 800 }}>{username}</h1>
            {display_title && (
              <p
                className="text-sm italic mt-0.5"
                style={{ color: theme.primary, fontWeight: 600 }}
              >
                {display_title}
              </p>
            )}
            {bio && (
              <p className="text-text-secondary text-sm mt-2 leading-relaxed whitespace-pre-wrap break-words">
                {bio}
              </p>
            )}
            <p className="text-text-muted text-xs mt-1.5">
              Joined {new Date(created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </motion.div>

        {/* Edit form (self only) */}
        <AnimatePresence>
          {isSelf && editing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden"
            >
              <div
                className="bg-card rounded-2xl p-5 flex flex-col gap-5"
                style={{ border: `2px solid ${NEUTRAL_BORDER}` }}
              >
                <SectionHeader color={ACCENT}>Edit Profile</SectionHeader>

                <div>
                  <label
                    className="uppercase mb-1.5 block"
                    style={{ color: '#b4b4be', fontSize: 11, fontWeight: 700, letterSpacing: '1px' }}
                  >
                    Display Title
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value.slice(0, TITLE_MAX_LEN))}
                    maxLength={TITLE_MAX_LEN}
                    placeholder="e.g. Just trying my best"
                    className="w-full bg-surface border-[1.5px] border-line rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder-text-dim focus:outline-none focus:border-accent transition-colors"
                  />
                  <div className="text-[11px] text-text-muted text-right mt-1">{editTitle.length}/{TITLE_MAX_LEN}</div>
                </div>

                <div>
                  <label
                    className="uppercase mb-1.5 block"
                    style={{ color: '#b4b4be', fontSize: 11, fontWeight: 700, letterSpacing: '1px' }}
                  >
                    Avatar URL
                  </label>
                  <input
                    type="url"
                    value={editAvatar}
                    onChange={e => setEditAvatar(e.target.value)}
                    placeholder="https://example.com/avatar.png"
                    className={cn(
                      'w-full bg-surface rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder-text-dim focus:outline-none transition-colors',
                      avatarInvalid ? 'border-[1.5px] border-red-500' : 'border-[1.5px] border-line focus:border-accent',
                    )}
                  />
                </div>

                <div>
                  <label
                    className="uppercase mb-1.5 block"
                    style={{ color: '#b4b4be', fontSize: 11, fontWeight: 700, letterSpacing: '1px' }}
                  >
                    Banner Image URL
                  </label>
                  <input
                    type="url"
                    value={editBannerImg}
                    onChange={e => setEditBannerImg(e.target.value)}
                    placeholder="https://example.com/banner.jpg (optional)"
                    className={cn(
                      'w-full bg-surface rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder-text-dim focus:outline-none transition-colors',
                      bannerImgInvalid ? 'border-[1.5px] border-red-500' : 'border-[1.5px] border-line focus:border-accent',
                    )}
                  />
                  <p className="text-[11px] text-text-muted mt-1">Image takes priority over banner color when set.</p>
                </div>

                <div>
                  <label
                    className="uppercase mb-1.5 block"
                    style={{ color: '#b4b4be', fontSize: 11, fontWeight: 700, letterSpacing: '1px' }}
                  >
                    Bio
                  </label>
                  <textarea
                    value={editBio}
                    onChange={e => setEditBio(e.target.value.slice(0, BIO_MAX_LEN))}
                    maxLength={BIO_MAX_LEN}
                    rows={5}
                    placeholder="Tell the world about yourself..."
                    className="w-full bg-surface border-[1.5px] border-line rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder-text-dim focus:outline-none focus:border-accent transition-colors resize-y"
                  />
                  <div className="text-[11px] text-text-muted text-right mt-1">{editBio.length}/{BIO_MAX_LEN}</div>
                </div>

                <div>
                  <label
                    className="uppercase mb-1.5 block"
                    style={{ color: '#b4b4be', fontSize: 11, fontWeight: 700, letterSpacing: '1px' }}
                  >
                    Banner Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={editBanner}
                      onChange={e => setEditBanner(e.target.value)}
                      className="w-12 h-10 rounded-lg cursor-pointer border-0 bg-transparent"
                    />
                    <div
                      className="flex-1 h-10 rounded-lg"
                      style={{ backgroundColor: editBanner, border: `1.5px solid ${NEUTRAL_BORDER}` }}
                    />
                    <span className="text-sm text-text-secondary font-mono w-20">{editBanner}</span>
                  </div>
                </div>

                <div>
                  <label
                    className="uppercase mb-2 block"
                    style={{ color: '#b4b4be', fontSize: 11, fontWeight: 700, letterSpacing: '1px' }}
                  >
                    Theme
                  </label>
                  <ThemePicker value={editTheme} onChange={setEditTheme} />
                </div>

                <div>
                  <label
                    className="uppercase mb-2 block"
                    style={{ color: '#b4b4be', fontSize: 11, fontWeight: 700, letterSpacing: '1px' }}
                  >
                    Showcase (up to {SHOWCASE_MAX})
                  </label>
                  {inventory == null ? (
                    <p className="text-xs text-text-muted italic px-1">Loading inventory…</p>
                  ) : (
                    <ShowcasePicker
                      inventory={inventory}
                      value={editShowcase}
                      onChange={setEditShowcase}
                    />
                  )}
                </div>

                <div className="flex gap-2 justify-end pt-1">
                  <button
                    onClick={() => setEditing(false)}
                    className="px-4 py-2 text-sm rounded-lg transition-all"
                    style={{
                      background: 'transparent',
                      border: '2px solid #3d3e4a',
                      color: '#e4e4e7',
                      fontWeight: 700,
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saveDisabled}
                    title={saveTooltip}
                    className="px-5 py-2 text-sm rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ backgroundColor: ACCENT, color: '#1a1b23', fontWeight: 800 }}
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Showcase shelf */}
        <ShowcaseShelf characters={showcase} />

        {/* Balance (self only) */}
        {isSelf && coins != null && (
          <motion.section variants={section}>
            <SectionHeader color={ACCENT}>Balance</SectionHeader>
            <div
              className="bg-card rounded-xl p-4 flex items-center gap-3"
              style={{ border: `2px solid ${NEUTRAL_BORDER}` }}
            >
              <span aria-hidden="true" className="text-xl">🪙</span>
              <span
                className="text-2xl tabular-nums"
                style={{ color: ACCENT, fontWeight: 800 }}
              >
                {coins.toLocaleString()}
              </span>
              <span className="text-text-muted text-sm">coins</span>
            </div>
          </motion.section>
        )}

        {/* Stats */}
        <motion.section variants={section}>
          <SectionHeader color="#b4b4be">Stats</SectionHeader>
          <motion.div variants={stagger} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <StatCard label="Total Rolls"  value={stats.total_rolls.toLocaleString()} />
            <StatCard label="Rarity Score" value={stats.rarity_score.toLocaleString()} valueColor={ACCENT} />
            {stats.rarest_character ? (
              <>
                <motion.div
                  variants={section}
                  className="bg-card rounded-xl p-4 text-center flex flex-col items-center gap-1"
                  style={{ border: `2px solid ${NEUTRAL_BORDER}` }}
                >
                  {rarestImg && (
                    <img src={rarestImg} alt={stats.rarest_character} className="w-10 h-10 object-contain" />
                  )}
                  <div
                    className="leading-snug"
                    style={{ color: rarityHex(stats.rarest_rarity), fontSize: 13, fontWeight: 700 }}
                  >
                    {stats.rarest_character}
                  </div>
                  <div className="text-text-muted text-xs">Rarest Owned</div>
                </motion.div>
                <motion.div
                  variants={section}
                  className="bg-card rounded-xl p-4 text-center"
                  style={{ border: `2px solid ${NEUTRAL_BORDER}` }}
                >
                  <div
                    className="text-lg uppercase"
                    style={{ color: rarityHex(stats.rarest_rarity), fontWeight: 800, letterSpacing: '0.5px' }}
                  >
                    {stats.rarest_rarity}
                  </div>
                  <div className="text-text-muted text-xs mt-1">Rarity</div>
                </motion.div>
              </>
            ) : (
              <motion.div
                variants={section}
                className="col-span-2 bg-card rounded-xl p-4 text-center text-text-muted text-sm"
                style={{ border: `2px solid ${NEUTRAL_BORDER}` }}
              >
                No characters rolled yet
              </motion.div>
            )}
          </motion.div>
        </motion.section>

        {/* Top inventory */}
        {top_inventory && top_inventory.length > 0 && (
          <motion.section variants={section}>
            <SectionHeader color="#eab308">Top Items</SectionHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {top_inventory.map(item => {
                const img   = CHAR_MAP[item.character_name]?.image
                const color = rarityHex(item.rarity)
                return (
                  <div
                    key={item.character_name}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-card"
                    style={{ border: `2.5px solid ${color}` }}
                  >
                    {img ? (
                      <img src={img} alt="" className="w-10 h-10 object-contain flex-shrink-0" />
                    ) : (
                      <div
                        className="w-10 h-10 rounded flex items-center justify-center text-lg"
                        style={{ color, fontWeight: 800 }}
                      >
                        {item.character_name[0]}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div
                        className="truncate"
                        style={{ color, fontSize: 14, fontWeight: 700 }}
                      >
                        {item.character_name}
                      </div>
                      <div
                        className="uppercase"
                        style={{
                          color,
                          fontSize: 10,
                          fontWeight: 800,
                          letterSpacing: '0.5px',
                          opacity: 0.85,
                        }}
                      >
                        {item.rarity} · ×{item.count}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.section>
        )}

        {/* Upgrades (self only) */}
        {isSelf && upgrades && (
          <motion.section variants={section}>
            <SectionHeader color="#b4b4be">Upgrades</SectionHeader>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Luck Level"  value={`Lv ${upgrades.luck_level}`}  valueColor={ACCENT} />
              <StatCard label="Speed Level" value={`Lv ${upgrades.speed_level}`} valueColor={ACCENT} />
            </div>
          </motion.section>
        )}

      </motion.div>
    </PageWrapper>
  )
}
