import { useState, useEffect } from 'react'
import {
  EyeOff, Plus, ArrowRight, Info, Trash2, ToggleLeft, ToggleRight,
  Send, CheckCircle2, Settings2, Loader2, X, Zap, Eye, Shield, FileText
} from 'lucide-react'
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'
import HowItWorks from '@/components/shared/HowItWorks'

// ─── How It Works ─────────────────────────────────────────────────────────────

const howItWorksSteps = [
  {
    title: 'Define Rules',
    description: 'Create masking rules using regex patterns or field names like email, phone, or SSN.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Plus className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Define</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Rules</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Set Mask Type',
    description: 'Choose how data is masked: full mask (***), partial mask (j***@email.com), hash, or redact.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Settings2 className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Mask Type</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <EyeOff className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Configure</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Preview Results',
    description: 'See a side-by-side comparison of original data versus masked output before applying rules.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Eye className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Preview</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Verify</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Apply to Data',
    description: 'Apply masking rules to test data generator output or enable PII detection for screenshots.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Zap className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Apply</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Protected</span>
        </div>
      </div>
    ),
  },
]

// ─── Types ────────────────────────────────────────────────────────────────────

type MaskType = 'full' | 'partial' | 'hash' | 'redact'

interface MaskingRule {
  id: string
  pattern: string
  maskType: MaskType
  enabled: boolean
  createdAt: Date
}

const maskTypeOptions: { id: MaskType; label: string; example: string }[] = [
  { id: 'full', label: 'Full Mask', example: '***' },
  { id: 'partial', label: 'Partial Mask', example: 'j***@email.com' },
  { id: 'hash', label: 'Hash', example: 'a1b2c3d4...' },
  { id: 'redact', label: 'Redact', example: '[REDACTED]' },
]

const presetPatterns = [
  { label: 'Email', pattern: 'email', sample: 'john.doe@company.com' },
  { label: 'Phone', pattern: 'phone', sample: '+1 (555) 123-4567' },
  { label: 'SSN', pattern: 'ssn', sample: '123-45-6789' },
  { label: 'Credit Card', pattern: 'credit_card', sample: '4111-1111-1111-1111' },
  { label: 'IP Address', pattern: 'ip_address', sample: '192.168.1.100' },
  { label: 'Custom Regex', pattern: '', sample: '' },
]

// ─── Masking Logic ────────────────────────────────────────────────────────────

function applyMask(value: string, maskType: MaskType): string {
  if (!value) return value
  switch (maskType) {
    case 'full':
      return '*'.repeat(value.length)
    case 'partial': {
      if (value.includes('@')) {
        const [local, domain] = value.split('@')
        return `${local[0]}${'*'.repeat(Math.max(local.length - 1, 3))}@${domain}`
      }
      if (value.length > 4) {
        return `${value.slice(0, 2)}${'*'.repeat(value.length - 4)}${value.slice(-2)}`
      }
      return '*'.repeat(value.length)
    }
    case 'hash': {
      let hash = 0
      for (let i = 0; i < value.length; i++) {
        const char = value.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash |= 0
      }
      return Math.abs(hash).toString(16).padStart(8, '0') + '...'
    }
    case 'redact':
      return '[REDACTED]'
    default:
      return value
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DataMaskingPage() {
  const [showHelp, setShowHelp] = useState(false)
  const { user } = useAuthStore()
  const [rules, setRules] = useState<MaskingRule[]>([])
  const [showBuilder, setShowBuilder] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [applying, setApplying] = useState<string | null>(null)

  // Builder state
  const [builderPattern, setBuilderPattern] = useState('')
  const [builderMaskType, setBuilderMaskType] = useState<MaskType>('full')
  const [builderSample, setBuilderSample] = useState('')
  const [creating, setCreating] = useState(false)

  // Load rules from Firestore
  useEffect(() => {
    if (!user) return
    const ref = collection(db, 'maskingRules')
    const q = query(ref, where('userId', '==', user.uid), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate() || new Date(),
      })) as MaskingRule[]
      setRules(items)
    })
    return () => unsub()
  }, [user])

  const handleCreate = async () => {
    if (!user || !builderPattern) return
    setCreating(true)
    try {
      await addDoc(collection(db, 'maskingRules'), {
        userId: user.uid,
        pattern: builderPattern,
        maskType: builderMaskType,
        enabled: true,
        createdAt: new Date(),
      })
      setShowBuilder(false)
      setBuilderPattern('')
      setBuilderSample('')
    } catch {
      // Create failed
    } finally {
      setCreating(false)
    }
  }

  const toggleRule = async (rule: MaskingRule) => {
    try {
      await updateDoc(doc(db, 'maskingRules', rule.id), { enabled: !rule.enabled })
    } catch {
      // Toggle failed
    }
  }

  const deleteRule = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'maskingRules', id))
    } catch {
      // Delete failed
    }
  }

  const testRule = (id: string) => {
    setTesting(id)
    setTimeout(() => setTesting(null), 1500)
  }

  const handleApply = (target: string) => {
    setApplying(target)
    setTimeout(() => setApplying(null), 2000)
  }

  const selectPreset = (preset: typeof presetPatterns[0]) => {
    setBuilderPattern(preset.pattern)
    setBuilderSample(preset.sample)
  }

  const getSampleForPattern = (pattern: string): string => {
    const preset = presetPatterns.find((p) => p.pattern === pattern)
    return preset?.sample || 'sample-data-value'
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
              <EyeOff className="text-accent" size={26} /> Data Masking
            </h1>
            <p className="text-sm text-text-secondary mt-1">Define and manage data masking rules to protect sensitive information</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHelp(true)}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-body transition-colors"
            >
              <Info size={16} /> How It Works
            </button>
            <button
              onClick={() => setShowBuilder(true)}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 transition-colors"
            >
              <Plus size={16} /> New Rule
            </button>
          </div>
        </div>

        {/* Apply Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => handleApply('test-data')}
            disabled={applying === 'test-data'}
            className="rounded-xl border border-border bg-card p-5 text-left hover:border-accent/30 transition-colors group"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                {applying === 'test-data' ? <Loader2 size={20} className="animate-spin text-accent" /> : <FileText size={20} className="text-accent" />}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent-light transition-colors">Apply to Test Data</h3>
                <p className="text-xs text-text-secondary">Mask sensitive fields in test data generator output</p>
              </div>
            </div>
            {applying === 'test-data' && (
              <div className="mt-2 text-xs text-status-green flex items-center gap-1">
                <CheckCircle2 size={12} /> Masking rules applied to test data
              </div>
            )}
          </button>
          <button
            onClick={() => handleApply('screenshots')}
            disabled={applying === 'screenshots'}
            className="rounded-xl border border-border bg-card p-5 text-left hover:border-accent/30 transition-colors group"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                {applying === 'screenshots' ? <Loader2 size={20} className="animate-spin text-accent" /> : <Eye size={20} className="text-accent" />}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent-light transition-colors">Apply to Screenshots</h3>
                <p className="text-xs text-text-secondary">PII detection for screenshot masking (coming soon)</p>
              </div>
            </div>
            {applying === 'screenshots' && (
              <div className="mt-2 text-xs text-status-green flex items-center gap-1">
                <CheckCircle2 size={12} /> Screenshot PII detection enabled
              </div>
            )}
          </button>
        </div>

        {/* Active Rules */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Shield size={16} className="text-accent" /> Active Masking Rules
            </h2>
            <span className="text-xs text-text-muted">{rules.length} rules</span>
          </div>

          {rules.length === 0 ? (
            <div className="p-12 text-center">
              <EyeOff size={40} className="mx-auto text-text-muted mb-4" />
              <h3 className="text-lg font-semibold text-text-primary mb-2">No masking rules</h3>
              <p className="text-sm text-text-secondary mb-4">Create your first masking rule to protect sensitive data</p>
              <button
                onClick={() => setShowBuilder(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 transition-colors"
              >
                <Plus size={16} /> Create Rule
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {rules.map((rule) => {
                const sample = getSampleForPattern(rule.pattern)
                const masked = applyMask(sample, rule.maskType)
                return (
                  <div key={rule.id} className="px-5 py-4 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <code className="text-xs font-mono bg-body border border-border rounded px-2 py-1 text-text-primary">
                          {rule.pattern}
                        </code>
                        <span className={cn(
                          'text-[10px] font-medium px-2 py-0.5 rounded-full',
                          rule.maskType === 'full' ? 'bg-status-red/10 text-status-red' :
                          rule.maskType === 'partial' ? 'bg-status-yellow/10 text-status-yellow' :
                          rule.maskType === 'hash' ? 'bg-accent/10 text-accent-light' :
                          'bg-body text-text-muted'
                        )}>
                          {maskTypeOptions.find((m) => m.id === rule.maskType)?.label}
                        </span>
                        <span className={cn(
                          'text-[10px] font-medium px-2 py-0.5 rounded-full',
                          rule.enabled ? 'bg-status-green/10 text-status-green' : 'bg-body text-text-muted'
                        )}>
                          {rule.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-text-muted">Original: <span className="text-text-secondary font-mono">{sample}</span></span>
                        <ArrowRight size={12} className="text-text-muted" />
                        <span className="text-text-muted">Masked: <span className="text-accent-light font-mono">{masked}</span></span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => toggleRule(rule)}
                        className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-body transition-colors"
                      >
                        {rule.enabled ? <ToggleRight size={20} className="text-status-green" /> : <ToggleLeft size={20} />}
                      </button>
                      <button
                        onClick={() => testRule(rule.id)}
                        disabled={testing === rule.id}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-body transition-colors disabled:opacity-50"
                      >
                        {testing === rule.id ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                        Test
                      </button>
                      <button
                        onClick={() => deleteRule(rule.id)}
                        className="p-1.5 rounded text-text-muted hover:text-status-red hover:bg-status-red/10 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Masking Preview */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Eye size={16} className="text-accent" /> Masking Preview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {presetPatterns.filter((p) => p.sample).map((preset) => (
              <div key={preset.label} className="rounded-lg border border-border bg-body p-4">
                <p className="text-xs font-medium text-text-secondary mb-2">{preset.label}</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-text-muted w-16">Original:</span>
                    <code className="font-mono text-text-primary">{preset.sample}</code>
                  </div>
                  {maskTypeOptions.map((mt) => (
                    <div key={mt.id} className="flex items-center gap-2 text-xs">
                      <span className="text-text-muted w-16">{mt.label}:</span>
                      <code className="font-mono text-accent-light">{applyMask(preset.sample, mt.id)}</code>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create Rule Modal */}
      {showBuilder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowBuilder(false)} />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-sidebar shadow-2xl shadow-black/40 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-text-primary">New Masking Rule</h2>
              <button onClick={() => setShowBuilder(false)} className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-card transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Preset Patterns */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-2">Quick Patterns</label>
                <div className="flex flex-wrap gap-2">
                  {presetPatterns.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => selectPreset(preset)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
                        builderPattern === preset.pattern
                          ? 'bg-accent/10 text-accent-light border-accent/30'
                          : 'text-text-secondary hover:bg-body border-border'
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pattern Input */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Field Pattern (regex or name)</label>
                <input
                  type="text"
                  value={builderPattern}
                  onChange={(e) => setBuilderPattern(e.target.value)}
                  placeholder="email, phone, ssn, or custom regex"
                  className="w-full rounded-lg border border-border bg-body px-3 py-2 text-sm text-text-primary font-mono focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>

              {/* Mask Type */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-2">Mask Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {maskTypeOptions.map((mt) => (
                    <button
                      key={mt.id}
                      onClick={() => setBuilderMaskType(mt.id)}
                      className={cn(
                        'flex flex-col items-start rounded-lg px-3 py-2.5 text-sm transition-colors border',
                        builderMaskType === mt.id
                          ? 'bg-accent/10 text-accent-light border-accent/30'
                          : 'text-text-secondary hover:bg-body border-border'
                      )}
                    >
                      <span className="font-medium">{mt.label}</span>
                      <span className="text-xs font-mono opacity-60">{mt.example}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              {builderSample && (
                <div className="rounded-lg bg-body border border-border p-4">
                  <p className="text-xs font-medium text-text-secondary mb-2">Preview</p>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-mono text-text-primary">{builderSample}</span>
                    <ArrowRight size={14} className="text-text-muted" />
                    <span className="font-mono text-accent-light">{applyMask(builderSample, builderMaskType)}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
              <button
                onClick={() => setShowBuilder(false)}
                className="px-4 py-2 rounded-lg border border-border text-sm text-text-secondary hover:text-text-primary hover:bg-body transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !builderPattern}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-sm font-semibold text-white hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Create Rule
              </button>
            </div>
          </div>
        </div>
      )}

      <HowItWorks steps={howItWorksSteps} isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  )
}
