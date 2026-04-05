import { useState, useEffect, useCallback } from 'react'
import {
  FileText,
  Calendar,
  Search,
  ArrowUpDown,
  ExternalLink,
  Loader2,
  BookOpen,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Info,
  ArrowRight,
  Eye,
  Globe,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePageTitle } from '@/hooks/usePageTitle'
import HowItWorks from '@/components/shared/HowItWorks'
import api from '@/lib/api'
import { db } from '@/lib/firebase'

const howItWorksSteps = [
  {
    title: 'Select Date Range',
    description: 'Choose a start and end date to filter tickets created during that period. Leave blank to see all tickets.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Calendar className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Date range</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <FileText className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Data</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Review Tickets',
    description: 'Browse the filtered tickets in a sortable table. Click column headers to sort by key, summary, priority, or source.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <FileText className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Preview</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Eye className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Report</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Publish to Confluence',
    description: 'Click "Publish to Confluence" to generate a formatted report page. Choose a space and page title, then publish.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <FileText className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Report</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Globe className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Confluence</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Create Tickets',
    description: 'Published reports include ticket summaries, statuses, and links back to Jira for full traceability.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <FileText className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Report</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Globe className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Live</span>
        </div>
      </div>
    ),
  },
]
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore'
import { useAuthStore } from '@/store/auth.store'

interface ReportTicket {
  id: string
  jiraKey: string | null
  summary: string
  issueType: string
  priority: string | null
  assignee: string | null
  source: 'EXCEL' | 'TEAMS'
  createdAt: Date
  batchId: string
}

interface ConfluenceSpace {
  key: string
  name: string
}

type SortField = 'jiraKey' | 'summary' | 'issueType' | 'priority' | 'source' | 'createdAt'
type SortDir = 'asc' | 'desc'

export default function ReportsPage() {
  usePageTitle('Reports')
  const { user } = useAuthStore()
  const [showHelp, setShowHelp] = useState(false)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [tickets, setTickets] = useState<ReportTicket[]>([])
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState(false)
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // Confluence publish state
  const [showPublish, setShowPublish] = useState(false)
  const [spaces, setSpaces] = useState<ConfluenceSpace[]>([])
  const [selectedSpace, setSelectedSpace] = useState('')
  const [pageTitle, setPageTitle] = useState('')
  const [publishMode, setPublishMode] = useState<'new' | 'append'>('new')
  const [publishing, setPublishing] = useState(false)
  const [publishResult, setPublishResult] = useState<{ url: string } | null>(null)
  const [publishError, setPublishError] = useState<string | null>(null)

  const fetchTickets = useCallback(async () => {
    if (!user) return
    try {
      setLoading(true)
      const allTickets: ReportTicket[] = []

      // Build query for ticket batches
      const batchesRef = collection(db, 'ticketBatches')
      const constraints: Parameters<typeof query>[1][] = [
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
      ]
      if (fromDate) {
        constraints.push(where('createdAt', '>=', Timestamp.fromDate(new Date(fromDate))))
      }
      if (toDate) {
        const endOfDay = new Date(toDate)
        endOfDay.setHours(23, 59, 59, 999)
        constraints.push(where('createdAt', '<=', Timestamp.fromDate(endOfDay)))
      }

      const batchSnap = await getDocs(query(batchesRef, ...constraints))

      for (const batchDoc of batchSnap.docs) {
        const batchData = batchDoc.data()
        const ticketsRef = collection(db, 'ticketBatches', batchDoc.id, 'tickets')
        const ticketSnap = await getDocs(ticketsRef)

        ticketSnap.docs.forEach((tDoc) => {
          const t = tDoc.data()
          allTickets.push({
            id: tDoc.id,
            jiraKey: t.jiraKey ?? null,
            summary: t.summary ?? '',
            issueType: t.issueType ?? 'Task',
            priority: t.priority ?? null,
            assignee: t.assignee ?? null,
            source: batchData.source ?? 'EXCEL',
            createdAt: t.createdAt?.toDate?.() ?? new Date(),
            batchId: batchDoc.id,
          })
        })
      }

      setTickets(allTickets)
      setFetched(true)
    } catch (err) {
      console.error('Failed to fetch tickets', err)
    } finally {
      setLoading(false)
    }
  }, [user, fromDate, toDate])

  const sortedTickets = [...tickets].sort((a, b) => {
    let cmp = 0
    const aVal = a[sortField]
    const bVal = b[sortField]
    if (aVal == null && bVal == null) cmp = 0
    else if (aVal == null) cmp = -1
    else if (bVal == null) cmp = 1
    else if (aVal instanceof Date && bVal instanceof Date) cmp = aVal.getTime() - bVal.getTime()
    else cmp = String(aVal).localeCompare(String(bVal))
    return sortDir === 'asc' ? cmp : -cmp
  })

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  // Stats
  const totalCount = tickets.length
  const byType: Record<string, number> = {}
  const byPriority: Record<string, number> = {}
  tickets.forEach((t) => {
    byType[t.issueType] = (byType[t.issueType] ?? 0) + 1
    const p = t.priority ?? 'Unset'
    byPriority[p] = (byPriority[p] ?? 0) + 1
  })

  // Confluence publish
  const openPublishDialog = async () => {
    setShowPublish(true)
    setPublishResult(null)
    setPublishError(null)
    try {
      const { data } = await api.get('/api/v1/confluence/spaces')
      const list = data.spaces ?? data ?? []
      setSpaces(list)
      if (list.length > 0) setSelectedSpace(list[0].key)
    } catch (err) {
      console.error(err)
    }
  }

  const handlePublish = async () => {
    try {
      setPublishing(true)
      setPublishError(null)
      const { data } = await api.post('/api/v1/confluence/publish', {
        spaceKey: selectedSpace,
        title: pageTitle,
        mode: publishMode,
        tickets: tickets.map((t) => ({
          jiraKey: t.jiraKey,
          summary: t.summary,
          issueType: t.issueType,
          priority: t.priority,
          assignee: t.assignee,
          source: t.source,
          createdAt: t.createdAt.toISOString(),
        })),
        dateRange: { from: fromDate, to: toDate },
      })
      setPublishResult({ url: data.url ?? data.pageUrl ?? '#' })
    } catch (err) {
      setPublishError('Failed to publish report')
      console.error(err)
    } finally {
      setPublishing(false)
    }
  }

  const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <th
      onClick={() => handleSort(field)}
      className="cursor-pointer px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted hover:text-text-primary transition-colors select-none"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className={cn('h-3 w-3', sortField === field ? 'text-accent' : 'opacity-40')} />
      </span>
    </th>
  )

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-status-yellow/10 p-2">
            <FileText className="h-5 w-5 text-status-yellow" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Reports</h1>
            <p className="text-text-secondary text-sm">
              View created tickets and publish reports to Confluence
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {fetched && tickets.length > 0 && (
            <button
              onClick={openPublishDialog}
              className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
            >
              <BookOpen className="h-4 w-4" />
              Publish to Confluence
            </button>
          )}
          <button onClick={() => setShowHelp(true)} className="flex items-center gap-2 rounded-full border border-border-subtle px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition">
            <Info className="h-4 w-4" /> How it works
          </button>
        </div>
      </div>

      {/* Date range + fetch */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[160px]">
            <label className="block text-[11px] font-medium text-text-muted uppercase tracking-wide mb-1">
              From
            </label>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full rounded-lg border border-border bg-body py-2 pl-8 pr-3 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>
          <div className="min-w-[160px]">
            <label className="block text-[11px] font-medium text-text-muted uppercase tracking-wide mb-1">
              To
            </label>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full rounded-lg border border-border bg-body py-2 pl-8 pr-3 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>
          <button
            onClick={fetchTickets}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Generate Report
          </button>
        </div>
      </div>

      {/* Summary stats */}
      {fetched && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-text-secondary">Total Tickets</p>
            <p className="text-2xl font-bold text-text-primary mt-1">{totalCount}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-text-secondary">By Type</p>
            <div className="mt-2 space-y-1">
              {Object.entries(byType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">{type}</span>
                  <span className="font-medium text-text-primary">{count}</span>
                </div>
              ))}
              {Object.keys(byType).length === 0 && (
                <p className="text-xs text-text-muted">No data</p>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-text-secondary">By Priority</p>
            <div className="mt-2 space-y-1">
              {Object.entries(byPriority).map(([priority, count]) => (
                <div key={priority} className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">{priority}</span>
                  <span className="font-medium text-text-primary">{count}</span>
                </div>
              ))}
              {Object.keys(byPriority).length === 0 && (
                <p className="text-xs text-text-muted">No data</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tickets table */}
      {fetched && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-body/50">
                <tr>
                  <SortHeader field="jiraKey" label="Jira Key" />
                  <SortHeader field="summary" label="Summary" />
                  <SortHeader field="issueType" label="Type" />
                  <SortHeader field="priority" label="Priority" />
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                    Assignee
                  </th>
                  <SortHeader field="source" label="Source" />
                  <SortHeader field="createdAt" label="Created" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedTickets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-text-muted">
                      No tickets found for this period
                    </td>
                  </tr>
                ) : (
                  sortedTickets.map((t) => (
                    <tr key={t.id} className="hover:bg-card/80 transition-colors">
                      <td className="px-4 py-3 text-sm">
                        {t.jiraKey ? (
                          <a
                            href={`#`}
                            className="font-medium text-accent hover:text-accent-light transition-colors inline-flex items-center gap-1"
                          >
                            {t.jiraKey}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-text-muted">--</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-primary max-w-[300px] truncate">
                        {t.summary}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-md bg-status-blue/10 px-2 py-0.5 text-xs font-medium text-status-blue">
                          {t.issueType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {t.priority ?? '--'}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {t.assignee ?? '--'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex rounded-md px-2 py-0.5 text-xs font-medium',
                            t.source === 'EXCEL'
                              ? 'bg-status-green/10 text-status-green'
                              : 'bg-status-blue/10 text-status-blue'
                          )}
                        >
                          {t.source}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary whitespace-nowrap">
                        {t.createdAt.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confluence Publish modal */}
      {showPublish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative mx-4 w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-text-primary mb-4">
              Publish to Confluence
            </h2>

            {publishResult ? (
              <div className="text-center py-4">
                <CheckCircle2 className="h-12 w-12 text-status-green mx-auto mb-3" />
                <p className="text-sm text-text-primary font-medium mb-2">
                  Report published successfully!
                </p>
                <a
                  href={publishResult.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-accent hover:text-accent-light"
                >
                  View page <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <div className="mt-4">
                  <button
                    onClick={() => setShowPublish(false)}
                    className="rounded-lg bg-accent px-6 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Space selector */}
                <div>
                  <label className="block text-[11px] font-medium text-text-muted uppercase tracking-wide mb-1">
                    Confluence Space
                  </label>
                  <div className="relative">
                    <select
                      value={selectedSpace}
                      onChange={(e) => setSelectedSpace(e.target.value)}
                      disabled={publishing}
                      className="w-full appearance-none rounded-lg border border-border bg-body py-2 pl-3 pr-8 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
                    >
                      {spaces.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.name} ({s.key})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
                  </div>
                </div>

                {/* Page title */}
                <div>
                  <label className="block text-[11px] font-medium text-text-muted uppercase tracking-wide mb-1">
                    Page Title
                  </label>
                  <input
                    type="text"
                    value={pageTitle}
                    onChange={(e) => setPageTitle(e.target.value)}
                    placeholder="QA Report - April 2026"
                    disabled={publishing}
                    className="w-full rounded-lg border border-border bg-body py-2 px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
                  />
                </div>

                {/* Mode */}
                <div>
                  <label className="block text-[11px] font-medium text-text-muted uppercase tracking-wide mb-1">
                    Publish Mode
                  </label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setPublishMode('new')}
                      className={cn(
                        'flex-1 rounded-lg border py-2 text-sm font-medium transition-colors',
                        publishMode === 'new'
                          ? 'border-accent bg-accent/10 text-accent'
                          : 'border-border text-text-secondary hover:bg-body'
                      )}
                    >
                      Create new page
                    </button>
                    <button
                      onClick={() => setPublishMode('append')}
                      className={cn(
                        'flex-1 rounded-lg border py-2 text-sm font-medium transition-colors',
                        publishMode === 'append'
                          ? 'border-accent bg-accent/10 text-accent'
                          : 'border-border text-text-secondary hover:bg-body'
                      )}
                    >
                      Append to existing
                    </button>
                  </div>
                </div>

                {publishError && (
                  <div className="flex items-center gap-2 rounded-lg border border-status-red/30 bg-status-red/10 px-3 py-2 text-sm text-status-red">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {publishError}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowPublish(false)}
                    className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-text-secondary hover:bg-body transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePublish}
                    disabled={publishing || !pageTitle.trim() || !selectedSpace}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-accent py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors disabled:opacity-50"
                  >
                    {publishing && <Loader2 className="h-4 w-4 animate-spin" />}
                    Publish
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    <HowItWorks steps={howItWorksSteps} isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  )
}
