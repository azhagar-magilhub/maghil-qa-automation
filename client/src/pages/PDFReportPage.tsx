import { useState, useRef } from 'react'
import {
  FileDown, ArrowRight, Calendar, FileText, Shield, Zap, BarChart3,
  Loader2, Info, Printer, Eye, ClipboardList, Rocket
} from 'lucide-react'
import { cn } from '@/lib/utils'
import HowItWorks from '@/components/shared/HowItWorks'

// ─── How It Works ─────────────────────────────────────────────────────────────

const howItWorksSteps = [
  {
    title: 'Select Report Type',
    description: 'Choose from QA Summary, Security Scan, Performance, Test Run, or Release Notes report types.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <FileText className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Select</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <ClipboardList className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Report Type</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Configure Options',
    description: 'Set the date range, project name, and any additional filters for your report.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Calendar className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Date Range</span>
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
    title: 'Preview',
    description: 'Review the generated HTML report before downloading. Make sure all data looks correct.',
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
            <BarChart3 className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Verify</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Download PDF',
    description: 'Click Download to generate the PDF using your browsers print dialog. Save as PDF for a professional report.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Printer className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Print</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <FileDown className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">PDF</span>
        </div>
      </div>
    ),
  },
]

// ─── Types ────────────────────────────────────────────────────────────────────

type ReportType = 'qa-summary' | 'security-scan' | 'performance' | 'test-run' | 'release-notes'

interface ReportOption {
  id: ReportType
  label: string
  icon: typeof FileText
  color: string
}

const reportOptions: ReportOption[] = [
  { id: 'qa-summary', label: 'QA Summary', icon: ClipboardList, color: 'text-accent' },
  { id: 'security-scan', label: 'Security Scan', icon: Shield, color: 'text-status-red' },
  { id: 'performance', label: 'Performance', icon: Zap, color: 'text-status-yellow' },
  { id: 'test-run', label: 'Test Run', icon: BarChart3, color: 'text-status-green' },
  { id: 'release-notes', label: 'Release Notes', icon: Rocket, color: 'text-purple-400' },
]

// ─── Mock Report Data ─────────────────────────────────────────────────────────

function getReportData(type: ReportType) {
  const base = {
    'qa-summary': {
      title: 'QA Summary Report',
      metrics: [
        { label: 'Total Tests', value: '1,248' },
        { label: 'Pass Rate', value: '96.8%' },
        { label: 'Bugs Filed', value: '23' },
        { label: 'Coverage', value: '84.2%' },
      ],
      rows: [
        { name: 'Login Flow', status: 'Passed', cases: 45, passRate: '100%' },
        { name: 'Payment Module', status: 'Failed', cases: 32, passRate: '87.5%' },
        { name: 'User Profile', status: 'Passed', cases: 28, passRate: '96.4%' },
        { name: 'Search & Filters', status: 'Passed', cases: 56, passRate: '98.2%' },
        { name: 'Admin Dashboard', status: 'Warning', cases: 41, passRate: '92.7%' },
      ],
    },
    'security-scan': {
      title: 'Security Scan Report',
      metrics: [
        { label: 'Vulnerabilities', value: '12' },
        { label: 'Critical', value: '1' },
        { label: 'High', value: '3' },
        { label: 'Medium', value: '8' },
      ],
      rows: [
        { name: 'SQL Injection', status: 'Critical', cases: 1, passRate: 'Immediate' },
        { name: 'XSS Reflected', status: 'High', cases: 2, passRate: 'High' },
        { name: 'CSRF Missing', status: 'Medium', cases: 3, passRate: 'Medium' },
        { name: 'Open Redirect', status: 'Medium', cases: 2, passRate: 'Medium' },
        { name: 'Insecure Headers', status: 'Low', cases: 4, passRate: 'Low' },
      ],
    },
    'performance': {
      title: 'Performance Report',
      metrics: [
        { label: 'Avg Response', value: '245ms' },
        { label: 'P95 Latency', value: '890ms' },
        { label: 'Throughput', value: '1.2k rps' },
        { label: 'Error Rate', value: '0.3%' },
      ],
      rows: [
        { name: 'GET /api/users', status: 'Fast', cases: 5420, passRate: '120ms' },
        { name: 'POST /api/orders', status: 'Normal', cases: 3210, passRate: '340ms' },
        { name: 'GET /api/search', status: 'Slow', cases: 8900, passRate: '890ms' },
        { name: 'PUT /api/profile', status: 'Fast', cases: 1560, passRate: '95ms' },
        { name: 'DELETE /api/cache', status: 'Fast', cases: 780, passRate: '45ms' },
      ],
    },
    'test-run': {
      title: 'Test Run Report',
      metrics: [
        { label: 'Total Runs', value: '342' },
        { label: 'Passed', value: '318' },
        { label: 'Failed', value: '18' },
        { label: 'Skipped', value: '6' },
      ],
      rows: [
        { name: 'Smoke Tests', status: 'Passed', cases: 42, passRate: '100%' },
        { name: 'Regression Suite', status: 'Failed', cases: 156, passRate: '94.2%' },
        { name: 'API Integration', status: 'Passed', cases: 89, passRate: '98.9%' },
        { name: 'E2E Flows', status: 'Passed', cases: 34, passRate: '97.1%' },
        { name: 'Performance Tests', status: 'Warning', cases: 21, passRate: '90.5%' },
      ],
    },
    'release-notes': {
      title: 'Release Notes',
      metrics: [
        { label: 'Version', value: 'v2.4.0' },
        { label: 'Features', value: '8' },
        { label: 'Bug Fixes', value: '15' },
        { label: 'Improvements', value: '6' },
      ],
      rows: [
        { name: 'Dark Mode Support', status: 'Feature', cases: 1, passRate: 'New' },
        { name: 'Search Performance', status: 'Improvement', cases: 1, passRate: '3x faster' },
        { name: 'Login Bug Fix', status: 'Bug Fix', cases: 1, passRate: 'Resolved' },
        { name: 'Export CSV', status: 'Feature', cases: 1, passRate: 'New' },
        { name: 'Memory Leak Fix', status: 'Bug Fix', cases: 1, passRate: 'Resolved' },
      ],
    },
  }
  return base[type]
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PDFReportPage() {
  const [showHelp, setShowHelp] = useState(false)
  const [selectedType, setSelectedType] = useState<ReportType>('qa-summary')
  const [dateFrom, setDateFrom] = useState('2026-03-01')
  const [dateTo, setDateTo] = useState('2026-04-05')
  const [projectName, setProjectName] = useState('QA Automation Platform')
  const [generating, setGenerating] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)

  const reportData = getReportData(selectedType)

  const handleGenerate = () => {
    setGenerating(true)
    setTimeout(() => {
      setGenerating(false)
      setShowPreview(true)
    }, 1200)
  }

  const handleDownload = () => {
    window.print()
  }

  const statusColor = (s: string) => {
    const lower = s.toLowerCase()
    if (['passed', 'fast', 'feature', 'new', 'resolved'].includes(lower)) return 'text-status-green'
    if (['failed', 'critical', 'slow'].includes(lower)) return 'text-status-red'
    if (['warning', 'high', 'improvement'].includes(lower)) return 'text-status-yellow'
    return 'text-text-secondary'
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
              <FileDown className="text-accent" size={26} /> PDF Reports
            </h1>
            <p className="text-sm text-text-secondary mt-1">Generate professional PDF reports for QA, security, and performance</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHelp(true)}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-body transition-colors"
            >
              <Info size={16} /> How It Works
            </button>
          </div>
        </div>

        {/* Config Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Report Type Selector */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-text-primary mb-3">Report Type</h2>
            <div className="space-y-2">
              {reportOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => { setSelectedType(opt.id); setShowPreview(false) }}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-left',
                    selectedType === opt.id
                      ? 'bg-accent/10 text-accent-light border border-accent/30'
                      : 'text-text-secondary hover:bg-body hover:text-text-primary border border-transparent'
                  )}
                >
                  <opt.icon size={18} className={opt.color} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range & Project */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-text-primary mb-3">Configuration</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Project Name</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full rounded-lg border border-border bg-body px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">From</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full rounded-lg border border-border bg-body px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">To</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full rounded-lg border border-border bg-body px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="rounded-xl border border-border bg-card p-5 flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-semibold text-text-primary mb-3">Actions</h2>
              <p className="text-xs text-text-secondary mb-4">
                Generate a preview of your report, then download as PDF using your browser print dialog.
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                {generating ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
                {generating ? 'Generating...' : 'Generate Preview'}
              </button>
              {showPreview && (
                <button
                  onClick={handleDownload}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-accent text-accent-light px-4 py-2.5 text-sm font-semibold hover:bg-accent/10 transition-colors"
                >
                  <FileDown size={16} /> Download PDF
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Preview Section */}
        {showPreview && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <Eye size={16} className="text-accent" /> Report Preview
              </h2>
              <span className="text-xs text-text-muted">Print-optimized layout</span>
            </div>

            {/* Printable report content */}
            <div ref={previewRef} className="p-8 print-report">
              {/* Report Header */}
              <div className="flex items-center justify-between mb-8 pb-6 border-b-2 border-border print:border-gray-300">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent">
                    <span className="text-lg font-bold text-white">M</span>
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-text-primary print:text-black">{reportData.title}</h1>
                    <p className="text-sm text-text-secondary print:text-gray-600">{projectName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-text-primary print:text-black">
                    {dateFrom} to {dateTo}
                  </p>
                  <p className="text-xs text-text-muted print:text-gray-500">
                    Generated: {new Date().toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Summary Metrics */}
              <div className="mb-8">
                <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4 print:text-gray-700">
                  Summary
                </h2>
                <div className="grid grid-cols-4 gap-4">
                  {reportData.metrics.map((m) => (
                    <div
                      key={m.label}
                      className="rounded-lg border border-border bg-body p-4 text-center print:border-gray-300 print:bg-gray-50"
                    >
                      <p className="text-2xl font-bold text-text-primary print:text-black">{m.value}</p>
                      <p className="text-xs text-text-secondary mt-1 print:text-gray-600">{m.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Details Table */}
              <div className="mb-8">
                <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4 print:text-gray-700">
                  Details
                </h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border print:border-gray-300">
                      <th className="text-left py-3 px-4 font-semibold text-text-secondary print:text-gray-700">Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-text-secondary print:text-gray-700">Status</th>
                      <th className="text-right py-3 px-4 font-semibold text-text-secondary print:text-gray-700">Count</th>
                      <th className="text-right py-3 px-4 font-semibold text-text-secondary print:text-gray-700">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.rows.map((row, i) => (
                      <tr key={i} className="border-b border-border/50 print:border-gray-200">
                        <td className="py-3 px-4 text-text-primary print:text-black">{row.name}</td>
                        <td className="py-3 px-4">
                          <span className={cn('font-medium', statusColor(row.status))}>{row.status}</span>
                        </td>
                        <td className="py-3 px-4 text-right text-text-secondary print:text-gray-600">{row.cases}</td>
                        <td className="py-3 px-4 text-right text-text-secondary print:text-gray-600">{row.passRate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="pt-6 border-t-2 border-border print:border-gray-300 flex items-center justify-between">
                <p className="text-xs text-text-muted print:text-gray-500">
                  Generated by QA Automation Platform — maghil
                </p>
                <p className="text-xs text-text-muted print:text-gray-500">
                  Page 1 of 1
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Print-specific styles */}
        <style>{`
          @media print {
            body * { visibility: hidden; }
            .print-report, .print-report * { visibility: visible; }
            .print-report {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 2rem;
            }
          }
        `}</style>
      </div>

      <HowItWorks steps={howItWorksSteps} isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  )
}
