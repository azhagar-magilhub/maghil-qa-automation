import { useState, useEffect } from 'react'
import {
  FileSearch, Search, Plus, Trash2, Filter, AlertTriangle,
  ChevronDown, ChevronRight, Bell, Settings, RefreshCw, X, Info, ArrowRight, Plug, Server, Bug
} from 'lucide-react'
import {
  collection, addDoc, deleteDoc, doc, query, where,
  onSnapshot, serverTimestamp, orderBy, limit as firestoreLimit
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'
import HowItWorks from '@/components/shared/HowItWorks'
import api from '@/lib/api'

const howItWorksSteps = [
  {
    title: 'Connect Source',
    description: 'Add a log source: Cloud Logging, ELK Stack, or file-based logs. Provide connection details to start ingesting logs.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Plug className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Connect</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Server className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Source</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Search Logs',
    description: 'Use the search bar and severity filters to find relevant log entries. Search across all connected sources.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Search className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Query</span>
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
    title: 'View Error Groups',
    description: 'Errors are automatically grouped by fingerprint. See occurrence counts and details to identify the most impactful issues.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <FileSearch className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Groups</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Bug className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Errors</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Set Alerts',
    description: 'Configure alert thresholds to get notified when error rates spike or specific patterns are detected.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Bell className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Alerts</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Rules</span>
        </div>
      </div>
    ),
  },
]

// ─── Types ───────────────────────────────────────────────────────────────────

type LogSourceType = 'cloud-logging' | 'elk' | 'file'
type Severity = 'error' | 'warning' | 'info' | 'debug'

interface LogSource {
  id: string
  type: LogSourceType
  name: string
  config: Record<string, string>
  userId: string
}

interface LogEntry {
  id: string
  timestamp: string
  severity: Severity
  message: string
  service: string
  fingerprint?: string
}

interface ErrorGroup {
  fingerprint: string
  message: string
  count: number
  severity: Severity
  service: string
  lastSeen: string
  instances: LogEntry[]
  expanded: boolean
}

interface AlertRule {
  id: string
  name: string
  threshold: number
  window: string
  notify: string
}

const SEVERITY_COLORS: Record<Severity, string> = {
  error: 'bg-red-500/20 text-red-400',
  warning: 'bg-yellow-500/20 text-yellow-400',
  info: 'bg-blue-500/20 text-blue-400',
  debug: 'bg-purple-500/20 text-purple-400',
}

const LOG_SOURCE_CONFIGS: Record<LogSourceType, { label: string; fields: string[] }> = {
  'cloud-logging': { label: 'Cloud Logging', fields: ['Project ID', 'Credentials JSON Path'] },
  'elk': { label: 'ELK Stack', fields: ['Elasticsearch URL', 'Index Pattern', 'API Key'] },
  'file': { label: 'File', fields: ['File Path', 'Format (json/text)'] },
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function LogAnalyzerPage() {
  const [showHelp, setShowHelp] = useState(false)
  const { user } = useAuthStore()

  // Sources
  const [sources, setSources] = useState<LogSource[]>([])
  const [showSourceForm, setShowSourceForm] = useState(false)
  const [sourceType, setSourceType] = useState<LogSourceType>('cloud-logging')
  const [sourceName, setSourceName] = useState('')
  const [sourceConfig, setSourceConfig] = useState<Record<string, string>>({})

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('')
  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all')
  const [serviceFilter, setServiceFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Results
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [errorGroups, setErrorGroups] = useState<ErrorGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'logs' | 'groups' | 'alerts'>('logs')

  // Alert rules
  const [alertRules, setAlertRules] = useState<AlertRule[]>([])
  const [showAlertForm, setShowAlertForm] = useState(false)
  const [alertName, setAlertName] = useState('')
  const [alertThreshold, setAlertThreshold] = useState(10)
  const [alertWindow, setAlertWindow] = useState('5m')
  const [alertNotify, setAlertNotify] = useState('slack')

  // ── Firestore listeners ──

  useEffect(() => {
    if (!user) return
    const unsubSources = onSnapshot(
      query(collection(db, 'logSources'), where('userId', '==', user.uid)),
      (snap) => setSources(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as LogSource[])
    )
    const unsubAlerts = onSnapshot(
      query(collection(db, 'logAlertRules'), where('userId', '==', user.uid)),
      (snap) => setAlertRules(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as AlertRule[])
    )
    return () => { unsubSources(); unsubAlerts() }
  }, [user])

  // ── Handlers ──

  const handleAddSource = async () => {
    if (!sourceName.trim() || !user) return
    await addDoc(collection(db, 'logSources'), {
      type: sourceType,
      name: sourceName,
      config: sourceConfig,
      userId: user.uid,
      createdAt: serverTimestamp(),
    })
    setSourceName('')
    setSourceConfig({})
    setShowSourceForm(false)
  }

  const handleDeleteSource = async (id: string) => {
    await deleteDoc(doc(db, 'logSources', id))
  }

  const handleSearch = async () => {
    setLoading(true)
    try {
      const { data } = await api.post('/api/v1/logs/search', {
        query: searchQuery,
        severity: severityFilter === 'all' ? undefined : severityFilter,
        service: serviceFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        sourceIds: sources.map((s) => s.id),
      })
      setLogs(data.logs ?? [])

      // Group errors by fingerprint
      const groups: Record<string, ErrorGroup> = {}
      for (const log of (data.logs ?? []) as LogEntry[]) {
        const fp = log.fingerprint ?? log.message.slice(0, 60)
        if (!groups[fp]) {
          groups[fp] = {
            fingerprint: fp,
            message: log.message,
            count: 0,
            severity: log.severity,
            service: log.service,
            lastSeen: log.timestamp,
            instances: [],
            expanded: false,
          }
        }
        groups[fp].count++
        groups[fp].instances.push(log)
        if (log.timestamp > groups[fp].lastSeen) groups[fp].lastSeen = log.timestamp
      }
      setErrorGroups(Object.values(groups).sort((a, b) => b.count - a.count))
    } catch {
      setLogs([])
      setErrorGroups([])
    } finally {
      setLoading(false)
    }
  }

  const toggleGroup = (fp: string) => {
    setErrorGroups((prev) =>
      prev.map((g) => (g.fingerprint === fp ? { ...g, expanded: !g.expanded } : g))
    )
  }

  const handleAddAlert = async () => {
    if (!alertName.trim() || !user) return
    await addDoc(collection(db, 'logAlertRules'), {
      name: alertName,
      threshold: alertThreshold,
      window: alertWindow,
      notify: alertNotify,
      userId: user.uid,
      createdAt: serverTimestamp(),
    })
    setAlertName('')
    setAlertThreshold(10)
    setShowAlertForm(false)
  }

  const handleDeleteAlert = async (id: string) => {
    await deleteDoc(doc(db, 'logAlertRules', id))
  }

  // ── Render ──

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <FileSearch size={24} className="text-accent" />
            Log Analyzer
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Connect log sources, search entries, and set up error alerts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSourceForm(!showSourceForm)}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 transition-colors"
          >
            <Plus size={16} /> Connect Source
          </button>
          <button onClick={() => setShowHelp(true)} className="flex items-center gap-2 rounded-full border border-border-subtle px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition">
            <Info className="h-4 w-4" /> How it works
          </button>
        </div>
      </div>

      {/* Empty state */}
      {sources.length === 0 && !showSourceForm && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileSearch className="h-12 w-12 text-text-muted mb-4" />
          <h3 className="text-lg font-medium text-text-primary mb-1">Connect a log source to get started</h3>
          <p className="text-sm text-text-secondary mb-4">Connect Cloud Logging, ELK Stack, or file-based log sources to search and analyze entries.</p>
          <button onClick={() => setShowSourceForm(true)} className="flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors">
            <Plus size={16} /> Connect Source
          </button>
        </div>
      )}

      {/* Source Form */}
      {showSourceForm && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-4">Connect Log Source</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-text-secondary mb-1 block">Source Type</label>
              <select
                value={sourceType}
                onChange={(e) => { setSourceType(e.target.value as LogSourceType); setSourceConfig({}) }}
                className="w-full rounded-lg border border-border bg-body px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {Object.entries(LOG_SOURCE_CONFIGS).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-text-secondary mb-1 block">Name</label>
              <input
                type="text"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                placeholder="e.g., Production Logs"
                className="w-full rounded-lg border border-border bg-body px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            {LOG_SOURCE_CONFIGS[sourceType].fields.map((field) => (
              <div key={field}>
                <label className="text-xs text-text-secondary mb-1 block">{field}</label>
                <input
                  type="text"
                  value={sourceConfig[field] ?? ''}
                  onChange={(e) => setSourceConfig((prev) => ({ ...prev, [field]: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-body px-3 py-2 text-sm text-text-primary font-mono placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleAddSource}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 transition-colors"
            >
              Connect
            </button>
            <button
              onClick={() => setShowSourceForm(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Connected Sources */}
      {sources.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {sources.map((s) => (
            <div key={s.id} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-xs font-medium text-text-primary">{s.name}</span>
              <span className="text-[10px] text-text-secondary">({LOG_SOURCE_CONFIGS[s.type]?.label})</span>
              <button onClick={() => handleDeleteSource(s.id)} className="ml-1 text-text-secondary hover:text-red-400 transition-colors">
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search & Filters */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search logs..."
              className="w-full rounded-lg border border-border bg-body pl-10 pr-4 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-accent"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as Severity | 'all')}
            className="rounded-lg border border-border bg-body px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="all">All Severities</option>
            <option value="error">Error</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
          </select>
          <input
            type="text"
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            placeholder="Service"
            className="w-32 rounded-lg border border-border bg-body px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-lg border border-border bg-body px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent" />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-lg border border-border bg-body px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent" />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
          >
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
            Search
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(['logs', 'groups', 'alerts'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px',
              activeTab === tab
                ? 'border-accent text-accent-light'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            )}
          >
            {tab === 'groups' ? 'Error Groups' : tab === 'alerts' ? 'Alert Rules' : tab}
          </button>
        ))}
      </div>

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {logs.length === 0 ? (
            <div className="py-12 text-center text-text-secondary">
              <FileSearch size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No log entries. Run a search to populate results.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">Timestamp</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">Severity</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">Message</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">Service</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-body/50 transition-colors">
                      <td className="px-4 py-2.5 text-text-secondary text-xs font-mono whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={cn('rounded px-2 py-0.5 text-xs font-medium', SEVERITY_COLORS[log.severity])}>
                          {log.severity}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-text-primary font-mono text-xs max-w-lg truncate">{log.message}</td>
                      <td className="px-4 py-2.5">
                        <span className="rounded bg-body px-2 py-0.5 text-xs text-text-secondary">{log.service}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Error Groups Tab */}
      {activeTab === 'groups' && (
        <div className="space-y-2">
          {errorGroups.length === 0 ? (
            <div className="rounded-xl border border-border bg-card py-12 text-center text-text-secondary">
              <AlertTriangle size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No error groups. Run a search first.</p>
            </div>
          ) : (
            errorGroups.map((group) => (
              <div key={group.fingerprint} className="rounded-xl border border-border bg-card overflow-hidden">
                <button
                  onClick={() => toggleGroup(group.fingerprint)}
                  className="w-full flex items-center gap-3 px-5 py-3 hover:bg-body/50 transition-colors text-left"
                >
                  {group.expanded ? <ChevronDown size={16} className="text-text-secondary" /> : <ChevronRight size={16} className="text-text-secondary" />}
                  <span className={cn('rounded px-2 py-0.5 text-xs font-medium', SEVERITY_COLORS[group.severity])}>
                    {group.severity}
                  </span>
                  <span className="flex-1 text-sm text-text-primary font-mono truncate">{group.message}</span>
                  <span className="rounded bg-body px-2 py-0.5 text-xs text-text-secondary">{group.service}</span>
                  <span className="rounded-full bg-accent/20 px-2.5 py-0.5 text-xs font-semibold text-accent-light">
                    {group.count}x
                  </span>
                </button>
                {group.expanded && (
                  <div className="border-t border-border">
                    {group.instances.map((inst) => (
                      <div key={inst.id} className="flex items-center gap-4 px-5 py-2 pl-12 text-xs border-b border-border last:border-0 hover:bg-body/30">
                        <span className="text-text-secondary font-mono whitespace-nowrap">
                          {new Date(inst.timestamp).toLocaleString()}
                        </span>
                        <span className="text-text-primary font-mono truncate">{inst.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Alert Rules Tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowAlertForm(!showAlertForm)}
              className="flex items-center gap-1.5 text-xs font-medium text-accent-light hover:text-accent transition-colors"
            >
              <Plus size={14} /> Add Alert Rule
            </button>
          </div>
          {showAlertForm && (
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-text-secondary mb-1 block">Rule Name</label>
                  <input
                    type="text"
                    value={alertName}
                    onChange={(e) => setAlertName(e.target.value)}
                    placeholder="High Error Rate"
                    className="w-full rounded-lg border border-border bg-body px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-secondary mb-1 block">Error Count Threshold</label>
                  <input
                    type="number"
                    min={1}
                    value={alertThreshold}
                    onChange={(e) => setAlertThreshold(Number(e.target.value))}
                    className="w-full rounded-lg border border-border bg-body px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-secondary mb-1 block">Time Window</label>
                  <select
                    value={alertWindow}
                    onChange={(e) => setAlertWindow(e.target.value)}
                    className="w-full rounded-lg border border-border bg-body px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="1m">1 minute</option>
                    <option value="5m">5 minutes</option>
                    <option value="15m">15 minutes</option>
                    <option value="1h">1 hour</option>
                    <option value="24h">24 hours</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-text-secondary mb-1 block">Notify Via</label>
                  <select
                    value={alertNotify}
                    onChange={(e) => setAlertNotify(e.target.value)}
                    className="w-full rounded-lg border border-border bg-body px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="slack">Slack</option>
                    <option value="teams">Teams</option>
                    <option value="email">Email</option>
                    <option value="in-app">In-App</option>
                  </select>
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleAddAlert}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 transition-colors"
                >
                  Create Rule
                </button>
                <button
                  onClick={() => setShowAlertForm(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {alertRules.length === 0 && !showAlertForm ? (
            <div className="rounded-xl border border-border bg-card py-12 text-center text-text-secondary">
              <Bell size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No alert rules configured.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alertRules.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-3">
                  <div className="flex items-center gap-4">
                    <Bell size={16} className="text-accent-light" />
                    <div>
                      <p className="text-sm font-medium text-text-primary">{rule.name}</p>
                      <p className="text-xs text-text-secondary">
                        Alert when error count exceeds {rule.threshold} in {rule.window} -- notify via {rule.notify}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteAlert(rule.id)}
                    className="p-1.5 text-text-secondary hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
    <HowItWorks steps={howItWorksSteps} isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  )
}
