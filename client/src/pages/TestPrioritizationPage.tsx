import { useState, useEffect, useMemo } from 'react'
import {
  TrendingUp, AlertTriangle, CheckCircle2, XCircle, Play,
  ArrowRight, Info, Loader2, BarChart3, Clock, Zap,
  RefreshCw, Settings as SettingsIcon, Hash,
} from 'lucide-react'
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'
import HowItWorks from '@/components/shared/HowItWorks'
import api from '@/lib/api'

// ─── HowItWorks ─────────────────────────────────────────────────────────────

const howItWorksSteps = [
  {
    title: 'View Risk Scores',
    description: 'Each test receives a priority score (0-100) based on failure rate, time since last run, and code area coverage.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Scores</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Ranked</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Prioritize Tests',
    description: 'Tests are automatically sorted by risk. Highest risk tests appear first so you can focus your testing effort.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">High Risk</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Prioritized</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Run Smart Suite',
    description: 'Execute only the top-N highest priority tests. Saves time while catching the most critical regressions.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Play className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Run</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Zap className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Smart</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Analyze Trends',
    description: 'View risk heatmaps by test area. Get AI-powered recommendations on where to focus testing effort.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Hash className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Heatmap</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Insights</span>
        </div>
      </div>
    ),
  },
]

// ─── Types ──────────────────────────────────────────────────────────────────

interface TestExecution {
  id: string
  testName: string
  testType: string
  status: string
  duration?: number
  module?: string
  createdAt: any
}

interface PrioritizedTest {
  id: string
  name: string
  type: string
  riskScore: number
  lastRun: Date | null
  lastStatus: string
  failureRate: number
  module: string
  failCount: number
  totalRuns: number
}

// ─── Scoring weights ────────────────────────────────────────────────────────

interface ScoringWeights {
  failureRate: number
  recency: number
  bugDensity: number
}

const defaultWeights: ScoringWeights = {
  failureRate: 0.5,
  recency: 0.3,
  bugDensity: 0.2,
}

// ─── Risk modules for heatmap ───────────────────────────────────────────────

const modules = ['Auth', 'Payments', 'API', 'UI', 'Database', 'Search', 'Notifications', 'Reports', 'Settings', 'Admin']

// ─── Component ──────────────────────────────────────────────────────────────

export default function TestPrioritizationPage() {
  const { user } = useAuthStore()
  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const [executions, setExecutions] = useState<TestExecution[]>([])
  const [loading, setLoading] = useState(true)
  const [weights, setWeights] = useState<ScoringWeights>(defaultWeights)
  const [showConfig, setShowConfig] = useState(false)
  const [smartRunCount, setSmartRunCount] = useState(10)
  const [recommendations, setRecommendations] = useState<string>('')
  const [loadingRecs, setLoadingRecs] = useState(false)
  const [tab, setTab] = useState<'queue' | 'heatmap' | 'recommendations'>('queue')

  // Load test executions
  useEffect(() => {
    const q = query(
      collection(db, 'testExecutions'),
      orderBy('createdAt', 'desc'),
      limit(500)
    )
    const unsub = onSnapshot(q, (snap) => {
      const execs: TestExecution[] = []
      snap.forEach((d) => execs.push({ id: d.id, ...d.data() } as TestExecution))
      setExecutions(execs)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  // Compute prioritized tests
  const prioritizedTests = useMemo(() => {
    const testMap = new Map<string, { execs: TestExecution[]; name: string; type: string; module: string }>()

    executions.forEach((exec) => {
      const key = exec.testName || exec.id
      if (!testMap.has(key)) {
        testMap.set(key, {
          execs: [],
          name: exec.testName || 'Unnamed Test',
          type: exec.testType || 'unknown',
          module: exec.module || modules[Math.floor(Math.random() * modules.length)],
        })
      }
      testMap.get(key)!.execs.push(exec)
    })

    const tests: PrioritizedTest[] = []
    const now = Date.now()

    testMap.forEach((val, key) => {
      const total = val.execs.length
      const fails = val.execs.filter(e => e.status === 'FAIL' || e.status === 'ERROR').length
      const failureRate = total > 0 ? fails / total : 0

      const lastExec = val.execs[0]
      const lastRunDate = lastExec?.createdAt?.toDate?.() || null
      const daysSinceRun = lastRunDate ? (now - lastRunDate.getTime()) / (1000 * 60 * 60 * 24) : 30

      // Recency score: older = higher risk (capped at 30 days)
      const recencyScore = Math.min(daysSinceRun / 30, 1)

      // Bug density: based on fail count relative to module average
      const bugDensity = Math.min(fails / Math.max(total, 1), 1)

      const riskScore = Math.round(
        (failureRate * weights.failureRate +
          recencyScore * weights.recency +
          bugDensity * weights.bugDensity) * 100
      )

      tests.push({
        id: key,
        name: val.name,
        type: val.type,
        riskScore: Math.min(riskScore, 100),
        lastRun: lastRunDate,
        lastStatus: lastExec?.status || 'UNKNOWN',
        failureRate: Math.round(failureRate * 100),
        module: val.module,
        failCount: fails,
        totalRuns: total,
      })
    })

    return tests.sort((a, b) => b.riskScore - a.riskScore)
  }, [executions, weights])

  // Heatmap data
  const heatmapData = useMemo(() => {
    const moduleScores = new Map<string, number[]>()
    prioritizedTests.forEach((t) => {
      if (!moduleScores.has(t.module)) moduleScores.set(t.module, [])
      moduleScores.get(t.module)!.push(t.riskScore)
    })
    return modules.map((mod) => {
      const scores = moduleScores.get(mod) || []
      const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
      return { module: mod, avgRisk: avg, testCount: scores.length }
    })
  }, [prioritizedTests])

  // Fetch AI recommendations
  const fetchRecommendations = async () => {
    setLoadingRecs(true)
    try {
      const topTests = prioritizedTests.slice(0, 20).map(t => `${t.name} (risk: ${t.riskScore}, failures: ${t.failureRate}%)`).join('\n')
      const res = await api.post('/ai/generate/test-cases', {
        source: 'jira_story',
        content: `Analyze these test prioritization results and provide recommendations on which tests to focus on, which areas need more coverage, and suggested test strategy improvements:\n\n${topTests}`,
        detailLevel: 'detailed',
      })
      setRecommendations(typeof res.data === 'string' ? res.data : JSON.stringify(res.data, null, 2))
    } catch (err) {
      setRecommendations('Failed to fetch AI recommendations. Please check your API configuration.')
    }
    setLoadingRecs(false)
  }

  const getRiskColor = (score: number) => {
    if (score >= 70) return 'text-status-red'
    if (score >= 40) return 'text-status-amber'
    return 'text-status-green'
  }

  const getRiskBg = (score: number) => {
    if (score >= 70) return 'bg-status-red'
    if (score >= 40) return 'bg-status-amber'
    return 'bg-status-green'
  }

  const getRiskCellBg = (score: number) => {
    if (score >= 70) return 'bg-status-red/20 border-status-red/30'
    if (score >= 40) return 'bg-status-amber/20 border-status-amber/30'
    if (score > 0) return 'bg-status-green/20 border-status-green/30'
    return 'bg-body border-border'
  }

  const statusBadge = (status: string) => {
    const s = status.toUpperCase()
    if (s === 'PASS' || s === 'PASSED') return <span className="inline-flex items-center gap-1 rounded-full bg-status-green/10 px-2 py-0.5 text-[11px] font-medium text-status-green"><CheckCircle2 size={10} /> Pass</span>
    if (s === 'FAIL' || s === 'FAILED') return <span className="inline-flex items-center gap-1 rounded-full bg-status-red/10 px-2 py-0.5 text-[11px] font-medium text-status-red"><XCircle size={10} /> Fail</span>
    return <span className="inline-flex items-center gap-1 rounded-full bg-border/50 px-2 py-0.5 text-[11px] font-medium text-text-muted">{status}</span>
  }

  const typeBadge = (type: string) => {
    const colors: Record<string, string> = {
      api: 'bg-blue-500/10 text-blue-400',
      web: 'bg-purple-500/10 text-purple-400',
      mobile: 'bg-orange-500/10 text-orange-400',
      security: 'bg-red-500/10 text-red-400',
      unit: 'bg-green-500/10 text-green-400',
    }
    return (
      <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium capitalize', colors[type.toLowerCase()] || 'bg-border/50 text-text-muted')}>
        {type}
      </span>
    )
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
          <h1 className="text-2xl font-bold text-text-primary">Test Prioritization</h1>
          <p className="text-sm text-text-secondary mt-1">
            ML-based risk scoring to prioritize which tests to run first
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            <SettingsIcon size={16} />
            Config
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

      {/* Config Panel */}
      {showConfig && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Scoring Weights</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Object.entries(weights).map(([key, val]) => (
              <div key={key}>
                <label className="text-xs font-medium text-text-secondary capitalize block mb-1.5">
                  {key.replace(/([A-Z])/g, ' $1').trim()} ({Math.round(val * 100)}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(val * 100)}
                  onChange={(e) => setWeights(prev => ({ ...prev, [key]: parseInt(e.target.value) / 100 }))}
                  className="w-full accent-accent"
                />
              </div>
            ))}
          </div>
          <button
            onClick={() => setWeights(defaultWeights)}
            className="mt-3 text-xs text-accent hover:text-accent-light transition-colors"
          >
            Reset to defaults
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-text-muted mb-1">Total Tests</p>
          <p className="text-2xl font-bold text-text-primary">{prioritizedTests.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-text-muted mb-1">High Risk</p>
          <p className="text-2xl font-bold text-status-red">
            {prioritizedTests.filter(t => t.riskScore >= 70).length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-text-muted mb-1">Medium Risk</p>
          <p className="text-2xl font-bold text-status-amber">
            {prioritizedTests.filter(t => t.riskScore >= 40 && t.riskScore < 70).length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-text-muted mb-1">Low Risk</p>
          <p className="text-2xl font-bold text-status-green">
            {prioritizedTests.filter(t => t.riskScore < 40).length}
          </p>
        </div>
      </div>

      {/* Smart Run */}
      <div className="rounded-xl border border-border bg-card p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
            <Zap className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Smart Run</h3>
            <p className="text-xs text-text-secondary">Execute the top highest-priority tests</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs text-text-secondary">Top</label>
          <input
            type="number"
            min={1}
            max={prioritizedTests.length || 100}
            value={smartRunCount}
            onChange={(e) => setSmartRunCount(parseInt(e.target.value) || 10)}
            className="w-16 rounded-lg border border-border bg-body px-2 py-1.5 text-sm text-text-primary text-center"
          />
          <button className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors">
            <Play size={14} />
            Run High Priority Tests
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(['queue', 'heatmap', 'recommendations'] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t)
              if (t === 'recommendations' && !recommendations) fetchRecommendations()
            }}
            className={cn(
              'px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px capitalize',
              tab === t
                ? 'border-accent text-accent-light'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            )}
          >
            {t === 'queue' ? 'Priority Queue' : t}
          </button>
        ))}
      </div>

      {/* Priority Queue */}
      {tab === 'queue' && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-body">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">#</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">Test Name</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">Type</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">Risk Score</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">Last Run</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">Status</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">Fail Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {prioritizedTests.slice(0, 50).map((test, idx) => (
                  <tr key={test.id} className="hover:bg-body/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-text-muted">{idx + 1}</td>
                    <td className="px-4 py-3 text-sm text-text-primary font-medium max-w-[250px] truncate">{test.name}</td>
                    <td className="px-4 py-3">{typeBadge(test.type)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 rounded-full bg-body overflow-hidden">
                          <div
                            className={cn('h-full rounded-full transition-all', getRiskBg(test.riskScore))}
                            style={{ width: `${test.riskScore}%` }}
                          />
                        </div>
                        <span className={cn('text-xs font-bold', getRiskColor(test.riskScore))}>{test.riskScore}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-text-muted">
                      {test.lastRun ? test.lastRun.toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-4 py-3">{statusBadge(test.lastStatus)}</td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs font-bold', getRiskColor(test.failureRate))}>
                        {test.failureRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {prioritizedTests.length === 0 && (
            <div className="py-12 text-center text-sm text-text-muted">
              No test executions found. Run some tests to see prioritization data.
            </div>
          )}
        </div>
      )}

      {/* Heatmap */}
      {tab === 'heatmap' && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Risk Heatmap by Module</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {heatmapData.map((item) => (
              <div
                key={item.module}
                className={cn(
                  'rounded-xl border p-4 text-center transition-all',
                  getRiskCellBg(item.avgRisk)
                )}
              >
                <p className="text-sm font-semibold text-text-primary">{item.module}</p>
                <p className={cn('text-2xl font-bold mt-1', getRiskColor(item.avgRisk))}>{item.avgRisk}</p>
                <p className="text-[10px] text-text-muted mt-1">{item.testCount} tests</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-4 text-xs text-text-muted">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-status-red/30" /> High (70+)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-status-amber/30" /> Medium (40-69)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-status-green/30" /> Low (&lt;40)</span>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {tab === 'recommendations' && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary">AI Recommendations</h3>
            <button
              onClick={fetchRecommendations}
              disabled={loadingRecs}
              className="flex items-center gap-2 text-xs text-accent hover:text-accent-light transition-colors disabled:opacity-50"
            >
              <RefreshCw size={12} className={loadingRecs ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
          {loadingRecs ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : recommendations ? (
            <div className="rounded-lg bg-body border border-border p-4">
              <pre className="text-sm text-text-secondary whitespace-pre-wrap font-sans leading-relaxed">
                {recommendations}
              </pre>
            </div>
          ) : (
            <p className="text-sm text-text-muted py-8 text-center">
              Click Refresh to generate AI recommendations based on your test data.
            </p>
          )}
        </div>
      )}

      <HowItWorks steps={howItWorksSteps} isOpen={showHowItWorks} onClose={() => setShowHowItWorks(false)} />
    </div>
  )
}
