import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Toaster } from 'sonner'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import Roll from './pages/Roll'
import Inventory from './pages/Inventory'
import Shop from './pages/Shop'
import Leaderboard from './pages/Leaderboard'
import Profile from './pages/Profile'
import Trades from './pages/Trades'

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
        <Route path="/profile"     element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/trades"      element={<ProtectedRoute><Trades /></ProtectedRoute>} />
      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <div className="min-h-screen bg-zinc-950 text-gray-100">
            <Navbar />
            <main className="mx-auto max-w-4xl px-4 py-8">
              <AnimatedRoutes />
            </main>
          </div>
          <Toaster
            position="bottom-right"
            theme="dark"
            richColors
            toastOptions={{
              style: { background: '#18181b', border: '1px solid #3f3f46' },
            }}
          />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
