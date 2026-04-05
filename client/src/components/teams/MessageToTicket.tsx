import { useState, useEffect } from 'react'
import { TicketCheck, Loader2, CheckCircle2, XCircle, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import type { TeamsMessage } from './MessageList'

interface JiraProject {
  id: string
  key: string
  name: string
}

interface IssueType {
  id: string
  name: string
  subtask: boolean
}

interface MessageToTicketProps {
  selectedMessages: TeamsMessage[]
  teamId: string | null
  channelId: string | null
}

interface TicketResult {
  messageId: string
  status: 'SUCCESS' | 'FAILED'
  jiraKey?: string
  error?: string
}

export default function MessageToTicket({
  selectedMessages,
  teamId,
  channelId,
}: MessageToTicketProps) {
  const [projects, setProjects] = useState<JiraProject[]>([])
  const [issueTypes, setIssueTypes] = useState<IssueType[]>([])
  const [selectedProject, setSelectedProject] = useState('')
  const [selectedIssueType, setSelectedIssueType] = useState('')
  const [creating, setCreating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<TicketResult[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProjects()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      fetchIssueTypes(selectedProject)
    }
  }, [selectedProject])

  const fetchProjects = async () => {
    try {
      const { data } = await api.get('/api/v1/jira/projects')
      const list = data.projects ?? data ?? []
      setProjects(list)
      if (list.length > 0) setSelectedProject(list[0].key)
    } catch (err) {
      console.error('Failed to fetch projects', err)
    }
  }

  const fetchIssueTypes = async (projectKey: string) => {
    try {
      const { data } = await api.get(`/api/v1/jira/projects/${projectKey}/issue-types`)
      const list = (data.issueTypes ?? data ?? []).filter((t: IssueType) => !t.subtask)
      setIssueTypes(list)
      if (list.length > 0) setSelectedIssueType(list[0].id)
    } catch (err) {
      console.error('Failed to fetch issue types', err)
    }
  }

  const handleConvert = async () => {
    if (!teamId || !channelId || selectedMessages.length === 0) return
    try {
      setCreating(true)
      setError(null)
      setResults([])
      setProgress(0)

      const payload = {
        teamId,
        channelId,
        projectKey: selectedProject,
        issueTypeId: selectedIssueType,
        messages: selectedMessages.map((m) => ({
          id: m.id,
          sender: m.from?.user?.displayName ?? 'Unknown',
          content: m.body.content,
          contentType: m.body.contentType,
          timestamp: m.createdDateTime,
        })),
      }

      const { data } = await api.post('/api/v1/teams/create-tickets', payload)

      // Simulate progress updates
      const total = selectedMessages.length
      for (let i = 1; i <= total; i++) {
        setProgress(Math.round((i / total) * 100))
        if (i < total) await new Promise((r) => setTimeout(r, 200))
      }

      setResults(data.results ?? [])
    } catch (err) {
      setError('Failed to create tickets. Please try again.')
      console.error(err)
    } finally {
      setCreating(false)
    }
  }

  const successCount = results.filter((r) => r.status === 'SUCCESS').length
  const failedCount = results.filter((r) => r.status === 'FAILED').length

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-text-primary">Create Tickets</h3>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Selected count */}
        <div className="rounded-lg border border-border bg-body px-4 py-3 text-center">
          <p className="text-2xl font-bold text-text-primary">
            {selectedMessages.length}
          </p>
          <p className="text-xs text-text-muted">
            message{selectedMessages.length !== 1 ? 's' : ''} selected
          </p>
        </div>

        {/* Project selector */}
        <div>
          <label className="block text-[11px] font-medium text-text-muted uppercase tracking-wide mb-1">
            Jira Project
          </label>
          <div className="relative">
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              disabled={creating}
              className="w-full appearance-none rounded-lg border border-border bg-body py-2 pl-3 pr-8 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
            >
              {projects.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.name} ({p.key})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
          </div>
        </div>

        {/* Issue type selector */}
        <div>
          <label className="block text-[11px] font-medium text-text-muted uppercase tracking-wide mb-1">
            Issue Type
          </label>
          <div className="relative">
            <select
              value={selectedIssueType}
              onChange={(e) => setSelectedIssueType(e.target.value)}
              disabled={creating}
              className="w-full appearance-none rounded-lg border border-border bg-body py-2 pl-3 pr-8 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
            >
              {issueTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
          </div>
        </div>

        {/* Convert button */}
        <button
          onClick={handleConvert}
          disabled={creating || selectedMessages.length === 0 || !selectedProject}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium text-white transition-colors',
            creating || selectedMessages.length === 0
              ? 'bg-accent/50 cursor-not-allowed'
              : 'bg-accent hover:bg-accent/90'
          )}
        >
          {creating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <TicketCheck className="h-4 w-4" />
          )}
          {creating ? 'Creating...' : 'Convert to Tickets'}
        </button>

        {/* Progress bar */}
        {creating && (
          <div className="space-y-1">
            <div className="h-2 rounded-full bg-body overflow-hidden">
              <div
                className="h-full rounded-full bg-accent transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-text-muted text-center">{progress}%</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-status-red/30 bg-status-red/10 px-3 py-2 text-sm text-status-red">
            {error}
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-3">
            <div className="flex gap-3">
              {successCount > 0 && (
                <div className="flex-1 rounded-lg border border-status-green/30 bg-status-green/10 px-3 py-2 text-center">
                  <p className="text-lg font-bold text-status-green">{successCount}</p>
                  <p className="text-[11px] text-status-green">Created</p>
                </div>
              )}
              {failedCount > 0 && (
                <div className="flex-1 rounded-lg border border-status-red/30 bg-status-red/10 px-3 py-2 text-center">
                  <p className="text-lg font-bold text-status-red">{failedCount}</p>
                  <p className="text-[11px] text-status-red">Failed</p>
                </div>
              )}
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {results.map((r, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs"
                >
                  {r.status === 'SUCCESS' ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-status-green shrink-0" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-status-red shrink-0" />
                  )}
                  <span className="text-text-secondary truncate">
                    {r.jiraKey ? (
                      <a
                        href={`#`}
                        className="text-accent hover:text-accent-light"
                      >
                        {r.jiraKey}
                      </a>
                    ) : (
                      r.error ?? 'Failed'
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
