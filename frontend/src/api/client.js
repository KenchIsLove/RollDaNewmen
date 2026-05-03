const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' }
  const token = localStorage.getItem('token')
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    window.dispatchEvent(new Event('auth:logout'))
    throw new Error('Session expired. Please log in again.')
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const err = new Error(data.detail || `Request failed (${res.status})`)
    err.status = res.status
    throw err
  }

  if (res.status === 204) return null
  return res.json()
}

export const api = {
  register:        (username, password) => request('POST', '/auth/register', { username, password }),
  login:           (username, password) => request('POST', '/auth/login',    { username, password }),
  roll:            ()                   => request('POST', '/roll'),
  myInventory:     ()                   => request('GET',  '/inventory'),
  playerInventory: (username)           => request('GET',  `/inventory/${username}`),
  buyUpgrade:      (item)               => request('POST', '/shop/buy', { item }),
  leaderboard:     (board, limit = 10)  => request('GET',  `/leaderboard/${board}?limit=${limit}`),
  myProfile:       ()                   => request('GET',  '/players/me'),
  playerProfile:   (username)           => request('GET',  `/players/${username}`),
  searchPlayers:   (q, limit = 10)      => request('GET',  `/players/search?q=${encodeURIComponent(q)}&limit=${limit}`),
  updateProfile:   (body)               => request('PATCH', '/players/me', body),
  recentDrops:     (limit = 10)         => request('GET',  `/drops/recent?limit=${limit}`),
  myRolls:         (limit = 5)          => request('GET',  `/rolls/me?limit=${limit}`),
  createTrade:     (body)               => request('POST', '/trades', body),
  listTrades:      (tab)                => request('GET',  tab ? `/trades?tab=${tab}` : '/trades'),
  getTrade:        (id)                 => request('GET',  `/trades/${id}`),
  acceptTrade:     (id)                 => request('POST', `/trades/${id}/accept`),
  declineTrade:    (id)                 => request('POST', `/trades/${id}/decline`),
  cancelTrade:     (id)                 => request('POST', `/trades/${id}/cancel`),
}
