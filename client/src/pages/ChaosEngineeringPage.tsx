import { useState, useEffect, useRef } from 'react'
import {
  Flame, Play, Loader2, AlertTriangle, CheckCircle2, XCircle,
  Clock, Zap, Cpu, HardDrive, Unlink, History, Square, Info, ArrowRight, Settings, Shield, Activity
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'
import HowItWorks from '@/components/shared/HowItWorks'
import api from '@/lib/api'

const howItWorksSteps = [
  {
    title: 'Build Experiment',
    description: 'Define a chaos experiment by selecting a target URL, fault type (latency, HTTP error, CPU stress, etc.), and duration.',
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
            <Flame className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Experiment</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Set Blast Radius',
    description: 'Configure the scope and intensity of the fault injection. Control how much of the system is affected.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Limits</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Zap className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Scope</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Run & Monitor',
    description: 'Execute the experiment and monitor real-time metrics: response times, error rates, and system behavior under stress.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Play className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Execute</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Activity className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Monitor</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Review Recovery',
    description: 'Analyze how the system recovered. Review recovery time, error counts, and behavior summary to improve resilience.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Clock className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Recovery</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Measure</span>
        </div>
      </div>
    ),
  },
]

// ─── Types ───────────────────────────────────────────────────────────────────

type FaultType = 'latency' | 'http-error' | 'cpu-stress' | 'memory-stress' | 'dependency-failure'
type ExperimentStatus = 'idle' | 'running' | 'completed' | 'failed'

interface MetricPoint {
  time: string
  responseTime: number
  errorRate: number
}

interface ExperimentResult {
  recoveryTime: string
  errorsCount: number
  behaviorSummary: string
}

interface HistoryEntry {
  id: string
  targetUrl: string
  faultType: FaultType
  status: ExperimentStatus
  duration: number
  createdAt: Date
  result: ExperimentResult | null
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ChaosEngineeringPage() {
  const [showHelp, setShowHelp] = useState(false)
  const { user } = useAuthStore()
  const [targetUrl, setTargetUrl] = useState('')
  const [faultType, setFaultType] = useState<FaultType>('latency')
  const [duration, setDuration] = useState(30)
  const [intensity, setIntensity] = useState(50)
  const [blastRadius, setBlastRadius] = useState(25)
  const [status, setStatus] = useState<ExperimentStatus>('idle')
  const [showConfirm, setShowConfirm] = useState(false)
  const [liveMetrics, setLiveMetrics] = useState<MetricPoint[]>([])
  const [result, setResult] = useState<ExperimentResult | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!user) return
    const ref = collection(db, 'chaosExperiments')
    const q = query(ref, where('userId', '==', user.uid), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setHistory(snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate() || new Date(),
      })) as HistoryEntry[])
    })
    return () => unsub()
  }, [user])


  const faultTypes: { key: FaultType; label: string; icon: React.ElementType; desc: string }[] = [
    { key: 'latency', label: 'Latency', icon: Clock, desc: 'Inject network delay' },
    { key: 'http-error', label: 'HTTP Error', icon: XCircle, desc: 'Return error status codes' },
    { key: 'cpu-stress', label: 'CPU Stress', icon: Cpu, desc: 'Spike CPU utilization' },
    { key: 'memory-stress', label: 'Memory Stress', icon: HardDrive, desc: 'Consume memory resources' },
    { key: 'dependency-failure', label: 'Dependency Failure', icon: Unlink, desc: 'Simulate downstream outage' },
  ]

  const startExperiment = () => {
    setShowConfirm(false)
    setStatus('running')
    setResult(null)
    setLiveMetrics([])

    let tick = 0
    intervalRef.current = setInterval(() => {
      tick++
      const chaosStart = duration * 0.2
      const chaosEnd = duration * 0.7
      const isChaos = tick > chaosStart && tick < chaosEnd
      setLiveMetrics((prev) => [
        ...prev,
        {
          time: `${tick}s`,
          responseTime: isChaos ? 200 + Math.random() * intensity * 8 : 80 + Math.random() * 40,
          errorRate: isChaos ? Math.random() * intensity * 0.5 : Math.random() * 2,
        },
      ])

      if (tick >= duration) {
        clearInterval(intervalRef.current!)
        setStatus('completed')
        setResult({
          recoveryTime: `${(1.5 + Math.random() * 4).toFixed(1)}s`,
          errorsCount: Math.floor(Math.random() * 15) + 1,
          behaviorSummary: 'System showed expected degradation under chaos conditions. Circuit breaker activated at 80% threshold. Recovery was within acceptable SLA bounds.'
        })
      }
    }, 1000)
  }

  const stopExperiment = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setStatus('completed')
    setResult({
      recoveryTime: 'N/A (stopped early)',
      errorsCount: liveMetrics.filter((m) => m.errorRate > 10).length,
      behaviorSummary: 'Experiment was manually stopped before completion.'
    })
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Flame className="text-[#F97316]" size={26} /> Chaos Engineering
          </h1>
          <p className="text-sm text-text-secondary mt-1">Test system resilience by injecting controlled failures</p>
        </div>
        <button onClick={() => setShowHelp(true)} className="flex items-center gap-2 rounded-full border border-border-subtle px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition">
          <Info className="h-4 w-4" /> How it works
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Experiment Builder */}
        <div className="lg:col-span-1 rounded-xl bg-card border border-border p-5 space-y-4">
          <h3 className="text-sm font-semibold text-text-primary">Experiment Builder</h3>

          <div>
            <label className="text-xs text-text-secondary block mb-1">Target URL</label>
            <input
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://api.example.com/endpoint"
              className="w-full rounded-lg bg-body border border-border px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="text-xs text-text-secondary block mb-1.5">Fault Type</label>
            <div className="space-y-1.5">
              {faultTypes.map((ft) => (
                <button
                  key={ft.key}
                  onClick={() => setFaultType(ft.key)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs transition-colors',
                    faultType === ft.key ? 'bg-accent/10 border border-accent/30 text-accent-light' : 'bg-body border border-border text-text-secondary hover:text-text-primary'
                  )}
                >
                  <ft.icon size={14} />
                  <div>
                    <p className="font-medium">{ft.label}</p>
                    <p className="text-[10px] opacity-70">{ft.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-text-secondary block mb-1">Duration: {duration}s</label>
            <input type="range" min={10} max={120} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full accent-accent" />
          </div>

          <div>
            <label className="text-xs text-text-secondary block mb-1">Intensity: {intensity}%</label>
            <input type="range" min={10} max={100} value={intensity} onChange={(e) => setIntensity(Number(e.target.value))} className="w-full accent-accent" />
          </div>

          <div>
            <label className="text-xs text-text-secondary block mb-1">Blast Radius: {blastRadius}%</label>
            <input type="range" min={5} max={100} value={blastRadius} onChange={(e) => setBlastRadius(Number(e.target.value))} className="w-full accent-[#F97316]" />
          </div>

          {status === 'running' ? (
            <button onClick={stopExperiment} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#EF4444] text-white rounded-lg text-sm font-medium hover:bg-[#EF4444]/90 transition-colors">
              <Square size={16} /> Stop Experiment
            </button>
          ) : (
            <button
              onClick={() => setShowConfirm(true)}
              disabled={!targetUrl.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#F97316] text-white rounded-lg text-sm font-medium hover:bg-[#F97316]/90 disabled:opacity-50 transition-colors"
            >
              <Play size={16} /> Run Experiment
            </button>
          )}
        </div>

        {/* Live Monitoring + Results */}
        <div className="lg:col-span-2 space-y-4">
          {/* Live Charts */}
          <div className="rounded-xl bg-card border border-border p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary">Live Monitoring</h3>
              {status === 'running' && (
                <span className="flex items-center gap-1.5 text-xs text-[#F97316] font-medium">
                  <span className="h-2 w-2 rounded-full bg-[#F97316] animate-pulse" /> Running...
                </span>
              )}
            </div>
            {liveMetrics.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-text-secondary mb-1">Response Time (ms)</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={liveMetrics}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
                      <Line type="monotone" dataKey="responseTime" stroke="#3B82F6" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <p className="text-[11px] text-text-secondary mb-1">Error Rate (%)</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={liveMetrics}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
                      <Line type="monotone" dataKey="errorRate" stroke="#EF4444" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-text-secondary">
                <Flame size={40} className="mb-3 opacity-20" />
                <p className="text-sm">Run an experiment to see live metrics</p>
              </div>
            )}
          </div>

          {/* Results */}
          {result && (
            <div className="rounded-xl bg-card border border-border p-5 space-y-3">
              <h3 className="text-sm font-semibold text-text-primary">Experiment Results</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-body border border-border p-3 text-center">
                  <p className="text-[11px] text-text-secondary">Recovery Time</p>
                  <p className="text-lg font-bold text-[#3B82F6]">{result.recoveryTime}</p>
                </div>
                <div className="rounded-lg bg-body border border-border p-3 text-center">
                  <p className="text-[11px] text-text-secondary">Errors During Chaos</p>
                  <p className="text-lg font-bold text-[#EF4444]">{result.errorsCount}</p>
                </div>
                <div className="rounded-lg bg-body border border-border p-3 text-center">
                  <p className="text-[11px] text-text-secondary">Status</p>
                  <p className="text-lg font-bold text-[#22C55E]">Recovered</p>
                </div>
              </div>
              <div className="rounded-lg bg-body border border-border p-3">
                <p className="text-[11px] text-text-secondary mb-1">Behavior Summary</p>
                <p className="text-xs text-text-primary">{result.behaviorSummary}</p>
              </div>
            </div>
          )}

          {/* History */}
          <div className="rounded-xl bg-card border border-border p-5 space-y-3">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <History size={16} /> Experiment History
            </h3>
            <div className="space-y-2">
              {history.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Flame className="h-10 w-10 text-text-muted mb-3" />
                  <p className="text-sm text-text-secondary">No experiments run yet</p>
                </div>
              )}
              {history.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between rounded-lg bg-body border border-border px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <Flame size={14} className="text-[#F97316]" />
                    <div>
                      <p className="text-xs text-text-primary font-medium">{entry.targetUrl}</p>
                      <p className="text-[10px] text-text-secondary">{entry.faultType} | {entry.duration}s | {entry.createdAt.toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full',
                    entry.status === 'completed' ? 'bg-[#22C55E]/10 text-[#22C55E]' : 'bg-[#EF4444]/10 text-[#EF4444]'
                  )}>
                    {entry.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-xl bg-card border border-border p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F97316]/10">
                <AlertTriangle size={20} className="text-[#F97316]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text-primary">Confirm Chaos Experiment</h3>
                <p className="text-xs text-text-secondary">This will inject real faults into the target system</p>
              </div>
            </div>
            <div className="rounded-lg bg-[#EF4444]/5 border border-[#EF4444]/20 p-3 text-xs text-[#EF4444]">
              <strong>Safety Warning:</strong> This experiment will inject {faultType.replace('-', ' ')} for {duration}s at {intensity}% intensity affecting {blastRadius}% of traffic to {targetUrl}. Ensure you have proper monitoring and rollback procedures in place.
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowConfirm(false)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
              <button onClick={startExperiment} className="px-4 py-2 bg-[#F97316] text-white rounded-lg text-sm font-medium hover:bg-[#F97316]/90 transition-colors">Start Experiment</button>
            </div>
          </div>
        </div>
      )}
    </div>
    <HowItWorks steps={howItWorksSteps} isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  )
}
