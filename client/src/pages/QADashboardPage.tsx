import { useState, useEffect, useMemo } from 'react'
import {
  Activity, CheckCircle2, XCircle, Bug, Zap, Globe, Smartphone,
  Shield, BarChart3, TrendingUp, AlertTriangle, Clock, RefreshCw
} from 'lucide-react'
import {
  collection, query, where, orderBy, onSnapshot, limit, Timestamp
} from 'firebase/firestore'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

interface TestExecution {
  id: string
  type: 'API_REST' | 'WEB_PLAYWRIGHT' | 'MOBILE_APPIUM' | 'SECURITY_SCAN'
  name: string
  status: 'PASS' | 'FAIL' | 'ERROR' | 'RUNNING'
  duration: number
  autoFiledBug: string | null
  createdAt: Date
}

interface DailyTrend {
  date: string
  pass: number
  fail: number
  error: number
}

interface TypeBreakdown {
  name: string
  API: number
  Web: number
  Mobile: number
  Security: number
}

interface FlakyTest {
  name: string
  type: string
  flipCount: number
  lastStatus: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PIE_COLORS = ['#22C55E', '#EF4444', '#EAB308']

const TYPE_ICONS: Record<string, typeof Zap> = {
  API_REST: Zap,
  WEB_PLAYWRIGHT: Globe,
  MOBILE_APPIUM: Smartphone,
  SECURITY_SCAN: Shield,
}

const TYPE_LABELS: Record<string, string> = {
  API_REST: 'API',
  WEB_PLAYWRIGHT: 'Web',
  MOBILE_APPIUM: 'Mobile',
  SECURITY_SCAN: 'Security',
}

const TYPE_COLORS: Record<string, string> = {
  API_REST: '#3B82F6',
  WEB_PLAYWRIGHT: '#A855F7',
  MOBILE_APPIUM: '#22C55E',
  SECURITY_SCAN: '#F97316',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function QADashboardPage() {
  const { user } = useAuthStore()
  const [executions, setExecutions] = useState<TestExecution[]>([])
  const [loading, setLoading] = useState(true)

  // ─── Firestore real-time listeners ───────────────────────────────────────

  useEffect(() => {
    if (!user?.uid) return

    const allExecutions: TestExecution[] = []
    const unsubs: (() => void)[] = []

    // testExecutions collection
    const q1 = query(
      collection(db, 'testExecutions'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(200)
    )
    unsubs.push(
      onSnapshot(q1, (snap) => {
        const items = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          createdAt:
            d.data().createdAt instanceof Timestamp
              ? d.data().createdAt.toDate()
              : new Date(d.data().createdAt),
        })) as TestExecution[]
        // Merge with security scans
        setExecutions((prev) => {
          const securityItems = prev.filter((p) => p.type === 'SECURITY_SCAN')
          const merged = [...items, ...securityItems]
          merged.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          return merged
        })
        setLoading(false)
      })
    )

    // securityScans collection
    const q2 = query(
      collection(db, 'securityScans'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    )
    unsubs.push(
      onSnapshot(q2, (snap) => {
        const items = snap.docs.map((d) => ({
          id: d.id,
          type: 'SECURITY_SCAN' as const,
          name: d.data().targetUrl || 'Security Scan',
          status: d.data().status === 'COMPLETED' ? ('PASS' as const) : ('ERROR' as const),
          duration: d.data().duration || 0,
          autoFiledBug: null,
          createdAt:
            d.data().createdAt instanceof Timestamp
              ? d.data().createdAt.toDate()
              : new Date(d.data().createdAt),
        }))
        setExecutions((prev) => {
          const nonSecurity = prev.filter((p) => p.type !== 'SECURITY_SCAN')
          const merged = [...nonSecurity, ...items]
          merged.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          return merged
        })
      })
    )

    return () => unsubs.forEach((u) => u())
  }, [user?.uid])

  // ─── Computed metrics ────────────────────────────────────────────────────

  const metrics = useMemo(() => {
    const total = executions.length
    const passed = executions.filter((e) => e.status === 'PASS').length
    const failed = executions.filter((e) => e.status === 'FAIL').length
    const errors = executions.filter((e) => e.status === 'ERROR').length
    const active = executions.filter((e) => e.status === 'RUNNING').length
    const autoFiledBugs = executions.filter((e) => e.autoFiledBug).length
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0

    return { total, passed, failed, errors, active, autoFiledBugs, passRate }
  }, [executions])

  // ─── Chart data: 7-day trend ─────────────────────────────────────────────

  const trendData = useMemo((): DailyTrend[] => {
    const now = new Date()
    const days: DailyTrend[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = getDateKey(d)
      const dayExecs = executions.filter((e) => getDateKey(e.createdAt) === key)
      days.push({
        date: getDayLabel(key),
        pass: dayExecs.filter((e) => e.status === 'PASS').length,
        fail: dayExecs.filter((e) => e.status === 'FAIL').length,
        error: dayExecs.filter((e) => e.status === 'ERROR').length,
      })
    }
    return days
  }, [executions])

  // ─── Chart data: tests by type (stacked bar) ────────────────────────────

  const typeData = useMemo((): TypeBreakdown[] => {
    const now = new Date()
    const days: TypeBreakdown[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = getDateKey(d)
      const dayExecs = executions.filter((e) => getDateKey(e.createdAt) === key)
      days.push({
        name: getDayLabel(key),
        API: dayExecs.filter((e) => e.type === 'API_REST').length,
        Web: dayExecs.filter((e) => e.type === 'WEB_PLAYWRIGHT').length,
        Mobile: dayExecs.filter((e) => e.type === 'MOBILE_APPIUM').length,
        Security: dayExecs.filter((e) => e.type === 'SECURITY_SCAN').length,
      })
    }
    return days
  }, [executions])

  // ─── Chart data: donut ───────────────────────────────────────────────────

  const donutData = useMemo(
    () => [
      { name: 'Pass', value: metrics.passed },
      { name: 'Fail', value: metrics.failed },
      { name: 'Error', value: metrics.errors },
    ],
    [metrics]
  )

  // ─── Flaky tests ────────────────────────────────────────────────────────

  const flakyTests = useMemo((): FlakyTest[] => {
    const testMap = new Map<string, { statuses: string[]; type: string }>()
    executions.forEach((e) => {
      const key = `${e.type}:${e.name}`
      if (!testMap.has(key)) {
        testMap.set(key, { statuses: [], type: e.type })
      }
      testMap.get(key)!.statuses.push(e.status)
    })
    const flaky: FlakyTest[] = []
    testMap.forEach((val, key) => {
      let flips = 0
      for (let i = 1; i < val.statuses.length; i++) {
        if (val.statuses[i] !== val.statuses[i - 1]) flips++
      }
      if (flips >= 2) {
        flaky.push({
          name: key.split(':').slice(1).join(':') || key,
          type: val.type,
          flipCount: flips,
          lastStatus: val.statuses[0],
        })
      }
    })
    flaky.sort((a, b) => b.flipCount - a.flipCount)
    return flaky.slice(0, 10)
  }, [executions])

  // ─── Recent runs ────────────────────────────────────────────────────────

  const recentRuns = useMemo(() => executions.slice(0, 15), [executions])

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">QA Dashboard</h1>
          <p className="text-sm text-text-secondary mt-1">
            Unified metrics across all test types
          </p>
        </div>
        {loading && <RefreshCw size={16} className="animate-spin text-text-secondary" />}
      </div>

      {/* ── Metric Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-text-secondary mb-2">
            <Activity size={16} />
            <span className="text-xs font-semibold uppercase tracking-wider">Total Tests</span>
          </div>
          <p className="text-3xl font-bold text-text-primary">{metrics.total}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-text-secondary mb-2">
            <TrendingUp size={16} />
            <span className="text-xs font-semibold uppercase tracking-wider">Pass Rate</span>
          </div>
          <p
            className={cn(
              'text-3xl font-bold',
              metrics.passRate >= 80
                ? 'text-status-green'
                : metrics.passRate >= 50
                ? 'text-status-yellow'
                : 'text-status-red'
            )}
          >
            {metrics.passRate}%
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-text-secondary mb-2">
            <Bug size={16} />
            <span className="text-xs font-semibold uppercase tracking-wider">Auto-filed Bugs</span>
          </div>
          <p className="text-3xl font-bold text-status-orange">{metrics.autoFiledBugs}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-text-secondary mb-2">
            <Zap size={16} />
            <span className="text-xs font-semibold uppercase tracking-wider">Active Runs</span>
          </div>
          <p className="text-3xl font-bold text-status-blue">{metrics.active}</p>
        </div>
      </div>

      {/* ── Charts Row ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line chart: Pass/Fail trend */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">
            Pass / Fail Trend (7 days)
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#9CA3AF', fontSize: 10 }}
                  axisLine={{ stroke: '#334155' }}
                />
                <YAxis
                  tick={{ fill: '#9CA3AF', fontSize: 10 }}
                  axisLine={{ stroke: '#334155' }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    border: '1px solid #334155',
                    borderRadius: 8,
                    color: '#F3F4F6',
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="pass"
                  stroke="#22C55E"
                  strokeWidth={2}
                  dot={{ fill: '#22C55E', r: 3 }}
                  name="Pass"
                />
                <Line
                  type="monotone"
                  dataKey="fail"
                  stroke="#EF4444"
                  strokeWidth={2}
                  dot={{ fill: '#EF4444', r: 3 }}
                  name="Fail"
                />
                <Line
                  type="monotone"
                  dataKey="error"
                  stroke="#EAB308"
                  strokeWidth={2}
                  dot={{ fill: '#EAB308', r: 3 }}
                  name="Error"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stacked bar: Tests by type */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">
            Tests by Type (7 days)
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#9CA3AF', fontSize: 10 }}
                  axisLine={{ stroke: '#334155' }}
                />
                <YAxis
                  tick={{ fill: '#9CA3AF', fontSize: 10 }}
                  axisLine={{ stroke: '#334155' }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    border: '1px solid #334155',
                    borderRadius: 8,
                    color: '#F3F4F6',
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="API" stackId="a" fill="#3B82F6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Web" stackId="a" fill="#A855F7" />
                <Bar dataKey="Mobile" stackId="a" fill="#22C55E" />
                <Bar dataKey="Security" stackId="a" fill="#F97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut: Pass/Fail/Error distribution */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">
            Pass / Fail / Error
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                >
                  {donutData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    border: '1px solid #334155',
                    borderRadius: 8,
                    color: '#F3F4F6',
                    fontSize: 12,
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, color: '#9CA3AF' }}
                  formatter={(value) => <span className="text-text-secondary">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Bottom Row: Flaky Tests + Recent Runs ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Flaky Tests */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border px-5 py-3">
            <AlertTriangle size={16} className="text-status-yellow" />
            <h3 className="text-sm font-semibold text-text-primary">Flaky Tests</h3>
            <span className="ml-auto rounded-full bg-body px-2 py-0.5 text-[10px] font-semibold text-text-secondary">
              {flakyTests.length}
            </span>
          </div>
          <div className="max-h-[350px] overflow-y-auto divide-y divide-border">
            {flakyTests.length === 0 ? (
              <div className="p-6 text-center text-sm text-text-secondary">
                No flaky tests detected
              </div>
            ) : (
              flakyTests.map((test, i) => {
                const TypeIcon = TYPE_ICONS[test.type] || Zap
                return (
                  <div key={i} className="flex items-center gap-3 px-5 py-3">
                    <TypeIcon
                      size={14}
                      style={{ color: TYPE_COLORS[test.type] || '#9CA3AF' }}
                    />
                    <span className="text-sm text-text-primary truncate flex-1">
                      {test.name}
                    </span>
                    <span className="text-[10px] text-text-secondary">
                      {TYPE_LABELS[test.type] || test.type}
                    </span>
                    <span className="rounded-full bg-status-yellow/10 px-2 py-0.5 text-[10px] font-bold text-status-yellow">
                      {test.flipCount} flips
                    </span>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-bold text-white',
                        test.lastStatus === 'PASS'
                          ? 'bg-status-green'
                          : test.lastStatus === 'FAIL'
                          ? 'bg-status-red'
                          : 'bg-status-yellow'
                      )}
                    >
                      {test.lastStatus}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Recent Test Runs */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border px-5 py-3">
            <Clock size={16} className="text-text-secondary" />
            <h3 className="text-sm font-semibold text-text-primary">Recent Test Runs</h3>
          </div>
          <div className="max-h-[350px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 px-4 text-left text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
                    Type
                  </th>
                  <th className="py-2 px-4 text-left text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
                    Name
                  </th>
                  <th className="py-2 px-4 text-left text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
                    Status
                  </th>
                  <th className="py-2 px-4 text-left text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
                    Duration
                  </th>
                  <th className="py-2 px-4 text-left text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
                    Bug
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentRuns.map((run) => {
                  const TypeIcon = TYPE_ICONS[run.type] || Zap
                  return (
                    <tr key={run.id} className="hover:bg-body/50 transition-colors">
                      <td className="py-2.5 px-4">
                        <span className="flex items-center gap-1.5">
                          <TypeIcon
                            size={12}
                            style={{ color: TYPE_COLORS[run.type] || '#9CA3AF' }}
                          />
                          <span className="text-[10px] text-text-secondary">
                            {TYPE_LABELS[run.type] || run.type}
                          </span>
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-text-primary truncate max-w-[180px]">
                        {run.name}
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-white',
                            run.status === 'PASS'
                              ? 'bg-status-green'
                              : run.status === 'FAIL'
                              ? 'bg-status-red'
                              : run.status === 'ERROR'
                              ? 'bg-status-yellow'
                              : 'bg-status-blue'
                          )}
                        >
                          {run.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-text-secondary text-xs">
                        {run.duration}ms
                      </td>
                      <td className="py-2.5 px-4">
                        {run.autoFiledBug ? (
                          <Bug size={12} className="text-status-orange" />
                        ) : (
                          <span className="text-text-secondary/30">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {recentRuns.length === 0 && (
              <div className="p-6 text-center text-sm text-text-secondary">
                No test runs recorded
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Coverage Matrix Placeholder ────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 size={16} className="text-text-secondary" />
          <h3 className="text-sm font-semibold text-text-primary">Coverage Matrix</h3>
        </div>
        <div className="flex items-center justify-center py-12 border border-dashed border-border rounded-lg">
          <div className="text-center">
            <BarChart3 size={32} className="text-text-secondary/20 mx-auto mb-2" />
            <p className="text-sm text-text-secondary">
              Coverage matrix coming soon
            </p>
            <p className="text-xs text-text-secondary/60 mt-1">
              Visualize test coverage across features, browsers, and devices
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
