import { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface HowItWorksStep {
  title: string
  description: string
  image?: string
  preview?: React.ReactNode
}

interface HowItWorksProps {
  steps: HowItWorksStep[]
  isOpen: boolean
  onClose: () => void
}

export default function HowItWorks({ steps, isOpen, onClose }: HowItWorksProps) {
  const [current, setCurrent] = useState(0)

  // Reset to first step whenever the modal opens
  useEffect(() => {
    if (isOpen) setCurrent(0)
  }, [isOpen])

  if (!isOpen || steps.length === 0) return null

  const step = steps[current]
  const isFirst = current === 0
  const isLast = current === steps.length - 1

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-sidebar shadow-2xl shadow-black/40 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-0">
          <span className="text-xs font-bold uppercase tracking-widest text-accent-light">
            {current + 1} of {steps.length}
          </span>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-text-secondary hover:text-text-primary hover:bg-card transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pt-4 pb-2">
          <h3 className="text-lg font-semibold text-text-primary">{step.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
            {step.description}
          </p>
        </div>

        {/* Preview area — only shown if image or preview content exists */}
        {(step.image || step.preview) && (
          <div className="mx-6 my-4 flex items-center justify-center rounded-xl border border-border bg-card min-h-[120px] overflow-hidden">
            {step.image ? (
              <img
                src={step.image}
                alt={step.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="w-full p-4">{step.preview}</div>
            )}
          </div>
        )}

        {/* Footer: dots + nav buttons */}
        <div className="flex items-center justify-between px-6 pb-5 pt-1">
          {/* Back button */}
          <button
            onClick={() => setCurrent((c) => c - 1)}
            disabled={isFirst}
            className={cn(
              'flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              isFirst
                ? 'text-text-muted cursor-not-allowed'
                : 'text-text-secondary hover:text-text-primary hover:bg-card'
            )}
          >
            <ChevronLeft size={16} />
            Back
          </button>

          {/* Dot indicators */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={cn(
                  'h-2 rounded-full transition-all',
                  i === current
                    ? 'w-6 bg-accent'
                    : 'w-2 bg-border hover:bg-border-subtle'
                )}
              />
            ))}
          </div>

          {/* Next / Done button */}
          <button
            onClick={() => {
              if (isLast) {
                onClose()
              } else {
                setCurrent((c) => c + 1)
              }
            }}
            className={cn(
              'flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              isLast
                ? 'bg-accent text-white hover:bg-accent-hover'
                : 'bg-accent text-white hover:bg-accent-hover'
            )}
          >
            {isLast ? 'Done' : 'Next'}
            {!isLast && <ChevronRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  )
}
