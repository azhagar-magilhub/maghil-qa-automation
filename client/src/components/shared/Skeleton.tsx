import { cn } from '@/lib/utils'

interface SkeletonLineProps {
  width?: string
  className?: string
}

export function SkeletonLine({ width = 'w-full', className }: SkeletonLineProps) {
  return (
    <div className={cn('h-4 animate-pulse rounded-md bg-card-hover', width, className)} />
  )
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl bg-card border border-border p-5 space-y-4', className)}>
      <SkeletonLine width="w-1/3" className="h-5" />
      <SkeletonLine width="w-full" />
      <SkeletonLine width="w-4/5" />
      <SkeletonLine width="w-2/3" />
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 4, className }: { rows?: number; cols?: number; className?: string }) {
  return (
    <div className={cn('rounded-xl bg-card border border-border overflow-hidden', className)}>
      {/* Header */}
      <div className="flex gap-4 px-4 py-3 border-b border-border bg-sidebar/50">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonLine key={`h-${i}`} width={i === 0 ? 'w-32' : 'w-24'} className="h-3" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={`r-${r}`} className="flex gap-4 px-4 py-3.5 border-b border-border/50">
          {Array.from({ length: cols }).map((_, c) => (
            <SkeletonLine key={`r-${r}-c-${c}`} width={c === 0 ? 'w-32' : c === 1 ? 'w-48' : 'w-20'} className="h-3.5" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonMetricCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl bg-card border border-border p-5 space-y-3', className)}>
      <div className="flex items-center justify-between">
        <div className="h-5 w-5 animate-pulse rounded-md bg-card-hover" />
      </div>
      <SkeletonLine width="w-20" className="h-8" />
      <SkeletonLine width="w-24" className="h-3" />
    </div>
  )
}

export function SkeletonChart({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl bg-card border border-border p-5', className)}>
      <SkeletonLine width="w-40" className="h-5 mb-4" />
      <div className="flex items-end gap-3 h-[250px] pb-6">
        {[40, 65, 45, 80, 55, 70, 50].map((h, i) => (
          <div
            key={i}
            className="flex-1 animate-pulse rounded-t-md bg-card-hover"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  )
}

export function SkeletonPage({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Title area */}
      <div className="space-y-2">
        <SkeletonLine width="w-48" className="h-7" />
        <SkeletonLine width="w-72" className="h-4" />
      </div>

      {/* Metric cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonMetricCard key={i} />
        ))}
      </div>

      {/* Content cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SkeletonChart />
        <SkeletonChart />
      </div>
    </div>
  )
}
