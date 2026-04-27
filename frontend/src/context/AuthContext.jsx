import { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token,    setToken]    = useState(() => localStorage.getItem('token'))
  const [username, setUsername] = useState(() => localStorage.getItem('username'))
  const [coins,    setCoins]    = useState(null)
  const [loading,  setLoading]  = useState(!!localStorage.getItem('token'))

  useEffect(() => {
    if (!token) { setLoading(false); return }
    api.myProfile()
      .then(p => {
        setUsername(p.username)
        setCoins(p.coins)
        localStorage.setItem('username', p.username)
      })
      .catch(_clear)
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function handleForceLogout() { _clear(); setLoading(false) }
    window.addEventListener('auth:logout', handleForceLogout)
    return () => window.removeEventListener('auth:logout', handleForceLogout)
  }, [])

  function _clear() {
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    setToken(null)
    setUsername(null)
    setCoins(null)
  }

  async function login(newToken) {
    localStorage.setItem('token', newToken)
    setToken(newToken)
    const profile = await api.myProfile()
    setUsername(profile.username)
    setCoins(profile.coins)
    localStorage.setItem('username', profile.username)
    return profile
  }

  function logout() {
    _clear()
  }

  function updateCoins(newCoins) {
    setCoins(newCoins)
  }

  return (
    <AuthContext.Provider value={{ token, username, coins, loading, login, logout, updateCoins }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
