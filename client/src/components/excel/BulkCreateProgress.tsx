import { useState, useEffect, useCallback } from 'react'
import { Check, X, Loader2, ExternalLink, RefreshCw, AlertTriangle } from 'lucide-react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import type { ValidatedRow } from './ValidationPreview'
import type { ColumnMapping } from './ColumnMapper'

type RowStatus = 'pending' | 'creating' | 'created' | 'failed'

interface TicketRow {
  index: number
  summary: string
  status: RowStatus
  jiraKey: string | null
  jiraUrl: string | null
  error: string | null
}

interface JiraProject {
  key: string
  name: string
}

interface JiraIssueType {
  id: string
  name: string
}

interface BulkCreateProgressProps {
  rows: ValidatedRow[]
  mapping: ColumnMapping
  fileUrl: string
  onBack: () => void
  onReset: () => void
}

export default function BulkCreateProgress({ rows, mapping, fileUrl, onBack, onReset }: BulkCreateProgressProps) {
  const [projects, setProjects] = useState<JiraProject[]>([])
  const [issueTypes, setIssueTypes] = useState<JiraIssueType[]>([])
  const [selectedProject, setSelectedProject] = useState('')
  const [selectedIssueType, setSelectedIssueType] = useState('')
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [loadingIssueTypes, setLoadingIssueTypes] = useState(false)

  const [createState, setCreateState] = useState<'config' | 'creating' | 'done'>('config')
  const [batchId, setBatchId] = useState<string | null>(null)
  const [ticketRows, setTicketRows] = useState<TicketRow[]>([])

  const createdCount = ticketRows.filter((r) => r.status === 'created').length
  const failedCount = ticketRows.filter((r) => r.status === 'failed').length
  const pendingCount = ticketRows.filter((r) => r.status === 'pending' || r.status === 'creating').length
  const totalCount = ticketRows.length
  const progressPercent = totalCount > 0 ? Math.round(((createdCount + failedCount) / totalCount) * 100) : 0

  // Fetch projects on mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await api.get('/api/v1/jira/projects')
        setProjects(response.data)
        if (response.data.length > 0) {
          setSelectedProject(response.data[0].key)
        }
      } catch {
        // silently handle
      } finally {
        setLoadingProjects(false)
      }
    }
    fetchProjects()
  }, [])

  // Fetch issue types when project changes
  useEffect(() => {
    if (!selectedProject) return
    const fetchIssueTypes = async () => {
      setLoadingIssueTypes(true)
      try {
        const response = await api.get(`/api/v1/jira/issue-types/${selectedProject}`)
        setIssueTypes(response.data)
        if (response.data.length > 0) {
          setSelectedIssueType(response.data[0].id)
        }
      } catch {
        // silently handle
      } finally {
        setLoadingIssueTypes(false)
      }
    }
    fetchIssueTypes()
  }, [selectedProject])

  // Subscribe to real-time updates via Firestore
  useEffect(() => {
    if (!batchId) return

    const unsubscribe = onSnapshot(doc(db, 'batches', batchId), (snapshot) => {
      const batchData = snapshot.data()
      if (!batchData?.tickets) return

      const tickets = batchData.tickets as Array<{
        index: number
        status: RowStatus
        jiraKey?: string
        jiraUrl?: string
        error?: string
      }>

      setTicketRows((prev) =>
        prev.map((row) => {
          const update = tickets.find((t) => t.index === row.index)
          if (!update) return row
          return {
            ...row,
            status: update.status,
            jiraKey: update.jiraKey || null,
            jiraUrl: update.jiraUrl || null,
            error: update.error || null,
          }
        })
      )

      // Check if batch is complete
      const allDone = tickets.every((t) => t.status === 'created' || t.status === 'failed')
      if (allDone && tickets.length > 0) {
        setCreateState('done')
      }
    })

    return () => unsubscribe()
  }, [batchId])

  const handleCreate = useCallback(async () => {
    // Initialize ticket rows
    const initialRows: TicketRow[] = rows.map((r) => ({
      index: r.index,
      summary: r.mappedData.summary || '',
      status: 'pending' as RowStatus,
      jiraKey: null,
      jiraUrl: null,
      error: null,
    }))
    setTicketRows(initialRows)
    setCreateState('creating')

    try {
      const response = await api.post('/api/v1/excel/create-tickets', {
        projectKey: selectedProject,
        issueTypeId: selectedIssueType,
        mapping,
        rows: rows.map((r) => r.mappedData),
        fileUrl,
      })
      setBatchId(response.data.batchId)
    } catch {
      setCreateState('done')
      setTicketRows((prev) =>
        prev.map((r) => ({ ...r, status: 'failed' as RowStatus, error: 'Failed to start batch creation' }))
      )
    }
  }, [rows, selectedProject, selectedIssueType, mapping, fileUrl])

  const handleRetryFailed = useCallback(async () => {
    if (!batchId) return

    const failedIndices = ticketRows.filter((r) => r.status === 'failed').map((r) => r.index)

    // Reset failed rows to pending
    setTicketRows((prev) =>
      prev.map((r) =>
        r.status === 'failed' ? { ...r, status: 'pending' as RowStatus, error: null } : r
      )
    )
    setCreateState('creating')

    try {
      await api.post('/api/v1/excel/retry-failed', {
        batchId,
        indices: failedIndices,
      })
    } catch {
      // Firestore listener will handle updates
    }
  }, [batchId, ticketRows])

  // Configuration view
  if (createState === 'config') {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-6 space-y-5">
          <h3 className="text-sm font-semibold text-text-primary">Jira Configuration</h3>

          {/* Project selector */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Project</label>
            {loadingProjects ? (
              <div className="flex items-center gap-2 text-sm text-text-muted py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading projects...
              </div>
            ) : (
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full appearance-none rounded-lg border border-border bg-body px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
              >
                {projects.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.key} - {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Issue type selector */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Issue Type</label>
            {loadingIssueTypes ? (
              <div className="flex items-center gap-2 text-sm text-text-muted py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading issue types...
              </div>
            ) : (
              <select
                value={selectedIssueType}
                onChange={(e) => setSelectedIssueType(e.target.value)}
                className="w-full appearance-none rounded-lg border border-border bg-body px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
              >
                {issueTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Summary */}
          <div className="rounded-lg bg-body border border-border px-4 py-3">
            <p className="text-sm text-text-secondary">
              <span className="font-semibold text-text-primary">{rows.length}</span> tickets will be created in{' '}
              <span className="font-semibold text-accent">{selectedProject || '...'}</span>
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-text-secondary hover:bg-card hover:text-text-primary transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleCreate}
            disabled={!selectedProject || !selectedIssueType}
            className={cn(
              'rounded-lg px-6 py-2.5 text-sm font-semibold text-white transition-colors',
              selectedProject && selectedIssueType
                ? 'bg-accent hover:bg-accent-hover'
                : 'bg-accent/40 cursor-not-allowed'
            )}
          >
            Create {rows.length} Tickets
          </button>
        </div>
      </div>
    )
  }

  // Progress / completion view
  return (
    <div className="space-y-4">
      {/* Progress header */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary">
            {createState === 'creating' ? 'Creating Tickets...' : 'Creation Complete'}
          </h3>
          <span className="text-sm font-medium text-text-secondary">{progressPercent}%</span>
        </div>

        {/* Progress bar */}
        <div className="h-2 rounded-full bg-body overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500 ease-out',
              failedCount > 0 && createState === 'done'
                ? 'bg-status-yellow'
                : 'bg-status-green'
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-status-green" />
            <span className="text-sm text-text-secondary">
              <span className="font-semibold text-status-green">{createdCount}</span> created
            </span>
          </div>
          <div className="flex items-center gap-2">
            <X className="h-4 w-4 text-status-red" />
            <span className="text-sm text-text-secondary">
              <span className="font-semibold text-status-red">{failedCount}</span> failed
            </span>
          </div>
          {pendingCount > 0 && (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 text-text-muted animate-spin" />
              <span className="text-sm text-text-secondary">
                <span className="font-semibold text-text-primary">{pendingCount}</span> remaining
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Ticket rows */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-border bg-sidebar">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-text-secondary w-12">#</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-text-secondary w-16">Status</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-text-secondary">Summary</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-text-secondary">Jira Key</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-text-secondary">Details</th>
              </tr>
            </thead>
            <tbody>
              {ticketRows.map((row) => (
                <tr
                  key={row.index}
                  className={cn(
                    'border-b border-border/50 last:border-0 transition-colors',
                    row.status === 'failed' && 'bg-status-red/5',
                    row.status === 'creating' && 'bg-accent/5'
                  )}
                >
                  <td className="px-4 py-2.5 text-text-muted text-xs">{row.index + 1}</td>
                  <td className="px-4 py-2.5 text-center">
                    {row.status === 'pending' && (
                      <div className="h-4 w-4 rounded-full border border-border mx-auto" />
                    )}
                    {row.status === 'creating' && (
                      <Loader2 className="h-4 w-4 text-accent animate-spin mx-auto" />
                    )}
                    {row.status === 'created' && (
                      <Check className="h-4 w-4 text-status-green mx-auto" />
                    )}
                    {row.status === 'failed' && (
                      <X className="h-4 w-4 text-status-red mx-auto" />
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-text-primary truncate max-w-[250px]">{row.summary}</td>
                  <td className="px-4 py-2.5">
                    {row.jiraKey && row.jiraUrl ? (
                      <a
                        href={row.jiraUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-accent hover:text-accent-light transition-colors font-medium"
                      >
                        {row.jiraKey}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-text-muted">-</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {row.error && (
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-status-red shrink-0" />
                        <span className="text-xs text-status-red truncate max-w-[200px]">{row.error}</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      {createState === 'done' && (
        <div className="flex items-center justify-between">
          {failedCount > 0 ? (
            <button
              onClick={handleRetryFailed}
              className="flex items-center gap-2 rounded-lg border border-status-red/30 px-5 py-2.5 text-sm font-medium text-status-red hover:bg-status-red/10 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Retry {failedCount} Failed
            </button>
          ) : (
            <div />
          )}
          <button
            onClick={onReset}
            className="rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
          >
            Upload Another File
          </button>
        </div>
      )}
    </div>
  )
}
