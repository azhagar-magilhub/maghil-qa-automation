import { useState, useEffect } from 'react'
import {
  ShieldCheck, Play, Loader2, CheckCircle2, XCircle, AlertTriangle,
  Settings2, TrendingUp, UserCheck, Clock, History, Info, ArrowRight, Settings, Zap, BarChart3, Rocket
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'
import HowItWorks from '@/components/shared/HowItWorks'
import api from '@/lib/api'

const howItWorksSteps = [
  {
    title: 'Set Criteria',
    description: 'Configure quality gate thresholds: minimum pass rate, maximum critical vulnerabilities, response time limits, and more.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Settings className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Configure</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Settings2 className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Criteria</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Evaluate Release',
    description: 'Click Evaluate to run all criteria against current test results. Each criterion is checked and scored.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Zap className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Evaluate</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Score</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Review Scorecard',
    description: 'View the release scorecard with pass/fail/warn status for each criterion. See the overall verdict and score.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Pass</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-red/10 flex items-center justify-center">
            <XCircle className="w-6 h-6 text-status-red" />
          </div>
          <span className="text-xs text-text-secondary">Fail</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Approve & Ship',
    description: 'If all criteria pass, approve the release. Track approval history and release trends over time.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <UserCheck className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Approve</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Rocket className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Ship</span>
        </div>
      </div>
    ),
  },
]

// ─── Types ───────────────────────────────────────────────────────────────────

type Verdict = 'pass' | 'fail' | 'pending'
type CriterionStatus = 'pass' | 'fail' | 'warn'

interface GateCriteria {
  id: string
  name: string
  threshold: number
  actual: number | null
  unit: string
  status: CriterionStatus | null
}

interface Approval {
  role: string
  name: string
  approved: boolean
  timestamp: Date | null
}

interface ReleaseHistory {
  id: string
  version: string
  verdict: Verdict
  score: number
  date: Date
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ReleaseGatePage() {
  const [showHelp, setShowHelp] = useState(false)
  const { user } = useAuthStore()
  const [evaluating, setEvaluating] = useState(false)
  const [evaluated, setEvaluated] = useState(false)
  const [verdict, setVerdict] = useState<Verdict>('pending')

  const [criteria, setCriteria] = useState<GateCriteria[]>([
    { id: '1', name: 'Test Pass Rate', threshold: 95, actual: null, unit: '%', status: null },
    { id: '2', name: 'Code Coverage', threshold: 80, actual: null, unit: '%', status: null },
    { id: '3', name: 'Critical Vulnerabilities', threshold: 0, actual: null, unit: '', status: null },
    { id: '4', name: 'P95 Latency', threshold: 500, actual: null, unit: 'ms', status: null },
  ])

  const [approvals, setApprovals] = useState<Approval[]>([
    { role: 'QA Lead', name: 'Pending', approved: false, timestamp: null },
    { role: 'Product Manager', name: 'Pending', approved: false, timestamp: null },
    { role: 'DevOps', name: 'Pending', approved: false, timestamp: null },
  ])

  const [history, setHistory] = useState<ReleaseHistory[]>([])
  const [trendData, setTrendData] = useState<{ version: string; score: number }[]>([])

  useEffect(() => {
    if (!user) return
    const ref = collection(db, 'releaseGates')
    const q = query(ref, where('userId', '==', user.uid), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        date: d.data().createdAt?.toDate() || new Date(),
      })) as ReleaseHistory[]
      setHistory(items)
      setTrendData(items.reverse().map((h) => ({ version: h.version, score: h.score })))
    })
    return () => unsub()
  }, [user])

  const handleEvaluate = async () => {
    setEvaluating(true)
    try {
      const res = await api.post('/api/v1/release-gate/evaluate')
      // handle real response
      if (res.data) {
        setCriteria(res.data.criteria)
        setVerdict(res.data.verdict)
      }
    } catch {
      // Reset criteria without fake data
      setCriteria((prev) => prev.map((c) => ({ ...c, actual: null, status: null })))
      setVerdict('pending')
    } finally {
      setEvaluating(false)
      setEvaluated(true)
    }
  }

  const handleApproval = (role: string) => {
    setApprovals((prev) => prev.map((a) =>
      a.role === role ? { ...a, approved: true, name: user?.displayName || user?.email || 'User', timestamp: new Date() } : a
    ))
  }

  const updateThreshold = (id: string, value: number) => {
    setCriteria((prev) => prev.map((c) =>
      c.id === id ? { ...c, threshold: value } : c
    ))
  }

  const score = evaluated
    ? Math.round(criteria.filter((c) => c.status === 'pass').length / criteria.length * 100)
    : 0

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <ShieldCheck className="text-[#22C55E]" size={26} /> Release Gate
          </h1>
          <p className="text-sm text-text-secondary mt-1">Evaluate release readiness with configurable quality gates</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleEvaluate}
            disabled={evaluating}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors"
          >
            {evaluating ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            Evaluate Release
          </button>
          <button onClick={() => setShowHelp(true)} className="flex items-center gap-2 rounded-full border border-border-subtle px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition">
            <Info className="h-4 w-4" /> How it works
          </button>
        </div>
      </div>

      {/* Configure Gate Criteria */}
      <div className="rounded-xl bg-card border border-border p-5 space-y-4">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Settings2 size={16} /> Gate Criteria Configuration
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {criteria.map((c) => (
            <div key={c.id} className="rounded-lg bg-body border border-border p-3 space-y-2">
              <label className="text-xs text-text-secondary block">{c.name}</label>
              <div className="flex items-center gap-2">
                {c.name === 'Critical Vulnerabilities' ? (
                  <span className="text-xs text-text-secondary">Max:</span>
                ) : c.name === 'P95 Latency' ? (
                  <span className="text-xs text-text-secondary">Max:</span>
                ) : (
                  <span className="text-xs text-text-secondary">Min:</span>
                )}
                <input
                  type="number"
                  value={c.threshold}
                  onChange={(e) => updateThreshold(c.id, Number(e.target.value))}
                  className="w-20 rounded bg-card border border-border px-2 py-1 text-sm text-text-primary outline-none focus:border-accent text-center"
                />
                <span className="text-xs text-text-secondary">{c.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Verdict */}
      {evaluated && (
        <>
          <div className={cn(
            'rounded-xl border-2 p-8 text-center',
            verdict === 'pass' ? 'bg-[#22C55E]/5 border-[#22C55E]/30' : 'bg-[#EF4444]/5 border-[#EF4444]/30'
          )}>
            {verdict === 'pass' ? (
              <CheckCircle2 size={64} className="text-[#22C55E] mx-auto mb-3" />
            ) : (
              <XCircle size={64} className="text-[#EF4444] mx-auto mb-3" />
            )}
            <h2 className={cn('text-3xl font-bold mb-1', verdict === 'pass' ? 'text-[#22C55E]' : 'text-[#EF4444]')}>
              {verdict === 'pass' ? 'RELEASE APPROVED' : 'RELEASE BLOCKED'}
            </h2>
            <p className="text-sm text-text-secondary">
              {verdict === 'pass'
                ? 'All quality gate criteria have been met. Proceed with release.'
                : 'One or more quality gate criteria have not been met. Address issues before releasing.'}
            </p>
          </div>

          {/* Scorecard */}
          <div className="rounded-xl bg-card border border-border p-5 space-y-4">
            <h3 className="text-sm font-semibold text-text-primary">Scorecard</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {criteria.map((c) => (
                <div key={c.id} className={cn(
                  'rounded-lg border p-4 text-center space-y-1',
                  c.status === 'pass' ? 'bg-[#22C55E]/5 border-[#22C55E]/30' :
                  c.status === 'warn' ? 'bg-[#EAB308]/5 border-[#EAB308]/30' :
                  'bg-[#EF4444]/5 border-[#EF4444]/30'
                )}>
                  {c.status === 'pass' && <CheckCircle2 size={24} className="text-[#22C55E] mx-auto" />}
                  {c.status === 'warn' && <AlertTriangle size={24} className="text-[#EAB308] mx-auto" />}
                  {c.status === 'fail' && <XCircle size={24} className="text-[#EF4444] mx-auto" />}
                  <p className="text-xs text-text-secondary">{c.name}</p>
                  <p className={cn('text-xl font-bold',
                    c.status === 'pass' ? 'text-[#22C55E]' : c.status === 'warn' ? 'text-[#EAB308]' : 'text-[#EF4444]'
                  )}>
                    {c.actual !== null ? c.actual : '---'}{c.unit}
                  </p>
                  <p className="text-[10px] text-text-secondary">
                    Threshold: {c.name.includes('Vulnerabilities') || c.name.includes('Latency') ? 'max' : 'min'} {c.threshold}{c.unit}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Approval Workflow */}
          <div className="rounded-xl bg-card border border-border p-5 space-y-4">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <UserCheck size={16} /> Approval Workflow
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {approvals.map((a) => (
                <div key={a.role} className={cn(
                  'rounded-lg border p-4 text-center space-y-2',
                  a.approved ? 'bg-[#22C55E]/5 border-[#22C55E]/30' : 'bg-body border-border'
                )}>
                  <p className="text-xs text-text-secondary">{a.role}</p>
                  {a.approved ? (
                    <>
                      <CheckCircle2 size={28} className="text-[#22C55E] mx-auto" />
                      <p className="text-xs text-text-primary font-medium">{a.name}</p>
                      <p className="text-[10px] text-text-secondary">{a.timestamp?.toLocaleString()}</p>
                    </>
                  ) : (
                    <>
                      <Clock size={28} className="text-text-secondary/30 mx-auto" />
                      <button
                        onClick={() => handleApproval(a.role)}
                        disabled={verdict !== 'pass'}
                        className="px-4 py-1.5 bg-[#22C55E] text-white rounded-md text-xs font-medium hover:bg-[#22C55E]/90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        Sign Off
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Release History + Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl bg-card border border-border p-5 space-y-3">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <History size={16} /> Release History
          </h3>
          <div className="space-y-2">
            {history.length === 0 && (
              <p className="text-sm text-text-muted text-center py-6">No release history yet</p>
            )}
            {history.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg bg-body border border-border px-3 py-2.5">
                <div className="flex items-center gap-3">
                  {r.verdict === 'pass' ? (
                    <CheckCircle2 size={16} className="text-[#22C55E]" />
                  ) : (
                    <XCircle size={16} className="text-[#EF4444]" />
                  )}
                  <div>
                    <p className="text-xs text-text-primary font-medium">{r.version}</p>
                    <p className="text-[10px] text-text-secondary">{r.date.toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn('text-xs font-bold',
                    r.score >= 90 ? 'text-[#22C55E]' : r.score >= 70 ? 'text-[#EAB308]' : 'text-[#EF4444]'
                  )}>{r.score}%</span>
                  <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase',
                    r.verdict === 'pass' ? 'bg-[#22C55E]/10 text-[#22C55E]' : 'bg-[#EF4444]/10 text-[#EF4444]'
                  )}>{r.verdict}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-card border border-border p-5 space-y-3">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <TrendingUp size={16} /> Release Score Trend
          </h3>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="version" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="score" stroke="#22C55E" strokeWidth={2} dot={{ r: 4, fill: '#22C55E' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-text-muted text-sm">No trend data yet</div>
          )}
        </div>
      </div>
    </div>
    <HowItWorks steps={howItWorksSteps} isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  )
}
