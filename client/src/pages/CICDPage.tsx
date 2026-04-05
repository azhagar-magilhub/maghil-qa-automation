import { useState, useEffect } from 'react'
import {
  GitBranch, Play, Copy, Settings, Check, ChevronDown, ExternalLink,
  AlertTriangle, CheckCircle, XCircle, Clock, FileCode, Info, ArrowRight, Shield, Link, BarChart3, FileText
} from 'lucide-react'
import {
  collection, query, where, orderBy, onSnapshot, limit as firestoreLimit
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'
import HowItWorks from '@/components/shared/HowItWorks'
import api from '@/lib/api'

const howItWorksSteps = [
  {
    title: 'Configure Trigger',
    description: 'Select an API collection and environment to trigger test runs from your CI/CD pipeline on each build.',
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
            <Play className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Trigger</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Set Quality Gate',
    description: 'Define minimum pass rate, maximum critical vulnerabilities, and response time thresholds for release approval.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Gate</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Threshold</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Generate Webhook',
    description: 'Copy the generated webhook URL and add it to your CI/CD pipeline. Builds trigger automated test runs.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Link className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Webhook</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Copy className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Copy URL</span>
        </div>
      </div>
    ),
  },
  {
    title: 'View Results',
    description: 'Monitor pipeline builds in real time. See pass rates, durations, and quality gate verdicts for each run.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Metrics</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <FileText className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Pipeline</span>
        </div>
      </div>
    ),
  },
]

// ─── Types ───────────────────────────────────────────────────────────────────

interface QualityGate {
  minPassRate: number
  maxCriticalVulns: number
  maxResponseTime: number
}

interface PipelineBuild {
  id: string
  pipelineName: string
  branch: string
  status: 'success' | 'failed' | 'running' | 'pending'
  passRate: number
  duration: string
  triggeredBy: string
  createdAt: string
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CICDPage() {
  const { user } = useAuthStore()
  const [showHelp, setShowHelp] = useState(false)

  // Trigger config
  const [selectedCollection, setSelectedCollection] = useState('')
  const [selectedEnv, setSelectedEnv] = useState('')
  const [triggerType, setTriggerType] = useState<'manual' | 'webhook'>('manual')
  const [collections, setCollections] = useState<{ id: string; name: string }[]>([])
  const [environments, setEnvironments] = useState<{ id: string; name: string }[]>([])

  // Webhook
  const webhookUrl = `${window.location.origin}/api/v1/cicd/webhook/${user?.uid ?? 'user-id'}`
  const [copied, setCopied] = useState(false)

  // Quality gate
  const [qualityGate, setQualityGate] = useState<QualityGate>({
    minPassRate: 90,
    maxCriticalVulns: 0,
    maxResponseTime: 3000,
  })

  // Pipeline dashboard
  const [builds, setBuilds] = useState<PipelineBuild[]>([])

  // Generated YAML
  const [showYaml, setShowYaml] = useState(false)

  // ── Firestore listeners ──

  useEffect(() => {
    if (!user) return
    const unsubCollections = onSnapshot(
      query(collection(db, 'apiCollections'), where('userId', '==', user.uid)),
      (snap) => setCollections(snap.docs.map((d) => ({ id: d.id, name: d.data().name })))
    )
    const unsubEnvs = onSnapshot(
      query(collection(db, 'environments'), where('userId', '==', user.uid)),
      (snap) => setEnvironments(snap.docs.map((d) => ({ id: d.id, name: d.data().name })))
    )
    const unsubBuilds = onSnapshot(
      query(
        collection(db, 'pipelineBuilds'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        firestoreLimit(20)
      ),
      (snap) => setBuilds(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as PipelineBuild[])
    )
    return () => { unsubCollections(); unsubEnvs(); unsubBuilds() }
  }, [user])

  // ── Handlers ──

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleTriggerRun = async () => {
    if (!selectedCollection) return
    try {
      await api.post('/api/v1/cicd/trigger', {
        collectionId: selectedCollection,
        environmentId: selectedEnv,
        triggerType,
        qualityGate,
      })
    } catch {
      // silent
    }
  }

  const handleSaveGate = async () => {
    try {
      await api.post('/api/v1/cicd/quality-gate', qualityGate)
    } catch {
      // silent
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success': return { color: 'bg-green-500/20 text-green-400', icon: CheckCircle }
      case 'failed': return { color: 'bg-red-500/20 text-red-400', icon: XCircle }
      case 'running': return { color: 'bg-blue-500/20 text-blue-400', icon: Clock }
      default: return { color: 'bg-yellow-500/20 text-yellow-400', icon: Clock }
    }
  }

  // ── YAML Generation ──

  const generatedYaml = `name: QA Automation Pipeline
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  workflow_dispatch:

jobs:
  qa-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger QA Platform Tests
        uses: actions/github-script@v7
        with:
          script: |
            const response = await fetch('${webhookUrl}', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                collection: '${selectedCollection || '<collection-id>'}',
                environment: '${selectedEnv || '<environment-id>'}',
                branch: context.ref,
                commit: context.sha,
                qualityGate: {
                  minPassRate: ${qualityGate.minPassRate},
                  maxCriticalVulns: ${qualityGate.maxCriticalVulns},
                  maxResponseTime: ${qualityGate.maxResponseTime}
                }
              })
            });
            const result = await response.json();
            if (!result.passed) {
              core.setFailed('Quality gate failed');
            }
`

  // ── Render ──

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <GitBranch size={24} className="text-accent" />
            CI/CD Integration
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Configure test triggers, quality gates, and pipeline integrations.
          </p>
        </div>
        <button onClick={() => setShowHelp(true)} className="flex items-center gap-2 rounded-full border border-border-subtle px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition">
          <Info className="h-4 w-4" /> How it works
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trigger Configuration */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-4">Trigger Configuration</h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-text-secondary mb-1 block">Test Collection</label>
              <select
                value={selectedCollection}
                onChange={(e) => setSelectedCollection(e.target.value)}
                className="w-full rounded-lg border border-border bg-body px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="">Select collection</option>
                {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-1 block">Environment</label>
              <select
                value={selectedEnv}
                onChange={(e) => setSelectedEnv(e.target.value)}
                className="w-full rounded-lg border border-border bg-body px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="">Select environment</option>
                {environments.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-1 block">Trigger Type</label>
              <div className="flex gap-2">
                {(['manual', 'webhook'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTriggerType(t)}
                    className={cn(
                      'flex-1 rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors',
                      triggerType === t
                        ? 'border-accent bg-accent/10 text-accent-light'
                        : 'border-border bg-body text-text-secondary hover:text-text-primary'
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleTriggerRun}
              disabled={!selectedCollection}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
            >
              <Play size={16} /> Trigger Run
            </button>
          </div>
        </div>

        {/* Quality Gate */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Settings size={16} className="text-text-secondary" />
            Quality Gate Configuration
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-text-secondary mb-1 block">Minimum Pass Rate (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={qualityGate.minPassRate}
                onChange={(e) => setQualityGate((g) => ({ ...g, minPassRate: Number(e.target.value) }))}
                className="w-full rounded-lg border border-border bg-body px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <div className="mt-1 h-2 rounded-full bg-body">
                <div
                  className="h-2 rounded-full bg-green-500 transition-all"
                  style={{ width: `${qualityGate.minPassRate}%` }}
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-1 block">Max Critical Vulnerabilities</label>
              <input
                type="number"
                min={0}
                value={qualityGate.maxCriticalVulns}
                onChange={(e) => setQualityGate((g) => ({ ...g, maxCriticalVulns: Number(e.target.value) }))}
                className="w-full rounded-lg border border-border bg-body px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-1 block">Max Response Time (ms)</label>
              <input
                type="number"
                min={0}
                step={100}
                value={qualityGate.maxResponseTime}
                onChange={(e) => setQualityGate((g) => ({ ...g, maxResponseTime: Number(e.target.value) }))}
                className="w-full rounded-lg border border-border bg-body px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <button
              onClick={handleSaveGate}
              className="w-full rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:border-accent transition-colors"
            >
              Save Quality Gate
            </button>
          </div>
        </div>
      </div>

      {/* Webhook URL */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-text-primary mb-3">Webhook URL</h2>
        <p className="text-xs text-text-secondary mb-3">
          Add this URL to your GitHub Actions, Jenkins, or GitLab CI pipeline to trigger tests on each build.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-lg border border-border bg-body px-3 py-2 text-sm text-text-primary font-mono overflow-x-auto">
            {webhookUrl}
          </code>
          <button
            onClick={handleCopyWebhook}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Generate YAML */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <FileCode size={16} className="text-accent-light" />
            GitHub Action YAML
          </h2>
          <button
            onClick={() => setShowYaml(!showYaml)}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 transition-colors"
          >
            <FileCode size={16} />
            {showYaml ? 'Hide YAML' : 'Generate GitHub Action YAML'}
          </button>
        </div>
        {showYaml && (
          <div className="relative">
            <pre className="rounded-lg border border-border bg-body p-4 text-sm text-text-primary font-mono overflow-x-auto whitespace-pre leading-relaxed">
              {generatedYaml}
            </pre>
            <button
              onClick={() => navigator.clipboard.writeText(generatedYaml)}
              className="absolute top-3 right-3 rounded-lg border border-border bg-card p-2 text-text-secondary hover:text-text-primary transition-colors"
            >
              <Copy size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Pipeline Dashboard */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-text-primary">Pipeline Dashboard</h2>
        </div>
        {builds.length === 0 ? (
          <div className="py-12 text-center text-text-secondary">
            <GitBranch size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No pipeline builds yet. Trigger a run or connect a webhook.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">Pipeline</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">Branch</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">Pass Rate</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">Duration</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">Triggered By</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {builds.map((build) => {
                  const badge = getStatusBadge(build.status)
                  return (
                    <tr key={build.id} className="hover:bg-body/50 transition-colors">
                      <td className="px-4 py-3 text-text-primary font-medium">{build.pipelineName}</td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-body px-2 py-0.5 text-xs font-mono text-text-secondary">
                          {build.branch}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium', badge.color)}>
                          <badge.icon size={12} />
                          {build.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-sm font-medium', build.passRate >= 90 ? 'text-green-400' : build.passRate >= 70 ? 'text-yellow-400' : 'text-red-400')}>
                          {build.passRate}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{build.duration}</td>
                      <td className="px-4 py-3 text-text-secondary">{build.triggeredBy}</td>
                      <td className="px-4 py-3 text-text-secondary text-xs">
                        {build.createdAt ? new Date(build.createdAt).toLocaleString() : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
    <HowItWorks steps={howItWorksSteps} isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  )
}
