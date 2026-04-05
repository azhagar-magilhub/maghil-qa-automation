import { useState, useEffect } from 'react'
import {
  ClipboardCheck, CheckCircle2, XCircle, Clock, ExternalLink,
  Download, FileText, AlertTriangle, Shield, Info, ArrowRight, ClipboardList, CheckSquare, List, Eye, Link
} from 'lucide-react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'
import HowItWorks from '@/components/shared/HowItWorks'

const howItWorksSteps = [
  {
    title: 'Select Standard',
    description: 'Choose between SOC 2 and GDPR compliance frameworks. Each has a pre-built checklist of requirements.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <ClipboardList className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Pick</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <CheckSquare className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Standard</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Review Checklist',
    description: 'Go through each requirement. Mark items as pass, fail, or pending based on your organization\'s compliance status.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <List className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Check</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Eye className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Review</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Link Evidence',
    description: 'Attach evidence to each requirement: test IDs, documents, or notes that demonstrate compliance.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Link className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Attach</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <FileText className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Evidence</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Export Report',
    description: 'Generate a compliance report for auditors. Export as PDF or share with stakeholders.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Download className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Export</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <FileText className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Report</span>
        </div>
      </div>
    ),
  },
]

// ─── Types ───────────────────────────────────────────────────────────────────

type ComplianceStandard = 'soc2' | 'gdpr'
type CheckStatus = 'pass' | 'fail' | 'pending'

interface ComplianceCheck {
  id: string
  requirement: string
  category: string
  status: CheckStatus
  evidence: string
  linkedTestIds: string[]
  notes: string
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function CompliancePage() {
  const { user } = useAuthStore()
  const [showHelp, setShowHelp] = useState(false)
  const [standard, setStandard] = useState<ComplianceStandard>('soc2')

  // Template checklist items - status defaults to 'pending' until user updates via Firestore
  const soc2Checks: ComplianceCheck[] = [
    { id: '1', requirement: 'CC6.1 - Logical and Physical Access Controls', category: 'Security', status: 'pending', evidence: '', linkedTestIds: [], notes: '' },
    { id: '2', requirement: 'CC6.2 - Prior to Issuing System Credentials', category: 'Security', status: 'pending', evidence: '', linkedTestIds: [], notes: '' },
    { id: '3', requirement: 'CC6.3 - System Credentials Are Removed', category: 'Security', status: 'pending', evidence: '', linkedTestIds: [], notes: '' },
    { id: '4', requirement: 'CC7.1 - Detection and Monitoring Activities', category: 'Monitoring', status: 'pending', evidence: '', linkedTestIds: [], notes: '' },
    { id: '5', requirement: 'CC7.2 - Anomaly Detection', category: 'Monitoring', status: 'pending', evidence: '', linkedTestIds: [], notes: '' },
    { id: '6', requirement: 'CC8.1 - Change Management Process', category: 'Operations', status: 'pending', evidence: '', linkedTestIds: [], notes: '' },
    { id: '7', requirement: 'CC9.1 - Risk Assessment Process', category: 'Risk', status: 'pending', evidence: '', linkedTestIds: [], notes: '' },
    { id: '8', requirement: 'A1.2 - Recovery Procedures', category: 'Availability', status: 'pending', evidence: '', linkedTestIds: [], notes: '' },
  ]

  const gdprChecks: ComplianceCheck[] = [
    { id: '1', requirement: 'Art. 6 - Lawful Basis for Processing', category: 'Legal Basis', status: 'pending', evidence: '', linkedTestIds: [], notes: '' },
    { id: '2', requirement: 'Art. 7 - Conditions for Consent', category: 'Consent', status: 'pending', evidence: '', linkedTestIds: [], notes: '' },
    { id: '3', requirement: 'Art. 12 - Transparent Communication', category: 'Transparency', status: 'pending', evidence: '', linkedTestIds: [], notes: '' },
    { id: '4', requirement: 'Art. 15 - Right of Access', category: 'Data Rights', status: 'pending', evidence: '', linkedTestIds: [], notes: '' },
    { id: '5', requirement: 'Art. 17 - Right to Erasure', category: 'Data Rights', status: 'pending', evidence: '', linkedTestIds: [], notes: '' },
    { id: '6', requirement: 'Art. 25 - Data Protection by Design', category: 'Architecture', status: 'pending', evidence: '', linkedTestIds: [], notes: '' },
    { id: '7', requirement: 'Art. 30 - Records of Processing', category: 'Documentation', status: 'pending', evidence: '', linkedTestIds: [], notes: '' },
    { id: '8', requirement: 'Art. 33 - Breach Notification', category: 'Incident', status: 'pending', evidence: '', linkedTestIds: [], notes: '' },
  ]

  const checks = standard === 'soc2' ? soc2Checks : gdprChecks

  useEffect(() => {
    if (!user) return
    const ref = collection(db, 'complianceChecks')
    const q = query(ref, where('userId', '==', user.uid))
    const unsub = onSnapshot(q, () => {})
    return () => unsub()
  }, [user])

  const passCount = checks.filter((c) => c.status === 'pass').length
  const failCount = checks.filter((c) => c.status === 'fail').length
  const pendingCount = checks.filter((c) => c.status === 'pending').length
  const score = Math.round((passCount / checks.length) * 100)

  const handleExportReport = () => {
    const html = `<!DOCTYPE html><html><head><title>Compliance Report - ${standard.toUpperCase()}</title>
<style>body{font-family:sans-serif;padding:40px;color:#333}h1{color:#E31E24}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}.pass{color:#22C55E}.fail{color:#EF4444}.pending{color:#EAB308}</style></head>
<body><h1>${standard.toUpperCase()} Compliance Report</h1><p>Generated: ${new Date().toLocaleDateString()}</p><p>Score: ${score}%</p>
<table><tr><th>Requirement</th><th>Category</th><th>Status</th><th>Evidence</th><th>Linked Tests</th><th>Notes</th></tr>
${checks.map((c) => `<tr><td>${c.requirement}</td><td>${c.category}</td><td class="${c.status}">${c.status.toUpperCase()}</td><td>${c.evidence || 'N/A'}</td><td>${c.linkedTestIds.join(', ') || 'N/A'}</td><td>${c.notes}</td></tr>`).join('')}
</table></body></html>`
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${standard}-compliance-report.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Circular progress
  const radius = 60
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <ClipboardCheck className="text-[#22C55E]" size={26} /> Compliance Dashboard
          </h1>
          <p className="text-sm text-text-secondary mt-1">Track compliance requirements, evidence, and test coverage</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportReport} className="flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors">
            <Download size={16} /> Export Report
          </button>
          <button onClick={() => setShowHelp(true)} className="flex items-center gap-2 rounded-full border border-border-subtle px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition">
            <Info className="h-4 w-4" /> How it works
          </button>
        </div>
      </div>

      {/* Standard Tabs */}
      <div className="flex gap-1 bg-card rounded-lg p-1 border border-border w-fit">
        {([
          { key: 'soc2', label: 'SOC2' },
          { key: 'gdpr', label: 'GDPR' },
        ] as { key: ComplianceStandard; label: string }[]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStandard(tab.key)}
            className={cn(
              'px-6 py-2.5 rounded-md text-sm font-medium transition-colors',
              standard === tab.key ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary hover:bg-body'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Score + Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Circular Progress */}
        <div className="rounded-xl bg-card border border-border p-5 flex flex-col items-center justify-center">
          <svg width="140" height="140" viewBox="0 0 140 140" className="mb-2">
            <circle cx="70" cy="70" r={radius} stroke="#334155" strokeWidth="10" fill="none" />
            <circle
              cx="70" cy="70" r={radius}
              stroke={score >= 80 ? '#22C55E' : score >= 60 ? '#EAB308' : '#EF4444'}
              strokeWidth="10" fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 70 70)"
              className="transition-all duration-700"
            />
            <text x="70" y="65" textAnchor="middle" className="fill-text-primary text-2xl font-bold" fontSize="28">{score}%</text>
            <text x="70" y="85" textAnchor="middle" className="fill-text-secondary text-xs" fontSize="12">Compliant</text>
          </svg>
        </div>

        <div className="rounded-xl bg-card border border-border p-5 flex flex-col items-center justify-center">
          <CheckCircle2 size={28} className="text-[#22C55E] mb-2" />
          <p className="text-2xl font-bold text-[#22C55E]">{passCount}</p>
          <p className="text-xs text-text-secondary">Passed</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-5 flex flex-col items-center justify-center">
          <XCircle size={28} className="text-[#EF4444] mb-2" />
          <p className="text-2xl font-bold text-[#EF4444]">{failCount}</p>
          <p className="text-xs text-text-secondary">Failed</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-5 flex flex-col items-center justify-center">
          <Clock size={28} className="text-[#EAB308] mb-2" />
          <p className="text-2xl font-bold text-[#EAB308]">{pendingCount}</p>
          <p className="text-xs text-text-secondary">Pending</p>
        </div>
      </div>

      {/* Checklist */}
      <div className="rounded-xl bg-card border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-text-primary">{standard.toUpperCase()} Requirements Checklist</h3>
        </div>
        <div className="space-y-0">
          {checks.map((check) => (
            <div key={check.id} className="flex items-start gap-4 px-5 py-4 border-b border-border/50 last:border-0 hover:bg-body/30 transition-colors">
              <div className="mt-0.5">
                {check.status === 'pass' && <CheckCircle2 size={18} className="text-[#22C55E]" />}
                {check.status === 'fail' && <XCircle size={18} className="text-[#EF4444]" />}
                {check.status === 'pending' && <Clock size={18} className="text-[#EAB308]" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text-primary font-medium">{check.requirement}</p>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-[10px] text-text-secondary bg-body px-2 py-0.5 rounded">{check.category}</span>
                  {check.evidence && (
                    <span className="flex items-center gap-1 text-[10px] text-[#3B82F6] cursor-pointer hover:underline">
                      <FileText size={10} /> Evidence
                    </span>
                  )}
                  {check.linkedTestIds.length > 0 && (
                    <span className="text-[10px] text-[#A855F7]">
                      Tests: {check.linkedTestIds.join(', ')}
                    </span>
                  )}
                </div>
                {check.notes && <p className="text-[10px] text-text-secondary mt-1">{check.notes}</p>}
              </div>
              <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase shrink-0',
                check.status === 'pass' ? 'bg-[#22C55E]/10 text-[#22C55E]' :
                check.status === 'fail' ? 'bg-[#EF4444]/10 text-[#EF4444]' :
                'bg-[#EAB308]/10 text-[#EAB308]'
              )}>{check.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
    <HowItWorks steps={howItWorksSteps} isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  )
}
