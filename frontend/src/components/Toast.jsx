import { useToast } from '../context/ToastContext'

const TYPE_STYLES = {
  success: 'bg-card border-green-500 text-green-300',
  error:   'bg-card border-red-500 text-red-300',
  info:    'bg-card border-line text-text-secondary',
}

export default function Toast() {
  const { toasts, removeToast } = useToast()

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          onClick={() => removeToast(toast.id)}
          className={`
            animate-slideUp border-2 rounded-lg px-4 py-3 text-sm
            flex items-start gap-2 shadow-xl max-w-sm
            pointer-events-auto cursor-pointer
            ${TYPE_STYLES[toast.type] ?? TYPE_STYLES.info}
          `}
        >
          <span className="flex-1">{toast.message}</span>
          <span className="text-xs opacity-50 shrink-0 mt-0.5">x</span>
        </div>
      ))}
    </div>
  )
}
