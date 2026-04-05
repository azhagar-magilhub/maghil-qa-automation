import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Plus, Trash2, GripVertical, ArrowRight, Info, Save,
  RotateCcw, BarChart3, PieChart, TrendingUp, Activity, ClipboardList,
  Heart, Zap, Settings2, Loader2, CheckCircle2
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell, LineChart, Line, CartesianGrid
} from 'recharts'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'
import HowItWorks from '@/components/shared/HowItWorks'

// ─── How It Works ─────────────────────────────────────────────────────────────

const howItWorksSteps = [
  {
    title: 'Add Widgets',
    description: 'Browse the available widgets sidebar and click Add to place them on your dashboard grid.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Plus className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Browse</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <LayoutDashboard className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Add</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Configure Data',
    description: 'Select the data source for each widget: tickets, tests, security, or performance metrics.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Settings2 className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Configure</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Zap className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Data Source</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Arrange Layout',
    description: 'Drag widgets to reorder them in your dashboard. Resize by choosing widget span size.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <GripVertical className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Drag</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <LayoutDashboard className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Arrange</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Save Dashboard',
    description: 'Save your layout to the cloud. It loads automatically on your next visit.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Save className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Save</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Saved</span>
        </div>
      </div>
    ),
  },
]

// ─── Types ────────────────────────────────────────────────────────────────────

type WidgetType = 'metric-card' | 'bar-chart' | 'pie-chart' | 'line-chart' | 'recent-activity' | 'test-results' | 'integration-health' | 'quick-actions'
type DataSource = 'tickets' | 'tests' | 'security' | 'performance'

interface DashboardWidget {
  id: string
  type: WidgetType
  dataSource: DataSource
  span: 1 | 2
}

interface WidgetTemplate {
  type: WidgetType
  label: string
  icon: typeof BarChart3
  defaultSpan: 1 | 2
}

const widgetTemplates: WidgetTemplate[] = [
  { type: 'metric-card', label: 'Metric Card', icon: TrendingUp, defaultSpan: 1 },
  { type: 'bar-chart', label: 'Bar Chart', icon: BarChart3, defaultSpan: 2 },
  { type: 'pie-chart', label: 'Pie Chart', icon: PieChart, defaultSpan: 1 },
  { type: 'line-chart', label: 'Line Chart', icon: TrendingUp, defaultSpan: 2 },
  { type: 'recent-activity', label: 'Recent Activity', icon: Activity, defaultSpan: 1 },
  { type: 'test-results', label: 'Test Results Table', icon: ClipboardList, defaultSpan: 2 },
  { type: 'integration-health', label: 'Integration Health', icon: Heart, defaultSpan: 1 },
  { type: 'quick-actions', label: 'Quick Actions', icon: Zap, defaultSpan: 1 },
]

const dataSources: { id: DataSource; label: string }[] = [
  { id: 'tickets', label: 'Tickets' },
  { id: 'tests', label: 'Tests' },
  { id: 'security', label: 'Security' },
  { id: 'performance', label: 'Performance' },
]

// ─── Sample Data ──────────────────────────────────────────────────────────────

const sampleBarData = [
  { name: 'Mon', value: 42 }, { name: 'Tue', value: 58 }, { name: 'Wed', value: 35 },
  { name: 'Thu', value: 71 }, { name: 'Fri', value: 48 },
]

const samplePieData = [
  { name: 'Passed', value: 78, color: '#22C55E' },
  { name: 'Failed', value: 12, color: '#EF4444' },
  { name: 'Skipped', value: 10, color: '#F59E0B' },
]

const sampleLineData = [
  { name: 'W1', value: 65 }, { name: 'W2', value: 72 }, { name: 'W3', value: 68 },
  { name: 'W4', value: 81 }, { name: 'W5', value: 76 }, { name: 'W6', value: 89 },
]

const defaultWidgets: DashboardWidget[] = [
  { id: 'w1', type: 'metric-card', dataSource: 'tests', span: 1 },
  { id: 'w2', type: 'metric-card', dataSource: 'tickets', span: 1 },
  { id: 'w3', type: 'bar-chart', dataSource: 'tests', span: 2 },
  { id: 'w4', type: 'pie-chart', dataSource: 'tests', span: 1 },
  { id: 'w5', type: 'recent-activity', dataSource: 'tickets', span: 1 },
]

// ─── Widget Renderers ─────────────────────────────────────────────────────────

function MetricCardWidget({ dataSource }: { dataSource: DataSource }) {
  const metrics: Record<DataSource, { label: string; value: string; change: string }> = {
    tickets: { label: 'Open Tickets', value: '47', change: '+3 today' },
    tests: { label: 'Test Pass Rate', value: '96.8%', change: '+1.2% this week' },
    security: { label: 'Vulnerabilities', value: '5', change: '-2 this week' },
    performance: { label: 'Avg Response', value: '245ms', change: '-12ms this week' },
  }
  const m = metrics[dataSource]
  return (
    <div className="text-center py-2">
      <p className="text-3xl font-bold text-text-primary">{m.value}</p>
      <p className="text-sm text-text-secondary mt-1">{m.label}</p>
      <p className="text-xs text-status-green mt-1">{m.change}</p>
    </div>
  )
}

function BarChartWidget() {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={sampleBarData}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="name" tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
        <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
        <Tooltip contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }} />
        <Bar dataKey="value" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function PieChartWidget() {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <RePieChart>
        <Pie data={samplePieData} cx="50%" cy="50%" outerRadius={70} dataKey="value">
          {samplePieData.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }} />
      </RePieChart>
    </ResponsiveContainer>
  )
}

function LineChartWidget() {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={sampleLineData}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="name" tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
        <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
        <Tooltip contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }} />
        <Line type="monotone" dataKey="value" stroke="var(--color-accent)" strokeWidth={2} dot={{ r: 4, fill: 'var(--color-accent)' }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

function RecentActivityWidget() {
  const items = [
    { text: 'Test suite completed', time: '2m ago' },
    { text: 'Bug JIRA-456 filed', time: '15m ago' },
    { text: 'Security scan passed', time: '1h ago' },
    { text: 'Deploy to staging', time: '3h ago' },
  ]
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="flex items-center justify-between">
          <span className="text-sm text-text-primary">{item.text}</span>
          <span className="text-xs text-text-muted">{item.time}</span>
        </div>
      ))}
    </div>
  )
}

function TestResultsWidget() {
  const rows = [
    { name: 'Login Flow', status: 'Passed', count: 45 },
    { name: 'Payment API', status: 'Failed', count: 32 },
    { name: 'User Profile', status: 'Passed', count: 28 },
    { name: 'Search', status: 'Passed', count: 56 },
  ]
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border">
          <th className="text-left py-2 text-text-secondary font-medium">Suite</th>
          <th className="text-left py-2 text-text-secondary font-medium">Status</th>
          <th className="text-right py-2 text-text-secondary font-medium">Cases</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-b border-border/50">
            <td className="py-2 text-text-primary">{r.name}</td>
            <td className={cn('py-2 font-medium', r.status === 'Passed' ? 'text-status-green' : 'text-status-red')}>{r.status}</td>
            <td className="py-2 text-right text-text-secondary">{r.count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function IntegrationHealthWidget() {
  const integrations = [
    { name: 'Jira', status: 'Healthy' },
    { name: 'Teams', status: 'Healthy' },
    { name: 'CI/CD', status: 'Warning' },
    { name: 'Firestore', status: 'Healthy' },
  ]
  return (
    <div className="space-y-3">
      {integrations.map((int, i) => (
        <div key={i} className="flex items-center justify-between">
          <span className="text-sm text-text-primary">{int.name}</span>
          <span className={cn(
            'text-xs font-medium px-2 py-0.5 rounded-full',
            int.status === 'Healthy' ? 'bg-status-green/10 text-status-green' : 'bg-status-yellow/10 text-status-yellow'
          )}>{int.status}</span>
        </div>
      ))}
    </div>
  )
}

function QuickActionsWidget() {
  const actions = [
    { label: 'Run Tests', icon: Zap },
    { label: 'View Reports', icon: BarChart3 },
    { label: 'File Bug', icon: ClipboardList },
    { label: 'Scan Security', icon: Activity },
  ]
  return (
    <div className="grid grid-cols-2 gap-2">
      {actions.map((a, i) => (
        <button
          key={i}
          className="flex flex-col items-center gap-1.5 rounded-lg bg-body border border-border p-3 text-text-secondary hover:text-text-primary hover:border-accent/30 transition-colors"
        >
          <a.icon size={18} />
          <span className="text-xs font-medium">{a.label}</span>
        </button>
      ))}
    </div>
  )
}

function renderWidget(widget: DashboardWidget) {
  switch (widget.type) {
    case 'metric-card': return <MetricCardWidget dataSource={widget.dataSource} />
    case 'bar-chart': return <BarChartWidget />
    case 'pie-chart': return <PieChartWidget />
    case 'line-chart': return <LineChartWidget />
    case 'recent-activity': return <RecentActivityWidget />
    case 'test-results': return <TestResultsWidget />
    case 'integration-health': return <IntegrationHealthWidget />
    case 'quick-actions': return <QuickActionsWidget />
    default: return null
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CustomDashboardPage() {
  const [showHelp, setShowHelp] = useState(false)
  const { user } = useAuthStore()
  const [widgets, setWidgets] = useState<DashboardWidget[]>(defaultWidgets)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [configWidget, setConfigWidget] = useState<string | null>(null)

  // Load saved layout
  useEffect(() => {
    if (!user) return
    const loadLayout = async () => {
      try {
        const ref = doc(db, 'dashboardLayouts', user.uid)
        const snap = await getDoc(ref)
        if (snap.exists()) {
          const data = snap.data()
          if (data.widgets?.length) setWidgets(data.widgets)
        }
      } catch {
        // Use defaults
      }
    }
    loadLayout()
  }, [user])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    try {
      await setDoc(doc(db, 'dashboardLayouts', user.uid), {
        userId: user.uid,
        widgets,
        updatedAt: new Date(),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      // Save failed
    } finally {
      setSaving(false)
    }
  }

  const addWidget = (template: WidgetTemplate) => {
    const newWidget: DashboardWidget = {
      id: `w${Date.now()}`,
      type: template.type,
      dataSource: 'tests',
      span: template.defaultSpan,
    }
    setWidgets((prev) => [...prev, newWidget])
  }

  const removeWidget = (id: string) => {
    setWidgets((prev) => prev.filter((w) => w.id !== id))
  }

  const updateDataSource = (id: string, ds: DataSource) => {
    setWidgets((prev) => prev.map((w) => w.id === id ? { ...w, dataSource: ds } : w))
    setConfigWidget(null)
  }

  const handleDragStart = (idx: number) => setDragIdx(idx)
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) return
    const updated = [...widgets]
    const [moved] = updated.splice(dragIdx, 1)
    updated.splice(idx, 0, moved)
    setWidgets(updated)
    setDragIdx(idx)
  }
  const handleDragEnd = () => setDragIdx(null)

  const getWidgetLabel = (type: WidgetType) => widgetTemplates.find((t) => t.type === type)?.label || type

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
              <LayoutDashboard className="text-accent" size={26} /> Custom Dashboard
            </h1>
            <p className="text-sm text-text-secondary mt-1">Build and customize your personal dashboard with drag-and-drop widgets</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHelp(true)}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-body transition-colors"
            >
              <Info size={16} /> How It Works
            </button>
            <button
              onClick={() => setWidgets(defaultWidgets)}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-body transition-colors"
            >
              <RotateCcw size={16} /> Reset
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
              {saving ? 'Saving...' : saved ? 'Saved' : 'Save Layout'}
            </button>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Widget Sidebar */}
          <div className="w-64 shrink-0">
            <div className="rounded-xl border border-border bg-card p-4 sticky top-4">
              <h2 className="text-sm font-semibold text-text-primary mb-3">Available Widgets</h2>
              <div className="space-y-2">
                {widgetTemplates.map((template) => (
                  <button
                    key={template.type}
                    onClick={() => addWidget(template)}
                    className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-text-secondary hover:bg-body hover:text-text-primary border border-transparent hover:border-border transition-colors text-left"
                  >
                    <template.icon size={16} className="text-accent" />
                    <span className="flex-1">{template.label}</span>
                    <Plus size={14} className="text-text-muted" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Dashboard Grid */}
          <div className="flex-1">
            {widgets.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card p-16 text-center">
                <LayoutDashboard size={48} className="mx-auto text-text-muted mb-4" />
                <h3 className="text-lg font-semibold text-text-primary mb-2">No widgets yet</h3>
                <p className="text-sm text-text-secondary">Add widgets from the sidebar to build your dashboard</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {widgets.map((widget, idx) => (
                  <div
                    key={widget.id}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      'rounded-xl border border-border bg-card p-4 transition-all',
                      widget.span === 2 ? 'col-span-2' : 'col-span-1',
                      dragIdx === idx ? 'opacity-50 border-accent' : 'hover:border-border'
                    )}
                  >
                    {/* Widget Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <GripVertical size={14} className="text-text-muted cursor-grab" />
                        <span className="text-sm font-semibold text-text-primary">{getWidgetLabel(widget.type)}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-body text-text-muted border border-border">
                          {widget.dataSource}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setConfigWidget(configWidget === widget.id ? null : widget.id)}
                          className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-body transition-colors"
                        >
                          <Settings2 size={14} />
                        </button>
                        <button
                          onClick={() => removeWidget(widget.id)}
                          className="p-1 rounded text-text-muted hover:text-status-red hover:bg-status-red/10 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Config Dropdown */}
                    {configWidget === widget.id && (
                      <div className="mb-3 p-3 rounded-lg bg-body border border-border">
                        <p className="text-xs font-medium text-text-secondary mb-2">Data Source</p>
                        <div className="flex gap-2">
                          {dataSources.map((ds) => (
                            <button
                              key={ds.id}
                              onClick={() => updateDataSource(widget.id, ds.id)}
                              className={cn(
                                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                                widget.dataSource === ds.id
                                  ? 'bg-accent/10 text-accent-light border border-accent/30'
                                  : 'text-text-secondary hover:bg-card border border-border'
                              )}
                            >
                              {ds.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Widget Content */}
                    {renderWidget(widget)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <HowItWorks steps={howItWorksSteps} isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  )
}
