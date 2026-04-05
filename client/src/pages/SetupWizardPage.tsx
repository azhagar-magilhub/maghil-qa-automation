import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { usePageTitle } from '@/hooks/usePageTitle'
import HowItWorks from '@/components/shared/HowItWorks'

const howItWorksSteps = [
  {
    title: 'Welcome',
    description: 'The Setup Wizard guides you through connecting all your integrations step by step. No technical expertise required.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Rocket className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Get started</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Begin</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Configure Jira',
    description: 'Enter your Jira base URL, email, and API token. Test the connection to verify everything works before moving on.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Link className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">URL</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Key className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Token</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Connected</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Configure Confluence',
    description: 'Connect Confluence for report publishing. Provide base URL, credentials, and a default space key. You can skip this step.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Confluence</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Key className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Token</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Connected</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Configure Teams',
    description: 'Set up Microsoft Teams integration with tenant ID, client ID, and client secret for message importing. This step is optional.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Teams</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Key className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Secret</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Connected</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Complete',
    description: 'Review your configuration summary. All integrations are saved securely. You can update them later in Settings.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Jira</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Confluence</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Teams</span>
        </div>
      </div>
    ),
  },
]
import {
  Check,
  X,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Link,
  Key,
  Mail,
  Building2,
  MessageSquare,
  Rocket,
  ShieldCheck,
  ExternalLink,
  Info,
  CheckCircle2,
  BookOpen,
  Sparkles,
} from 'lucide-react'

type ConnectionStatus = 'idle' | 'testing' | 'success' | 'error'

interface StepConfig {
  label: string
  description: string
}

const STEPS: StepConfig[] = [
  { label: 'Welcome', description: 'Get started' },
  { label: 'Jira', description: 'Issue tracking' },
  { label: 'Confluence', description: 'Documentation' },
  { label: 'Teams', description: 'Notifications' },
  { label: 'Complete', description: 'All done' },
]

export default function SetupWizardPage() {
  usePageTitle('Setup Wizard')
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)

  const [showHelp, setShowHelp] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  // Jira state
  const [jiraUrl, setJiraUrl] = useState('')
  const [jiraEmail, setJiraEmail] = useState('')
  const [jiraToken, setJiraToken] = useState('')
  const [jiraStatus, setJiraStatus] = useState<ConnectionStatus>('idle')
  const [jiraError, setJiraError] = useState('')

  // Confluence state
  const [confUrl, setConfUrl] = useState('')
  const [confEmail, setConfEmail] = useState('')
  const [confToken, setConfToken] = useState('')
  const [confSpaceKey, setConfSpaceKey] = useState('')
  const [confStatus, setConfStatus] = useState<ConnectionStatus>('idle')
  const [confError, setConfError] = useState('')
  const [confSkipped, setConfSkipped] = useState(false)

  // Teams state
  const [teamsTenantId, setTeamsTenantId] = useState('')
  const [teamsClientId, setTeamsClientId] = useState('')
  const [teamsClientSecret, setTeamsClientSecret] = useState('')
  const [teamsStatus, setTeamsStatus] = useState<ConnectionStatus>('idle')
  const [teamsError, setTeamsError] = useState('')
  const [teamsSkipped, setTeamsSkipped] = useState(false)

  const testJiraConnection = useCallback(async () => {
    setJiraStatus('testing')
    setJiraError('')
    try {
      await api.post('/api/v1/integrations/JIRA', {
        baseUrl: jiraUrl,
        email: jiraEmail,
        apiToken: jiraToken,
      })
      setJiraStatus('success')
    } catch (err: unknown) {
      setJiraStatus('error')
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      setJiraError(msg || 'Connection failed. Check your credentials and try again.')
    }
  }, [jiraUrl, jiraEmail, jiraToken])

  const testConfluenceConnection = useCallback(async () => {
    setConfStatus('testing')
    setConfError('')
    try {
      await api.post('/api/v1/integrations/CONFLUENCE', {
        baseUrl: confUrl,
        email: confEmail,
        apiToken: confToken,
        spaceKey: confSpaceKey,
      })
      setConfStatus('success')
    } catch (err: unknown) {
      setConfStatus('error')
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      setConfError(msg || 'Connection failed. Check your credentials and try again.')
    }
  }, [confUrl, confEmail, confToken, confSpaceKey])

  const testTeamsConnection = useCallback(async () => {
    setTeamsStatus('testing')
    setTeamsError('')
    try {
      await api.post('/api/v1/integrations/TEAMS', {
        tenantId: teamsTenantId,
        clientId: teamsClientId,
        clientSecret: teamsClientSecret,
      })
      setTeamsStatus('success')
    } catch (err: unknown) {
      setTeamsStatus('error')
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      setTeamsError(msg || 'Connection failed. Check your credentials and try again.')
    }
  }, [teamsTenantId, teamsClientId, teamsClientSecret])

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0:
        return true
      case 1:
        return jiraStatus === 'success'
      case 2:
        return confSkipped || confStatus === 'success'
      case 3:
        return teamsSkipped || teamsStatus === 'success'
      case 4:
        return true
      default:
        return false
    }
  }

  const handleNext = () => {
    if (currentStep < STEPS.length - 1 && canProceed()) {
      const nextStep = currentStep + 1
      // Auto-fill confluence URL from Jira URL when moving to step 2
      if (nextStep === 2 && !confUrl && jiraUrl) {
        setConfUrl(jiraUrl)
      }
      setCurrentStep(nextStep)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkipConfluence = () => {
    setConfSkipped(true)
    setConfStatus('idle')
    setCurrentStep(3)
  }

  const handleSkipTeams = () => {
    setTeamsSkipped(true)
    setTeamsStatus('idle')
    setCurrentStep(4)
  }

  const handleGoToDashboard = () => {
    navigate('/dashboard')
  }

  // --- Progress Bar ---
  const progressPercent = (currentStep / (STEPS.length - 1)) * 100

  return (
    <>
    <div className="min-h-[calc(100vh-6rem)] flex flex-col">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Setup Wizard</h1>
          <p className="text-text-secondary mt-1">
            Configure your integrations to get started with QA Automation
          </p>
        </div>
        <button onClick={() => setShowHelp(true)} className="flex items-center gap-2 rounded-full border border-border-subtle px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition">
          <Info className="h-4 w-4" /> How it works
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="h-1.5 w-full rounded-full bg-sidebar overflow-hidden">
          <div
            className="h-full rounded-full bg-accent transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Step Indicators */}
        <div className="flex items-center justify-between mt-4">
          {STEPS.map((step, idx) => {
            const isCompleted = idx < currentStep
            const isActive = idx === currentStep
            return (
              <div key={step.label} className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 border-2',
                    isCompleted &&
                      'bg-green-500/20 border-green-500 text-green-400',
                    isActive &&
                      'bg-accent/20 border-accent text-white scale-110',
                    !isCompleted &&
                      !isActive &&
                      'bg-sidebar border-border text-text-secondary'
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    idx + 1
                  )}
                </div>
                <span
                  className={cn(
                    'text-xs font-medium hidden sm:block',
                    isActive ? 'text-text-primary' : 'text-text-secondary'
                  )}
                >
                  {step.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1">
        {currentStep === 0 && <WelcomeStep name={profile?.fullName} />}
        {currentStep === 1 && (
          <JiraStep
            url={jiraUrl}
            email={jiraEmail}
            token={jiraToken}
            status={jiraStatus}
            error={jiraError}
            onUrlChange={setJiraUrl}
            onEmailChange={setJiraEmail}
            onTokenChange={setJiraToken}
            onTest={testJiraConnection}
          />
        )}
        {currentStep === 2 && (
          <ConfluenceStep
            url={confUrl}
            email={confEmail}
            token={confToken}
            spaceKey={confSpaceKey}
            status={confStatus}
            error={confError}
            onUrlChange={setConfUrl}
            onEmailChange={setConfEmail}
            onTokenChange={setConfToken}
            onSpaceKeyChange={setConfSpaceKey}
            onTest={testConfluenceConnection}
            onSkip={handleSkipConfluence}
          />
        )}
        {currentStep === 3 && (
          <TeamsStep
            tenantId={teamsTenantId}
            clientId={teamsClientId}
            clientSecret={teamsClientSecret}
            status={teamsStatus}
            error={teamsError}
            onTenantIdChange={setTeamsTenantId}
            onClientIdChange={setTeamsClientId}
            onClientSecretChange={setTeamsClientSecret}
            onTest={testTeamsConnection}
            onSkip={handleSkipTeams}
          />
        )}
        {currentStep === 4 && (
          <CompleteStep
            jiraConnected={jiraStatus === 'success'}
            confluenceConnected={confStatus === 'success'}
            confluenceSkipped={confSkipped}
            teamsConnected={teamsStatus === 'success'}
            teamsSkipped={teamsSkipped}
            onGoToDashboard={handleGoToDashboard}
          />
        )}
      </div>

      {/* Navigation */}
      {currentStep < 4 && (
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors',
              currentStep === 0
                ? 'text-text-secondary/40 cursor-not-allowed'
                : 'text-text-secondary hover:text-text-primary hover:bg-sidebar'
            )}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className={cn(
              'flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all',
              canProceed()
                ? 'bg-accent text-white hover:bg-accent/90 shadow-lg shadow-accent/25'
                : 'bg-card text-text-secondary/50 cursor-not-allowed border border-border'
            )}
          >
            {currentStep === 0 ? "Let's Get Started" : 'Next'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
    <HowItWorks steps={howItWorksSteps} isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  )
}

/* ─── Shared Components ─── */

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  icon: Icon,
  helperText,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  type?: string
  icon?: React.ComponentType<{ className?: string }>
  helperText?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-text-primary mb-1.5">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            'w-full rounded-lg border border-border bg-sidebar px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/50',
            'focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all',
            Icon && 'pl-10'
          )}
        />
      </div>
      {helperText && (
        <p className="mt-1.5 text-xs text-text-secondary">{helperText}</p>
      )}
    </div>
  )
}

function ConnectionStatusBadge({
  status,
  error,
}: {
  status: ConnectionStatus
  error: string
}) {
  if (status === 'idle') return null

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm mt-4',
        status === 'testing' && 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
        status === 'success' && 'bg-green-500/10 text-green-400 border border-green-500/20',
        status === 'error' && 'bg-red-500/10 text-accent-light border border-red-500/20'
      )}
    >
      {status === 'testing' && <Loader2 className="w-4 h-4 animate-spin" />}
      {status === 'success' && <Check className="w-4 h-4" />}
      {status === 'error' && <X className="w-4 h-4" />}
      <span>
        {status === 'testing' && 'Testing connection...'}
        {status === 'success' && 'Connection successful!'}
        {status === 'error' && (error || 'Connection failed.')}
      </span>
    </div>
  )
}

function TestConnectionButton({
  onClick,
  disabled,
  status,
}: {
  onClick: () => void
  disabled: boolean
  status: ConnectionStatus
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || status === 'testing'}
      className={cn(
        'flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all',
        disabled || status === 'testing'
          ? 'bg-card text-text-secondary/50 cursor-not-allowed border border-border'
          : 'bg-sidebar text-text-primary border border-border hover:border-accent hover:text-accent'
      )}
    >
      {status === 'testing' ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <ShieldCheck className="w-4 h-4" />
      )}
      Test Connection
    </button>
  )
}

/* ─── Step Components ─── */

function WelcomeStep({ name }: { name?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-8 sm:p-10">
      <div className="flex flex-col items-center text-center max-w-lg mx-auto">
        <div className="rounded-2xl bg-accent/10 p-5 mb-6">
          <Rocket className="h-12 w-12 text-accent" />
        </div>
        <h2 className="text-2xl font-bold text-text-primary">
          Welcome{name ? `, ${name}` : ''}!
        </h2>
        <p className="mt-3 text-text-secondary leading-relaxed">
          Let's set up your QA Automation Platform. This wizard will walk you through
          connecting your tools so you can start creating Jira tickets, syncing
          documentation, and receiving notifications.
        </p>
        <div className="mt-8 w-full grid gap-4 text-left">
          <ConfigItem
            icon={<Link className="w-5 h-5 text-blue-400" />}
            title="Jira Integration"
            desc="Connect your Jira instance to create and manage tickets"
          />
          <ConfigItem
            icon={<Building2 className="w-5 h-5 text-purple-400" />}
            title="Confluence Integration"
            desc="Link your documentation space for test case syncing"
          />
          <ConfigItem
            icon={<MessageSquare className="w-5 h-5 text-emerald-400" />}
            title="Microsoft Teams"
            desc="Set up notifications and chat-based ticket creation"
          />
        </div>
      </div>
    </div>
  )
}

function ConfigItem({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode
  title: string
  desc: string
}) {
  return (
    <div className="flex items-start gap-4 rounded-lg bg-sidebar/50 p-4 border border-border/50">
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className="text-sm font-medium text-text-primary">{title}</p>
        <p className="text-xs text-text-secondary mt-0.5">{desc}</p>
      </div>
    </div>
  )
}

function JiraStep({
  url,
  email,
  token,
  status,
  error,
  onUrlChange,
  onEmailChange,
  onTokenChange,
  onTest,
}: {
  url: string
  email: string
  token: string
  status: ConnectionStatus
  error: string
  onUrlChange: (v: string) => void
  onEmailChange: (v: string) => void
  onTokenChange: (v: string) => void
  onTest: () => void
}) {
  const allFilled = url.trim() !== '' && email.trim() !== '' && token.trim() !== ''

  return (
    <div className="rounded-xl border border-border bg-card p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="rounded-lg bg-blue-500/10 p-2.5">
          <Link className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Jira Configuration</h2>
          <p className="text-sm text-text-secondary">
            Connect your Atlassian Jira instance
          </p>
        </div>
      </div>

      <div className="space-y-5 max-w-lg">
        <InputField
          label="Jira Base URL"
          value={url}
          onChange={onUrlChange}
          placeholder="https://your-domain.atlassian.net"
          icon={Link}
          helperText="The base URL of your Jira Cloud or Server instance"
        />
        <InputField
          label="Email Address"
          value={email}
          onChange={onEmailChange}
          placeholder="you@company.com"
          type="email"
          icon={Mail}
          helperText="The email associated with your Atlassian account"
        />
        <InputField
          label="API Token"
          value={token}
          onChange={onTokenChange}
          placeholder="Enter your Jira API token"
          type="password"
          icon={Key}
        />

        <div className="rounded-lg bg-sidebar/50 border border-border/50 p-4">
          <p className="text-xs text-text-secondary leading-relaxed">
            <span className="text-text-primary font-medium">Where to find your API token:</span>{' '}
            Go to{' '}
            <a
              href="https://id.atlassian.com/manage-profile/security/api-tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-light hover:underline inline-flex items-center gap-1"
            >
              Atlassian API Tokens
              <ExternalLink className="w-3 h-3" />
            </a>{' '}
            and click "Create API token". Copy the generated token and paste it above.
          </p>
        </div>

        <div className="flex items-center gap-4 pt-2">
          <TestConnectionButton
            onClick={onTest}
            disabled={!allFilled}
            status={status}
          />
        </div>

        <ConnectionStatusBadge status={status} error={error} />
      </div>
    </div>
  )
}

function ConfluenceStep({
  url,
  email,
  token,
  spaceKey,
  status,
  error,
  onUrlChange,
  onEmailChange,
  onTokenChange,
  onSpaceKeyChange,
  onTest,
  onSkip,
}: {
  url: string
  email: string
  token: string
  spaceKey: string
  status: ConnectionStatus
  error: string
  onUrlChange: (v: string) => void
  onEmailChange: (v: string) => void
  onTokenChange: (v: string) => void
  onSpaceKeyChange: (v: string) => void
  onTest: () => void
  onSkip: () => void
}) {
  const allFilled =
    url.trim() !== '' &&
    email.trim() !== '' &&
    token.trim() !== '' &&
    spaceKey.trim() !== ''

  return (
    <div className="rounded-xl border border-border bg-card p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-purple-500/10 p-2.5">
            <Building2 className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              Confluence Configuration
            </h2>
            <p className="text-sm text-text-secondary">
              Connect your Confluence documentation space
            </p>
          </div>
        </div>
        <button
          onClick={onSkip}
          className="text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          Skip for now
        </button>
      </div>

      <div className="space-y-5 max-w-lg">
        <InputField
          label="Confluence Base URL"
          value={url}
          onChange={onUrlChange}
          placeholder="https://your-domain.atlassian.net/wiki"
          icon={Link}
          helperText="Usually the same domain as Jira with /wiki appended"
        />
        <InputField
          label="Email Address"
          value={email}
          onChange={onEmailChange}
          placeholder="you@company.com"
          type="email"
          icon={Mail}
        />
        <InputField
          label="API Token"
          value={token}
          onChange={onTokenChange}
          placeholder="Enter your Confluence API token"
          type="password"
          icon={Key}
          helperText="You can reuse the same Atlassian API token from the Jira step"
        />
        <InputField
          label="Space Key"
          value={spaceKey}
          onChange={onSpaceKeyChange}
          placeholder="e.g. QA, TESTDOCS"
          icon={Building2}
          helperText="The key of the Confluence space where test documentation will be stored"
        />

        <div className="flex items-center gap-4 pt-2">
          <TestConnectionButton
            onClick={onTest}
            disabled={!allFilled}
            status={status}
          />
        </div>

        <ConnectionStatusBadge status={status} error={error} />
      </div>
    </div>
  )
}

function TeamsStep({
  tenantId,
  clientId,
  clientSecret,
  status,
  error,
  onTenantIdChange,
  onClientIdChange,
  onClientSecretChange,
  onTest,
  onSkip,
}: {
  tenantId: string
  clientId: string
  clientSecret: string
  status: ConnectionStatus
  error: string
  onTenantIdChange: (v: string) => void
  onClientIdChange: (v: string) => void
  onClientSecretChange: (v: string) => void
  onTest: () => void
  onSkip: () => void
}) {
  const allFilled =
    tenantId.trim() !== '' &&
    clientId.trim() !== '' &&
    clientSecret.trim() !== ''

  return (
    <div className="rounded-xl border border-border bg-card p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-emerald-500/10 p-2.5">
            <MessageSquare className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              Microsoft Teams Configuration
            </h2>
            <p className="text-sm text-text-secondary">
              Set up Teams notifications and chat integration
            </p>
          </div>
        </div>
        <button
          onClick={onSkip}
          className="text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          Skip for now
        </button>
      </div>

      <div className="space-y-5 max-w-lg">
        <InputField
          label="Tenant ID"
          value={tenantId}
          onChange={onTenantIdChange}
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          icon={Building2}
          helperText="Your Azure AD tenant ID (Directory ID)"
        />
        <InputField
          label="Client ID"
          value={clientId}
          onChange={onClientIdChange}
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          icon={Key}
          helperText="The Application (client) ID from your Azure AD app registration"
        />
        <InputField
          label="Client Secret"
          value={clientSecret}
          onChange={onClientSecretChange}
          placeholder="Enter your client secret"
          type="password"
          icon={Key}
        />

        <div className="rounded-lg bg-sidebar/50 border border-border/50 p-4">
          <p className="text-xs text-text-secondary leading-relaxed">
            <span className="text-text-primary font-medium">Azure AD App Registration:</span>{' '}
            Go to the{' '}
            <a
              href="https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-light hover:underline inline-flex items-center gap-1"
            >
              Azure Portal App Registrations
              <ExternalLink className="w-3 h-3" />
            </a>
            . Create a new registration, then add a client secret under "Certificates & secrets".
            Grant the required Microsoft Graph API permissions for Teams messaging.
          </p>
        </div>

        <div className="flex items-center gap-4 pt-2">
          <TestConnectionButton
            onClick={onTest}
            disabled={!allFilled}
            status={status}
          />
        </div>

        <ConnectionStatusBadge status={status} error={error} />
      </div>
    </div>
  )
}

function CompleteStep({
  jiraConnected,
  confluenceConnected,
  confluenceSkipped,
  teamsConnected,
  teamsSkipped,
  onGoToDashboard,
}: {
  jiraConnected: boolean
  confluenceConnected: boolean
  confluenceSkipped: boolean
  teamsConnected: boolean
  teamsSkipped: boolean
  onGoToDashboard: () => void
}) {
  const integrations = [
    {
      name: 'Jira',
      icon: <Link className="w-5 h-5" />,
      connected: jiraConnected,
      skipped: false,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      name: 'Confluence',
      icon: <Building2 className="w-5 h-5" />,
      connected: confluenceConnected,
      skipped: confluenceSkipped,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
    },
    {
      name: 'Microsoft Teams',
      icon: <MessageSquare className="w-5 h-5" />,
      connected: teamsConnected,
      skipped: teamsSkipped,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
  ]

  return (
    <div className="rounded-xl border border-border bg-card p-8 sm:p-10">
      <div className="flex flex-col items-center text-center max-w-lg mx-auto">
        <div className="rounded-2xl bg-green-500/10 p-5 mb-6">
          <Check className="h-12 w-12 text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-text-primary">Setup Complete!</h2>
        <p className="mt-3 text-text-secondary">
          Your QA Automation Platform is configured and ready to use.
        </p>

        <div className="mt-8 w-full space-y-3">
          {integrations.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between rounded-lg bg-sidebar/50 border border-border/50 px-5 py-4"
            >
              <div className="flex items-center gap-3">
                <div className={cn('rounded-lg p-2', item.bg)}>
                  <span className={item.color}>{item.icon}</span>
                </div>
                <span className="text-sm font-medium text-text-primary">{item.name}</span>
              </div>
              {item.connected ? (
                <div className="flex items-center gap-2 text-green-400">
                  <Check className="w-4 h-4" />
                  <span className="text-sm font-medium">Connected</span>
                </div>
              ) : item.skipped ? (
                <div className="flex items-center gap-2 text-text-secondary">
                  <span className="w-4 text-center text-lg leading-none">&mdash;</span>
                  <span className="text-sm">Skipped</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-accent-light">
                  <X className="w-4 h-4" />
                  <span className="text-sm">Not connected</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={onGoToDashboard}
          className="mt-8 flex items-center gap-2 px-8 py-3 rounded-lg bg-accent text-white font-semibold text-sm hover:bg-accent/90 transition-all shadow-lg shadow-accent/25"
        >
          Go to Dashboard
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
