import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'

const NAV_LINKS = [
  { to: '/roll',        label: 'Roll' },
  { to: '/inventory',   label: 'Inventory' },
  { to: '/shop',        label: 'Shop' },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/trades',      label: 'Trades' },
  { to: '/profile',     label: 'Profile' },
]

export default function Navbar() {
  const { token, username, coins, logout } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <nav className="bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800 sticky top-0 z-40">
      <div className="mx-auto max-w-4xl px-4 h-14 flex items-center justify-between gap-4">
        <Link to="/" className="text-purple-400 font-bold text-base whitespace-nowrap shrink-0 hover:text-purple-300 transition-colors">
          Roll Da Newman
        </Link>

        {token ? (
          <>
            <div className="flex items-center gap-1 overflow-x-auto">
              {NAV_LINKS.map(link => {
                const isActive = location.pathname === link.to
                return (
                  <Link key={link.to} to={link.to} className="relative px-3 py-1.5 rounded text-sm whitespace-nowrap transition-colors text-gray-400 hover:text-white">
                    {isActive && (
                      <motion.div
                        layoutId="nav-pill"
                        className="absolute inset-0 bg-purple-700 rounded"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className={`relative z-10 ${isActive ? 'text-white' : ''}`}>
                      {link.label}
                    </span>
                  </Link>
                )
              })}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {coins !== null && (
                <div className="flex items-center gap-1 text-sm font-medium overflow-hidden">
                  <span className="text-yellow-500">◈</span>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={coins}
                      initial={{ y: -12, opacity: 0 }}
                      animate={{ y: 0,   opacity: 1 }}
                      exit={{   y:  12, opacity: 0 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      className="text-yellow-400 tabular-nums"
                    >
                      {coins.toLocaleString()}
                    </motion.span>
                  </AnimatePresence>
                </div>
              )}
              <span className="text-gray-600 text-sm hidden sm:block">{username}</span>
              <button
                onClick={handleLogout}
                className="text-xs text-gray-600 hover:text-red-400 transition-colors"
              >
                Logout
              </button>
            </div>
          </>
        ) : (
          <div className="flex gap-3 ml-auto">
            <Link to="/login" className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5">
              Login
            </Link>
            <Link to="/register" className="text-sm bg-purple-700 hover:bg-purple-600 text-white px-3 py-1.5 rounded transition-colors">
              Register
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}
