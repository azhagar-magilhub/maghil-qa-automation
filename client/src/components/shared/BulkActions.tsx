import { X, CheckSquare, Square } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BulkAction {
  label: string
  icon?: React.ReactNode
  onClick: (selectedIds: string[]) => void
  variant?: 'default' | 'danger'
}

interface BulkActionsProps {
  selectedIds: string[]
  totalCount: number
  onSelectAll: () => void
  onDeselectAll: () => void
  actions: BulkAction[]
}

export default function BulkActions({
  selectedIds,
  totalCount,
  onSelectAll,
  onDeselectAll,
  actions,
}: BulkActionsProps) {
  if (selectedIds.length === 0) return null

  const allSelected = selectedIds.length === totalCount && totalCount > 0

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-sidebar px-5 py-3 shadow-2xl shadow-black/30">
        {/* Count */}
        <span className="text-sm font-medium text-text-primary whitespace-nowrap">
          {selectedIds.length} item{selectedIds.length !== 1 ? 's' : ''} selected
        </span>

        {/* Divider */}
        <div className="h-5 w-px bg-border" />

        {/* Select / Deselect All */}
        <button
          onClick={allSelected ? onDeselectAll : onSelectAll}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-card transition-colors"
        >
          {allSelected ? <Square size={14} /> : <CheckSquare size={14} />}
          {allSelected ? 'Deselect All' : 'Select All'}
        </button>

        {/* Divider */}
        <div className="h-5 w-px bg-border" />

        {/* Actions */}
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={() => action.onClick(selectedIds)}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              action.variant === 'danger'
                ? 'text-status-red hover:bg-status-red/10'
                : 'text-accent-light hover:bg-accent/10'
            )}
          >
            {action.icon}
            {action.label}
          </button>
        ))}

        {/* Close */}
        <button
          onClick={onDeselectAll}
          className="rounded-md p-1 text-text-secondary hover:text-text-primary hover:bg-card transition-colors ml-1"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
