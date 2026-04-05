import { useState, useEffect } from 'react'
import {
  Server, Plus, Play, Trash2, ArrowRight, Info, Loader2,
  Copy, ToggleLeft, ToggleRight, FileText, Clock, RefreshCw,
  ChevronDown, CheckCircle2, XCircle, Upload, List, Zap,
} from 'lucide-react'
import { collection, query, onSnapshot, orderBy, doc, deleteDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'
import HowItWorks from '@/components/shared/HowItWorks'
import api from '@/lib/api'

// ─── HowItWorks ─────────────────────────────────────────────────────────────

const howItWorksSteps = [
  {
    title: 'Create Mock',
    description: 'Define mock API endpoints with method, path, status code, and response body. Simulate real API behavior.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Plus className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Create</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Server className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Mock</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Configure Response',
    description: 'Set response headers, body (JSON), status codes, and even add latency to simulate real-world conditions.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <FileText className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Configure</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Zap className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Ready</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Use Mock URL',
    description: 'Copy the mock server URL and use it in your tests. The mock proxy returns your configured response automatically.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Copy className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Copy URL</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Play className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Test</span>
        </div>
      </div>
    ),
  },
  {
    title: 'View Request Log',
    description: 'Monitor all requests received by your mock endpoints. See timestamps, methods, paths, and response codes.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <List className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Requests</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Clock className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Log</span>
        </div>
      </div>
    ),
  },
]

// ─── Types ──────────────────────────────────────────────────────────────────

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE'] as const
const STATUS_CODES = [200, 201, 204, 400, 401, 403, 404, 500, 502, 503] as const

interface MockEndpoint {
  id: string
  method: string
  path: string
  statusCode: number
  headers: Record<string, string>
  responseBody: string
  delay: number
  enabled: boolean
  conditionalResponses?: Array<{ matchField: string; matchValue: string; responseBody: string; statusCode: number }>
  createdAt: any
}

interface RequestLogEntry {
  id: string
  mockId: string
  method: string
  path: string
  statusCode: number
  timestamp: Date
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function MockServerPage() {
  const { user } = useAuthStore()
  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const [mocks, setMocks] = useState<MockEndpoint[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [tab, setTab] = useState<'endpoints' | 'logs' | 'import'>('endpoints')
  const [saving, setSaving] = useState(false)
  const [requestLogs] = useState<RequestLogEntry[]>([])
  const [copiedUrl, setCopiedUrl] = useState(false)

  // Form state
  const [formMethod, setFormMethod] = useState<string>('GET')
  const [formPath, setFormPath] = useState('/api/example')
  const [formStatus, setFormStatus] = useState(200)
  const [formHeaders, setFormHeaders] = useState('{\n  "Content-Type": "application/json"\n}')
  const [formBody, setFormBody] = useState('{\n  "message": "Hello from mock server",\n  "success": true\n}')
  const [formDelay, setFormDelay] = useState(0)
  const [swaggerSpec, setSwaggerSpec] = useState('')

  const mockBaseUrl = `${window.location.origin}/api/mock-proxy`

  // Load mocks from Firestore
  useEffect(() => {
    const q = query(
      collection(db, 'mockEndpoints'),
      orderBy('createdAt', 'desc')
    )
    const unsub = onSnapshot(q, (snap) => {
      const items: MockEndpoint[] = []
      snap.forEach((d) => items.push({ id: d.id, ...d.data() } as MockEndpoint))
      setMocks(items)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  // Create mock
  const handleCreateMock = async () => {
    setSaving(true)
    try {
      let parsedHeaders: Record<string, string> = {}
      try { parsedHeaders = JSON.parse(formHeaders) } catch {}

      await api.post('/mocks', {
        method: formMethod,
        path: formPath,
        statusCode: formStatus,
        headers: parsedHeaders,
        responseBody: formBody,
        delay: formDelay,
        enabled: true,
      })

      setShowCreateForm(false)
      resetForm()
    } catch (err) {
      console.error('Failed to create mock:', err)
    }
    setSaving(false)
  }

  const resetForm = () => {
    setFormMethod('GET')
    setFormPath('/api/example')
    setFormStatus(200)
    setFormHeaders('{\n  "Content-Type": "application/json"\n}')
    setFormBody('{\n  "message": "Hello from mock server",\n  "success": true\n}')
    setFormDelay(0)
  }

  // Toggle mock enabled
  const toggleMock = async (mock: MockEndpoint) => {
    try {
      await api.put(`/mocks/${mock.id}`, { enabled: !mock.enabled })
    } catch (err) {
      console.error('Failed to toggle mock:', err)
    }
  }

  // Delete mock
  const deleteMock = async (id: string) => {
    try {
      await api.delete(`/mocks/${id}`)
    } catch (err) {
      console.error('Failed to delete mock:', err)
    }
  }

  // Copy URL
  const copyMockUrl = (mock: MockEndpoint) => {
    navigator.clipboard.writeText(`${mockBaseUrl}/${mock.id}${mock.path}`)
    setCopiedUrl(true)
    setTimeout(() => setCopiedUrl(false), 2000)
  }

  // Import from Swagger
  const handleSwaggerImport = async () => {
    if (!swaggerSpec.trim()) return
    setSaving(true)
    try {
      const spec = JSON.parse(swaggerSpec)
      const paths = spec.paths || {}
      for (const [path, methods] of Object.entries(paths)) {
        for (const [method, config] of Object.entries(methods as Record<string, any>)) {
          if (['get', 'post', 'put', 'delete'].includes(method.toLowerCase())) {
            await api.post('/mocks', {
              method: method.toUpperCase(),
              path,
              statusCode: 200,
              headers: { 'Content-Type': 'application/json' },
              responseBody: JSON.stringify(config.responses?.['200']?.content?.['application/json']?.schema || { message: 'Mock response' }, null, 2),
              delay: 0,
              enabled: true,
            })
          }
        }
      }
      setSwaggerSpec('')
      setTab('endpoints')
    } catch (err) {
      console.error('Failed to import swagger:', err)
    }
    setSaving(false)
  }

  const methodColor = (m: string) => {
    const colors: Record<string, string> = {
      GET: 'bg-green-500/10 text-green-400',
      POST: 'bg-blue-500/10 text-blue-400',
      PUT: 'bg-amber-500/10 text-amber-400',
      DELETE: 'bg-red-500/10 text-red-400',
    }
    return colors[m] || 'bg-border/50 text-text-muted'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">API Mock Server</h1>
          <p className="text-sm text-text-secondary mt-1">
            Create fake API endpoints for testing without real backends
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
          >
            <Plus size={16} />
            Create Mock
          </button>
          <button
            onClick={() => setShowHowItWorks(true)}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            <Info size={16} />
            How It Works
          </button>
        </div>
      </div>

      {/* Mock Server URL */}
      <div className="rounded-xl border border-border bg-card p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
            <Server className="w-5 h-5 text-accent" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-text-primary">Mock Server Base URL</h3>
            <p className="text-xs text-text-muted font-mono truncate">{mockBaseUrl}</p>
          </div>
        </div>
        <button
          onClick={() => { navigator.clipboard.writeText(mockBaseUrl); setCopiedUrl(true); setTimeout(() => setCopiedUrl(false), 2000) }}
          className="flex items-center gap-2 rounded-lg border border-border bg-body px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          {copiedUrl ? <CheckCircle2 size={14} className="text-status-green" /> : <Copy size={14} />}
          {copiedUrl ? 'Copied' : 'Copy URL'}
        </button>
      </div>

      {/* Create Mock Form */}
      {showCreateForm && (
        <div className="rounded-xl border border-accent/30 bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary">Create Mock Endpoint</h3>
            <button onClick={() => { setShowCreateForm(false); resetForm() }} className="text-text-muted hover:text-text-primary">
              <XCircle size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Method */}
            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1.5">Method</label>
              <select
                value={formMethod}
                onChange={(e) => setFormMethod(e.target.value)}
                className="w-full rounded-lg border border-border bg-body px-3 py-2 text-sm text-text-primary"
              >
                {HTTP_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            {/* Path */}
            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1.5">Path</label>
              <input
                value={formPath}
                onChange={(e) => setFormPath(e.target.value)}
                placeholder="/api/users/:id"
                className="w-full rounded-lg border border-border bg-body px-3 py-2 text-sm text-text-primary"
              />
            </div>

            {/* Status Code */}
            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1.5">Status Code</label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-body px-3 py-2 text-sm text-text-primary"
              >
                {STATUS_CODES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Delay */}
            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1.5">Delay (ms)</label>
              <input
                type="number"
                min={0}
                value={formDelay}
                onChange={(e) => setFormDelay(parseInt(e.target.value) || 0)}
                className="w-full rounded-lg border border-border bg-body px-3 py-2 text-sm text-text-primary"
              />
            </div>
          </div>

          {/* Headers */}
          <div className="mb-4">
            <label className="text-xs font-medium text-text-secondary block mb-1.5">Response Headers (JSON)</label>
            <textarea
              value={formHeaders}
              onChange={(e) => setFormHeaders(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border bg-body px-3 py-2 text-sm text-text-primary font-mono resize-none focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>

          {/* Response Body */}
          <div className="mb-4">
            <label className="text-xs font-medium text-text-secondary block mb-1.5">Response Body (JSON)</label>
            <textarea
              value={formBody}
              onChange={(e) => setFormBody(e.target.value)}
              rows={6}
              className="w-full rounded-lg border border-border bg-body px-3 py-2 text-sm text-text-primary font-mono resize-none focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => { setShowCreateForm(false); resetForm() }}
              className="rounded-lg border border-border bg-body px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateMock}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Create Mock
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(['endpoints', 'logs', 'import'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px capitalize',
              tab === t
                ? 'border-accent text-accent-light'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            )}
          >
            {t === 'endpoints' ? 'Mock Endpoints' : t === 'logs' ? 'Request Log' : 'Import from Swagger'}
          </button>
        ))}
      </div>

      {/* Endpoints List */}
      {tab === 'endpoints' && (
        <div className="space-y-3">
          {mocks.length === 0 ? (
            <div className="rounded-xl border border-border bg-card py-12 text-center">
              <Server className="h-10 w-10 text-text-muted mx-auto mb-3" />
              <p className="text-sm text-text-muted">No mock endpoints yet. Create one to get started.</p>
            </div>
          ) : (
            mocks.map((mock) => (
              <div key={mock.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  {/* Method badge */}
                  <span className={cn('rounded-md px-2.5 py-1 text-xs font-bold', methodColor(mock.method))}>
                    {mock.method}
                  </span>

                  {/* Path */}
                  <span className="text-sm font-mono text-text-primary flex-1 truncate">{mock.path}</span>

                  {/* Status */}
                  <span className="rounded-md bg-body border border-border px-2 py-0.5 text-xs font-mono text-text-secondary">
                    {mock.statusCode}
                  </span>

                  {/* Delay */}
                  {mock.delay > 0 && (
                    <span className="flex items-center gap-1 text-xs text-text-muted">
                      <Clock size={10} /> {mock.delay}ms
                    </span>
                  )}

                  {/* Toggle */}
                  <button onClick={() => toggleMock(mock)} className="text-text-secondary hover:text-text-primary">
                    {mock.enabled ? (
                      <ToggleRight size={22} className="text-status-green" />
                    ) : (
                      <ToggleLeft size={22} className="text-text-muted" />
                    )}
                  </button>

                  {/* Copy URL */}
                  <button
                    onClick={() => copyMockUrl(mock)}
                    className="text-text-muted hover:text-text-primary transition-colors"
                    title="Copy mock URL"
                  >
                    <Copy size={14} />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => deleteMock(mock.id)}
                    className="text-text-muted hover:text-status-red transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Response body preview */}
                <div className="mt-3 rounded-lg bg-body border border-border p-2.5 max-h-24 overflow-y-auto">
                  <pre className="text-xs text-text-secondary font-mono whitespace-pre-wrap">
                    {mock.responseBody?.slice(0, 200) || '{}'}
                    {(mock.responseBody?.length || 0) > 200 && '...'}
                  </pre>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Request Log */}
      {tab === 'logs' && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-body">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">Time</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">Method</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">Path</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {requestLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-sm text-text-muted">
                      No requests logged yet. Requests will appear here when mock endpoints are hit.
                    </td>
                  </tr>
                ) : (
                  requestLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-body/50 transition-colors">
                      <td className="px-4 py-3 text-xs text-text-muted">{log.timestamp.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={cn('rounded-md px-2 py-0.5 text-[10px] font-bold', methodColor(log.method))}>
                          {log.method}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-text-primary">{log.path}</td>
                      <td className="px-4 py-3 text-xs font-mono text-text-secondary">{log.statusCode}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Import from Swagger */}
      {tab === 'import' && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Upload size={16} className="text-accent" />
            <h3 className="text-sm font-semibold text-text-primary">Import from OpenAPI / Swagger Spec</h3>
          </div>
          <p className="text-xs text-text-secondary mb-4">
            Paste your OpenAPI JSON spec below. Mock endpoints will be auto-created for each path and method.
          </p>
          <textarea
            value={swaggerSpec}
            onChange={(e) => setSwaggerSpec(e.target.value)}
            rows={12}
            placeholder='{\n  "openapi": "3.0.0",\n  "paths": {\n    "/api/users": {\n      "get": { ... }\n    }\n  }\n}'
            className="w-full rounded-lg border border-border bg-body px-3 py-2 text-sm text-text-primary font-mono resize-none focus:outline-none focus:ring-2 focus:ring-accent/40 mb-4"
          />
          <button
            onClick={handleSwaggerImport}
            disabled={saving || !swaggerSpec.trim()}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            Import Mocks
          </button>
        </div>
      )}

      <HowItWorks steps={howItWorksSteps} isOpen={showHowItWorks} onClose={() => setShowHowItWorks(false)} />
    </div>
  )
}
