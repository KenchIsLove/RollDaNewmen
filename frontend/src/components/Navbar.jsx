import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { cn } from '../utils/cn'

const NAV_LINKS = [
  { to: '/roll',        label: 'Roll' },
  { to: '/inventory',   label: 'Inventory' },
  { to: '/shop',        label: 'Shop' },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/trades',      label: 'Trades' },
  { to: '/profile/me',  label: 'Profile' },
  { to: '/settings',    label: 'Settings' },
]

function isProfileActive(pathname, to) {
  return pathname === to || (to === '/profile/me' && pathname.startsWith('/profile'))
}

function PlayerSearch({ fullWidth = false, onSelect }) {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState([])
  const [open,    setOpen]    = useState(false)
  const containerRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setResults([])
      return
    }
    const handle = setTimeout(() => {
      api.searchPlayers(trimmed, 10)
        .then(r => setResults(Array.isArray(r) ? r : []))
        .catch(() => setResults([]))
    }, 250)
    return () => clearTimeout(handle)
  }, [query])

  useEffect(() => {
    function onClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    function onKey(e) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  function selectPlayer(username) {
    setQuery('')
    setResults([])
    setOpen(false)
    onSelect?.()
    navigate(`/profile/${username}`)
  }

  const showDropdown = open && query.trim().length >= 2

  return (
    <div ref={containerRef} className={cn('relative', fullWidth ? 'w-full' : 'w-28 lg:w-40 shrink-0')}>
      <input
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder="Search players..."
        className="w-full bg-surface border-[1.5px] border-line rounded-lg px-2.5 py-1.5 text-xs text-text-primary placeholder-text-dim focus:outline-none focus:border-accent transition-colors"
      />
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 left-0 top-full mt-1 bg-card border-2 border-line rounded-lg shadow-xl z-50 overflow-hidden max-h-72 overflow-y-auto"
          >
            {results.length === 0 ? (
              <div className="px-3 py-2 text-xs text-text-muted">No matches</div>
            ) : (
              results.map(r => (
                <button
                  key={r.username}
                  onClick={() => selectPlayer(r.username)}
                  className="w-full flex items-center gap-2 px-2.5 py-2 hover:bg-surface transition-colors text-left"
                >
                  {r.avatar_url ? (
                    <img src={r.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-[10px] font-bold text-base flex-shrink-0">
                      {r.username[0].toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs text-text-primary truncate flex-1">{r.username}</span>
                  <span className="text-[10px] text-accent tabular-nums font-semibold">{(r.rarity_score ?? 0).toLocaleString()}</span>
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function HamburgerIcon({ open }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5"
    >
      {open ? (
        <>
          <line x1="18" y1="6"  x2="6"  y2="18" />
          <line x1="6"  y1="6"  x2="18" y2="18" />
        </>
      ) : (
        <>
          <line x1="4" y1="6"  x2="20" y2="6"  />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="18" x2="20" y2="18" />
        </>
      )}
    </svg>
  )
}

export default function Navbar() {
  const { token, username, coins, logout } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [pendingReceived, setPendingReceived] = useState(0)
  const navRef = useRef(null)

  function handleLogout() {
    logout()
    setMenuOpen(false)
    navigate('/login')
  }

  // Poll for pending received trades so the Trades link shows a badge.
  // 30s cadence is plenty — trades aren't time-critical and this is a
  // single cheap query per tick. Also refetches whenever the route
  // changes, so accepting/declining feels instant.
  useEffect(() => {
    if (!token) {
      setPendingReceived(0)
      return
    }
    let cancelled = false
    function refresh() {
      api.listTrades('received')
        .then(d => { if (!cancelled) setPendingReceived(Array.isArray(d) ? d.length : 0) })
        .catch(() => {})
    }
    refresh()
    const id = setInterval(refresh, 30_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [token, location.pathname])

  // Close menu on route change
  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  // Close on Escape + click-outside
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') setMenuOpen(false) }
    function onClickOutside(e) {
      if (navRef.current && !navRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    if (menuOpen) document.addEventListener('mousedown', onClickOutside)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClickOutside)
    }
  }, [menuOpen])

  return (
    <nav
      ref={navRef}
      className="bg-card sticky top-0 z-40"
      style={{ borderBottom: '2px solid rgba(245, 158, 66, 0.25)' }}
    >
      <div className="mx-auto max-w-7xl px-3 sm:px-4 h-14 flex items-center justify-between gap-2 md:gap-3 lg:gap-4">
        <Link
          to="/"
          className="text-text-primary text-base whitespace-nowrap shrink-0 hover:text-accent transition-colors flex items-center gap-1.5"
          style={{ fontWeight: 800 }}
        >
          <span aria-hidden="true">🎲</span>
          <span>Roll Da Newman</span>
        </Link>

        {token ? (
          <>
            {/* md+ inline nav */}
            <div className="hidden md:flex items-center gap-0.5 lg:gap-1 flex-nowrap">
              {NAV_LINKS.map(link => {
                const isActive = isProfileActive(location.pathname, link.to)
                const showBadge = link.to === '/trades' && pendingReceived > 0
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={cn(
                      'relative px-2 lg:px-2.5 py-1.5 text-[13px] lg:text-sm whitespace-nowrap transition-colors',
                      isActive ? 'text-accent' : 'text-text-muted hover:text-text-primary',
                    )}
                  >
                    <span className="relative z-10 inline-flex items-center gap-1.5">
                      {link.label}
                      {showBadge && (
                        <span
                          className="text-[10px] px-1.5 rounded-full tabular-nums"
                          style={{
                            backgroundColor: '#f59e42',
                            color: '#1a1b23',
                            fontWeight: 800,
                            minWidth: 16,
                            textAlign: 'center',
                            lineHeight: '14px',
                          }}
                        >
                          {pendingReceived}
                        </span>
                      )}
                    </span>
                    {isActive && (
                      <motion.div
                        layoutId="nav-underline"
                        className="absolute left-2 right-2 lg:left-2.5 lg:right-2.5 -bottom-px h-[2px] bg-accent"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                  </Link>
                )
              })}
            </div>

            <div className="hidden md:flex items-center gap-2 lg:gap-3 shrink-0">
              <PlayerSearch />
              <div className="flex items-center gap-2 bg-surface rounded-lg px-2.5 py-1">
                <div
                  className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-[11px] font-bold text-base"
                  aria-hidden="true"
                >
                  {username?.[0]?.toUpperCase() ?? '?'}
                </div>
                <span className="text-text-primary text-sm hidden lg:block max-w-[10ch] truncate">{username}</span>
                {coins !== null && (
                  <div className="flex items-center gap-1 text-sm">
                    <span aria-hidden="true">🪙</span>
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={coins}
                        initial={{ y: -10, opacity: 0 }}
                        animate={{ y: 0,   opacity: 1 }}
                        exit={{   y:  10, opacity: 0 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        className="text-accent tabular-nums font-bold"
                      >
                        {coins.toLocaleString()}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="text-xs text-text-muted hover:text-red-400 transition-colors"
              >
                Logout
              </button>
            </div>

            {/* Mobile coin pill + hamburger */}
            <div className="flex md:hidden items-center gap-2 ml-auto shrink-0">
              {coins !== null && (
                <div className="flex items-center gap-1 text-xs bg-surface rounded-lg px-2 py-1">
                  <span aria-hidden="true">🪙</span>
                  <span className="text-accent tabular-nums font-bold">{coins.toLocaleString()}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setMenuOpen(o => !o)}
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={menuOpen}
                className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface transition-colors"
              >
                <HamburgerIcon open={menuOpen} />
              </button>
            </div>
          </>
        ) : (
          <div className="flex gap-2 sm:gap-3 ml-auto">
            <Link
              to="/login"
              className="text-sm text-text-muted hover:text-text-primary transition-colors px-3 py-1.5"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="text-sm bg-accent hover:brightness-110 text-base px-3 py-1.5 rounded-lg transition-all"
              style={{ fontWeight: 700 }}
            >
              Register
            </Link>
          </div>
        )}
      </div>

      {/* Mobile slide-down menu */}
      <AnimatePresence>
        {token && menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="md:hidden border-t border-line bg-card overflow-hidden"
          >
            <div className="flex flex-col gap-1 px-3 py-3">
              <PlayerSearch fullWidth onSelect={() => setMenuOpen(false)} />
              <div className="flex flex-col gap-1 mt-2">
                {NAV_LINKS.map(link => {
                  const isActive  = isProfileActive(location.pathname, link.to)
                  const showBadge = link.to === '/trades' && pendingReceived > 0
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      className={cn(
                        'flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
                        isActive
                          ? 'bg-surface text-accent border-l-2 border-accent'
                          : 'text-text-muted hover:text-text-primary hover:bg-surface',
                      )}
                    >
                      <span>{link.label}</span>
                      {showBadge && (
                        <span
                          className="text-[10px] px-1.5 rounded-full tabular-nums"
                          style={{
                            backgroundColor: '#f59e42',
                            color: '#1a1b23',
                            fontWeight: 800,
                            minWidth: 16,
                            textAlign: 'center',
                            lineHeight: '14px',
                          }}
                        >
                          {pendingReceived}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
              <div className="flex items-center justify-between gap-3 px-3 pt-3 mt-2 border-t border-line">
                <span className="text-text-muted text-sm truncate">{username}</span>
                <button
                  onClick={handleLogout}
                  className="text-xs text-text-muted hover:text-red-400 transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
