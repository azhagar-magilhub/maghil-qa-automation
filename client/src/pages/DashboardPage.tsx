import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  FileSpreadsheet, MessageSquare, FileText, TicketCheck,
  Plug, CheckCircle2, XCircle, MinusCircle, ArrowRight, Info,
  Settings, Globe, BarChart3, Activity, ScrollText, Sparkles, Zap, Rocket, Play
} from 'lucide-react'
import {
  collection, query, where, orderBy, limit, onSnapshot, getDocs, Timestamp
} from 'firebase/firestore'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell,
  ResponsiveContainer, Legend
} from 'recharts'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'
import { usePageTitle } from '@/hooks/usePageTitle'
import HowItWorks from '@/components/shared/HowItWorks'
import { SkeletonMetricCard, SkeletonChart } from '@/components/shared/Skeleton'

const CHART_COLORS = ['#3B82F6', '#E31E24', '#22C55E', '#EAB308', '#A855F7']

const howItWorksSteps = [
  {
    title: 'Setup Integrations',
    description: 'Connect your Jira, Confluence, and Microsoft Teams accounts through the Setup Wizard. Credentials are encrypted and stored securely.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Settings className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Connect</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Plug className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Configure</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Ready</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Upload Excel Files',
    description: 'Drag and drop Excel or CSV files. Map columns to Jira fields, validate data, and bulk-create tickets in seconds.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <FileSpreadsheet className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Excel</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <ArrowRight className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Map</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <TicketCheck className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Tickets</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Import from Teams',
    description: 'Browse your Teams channels, filter messages by date and keywords, and convert discussions into structured Jira tickets.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Messages</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Select</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <TicketCheck className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Tickets</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Publish Reports',
    description: 'Generate summary reports of created tickets and publish them directly to Confluence pages for team visibility.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <FileText className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Report</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <ArrowRight className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Publish</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Globe className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Live</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Track Everything',
    description: 'The dashboard shows real-time metrics. Every action is logged in the audit trail for compliance and traceability.',
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
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Activity className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Activity</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <ScrollText className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Audit</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Scale with AI',
    description: 'Coming soon: AI-powered test case generation, script generators, security scanning, and more across all 16 platform phases.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">AI</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Zap className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Automate</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Rocket className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Scale</span>
        </div>
      </div>
    ),
  },
]

interface MetricData {
  totalTickets: number
  excelUploads: number
  teamsImports: number
  reportsPublished: number
}

interface AuditEntry {
  id: string
  action: string
  status: string
  createdAt: Date
  userId: string
}

export default function DashboardPage() {
  usePageTitle('Dashboard')
  const { user } = useAuthStore()
  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<MetricData>({ totalTickets: 0, excelUploads: 0, teamsImports: 0, reportsPublished: 0 })
  const [sourceData, setSourceData] = useState<{ name: string; value: number }[]>([])
  const [statusData, setStatusData] = useState<{ name: string; value: number }[]>([])
  const [recentActivity, setRecentActivity] = useState<AuditEntry[]>([])
  const [integrationHealth, setIntegrationHealth] = useState<{ type: string; status: boolean | null }[]>([
    { type: 'JIRA', status: null },
    { type: 'CONFLUENCE', status: null },
    { type: 'TEAMS', status: null },
  ])

  useEffect(() => {
    if (!user) return

    // Listen to ticket batches for metrics
    const batchesRef = collection(db, 'ticketBatches')
    const batchQuery = query(batchesRef, where('userId', '==', user.uid), orderBy('createdAt', 'desc'))

    const unsubBatches = onSnapshot(batchQuery, (snapshot) => {
      let total = 0, excel = 0, teams = 0
      let created = 0, failed = 0, pending = 0

      snapshot.docs.forEach((doc) => {
        const data = doc.data()
        total += data.successCount || 0
        if (data.source === 'EXCEL') excel++
        if (data.source === 'TEAMS') teams++
        created += data.successCount || 0
        failed += data.failedCount || 0
        pending += (data.totalCount || 0) - (data.successCount || 0) - (data.failedCount || 0)
      })

      setMetrics({ totalTickets: total, excelUploads: excel, teamsImports: teams, reportsPublished: 0 })
      setSourceData([
        { name: 'Excel', value: excel },
        { name: 'Teams', value: teams },
      ])
      setStatusData([
        { name: 'Created', value: created },
        { name: 'Failed', value: failed },
        { name: 'Pending', value: pending },
      ].filter(d => d.value > 0))
      setLoading(false)
    })

    // Listen to audit logs for recent activity
    const auditRef = collection(db, 'auditLogs')
    const auditQuery = query(auditRef, orderBy('createdAt', 'desc'), limit(10))

    const unsubAudit = onSnapshot(auditQuery, (snapshot) => {
      const entries = snapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          action: data.action || 'Unknown',
          status: data.status || 'SUCCESS',
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
          userId: data.userId || '',
        }
      })
      setRecentActivity(entries)
    })

    // Check integration health
    const loadHealth = async () => {
      try {
        const intRef = collection(db, `users/${user.uid}/integrations`)
        const snap = await getDocs(intRef)
        const health = ['JIRA', 'CONFLUENCE', 'TEAMS'].map((type) => {
          const doc = snap.docs.find((d) => d.id === type)
          return { type, status: doc ? doc.data().lastTestStatus ?? null : null }
        })
        setIntegrationHealth(health)
      } catch { /* ignore */ }
    }
    loadHealth()

    return () => { unsubBatches(); unsubAudit() }
  }, [user])

  const metricCards = [
    { label: 'Total Tickets', value: metrics.totalTickets, icon: TicketCheck, color: 'text-status-blue' },
    { label: 'Excel Uploads', value: metrics.excelUploads, icon: FileSpreadsheet, color: 'text-status-green' },
    { label: 'Teams Imports', value: metrics.teamsImports, icon: MessageSquare, color: 'text-status-purple' },
    { label: 'Reports', value: metrics.reportsPublished, icon: FileText, color: 'text-status-yellow' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-text-secondary">Real-time overview of your QA automation activity</p>
        </div>
        <button onClick={() => setShowHowItWorks(true)} className="flex items-center gap-2 rounded-full border border-border-subtle px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition self-start sm:self-auto">
          <Info className="h-4 w-4" /> How it works
        </button>
      </div>

      {/* Metric Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonMetricCard key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {metricCards.map((m) => (
            <div key={m.label} className="rounded-xl bg-card border border-border p-5">
              <div className="flex items-center justify-between mb-3">
                <m.icon className={cn('h-5 w-5', m.color)} />
              </div>
              <p className="text-3xl font-bold text-text-primary">{m.value}</p>
              <p className={cn('text-sm mt-1', m.color)}>{m.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Charts Row */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SkeletonChart />
          <SkeletonChart />
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Source Chart */}
        <div className="rounded-xl bg-card border border-border p-5">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Tickets by Source</h2>
          {sourceData.some(d => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={sourceData}>
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: 8, color: '#F3F4F6' }} />
                <Bar dataKey="value" fill="#3B82F6" radius={[6, 6, 0, 0]}>
                  {sourceData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-text-muted">No data yet — upload Excel or import from Teams to see charts</div>
          )}
        </div>

        {/* Status Pie Chart */}
        <div className="rounded-xl bg-card border border-border p-5">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Tickets by Status</h2>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: 8, color: '#F3F4F6' }} />
                <Legend wrapperStyle={{ color: '#9CA3AF' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-text-muted">No ticket data yet</div>
          )}
        </div>
      </div>
      )}

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Activity */}
        <div className="lg:col-span-2 rounded-xl bg-card border border-border p-5">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Recent Activity</h2>
          {recentActivity.length > 0 ? (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {recentActivity.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 rounded-lg bg-sidebar/50 px-4 py-3">
                  <div className={cn('h-2 w-2 rounded-full', entry.status === 'SUCCESS' ? 'bg-status-green' : 'bg-status-red')} />
                  <span className="text-sm text-text-primary flex-1 truncate">{entry.action}</span>
                  <span className="text-xs text-text-muted whitespace-nowrap">
                    {entry.createdAt.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text-muted text-sm">No activity yet. Start by uploading an Excel file or browsing Teams messages.</p>
          )}
        </div>

        {/* Integration Health + Quick Actions */}
        <div className="space-y-4">
          {/* Integration Health */}
          <div className="rounded-xl bg-card border border-border p-5">
            <h2 className="text-lg font-semibold text-text-primary mb-3">Integrations</h2>
            <div className="space-y-3">
              {integrationHealth.map((int) => (
                <div key={int.type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Plug className="h-4 w-4 text-text-secondary" />
                    <span className="text-sm text-text-primary">{int.type}</span>
                  </div>
                  {int.status === true && <CheckCircle2 className="h-4 w-4 text-status-green" />}
                  {int.status === false && <XCircle className="h-4 w-4 text-status-red" />}
                  {int.status === null && <MinusCircle className="h-4 w-4 text-text-muted" />}
                </div>
              ))}
            </div>
            <Link to="/setup" className="mt-3 block text-xs text-accent-light hover:underline">Configure integrations →</Link>
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl bg-card border border-border p-5">
            <h2 className="text-lg font-semibold text-text-primary mb-3">Quick Actions</h2>
            <div className="space-y-2">
              {[
                { label: 'Upload Excel', path: '/excel', icon: FileSpreadsheet },
                { label: 'Browse Teams', path: '/teams', icon: MessageSquare },
                { label: 'Generate Report', path: '/reports', icon: FileText },
              ].map((action) => (
                <Link key={action.path} to={action.path} className="flex items-center justify-between rounded-lg bg-sidebar/50 px-4 py-3 hover:bg-sidebar transition">
                  <div className="flex items-center gap-2">
                    <action.icon className="h-4 w-4 text-accent-light" />
                    <span className="text-sm text-text-primary">{action.label}</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-text-muted" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <HowItWorks steps={howItWorksSteps} isOpen={showHowItWorks} onClose={() => setShowHowItWorks(false)} />
    </div>
  )
}
