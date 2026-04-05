import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CheckCircle2, Circle, ArrowRight, Info, PartyPopper,
  UserPlus, Wand2, Plug, FileSpreadsheet, MessageSquare,
  ClipboardList, Zap, Shield, Sparkles, BookOpen,
  ListChecks, ClipboardCheck, TrendingUp
} from 'lucide-react'
import {
  collection, query, where, getDocs, doc, getDoc, limit
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'
import HowItWorks, { type HowItWorksStep } from '@/components/shared/HowItWorks'

interface OnboardingStep {
  id: string
  title: string
  description: string
  icon: React.ElementType
  path: string
  actionLabel: string
  check: () => Promise<boolean>
}

const howItWorksSteps: HowItWorksStep[] = [
  {
    title: 'Follow Steps',
    description:
      'Work through each onboarding step in order. Each step guides you to a specific feature of the platform to configure or try out.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <ListChecks className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Steps</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <ClipboardCheck className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Complete</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Progress</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Complete Tasks',
    description:
      'Each step has an action button that takes you to the relevant page. Complete the task and come back to see your progress update automatically.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <ArrowRight className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Navigate</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Zap className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Execute</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Done</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Track Progress',
    description:
      'The progress bar at the top shows your overall completion. Once all steps are done, you will see a celebration message. You can skip onboarding at any time.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Track</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Finish</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <PartyPopper className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Celebrate</span>
        </div>
      </div>
    ),
  },
]

export default function OnboardingPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [completed, setCompleted] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const [publishChecked, setPublishChecked] = useState(false)

  const steps: OnboardingStep[] = [
    {
      id: 'create-account',
      title: 'Create Account',
      description: 'Sign up for the QA Automation Platform.',
      icon: UserPlus,
      path: '/dashboard',
      actionLabel: 'Go to Dashboard',
      check: async () => true, // always done if on this page
    },
    {
      id: 'setup-wizard',
      title: 'Complete Setup Wizard',
      description: 'Configure your base project settings and integrations.',
      icon: Wand2,
      path: '/setup',
      actionLabel: 'Open Setup Wizard',
      check: async () => {
        if (!user) return false
        const snap = await getDoc(doc(db, 'users', user.uid))
        return snap.exists() && snap.data()?.setupComplete === true
      },
    },
    {
      id: 'jira-integration',
      title: 'Configure Jira Integration',
      description: 'Connect your Jira instance for ticket management.',
      icon: Plug,
      path: '/setup',
      actionLabel: 'Configure Jira',
      check: async () => {
        if (!user) return false
        const snap = await getDoc(doc(db, `users/${user.uid}/integrations/JIRA`))
        return snap.exists()
      },
    },
    {
      id: 'upload-excel',
      title: 'Upload First Excel File',
      description: 'Bulk create Jira tickets from an Excel or CSV file.',
      icon: FileSpreadsheet,
      path: '/excel',
      actionLabel: 'Upload Excel',
      check: async () => {
        const q = query(
          collection(db, 'ticketBatches'),
          where('source', '==', 'EXCEL'),
          limit(1)
        )
        const snap = await getDocs(q)
        return !snap.empty
      },
    },
    {
      id: 'import-teams',
      title: 'Import from Teams',
      description: 'Convert Teams chat messages into Jira tickets.',
      icon: MessageSquare,
      path: '/teams',
      actionLabel: 'Import Teams',
      check: async () => {
        const q = query(
          collection(db, 'ticketBatches'),
          where('source', '==', 'TEAMS'),
          limit(1)
        )
        const snap = await getDocs(q)
        return !snap.empty
      },
    },
    {
      id: 'create-test-case',
      title: 'Create First Test Case',
      description: 'Write your first manual or automated test case.',
      icon: ClipboardList,
      path: '/test-cases',
      actionLabel: 'Create Test Case',
      check: async () => {
        const q = query(collection(db, 'testSuites'), limit(1))
        const snap = await getDocs(q)
        return !snap.empty
      },
    },
    {
      id: 'run-api-test',
      title: 'Run First API Test',
      description: 'Execute an API test in the API Runner.',
      icon: Zap,
      path: '/api-runner',
      actionLabel: 'Run API Test',
      check: async () => {
        const q = query(collection(db, 'apiCollections'), limit(1))
        const snap = await getDocs(q)
        return !snap.empty
      },
    },
    {
      id: 'run-security-scan',
      title: 'Run Security Scan',
      description: 'Scan your endpoints for common vulnerabilities.',
      icon: Shield,
      path: '/security',
      actionLabel: 'Run Scan',
      check: async () => {
        const q = query(collection(db, 'securityScans'), limit(1))
        const snap = await getDocs(q)
        return !snap.empty
      },
    },
    {
      id: 'generate-ai',
      title: 'Generate AI Test Cases',
      description: 'Use AI to auto-generate test cases from requirements.',
      icon: Sparkles,
      path: '/ai-hub',
      actionLabel: 'Open AI Hub',
      check: async () => {
        const q = query(collection(db, 'aiGenerations'), limit(1))
        const snap = await getDocs(q)
        return !snap.empty
      },
    },
    {
      id: 'publish-confluence',
      title: 'Publish to Confluence',
      description: 'Publish a report to your Confluence workspace.',
      icon: BookOpen,
      path: '/reports',
      actionLabel: 'Publish Report',
      check: async () => false, // manual check
    },
  ]

  const runChecks = useCallback(async () => {
    setLoading(true)
    const results: Record<string, boolean> = {}
    await Promise.all(
      steps.map(async (step) => {
        try {
          results[step.id] = await step.check()
        } catch {
          results[step.id] = false
        }
      })
    )
    // manual override for publish
    if (publishChecked) results['publish-confluence'] = true
    setCompleted(results)
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, publishChecked])

  useEffect(() => {
    runChecks()
  }, [runChecks])

  const completedCount = Object.values(completed).filter(Boolean).length
  const totalSteps = steps.length
  const progress = Math.round((completedCount / totalSteps) * 100)
  const allDone = completedCount === totalSteps

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Onboarding Checklist</h1>
          <p className="text-text-secondary">Complete these steps to get the most out of the platform</p>
        </div>
        <button
          onClick={() => setShowHowItWorks(true)}
          className="flex items-center gap-2 rounded-full border border-border-subtle px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition"
        >
          <Info className="h-4 w-4" /> How it works
        </button>
      </div>

      {/* Progress Bar */}
      <div className="rounded-xl bg-card border border-border p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-text-primary">
            {completedCount} of {totalSteps} steps completed
          </span>
          <span className="text-sm font-bold text-accent-light">{progress}%</span>
        </div>
        <div className="h-3 rounded-full bg-sidebar overflow-hidden">
          <div
            className="h-full rounded-full bg-accent transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Celebration */}
      {allDone && (
        <div className="rounded-xl bg-status-green/10 border border-status-green/30 p-6 text-center">
          <PartyPopper className="h-10 w-10 text-status-green mx-auto mb-3" />
          <h2 className="text-xl font-bold text-text-primary mb-1">
            Congratulations! All steps complete!
          </h2>
          <p className="text-text-secondary text-sm">
            You have successfully set up the QA Automation Platform. Explore the dashboard to see everything in action.
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 mt-4 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover transition"
          >
            Go to Dashboard <ArrowRight size={16} />
          </Link>
        </div>
      )}

      {/* Checklist */}
      <div className="space-y-3">
        {steps.map((step) => {
          const isDone = completed[step.id] || false
          const Icon = step.icon

          return (
            <div
              key={step.id}
              className={cn(
                'rounded-xl border p-5 transition-colors',
                isDone
                  ? 'bg-status-green/5 border-status-green/20'
                  : 'bg-card border-border'
              )}
            >
              <div className="flex items-start gap-4">
                {/* Checkbox */}
                <button
                  onClick={() => {
                    if (step.id === 'publish-confluence') {
                      setPublishChecked(!publishChecked)
                    }
                  }}
                  className="mt-0.5 flex-shrink-0"
                >
                  {isDone ? (
                    <CheckCircle2 className="h-6 w-6 text-status-green" />
                  ) : (
                    <Circle className="h-6 w-6 text-text-muted" />
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={cn('h-4 w-4', isDone ? 'text-status-green' : 'text-text-secondary')} />
                    <h3
                      className={cn(
                        'text-sm font-semibold',
                        isDone ? 'text-status-green line-through' : 'text-text-primary'
                      )}
                    >
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-sm text-text-secondary">{step.description}</p>
                </div>

                {/* Action button */}
                {!isDone && (
                  <Link
                    to={step.path}
                    className="flex-shrink-0 flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition"
                  >
                    {step.actionLabel} <ArrowRight size={14} />
                  </Link>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Skip link */}
      <div className="text-center pt-2">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-sm text-text-muted hover:text-text-secondary transition underline"
        >
          Skip Onboarding
        </button>
      </div>

      <HowItWorks steps={howItWorksSteps} isOpen={showHowItWorks} onClose={() => setShowHowItWorks(false)} />
    </div>
  )
}
