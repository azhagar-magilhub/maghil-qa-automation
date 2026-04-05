import { useState, useEffect } from 'react'
import {
  Shuffle, AlertTriangle, CheckCircle2, XCircle, Shield,
  RefreshCw, TrendingUp, ArrowUpDown, Clock, Loader2, Info, ArrowRight, BarChart3, List, Hash, ShieldOff
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'
import HowItWorks from '@/components/shared/HowItWorks'
import api from '@/lib/api'

const howItWorksSteps = [
  {
    title: 'View Flaky Tests',
    description: 'Browse all tests with their flake scores, pass/fail counts, and recent results. Flake scores are calculated from run history.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">View</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <List className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Flaky tests</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Analyze Scores',
    description: 'Review trend charts showing flake rates over time. Identify patterns and root causes for intermittent failures.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Trends</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Hash className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Scores</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Quarantine Tests',
    description: 'Quarantine consistently flaky tests to prevent them from blocking CI/CD pipelines. Monitor them separately.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <ShieldOff className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Quarantine</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <XCircle className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Excluded</span>
        </div>
      </div>
    ),
  },
]

// ─── Types ───────────────────────────────────────────────────────────────────

type TestType = 'unit' | 'integration' | 'e2e' | 'api'
type LastResult = 'passed' | 'failed' | 'skipped'

interface FlakyTest {
  id: string
  name: string
  type: TestType
  flakeScore: number
  runCount: number
  passCount: number
  failCount: number
  lastResult: LastResult
  quarantined: boolean
  rootCause: string
  lastRun: Date
}

interface TrendPoint {
  date: string
  flakeRate: number
  quarantined: number
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function FlakeAnalyzerPage() {
  const [showHelp, setShowHelp] = useState(false)
  const { user } = useAuthStore()
  const [tests, setTests] = useState<FlakyTest[]>([])
  const [sortBy, setSortBy] = useState<'flakeScore' | 'name' | 'runCount'>('flakeScore')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [showQuarantined, setShowQuarantined] = useState(false)

  const [trendData] = useState<TrendPoint[]>([])

  useEffect(() => {
    if (!user) return
    const ref = collection(db, 'flakyTests')
    const q = query(ref, where('userId', '==', user.uid), orderBy('flakeScore', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      if (snap.docs.length > 0) {
        setTests(snap.docs.map((d) => ({
          id: d.id, ...d.data(),
          lastRun: d.data().lastRun?.toDate() || new Date(),
        })) as FlakyTest[])
      }
    })
    return () => unsub()
  }, [user])


  const toggleQuarantine = (testId: string) => {
    setTests((prev) => prev.map((t) =>
      t.id === testId ? { ...t, quarantined: !t.quarantined } : t
    ))
  }

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortDir('desc')
    }
  }

  const activeTests = tests.filter((t) => !t.quarantined)
  const quarantinedTests = tests.filter((t) => t.quarantined)

  const sortedActive = [...activeTests].sort((a, b) => {
    const val = sortDir === 'asc' ? 1 : -1
    if (sortBy === 'flakeScore') return (b.flakeScore - a.flakeScore) * val
    if (sortBy === 'runCount') return (b.runCount - a.runCount) * val
    return a.name.localeCompare(b.name) * val
  })

  const typeColors: Record<TestType, string> = {
    unit: 'bg-[#3B82F6]/10 text-[#3B82F6]',
    integration: 'bg-[#A855F7]/10 text-[#A855F7]',
    e2e: 'bg-[#F97316]/10 text-[#F97316]',
    api: 'bg-[#22C55E]/10 text-[#22C55E]',
  }

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Shuffle className="text-[#EAB308]" size={26} /> Flake Analyzer
          </h1>
          <p className="text-sm text-text-secondary mt-1">Identify, track, and quarantine flaky tests</p>
        </div>
        <button onClick={() => setShowHelp(true)} className="flex items-center gap-2 rounded-full border border-border-subtle px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition">
          <Info className="h-4 w-4" /> How it works
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl bg-card border border-border p-4 text-center">
          <p className="text-[11px] text-text-secondary">Total Flaky</p>
          <p className="text-2xl font-bold text-[#EAB308]">{tests.length}</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4 text-center">
          <p className="text-[11px] text-text-secondary">Quarantined</p>
          <p className="text-2xl font-bold text-[#F97316]">{quarantinedTests.length}</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4 text-center">
          <p className="text-[11px] text-text-secondary">Avg Flake Score</p>
          <p className="text-2xl font-bold text-[#EF4444]">{tests.length ? Math.round(tests.reduce((s, t) => s + t.flakeScore, 0) / tests.length) : 0}%</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4 text-center">
          <p className="text-[11px] text-text-secondary">Flake Rate Trend</p>
          <p className="text-2xl font-bold text-text-muted">{tests.length > 0 ? '--' : '0'}%</p>
        </div>
      </div>

      {/* Trend Chart */}
      <div className="rounded-xl bg-card border border-border p-5 space-y-3">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <TrendingUp size={16} /> Flake Trend (Last 6 Weeks)
        </h3>
        {trendData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="flakeRate" stroke="#EAB308" strokeWidth={2} name="Flake Rate %" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="quarantined" stroke="#F97316" strokeWidth={2} name="Quarantined" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[200px] text-text-muted text-sm">No trend data yet</div>
        )}
      </div>

      {/* Empty state */}
      {tests.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Shuffle className="h-12 w-12 text-text-muted mb-4" />
          <h3 className="text-lg font-medium text-text-primary mb-1">No test history yet</h3>
          <p className="text-sm text-text-secondary mb-4">Run tests to start tracking flaky test patterns. Data comes from Firestore flakeRecords.</p>
        </div>
      )}

      {/* Flaky Tests Table */}
      <div className="rounded-xl bg-card border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">Active Flaky Tests</h3>
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <span>Sort:</span>
            {(['flakeScore', 'name', 'runCount'] as const).map((f) => (
              <button
                key={f}
                onClick={() => handleSort(f)}
                className={cn('px-2 py-1 rounded transition-colors capitalize',
                  sortBy === f ? 'bg-accent text-white' : 'bg-body border border-border hover:text-text-primary'
                )}
              >
                {f === 'flakeScore' ? 'Flake Score' : f === 'runCount' ? 'Run Count' : 'Name'}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-body/30">
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-text-secondary">Test Name</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-text-secondary">Type</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-text-secondary">Flake Score</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-text-secondary">Runs</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-text-secondary">Last Result</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-text-secondary">Root Cause</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-text-secondary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedActive.map((test) => (
                <tr key={test.id} className="border-b border-border/50 hover:bg-body/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-text-primary font-medium">{test.name}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase', typeColors[test.type])}>{test.type}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 rounded-full bg-body overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all',
                            test.flakeScore >= 70 ? 'bg-[#EF4444]' : test.flakeScore >= 40 ? 'bg-[#EAB308]' : 'bg-[#22C55E]'
                          )}
                          style={{ width: `${test.flakeScore}%` }}
                        />
                      </div>
                      <span className="text-text-primary font-medium">{test.flakeScore}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {test.runCount} <span className="text-[#22C55E]">({test.passCount}P</span> / <span className="text-[#EF4444]">{test.failCount}F)</span>
                  </td>
                  <td className="px-4 py-3">
                    {test.lastResult === 'passed' && <span className="flex items-center gap-1 text-[#22C55E]"><CheckCircle2 size={12} /> Passed</span>}
                    {test.lastResult === 'failed' && <span className="flex items-center gap-1 text-[#EF4444]"><XCircle size={12} /> Failed</span>}
                    {test.lastResult === 'skipped' && <span className="flex items-center gap-1 text-text-secondary"><Clock size={12} /> Skipped</span>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-text-secondary max-w-[200px] truncate" title={test.rootCause}>{test.rootCause}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggleQuarantine(test.id)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-[#F97316] text-white rounded text-[10px] font-medium hover:bg-[#F97316]/90 transition-colors ml-auto"
                    >
                      <Shield size={11} /> Quarantine
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quarantined Tests */}
      {quarantinedTests.length > 0 && (
        <div className="rounded-xl bg-card border border-[#F97316]/30 overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-[#F97316]/5">
            <h3 className="text-sm font-semibold text-[#F97316] flex items-center gap-2">
              <Shield size={16} /> Quarantined Tests ({quarantinedTests.length})
            </h3>
          </div>
          <div className="space-y-0">
            {quarantinedTests.map((test) => (
              <div key={test.id} className="flex items-center justify-between px-5 py-3 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-3">
                  <AlertTriangle size={14} className="text-[#F97316]" />
                  <div>
                    <p className="text-xs text-text-primary font-medium">{test.name}</p>
                    <p className="text-[10px] text-text-secondary">{test.rootCause}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleQuarantine(test.id)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-[#22C55E] text-white rounded text-[10px] font-medium hover:bg-[#22C55E]/90 transition-colors"
                >
                  <RefreshCw size={11} /> Restore
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
    <HowItWorks steps={howItWorksSteps} isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  )
}
