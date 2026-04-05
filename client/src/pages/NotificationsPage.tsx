import { useState, useEffect } from 'react'
import {
  Bell, Plus, Trash2, Save, Hash, Mail, MessageSquare,
  AlertTriangle, Shield, Rocket, ArrowUp, Check, X, Info, ArrowRight, Settings, Zap, GitBranch
} from 'lucide-react'
import {
  collection, addDoc, updateDoc, deleteDoc, doc, query, where,
  orderBy, onSnapshot, serverTimestamp, limit as firestoreLimit
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'
import HowItWorks from '@/components/shared/HowItWorks'
import api from '@/lib/api'

const howItWorksSteps = [
  {
    title: 'Configure Channels',
    description: 'Enable notification channels: in-app, Slack, Teams, or email. Provide webhook URLs for external integrations.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Bell className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Channels</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Settings className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Configure</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Set Triggers',
    description: 'Choose which events trigger notifications, such as test failures, security alerts, deployments, or high-priority bugs.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Zap className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Events</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Triggers</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Create Rules',
    description: 'Define custom alert rules with conditions and actions. Rules can escalate or route notifications based on criteria.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <GitBranch className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">IF/THEN</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Bell className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Rules</span>
        </div>
      </div>
    ),
  },
]

// ─── Types ───────────────────────────────────────────────────────────────────

interface NotificationPreferences {
  inApp: boolean
  slack: boolean
  teams: boolean
  email: boolean
  slackWebhookUrl: string
  teamsWebhookUrl: string
}

interface EventTrigger {
  id: string
  label: string
  key: string
  enabled: boolean
  icon: typeof AlertTriangle
}

interface AlertRule {
  id: string
  condition: string
  action: string
}

interface NotificationEntry {
  id: string
  type: string
  title: string
  message: string
  channel: string
  createdAt: string
  read: boolean
}

const CONDITIONS = [
  'Test suite fails',
  'Pass rate below 80%',
  'Critical vulnerability found',
  'Build deployed',
  'Response time exceeds threshold',
  'Error rate above 5%',
]

const ACTIONS = [
  'Send Slack notification',
  'Send Teams notification',
  'Send email alert',
  'Create Jira ticket',
  'Trigger re-run',
  'Escalate to team lead',
]

// ─── Component ───────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const [showHelp, setShowHelp] = useState(false)
  const { user } = useAuthStore()

  const [prefs, setPrefs] = useState<NotificationPreferences>({
    inApp: false,
    slack: false,
    teams: false,
    email: false,
    slackWebhookUrl: '',
    teamsWebhookUrl: '',
  })

  const [triggers, setTriggers] = useState<EventTrigger[]>([
    { id: '1', label: 'Test Failure', key: 'testFailure', enabled: false, icon: AlertTriangle },
    { id: '2', label: 'Security Vulnerability', key: 'securityVuln', enabled: false, icon: Shield },
    { id: '3', label: 'Build Deployed', key: 'buildDeployed', enabled: false, icon: Rocket },
    { id: '4', label: 'Escalation', key: 'escalation', enabled: false, icon: ArrowUp },
  ])

  const [alertRules, setAlertRules] = useState<AlertRule[]>([])
  const [notifications, setNotifications] = useState<NotificationEntry[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // ── Firestore listener for notification history ──

  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      firestoreLimit(50)
    )
    const unsub = onSnapshot(q, (snap) => {
      setNotifications(
        snap.docs.map((d) => ({ id: d.id, ...d.data() })) as NotificationEntry[]
      )
    })
    return unsub
  }, [user])

  // ── Handlers ──

  const toggleChannel = (key: keyof Pick<NotificationPreferences, 'inApp' | 'slack' | 'teams' | 'email'>) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const toggleTrigger = (id: string) => {
    setTriggers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t))
    )
  }

  const addRule = () => {
    setAlertRules((prev) => [
      ...prev,
      { id: crypto.randomUUID(), condition: CONDITIONS[0], action: ACTIONS[0] },
    ])
  }

  const removeRule = (id: string) => {
    setAlertRules((prev) => prev.filter((r) => r.id !== id))
  }

  const updateRule = (id: string, field: 'condition' | 'action', value: string) => {
    setAlertRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.post('/api/v1/notifications/preferences', {
        channels: prefs,
        triggers: triggers.filter((t) => t.enabled).map((t) => t.key),
        alertRules,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }

  const getChannelBadgeColor = (channel: string) => {
    switch (channel) {
      case 'slack': return 'bg-purple-500/20 text-purple-400'
      case 'teams': return 'bg-blue-500/20 text-blue-400'
      case 'email': return 'bg-orange-500/20 text-orange-400'
      default: return 'bg-card text-text-secondary'
    }
  }

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'failure': return 'bg-red-500/20 text-red-400'
      case 'security': return 'bg-yellow-500/20 text-yellow-400'
      case 'deploy': return 'bg-green-500/20 text-green-400'
      case 'escalation': return 'bg-orange-500/20 text-orange-400'
      default: return 'bg-card text-text-secondary'
    }
  }

  // ── Render ──

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Bell size={24} className="text-accent" />
            Notifications
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Configure channels, triggers, and alert rules for your team.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
        >
          {saved ? <Check size={16} /> : <Save size={16} />}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Preferences'}
        </button>
        <button onClick={() => setShowHelp(true)} className="flex items-center gap-2 rounded-full border border-border-subtle px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition">
          <Info className="h-4 w-4" /> How it works
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Channel Preferences */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-4">Notification Channels</h2>
          <div className="space-y-3">
            {([
              { key: 'inApp' as const, label: 'In-App', icon: Bell, desc: 'Browser notifications within the platform' },
              { key: 'slack' as const, label: 'Slack', icon: MessageSquare, desc: 'Post to a Slack channel via webhook' },
              { key: 'teams' as const, label: 'Teams', icon: MessageSquare, desc: 'Post to Microsoft Teams via webhook' },
              { key: 'email' as const, label: 'Email', icon: Mail, desc: 'Send email alerts to team members' },
            ]).map((ch) => (
              <div key={ch.key} className="flex items-center justify-between rounded-lg border border-border bg-body p-3">
                <div className="flex items-center gap-3">
                  <ch.icon size={18} className="text-text-secondary" />
                  <div>
                    <p className="text-sm font-medium text-text-primary">{ch.label}</p>
                    <p className="text-xs text-text-secondary">{ch.desc}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleChannel(ch.key)}
                  className={cn(
                    'relative h-6 w-11 rounded-full transition-colors',
                    prefs[ch.key] ? 'bg-accent' : 'bg-border'
                  )}
                >
                  <span className={cn(
                    'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform',
                    prefs[ch.key] ? 'left-[22px]' : 'left-0.5'
                  )} />
                </button>
              </div>
            ))}
          </div>

          {/* Webhook URLs */}
          {prefs.slack && (
            <div className="mt-4">
              <label className="text-xs text-text-secondary mb-1 block">Slack Webhook URL</label>
              <input
                type="text"
                value={prefs.slackWebhookUrl}
                onChange={(e) => setPrefs((p) => ({ ...p, slackWebhookUrl: e.target.value }))}
                placeholder="https://hooks.slack.com/services/..."
                className="w-full rounded-lg border border-border bg-body px-3 py-2 text-sm text-text-primary font-mono placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          )}
          {prefs.teams && (
            <div className="mt-4">
              <label className="text-xs text-text-secondary mb-1 block">Teams Webhook URL</label>
              <input
                type="text"
                value={prefs.teamsWebhookUrl}
                onChange={(e) => setPrefs((p) => ({ ...p, teamsWebhookUrl: e.target.value }))}
                placeholder="https://outlook.office.com/webhook/..."
                className="w-full rounded-lg border border-border bg-body px-3 py-2 text-sm text-text-primary font-mono placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          )}
        </div>

        {/* Event Triggers */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-4">Event Triggers</h2>
          <div className="space-y-3">
            {triggers.map((trigger) => (
              <div key={trigger.id} className="flex items-center justify-between rounded-lg border border-border bg-body p-3">
                <div className="flex items-center gap-3">
                  <trigger.icon size={18} className="text-text-secondary" />
                  <span className="text-sm font-medium text-text-primary">{trigger.label}</span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={trigger.enabled}
                    onChange={() => toggleTrigger(trigger.id)}
                    className="h-4 w-4 rounded border-border bg-body text-accent focus:ring-accent"
                  />
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alert Rules Builder */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-text-primary">Alert Rules</h2>
          <button
            onClick={addRule}
            className="flex items-center gap-1.5 text-xs font-medium text-accent-light hover:text-accent transition-colors"
          >
            <Plus size={14} /> Add Rule
          </button>
        </div>
        {alertRules.length === 0 ? (
          <p className="text-sm text-text-secondary py-4 text-center">No alert rules configured. Click "Add Rule" to create one.</p>
        ) : (
          <div className="space-y-3">
            {alertRules.map((rule) => (
              <div key={rule.id} className="flex items-center gap-3 rounded-lg border border-border bg-body p-3">
                <span className="text-xs font-semibold uppercase text-text-secondary">IF</span>
                <select
                  value={rule.condition}
                  onChange={(e) => updateRule(rule.id, 'condition', e.target.value)}
                  className="flex-1 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <span className="text-xs font-semibold uppercase text-text-secondary">THEN</span>
                <select
                  value={rule.action}
                  onChange={(e) => updateRule(rule.id, 'action', e.target.value)}
                  className="flex-1 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
                <button
                  onClick={() => removeRule(rule.id)}
                  className="p-1.5 text-text-secondary hover:text-red-400 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notification History */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-text-primary">Notification History</h2>
        </div>
        {notifications.length === 0 ? (
          <div className="py-12 text-center text-text-secondary">
            <Bell size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No notifications yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((n) => (
              <div key={n.id} className="flex items-start gap-3 px-5 py-3 hover:bg-body/50 transition-colors">
                <div className={cn('mt-1 h-2 w-2 rounded-full flex-shrink-0', n.read ? 'bg-transparent' : 'bg-accent')} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary">{n.title}</span>
                    <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', getTypeBadgeColor(n.type))}>
                      {n.type}
                    </span>
                    <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', getChannelBadgeColor(n.channel))}>
                      {n.channel}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5 truncate">{n.message}</p>
                </div>
                <span className="text-[10px] text-text-secondary whitespace-nowrap">
                  {n.createdAt ? new Date(n.createdAt).toLocaleString() : '-'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    <HowItWorks steps={howItWorksSteps} isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  )
}
