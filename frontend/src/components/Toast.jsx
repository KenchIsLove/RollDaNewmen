import { useToast } from '../context/ToastContext'

const TYPE_STYLES = {
  success: 'bg-green-950 border-green-700 text-green-200',
  error:   'bg-red-950  border-red-700   text-red-200',
  info:    'bg-zinc-800 border-zinc-700   text-gray-200',
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
            animate-slideUp border rounded-lg px-4 py-3 text-sm
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
