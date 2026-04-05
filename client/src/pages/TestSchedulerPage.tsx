import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Play, Trash2, Clock, CalendarDays, ToggleLeft, ToggleRight,
  RefreshCw, ChevronDown, Info, ArrowRight, Loader2, CheckCircle2,
  XCircle, AlertTriangle, History, Pencil, Power, Zap, Shield, Eye
} from 'lucide-react'
import {
  collection, query, where, orderBy, onSnapshot, Timestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'
import HowItWorks from '@/components/shared/HowItWorks'
import api from '@/lib/api'

// ─── HowItWorks Steps ──────────────────────────────────────────────────────

const howItWorksSteps = [
  {
    title: 'Create Schedule',
    description: 'Name your schedule and select the test type — API collection, web test, security scan, or accessibility audit.',
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
            <CalendarDays className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Configure</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Set Frequency',
    description: 'Choose how often the test runs: every hour, daily, weekly, or define a custom cron expression.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Clock className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Frequency</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <RefreshCw className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Repeat</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Enable & Monitor',
    description: 'Toggle schedules on and off. See next run time, last run status, and quickly trigger manual runs.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Power className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Enable</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Monitor</span>
        </div>
      </div>
    ),
  },
  {
    title: 'View History',
    description: 'Review execution history for each schedule — see pass/fail status, duration, and links to full results.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <History className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">History</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Results</span>
        </div>
      </div>
    ),
  },
]

// ─── Types ──────────────────────────────────────────────────────────────────

type TestType = 'api' | 'web' | 'security' | 'accessibility'
type Frequency = 'hourly' | 'daily' | 'weekly' | 'custom'

interface Schedule {
  id: string
  name: string
  testType: TestType
  testId: string
  cronExpression: string
  frequency: Frequency
  environment: string
  enabled: boolean
  lastRun: Date | null
  lastRunStatus: 'PASS' | 'FAIL' | 'ERROR' | null
  nextRun: Date | null
  createdAt: Date
}

interface ScheduleRun {
  id: string
  scheduleId: string
  status: 'PASS' | 'FAIL' | 'ERROR' | 'RUNNING'
  duration: number
  createdAt: Date
}

const TEST_TYPE_OPTIONS: { value: TestType; label: string; icon: typeof Zap }[] = [
  { value: 'api', label: 'API Collection', icon: Zap },
  { value: 'web', label: 'Web Test', icon: RefreshCw },
  { value: 'security', label: 'Security Scan', icon: Shield },
  { value: 'accessibility', label: 'Accessibility', icon: Eye },
]

const FREQUENCY_OPTIONS: { value: Frequency; label: string; cron: string }[] = [
  { value: 'hourly', label: 'Every Hour', cron: '0 * * * *' },
  { value: 'daily', label: 'Daily (9 AM)', cron: '0 9 * * *' },
  { value: 'weekly', label: 'Weekly (Mon 9 AM)', cron: '0 9 * * 1' },
  { value: 'custom', label: 'Custom', cron: '' },
]

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function cronToHuman(cron: string): string {
  const parts = cron.split(' ')
  if (parts.length !== 5) return cron
  const [min, hour, , , dow] = parts
  if (min === '0' && hour === '*') return 'Every hour'
  if (dow === '*' && hour !== '*') return `Daily at ${hour}:${min.padStart(2, '0')}`
  if (dow !== '*' && hour !== '*') {
    const days = dow.split(',').map(d => DAYS_OF_WEEK[parseInt(d)] || d).join(', ')
    return `${days} at ${hour}:${min.padStart(2, '0')}`
  }
  return cron
}

function statusBadge(status: string | null) {
  if (!status) return null
  const styles: Record<string, string> = {
    PASS: 'bg-status-green/10 text-status-green',
    FAIL: 'bg-status-red/10 text-status-red',
    ERROR: 'bg-status-yellow/10 text-status-yellow',
    RUNNING: 'bg-status-blue/10 text-status-blue',
  }
  const icons: Record<string, React.ReactNode> = {
    PASS: <CheckCircle2 size={12} />,
    FAIL: <XCircle size={12} />,
    ERROR: <AlertTriangle size={12} />,
    RUNNING: <Loader2 size={12} className="animate-spin" />,
  }
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold', styles[status] || '')}>
      {icons[status]}
      {status}
    </span>
  )
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function TestSchedulerPage() {
  const { user } = useAuthStore()
  const [showHelp, setShowHelp] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [tab, setTab] = useState<'schedules' | 'history'>('schedules')

  // Schedules list
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)

  // Create form
  const [name, setName] = useState('')
  const [testType, setTestType] = useState<TestType>('api')
  const [testId, setTestId] = useState('')
  const [frequency, setFrequency] = useState<Frequency>('daily')
  const [customCron, setCustomCron] = useState('0 9 * * *')
  const [customMinute, setCustomMinute] = useState('0')
  const [customHour, setCustomHour] = useState('9')
  const [customDays, setCustomDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [environment, setEnvironment] = useState('production')
  const [creating, setCreating] = useState(false)

  // Trigger state
  const [triggeringId, setTriggeringId] = useState<string | null>(null)

  // History
  const [runs, setRuns] = useState<ScheduleRun[]>([])

  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'schedules'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    )
    const unsub = onSnapshot(q, snap => {
      setSchedules(snap.docs.map(d => {
        const data = d.data()
        return {
          id: d.id,
          name: data.name,
          testType: data.testType,
          testId: data.testId || '',
          cronExpression: data.cronExpression,
          frequency: data.frequency || 'custom',
          environment: data.environment || 'production',
          enabled: data.enabled ?? true,
          lastRun: data.lastRun?.toDate() || null,
          lastRunStatus: data.lastRunStatus || null,
          nextRun: data.nextRun?.toDate() || null,
          createdAt: data.createdAt?.toDate() || new Date(),
        }
      }))
      setLoading(false)
    })
    return unsub
  }, [user])

  const getCronExpression = useCallback(() => {
    if (frequency === 'custom') {
      const days = customDays.length > 0 && customDays.length < 7
        ? customDays.join(',')
        : '*'
      return `${customMinute} ${customHour} * * ${days}`
    }
    return FREQUENCY_OPTIONS.find(f => f.value === frequency)?.cron || '0 9 * * *'
  }, [frequency, customMinute, customHour, customDays])

  const handleCreate = useCallback(async () => {
    if (!name.trim() || !user) return
    setCreating(true)
    try {
      await api.post('/scheduler', {
        name: name.trim(),
        testType,
        testId,
        cronExpression: getCronExpression(),
        frequency,
        environment,
        enabled: true,
      })
      setShowCreate(false)
      setName('')
      setTestId('')
    } catch (err) {
      console.error('Failed to create schedule:', err)
    } finally {
      setCreating(false)
    }
  }, [name, testType, testId, frequency, environment, user, getCronExpression])

  const handleToggle = useCallback(async (id: string, enabled: boolean) => {
    try {
      await api.put(`/scheduler/${id}`, { enabled: !enabled })
    } catch (err) {
      console.error('Failed to toggle schedule:', err)
    }
  }, [])

  const handleTrigger = useCallback(async (id: string) => {
    setTriggeringId(id)
    try {
      await api.post(`/scheduler/${id}/trigger`)
    } catch (err) {
      console.error('Failed to trigger:', err)
    } finally {
      setTriggeringId(null)
    }
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    try {
      await api.delete(`/scheduler/${id}`)
    } catch (err) {
      console.error('Failed to delete schedule:', err)
    }
  }, [])

  const toggleDay = (day: number) => {
    setCustomDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Test Scheduler</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Automate your test runs with cron-based scheduling
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowHelp(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-body transition-colors"
          >
            <Info size={16} />
            How it works
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-accent text-white px-4 py-2 text-sm font-semibold hover:bg-accent/90 transition-colors"
          >
            <Plus size={16} />
            New Schedule
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-body p-1 w-fit">
        {[
          { key: 'schedules' as const, label: 'Schedules', icon: CalendarDays },
          { key: 'history' as const, label: 'History', icon: History },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
              tab === t.key ? 'bg-card text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
            )}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Schedules List */}
      {tab === 'schedules' && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : schedules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CalendarDays className="w-10 h-10 text-text-muted mb-3" />
              <p className="text-sm text-text-secondary">No schedules yet. Create one to automate your tests.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-body">
                    <th className="text-left px-4 py-3 font-semibold text-text-secondary">Name</th>
                    <th className="text-left px-4 py-3 font-semibold text-text-secondary">Type</th>
                    <th className="text-left px-4 py-3 font-semibold text-text-secondary">Frequency</th>
                    <th className="text-left px-4 py-3 font-semibold text-text-secondary">Last Run</th>
                    <th className="text-left px-4 py-3 font-semibold text-text-secondary">Status</th>
                    <th className="text-left px-4 py-3 font-semibold text-text-secondary">Enabled</th>
                    <th className="text-right px-4 py-3 font-semibold text-text-secondary">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map(s => (
                    <tr key={s.id} className="border-b border-border last:border-0 hover:bg-body/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-text-primary">{s.name}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 text-accent-light px-2.5 py-0.5 text-xs font-semibold capitalize">
                          {s.testType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{cronToHuman(s.cronExpression)}</td>
                      <td className="px-4 py-3 text-text-secondary text-xs">
                        {s.lastRun ? s.lastRun.toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3">{statusBadge(s.lastRunStatus)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleToggle(s.id, s.enabled)} className="text-text-secondary hover:text-text-primary">
                          {s.enabled ? (
                            <ToggleRight size={22} className="text-status-green" />
                          ) : (
                            <ToggleLeft size={22} className="text-text-muted" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleTrigger(s.id)}
                            disabled={triggeringId === s.id}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-body px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-accent hover:border-accent transition-colors"
                          >
                            {triggeringId === s.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Play size={12} />
                            )}
                            Run Now
                          </button>
                          <button
                            onClick={() => handleDelete(s.id)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-status-red hover:bg-status-red/10 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* History tab */}
      {tab === 'history' && (
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <History className="w-10 h-10 text-text-muted mb-3" />
            <p className="text-sm text-text-secondary">Execution history will appear here once schedules have run.</p>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowCreate(false)} />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-sidebar shadow-2xl shadow-black/40 overflow-hidden">
            <div className="px-6 py-5 border-b border-border">
              <h3 className="text-lg font-semibold text-text-primary">Create Schedule</h3>
              <p className="text-sm text-text-secondary mt-1">Configure a recurring test run</p>
            </div>

            <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Name */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">Schedule Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Nightly API regression"
                  className="w-full rounded-lg border border-border bg-body px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
                />
              </div>

              {/* Test Type */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">Test Type</label>
                <div className="relative">
                  <select
                    value={testType}
                    onChange={e => setTestType(e.target.value as TestType)}
                    className="w-full appearance-none rounded-lg border border-border bg-body px-4 py-2.5 text-sm text-text-primary focus:border-accent focus:ring-1 focus:ring-accent outline-none pr-8 transition-colors"
                  >
                    {TEST_TYPE_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                </div>
              </div>

              {/* Test ID */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">Collection / Test ID</label>
                <input
                  type="text"
                  value={testId}
                  onChange={e => setTestId(e.target.value)}
                  placeholder="Enter collection or test ID"
                  className="w-full rounded-lg border border-border bg-body px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
                />
              </div>

              {/* Frequency */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">Frequency</label>
                <div className="grid grid-cols-2 gap-2">
                  {FREQUENCY_OPTIONS.map(f => (
                    <button
                      key={f.value}
                      onClick={() => setFrequency(f.value)}
                      className={cn(
                        'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                        frequency === f.value
                          ? 'border-accent bg-accent/10 text-accent-light'
                          : 'border-border bg-body text-text-secondary hover:bg-card'
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom cron builder */}
              {frequency === 'custom' && (
                <div className="rounded-lg border border-border bg-body p-4 space-y-3">
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Custom Schedule</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-text-secondary">Hour (0-23)</label>
                      <input
                        type="number"
                        min={0} max={23}
                        value={customHour}
                        onChange={e => setCustomHour(e.target.value)}
                        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-text-primary focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-text-secondary">Minute (0-59)</label>
                      <input
                        type="number"
                        min={0} max={59}
                        value={customMinute}
                        onChange={e => setCustomMinute(e.target.value)}
                        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-text-primary focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-text-secondary">Days of Week</label>
                    <div className="flex gap-1.5">
                      {DAYS_OF_WEEK.map((d, i) => (
                        <button
                          key={d}
                          onClick={() => toggleDay(i)}
                          className={cn(
                            'w-9 h-9 rounded-lg text-xs font-semibold transition-colors',
                            customDays.includes(i)
                              ? 'bg-accent text-white'
                              : 'bg-card text-text-secondary hover:bg-body border border-border'
                          )}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-text-muted font-mono">
                    Cron: {customMinute} {customHour} * * {customDays.length > 0 && customDays.length < 7 ? customDays.join(',') : '*'}
                  </p>
                </div>
              )}

              {/* Environment */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">Environment</label>
                <div className="relative">
                  <select
                    value={environment}
                    onChange={e => setEnvironment(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-border bg-body px-4 py-2.5 text-sm text-text-primary focus:border-accent focus:ring-1 focus:ring-accent outline-none pr-8 transition-colors"
                  >
                    <option value="production">Production</option>
                    <option value="staging">Staging</option>
                    <option value="development">Development</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!name.trim() || creating}
                className="inline-flex items-center gap-2 rounded-lg bg-accent text-white px-5 py-2 text-sm font-semibold hover:bg-accent/90 disabled:opacity-50 transition-colors"
              >
                {creating && <Loader2 size={14} className="animate-spin" />}
                Create Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HowItWorks modal */}
      <HowItWorks steps={howItWorksSteps} isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  )
}
