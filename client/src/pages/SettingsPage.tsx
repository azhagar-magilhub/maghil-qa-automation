import { useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import {
  Check,
  X,
  Loader2,
  Link,
  Key,
  Mail,
  Building2,
  MessageSquare,
  ShieldCheck,
  ExternalLink,
  Pencil,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Info,
  ArrowRight,
  List,
  Eye,
  Edit3,
  Save,
  Zap,
  CheckCircle2,
} from 'lucide-react'

import { usePageTitle } from '@/hooks/usePageTitle'
import HowItWorks from '@/components/shared/HowItWorks'

const howItWorksSteps = [
  {
    title: 'View Integrations',
    description: 'See the status of all configured integrations: Jira, Confluence, and Microsoft Teams. Green dots indicate active connections.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <List className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">See</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Eye className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Integrations</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Edit Credentials',
    description: 'Click the edit icon on any integration card to update credentials. Fields are pre-filled with your current configuration.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Edit3 className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Update</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Save className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Save</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Test Connection',
    description: 'After editing, click "Test Connection" to verify the integration works. A success or error badge appears immediately.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Zap className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Test</span>
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
]

type ConnectionStatus = 'idle' | 'testing' | 'success' | 'error'
type IntegrationType = 'JIRA' | 'CONFLUENCE' | 'TEAMS'

interface IntegrationState {
  type: IntegrationType
  label: string
  icon: React.ReactNode
  iconColor: string
  iconBg: string
  isActive: boolean
  lastTestedAt: string | null
  lastTestStatus: boolean | null
  editing: boolean
  testStatus: ConnectionStatus
  testError: string
  fields: Record<string, string>
}

const DEFAULT_INTEGRATIONS: IntegrationState[] = [
  {
    type: 'JIRA',
    label: 'Jira',
    icon: <Link className="w-5 h-5" />,
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-500/10',
    isActive: false,
    lastTestedAt: null,
    lastTestStatus: null,
    editing: false,
    testStatus: 'idle',
    testError: '',
    fields: { baseUrl: '', email: '', apiToken: '' },
  },
  {
    type: 'CONFLUENCE',
    label: 'Confluence',
    icon: <Building2 className="w-5 h-5" />,
    iconColor: 'text-purple-400',
    iconBg: 'bg-purple-500/10',
    isActive: false,
    lastTestedAt: null,
    lastTestStatus: null,
    editing: false,
    testStatus: 'idle',
    testError: '',
    fields: { baseUrl: '', email: '', apiToken: '', spaceKey: '' },
  },
  {
    type: 'TEAMS',
    label: 'Microsoft Teams',
    icon: <MessageSquare className="w-5 h-5" />,
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/10',
    isActive: false,
    lastTestedAt: null,
    lastTestStatus: null,
    editing: false,
    testStatus: 'idle',
    testError: '',
    fields: { tenantId: '', clientId: '', clientSecret: '' },
  },
]

export default function SettingsPage() {
  usePageTitle('Settings')
  const [showHelp, setShowHelp] = useState(false)
  const [integrations, setIntegrations] = useState<IntegrationState[]>(DEFAULT_INTEGRATIONS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchIntegrations()
  }, [])

  const fetchIntegrations = async () => {
    try {
      const { data } = await api.get('/api/v1/integrations')
      setIntegrations((prev) =>
        prev.map((integration) => {
          const remote = Array.isArray(data)
            ? data.find((d: { type: string }) => d.type === integration.type)
            : null
          if (remote) {
            return {
              ...integration,
              isActive: remote.isActive ?? false,
              lastTestedAt: remote.lastTestedAt ?? null,
              lastTestStatus: remote.lastTestStatus ?? null,
            }
          }
          return integration
        })
      )
    } catch {
      // Integrations may not be configured yet
    } finally {
      setLoading(false)
    }
  }

  const updateIntegration = useCallback(
    (type: IntegrationType, updates: Partial<IntegrationState>) => {
      setIntegrations((prev) =>
        prev.map((i) => (i.type === type ? { ...i, ...updates } : i))
      )
    },
    []
  )

  const updateField = useCallback(
    (type: IntegrationType, field: string, value: string) => {
      setIntegrations((prev) =>
        prev.map((i) =>
          i.type === type
            ? { ...i, fields: { ...i.fields, [field]: value } }
            : i
        )
      )
    },
    []
  )

  const toggleEdit = useCallback((type: IntegrationType) => {
    setIntegrations((prev) =>
      prev.map((i) =>
        i.type === type
          ? { ...i, editing: !i.editing, testStatus: 'idle', testError: '' }
          : i
      )
    )
  }, [])

  const testConnection = useCallback(
    async (type: IntegrationType) => {
      const integration = integrations.find((i) => i.type === type)
      if (!integration) return

      updateIntegration(type, { testStatus: 'testing', testError: '' })

      try {
        await api.post(`/api/v1/integrations/${type}`, integration.fields)
        updateIntegration(type, {
          testStatus: 'success',
          isActive: true,
          lastTestedAt: new Date().toISOString(),
          lastTestStatus: true,
        })
      } catch (err: unknown) {
        const msg =
          err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
            : undefined
        updateIntegration(type, {
          testStatus: 'error',
          testError: msg || 'Connection failed. Check your credentials.',
          lastTestStatus: false,
        })
      }
    },
    [integrations, updateIntegration]
  )

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never'
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <>
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
          <p className="text-text-secondary mt-1">
            Manage your integrations and platform configuration
          </p>
        </div>
        <button onClick={() => setShowHelp(true)} className="flex items-center gap-2 rounded-full border border-border-subtle px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition">
          <Info className="h-4 w-4" /> How it works
        </button>
      </div>

      {/* Integrations Section */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Integrations</h2>

        {loading ? (
          <div className="rounded-xl border border-border bg-card p-12 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-text-secondary animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {integrations.map((integration) => (
              <IntegrationCard
                key={integration.type}
                integration={integration}
                onToggleEdit={() => toggleEdit(integration.type)}
                onFieldChange={(field, value) =>
                  updateField(integration.type, field, value)
                }
                onTest={() => testConnection(integration.type)}
                formatDate={formatDate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
    <HowItWorks steps={howItWorksSteps} isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  )
}

/* ─── Integration Card ─── */

function IntegrationCard({
  integration,
  onToggleEdit,
  onFieldChange,
  onTest,
  formatDate,
}: {
  integration: IntegrationState
  onToggleEdit: () => void
  onFieldChange: (field: string, value: string) => void
  onTest: () => void
  formatDate: (d: string | null) => string
}) {
  const { type, label, icon, iconColor, iconBg, isActive, lastTestedAt, lastTestStatus, editing, testStatus, testError, fields } = integration

  const hasAllFields = Object.values(fields).every((v) => v.trim() !== '')

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header Row */}
      <div className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-4">
          <div className={cn('rounded-lg p-2.5', iconBg)}>
            <span className={iconColor}>{icon}</span>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-text-primary">{label}</h3>
              <StatusDot active={isActive} lastStatus={lastTestStatus} />
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Last tested: {formatDate(lastTestedAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isActive && !editing && (
            <button
              onClick={onTest}
              disabled={testStatus === 'testing'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-sidebar border border-border transition-colors"
            >
              {testStatus === 'testing' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              Re-test
            </button>
          )}
          <button
            onClick={onToggleEdit}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
              editing
                ? 'bg-accent/10 text-accent border-accent/30'
                : 'text-text-secondary hover:text-text-primary hover:bg-sidebar border-border'
            )}
          >
            {editing ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                Close
              </>
            ) : (
              <>
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </>
            )}
          </button>
        </div>
      </div>

      {/* Inline test result (when not editing) */}
      {!editing && testStatus !== 'idle' && (
        <div className="px-6 pb-4">
          <ConnectionBadge status={testStatus} error={testError} />
        </div>
      )}

      {/* Edit Panel */}
      {editing && (
        <div className="border-t border-border px-6 py-6 bg-sidebar/30">
          <div className="space-y-4 max-w-lg">
            {type === 'JIRA' && (
              <JiraFields fields={fields} onFieldChange={onFieldChange} />
            )}
            {type === 'CONFLUENCE' && (
              <ConfluenceFields fields={fields} onFieldChange={onFieldChange} />
            )}
            {type === 'TEAMS' && (
              <TeamsFields fields={fields} onFieldChange={onFieldChange} />
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={onTest}
                disabled={!hasAllFields || testStatus === 'testing'}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  !hasAllFields || testStatus === 'testing'
                    ? 'bg-card text-text-secondary/50 cursor-not-allowed border border-border'
                    : 'bg-accent text-white hover:bg-accent/90'
                )}
              >
                {testStatus === 'testing' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
                Save & Test Connection
              </button>
            </div>

            {testStatus !== 'idle' && (
              <ConnectionBadge status={testStatus} error={testError} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Shared Components ─── */

function StatusDot({
  active,
  lastStatus,
}: {
  active: boolean
  lastStatus: boolean | null
}) {
  if (!active && lastStatus === null) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-text-secondary">
        <span className="w-2 h-2 rounded-full bg-text-secondary/40" />
        Not configured
      </span>
    )
  }
  if (active && lastStatus !== false) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-green-400">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        Connected
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1.5 text-xs text-accent-light">
      <span className="w-2 h-2 rounded-full bg-accent" />
      Connection failed
    </span>
  )
}

function ConnectionBadge({
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
        'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm',
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

function SettingsInput({
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

/* ─── Field Groups ─── */

function JiraFields({
  fields,
  onFieldChange,
}: {
  fields: Record<string, string>
  onFieldChange: (field: string, value: string) => void
}) {
  return (
    <>
      <SettingsInput
        label="Jira Base URL"
        value={fields.baseUrl || ''}
        onChange={(v) => onFieldChange('baseUrl', v)}
        placeholder="https://your-domain.atlassian.net"
        icon={Link}
      />
      <SettingsInput
        label="Email Address"
        value={fields.email || ''}
        onChange={(v) => onFieldChange('email', v)}
        placeholder="you@company.com"
        type="email"
        icon={Mail}
      />
      <SettingsInput
        label="API Token"
        value={fields.apiToken || ''}
        onChange={(v) => onFieldChange('apiToken', v)}
        placeholder="Enter your Jira API token"
        type="password"
        icon={Key}
      />
      <HelperBox>
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
        to create or manage your API token.
      </HelperBox>
    </>
  )
}

function ConfluenceFields({
  fields,
  onFieldChange,
}: {
  fields: Record<string, string>
  onFieldChange: (field: string, value: string) => void
}) {
  return (
    <>
      <SettingsInput
        label="Confluence Base URL"
        value={fields.baseUrl || ''}
        onChange={(v) => onFieldChange('baseUrl', v)}
        placeholder="https://your-domain.atlassian.net/wiki"
        icon={Link}
      />
      <SettingsInput
        label="Email Address"
        value={fields.email || ''}
        onChange={(v) => onFieldChange('email', v)}
        placeholder="you@company.com"
        type="email"
        icon={Mail}
      />
      <SettingsInput
        label="API Token"
        value={fields.apiToken || ''}
        onChange={(v) => onFieldChange('apiToken', v)}
        placeholder="Enter your Confluence API token"
        type="password"
        icon={Key}
      />
      <SettingsInput
        label="Space Key"
        value={fields.spaceKey || ''}
        onChange={(v) => onFieldChange('spaceKey', v)}
        placeholder="e.g. QA, TESTDOCS"
        icon={Building2}
      />
    </>
  )
}

function TeamsFields({
  fields,
  onFieldChange,
}: {
  fields: Record<string, string>
  onFieldChange: (field: string, value: string) => void
}) {
  return (
    <>
      <SettingsInput
        label="Tenant ID"
        value={fields.tenantId || ''}
        onChange={(v) => onFieldChange('tenantId', v)}
        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
        icon={Building2}
      />
      <SettingsInput
        label="Client ID"
        value={fields.clientId || ''}
        onChange={(v) => onFieldChange('clientId', v)}
        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
        icon={Key}
      />
      <SettingsInput
        label="Client Secret"
        value={fields.clientSecret || ''}
        onChange={(v) => onFieldChange('clientSecret', v)}
        placeholder="Enter your client secret"
        type="password"
        icon={Key}
      />
      <HelperBox>
        Register an app in the{' '}
        <a
          href="https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent-light hover:underline inline-flex items-center gap-1"
        >
          Azure Portal
          <ExternalLink className="w-3 h-3" />
        </a>{' '}
        and add a client secret under "Certificates & secrets".
      </HelperBox>
    </>
  )
}

function HelperBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-sidebar/50 border border-border/50 p-3">
      <p className="text-xs text-text-secondary leading-relaxed">{children}</p>
    </div>
  )
}
