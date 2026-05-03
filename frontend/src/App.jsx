import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Toaster } from 'sonner'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { useMediaQuery } from './utils/useMediaQuery'
import Navbar from './components/Navbar'
import Chat from './components/Chat'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import Roll from './pages/Roll'
import Inventory from './pages/Inventory'
import Shop from './pages/Shop'
import Leaderboard from './pages/Leaderboard'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import Trades from './pages/Trades'
import TradeNew from './pages/TradeNew'
import TradeDetail from './pages/TradeDetail'

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Navigate to="/roll" replace />} />
        <Route path="/login"       element={<Login />} />
        <Route path="/register"    element={<Register />} />
        <Route path="/roll"        element={<ProtectedRoute><Roll /></ProtectedRoute>} />
        <Route path="/inventory"   element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
        <Route path="/shop"        element={<ProtectedRoute><Shop /></ProtectedRoute>} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/profile"             element={<Navigate to="/profile/me" replace />} />
        <Route path="/profile/:username"   element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/settings"    element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/trades"      element={<ProtectedRoute><Trades /></ProtectedRoute>} />
        <Route path="/trades/new"  element={<ProtectedRoute><TradeNew /></ProtectedRoute>} />
        <Route path="/trades/:id"  element={<ProtectedRoute><TradeDetail /></ProtectedRoute>} />
      </Routes>
    </AnimatePresence>
  )
}

function MobileChatDrawer() {
  const { token } = useAuth()
  const isBelowLg = useMediaQuery('(max-width: 1023px)')
  if (!token || !isBelowLg) return null
  return <Chat mode="drawer" />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <div className="min-h-screen bg-base text-text-primary overflow-x-hidden">
            <Navbar />
            <main className="mx-auto max-w-4xl px-3 sm:px-4 md:px-6 lg:px-8 pt-6 sm:pt-8 pb-20 lg:pb-8">
              <AnimatedRoutes />
            </main>
            <MobileChatDrawer />
          </div>
          <Toaster
            position="bottom-right"
            theme="dark"
            richColors
            toastOptions={{
              style: { background: '#22232d', border: '1px solid #3d3e4a' },
            }}
          />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
