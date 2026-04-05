import { useState, useEffect, useMemo } from 'react'
import {
  BarChart3, CheckCircle2, XCircle, Clock, ArrowRight, Info,
  Loader2, TrendingUp, TrendingDown, AlertTriangle, Minus,
  Activity, Zap, Shield, Search,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar,
} from 'recharts'
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'
import HowItWorks from '@/components/shared/HowItWorks'

// ─── HowItWorks ─────────────────────────────────────────────────────────────

const howItWorksSteps = [
  {
    title: 'View Metrics',
    description: 'Get an instant overview of your testing health: total tests, pass rate, average execution time, and flaky test count.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Metrics</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Health</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Analyze Trends',
    description: 'Track execution volume and pass rate over time with interactive line charts. Spot regressions early.',
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
            <Activity className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Insights</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Find Slow Tests',
    description: 'Identify the top 10 slowest tests with duration trends. Optimize tests that slow down your CI pipeline.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Clock className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Slow</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Zap className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Optimize</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Identify Gaps',
    description: 'Discover modules and features with no linked tests. Close coverage gaps to improve quality assurance.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Search className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Gaps</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Coverage</span>
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

interface FlakeRecord {
  id: string
  name: string
  flakeScore: number
}

type DateRange = '7d' | '30d' | '90d'

// ─── Chart colors ───────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  api: '#3b82f6',
  web: '#8b5cf6',
  mobile: '#f59e0b',
  security: '#ef4444',
  unit: '#10b981',
  integration: '#06b6d4',
  e2e: '#ec4899',
}

const allModules = ['Auth', 'Payments', 'API', 'UI', 'Database', 'Search', 'Notifications', 'Reports', 'Settings', 'Admin']

// ─── Component ──────────────────────────────────────────────────────────────

export default function TestMetricsPage() {
  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const [executions, setExecutions] = useState<TestExecution[]>([])
  const [flakeRecords, setFlakeRecords] = useState<FlakeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange>('30d')

  // Load test executions
  useEffect(() => {
    const q = query(
      collection(db, 'testExecutions'),
      orderBy('createdAt', 'desc'),
      limit(1000)
    )
    const unsub = onSnapshot(q, (snap) => {
      const execs: TestExecution[] = []
      snap.forEach((d) => execs.push({ id: d.id, ...d.data() } as TestExecution))
      setExecutions(execs)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  // Load flake records
  useEffect(() => {
    const q = query(collection(db, 'flakeRecords'), limit(200))
    const unsub = onSnapshot(q, (snap) => {
      const records: FlakeRecord[] = []
      snap.forEach((d) => records.push({ id: d.id, ...d.data() } as FlakeRecord))
      setFlakeRecords(records)
    })
    return () => unsub()
  }, [])

  // Filter by date range
  const filteredExecs = useMemo(() => {
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    return executions.filter((e) => {
      const d = e.createdAt?.toDate?.()
      return d && d >= cutoff
    })
  }, [executions, dateRange])

  // Key metrics
  const metrics = useMemo(() => {
    const total = filteredExecs.length
    const passed = filteredExecs.filter(e => e.status === 'PASS' || e.status === 'PASSED').length
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0
    const durations = filteredExecs.filter(e => e.duration).map(e => e.duration!)
    const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0
    const flakyCount = flakeRecords.filter(f => f.flakeScore > 30).length

    return { total, passRate, avgDuration, flakyCount }
  }, [filteredExecs, flakeRecords])

  // Execution trends (tests run per day)
  const executionTrends = useMemo(() => {
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90
    const map = new Map<string, { total: number; passed: number }>()

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      map.set(key, { total: 0, passed: 0 })
    }

    filteredExecs.forEach((e) => {
      const d = e.createdAt?.toDate?.()
      if (!d) return
      const key = d.toISOString().split('T')[0]
      const entry = map.get(key)
      if (entry) {
        entry.total++
        if (e.status === 'PASS' || e.status === 'PASSED') entry.passed++
      }
    })

    return Array.from(map.entries()).map(([date, data]) => ({
      date: date.slice(5), // MM-DD
      tests: data.total,
      passRate: data.total > 0 ? Math.round((data.passed / data.total) * 100) : 0,
    }))
  }, [filteredExecs, dateRange])

  // Slowest tests
  const slowestTests = useMemo(() => {
    const testDurations = new Map<string, number[]>()
    filteredExecs.forEach((e) => {
      if (!e.duration || !e.testName) return
      if (!testDurations.has(e.testName)) testDurations.set(e.testName, [])
      testDurations.get(e.testName)!.push(e.duration)
    })

    return Array.from(testDurations.entries())
      .map(([name, durations]) => {
        const avg = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        const recent = durations.slice(0, Math.ceil(durations.length / 2))
        const older = durations.slice(Math.ceil(durations.length / 2))
        const recentAvg = recent.length > 0 ? recent.reduce((a, b) => a + b, 0) / recent.length : avg
        const olderAvg = older.length > 0 ? older.reduce((a, b) => a + b, 0) / older.length : avg
        const trend = recentAvg > olderAvg ? 'slower' : recentAvg < olderAvg ? 'faster' : 'stable'
        return { name, avgDuration: avg, runs: durations.length, trend }
      })
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 10)
  }, [filteredExecs])

  // Most failing tests
  const mostFailing = useMemo(() => {
    const testFails = new Map<string, { fails: number; total: number }>()
    filteredExecs.forEach((e) => {
      if (!e.testName) return
      if (!testFails.has(e.testName)) testFails.set(e.testName, { fails: 0, total: 0 })
      const entry = testFails.get(e.testName)!
      entry.total++
      if (e.status === 'FAIL' || e.status === 'FAILED' || e.status === 'ERROR') entry.fails++
    })

    return Array.from(testFails.entries())
      .filter(([_, d]) => d.fails > 0)
      .map(([name, d]) => ({
        name,
        failCount: d.fails,
        totalRuns: d.total,
        failRate: Math.round((d.fails / d.total) * 100),
      }))
      .sort((a, b) => b.failCount - a.failCount)
      .slice(0, 10)
  }, [filteredExecs])

  // Test type distribution
  const typeDistribution = useMemo(() => {
    const map = new Map<string, number>()
    filteredExecs.forEach((e) => {
      const type = (e.testType || 'unknown').toLowerCase()
      map.set(type, (map.get(type) || 0) + 1)
    })
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [filteredExecs])

  // Duration histogram
  const durationHistogram = useMemo(() => {
    const buckets = [
      { label: '<1s', min: 0, max: 1000, count: 0 },
      { label: '1-5s', min: 1000, max: 5000, count: 0 },
      { label: '5-15s', min: 5000, max: 15000, count: 0 },
      { label: '15-30s', min: 15000, max: 30000, count: 0 },
      { label: '30-60s', min: 30000, max: 60000, count: 0 },
      { label: '>60s', min: 60000, max: Infinity, count: 0 },
    ]
    filteredExecs.forEach((e) => {
      if (!e.duration) return
      const bucket = buckets.find(b => e.duration! >= b.min && e.duration! < b.max)
      if (bucket) bucket.count++
    })
    return buckets.map(b => ({ name: b.label, count: b.count }))
  }, [filteredExecs])

  // Coverage gaps
  const coverageGaps = useMemo(() => {
    const coveredModules = new Set<string>()
    filteredExecs.forEach((e) => {
      if (e.module) coveredModules.add(e.module)
    })
    return allModules.filter(m => !coveredModules.has(m))
  }, [filteredExecs])

  const trendIcon = (trend: string) => {
    if (trend === 'slower') return <TrendingUp size={12} className="text-status-red" />
    if (trend === 'faster') return <TrendingDown size={12} className="text-status-green" />
    return <Minus size={12} className="text-text-muted" />
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
          <h1 className="text-2xl font-bold text-text-primary">Test Metrics Dashboard</h1>
          <p className="text-sm text-text-secondary mt-1">
            Deep analytics for test health, execution trends, and coverage
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Date range selector */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(['7d', '30d', '90d'] as DateRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium transition-colors',
                  dateRange === r
                    ? 'bg-accent text-white'
                    : 'bg-card text-text-secondary hover:text-text-primary'
                )}
              >
                {r}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowHowItWorks(true)}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            <Info size={16} />
            How It Works
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-text-muted mb-1">Total Tests</p>
          <p className="text-2xl font-bold text-text-primary">{metrics.total.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-text-muted mb-1">Pass Rate</p>
          <p className={cn('text-2xl font-bold', metrics.passRate >= 80 ? 'text-status-green' : metrics.passRate >= 60 ? 'text-status-amber' : 'text-status-red')}>
            {metrics.passRate}%
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-text-muted mb-1">Avg Duration</p>
          <p className="text-2xl font-bold text-text-primary">
            {metrics.avgDuration > 1000 ? `${(metrics.avgDuration / 1000).toFixed(1)}s` : `${metrics.avgDuration}ms`}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-text-muted mb-1">Flaky Tests</p>
          <p className="text-2xl font-bold text-status-amber">{metrics.flakyCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-text-muted mb-1">Coverage Gaps</p>
          <p className={cn('text-2xl font-bold', coverageGaps.length > 0 ? 'text-status-red' : 'text-status-green')}>
            {coverageGaps.length}
          </p>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Execution Trends */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Execution Trends</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={executionTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--color-text-muted)" />
                <YAxis tick={{ fontSize: 10 }} stroke="var(--color-text-muted)" />
                <Tooltip contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '12px' }} />
                <Line type="monotone" dataKey="tests" stroke="var(--color-accent)" strokeWidth={2} dot={false} name="Tests Run" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pass Rate Trend */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Pass Rate Trend</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={executionTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--color-text-muted)" />
                <YAxis tick={{ fontSize: 10 }} stroke="var(--color-text-muted)" domain={[0, 100]} />
                <Tooltip contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '12px' }} />
                <Line type="monotone" dataKey="passRate" stroke="#10b981" strokeWidth={2} dot={false} name="Pass Rate %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tables + charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Slowest Tests */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Top 10 Slowest Tests</h3>
          {slowestTests.length === 0 ? (
            <p className="text-sm text-text-muted py-6 text-center">No duration data available</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">Test</th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-text-muted">Avg</th>
                    <th className="px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-text-muted">Trend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {slowestTests.map((test) => (
                    <tr key={test.name} className="hover:bg-body/50">
                      <td className="px-3 py-2 text-sm text-text-primary max-w-[200px] truncate">{test.name}</td>
                      <td className="px-3 py-2 text-xs text-text-secondary text-right font-mono">
                        {test.avgDuration > 1000 ? `${(test.avgDuration / 1000).toFixed(1)}s` : `${test.avgDuration}ms`}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {trendIcon(test.trend)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Most Failing */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Top 10 Most Failing Tests</h3>
          {mostFailing.length === 0 ? (
            <p className="text-sm text-text-muted py-6 text-center">No failures recorded</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">Test</th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-text-muted">Fails</th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-text-muted">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {mostFailing.map((test) => (
                    <tr key={test.name} className="hover:bg-body/50">
                      <td className="px-3 py-2 text-sm text-text-primary max-w-[200px] truncate">{test.name}</td>
                      <td className="px-3 py-2 text-xs text-status-red text-right font-bold">{test.failCount}</td>
                      <td className="px-3 py-2 text-xs text-right">
                        <span className={cn('font-bold', test.failRate >= 50 ? 'text-status-red' : 'text-status-amber')}>
                          {test.failRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Test Type Distribution */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Test Type Distribution</h3>
          {typeDistribution.length === 0 ? (
            <p className="text-sm text-text-muted py-6 text-center">No data</p>
          ) : (
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, value }) => `${name} (${value})`}
                  >
                    {typeDistribution.map((entry, i) => (
                      <Cell key={i} fill={TYPE_COLORS[entry.name] || '#6b7280'} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Execution Time Histogram */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Duration Distribution</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={durationHistogram}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="var(--color-text-muted)" />
                <YAxis tick={{ fontSize: 10 }} stroke="var(--color-text-muted)" />
                <Tooltip contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="count" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Coverage Gaps */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Coverage Gaps</h3>
          {coverageGaps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle2 className="h-8 w-8 text-status-green mb-2" />
              <p className="text-sm text-status-green font-medium">All modules covered</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {coverageGaps.map((mod) => (
                <li key={mod} className="flex items-center gap-3 rounded-lg bg-body border border-border p-3">
                  <AlertTriangle size={14} className="text-status-amber shrink-0" />
                  <span className="text-sm text-text-primary font-medium">{mod}</span>
                  <span className="text-[10px] text-status-red ml-auto">No tests</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <HowItWorks steps={howItWorksSteps} isOpen={showHowItWorks} onClose={() => setShowHowItWorks(false)} />
    </div>
  )
}
