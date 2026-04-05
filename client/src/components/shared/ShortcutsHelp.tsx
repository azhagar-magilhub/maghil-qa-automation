import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ShortcutsHelpProps {
  isOpen: boolean
  onClose: () => void
}

interface ShortcutEntry {
  keys: string[]
  description: string
}

interface ShortcutGroup {
  category: string
  shortcuts: ShortcutEntry[]
}

const shortcutGroups: ShortcutGroup[] = [
  {
    category: 'General',
    shortcuts: [
      { keys: ['\u2318/Ctrl', 'K'], description: 'Open command palette' },
      { keys: ['\u2318/Ctrl', '/'], description: 'Show keyboard shortcuts' },
    ],
  },
  {
    category: 'Navigation',
    shortcuts: [
      { keys: ['G', 'D'], description: 'Go to Dashboard' },
      { keys: ['G', 'E'], description: 'Go to Excel Upload' },
      { keys: ['G', 'T'], description: 'Go to Teams' },
      { keys: ['G', 'R'], description: 'Go to Reports' },
      { keys: ['G', 'S'], description: 'Go to Settings' },
    ],
  },
  {
    category: 'Actions',
    shortcuts: [
      { keys: ['N', 'T'], description: 'New Test Case' },
      { keys: ['N', 'A'], description: 'New API Collection' },
    ],
  },
]

function KeyCap({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-6 min-w-[24px] items-center justify-center rounded-md',
        'border border-border bg-card px-1.5',
        'text-[11px] font-semibold text-text-secondary',
        'shadow-[0_1px_0_1px] shadow-border/50'
      )}
    >
      {children}
    </kbd>
  )
}

export default function ShortcutsHelp({ isOpen, onClose }: ShortcutsHelpProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-sidebar shadow-2xl shadow-black/40 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-text-primary">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-text-secondary hover:text-text-primary hover:bg-card transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto px-6 py-4 space-y-6">
          {shortcutGroups.map((group) => (
            <div key={group.category}>
              <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-text-muted">
                {group.category}
              </h3>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-card transition-colors"
                  >
                    <span className="text-sm text-text-secondary">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, ki) => (
                        <span key={ki} className="flex items-center gap-1">
                          {ki > 0 && (
                            <span className="text-[10px] text-text-muted mx-0.5">then</span>
                          )}
                          <KeyCap>{key}</KeyCap>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-3">
          <p className="text-[11px] text-text-muted text-center">
            Press <KeyCap>Esc</KeyCap> to close
          </p>
        </div>
      </div>
    </div>
  )
}
