import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

const ACCENT = '#f59e42'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const { login }    = useAuth()
  const { addToast } = useToast()
  const navigate     = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const { access_token } = await api.login(username, password)
      await login(access_token)
      navigate('/roll')
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto pt-8 sm:pt-16 px-2 sm:px-0">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 22 }}
      >
        <h1
          className="text-3xl text-center mb-8 text-text-primary"
          style={{ fontWeight: 800 }}
        >
          🎲 Welcome Back
        </h1>

        <form
          onSubmit={handleSubmit}
          className="bg-card rounded-xl p-6 flex flex-col gap-4"
          style={{ border: '2px solid #3d3e4a' }}
        >
          <div>
            <label
              className="block uppercase mb-1.5"
              style={{ color: '#b4b4be', fontSize: 11, fontWeight: 700, letterSpacing: '1px' }}
            >
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoFocus
              className="w-full bg-surface border-[1.5px] border-line rounded-lg px-3 py-2.5 text-text-primary focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          <div>
            <label
              className="block uppercase mb-1.5"
              style={{ color: '#b4b4be', fontSize: 11, fontWeight: 700, letterSpacing: '1px' }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-surface border-[1.5px] border-line rounded-lg px-3 py-2.5 text-text-primary focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={!loading ? { scale: 1.02 } : {}}
            whileTap={!loading  ? { scale: 0.97 } : {}}
            className="w-full py-2.5 rounded-lg transition-all mt-1 disabled:cursor-not-allowed"
            style={{
              backgroundColor: ACCENT,
              color: '#1a1b23',
              fontWeight: 800,
              opacity: loading ? 0.4 : 1,
            }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </motion.button>

          <p className="text-center text-sm text-text-muted">
            No account?{' '}
            <Link
              to="/register"
              className="hover:underline transition-colors"
              style={{ color: ACCENT, fontWeight: 700 }}
            >
              Register
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  )
}
