import { useState, useEffect } from 'react'
import {
  Activity, ArrowRight, Info, Clock, AlertTriangle, TrendingUp,
  CheckCircle2, BarChart3, Zap, Search
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar,
  PieChart, Pie, Cell
} from 'recharts'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'
import HowItWorks from '@/components/shared/HowItWorks'

// ─── How It Works ─────────────────────────────────────────────────────────────

const howItWorksSteps = [
  {
    title: 'View Metrics',
    description: 'See total API calls, average response time, error rate, and uptime at a glance from the metrics cards.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Metrics</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Overview</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Analyze Endpoints',
    description: 'Drill into top endpoints by call volume. See method, count, and average response time.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Search className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Analyze</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Zap className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Endpoints</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Track Errors',
    description: 'Monitor error rates and status code distribution. Quickly identify 4xx and 5xx spikes.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Errors</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-red/10 flex items-center justify-center">
            <Activity className="w-6 h-6 text-status-red" />
          </div>
          <span className="text-xs text-text-secondary">Track</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Monitor Trends',
    description: 'View API call volume over time with 7-day and 30-day views. Spot traffic patterns and anomalies.',
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
            <CheckCircle2 className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Insights</span>
        </div>
      </div>
    ),
  },
]

// ─── Sample Data ──────────────────────────────────────────────────────────────

const callsOverTime7d = [
  { date: 'Mon', calls: 1245 }, { date: 'Tue', calls: 1580 }, { date: 'Wed', calls: 1320 },
  { date: 'Thu', calls: 1890 }, { date: 'Fri', calls: 1640 }, { date: 'Sat', calls: 820 },
  { date: 'Sun', calls: 540 },
]

const callsOverTime30d = [
  { date: 'W1', calls: 8420 }, { date: 'W2', calls: 9250 }, { date: 'W3', calls: 8860 },
  { date: 'W4', calls: 10340 },
]

const topEndpoints = [
  { endpoint: '/api/v1/tickets', calls: 3420 },
  { endpoint: '/api/v1/test-cases', calls: 2850 },
  { endpoint: '/api/v1/auth/verify', calls: 2340 },
  { endpoint: '/api/v1/security/scan', calls: 1920 },
  { endpoint: '/api/v1/reports', calls: 1560 },
  { endpoint: '/api/v1/environments', calls: 1240 },
  { endpoint: '/api/v1/webhooks', calls: 980 },
  { endpoint: '/api/v1/test-data', calls: 870 },
  { endpoint: '/api/v1/cicd/build', calls: 720 },
  { endpoint: '/api/v1/ai/generate', calls: 640 },
]

const statusDistribution = [
  { name: '2xx Success', value: 89, color: '#22C55E' },
  { name: '4xx Client Error', value: 8, color: '#F59E0B' },
  { name: '5xx Server Error', value: 3, color: '#EF4444' },
]

const endpointDetails = [
  { endpoint: '/api/v1/tickets', method: 'GET', count: 3420, avg: '125ms', p95: '340ms', error: '1.2%' },
  { endpoint: '/api/v1/test-cases', method: 'GET', count: 2850, avg: '98ms', p95: '280ms', error: '0.5%' },
  { endpoint: '/api/v1/auth/verify', method: 'POST', count: 2340, avg: '45ms', p95: '120ms', error: '0.1%' },
  { endpoint: '/api/v1/security/scan', method: 'POST', count: 1920, avg: '2450ms', p95: '5200ms', error: '3.8%' },
  { endpoint: '/api/v1/reports', method: 'GET', count: 1560, avg: '320ms', p95: '890ms', error: '1.5%' },
  { endpoint: '/api/v1/environments', method: 'GET', count: 1240, avg: '78ms', p95: '210ms', error: '0.3%' },
  { endpoint: '/api/v1/webhooks', method: 'POST', count: 980, avg: '156ms', p95: '420ms', error: '2.1%' },
  { endpoint: '/api/v1/test-data', method: 'POST', count: 870, avg: '540ms', p95: '1200ms', error: '1.8%' },
  { endpoint: '/api/v1/cicd/build', method: 'POST', count: 720, avg: '890ms', p95: '2100ms', error: '4.2%' },
  { endpoint: '/api/v1/ai/generate', method: 'POST', count: 640, avg: '1250ms', p95: '3400ms', error: '2.5%' },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function APIAnalyticsPage() {
  const [showHelp, setShowHelp] = useState(false)
  const { user } = useAuthStore()
  const [timeRange, setTimeRange] = useState<'7d' | '30d'>('7d')
  const [metrics] = useState([
    { label: 'Total Calls', value: '38,540', icon: Activity, change: '+12.5%', positive: true },
    { label: 'Avg Response', value: '245ms', icon: Clock, change: '-18ms', positive: true },
    { label: 'Error Rate', value: '2.4%', icon: AlertTriangle, change: '+0.3%', positive: false },
    { label: 'Uptime', value: '99.97%', icon: CheckCircle2, change: '+0.01%', positive: true },
  ])

  // Load real data from Firestore (apiMetrics collection)
  useEffect(() => {
    if (!user) return
    const ref = collection(db, 'apiMetrics')
    const q = query(ref, where('userId', '==', user.uid), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, () => {
      // In production, aggregate real metrics from the snapshot
      // For now, we display the sample data above
    })
    return () => unsub()
  }, [user])

  const callsData = timeRange === '7d' ? callsOverTime7d : callsOverTime30d

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
              <Activity className="text-accent" size={26} /> API Analytics
            </h1>
            <p className="text-sm text-text-secondary mt-1">Monitor API usage, performance, and error rates across all endpoints</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHelp(true)}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-body transition-colors"
            >
              <Info size={16} /> How It Works
            </button>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((m) => (
            <div key={m.label} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <m.icon size={20} className="text-accent" />
                <span className={cn(
                  'text-xs font-medium',
                  m.positive ? 'text-status-green' : 'text-status-red'
                )}>
                  {m.change}
                </span>
              </div>
              <p className="text-2xl font-bold text-text-primary">{m.value}</p>
              <p className="text-xs text-text-secondary mt-1">{m.label}</p>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Line Chart - API Calls Over Time */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-text-primary">API Calls Over Time</h2>
              <div className="flex items-center gap-1 rounded-lg bg-body border border-border p-0.5">
                {(['7d', '30d'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setTimeRange(r)}
                    className={cn(
                      'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                      timeRange === r ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary'
                    )}
                  >
                    {r === '7d' ? '7 Days' : '30 Days'}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={callsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
                <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="calls" stroke="var(--color-accent)" strokeWidth={2} dot={{ r: 4, fill: 'var(--color-accent)' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart - Status Codes */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-text-primary mb-4">Status Code Distribution</h2>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={statusDistribution} cx="50%" cy="50%" outerRadius={70} innerRadius={45} dataKey="value" paddingAngle={2}>
                  {statusDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {statusDistribution.map((s) => (
                <div key={s.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-text-secondary">{s.name}</span>
                  </div>
                  <span className="font-medium text-text-primary">{s.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bar Chart - Top Endpoints */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-4">Top 10 Endpoints by Call Volume</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topEndpoints} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis type="number" tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
              <YAxis dataKey="endpoint" type="category" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} width={180} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '8px' }} />
              <Bar dataKey="calls" fill="var(--color-accent)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Endpoint Details Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-text-primary">Endpoint Performance Details</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-5 font-medium text-text-secondary">Endpoint</th>
                  <th className="text-left py-3 px-5 font-medium text-text-secondary">Method</th>
                  <th className="text-right py-3 px-5 font-medium text-text-secondary">Calls</th>
                  <th className="text-right py-3 px-5 font-medium text-text-secondary">Avg Time</th>
                  <th className="text-right py-3 px-5 font-medium text-text-secondary">P95</th>
                  <th className="text-right py-3 px-5 font-medium text-text-secondary">Error Rate</th>
                </tr>
              </thead>
              <tbody>
                {endpointDetails.map((row, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-3 px-5">
                      <code className="text-xs font-mono text-text-primary">{row.endpoint}</code>
                    </td>
                    <td className="py-3 px-5">
                      <span className={cn(
                        'text-xs font-medium px-2 py-0.5 rounded',
                        row.method === 'GET' ? 'bg-status-green/10 text-status-green' : 'bg-accent/10 text-accent-light'
                      )}>
                        {row.method}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-right text-text-primary font-medium">{row.count.toLocaleString()}</td>
                    <td className="py-3 px-5 text-right text-text-secondary">{row.avg}</td>
                    <td className="py-3 px-5 text-right text-text-secondary">{row.p95}</td>
                    <td className="py-3 px-5 text-right">
                      <span className={cn(
                        'font-medium',
                        parseFloat(row.error) > 3 ? 'text-status-red' : parseFloat(row.error) > 1 ? 'text-status-yellow' : 'text-status-green'
                      )}>
                        {row.error}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <HowItWorks steps={howItWorksSteps} isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  )
}
