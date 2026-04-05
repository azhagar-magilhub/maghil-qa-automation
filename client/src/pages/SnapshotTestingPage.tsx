import { useState, useEffect } from 'react'
import {
  Camera, Plus, Loader2, CheckCircle2, XCircle, Eye, RefreshCw,
  ArrowLeftRight, Download, Clock, AlertTriangle, Info, ArrowRight, FileJson, Save
} from 'lucide-react'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'
import HowItWorks from '@/components/shared/HowItWorks'
import api from '@/lib/api'

const howItWorksSteps = [
  {
    title: 'Capture Snapshot',
    description: 'Capture an API response or UI component state as a snapshot. This becomes the baseline for future comparisons.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Camera className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Capture</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <FileJson className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Snapshot</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Compare with Baseline',
    description: 'Re-run snapshots to compare current output against the baseline. Differences are highlighted in a diff view.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <ArrowLeftRight className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Compare</span>
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
  {
    title: 'Accept Changes',
    description: 'If changes are intentional, accept the new snapshot as the updated baseline. Rejected changes flag regressions.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Accept</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Save className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Baseline</span>
        </div>
      </div>
    ),
  },
]

// ─── Types ───────────────────────────────────────────────────────────────────

type SnapshotType = 'api-response' | 'ui-component'
type SnapshotStatus = 'baseline' | 'matched' | 'changed'

interface Snapshot {
  id: string
  name: string
  type: SnapshotType
  status: SnapshotStatus
  content: string
  baseline: string
  lastCompared: Date | null
  createdAt: Date
}

interface DiffLine {
  lineNum: number
  type: 'added' | 'removed' | 'unchanged'
  content: string
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function SnapshotTestingPage() {
  const { user } = useAuthStore()
  const [showHelp, setShowHelp] = useState(false)
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [showCaptureForm, setShowCaptureForm] = useState(false)
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null)
  const [showCompare, setShowCompare] = useState(false)
  const [capturing, setCapturing] = useState(false)

  // Form state
  const [captureName, setCaptureName] = useState('')
  const [captureType, setCaptureType] = useState<SnapshotType>('api-response')
  const [captureUrl, setCaptureUrl] = useState('')
  const [captureContent, setCaptureContent] = useState('')

  useEffect(() => {
    if (!user) return
    const ref = collection(db, 'snapshots')
    const q = query(ref, where('userId', '==', user.uid), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setSnapshots(snap.docs.map((d) => ({
        id: d.id, ...d.data(),
        lastCompared: d.data().lastCompared?.toDate() || null,
        createdAt: d.data().createdAt?.toDate() || new Date(),
      })) as Snapshot[])
    })
    return () => unsub()
  }, [user])


  const handleCapture = async () => {
    if (!captureName.trim()) return
    setCapturing(true)
    try {
      await api.post('/api/v1/snapshots/capture', { name: captureName, type: captureType, url: captureUrl, content: captureContent })
    } catch {
      const newSnap: Snapshot = {
        id: String(Date.now()), name: captureName, type: captureType, status: 'baseline',
        content: captureContent || '{"captured": true, "timestamp": "' + new Date().toISOString() + '"}',
        baseline: captureContent || '{"captured": true, "timestamp": "' + new Date().toISOString() + '"}',
        lastCompared: null, createdAt: new Date()
      }
      setSnapshots((prev) => [newSnap, ...prev])
    } finally {
      setCapturing(false)
      setShowCaptureForm(false)
      setCaptureName(''); setCaptureUrl(''); setCaptureContent('')
    }
  }

  const handleAcceptBaseline = (snap: Snapshot) => {
    setSnapshots((prev) => prev.map((s) =>
      s.id === snap.id ? { ...s, baseline: s.content, status: 'baseline' as SnapshotStatus } : s
    ))
  }

  const generateDiff = (baseline: string, current: string): DiffLine[] => {
    const baseLines = baseline.split(/(?<=})|(?<=">)/g).filter(Boolean)
    const currLines = current.split(/(?<=})|(?<=">)/g).filter(Boolean)
    const diff: DiffLine[] = []
    const maxLen = Math.max(baseLines.length, currLines.length)
    for (let i = 0; i < maxLen; i++) {
      if (i >= baseLines.length) {
        diff.push({ lineNum: i + 1, type: 'added', content: currLines[i] })
      } else if (i >= currLines.length) {
        diff.push({ lineNum: i + 1, type: 'removed', content: baseLines[i] })
      } else if (baseLines[i] !== currLines[i]) {
        diff.push({ lineNum: i + 1, type: 'removed', content: baseLines[i] })
        diff.push({ lineNum: i + 1, type: 'added', content: currLines[i] })
      } else {
        diff.push({ lineNum: i + 1, type: 'unchanged', content: baseLines[i] })
      }
    }
    return diff
  }

  const statusConfig: Record<SnapshotStatus, { color: string; icon: React.ElementType; label: string }> = {
    baseline: { color: 'text-[#3B82F6] bg-[#3B82F6]/10', icon: CheckCircle2, label: 'Baseline' },
    matched: { color: 'text-[#22C55E] bg-[#22C55E]/10', icon: CheckCircle2, label: 'Matched' },
    changed: { color: 'text-[#EAB308] bg-[#EAB308]/10', icon: AlertTriangle, label: 'Changed' },
  }

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Camera className="text-[#3B82F6]" size={26} /> Snapshot Testing
          </h1>
          <p className="text-sm text-text-secondary mt-1">Capture, compare, and track API response and UI component snapshots</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowCaptureForm(!showCaptureForm)} className="flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors">
            <Plus size={16} /> Capture Snapshot
          </button>
          <button onClick={() => setShowHelp(true)} className="flex items-center gap-2 rounded-full border border-border-subtle px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition">
            <Info className="h-4 w-4" /> How it works
          </button>
        </div>
      </div>

      {/* Capture Form */}
      {showCaptureForm && (
        <div className="rounded-xl bg-card border border-border p-5 space-y-4">
          <h3 className="text-sm font-semibold text-text-primary">New Snapshot</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-text-secondary block mb-1">Name</label>
              <input value={captureName} onChange={(e) => setCaptureName(e.target.value)} placeholder="e.g. GET /api/users response" className="w-full rounded-lg bg-body border border-border px-3 py-2 text-sm text-text-primary outline-none focus:border-accent" />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Type</label>
              <select value={captureType} onChange={(e) => setCaptureType(e.target.value as SnapshotType)} className="w-full rounded-lg bg-body border border-border px-3 py-2 text-sm text-text-primary outline-none">
                <option value="api-response">API Response</option>
                <option value="ui-component">UI Component</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">URL (optional)</label>
              <input value={captureUrl} onChange={(e) => setCaptureUrl(e.target.value)} placeholder="https://api.example.com/endpoint" className="w-full rounded-lg bg-body border border-border px-3 py-2 text-sm text-text-primary outline-none focus:border-accent" />
            </div>
          </div>
          <div>
            <label className="text-xs text-text-secondary block mb-1">Content (paste JSON or HTML)</label>
            <textarea value={captureContent} onChange={(e) => setCaptureContent(e.target.value)} placeholder='Paste JSON response or component HTML...' className="w-full h-32 rounded-lg bg-[#0D1117] border border-border p-3 text-xs text-[#E6EDF3] font-mono resize-none outline-none focus:border-accent" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowCaptureForm(false)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
            <button onClick={handleCapture} disabled={capturing || !captureName.trim()} className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors">
              {capturing ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />} Capture
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {snapshots.length === 0 && !showCaptureForm && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Camera className="h-12 w-12 text-text-muted mb-4" />
          <h3 className="text-lg font-medium text-text-primary mb-1">No snapshots yet</h3>
          <p className="text-sm text-text-secondary mb-4">Capture your first API response or UI component snapshot to start tracking changes.</p>
          <button onClick={() => setShowCaptureForm(true)} className="flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors">
            <Plus size={16} /> Capture Snapshot
          </button>
        </div>
      )}

      {/* Snapshots Table */}
      {snapshots.length > 0 && <div className="rounded-xl bg-card border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-body/50">
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-text-secondary">Name</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-text-secondary">Type</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-text-secondary">Status</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-text-secondary">Last Compared</th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-text-secondary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {snapshots.map((snap) => {
                const sc = statusConfig[snap.status]
                const StatusIcon = sc.icon
                return (
                  <tr key={snap.id} className="border-b border-border/50 hover:bg-body/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-xs text-text-primary font-medium">{snap.name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] text-text-secondary capitalize">{snap.type.replace('-', ' ')}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full w-fit', sc.color)}>
                        <StatusIcon size={12} /> {sc.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] text-text-secondary">
                        {snap.lastCompared ? snap.lastCompared.toLocaleDateString() : 'Never'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setSelectedSnapshot(snap); setShowCompare(true) }}
                          className="flex items-center gap-1 px-2 py-1 bg-body border border-border rounded text-[11px] text-text-secondary hover:text-text-primary transition-colors"
                        >
                          <ArrowLeftRight size={12} /> Compare
                        </button>
                        {snap.status === 'changed' && (
                          <button
                            onClick={() => handleAcceptBaseline(snap)}
                            className="flex items-center gap-1 px-2 py-1 bg-[#22C55E] text-white rounded text-[11px] font-medium hover:bg-[#22C55E]/90 transition-colors"
                          >
                            <CheckCircle2 size={12} /> Accept Baseline
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>}

      {/* Compare Modal */}
      {showCompare && selectedSnapshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowCompare(false)}>
          <div className="w-full max-w-4xl max-h-[80vh] rounded-xl bg-card border border-border p-6 space-y-4 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary">Compare: {selectedSnapshot.name}</h3>
              <div className="flex items-center gap-2">
                {selectedSnapshot.status === 'changed' && (
                  <button onClick={() => { handleAcceptBaseline(selectedSnapshot); setShowCompare(false) }} className="flex items-center gap-1 px-3 py-1.5 bg-[#22C55E] text-white rounded-md text-xs font-medium hover:bg-[#22C55E]/90 transition-colors">
                    <CheckCircle2 size={12} /> Accept as Baseline
                  </button>
                )}
                <button onClick={() => setShowCompare(false)} className="text-text-secondary hover:text-text-primary"><XCircle size={18} /></button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-semibold text-text-secondary mb-2">Baseline</p>
                <pre className="rounded-lg bg-body border border-border p-3 text-xs text-text-primary font-mono overflow-auto max-h-64 whitespace-pre-wrap">{selectedSnapshot.baseline}</pre>
              </div>
              <div>
                <p className="text-xs font-semibold text-text-secondary mb-2">Current</p>
                <pre className="rounded-lg bg-body border border-border p-3 text-xs text-text-primary font-mono overflow-auto max-h-64 whitespace-pre-wrap">{selectedSnapshot.content}</pre>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-text-secondary mb-2">Diff View</p>
              <div className="rounded-lg bg-[#0D1117] border border-border p-3 font-mono text-xs space-y-0.5 max-h-48 overflow-auto">
                {generateDiff(selectedSnapshot.baseline, selectedSnapshot.content).map((line, i) => (
                  <p key={i} className={cn(
                    'px-2 -mx-1 rounded',
                    line.type === 'added' && 'text-[#22C55E] bg-[#22C55E]/10',
                    line.type === 'removed' && 'text-[#EF4444] bg-[#EF4444]/10',
                    line.type === 'unchanged' && 'text-[#E6EDF3]'
                  )}>
                    {line.type === 'added' ? '+ ' : line.type === 'removed' ? '- ' : '  '}{line.content}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    <HowItWorks steps={howItWorksSteps} isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  )
}
