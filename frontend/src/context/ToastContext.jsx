import { createContext, useContext } from 'react'
import { toast } from 'sonner'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  function addToast(message, type = 'info') {
    if (type === 'success') toast.success(message)
    else if (type === 'error') toast.error(message)
    else toast(message)
  }

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
