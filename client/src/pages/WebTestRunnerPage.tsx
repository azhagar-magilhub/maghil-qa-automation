import { useState, useEffect, useCallback } from 'react'
import {
  Play, Bug, Clock, Image, AlertTriangle, CheckCircle2, XCircle,
  Globe, Monitor, Tablet, Smartphone, CircleDot, Columns2, History,
  Loader2, ChevronDown, ChevronRight, Eye, Info, ArrowRight, Code, FileText
} from 'lucide-react'
import {
  collection, query, where, orderBy, onSnapshot, limit, Timestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'
import { usePageTitle } from '@/hooks/usePageTitle'
import HowItWorks from '@/components/shared/HowItWorks'
import api from '@/lib/api'

const howItWorksSteps = [
  {
    title: 'Write Script',
    description: 'Write a Playwright test script in the editor. Use the built-in templates or paste your own test code.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Code className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Script</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <FileText className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Editor</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Configure Browser',
    description: 'Select the target browser (Chromium, Firefox, WebKit) and viewport size for responsive testing.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Globe className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Browser</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Monitor className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Viewport</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Run Test',
    description: 'Click Run to execute the test. Watch progress in real time with live status updates and error output.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Play className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Execute</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Running</span>
        </div>
      </div>
    ),
  },
  {
    title: 'View Results',
    description: 'Review pass/fail status, screenshots, error logs, and auto-filed Jira bugs for failed tests.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Image className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Screenshots</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Bug className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Bugs</span>
        </div>
      </div>
    ),
  },
]

// ─── Types ───────────────────────────────────────────────────────────────────

interface TestExecution {
  id: string
  name: string
  status: 'PASS' | 'FAIL' | 'ERROR' | 'RUNNING'
  duration: number
  browser: string
  viewport: string
  targetUrl: string
  errorLogs: string[]
  screenshots: string[]
  createdAt: Date
  autoFiledBug: string | null
}

interface RunPayload {
  targetUrl: string
  browser: string
  viewport: { width: number; height: number; label: string }
  script: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const BROWSERS = [
  { id: 'chromium', label: 'CircleDot', icon: CircleDot },
  { id: 'firefox', label: 'Firefox', icon: Globe },
  { id: 'webkit', label: 'Safari', icon: Globe },
  { id: 'msedge', label: 'Edge', icon: Globe },
]

const VIEWPORTS = [
  { label: 'Desktop', width: 1920, height: 1080, icon: Monitor },
  { label: 'Tablet', width: 768, height: 1024, icon: Tablet },
  { label: 'Mobile', width: 375, height: 812, icon: Smartphone },
]

const DEFAULT_SCRIPT = `// Playwright-style test script
import { test, expect } from '@playwright/test';

test('homepage loads correctly', async ({ page }) => {
  await page.goto(TARGET_URL);
  await expect(page).toHaveTitle(/./);
  await page.screenshot({ path: 'screenshot.png' });
});`

// ─── Status Helpers ──────────────────────────────────────────────────────────

function statusColor(status: string) {
  switch (status) {
    case 'PASS': return 'bg-status-green'
    case 'FAIL': return 'bg-status-red'
    case 'ERROR': return 'bg-status-yellow'
    case 'RUNNING': return 'bg-status-blue'
    default: return 'bg-card'
  }
}

function statusIcon(status: string) {
  switch (status) {
    case 'PASS': return <CheckCircle2 size={14} />
    case 'FAIL': return <XCircle size={14} />
    case 'ERROR': return <AlertTriangle size={14} />
    case 'RUNNING': return <Loader2 size={14} className="animate-spin" />
    default: return null
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function WebTestRunnerPage() {
  usePageTitle('Web Runner')
  const { user } = useAuthStore()
  const [showHelp, setShowHelp] = useState(false)

  // Form state
  const [targetUrl, setTargetUrl] = useState('https://')
  const [selectedBrowser, setSelectedBrowser] = useState('chromium')
  const [selectedViewport, setSelectedViewport] = useState(VIEWPORTS[0])
  const [script, setScript] = useState(DEFAULT_SCRIPT)
  const [running, setRunning] = useState(false)

  // Results state
  const [activeResultTab, setActiveResultTab] = useState<'results' | 'visual-regression'>('results')
  const [latestResult, setLatestResult] = useState<TestExecution | null>(null)

  // History
  const [history, setHistory] = useState<TestExecution[]>([])
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null)

  // ─── Firestore listener ──────────────────────────────────────────────────

  useEffect(() => {
    if (!user?.uid) return
    const q = query(
      collection(db, 'testExecutions'),
      where('userId', '==', user.uid),
      where('type', '==', 'WEB_PLAYWRIGHT'),
      orderBy('createdAt', 'desc'),
      limit(20)
    )
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt instanceof Timestamp
          ? d.data().createdAt.toDate()
          : new Date(d.data().createdAt),
      })) as TestExecution[]
      setHistory(items)
    })
    return unsub
  }, [user?.uid])

  // ─── Run test ────────────────────────────────────────────────────────────

  const handleRunTest = useCallback(async () => {
    if (!targetUrl || running) return
    setRunning(true)
    setLatestResult(null)
    try {
      const payload: RunPayload = {
        targetUrl,
        browser: selectedBrowser,
        viewport: selectedViewport,
        script,
      }
      const { data } = await api.post('/api/v1/web-test/run', payload)
      setLatestResult(data)
      setActiveResultTab('results')
    } catch (err: any) {
      setLatestResult({
        id: 'error',
        name: 'Test Run',
        status: 'ERROR',
        duration: 0,
        browser: selectedBrowser,
        viewport: selectedViewport.label,
        targetUrl,
        errorLogs: [err.response?.data?.message || err.message || 'Unknown error'],
        screenshots: [],
        createdAt: new Date(),
        autoFiledBug: null,
      })
    } finally {
      setRunning(false)
    }
  }, [targetUrl, selectedBrowser, selectedViewport, script, running])

  // ─── Auto-file bug ──────────────────────────────────────────────────────

  const handleAutoFileBug = useCallback(async (execution: TestExecution) => {
    try {
      await api.post('/api/v1/bugs/auto-file', {
        executionId: execution.id,
        type: 'WEB_PLAYWRIGHT',
        summary: `[Web Test Fail] ${execution.name || execution.targetUrl}`,
        description: execution.errorLogs.join('\n'),
      })
    } catch {
      // silently fail for now
    }
  }, [])

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Web Test Runner</h1>
          <p className="text-sm text-text-secondary mt-1">
            Run Playwright-based browser tests with visual regression support
          </p>
        </div>
        <button onClick={() => setShowHelp(true)} className="flex items-center gap-2 rounded-full border border-border-subtle px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition">
          <Info className="h-4 w-4" /> How it works
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ── Left: Configuration ────────────────────────────────────────── */}
        <div className="xl:col-span-2 space-y-4">
          {/* Target URL */}
          <div className="rounded-xl border border-border bg-card p-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
              Target URL
            </label>
            <input
              type="url"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full rounded-lg border border-border bg-body px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {/* Browser + Viewport */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Browser Selector */}
            <div className="rounded-xl border border-border bg-card p-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-3">
                Browser
              </label>
              <div className="grid grid-cols-2 gap-2">
                {BROWSERS.map((b) => {
                  const Icon = b.icon
                  return (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBrowser(b.id)}
                      className={cn(
                        'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors',
                        selectedBrowser === b.id
                          ? 'border-accent bg-accent/10 text-accent-light'
                          : 'border-border bg-body text-text-secondary hover:border-text-secondary/30 hover:text-text-primary'
                      )}
                    >
                      <Icon size={16} />
                      {b.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Viewport Presets */}
            <div className="rounded-xl border border-border bg-card p-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-3">
                Viewport
              </label>
              <div className="space-y-2">
                {VIEWPORTS.map((v) => {
                  const Icon = v.icon
                  return (
                    <button
                      key={v.label}
                      onClick={() => setSelectedViewport(v)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors',
                        selectedViewport.label === v.label
                          ? 'border-accent bg-accent/10 text-accent-light'
                          : 'border-border bg-body text-text-secondary hover:border-text-secondary/30 hover:text-text-primary'
                      )}
                    >
                      <Icon size={16} />
                      <span>{v.label}</span>
                      <span className="ml-auto text-xs opacity-60">
                        {v.width}x{v.height}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Script Editor */}
          <div className="rounded-xl border border-border bg-card p-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
              Test Script
            </label>
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              rows={16}
              spellCheck={false}
              className="w-full rounded-lg border border-border bg-[#0d1117] px-4 py-3 font-mono text-sm text-green-400 placeholder:text-text-secondary/40 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent resize-none leading-relaxed"
            />
          </div>

          {/* Run button */}
          <button
            onClick={handleRunTest}
            disabled={running || !targetUrl}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all',
              running
                ? 'bg-accent/50 cursor-not-allowed'
                : 'bg-accent hover:bg-accent/90 active:scale-[0.98]'
            )}
          >
            {running ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Running Test...
              </>
            ) : (
              <>
                <Play size={16} />
                Run Test
              </>
            )}
          </button>

          {/* ── Results Panel ─────────────────────────────────────────────── */}
          {latestResult && (
            <div className="rounded-xl border border-border bg-card">
              {/* Tabs */}
              <div className="flex border-b border-border">
                <button
                  onClick={() => setActiveResultTab('results')}
                  className={cn(
                    'px-5 py-3 text-sm font-medium transition-colors border-b-2',
                    activeResultTab === 'results'
                      ? 'border-accent text-accent-light'
                      : 'border-transparent text-text-secondary hover:text-text-primary'
                  )}
                >
                  Results
                </button>
                <button
                  onClick={() => setActiveResultTab('visual-regression')}
                  className={cn(
                    'px-5 py-3 text-sm font-medium transition-colors border-b-2',
                    activeResultTab === 'visual-regression'
                      ? 'border-accent text-accent-light'
                      : 'border-transparent text-text-secondary hover:text-text-primary'
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Columns2 size={14} />
                    Visual Regression
                  </span>
                </button>
              </div>

              <div className="p-5">
                {activeResultTab === 'results' ? (
                  <div className="space-y-4">
                    {/* Status row */}
                    <div className="flex items-center gap-4">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white',
                          statusColor(latestResult.status)
                        )}
                      >
                        {statusIcon(latestResult.status)}
                        {latestResult.status}
                      </span>
                      <span className="flex items-center gap-1.5 text-sm text-text-secondary">
                        <Clock size={14} />
                        {latestResult.duration}ms
                      </span>
                    </div>

                    {/* Screenshot thumbnails */}
                    {latestResult.screenshots.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
                          Screenshots
                        </p>
                        <div className="flex gap-3 overflow-x-auto pb-2">
                          {latestResult.screenshots.map((url, i) => (
                            <div
                              key={i}
                              className="relative flex-shrink-0 w-48 h-32 rounded-lg border border-border bg-body overflow-hidden group"
                            >
                              <img
                                src={url}
                                alt={`Screenshot ${i + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Eye size={20} className="text-white" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {latestResult.screenshots.length === 0 && (
                      <div className="flex items-center gap-3 rounded-lg border border-border bg-body p-4">
                        <Image size={20} className="text-text-secondary" />
                        <p className="text-sm text-text-secondary">
                          No screenshots captured for this run
                        </p>
                      </div>
                    )}

                    {/* Error logs */}
                    {latestResult.errorLogs.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
                          Error Logs
                        </p>
                        <div className="rounded-lg border border-status-red/30 bg-status-red/5 p-4 space-y-1">
                          {latestResult.errorLogs.map((log, i) => (
                            <pre key={i} className="text-xs text-status-red font-mono whitespace-pre-wrap">
                              {log}
                            </pre>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Auto-file bug */}
                    {latestResult.status === 'FAIL' && !latestResult.autoFiledBug && (
                      <button
                        onClick={() => handleAutoFileBug(latestResult)}
                        className="flex items-center gap-2 rounded-lg border border-status-red/30 bg-status-red/10 px-4 py-2.5 text-sm font-medium text-status-red hover:bg-status-red/20 transition-colors"
                      >
                        <Bug size={16} />
                        Auto-file Bug in Jira
                      </button>
                    )}
                  </div>
                ) : (
                  /* Visual Regression Tab */
                  <div className="space-y-4">
                    <p className="text-sm text-text-secondary">
                      Side-by-side comparison of baseline vs. current screenshots
                    </p>
                    <div className="grid grid-cols-3 gap-4">
                      {/* Baseline */}
                      <div className="rounded-lg border border-border bg-body p-3">
                        <p className="text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wider">
                          Baseline
                        </p>
                        <div className="aspect-video rounded-md bg-card border border-border flex items-center justify-center">
                          <Image size={24} className="text-text-secondary/30" />
                        </div>
                      </div>
                      {/* Current */}
                      <div className="rounded-lg border border-border bg-body p-3">
                        <p className="text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wider">
                          Current
                        </p>
                        <div className="aspect-video rounded-md bg-card border border-border flex items-center justify-center">
                          <Image size={24} className="text-text-secondary/30" />
                        </div>
                      </div>
                      {/* Diff */}
                      <div className="rounded-lg border border-status-red/30 bg-body p-3">
                        <p className="text-xs font-semibold text-status-red mb-2 uppercase tracking-wider">
                          Diff Overlay
                        </p>
                        <div className="aspect-video rounded-md bg-card border border-status-red/20 flex items-center justify-center">
                          <div className="text-center">
                            <Columns2 size={24} className="text-status-red/30 mx-auto mb-1" />
                            <p className="text-[10px] text-text-secondary">No diff data</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Test History ─────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <History size={16} className="text-text-secondary" />
              <h3 className="text-sm font-semibold text-text-primary">Test History</h3>
              <span className="ml-auto rounded-full bg-body px-2 py-0.5 text-[10px] font-semibold text-text-secondary">
                {history.length}
              </span>
            </div>
            <div className="max-h-[700px] overflow-y-auto divide-y divide-border">
              {history.length === 0 && (
                <div className="p-6 text-center text-sm text-text-secondary">
                  No web test runs yet
                </div>
              )}
              {history.map((item) => (
                <div key={item.id} className="px-4 py-3">
                  <button
                    onClick={() =>
                      setExpandedHistory(expandedHistory === item.id ? null : item.id)
                    }
                    className="flex w-full items-center gap-2 text-left"
                  >
                    {expandedHistory === item.id ? (
                      <ChevronDown size={14} className="text-text-secondary" />
                    ) : (
                      <ChevronRight size={14} className="text-text-secondary" />
                    )}
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white',
                        statusColor(item.status)
                      )}
                    >
                      {item.status}
                    </span>
                    <span className="text-sm text-text-primary truncate flex-1">
                      {item.name || item.targetUrl}
                    </span>
                    <span className="text-[10px] text-text-secondary whitespace-nowrap">
                      {item.duration}ms
                    </span>
                  </button>
                  {expandedHistory === item.id && (
                    <div className="mt-2 ml-5 space-y-1 text-xs text-text-secondary">
                      <p>Browser: {item.browser}</p>
                      <p>Viewport: {item.viewport}</p>
                      <p>URL: {item.targetUrl}</p>
                      <p>
                        Date: {item.createdAt.toLocaleDateString()}{' '}
                        {item.createdAt.toLocaleTimeString()}
                      </p>
                      {item.errorLogs.length > 0 && (
                        <div className="mt-1 rounded bg-status-red/10 p-2 text-status-red font-mono">
                          {item.errorLogs[0]}
                        </div>
                      )}
                      {item.status === 'FAIL' && !item.autoFiledBug && (
                        <button
                          onClick={() => handleAutoFileBug(item)}
                          className="mt-1 flex items-center gap-1 text-status-red hover:underline"
                        >
                          <Bug size={12} />
                          Auto-file bug
                        </button>
                      )}
                      {item.autoFiledBug && (
                        <p className="text-status-green">Bug filed: {item.autoFiledBug}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
    <HowItWorks steps={howItWorksSteps} isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  )
}
