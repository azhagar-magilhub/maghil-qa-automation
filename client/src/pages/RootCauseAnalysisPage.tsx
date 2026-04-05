import { useState, useEffect } from 'react'
import {
  Search, AlertTriangle, CheckCircle2, XCircle, ArrowRight,
  Info, Loader2, FileText, Bug, Zap, Clock, RefreshCw,
  ChevronDown, ChevronRight, ExternalLink, BarChart3, List, Hash,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'
import HowItWorks from '@/components/shared/HowItWorks'
import api from '@/lib/api'

// ─── HowItWorks ─────────────────────────────────────────────────────────────

const howItWorksSteps = [
  {
    title: 'Select Failed Test',
    description: 'Browse all failed test executions with their error messages and timestamps. Pick any failure to analyze.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <XCircle className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Failed</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Search className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Select</span>
        </div>
      </div>
    ),
  },
  {
    title: 'AI Analyzes Cause',
    description: 'Our AI engine examines the error message, stack trace, and test context to identify the most likely root cause.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Zap className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Analyze</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Hash className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Root Cause</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Review Suggestions',
    description: 'Get step-by-step remediation suggestions, confidence levels, and categorized results to fix issues faster.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <FileText className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Review</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Fix</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Create Bug',
    description: 'One-click Jira bug creation with pre-filled description from the AI analysis including root cause and fix steps.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Bug className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Bug</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <ExternalLink className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Jira</span>
        </div>
      </div>
    ),
  },
]

// ─── Types ──────────────────────────────────────────────────────────────────

interface FailedExecution {
  id: string
  testName: string
  testType: string
  status: string
  errorMessage?: string
  stackTrace?: string
  duration?: number
  createdAt: any
}

type FailureCategory = 'Environment' | 'Code Bug' | 'Data Issue' | 'Timing' | 'Infrastructure' | 'Configuration'

interface AnalysisResult {
  rootCause: string
  category: FailureCategory
  confidence: 'High' | 'Medium' | 'Low'
  suggestedFix: string[]
  relatedTests: string[]
  similarPastFailures: string[]
}

interface HistoryEntry {
  testName: string
  analysis: AnalysisResult
  timestamp: Date
}

// ─── Category colors ────────────────────────────────────────────────────────

const categoryColors: Record<string, string> = {
  Environment: '#3b82f6',
  'Code Bug': '#ef4444',
  'Data Issue': '#f59e0b',
  Timing: '#8b5cf6',
  Infrastructure: '#6366f1',
  Configuration: '#06b6d4',
}

const confidenceBadge = (c: string) => {
  if (c === 'High') return <span className="rounded-full bg-status-green/10 px-2 py-0.5 text-[11px] font-medium text-status-green">High</span>
  if (c === 'Medium') return <span className="rounded-full bg-status-amber/10 px-2 py-0.5 text-[11px] font-medium text-status-amber">Medium</span>
  return <span className="rounded-full bg-border/50 px-2 py-0.5 text-[11px] font-medium text-text-muted">Low</span>
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function RootCauseAnalysisPage() {
  const { user } = useAuthStore()
  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const [failedTests, setFailedTests] = useState<FailedExecution[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTest, setSelectedTest] = useState<FailedExecution | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [tab, setTab] = useState<'failures' | 'trends' | 'history'>('failures')
  const [filingBug, setFilingBug] = useState(false)

  // Load failed test executions
  useEffect(() => {
    const q = query(
      collection(db, 'testExecutions'),
      where('status', 'in', ['FAIL', 'ERROR', 'FAILED']),
      orderBy('createdAt', 'desc'),
      limit(100)
    )
    const unsub = onSnapshot(q, (snap) => {
      const tests: FailedExecution[] = []
      snap.forEach((d) => tests.push({ id: d.id, ...d.data() } as FailedExecution))
      setFailedTests(tests)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  // Analyze a test failure
  const analyzeTest = async (test: FailedExecution) => {
    setSelectedTest(test)
    setAnalyzing(true)
    setAnalysis(null)

    try {
      const res = await api.post('/ai/root-cause', {
        errorMessage: test.errorMessage || 'Unknown error',
        stackTrace: test.stackTrace || '',
        testName: test.testName || 'Unknown test',
        testType: test.testType || 'unknown',
        context: `Test executed at ${test.createdAt?.toDate?.()?.toISOString?.() || 'unknown time'}. Duration: ${test.duration || 'unknown'}ms.`,
      })

      const result: AnalysisResult = res.data.analysis || {
        rootCause: res.data.rootCause || 'Analysis unavailable',
        category: res.data.category || 'Code Bug',
        confidence: res.data.confidence || 'Medium',
        suggestedFix: res.data.suggestedFix || [],
        relatedTests: res.data.relatedTests || [],
        similarPastFailures: res.data.similarPastFailures || [],
      }

      setAnalysis(result)
      setHistory(prev => [{
        testName: test.testName,
        analysis: result,
        timestamp: new Date(),
      }, ...prev])
    } catch (err) {
      setAnalysis({
        rootCause: 'Failed to analyze. Please check your AI API configuration.',
        category: 'Configuration',
        confidence: 'Low',
        suggestedFix: ['Verify ANTHROPIC_API_KEY or OPENAI_API_KEY is set', 'Check server logs for details'],
        relatedTests: [],
        similarPastFailures: [],
      })
    }
    setAnalyzing(false)
  }

  // Create Jira Bug
  const createJiraBug = async () => {
    if (!selectedTest || !analysis) return
    setFilingBug(true)
    try {
      await api.post('/bug-filing/file', {
        summary: `[Auto] Root cause: ${analysis.rootCause.slice(0, 80)}`,
        description: [
          `**Test:** ${selectedTest.testName}`,
          `**Type:** ${selectedTest.testType}`,
          `**Error:** ${selectedTest.errorMessage || 'N/A'}`,
          '',
          `**Root Cause:** ${analysis.rootCause}`,
          `**Category:** ${analysis.category}`,
          `**Confidence:** ${analysis.confidence}`,
          '',
          '**Suggested Fix:**',
          ...analysis.suggestedFix.map((s, i) => `${i + 1}. ${s}`),
        ].join('\n'),
        type: 'Bug',
        priority: analysis.confidence === 'High' ? 'High' : 'Medium',
      })
    } catch (err) {
      console.error('Failed to file bug:', err)
    }
    setFilingBug(false)
  }

  // Category breakdown for pie chart
  const categoryBreakdown = history.reduce((acc, h) => {
    const cat = h.analysis.category
    const existing = acc.find(a => a.name === cat)
    if (existing) existing.value++
    else acc.push({ name: cat, value: 1 })
    return acc
  }, [] as Array<{ name: string; value: number }>)

  const formatTime = (ts: any) => {
    if (!ts) return 'Unknown'
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleString()
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
          <h1 className="text-2xl font-bold text-text-primary">Root Cause Analysis</h1>
          <p className="text-sm text-text-secondary mt-1">
            AI-powered analysis of test failures to identify root causes and suggest fixes
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 rounded-lg bg-status-red/10 px-3 py-1.5 text-sm text-status-red font-medium">
            <XCircle size={14} />
            {failedTests.length} Failures
          </span>
          <button
            onClick={() => setShowHowItWorks(true)}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            <Info size={16} />
            How It Works
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(['failures', 'trends', 'history'] as const).map((t) => (
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
            {t === 'failures' ? 'Failed Tests' : t}
          </button>
        ))}
      </div>

      {tab === 'failures' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Failed Tests List */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
              <List size={16} className="text-accent" />
              Failed Test Executions
            </h3>
            {failedTests.length === 0 ? (
              <p className="text-sm text-text-muted py-8 text-center">No failed tests found</p>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {failedTests.map((test) => (
                  <div
                    key={test.id}
                    className={cn(
                      'rounded-lg border p-3 cursor-pointer transition-all',
                      selectedTest?.id === test.id
                        ? 'border-accent bg-accent/5'
                        : 'border-border hover:border-border hover:bg-body'
                    )}
                    onClick={() => analyzeTest(test)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-text-primary truncate">{test.testName || 'Unnamed Test'}</p>
                        <p className="text-xs text-text-muted mt-0.5 truncate">
                          {test.errorMessage?.slice(0, 80) || 'No error message'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-medium capitalize',
                          'bg-red-500/10 text-red-400'
                        )}>
                          {test.testType || 'unknown'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-text-muted flex items-center gap-1">
                        <Clock size={10} />
                        {formatTime(test.createdAt)}
                      </span>
                      <button className="text-xs text-accent font-medium hover:text-accent-light flex items-center gap-1">
                        Analyze <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Analysis View */}
          <div className="rounded-xl border border-border bg-card p-5">
            {analyzing ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-accent mb-3" />
                <p className="text-sm text-text-secondary">AI is analyzing the failure...</p>
              </div>
            ) : analysis && selectedTest ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-text-primary">Analysis Result</h3>
                  {confidenceBadge(analysis.confidence)}
                </div>

                {/* Root Cause */}
                <div className="rounded-lg bg-body border border-border p-4">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Root Cause</p>
                  <p className="text-sm text-text-primary leading-relaxed">{analysis.rootCause}</p>
                </div>

                {/* Category */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-text-muted">Category:</span>
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[11px] font-medium text-white"
                    style={{ backgroundColor: categoryColors[analysis.category] || '#6b7280' }}
                  >
                    {analysis.category}
                  </span>
                </div>

                {/* Suggested Fix */}
                {analysis.suggestedFix.length > 0 && (
                  <div className="rounded-lg bg-body border border-border p-4">
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Suggested Fix</p>
                    <ol className="space-y-1.5">
                      {analysis.suggestedFix.map((step, i) => (
                        <li key={i} className="text-sm text-text-secondary flex gap-2">
                          <span className="text-accent font-bold shrink-0">{i + 1}.</span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Related Tests */}
                {analysis.relatedTests.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Related Tests</p>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.relatedTests.map((t, i) => (
                        <span key={i} className="rounded-md bg-body border border-border px-2 py-1 text-xs text-text-secondary">{t}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Create Bug Button */}
                <button
                  onClick={createJiraBug}
                  disabled={filingBug}
                  className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent/90 transition-colors disabled:opacity-50 w-full justify-center"
                >
                  {filingBug ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Bug size={14} />
                  )}
                  Create Jira Bug
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <Search className="h-10 w-10 text-text-muted mb-3" />
                <p className="text-sm text-text-muted">Select a failed test to analyze its root cause</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Trends */}
      {tab === 'trends' && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Failure Category Breakdown</h3>
          {categoryBreakdown.length === 0 ? (
            <p className="text-sm text-text-muted py-8 text-center">
              Analyze some test failures to see category trends here.
            </p>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, value }) => `${name} (${value})`}
                  >
                    {categoryBreakdown.map((entry, i) => (
                      <Cell key={i} fill={categoryColors[entry.name] || '#6b7280'} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* History */}
      {tab === 'history' && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Analysis History</h3>
          {history.length === 0 ? (
            <p className="text-sm text-text-muted py-8 text-center">
              No analyses yet. Select a failed test and click Analyze to get started.
            </p>
          ) : (
            <div className="space-y-3">
              {history.map((entry, i) => (
                <div key={i} className="rounded-lg border border-border bg-body p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary">{entry.testName}</p>
                      <p className="text-xs text-text-secondary mt-1">{entry.analysis.rootCause}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                        style={{ backgroundColor: categoryColors[entry.analysis.category] || '#6b7280' }}
                      >
                        {entry.analysis.category}
                      </span>
                      {confidenceBadge(entry.analysis.confidence)}
                    </div>
                  </div>
                  <p className="text-[10px] text-text-muted mt-2">
                    {entry.timestamp.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <HowItWorks steps={howItWorksSteps} isOpen={showHowItWorks} onClose={() => setShowHowItWorks(false)} />
    </div>
  )
}
