import React, { useState, useEffect, useRef } from 'react'
import {
  BarChart2, Upload, FileJson, FolderTree, AlertTriangle,
  CheckCircle2, ChevronRight, ChevronDown, Link2, File, Info, ArrowRight, Eye, List, Link, CheckSquare
} from 'lucide-react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'
import HowItWorks from '@/components/shared/HowItWorks'

const howItWorksSteps = [
  {
    title: 'Import Report',
    description: 'Upload a code coverage report (JSON or XML format) from tools like Istanbul, Jacoco, or lcov.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Upload className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Upload</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <FileJson className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Report</span>
        </div>
      </div>
    ),
  },
  {
    title: 'View Coverage',
    description: 'Explore coverage metrics across statements, branches, functions, and lines. Drill into individual files.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <BarChart2 className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Metrics</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Eye className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Coverage</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Find Gaps',
    description: 'Identify uncovered code paths: functions, branches, and statements that lack test coverage.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-yellow/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-status-yellow" />
          </div>
          <span className="text-xs text-text-secondary">Gaps</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <List className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Uncovered</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Link Tests',
    description: 'Map uncovered paths to existing test cases or create new ones to close coverage gaps.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Link className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Link</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <CheckSquare className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Tests</span>
        </div>
      </div>
    ),
  },
]

// ─── Types ───────────────────────────────────────────────────────────────────

interface CoverageSummary {
  statements: { covered: number; total: number; pct: number }
  branches: { covered: number; total: number; pct: number }
  functions: { covered: number; total: number; pct: number }
  lines: { covered: number; total: number; pct: number }
}

interface FileCoverage {
  path: string
  statements: number
  branches: number
  functions: number
  lines: number
}

interface UncoveredPath {
  file: string
  line: number
  type: string
  description: string
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function CoverageMapperPage() {
  const { user } = useAuthStore()
  const [showHelp, setShowHelp] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imported, setImported] = useState(false)

  const [summary, setSummary] = useState<CoverageSummary | null>(null)
  const [files, setFiles] = useState<FileCoverage[]>([])
  const [uncoveredPaths, setUncoveredPaths] = useState<UncoveredPath[]>([])
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!user) return
    const ref = collection(db, 'coverageReports')
    const q = query(ref, where('userId', '==', user.uid))
    const unsub = onSnapshot(q, () => {})
    return () => unsub()
  }, [user])

  const handleImport = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = () => {
    setImported(true)
  }

  const toggleFolder = (folder: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(folder)) next.delete(folder)
      else next.add(folder)
      return next
    })
  }

  const getCoverageColor = (pct: number) => {
    if (pct >= 80) return 'text-[#22C55E]'
    if (pct >= 50) return 'text-[#EAB308]'
    return 'text-[#EF4444]'
  }

  const getCoverageBg = (pct: number) => {
    if (pct >= 80) return 'bg-[#22C55E]'
    if (pct >= 50) return 'bg-[#EAB308]'
    return 'bg-[#EF4444]'
  }

  // Build tree from file paths
  const buildTree = () => {
    const tree: Record<string, FileCoverage[]> = {}
    files.forEach((f) => {
      const parts = f.path.split('/')
      const folder = parts.slice(0, -1).join('/')
      if (!tree[folder]) tree[folder] = []
      tree[folder].push(f)
    })
    return tree
  }

  const tree = buildTree()
  const folders = Object.keys(tree).sort()

  const summaryMetrics = summary ? [
    { label: 'Statements', ...summary.statements },
    { label: 'Branches', ...summary.branches },
    { label: 'Functions', ...summary.functions },
    { label: 'Lines', ...summary.lines },
  ] : []

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <BarChart2 className="text-[#3B82F6]" size={26} /> Coverage Mapper
          </h1>
          <p className="text-sm text-text-secondary mt-1">Visualize code coverage and map uncovered paths to test cases</p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".json,.xml" className="hidden" onChange={handleFileChange} />
          <button onClick={handleImport} className="flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors">
            <Upload size={16} /> Import Coverage Report
          </button>
          <button onClick={() => setShowHelp(true)} className="flex items-center gap-2 rounded-full border border-border-subtle px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition">
            <Info className="h-4 w-4" /> How it works
          </button>
        </div>
      </div>

      {!imported || files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BarChart2 className="h-12 w-12 text-text-muted mb-4" />
          <h3 className="text-lg font-medium text-text-primary mb-1">No coverage data yet</h3>
          <p className="text-sm text-text-secondary mb-4 max-w-md">Upload an Istanbul JSON or JaCoCo XML coverage report to visualize coverage across your codebase.</p>
          <button onClick={handleImport} className="flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors">
            <Upload size={16} /> Import Coverage Report
          </button>
        </div>
      ) : (
        <>
          {/* Coverage Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {summaryMetrics.map((m) => (
              <div key={m.label} className="rounded-xl bg-card border border-border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-text-secondary">{m.label}</p>
                  <span className={cn('text-sm font-bold', getCoverageColor(m.pct))}>{m.pct.toFixed(1)}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-body overflow-hidden">
                  <div className={cn('h-full rounded-full transition-all duration-500', getCoverageBg(m.pct))} style={{ width: `${m.pct}%` }} />
                </div>
                <p className="text-[10px] text-text-secondary">{m.covered.toLocaleString()} / {m.total.toLocaleString()}</p>
              </div>
            ))}
          </div>

          {/* File Tree */}
          <div className="rounded-xl bg-card border border-border overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <FolderTree size={16} /> File Coverage
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-body/30">
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-text-secondary">File</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-text-secondary">Statements</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-text-secondary">Branches</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-text-secondary">Functions</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-text-secondary">Lines</th>
                  </tr>
                </thead>
                <tbody>
                  {folders.map((folder) => (
                    <React.Fragment key={folder}>
                      <tr className="border-b border-border/50 bg-body/20 cursor-pointer hover:bg-body/40 transition-colors" onClick={() => toggleFolder(folder)}>
                        <td colSpan={5} className="px-4 py-2">
                          <div className="flex items-center gap-1.5 text-text-secondary font-medium">
                            {expandedFolders.has(folder) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            <FolderTree size={14} />
                            <span>{folder}/</span>
                          </div>
                        </td>
                      </tr>
                      {expandedFolders.has(folder) && tree[folder].map((f) => (
                        <tr key={f.path} className="border-b border-border/30 hover:bg-body/20 transition-colors">
                          <td className="px-4 py-2 pl-10">
                            <div className="flex items-center gap-1.5">
                              <File size={12} className="text-text-secondary" />
                              <span className="text-text-primary">{f.path.split('/').pop()}</span>
                            </div>
                          </td>
                          <td className={cn('px-4 py-2 text-right font-medium', getCoverageColor(f.statements))}>{f.statements.toFixed(1)}%</td>
                          <td className={cn('px-4 py-2 text-right font-medium', getCoverageColor(f.branches))}>{f.branches.toFixed(1)}%</td>
                          <td className={cn('px-4 py-2 text-right font-medium', getCoverageColor(f.functions))}>{f.functions.toFixed(1)}%</td>
                          <td className={cn('px-4 py-2 text-right font-medium', getCoverageColor(f.lines))}>{f.lines.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Uncovered Paths */}
          <div className="rounded-xl bg-card border border-border overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <AlertTriangle size={16} className="text-[#EF4444]" /> Uncovered Paths
              </h3>
            </div>
            <div className="space-y-0">
              {uncoveredPaths.map((up, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3 border-b border-border/50 last:border-0 hover:bg-body/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full',
                      up.type === 'Branch' ? 'bg-[#EAB308]/10 text-[#EAB308]' :
                      up.type === 'Function' ? 'bg-[#A855F7]/10 text-[#A855F7]' :
                      'bg-[#EF4444]/10 text-[#EF4444]'
                    )}>{up.type}</span>
                    <div>
                      <p className="text-xs text-text-primary font-medium">{up.file}:{up.line}</p>
                      <p className="text-[10px] text-text-secondary">{up.description}</p>
                    </div>
                  </div>
                  <button className="flex items-center gap-1 px-2 py-1 bg-body border border-border rounded text-[10px] text-text-secondary hover:text-text-primary transition-colors">
                    <Link2 size={10} /> Link Test Case
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
    <HowItWorks steps={howItWorksSteps} isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  )
}
