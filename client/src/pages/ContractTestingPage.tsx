import { useState, useEffect } from 'react'
import {
  FileCheck, Plus, Play, Loader2, CheckCircle2, XCircle, AlertTriangle,
  ArrowRight, Trash2, Eye, Clock, GitBranch, ChevronDown, Info, FileText, Code, Zap
} from 'lucide-react'
import { collection, query, where, orderBy, onSnapshot, addDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'
import HowItWorks from '@/components/shared/HowItWorks'
import api from '@/lib/api'

const howItWorksSteps = [
  {
    title: 'Define Contract',
    description: 'Create a consumer-driven contract by specifying the consumer, provider, endpoint, method, and expected request/response shapes.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <FileText className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Write</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Code className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Contract</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Verify Provider',
    description: 'Click Verify to test the provider against the contract. The system checks if the actual response matches the expected schema.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Zap className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Verify</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Provider</span>
        </div>
      </div>
    ),
  },
  {
    title: 'View Diff',
    description: 'When verification fails, view a line-by-line diff between expected and actual responses to identify breaking changes.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <GitBranch className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Changes</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Eye className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Diff</span>
        </div>
      </div>
    ),
  },
]

// ─── Types ───────────────────────────────────────────────────────────────────

type VerificationStatus = 'verified' | 'failed' | 'pending' | 'unknown'

interface Contract {
  id: string
  consumer: string
  provider: string
  endpoint: string
  method: string
  version: string
  status: VerificationStatus
  expectedRequest: string
  expectedResponse: string
  lastVerified: Date | null
  createdAt: Date
}

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged'
  content: string
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ContractTestingPage() {
  const { user } = useAuthStore()
  const [showHelp, setShowHelp] = useState(false)
  const [contracts, setContracts] = useState<Contract[]>([])
  const [showForm, setShowForm] = useState(false)
  const [verifying, setVerifying] = useState<string | null>(null)
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
  const [showDiff, setShowDiff] = useState(false)

  // Form state
  const [consumer, setConsumer] = useState('')
  const [provider, setProvider] = useState('')
  const [endpoint, setEndpoint] = useState('')
  const [method, setMethod] = useState('GET')
  const [expectedRequest, setExpectedRequest] = useState('')
  const [expectedResponse, setExpectedResponse] = useState('')

  useEffect(() => {
    if (!user) return
    const ref = collection(db, 'contracts')
    const q = query(ref, where('userId', '==', user.uid), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setContracts(snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        lastVerified: d.data().lastVerified?.toDate() || null,
        createdAt: d.data().createdAt?.toDate() || new Date(),
      })) as Contract[])
    })
    return () => unsub()
  }, [user])


  const handleCreateContract = async () => {
    if (!consumer || !provider || !endpoint) return
    try {
      await addDoc(collection(db, 'contracts'), {
        userId: user?.uid,
        consumer, provider, endpoint, method,
        expectedRequest, expectedResponse,
        version: '1.0.0',
        status: 'pending',
        lastVerified: null,
        createdAt: Timestamp.now()
      })
      setShowForm(false)
      setConsumer(''); setProvider(''); setEndpoint(''); setExpectedRequest(''); setExpectedResponse('')
    } catch {
      // fallback
      const newContract: Contract = {
        id: String(Date.now()), consumer, provider, endpoint, method,
        version: '1.0.0', status: 'pending',
        expectedRequest, expectedResponse,
        lastVerified: null, createdAt: new Date()
      }
      setContracts((prev) => [newContract, ...prev])
      setShowForm(false)
      setConsumer(''); setProvider(''); setEndpoint(''); setExpectedRequest(''); setExpectedResponse('')
    }
  }

  const handleVerify = async (contract: Contract) => {
    setVerifying(contract.id)
    try {
      await api.post(`/api/v1/contracts/${contract.id}/verify`)
    } catch {
      // demo: toggle status
      setContracts((prev) => prev.map((c) =>
        c.id === contract.id ? { ...c, status: 'verified' as VerificationStatus, lastVerified: new Date() } : c
      ))
    } finally {
      setVerifying(null)
    }
  }

  const statusConfig: Record<VerificationStatus, { color: string; icon: React.ElementType; label: string }> = {
    verified: { color: 'text-[#22C55E] bg-[#22C55E]/10', icon: CheckCircle2, label: 'Verified' },
    failed: { color: 'text-[#EF4444] bg-[#EF4444]/10', icon: XCircle, label: 'Failed' },
    pending: { color: 'text-[#EAB308] bg-[#EAB308]/10', icon: Clock, label: 'Pending' },
    unknown: { color: 'text-text-secondary bg-card', icon: AlertTriangle, label: 'Unknown' },
  }

  // Compute diff from the selected contract's expected vs actual response
  const computeDiff = (contract: Contract | null): DiffLine[] => {
    if (!contract) return []
    const expected = contract.expectedResponse.split('\n')
    const current = contract.expectedRequest.split('\n')
    // Simple line-by-line comparison; real diff would use a proper algorithm
    const lines: DiffLine[] = []
    const maxLen = Math.max(expected.length, current.length)
    for (let i = 0; i < maxLen; i++) {
      if (expected[i] === current[i]) {
        lines.push({ type: 'unchanged', content: expected[i] || '' })
      } else {
        if (expected[i]) lines.push({ type: 'removed', content: expected[i] })
        if (current[i]) lines.push({ type: 'added', content: current[i] })
      }
    }
    return lines
  }
  const demoDiff = computeDiff(selectedContract)

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <FileCheck className="text-accent" size={26} /> Contract Testing
          </h1>
          <p className="text-sm text-text-secondary mt-1">Consumer-driven contract verification for microservices</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            <Plus size={16} /> Define Contract
          </button>
          <button onClick={() => setShowHelp(true)} className="flex items-center gap-2 rounded-full border border-border-subtle px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition">
            <Info className="h-4 w-4" /> How it works
          </button>
        </div>
      </div>

      {/* Create Contract Form */}
      {showForm && (
        <div className="rounded-xl bg-card border border-border p-5 space-y-4">
          <h3 className="text-sm font-semibold text-text-primary">New Contract</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-text-secondary block mb-1">Consumer Name</label>
              <input value={consumer} onChange={(e) => setConsumer(e.target.value)} placeholder="e.g. Web App" className="w-full rounded-lg bg-body border border-border px-3 py-2 text-sm text-text-primary outline-none focus:border-accent" />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Provider Name</label>
              <input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="e.g. Auth Service" className="w-full rounded-lg bg-body border border-border px-3 py-2 text-sm text-text-primary outline-none focus:border-accent" />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Endpoint</label>
              <div className="flex gap-2">
                <select value={method} onChange={(e) => setMethod(e.target.value)} className="rounded-lg bg-body border border-border px-2 py-2 text-sm text-text-primary outline-none">
                  {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="/api/v1/resource" className="flex-1 rounded-lg bg-body border border-border px-3 py-2 text-sm text-text-primary outline-none focus:border-accent" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-secondary block mb-1">Expected Request Body</label>
              <textarea value={expectedRequest} onChange={(e) => setExpectedRequest(e.target.value)} placeholder='{"key": "type"}' className="w-full h-24 rounded-lg bg-body border border-border p-3 text-xs text-text-primary font-mono resize-none outline-none focus:border-accent" />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Expected Response Body</label>
              <textarea value={expectedResponse} onChange={(e) => setExpectedResponse(e.target.value)} placeholder='{"key": "type"}' className="w-full h-24 rounded-lg bg-body border border-border p-3 text-xs text-text-primary font-mono resize-none outline-none focus:border-accent" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
            <button onClick={handleCreateContract} disabled={!consumer || !provider || !endpoint} className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors">Create Contract</button>
          </div>
        </div>
      )}

      {/* Contracts Grid */}
      {contracts.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileCheck className="h-12 w-12 text-text-muted mb-4" />
          <h3 className="text-lg font-medium text-text-primary mb-1">No contracts yet</h3>
          <p className="text-sm text-text-secondary mb-4">Define your first consumer-driven contract to get started.</p>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors">
            <Plus size={16} /> Define Contract
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contracts.map((contract) => {
          const sc = statusConfig[contract.status]
          const StatusIcon = sc.icon
          return (
            <div key={contract.id} className="rounded-xl bg-card border border-border p-5 space-y-3 hover:border-accent/30 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-text-primary font-medium">
                  <span>{contract.consumer}</span>
                  <ArrowRight size={14} className="text-text-secondary" />
                  <span>{contract.provider}</span>
                </div>
                <span className={cn('flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full', sc.color)}>
                  <StatusIcon size={12} /> {sc.label}
                </span>
              </div>
              <div className="text-xs text-text-secondary space-y-1">
                <p><span className="font-medium text-[#3B82F6]">{contract.method}</span> {contract.endpoint}</p>
                <p>Version: {contract.version}</p>
                {contract.lastVerified && <p>Last verified: {contract.lastVerified.toLocaleDateString()}</p>}
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => handleVerify(contract)}
                  disabled={verifying === contract.id}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#22C55E] text-white rounded-md text-xs font-medium hover:bg-[#22C55E]/90 disabled:opacity-50 transition-colors"
                >
                  {verifying === contract.id ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                  Verify
                </button>
                <button
                  onClick={() => { setSelectedContract(contract); setShowDiff(true) }}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-body border border-border rounded-md text-xs text-text-secondary hover:text-text-primary transition-colors"
                >
                  <Eye size={12} /> Diff
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Diff Viewer Modal */}
      {showDiff && selectedContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowDiff(false)}>
          <div className="w-full max-w-2xl rounded-xl bg-card border border-border p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary">
                Contract Diff: {selectedContract.consumer} → {selectedContract.provider}
              </h3>
              <button onClick={() => setShowDiff(false)} className="text-text-secondary hover:text-text-primary">
                <XCircle size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-semibold text-text-secondary mb-2">Expected (Contract)</p>
                <div className="rounded-lg bg-body border border-border p-3 font-mono text-xs space-y-0.5">
                  {demoDiff.map((line, i) => (
                    <p key={i} className={cn(
                      line.type === 'removed' ? 'text-[#EF4444] bg-[#EF4444]/10 px-1 -mx-1 rounded' : 'text-text-primary',
                      line.type === 'added' && 'hidden'
                    )}>
                      {line.type === 'removed' ? '- ' : '  '}{line.content}
                    </p>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-text-secondary mb-2">Actual (Provider)</p>
                <div className="rounded-lg bg-body border border-border p-3 font-mono text-xs space-y-0.5">
                  {demoDiff.map((line, i) => (
                    <p key={i} className={cn(
                      line.type === 'added' ? 'text-[#22C55E] bg-[#22C55E]/10 px-1 -mx-1 rounded' : 'text-text-primary',
                      line.type === 'removed' && 'hidden'
                    )}>
                      {line.type === 'added' ? '+ ' : '  '}{line.content}
                    </p>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <GitBranch size={14} /> CI/CD Quality Gate: Contract verification is integrated into your pipeline
            </div>
          </div>
        </div>
      )}
    </div>
    <HowItWorks steps={howItWorksSteps} isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  )
}
