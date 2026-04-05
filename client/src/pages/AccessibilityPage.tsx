import { useState } from 'react'
import {
  Eye, Search, AlertTriangle, AlertCircle, Info, CheckCircle,
  Play, Palette, ArrowRight, Globe, Link, List, CheckCircle2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import HowItWorks from '@/components/shared/HowItWorks'
import api from '@/lib/api'

const howItWorksSteps = [
  {
    title: 'Enter URL',
    description: 'Provide the URL of the page you want to scan for accessibility compliance issues.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Globe className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">URL</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Link className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Input</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Run Scan',
    description: 'Click Scan to analyze the page against WCAG 2.1 guidelines. The scanner checks structure, labels, contrast, and more.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Eye className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">WCAG</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Search className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Scan</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Review Findings',
    description: 'Browse findings by severity: critical, serious, moderate, and minor. Each includes WCAG criteria and remediation steps.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-yellow/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-status-yellow" />
          </div>
          <span className="text-xs text-text-secondary">Findings</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <List className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Details</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Check Contrast',
    description: 'Use the built-in color contrast checker to test foreground/background combinations against WCAG AA and AAA standards.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Palette className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Colors</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Check</span>
        </div>
      </div>
    ),
  },
]

// ─── Types ───────────────────────────────────────────────────────────────────

type Severity = 'critical' | 'serious' | 'moderate' | 'minor'

interface AccessibilityFinding {
  id: string
  severity: Severity
  element: string
  description: string
  wcagCriterion: string
  remediation: string
}

interface ScanResult {
  score: number
  critical: number
  serious: number
  moderate: number
  minor: number
  findings: AccessibilityFinding[]
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<Severity, { label: string; color: string; bgColor: string; icon: typeof AlertTriangle }> = {
  critical: { label: 'Critical', color: 'text-red-400', bgColor: 'bg-red-500/20', icon: AlertTriangle },
  serious: { label: 'Serious', color: 'text-orange-400', bgColor: 'bg-orange-500/20', icon: AlertCircle },
  moderate: { label: 'Moderate', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', icon: Info },
  minor: { label: 'Minor', color: 'text-blue-400', bgColor: 'bg-blue-500/20', icon: Info },
}


// ─── Component ───────────────────────────────────────────────────────────────

export default function AccessibilityPage() {
  const [showHelp, setShowHelp] = useState(false)
  const [targetUrl, setTargetUrl] = useState('')
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)

  // Color contrast checker
  const [fgColor, setFgColor] = useState('#F3F4F6')
  const [bgColor, setBgColor] = useState('#0A0E17')
  const [contrastRatio, setContrastRatio] = useState<number | null>(null)

  // ── Scan handler ──

  const handleScan = async () => {
    if (!targetUrl.trim()) return
    setScanning(true)
    setResult(null)
    try {
      const { data } = await api.post('/api/v1/accessibility/scan', { url: targetUrl })
      setResult(data)
    } catch {
      setResult(null)
    } finally {
      setScanning(false)
    }
  }

  // ── Contrast calculation ──

  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return { r, g, b }
  }

  const relativeLuminance = (hex: string) => {
    const { r, g, b } = hexToRgb(hex)
    const [rr, gg, bb] = [r, g, b].map((c) => {
      const s = c / 255
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * rr + 0.7152 * gg + 0.0722 * bb
  }

  const calculateContrast = () => {
    const l1 = relativeLuminance(fgColor)
    const l2 = relativeLuminance(bgColor)
    const lighter = Math.max(l1, l2)
    const darker = Math.min(l1, l2)
    setContrastRatio(Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100)
  }

  const wcagAA = contrastRatio !== null && contrastRatio >= 4.5
  const wcagAAA = contrastRatio !== null && contrastRatio >= 7
  const wcagAALarge = contrastRatio !== null && contrastRatio >= 3

  // ── Render ──

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Eye size={24} className="text-accent" />
            Accessibility Testing
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Scan pages for WCAG compliance and check color contrast ratios.
          </p>
        </div>
        <button onClick={() => setShowHelp(true)} className="flex items-center gap-2 rounded-full border border-border-subtle px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition">
          <Info className="h-4 w-4" /> How it works
        </button>
      </div>

      {/* Scan Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            placeholder="Enter URL to scan (e.g., https://example.com)"
            className="w-full rounded-lg border border-border bg-card pl-10 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-accent"
            onKeyDown={(e) => e.key === 'Enter' && handleScan()}
          />
        </div>
        <button
          onClick={handleScan}
          disabled={scanning || !targetUrl.trim()}
          className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
        >
          <Play size={16} />
          {scanning ? 'Scanning...' : 'Scan'}
        </button>
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Severity Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(['critical', 'serious', 'moderate', 'minor'] as Severity[]).map((sev) => {
              const cfg = SEVERITY_CONFIG[sev]
              const count = result[sev]
              return (
                <div key={sev} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <span className={cn('text-xs font-semibold uppercase tracking-wider', cfg.color)}>
                      {cfg.label}
                    </span>
                    <cfg.icon size={16} className={cfg.color} />
                  </div>
                  <p className="mt-2 text-3xl font-bold text-text-primary">{count}</p>
                </div>
              )
            })}
          </div>

          {/* Overall Score */}
          <div className="rounded-xl border border-border bg-card p-5 flex items-center gap-6">
            <div className="flex items-center justify-center h-20 w-20 rounded-full border-4 border-accent">
              <span className="text-2xl font-bold text-text-primary">{result.score}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">Accessibility Score</p>
              <p className="text-xs text-text-secondary mt-1">
                {result.score >= 90 ? 'Excellent' : result.score >= 70 ? 'Needs Improvement' : 'Poor'} -
                {' '}{result.findings.length} issues found across the page.
              </p>
            </div>
          </div>

          {/* Findings Table */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-text-primary">Findings ({result.findings.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">Severity</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">Element</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">Issue</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">WCAG</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">Remediation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {result.findings.map((f) => {
                    const cfg = SEVERITY_CONFIG[f.severity]
                    return (
                      <tr key={f.id} className="hover:bg-body/50 transition-colors">
                        <td className="px-4 py-3">
                          <span className={cn('inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium', cfg.bgColor, cfg.color)}>
                            <cfg.icon size={10} />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <code className="text-xs text-text-secondary font-mono bg-body px-1.5 py-0.5 rounded">{f.element}</code>
                        </td>
                        <td className="px-4 py-3 text-text-primary max-w-xs">{f.description}</td>
                        <td className="px-4 py-3">
                          <span className="rounded bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-400">
                            {f.wcagCriterion}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-text-secondary text-xs max-w-sm">{f.remediation}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Color Contrast Checker */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Palette size={16} className="text-accent-light" />
          Color Contrast Checker
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <div>
              <label className="text-xs text-text-secondary mb-1 block">Foreground Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={fgColor}
                  onChange={(e) => setFgColor(e.target.value)}
                  className="h-10 w-10 rounded border border-border cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={fgColor}
                  onChange={(e) => setFgColor(e.target.value)}
                  className="flex-1 rounded-lg border border-border bg-body px-3 py-2 text-sm text-text-primary font-mono focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-1 block">Background Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="h-10 w-10 rounded border border-border cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="flex-1 rounded-lg border border-border bg-body px-3 py-2 text-sm text-text-primary font-mono focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>
            <button
              onClick={calculateContrast}
              className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 transition-colors"
            >
              Check Contrast
            </button>
          </div>

          {/* Preview */}
          <div className="flex items-center justify-center rounded-xl border border-border p-6" style={{ backgroundColor: bgColor }}>
            <div>
              <p style={{ color: fgColor }} className="text-2xl font-bold">Sample Text</p>
              <p style={{ color: fgColor }} className="text-sm mt-1">The quick brown fox jumps over the lazy dog.</p>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-3">
            {contrastRatio !== null && (
              <>
                <div className="text-center">
                  <p className="text-3xl font-bold text-text-primary">{contrastRatio}:1</p>
                  <p className="text-xs text-text-secondary mt-1">Contrast Ratio</p>
                </div>
                <div className="space-y-2">
                  <div className={cn('flex items-center justify-between rounded-lg border px-3 py-2', wcagAA ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10')}>
                    <span className="text-xs font-medium text-text-primary">WCAG AA (Normal)</span>
                    {wcagAA ? <CheckCircle size={16} className="text-green-400" /> : <AlertTriangle size={16} className="text-red-400" />}
                  </div>
                  <div className={cn('flex items-center justify-between rounded-lg border px-3 py-2', wcagAAA ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10')}>
                    <span className="text-xs font-medium text-text-primary">WCAG AAA (Normal)</span>
                    {wcagAAA ? <CheckCircle size={16} className="text-green-400" /> : <AlertTriangle size={16} className="text-red-400" />}
                  </div>
                  <div className={cn('flex items-center justify-between rounded-lg border px-3 py-2', wcagAALarge ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10')}>
                    <span className="text-xs font-medium text-text-primary">WCAG AA (Large Text)</span>
                    {wcagAALarge ? <CheckCircle size={16} className="text-green-400" /> : <AlertTriangle size={16} className="text-red-400" />}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Empty state when no scan has been run */}
      {!result && !scanning && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Eye className="h-12 w-12 text-text-muted mb-4" />
          <h3 className="text-lg font-medium text-text-primary mb-1">No accessibility scans yet</h3>
          <p className="text-sm text-text-secondary mb-4">Enter a URL above and click Scan to check for WCAG compliance issues.</p>
        </div>
      )}
    </div>
    <HowItWorks steps={howItWorksSteps} isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  )
}
