import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { useToastStore, type Toast } from '@/store/toast.store'
import { cn } from '@/lib/utils'

const TOAST_DURATION = 5000

const iconMap = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const colorMap = {
  success: {
    bg: 'bg-status-green/10',
    border: 'border-status-green/30',
    icon: 'text-status-green',
    progress: 'bg-status-green',
  },
  error: {
    bg: 'bg-status-red/10',
    border: 'border-status-red/30',
    icon: 'text-status-red',
    progress: 'bg-status-red',
  },
  warning: {
    bg: 'bg-status-yellow/10',
    border: 'border-status-yellow/30',
    icon: 'text-status-yellow',
    progress: 'bg-status-yellow',
  },
  info: {
    bg: 'bg-status-blue/10',
    border: 'border-status-blue/30',
    icon: 'text-status-blue',
    progress: 'bg-status-blue',
  },
}

function ToastItem({ toast }: { toast: Toast }) {
  const removeToast = useToastStore((s) => s.removeToast)
  const [progress, setProgress] = useState(100)
  const [visible, setVisible] = useState(false)

  const Icon = iconMap[toast.type]
  const colors = colorMap[toast.type]

  useEffect(() => {
    // Trigger slide-in
    requestAnimationFrame(() => setVisible(true))

    // Progress bar countdown
    const start = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - start
      const remaining = Math.max(0, 100 - (elapsed / TOAST_DURATION) * 100)
      setProgress(remaining)
      if (remaining <= 0) clearInterval(interval)
    }, 50)

    return () => clearInterval(interval)
  }, [])

  return (
    <div
      className={cn(
        'relative w-80 overflow-hidden rounded-xl border bg-card shadow-lg transition-all duration-300 ease-out',
        colors.border,
        visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      )}
    >
      <div className="flex items-start gap-3 p-4">
        <div className={cn('mt-0.5 flex-shrink-0', colors.icon)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary">{toast.message}</p>
          {toast.description && (
            <p className="mt-1 text-xs text-text-secondary">{toast.description}</p>
          )}
        </div>
        <button
          onClick={() => removeToast(toast.id)}
          className="flex-shrink-0 rounded-lg p-1 text-text-muted hover:text-text-primary hover:bg-sidebar transition"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 w-full bg-border">
        <div
          className={cn('h-full transition-all duration-100 ease-linear', colors.progress)}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  )
}

export default ToastContainer
