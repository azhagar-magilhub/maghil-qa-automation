import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Info, ArrowRight, TicketCheck, Play, Shield, FileText, Settings, Bug,
  Filter, Calendar, Eye, Users, Activity as ActivityIcon,
  Search, ListChecks, CheckCircle2
} from 'lucide-react'
import {
  collection, query, orderBy, limit, onSnapshot, where, Timestamp,
  startAfter, getDocs, type DocumentData, type QueryDocumentSnapshot
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'
import HowItWorks, { type HowItWorksStep } from '@/components/shared/HowItWorks'

const ACTIVITY_TYPES = [
  { key: 'all', label: 'All', icon: ActivityIcon },
  { key: 'ticket', label: 'Ticket', icon: TicketCheck, color: 'text-status-green', bg: 'bg-status-green/10' },
  { key: 'test', label: 'Test Run', icon: Play, color: 'text-status-blue', bg: 'bg-status-blue/10' },
  { key: 'security', label: 'Security', icon: Shield, color: 'text-status-yellow', bg: 'bg-status-yellow/10' },
  { key: 'report', label: 'Report', icon: FileText, color: 'text-status-purple', bg: 'bg-status-purple/10' },
  { key: 'integration', label: 'Integration', icon: Settings, color: 'text-text-secondary', bg: 'bg-card' },
  { key: 'bug', label: 'Bug Filed', icon: Bug, color: 'text-status-red', bg: 'bg-status-red/10' },
] as const

type ActivityType = (typeof ACTIVITY_TYPES)[number]['key']

interface ActivityEntry {
  id: string
  action: string
  type: ActivityType
  userId: string
  userEmail?: string
  status: string
  createdAt: Date
}

function getRelativeTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`
  return date.toLocaleDateString()
}

function categorizeAction(action: string): ActivityType {
  const lower = action.toLowerCase()
  if (lower.includes('ticket') || lower.includes('excel') || lower.includes('teams')) return 'ticket'
  if (lower.includes('test') || lower.includes('run') || lower.includes('execute')) return 'test'
  if (lower.includes('security') || lower.includes('scan')) return 'security'
  if (lower.includes('report') || lower.includes('publish') || lower.includes('confluence')) return 'report'
  if (lower.includes('integration') || lower.includes('config') || lower.includes('setup')) return 'integration'
  if (lower.includes('bug') || lower.includes('defect')) return 'bug'
  return 'all'
}

function getTypeConfig(type: ActivityType) {
  return ACTIVITY_TYPES.find((t) => t.key === type) || ACTIVITY_TYPES[0]
}

const howItWorksSteps: HowItWorksStep[] = [
  {
    title: 'View Activity',
    description:
      'The activity feed shows a real-time stream of all actions taken across the platform, including ticket creation, test runs, and scans.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Eye className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">View</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <ActivityIcon className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Activity</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Updated</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Filter Events',
    description:
      'Use filters to narrow activity by type (tickets, tests, security), by user scope (my activity vs team), or by date range.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Filter className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Filter</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Search className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Search</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <ListChecks className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Results</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Track Team',
    description:
      'See what your team members are working on. Activity entries show who performed each action, making collaboration transparent.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Users className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Team</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <ActivityIcon className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Monitor</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Aligned</span>
        </div>
      </div>
    ),
  },
]

const PAGE_SIZE = 20

export default function ActivityFeedPage() {
  const { user } = useAuthStore()
  const [activities, setActivities] = useState<ActivityEntry[]>([])
  const [scopeFilter, setScopeFilter] = useState<'all' | 'mine' | 'team'>('all')
  const [typeFilter, setTypeFilter] = useState<ActivityType>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  // Initial real-time listener
  useEffect(() => {
    setLoading(true)
    const auditRef = collection(db, 'auditLogs')
    const constraints: Parameters<typeof query>[1][] = [orderBy('createdAt', 'desc'), limit(PAGE_SIZE)]

    if (scopeFilter === 'mine' && user) {
      constraints.unshift(where('userId', '==', user.uid))
    }

    if (startDate) {
      constraints.push(where('createdAt', '>=', Timestamp.fromDate(new Date(startDate))))
    }
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      constraints.push(where('createdAt', '<=', Timestamp.fromDate(end)))
    }

    // @ts-expect-error dynamic constraints
    const q = query(auditRef, ...constraints)

    const unsub = onSnapshot(q, (snapshot) => {
      const entries: ActivityEntry[] = snapshot.docs.map((d) => {
        const data = d.data()
        return {
          id: d.id,
          action: data.action || 'Unknown action',
          type: data.type || categorizeAction(data.action || ''),
          userId: data.userId || '',
          userEmail: data.userEmail || data.userId || '',
          status: data.status || 'SUCCESS',
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
        }
      })
      lastDocRef.current = snapshot.docs[snapshot.docs.length - 1] || null
      setHasMore(snapshot.docs.length >= PAGE_SIZE)
      setActivities(entries)
      setLoading(false)
    })

    return () => unsub()
  }, [user, scopeFilter, startDate, endDate])

  // Load more (pagination)
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !lastDocRef.current) return
    setLoadingMore(true)

    const auditRef = collection(db, 'auditLogs')
    const constraints: Parameters<typeof query>[1][] = [
      orderBy('createdAt', 'desc'),
      startAfter(lastDocRef.current),
      limit(PAGE_SIZE),
    ]

    if (scopeFilter === 'mine' && user) {
      constraints.unshift(where('userId', '==', user.uid))
    }

    // @ts-expect-error dynamic constraints
    const q = query(auditRef, ...constraints)
    const snapshot = await getDocs(q)
    const newEntries: ActivityEntry[] = snapshot.docs.map((d) => {
      const data = d.data()
      return {
        id: d.id,
        action: data.action || 'Unknown action',
        type: data.type || categorizeAction(data.action || ''),
        userId: data.userId || '',
        userEmail: data.userEmail || data.userId || '',
        status: data.status || 'SUCCESS',
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
      }
    })

    lastDocRef.current = snapshot.docs[snapshot.docs.length - 1] || null
    setHasMore(snapshot.docs.length >= PAGE_SIZE)
    setActivities((prev) => [...prev, ...newEntries])
    setLoadingMore(false)
  }, [loadingMore, hasMore, scopeFilter, user])

  // Infinite scroll observer
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore()
      },
      { threshold: 0.1 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadMore])

  // Client-side type filter
  const filtered = typeFilter === 'all' ? activities : activities.filter((a) => a.type === typeFilter)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Activity Feed</h1>
          <p className="text-text-secondary">Real-time stream of platform activity</p>
        </div>
        <button
          onClick={() => setShowHowItWorks(true)}
          className="flex items-center gap-2 rounded-full border border-border-subtle px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition"
        >
          <Info className="h-4 w-4" /> How it works
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-xl bg-card border border-border p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Scope Filter */}
          <div className="flex items-center gap-1 rounded-lg bg-sidebar p-1">
            {[
              { key: 'all' as const, label: 'All', icon: ActivityIcon },
              { key: 'mine' as const, label: 'My Activity', icon: Eye },
              { key: 'team' as const, label: 'Team', icon: Users },
            ].map((s) => (
              <button
                key={s.key}
                onClick={() => setScopeFilter(s.key)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition',
                  scopeFilter === s.key
                    ? 'bg-accent text-white'
                    : 'text-text-secondary hover:text-text-primary'
                )}
              >
                <s.icon size={14} />
                {s.label}
              </button>
            ))}
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1 flex-wrap">
            {ACTIVITY_TYPES.map((t) => (
              <button
                key={t.key}
                onClick={() => setTypeFilter(t.key)}
                className={cn(
                  'flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition border',
                  typeFilter === t.key
                    ? 'bg-accent/10 border-accent text-accent-light'
                    : 'border-border text-text-secondary hover:border-border-subtle'
                )}
              >
                <t.icon size={12} />
                {t.label}
              </button>
            ))}
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-2 ml-auto">
            <Calendar size={14} className="text-text-muted" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-md border border-border bg-body px-2 py-1 text-xs text-text-primary"
            />
            <span className="text-text-muted text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-md border border-border bg-body px-2 py-1 text-xs text-text-primary"
            />
          </div>
        </div>
      </div>

      {/* Activity List */}
      <div className="space-y-2">
        {loading ? (
          <div className="rounded-xl bg-card border border-border p-10 text-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent mx-auto" />
            <p className="text-text-muted text-sm mt-3">Loading activity...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl bg-card border border-border p-10 text-center">
            <ActivityIcon className="h-8 w-8 text-text-muted mx-auto mb-2" />
            <p className="text-text-muted text-sm">No activity found.</p>
          </div>
        ) : (
          filtered.map((entry) => {
            const typeConfig = getTypeConfig(entry.type)
            const TypeIcon = typeConfig.icon
            const initial = (entry.userEmail || 'U')[0].toUpperCase()

            return (
              <div
                key={entry.id}
                className="rounded-xl bg-card border border-border p-4 flex items-center gap-4 hover:border-border-subtle transition"
              >
                {/* User avatar */}
                <div className="flex-shrink-0 h-9 w-9 rounded-full bg-accent/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-accent-light">{initial}</span>
                </div>

                {/* Type icon */}
                <div
                  className={cn(
                    'flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center',
                    'bg' in typeConfig ? typeConfig.bg : 'bg-card'
                  )}
                >
                  <TypeIcon
                    size={16}
                    className={'color' in typeConfig ? typeConfig.color : 'text-text-secondary'}
                  />
                </div>

                {/* Description */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary truncate">{entry.action}</p>
                  <p className="text-xs text-text-muted">{entry.userEmail}</p>
                </div>

                {/* Badge */}
                <span
                  className={cn(
                    'flex-shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                    'color' in typeConfig ? typeConfig.bg : 'bg-card',
                    'color' in typeConfig ? typeConfig.color : 'text-text-secondary'
                  )}
                >
                  {typeConfig.label}
                </span>

                {/* Timestamp */}
                <span className="flex-shrink-0 text-xs text-text-muted whitespace-nowrap">
                  {getRelativeTime(entry.createdAt)}
                </span>
              </div>
            )
          })
        )}

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} className="h-1" />
        {loadingMore && (
          <div className="text-center py-4">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent mx-auto" />
          </div>
        )}
        {!hasMore && filtered.length > 0 && (
          <p className="text-center text-xs text-text-muted py-4">End of activity</p>
        )}
      </div>

      <HowItWorks steps={howItWorksSteps} isOpen={showHowItWorks} onClose={() => setShowHowItWorks(false)} />
    </div>
  )
}
