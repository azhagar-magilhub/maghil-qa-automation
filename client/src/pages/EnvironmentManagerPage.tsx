import { useState, useEffect } from 'react'
import {
  Plus, Trash2, Server, RefreshCw, ArrowLeftRight, Activity,
  ChevronDown, X, Check, AlertCircle, Copy, Info, ArrowRight, CheckCircle2, Eye
} from 'lucide-react'
import {
  collection, addDoc, updateDoc, deleteDoc, doc, query, where,
  onSnapshot, serverTimestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'
import HowItWorks from '@/components/shared/HowItWorks'
import api from '@/lib/api'

const howItWorksSteps = [
  {
    title: 'Register Environment',
    description: 'Add a new environment by providing a name, base URL, build version, and key-value configuration variables.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Plus className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Add</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Server className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Environment</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Check Health',
    description: 'Click the refresh icon to ping each environment and check its health status. Green means up, red means down.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Activity className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Check</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Status</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Compare Configs',
    description: 'Enable Compare mode to view environment configurations side by side and spot differences across your environments.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <ArrowLeftRight className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Diff</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Eye className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Compare</span>
        </div>
      </div>
    ),
  },
]

// ─── Types ───────────────────────────────────────────────────────────────────

interface EnvVariable {
  key: string
  value: string
}

interface Environment {
  id: string
  name: string
  baseUrl: string
  variables: EnvVariable[]
  healthStatus: 'up' | 'down' | 'unknown'
  lastChecked: string | null
  currentBuild: string
  userId: string
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function EnvironmentManagerPage() {
  const { user } = useAuthStore()
  const [showHelp, setShowHelp] = useState(false)
  const [environments, setEnvironments] = useState<Environment[]>([])
  const [showForm, setShowForm] = useState(false)
  const [checkingHealth, setCheckingHealth] = useState<string | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formUrl, setFormUrl] = useState('')
  const [formVars, setFormVars] = useState<EnvVariable[]>([{ key: '', value: '' }])

  // Compare state
  const [compareMode, setCompareMode] = useState(false)
  const [compareA, setCompareA] = useState<string>('')
  const [compareB, setCompareB] = useState<string>('')

  // Quick switch
  const [activeEnvId, setActiveEnvId] = useState<string>('')

  // ── Firestore listener ──

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'environments'), where('userId', '==', user.uid))
    const unsub = onSnapshot(q, (snap) => {
      const envs: Environment[] = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Environment[]
      setEnvironments(envs)
      if (!activeEnvId && envs.length > 0) setActiveEnvId(envs[0].id)
    })
    return unsub
  }, [user])

  // ── Handlers ──

  const handleRegister = async () => {
    if (!formName.trim() || !formUrl.trim() || !user) return
    await addDoc(collection(db, 'environments'), {
      name: formName,
      baseUrl: formUrl,
      variables: formVars.filter((v) => v.key.trim()),
      healthStatus: 'unknown',
      lastChecked: null,
      currentBuild: '-',
      userId: user.uid,
      createdAt: serverTimestamp(),
    })
    setFormName('')
    setFormUrl('')
    setFormVars([{ key: '', value: '' }])
    setShowForm(false)
  }

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, 'environments', id))
  }

  const handleCheckHealth = async (env: Environment) => {
    setCheckingHealth(env.id)
    try {
      const { data } = await api.post('/api/v1/environments/health', { url: env.baseUrl })
      await updateDoc(doc(db, 'environments', env.id), {
        healthStatus: data.healthy ? 'up' : 'down',
        lastChecked: new Date().toISOString(),
        currentBuild: data.build ?? env.currentBuild,
      })
    } catch {
      await updateDoc(doc(db, 'environments', env.id), {
        healthStatus: 'down',
        lastChecked: new Date().toISOString(),
      })
    } finally {
      setCheckingHealth(null)
    }
  }

  const addFormVar = () => setFormVars((prev) => [...prev, { key: '', value: '' }])
  const removeFormVar = (i: number) => setFormVars((prev) => prev.filter((_, idx) => idx !== i))
  const updateFormVar = (i: number, field: 'key' | 'value', val: string) => {
    setFormVars((prev) => prev.map((v, idx) => (idx === i ? { ...v, [field]: val } : v)))
  }

  // ── Compare helpers ──
  const envA = environments.find((e) => e.id === compareA)
  const envB = environments.find((e) => e.id === compareB)

  const allKeys = (() => {
    if (!envA || !envB) return []
    const keys = new Set([
      ...envA.variables.map((v) => v.key),
      ...envB.variables.map((v) => v.key),
    ])
    return Array.from(keys)
  })()

  // ── Render ──

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Server size={24} className="text-accent" />
            Environment Manager
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Register, monitor, and compare your test environments.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Quick Switch */}
          <div className="relative">
            <select
              value={activeEnvId}
              onChange={(e) => setActiveEnvId(e.target.value)}
              className="appearance-none rounded-lg border border-border bg-card px-3 py-2 pr-8 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">Select Environment</option>
              {environments.map((env) => (
                <option key={env.id} value={env.id}>{env.name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
          </div>
          <button
            onClick={() => setCompareMode(!compareMode)}
            className={cn(
              'flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
              compareMode ? 'border-accent bg-accent/10 text-accent-light' : 'border-border bg-card text-text-secondary hover:text-text-primary'
            )}
          >
            <ArrowLeftRight size={16} /> Compare
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 transition-colors"
          >
            <Plus size={16} /> Add Environment
          </button>
          <button onClick={() => setShowHelp(true)} className="flex items-center gap-2 rounded-full border border-border-subtle px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition">
            <Info className="h-4 w-4" /> How it works
          </button>
        </div>
      </div>

      {/* Register Form */}
      {showForm && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-4">Register Environment</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-text-secondary mb-1 block">Name</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Production, Staging, etc."
                className="w-full rounded-lg border border-border bg-body px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-1 block">Base URL</label>
              <input
                type="text"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="https://api.staging.example.com"
                className="w-full rounded-lg border border-border bg-body px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="text-xs text-text-secondary mb-2 block">Variables</label>
            <div className="space-y-2">
              {formVars.map((v, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={v.key}
                    onChange={(e) => updateFormVar(i, 'key', e.target.value)}
                    placeholder="KEY"
                    className="flex-1 rounded-lg border border-border bg-body px-3 py-2 text-sm text-text-primary font-mono placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                  <input
                    type="text"
                    value={v.value}
                    onChange={(e) => updateFormVar(i, 'value', e.target.value)}
                    placeholder="value"
                    className="flex-1 rounded-lg border border-border bg-body px-3 py-2 text-sm text-text-primary font-mono placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                  <button onClick={() => removeFormVar(i)} className="p-2 text-text-secondary hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={addFormVar} className="mt-2 text-xs text-accent-light hover:text-accent transition-colors flex items-center gap-1">
              <Plus size={12} /> Add Variable
            </button>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleRegister}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 transition-colors"
            >
              Register
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Compare Mode */}
      {compareMode && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-4">Compare Environments</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <select
              value={compareA}
              onChange={(e) => setCompareA(e.target.value)}
              className="rounded-lg border border-border bg-body px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">Select first</option>
              {environments.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <select
              value={compareB}
              onChange={(e) => setCompareB(e.target.value)}
              className="rounded-lg border border-border bg-body px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">Select second</option>
              {environments.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          {envA && envB && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-text-secondary">Key</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-text-secondary">{envA.name}</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-text-secondary">{envB.name}</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-text-secondary">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr className="hover:bg-body/50">
                    <td className="px-4 py-2 text-text-secondary font-mono">baseUrl</td>
                    <td className="px-4 py-2 text-text-primary font-mono">{envA.baseUrl}</td>
                    <td className="px-4 py-2 text-text-primary font-mono">{envB.baseUrl}</td>
                    <td className="px-4 py-2">
                      {envA.baseUrl === envB.baseUrl
                        ? <span className="text-green-400 text-xs">Match</span>
                        : <span className="text-yellow-400 text-xs">Differs</span>}
                    </td>
                  </tr>
                  {allKeys.map((key) => {
                    const valA = envA.variables.find((v) => v.key === key)?.value ?? '-'
                    const valB = envB.variables.find((v) => v.key === key)?.value ?? '-'
                    return (
                      <tr key={key} className="hover:bg-body/50">
                        <td className="px-4 py-2 text-text-secondary font-mono">{key}</td>
                        <td className="px-4 py-2 text-text-primary font-mono">{valA}</td>
                        <td className="px-4 py-2 text-text-primary font-mono">{valB}</td>
                        <td className="px-4 py-2">
                          {valA === valB
                            ? <span className="text-green-400 text-xs">Match</span>
                            : <span className="text-yellow-400 text-xs">Differs</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Environment Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {environments.map((env) => (
          <div
            key={env.id}
            className={cn(
              'rounded-xl border bg-card p-5 transition-colors',
              activeEnvId === env.id ? 'border-accent' : 'border-border'
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className={cn(
                  'h-2.5 w-2.5 rounded-full',
                  env.healthStatus === 'up' ? 'bg-green-500' : env.healthStatus === 'down' ? 'bg-red-500' : 'bg-text-secondary'
                )} />
                <h3 className="text-sm font-semibold text-text-primary">{env.name}</h3>
              </div>
              <button
                onClick={() => handleDelete(env.id)}
                className="p-1 text-text-secondary hover:text-red-400 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <p className="mt-2 text-xs text-text-secondary font-mono truncate">{env.baseUrl}</p>
            <div className="mt-3 flex items-center gap-4 text-xs text-text-secondary">
              <span>Build: <span className="text-text-primary">{env.currentBuild}</span></span>
              <span>Checked: <span className="text-text-primary">{env.lastChecked ? new Date(env.lastChecked).toLocaleString() : 'Never'}</span></span>
            </div>
            {env.variables.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {env.variables.slice(0, 4).map((v, i) => (
                  <span key={i} className="rounded bg-body px-2 py-0.5 text-[10px] font-mono text-text-secondary">
                    {v.key}
                  </span>
                ))}
                {env.variables.length > 4 && (
                  <span className="text-[10px] text-text-secondary">+{env.variables.length - 4} more</span>
                )}
              </div>
            )}
            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={() => handleCheckHealth(env)}
                disabled={checkingHealth === env.id}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:border-accent transition-colors disabled:opacity-50"
              >
                <RefreshCw size={12} className={checkingHealth === env.id ? 'animate-spin' : ''} />
                Check Health
              </button>
              <button
                onClick={() => setActiveEnvId(env.id)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                  activeEnvId === env.id
                    ? 'bg-accent/10 text-accent-light border border-accent'
                    : 'border border-border text-text-secondary hover:text-text-primary'
                )}
              >
                {activeEnvId === env.id ? 'Active' : 'Set Active'}
              </button>
            </div>
          </div>
        ))}
        {environments.length === 0 && (
          <div className="col-span-full py-16 text-center text-text-secondary">
            <Server size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No environments registered yet. Click "Add Environment" to get started.</p>
          </div>
        )}
      </div>
    </div>
    <HowItWorks steps={howItWorksSteps} isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  )
}
