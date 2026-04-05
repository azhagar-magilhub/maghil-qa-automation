import { useState, useEffect } from 'react'
import {
  Link2, Plus, ArrowRight, Info, Copy, Trash2, ToggleLeft, ToggleRight,
  Send, CheckCircle2, XCircle, Clock, Activity, Settings2, Loader2,
  ArrowDownLeft, ArrowUpRight, X, Zap, BarChart3
} from 'lucide-react'
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'
import HowItWorks from '@/components/shared/HowItWorks'
import api from '@/lib/api'

// ─── How It Works ─────────────────────────────────────────────────────────────

const howItWorksSteps = [
  {
    title: 'Create Webhook',
    description: 'Set up a new webhook by providing a name, direction (incoming or outgoing), URL, and event triggers.',
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
            <Link2 className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Webhook</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Configure Events',
    description: 'Select which events trigger your webhook: test failure, bug filed, scan complete, and more.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Settings2 className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Events</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Zap className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Configure</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Test Delivery',
    description: 'Send a test payload to verify your webhook is receiving data correctly before going live.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Send className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Test</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Delivered</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Monitor Activity',
    description: 'Track delivery history, status codes, and activity logs for all your webhooks in real time.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Activity className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Monitor</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Analytics</span>
        </div>
      </div>
    ),
  },
]

// ─── Types ────────────────────────────────────────────────────────────────────

type WebhookDirection = 'incoming' | 'outgoing'
type WebhookEvent = 'test_failure' | 'bug_filed' | 'scan_complete' | 'deploy_complete' | 'test_pass'

interface Webhook {
  id: string
  name: string
  direction: WebhookDirection
  url: string
  events: WebhookEvent[]
  enabled: boolean
  lastTriggered: Date | null
  status: 'active' | 'inactive' | 'error'
  createdAt: Date
}

interface DeliveryLog {
  id: string
  webhookId: string
  event: string
  statusCode: number
  timestamp: Date
  success: boolean
}

const eventOptions: { id: WebhookEvent; label: string }[] = [
  { id: 'test_failure', label: 'Test Failure' },
  { id: 'bug_filed', label: 'Bug Filed' },
  { id: 'scan_complete', label: 'Scan Complete' },
  { id: 'deploy_complete', label: 'Deploy Complete' },
  { id: 'test_pass', label: 'Test Pass' },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function WebhooksPage() {
  const [showHelp, setShowHelp] = useState(false)
  const { user } = useAuthStore()
  const [tab, setTab] = useState<WebhookDirection>('incoming')
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [showModal, setShowModal] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Modal state
  const [modalName, setModalName] = useState('')
  const [modalDirection, setModalDirection] = useState<WebhookDirection>('incoming')
  const [modalUrl, setModalUrl] = useState('')
  const [modalEvents, setModalEvents] = useState<WebhookEvent[]>([])
  const [creating, setCreating] = useState(false)

  // Sample delivery logs
  const [deliveryLogs] = useState<DeliveryLog[]>([
    { id: '1', webhookId: 'w1', event: 'test_failure', statusCode: 200, timestamp: new Date(Date.now() - 300000), success: true },
    { id: '2', webhookId: 'w1', event: 'scan_complete', statusCode: 200, timestamp: new Date(Date.now() - 900000), success: true },
    { id: '3', webhookId: 'w2', event: 'bug_filed', statusCode: 500, timestamp: new Date(Date.now() - 1800000), success: false },
    { id: '4', webhookId: 'w2', event: 'deploy_complete', statusCode: 200, timestamp: new Date(Date.now() - 3600000), success: true },
  ])

  // Load webhooks from Firestore
  useEffect(() => {
    if (!user) return
    const ref = collection(db, 'webhooks')
    const q = query(ref, where('userId', '==', user.uid), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        lastTriggered: d.data().lastTriggered?.toDate() || null,
        createdAt: d.data().createdAt?.toDate() || new Date(),
      })) as Webhook[]
      setWebhooks(items)
    })
    return () => unsub()
  }, [user])

  const filteredWebhooks = webhooks.filter((w) => w.direction === tab)
  const baseUrl = window.location.origin

  const handleCreate = async () => {
    if (!user || !modalName) return
    setCreating(true)
    try {
      await addDoc(collection(db, 'webhooks'), {
        userId: user.uid,
        name: modalName,
        direction: modalDirection,
        url: modalDirection === 'outgoing' ? modalUrl : `${baseUrl}/api/v1/webhooks/incoming/${Date.now()}`,
        events: modalEvents,
        enabled: true,
        lastTriggered: null,
        status: 'active',
        createdAt: new Date(),
      })
      setShowModal(false)
      resetModal()
    } catch {
      // Create failed
    } finally {
      setCreating(false)
    }
  }

  const resetModal = () => {
    setModalName('')
    setModalDirection('incoming')
    setModalUrl('')
    setModalEvents([])
  }

  const toggleWebhook = async (webhook: Webhook) => {
    try {
      await updateDoc(doc(db, 'webhooks', webhook.id), { enabled: !webhook.enabled })
    } catch {
      // Toggle failed
    }
  }

  const deleteWebhook = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'webhooks', id))
    } catch {
      // Delete failed
    }
  }

  const testWebhook = async (id: string) => {
    setTesting(id)
    try {
      await api.post(`/api/v1/webhooks/${id}/test`)
    } catch {
      // Test failed
    } finally {
      setTimeout(() => setTesting(null), 1500)
    }
  }

  const copyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const toggleEvent = (event: WebhookEvent) => {
    setModalEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    )
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
              <Link2 className="text-accent" size={26} /> Webhooks
            </h1>
            <p className="text-sm text-text-secondary mt-1">Manage incoming and outgoing webhook integrations</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHelp(true)}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-body transition-colors"
            >
              <Info size={16} /> How It Works
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 transition-colors"
            >
              <Plus size={16} /> Create Webhook
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 rounded-lg bg-card border border-border p-1 w-fit">
          {(['incoming', 'outgoing'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
                tab === t ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary hover:bg-body'
              )}
            >
              {t === 'incoming' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
              {t === 'incoming' ? 'Incoming' : 'Outgoing'} Webhooks
            </button>
          ))}
        </div>

        {/* Webhooks List */}
        {filteredWebhooks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-16 text-center">
            <Link2 size={48} className="mx-auto text-text-muted mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">No {tab} webhooks</h3>
            <p className="text-sm text-text-secondary mb-4">Create your first {tab} webhook to get started</p>
            <button
              onClick={() => { setModalDirection(tab); setShowModal(true) }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 transition-colors"
            >
              <Plus size={16} /> Create Webhook
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredWebhooks.map((webhook) => (
              <div key={webhook.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-sm font-semibold text-text-primary">{webhook.name}</h3>
                      <span className={cn(
                        'text-[10px] font-medium px-2 py-0.5 rounded-full',
                        webhook.enabled ? 'bg-status-green/10 text-status-green' : 'bg-body text-text-muted'
                      )}>
                        {webhook.enabled ? 'Active' : 'Inactive'}
                      </span>
                      {webhook.status === 'error' && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-status-red/10 text-status-red">Error</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <code className="text-xs bg-body border border-border rounded px-2 py-1 text-text-secondary font-mono flex-1 truncate">
                        {webhook.url}
                      </code>
                      <button
                        onClick={() => copyUrl(webhook.url, webhook.id)}
                        className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-body transition-colors"
                      >
                        {copiedId === webhook.id ? <CheckCircle2 size={14} className="text-status-green" /> : <Copy size={14} />}
                      </button>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-text-muted">
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> {webhook.lastTriggered ? webhook.lastTriggered.toLocaleString() : 'Never triggered'}
                      </span>
                      <span>Events: {webhook.events?.join(', ') || 'None'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => toggleWebhook(webhook)}
                      className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-body transition-colors"
                    >
                      {webhook.enabled ? <ToggleRight size={20} className="text-status-green" /> : <ToggleLeft size={20} />}
                    </button>
                    {tab === 'outgoing' && (
                      <button
                        onClick={() => testWebhook(webhook.id)}
                        disabled={testing === webhook.id}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-body transition-colors disabled:opacity-50"
                      >
                        {testing === webhook.id ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                        Test
                      </button>
                    )}
                    <button
                      onClick={() => deleteWebhook(webhook.id)}
                      className="p-1.5 rounded text-text-muted hover:text-status-red hover:bg-status-red/10 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delivery History */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Activity size={16} className="text-accent" /> Delivery History
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-5 font-medium text-text-secondary">Event</th>
                  <th className="text-left py-3 px-5 font-medium text-text-secondary">Status</th>
                  <th className="text-left py-3 px-5 font-medium text-text-secondary">Code</th>
                  <th className="text-right py-3 px-5 font-medium text-text-secondary">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {deliveryLogs.map((log) => (
                  <tr key={log.id} className="border-b border-border/50">
                    <td className="py-3 px-5 text-text-primary">{log.event.replace(/_/g, ' ')}</td>
                    <td className="py-3 px-5">
                      {log.success ? (
                        <span className="flex items-center gap-1 text-status-green text-xs font-medium">
                          <CheckCircle2 size={14} /> Delivered
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-status-red text-xs font-medium">
                          <XCircle size={14} /> Failed
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-5">
                      <span className={cn(
                        'text-xs font-mono px-2 py-0.5 rounded',
                        log.statusCode < 300 ? 'bg-status-green/10 text-status-green' : 'bg-status-red/10 text-status-red'
                      )}>
                        {log.statusCode}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-right text-text-muted text-xs">{log.timestamp.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Webhook Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowModal(false)} />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-sidebar shadow-2xl shadow-black/40 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-text-primary">Create Webhook</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-card transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Name</label>
                <input
                  type="text"
                  value={modalName}
                  onChange={(e) => setModalName(e.target.value)}
                  placeholder="My Webhook"
                  className="w-full rounded-lg border border-border bg-body px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Direction</label>
                <div className="flex gap-2">
                  {(['incoming', 'outgoing'] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setModalDirection(d)}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors border',
                        modalDirection === d
                          ? 'bg-accent/10 text-accent-light border-accent/30'
                          : 'text-text-secondary hover:bg-body border-border'
                      )}
                    >
                      {d === 'incoming' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              {modalDirection === 'outgoing' && (
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Webhook URL</label>
                  <input
                    type="url"
                    value={modalUrl}
                    onChange={(e) => setModalUrl(e.target.value)}
                    placeholder="https://example.com/webhook"
                    className="w-full rounded-lg border border-border bg-body px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-2">Events</label>
                <div className="flex flex-wrap gap-2">
                  {eventOptions.map((evt) => (
                    <button
                      key={evt.id}
                      onClick={() => toggleEvent(evt.id)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
                        modalEvents.includes(evt.id)
                          ? 'bg-accent/10 text-accent-light border-accent/30'
                          : 'text-text-secondary hover:bg-body border-border'
                      )}
                    >
                      {evt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg border border-border text-sm text-text-secondary hover:text-text-primary hover:bg-body transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !modalName}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-sm font-semibold text-white hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      <HowItWorks steps={howItWorksSteps} isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  )
}
