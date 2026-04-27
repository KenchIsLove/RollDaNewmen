import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function Register() {
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
      const { access_token } = await api.register(username, password)
      await login(access_token)
      addToast('Account created!', 'success')
      navigate('/roll')
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto pt-16">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 22 }}
      >
        <h1 className="text-2xl font-bold text-center mb-8 text-purple-400">Create Account</h1>

        <form
          onSubmit={handleSubmit}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-4"
        >
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Username</label>
            <p className="text-xs text-gray-600 mb-1.5">3–32 characters: letters, digits, underscores</p>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoFocus
              minLength={3}
              maxLength={32}
              pattern="[a-zA-Z0-9_]+"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Password</label>
            <p className="text-xs text-gray-600 mb-1.5">At least 8 characters</p>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              maxLength={128}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 transition-all"
            />
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={!loading ? { scale: 1.02 } : {}}
            whileTap={!loading  ? { scale: 0.97 } : {}}
            className="w-full bg-gradient-to-r from-purple-700 to-violet-600 hover:from-purple-600 hover:to-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-all mt-1"
          >
            {loading ? 'Creating account...' : 'Register'}
          </motion.button>

          <p className="text-center text-sm text-gray-500">
            Have an account?{' '}
            <Link to="/login" className="text-purple-400 hover:text-purple-300 transition-colors">
              Login
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  )
}
