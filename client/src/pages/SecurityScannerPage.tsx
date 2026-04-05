import { useState, useEffect, useCallback } from 'react'
import {
  Shield, ShieldAlert, ShieldCheck, Lock, Unlock, Globe, Play,
  Loader2, ChevronDown, ChevronRight, AlertTriangle, CheckCircle2,
  XCircle, Bug, Download, Clock, History, FileText, ExternalLink,
  Info, ArrowRight, Link, Search, List
} from 'lucide-react'
import {
  collection, query, where, orderBy, onSnapshot, limit, Timestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'
import { usePageTitle } from '@/hooks/usePageTitle'
import HowItWorks from '@/components/shared/HowItWorks'
import api from '@/lib/api'

const howItWorksSteps = [
  {
    title: 'Enter URL',
    description: 'Provide the target URL to scan. The scanner checks for security vulnerabilities, misconfigurations, and SSL issues.',
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
    title: 'Choose Scan Type',
    description: 'Select Full Scan, Headers Only, or SSL Only. Full scans take longer but provide comprehensive results.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Scanning</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Search className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Analyze</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Review Findings',
    description: 'Browse findings sorted by severity. Each finding includes a description, location, and remediation steps.',
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
    title: 'File Bugs',
    description: 'Convert critical findings into Jira tickets with one click. Include severity, description, and remediation details.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Bug className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Auto-file</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Tickets</span>
        </div>
      </div>
    ),
  },
]

// ─── Types ───────────────────────────────────────────────────────────────────

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'
type ScanType = 'FULL' | 'HEADERS_ONLY' | 'SSL_ONLY'

interface Finding {
  id: string
  severity: Severity
  category: string
  description: string
  location: string
  remediation: string
}

interface HeaderCheck {
  header: string
  present: boolean
  value: string | null
  status: 'pass' | 'fail' | 'warn'
}

interface SSLInfo {
  valid: boolean
  issuer: string
  subject: string
  expiresAt: string
  protocol: string
  cipher: string
  keyBits: number
}

interface ScanResult {
  id: string
  targetUrl: string
  scanType: ScanType
  status: 'COMPLETED' | 'RUNNING' | 'ERROR'
  summary: { CRITICAL: number; HIGH: number; MEDIUM: number; LOW: number; INFO: number }
  findings: Finding[]
  headers: HeaderCheck[]
  ssl: SSLInfo | null
  duration: number
  createdAt: Date
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<
  Severity,
  { color: string; bg: string; border: string; icon: typeof ShieldAlert }
> = {
  CRITICAL: { color: 'text-white', bg: 'bg-status-red', border: 'border-status-red/30', icon: ShieldAlert },
  HIGH: { color: 'text-status-orange', bg: 'bg-status-orange', border: 'border-status-orange/30', icon: AlertTriangle },
  MEDIUM: { color: 'text-status-yellow', bg: 'bg-status-yellow', border: 'border-status-yellow/30', icon: AlertTriangle },
  LOW: { color: 'text-status-blue', bg: 'bg-status-blue', border: 'border-status-blue/30', icon: Info },
  INFO: { color: 'text-text-secondary', bg: 'bg-card', border: 'border-border', icon: Info },
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SecurityScannerPage() {
  usePageTitle('Security Scanner')
  const [showHelp, setShowHelp] = useState(false)
  const { user } = useAuthStore()

  // Form state
  const [protocol, setProtocol] = useState<'https' | 'http'>('https')
  const [targetHost, setTargetHost] = useState('')
  const [scanType, setScanType] = useState<ScanType>('FULL')
  const [scanning, setScanning] = useState(false)

  // Results
  const [result, setResult] = useState<ScanResult | null>(null)
  const [activeTab, setActiveTab] = useState<'findings' | 'headers' | 'ssl'>('findings')
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null)

  // History
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([])
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null)

  // ─── Firestore listener ──────────────────────────────────────────────────

  useEffect(() => {
    if (!user?.uid) return
    const q = query(
      collection(db, 'securityScans'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    )
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt instanceof Timestamp
          ? d.data().createdAt.toDate()
          : new Date(d.data().createdAt),
      })) as ScanResult[]
      setScanHistory(items)
    })
    return unsub
  }, [user?.uid])

  // ─── Start Scan ──────────────────────────────────────────────────────────

  const handleStartScan = useCallback(async () => {
    if (!targetHost || scanning) return
    setScanning(true)
    setResult(null)
    try {
      const targetUrl = `${protocol}://${targetHost}`
      const { data } = await api.post('/api/v1/security/scan', {
        targetUrl,
        scanType,
      })
      setResult(data)
      setActiveTab('findings')
    } catch (err: any) {
      setResult({
        id: 'error',
        targetUrl: `${protocol}://${targetHost}`,
        scanType,
        status: 'ERROR',
        summary: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 },
        findings: [],
        headers: [],
        ssl: null,
        duration: 0,
        createdAt: new Date(),
      })
    } finally {
      setScanning(false)
    }
  }, [targetHost, protocol, scanType, scanning])

  // ─── Auto-file bugs ─────────────────────────────────────────────────────

  const handleAutoFileBugs = useCallback(async () => {
    if (!result) return
    const criticalHighFindings = result.findings.filter(
      (f) => f.severity === 'CRITICAL' || f.severity === 'HIGH'
    )
    try {
      await api.post('/api/v1/bugs/auto-file-batch', {
        scanId: result.id,
        type: 'SECURITY_SCAN',
        findings: criticalHighFindings.map((f) => ({
          summary: `[Security ${f.severity}] ${f.category}: ${f.description.slice(0, 80)}`,
          description: `${f.description}\n\nLocation: ${f.location}\nRemediation: ${f.remediation}`,
          severity: f.severity,
        })),
      })
    } catch {
      // silently fail
    }
  }, [result])

  // ─── Export PDF stub ─────────────────────────────────────────────────────

  const handleExportReport = useCallback(() => {
    if (!result) return
    const html = `<!DOCTYPE html>
<html><head><title>Security Scan Report</title>
<style>body{font-family:system-ui;background:#0A0E17;color:#F3F4F6;padding:2rem}
table{width:100%;border-collapse:collapse;margin:1rem 0}th,td{padding:8px 12px;text-align:left;border-bottom:1px solid #334155}
th{background:#1E293B}.critical{color:#EF4444}.high{color:#F97316}.medium{color:#EAB308}.low{color:#3B82F6}
h1{color:#F3F4F6}h2{color:#9CA3AF;margin-top:2rem}.badge{display:inline-block;padding:2px 8px;border-radius:9999px;font-size:12px;font-weight:600;color:white}
</style></head><body>
<h1>Security Scan Report</h1>
<p>Target: ${result.targetUrl} | Scan Type: ${result.scanType} | Date: ${result.createdAt.toISOString()}</p>
<h2>Summary</h2>
<p>Critical: ${result.summary.CRITICAL} | High: ${result.summary.HIGH} | Medium: ${result.summary.MEDIUM} | Low: ${result.summary.LOW}</p>
<h2>Findings</h2>
<table><tr><th>Severity</th><th>Category</th><th>Description</th><th>Location</th><th>Remediation</th></tr>
${result.findings.map((f) => `<tr><td class="${f.severity.toLowerCase()}">${f.severity}</td><td>${f.category}</td><td>${f.description}</td><td>${f.location}</td><td>${f.remediation}</td></tr>`).join('')}
</table></body></html>`
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `security-report-${Date.now()}.html`
    a.click()
    URL.revokeObjectURL(url)
  }, [result])

  // ─── Render ──────────────────────────────────────────────────────────────

  const totalFindings = result
    ? result.summary.CRITICAL + result.summary.HIGH + result.summary.MEDIUM + result.summary.LOW + result.summary.INFO
    : 0

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Security Scanner</h1>
          <p className="text-sm text-text-secondary mt-1">
            Scan web applications for security vulnerabilities, header misconfigurations, and SSL issues
          </p>
        </div>
        <button onClick={() => setShowHelp(true)} className="flex items-center gap-2 rounded-full border border-border-subtle px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition">
          <Info className="h-4 w-4" /> How it works
        </button>
      </div>

      {/* Scan Configuration */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-col md:flex-row gap-4">
          {/* URL Input with protocol */}
          <div className="flex-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
              Target URL
            </label>
            <div className="flex">
              <select
                value={protocol}
                onChange={(e) => setProtocol(e.target.value as 'http' | 'https')}
                className="rounded-l-lg border border-r-0 border-border bg-body px-3 py-2.5 text-sm text-text-primary focus:border-accent focus:outline-none"
              >
                <option value="https">https://</option>
                <option value="http">http://</option>
              </select>
              <input
                type="text"
                value={targetHost}
                onChange={(e) => setTargetHost(e.target.value)}
                placeholder="example.com"
                className="flex-1 rounded-r-lg border border-border bg-body px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          {/* Scan Type */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
              Scan Type
            </label>
            <div className="flex gap-2">
              {(
                [
                  { id: 'FULL', label: 'Full Scan', icon: Shield },
                  { id: 'HEADERS_ONLY', label: 'Headers Only', icon: FileText },
                  { id: 'SSL_ONLY', label: 'SSL Only', icon: Lock },
                ] as const
              ).map((t) => {
                const Icon = t.icon
                return (
                  <button
                    key={t.id}
                    onClick={() => setScanType(t.id)}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap',
                      scanType === t.id
                        ? 'border-accent bg-accent/10 text-accent-light'
                        : 'border-border bg-body text-text-secondary hover:border-text-secondary/30'
                    )}
                  >
                    <Icon size={14} />
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <button
          onClick={handleStartScan}
          disabled={scanning || !targetHost}
          className={cn(
            'mt-4 flex items-center justify-center gap-2 rounded-xl px-8 py-3 text-sm font-semibold text-white transition-all w-full md:w-auto',
            scanning || !targetHost
              ? 'bg-accent/50 cursor-not-allowed'
              : 'bg-accent hover:bg-accent/90 active:scale-[0.98]'
          )}
        >
          {scanning ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <Play size={16} />
              Start Scan
            </>
          )}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {(
              [
                { sev: 'CRITICAL' as Severity, color: 'bg-status-red', textColor: 'text-status-red' },
                { sev: 'HIGH' as Severity, color: 'bg-status-orange', textColor: 'text-status-orange' },
                { sev: 'MEDIUM' as Severity, color: 'bg-status-yellow', textColor: 'text-status-yellow' },
                { sev: 'LOW' as Severity, color: 'bg-status-blue', textColor: 'text-status-blue' },
                { sev: 'INFO' as Severity, color: 'bg-card', textColor: 'text-text-secondary' },
              ] as const
            ).map((s) => (
              <div
                key={s.sev}
                className={cn(
                  'rounded-xl border bg-card p-4',
                  result.summary[s.sev] > 0 ? SEVERITY_CONFIG[s.sev].border : 'border-border'
                )}
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  {s.sev}
                </p>
                <p className={cn('text-3xl font-bold mt-1', s.textColor)}>
                  {result.summary[s.sev]}
                </p>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {(result.summary.CRITICAL > 0 || result.summary.HIGH > 0) && (
              <button
                onClick={handleAutoFileBugs}
                className="flex items-center gap-2 rounded-lg border border-status-red/30 bg-status-red/10 px-4 py-2.5 text-sm font-medium text-status-red hover:bg-status-red/20 transition-colors"
              >
                <Bug size={16} />
                Auto-file Bugs for Critical/High
              </button>
            )}
            <button
              onClick={handleExportReport}
              className="flex items-center gap-2 rounded-lg border border-border bg-body px-4 py-2.5 text-sm font-medium text-text-secondary hover:bg-card hover:text-text-primary transition-colors"
            >
              <Download size={16} />
              Export Report
            </button>
          </div>

          {/* Tabbed Results */}
          <div className="rounded-xl border border-border bg-card">
            <div className="flex border-b border-border">
              {(
                [
                  { id: 'findings' as const, label: 'Findings', count: totalFindings },
                  { id: 'headers' as const, label: 'Header Analysis', count: result.headers.length },
                  { id: 'ssl' as const, label: 'SSL / TLS', count: result.ssl ? 1 : 0 },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'px-5 py-3 text-sm font-medium transition-colors border-b-2',
                    activeTab === tab.id
                      ? 'border-accent text-accent-light'
                      : 'border-transparent text-text-secondary hover:text-text-primary'
                  )}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className="ml-2 rounded-full bg-body px-1.5 py-0.5 text-[10px] font-semibold">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="p-5">
              {/* Findings Tab */}
              {activeTab === 'findings' && (
                <div>
                  {result.findings.length === 0 ? (
                    <div className="flex items-center gap-3 py-8 justify-center">
                      <ShieldCheck size={24} className="text-status-green" />
                      <p className="text-sm text-text-secondary">No vulnerabilities found</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {result.findings.map((finding) => {
                        const config = SEVERITY_CONFIG[finding.severity]
                        const Icon = config.icon
                        return (
                          <div key={finding.id} className="py-3">
                            <button
                              onClick={() =>
                                setExpandedFinding(
                                  expandedFinding === finding.id ? null : finding.id
                                )
                              }
                              className="flex w-full items-center gap-3 text-left"
                            >
                              {expandedFinding === finding.id ? (
                                <ChevronDown size={14} className="text-text-secondary flex-shrink-0" />
                              ) : (
                                <ChevronRight size={14} className="text-text-secondary flex-shrink-0" />
                              )}
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-white flex-shrink-0',
                                  config.bg
                                )}
                              >
                                {finding.severity}
                              </span>
                              <span className="text-xs font-semibold text-text-secondary flex-shrink-0 w-28">
                                {finding.category}
                              </span>
                              <span className="text-sm text-text-primary truncate flex-1">
                                {finding.description}
                              </span>
                              <span className="text-xs text-text-secondary flex-shrink-0 ml-2">
                                {finding.location}
                              </span>
                            </button>
                            {expandedFinding === finding.id && (
                              <div className="mt-3 ml-8 rounded-lg border border-border bg-body p-4 space-y-3">
                                <div>
                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
                                    Description
                                  </p>
                                  <p className="text-sm text-text-primary mt-1">
                                    {finding.description}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
                                    Location
                                  </p>
                                  <p className="text-sm text-text-primary mt-1 font-mono">
                                    {finding.location}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
                                    Remediation
                                  </p>
                                  <p className="text-sm text-status-green mt-1">
                                    {finding.remediation}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Headers Tab */}
              {activeTab === 'headers' && (
                <div>
                  {result.headers.length === 0 ? (
                    <p className="text-sm text-text-secondary text-center py-8">
                      No header analysis data available
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="py-2.5 px-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">
                              Header
                            </th>
                            <th className="py-2.5 px-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">
                              Present
                            </th>
                            <th className="py-2.5 px-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">
                              Value
                            </th>
                            <th className="py-2.5 px-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {result.headers.map((h, i) => (
                            <tr key={i} className="hover:bg-body/50 transition-colors">
                              <td className="py-2.5 px-3 font-mono text-text-primary">
                                {h.header}
                              </td>
                              <td className="py-2.5 px-3">
                                {h.present ? (
                                  <CheckCircle2 size={16} className="text-status-green" />
                                ) : (
                                  <XCircle size={16} className="text-status-red" />
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-text-secondary font-mono text-xs max-w-xs truncate">
                                {h.value || '—'}
                              </td>
                              <td className="py-2.5 px-3">
                                <span
                                  className={cn(
                                    'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase text-white',
                                    h.status === 'pass'
                                      ? 'bg-status-green'
                                      : h.status === 'fail'
                                      ? 'bg-status-red'
                                      : 'bg-status-yellow'
                                  )}
                                >
                                  {h.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* SSL Tab */}
              {activeTab === 'ssl' && (
                <div>
                  {!result.ssl ? (
                    <div className="flex items-center gap-3 py-8 justify-center">
                      <Unlock size={24} className="text-text-secondary" />
                      <p className="text-sm text-text-secondary">No SSL data available</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="rounded-lg border border-border bg-body p-4 space-y-3">
                        <div className="flex items-center gap-2 mb-3">
                          {result.ssl.valid ? (
                            <Lock size={18} className="text-status-green" />
                          ) : (
                            <Unlock size={18} className="text-status-red" />
                          )}
                          <span
                            className={cn(
                              'text-sm font-semibold',
                              result.ssl.valid ? 'text-status-green' : 'text-status-red'
                            )}
                          >
                            Certificate {result.ssl.valid ? 'Valid' : 'Invalid'}
                          </span>
                        </div>
                        {(
                          [
                            ['Issuer', result.ssl.issuer],
                            ['Subject', result.ssl.subject],
                            ['Expires', result.ssl.expiresAt],
                          ] as const
                        ).map(([label, value]) => (
                          <div key={label}>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
                              {label}
                            </p>
                            <p className="text-sm text-text-primary mt-0.5">{value}</p>
                          </div>
                        ))}
                      </div>
                      <div className="rounded-lg border border-border bg-body p-4 space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-3">
                          Connection Details
                        </p>
                        {(
                          [
                            ['Protocol', result.ssl.protocol],
                            ['Cipher Suite', result.ssl.cipher],
                            ['Key Bits', `${result.ssl.keyBits}`],
                          ] as const
                        ).map(([label, value]) => (
                          <div key={label}>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
                              {label}
                            </p>
                            <p className="text-sm text-text-primary mt-0.5 font-mono">{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Scan History */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-5 py-3">
          <History size={16} className="text-text-secondary" />
          <h3 className="text-sm font-semibold text-text-primary">Scan History</h3>
          <span className="ml-auto rounded-full bg-body px-2 py-0.5 text-[10px] font-semibold text-text-secondary">
            {scanHistory.length}
          </span>
        </div>
        <div className="max-h-[400px] overflow-y-auto divide-y divide-border">
          {scanHistory.length === 0 && (
            <div className="p-6 text-center text-sm text-text-secondary">
              No security scans yet
            </div>
          )}
          {scanHistory.map((scan) => (
            <div key={scan.id} className="px-5 py-3">
              <button
                onClick={() =>
                  setExpandedHistory(expandedHistory === scan.id ? null : scan.id)
                }
                className="flex w-full items-center gap-3 text-left"
              >
                {expandedHistory === scan.id ? (
                  <ChevronDown size={14} className="text-text-secondary" />
                ) : (
                  <ChevronRight size={14} className="text-text-secondary" />
                )}
                <Shield size={14} className="text-text-secondary" />
                <span className="text-sm text-text-primary truncate flex-1">
                  {scan.targetUrl}
                </span>
                <span className="text-[10px] text-text-secondary">{scan.scanType}</span>
                <div className="flex items-center gap-1.5 ml-2">
                  {scan.summary.CRITICAL > 0 && (
                    <span className="rounded-full bg-status-red px-1.5 py-0.5 text-[9px] font-bold text-white">
                      {scan.summary.CRITICAL}C
                    </span>
                  )}
                  {scan.summary.HIGH > 0 && (
                    <span className="rounded-full bg-status-orange px-1.5 py-0.5 text-[9px] font-bold text-white">
                      {scan.summary.HIGH}H
                    </span>
                  )}
                  {scan.summary.MEDIUM > 0 && (
                    <span className="rounded-full bg-status-yellow px-1.5 py-0.5 text-[9px] font-bold text-white">
                      {scan.summary.MEDIUM}M
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-text-secondary ml-2 whitespace-nowrap">
                  <Clock size={10} className="inline mr-1" />
                  {scan.duration}ms
                </span>
              </button>
              {expandedHistory === scan.id && (
                <div className="mt-2 ml-8 space-y-1 text-xs text-text-secondary">
                  <p>
                    Date: {scan.createdAt.toLocaleDateString()}{' '}
                    {scan.createdAt.toLocaleTimeString()}
                  </p>
                  <p>
                    Findings: {scan.summary.CRITICAL}C / {scan.summary.HIGH}H / {scan.summary.MEDIUM}M / {scan.summary.LOW}L
                  </p>
                  <button
                    onClick={() => {
                      setResult(scan)
                      setActiveTab('findings')
                    }}
                    className="flex items-center gap-1 text-accent-light hover:underline mt-1"
                  >
                    <ExternalLink size={10} />
                    View full results
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
    <HowItWorks steps={howItWorksSteps} isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  )
}
