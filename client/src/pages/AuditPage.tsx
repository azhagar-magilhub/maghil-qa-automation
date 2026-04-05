import { useState, useEffect, useCallback } from 'react'
import {
  ScrollText, Search, Download, ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, Filter, Info, ArrowRight, List, FileText
} from 'lucide-react'
import {
  collection, query, where, orderBy, limit, startAfter, onSnapshot,
  getDocs, Timestamp, type QueryDocumentSnapshot
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { cn } from '@/lib/utils'
import { usePageTitle } from '@/hooks/usePageTitle'
import HowItWorks from '@/components/shared/HowItWorks'
import { SkeletonTable } from '@/components/shared/Skeleton'

const howItWorksSteps = [
  {
    title: 'View Logs',
    description: 'Browse a real-time log of every action performed on the platform, including ticket creation, report publishing, and integration changes.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <ScrollText className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Browse</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <List className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Logs</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Filter & Search',
    description: 'Use the search bar, action type dropdown, and status filter to narrow down logs. Combine filters for precise results.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Search className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Search</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Filter className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Filter</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Export CSV',
    description: 'Click "Export CSV" to download the filtered audit log as a CSV file for compliance reporting or offline analysis.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Download className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Export</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <FileText className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">CSV</span>
        </div>
      </div>
    ),
  },
]

interface AuditLog {
  id: string
  userId: string | null
  action: string
  details: Record<string, unknown> | null
  status: 'SUCCESS' | 'FAILURE'
  createdAt: Date
}

const PAGE_SIZE = 50

const ACTION_TYPES = [
  'All Actions',
  'POST /api/v1/excel',
  'POST /api/v1/teams',
  'POST /api/v1/confluence',
  'POST /api/v1/integrations',
  'POST /api/v1/tickets',
]

export default function AuditPage() {
  usePageTitle('Audit Log')
  const [showHelp, setShowHelp] = useState(false)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUCCESS' | 'FAILURE'>('ALL')
  const [actionFilter, setActionFilter] = useState('All Actions')
  const [page, setPage] = useState(0)
  const [lastDocs, setLastDocs] = useState<QueryDocumentSnapshot[]>([])
  const [hasMore, setHasMore] = useState(true)

  const loadLogs = useCallback(async (pageNum: number) => {
    setLoading(true)
    try {
      const auditRef = collection(db, 'auditLogs')
      const constraints: Parameters<typeof query>[1][] = [orderBy('createdAt', 'desc'), limit(PAGE_SIZE + 1)]

      if (statusFilter !== 'ALL') {
        constraints.unshift(where('status', '==', statusFilter))
      }

      if (pageNum > 0 && lastDocs[pageNum - 1]) {
        constraints.push(startAfter(lastDocs[pageNum - 1]))
      }

      const q = query(auditRef, ...constraints)
      const snapshot = await getDocs(q)
      const entries: AuditLog[] = snapshot.docs.slice(0, PAGE_SIZE).map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          userId: data.userId || null,
          action: data.action || 'Unknown',
          details: data.details || null,
          status: data.status || 'SUCCESS',
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
        }
      })

      setHasMore(snapshot.docs.length > PAGE_SIZE)
      if (snapshot.docs.length > 0) {
        const newLastDocs = [...lastDocs]
        newLastDocs[pageNum] = snapshot.docs[Math.min(snapshot.docs.length - 1, PAGE_SIZE - 1)]
        setLastDocs(newLastDocs)
      }

      setLogs(entries)
    } catch (err) {
      console.error('Failed to load audit logs:', err)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, lastDocs])

  useEffect(() => {
    setPage(0)
    setLastDocs([])
    loadLogs(0)
  }, [statusFilter])

  useEffect(() => {
    if (page > 0) loadLogs(page)
  }, [page])

  // Also listen for real-time updates on first page
  useEffect(() => {
    const auditRef = collection(db, 'auditLogs')
    const q = query(auditRef, orderBy('createdAt', 'desc'), limit(5))
    const unsub = onSnapshot(q, () => {
      if (page === 0) loadLogs(0)
    })
    return unsub
  }, [])

  const filteredLogs = logs.filter((log) => {
    if (searchText && !log.action.toLowerCase().includes(searchText.toLowerCase())) return false
    if (actionFilter !== 'All Actions' && !log.action.includes(actionFilter)) return false
    return true
  })

  const exportCSV = () => {
    const header = 'Timestamp,Action,Status,Details\n'
    const rows = filteredLogs.map((log) =>
      `"${log.createdAt.toISOString()}","${log.action}","${log.status}","${JSON.stringify(log.details || {})}"`
    ).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Audit Log</h1>
          <p className="text-text-secondary mt-1">Track all actions and events across the platform</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="flex items-center gap-2 rounded-full border border-border-subtle px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition">
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <button onClick={() => setShowHelp(true)} className="flex items-center gap-2 rounded-full border border-border-subtle px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition">
            <Info className="h-4 w-4" /> How it works
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search actions..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full rounded-lg bg-sidebar border border-border pl-10 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'SUCCESS' | 'FAILURE')}
          className="rounded-lg bg-sidebar border border-border px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent"
        >
          <option value="ALL">All Status</option>
          <option value="SUCCESS">Success</option>
          <option value="FAILURE">Failure</option>
        </select>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="rounded-lg bg-sidebar border border-border px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent"
        >
          {ACTION_TYPES.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <SkeletonTable rows={5} cols={4} />
      ) : (
      <div className="rounded-xl bg-card border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-sidebar/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Details</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-text-muted">
                  <ScrollText className="h-8 w-8 mx-auto mb-2 text-text-muted" />
                  No audit logs found
                </td></tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="border-b border-border/50 hover:bg-sidebar/30 transition">
                    <td className="px-4 py-3 text-text-secondary whitespace-nowrap">
                      {log.createdAt.toLocaleDateString()} {log.createdAt.toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3 text-text-primary font-mono text-xs">{log.action}</td>
                    <td className="px-4 py-3 text-text-muted text-xs max-w-[300px] truncate">
                      {log.details ? JSON.stringify(log.details) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                        log.status === 'SUCCESS' ? 'bg-status-green/10 text-status-green' : 'bg-status-red/10 text-status-red'
                      )}>
                        {log.status === 'SUCCESS' ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <span className="text-xs text-text-muted">
            Showing {filteredLogs.length} entries (page {page + 1})
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="rounded-lg p-2 text-text-secondary hover:bg-sidebar disabled:opacity-30 transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => hasMore && setPage(page + 1)}
              disabled={!hasMore}
              className="rounded-lg p-2 text-text-secondary hover:bg-sidebar disabled:opacity-30 transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      )}
    </div>
    <HowItWorks steps={howItWorksSteps} isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  )
}
