import { useState, useEffect, useCallback } from 'react'
import {
  Users, UserPlus, Mail, Shield, Trash2, ArrowRight, Info, Loader2,
  ChevronDown, Settings, Send, XCircle, CheckCircle2, RefreshCw,
  Crown, UserCog, User, Clock
} from 'lucide-react'
import {
  collection, query, where, orderBy, onSnapshot, Timestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'
import HowItWorks from '@/components/shared/HowItWorks'
import api from '@/lib/api'

// ─── HowItWorks Steps ──────────────────────────────────────────────────────

const howItWorksSteps = [
  {
    title: 'Invite Members',
    description: 'Send email invitations to your team. New members receive a link to join and start collaborating.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <UserPlus className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Invite</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Mail className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Email</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Assign Roles',
    description: 'Control permissions with roles: Admin for full access, Manager for test management, User for execution.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Roles</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <UserCog className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Permissions</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Manage Settings',
    description: 'Configure team defaults — name, Jira project, and notification preferences for your team.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Settings className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Settings</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Configured</span>
        </div>
      </div>
    ),
  },
]

// ─── Types ──────────────────────────────────────────────────────────────────

type Role = 'Admin' | 'Manager' | 'User'
type Tab = 'members' | 'invitations' | 'settings'

interface TeamMember {
  id: string
  name: string
  email: string
  role: Role
  joinedAt: Date
}

interface Invitation {
  id: string
  email: string
  role: Role
  status: 'pending' | 'accepted' | 'expired'
  sentAt: Date
}

const ROLE_STYLES: Record<Role, { bg: string; text: string; icon: typeof Crown }> = {
  Admin: { bg: 'bg-status-yellow/10', text: 'text-status-yellow', icon: Crown },
  Manager: { bg: 'bg-accent/10', text: 'text-accent-light', icon: UserCog },
  User: { bg: 'bg-card', text: 'text-text-secondary', icon: User },
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function TeamManagementPage() {
  const { user } = useAuthStore()
  const [showHelp, setShowHelp] = useState(false)
  const [tab, setTab] = useState<Tab>('members')

  // Members
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)

  // Invitations
  const [invitations, setInvitations] = useState<Invitation[]>([])

  // Invite modal
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<Role>('User')
  const [inviting, setInviting] = useState(false)

  // Settings
  const [teamName, setTeamName] = useState('My Team')
  const [teamDescription, setTeamDescription] = useState('')
  const [defaultJiraProject, setDefaultJiraProject] = useState('')
  const [notifyOnFail, setNotifyOnFail] = useState(true)
  const [notifyOnPass, setNotifyOnPass] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)

  useEffect(() => {
    if (!user) return

    // Listen for team members
    const teamQ = query(collection(db, 'teams'), where('ownerId', '==', user.uid))
    const unsub = onSnapshot(teamQ, snap => {
      if (snap.empty) {
        setMembers([{
          id: user.uid,
          name: user.displayName || user.email?.split('@')[0] || 'You',
          email: user.email || '',
          role: 'Admin',
          joinedAt: new Date(),
        }])
        setLoading(false)
        return
      }
      const teamDoc = snap.docs[0]
      const teamData = teamDoc.data()
      setTeamName(teamData.name || 'My Team')
      setTeamDescription(teamData.description || '')
      setDefaultJiraProject(teamData.defaultJiraProject || '')

      // Get members subcollection
      const membersQ = query(collection(db, `teams/${teamDoc.id}/members`), orderBy('joinedAt', 'desc'))
      onSnapshot(membersQ, memberSnap => {
        setMembers(memberSnap.docs.map(d => {
          const data = d.data()
          return {
            id: d.id,
            name: data.name || data.email?.split('@')[0] || 'User',
            email: data.email || '',
            role: data.role || 'User',
            joinedAt: data.joinedAt?.toDate() || new Date(),
          }
        }))
        setLoading(false)
      })
    })

    // Listen for invitations
    const inviteQ = query(
      collection(db, 'teamInvites'),
      where('invitedBy', '==', user.uid),
      orderBy('sentAt', 'desc')
    )
    const unsub2 = onSnapshot(inviteQ, snap => {
      setInvitations(snap.docs.map(d => {
        const data = d.data()
        return {
          id: d.id,
          email: data.email || '',
          role: data.role || 'User',
          status: data.status || 'pending',
          sentAt: data.sentAt?.toDate() || new Date(),
        }
      }))
    })

    return () => { unsub(); unsub2() }
  }, [user])

  const handleInvite = useCallback(async () => {
    if (!inviteEmail.trim() || !user) return
    setInviting(true)
    try {
      await api.post('/team/invite', {
        email: inviteEmail.trim(),
        role: inviteRole,
      })
      setShowInvite(false)
      setInviteEmail('')
      setInviteRole('User')
    } catch (err) {
      console.error('Failed to invite:', err)
    } finally {
      setInviting(false)
    }
  }, [inviteEmail, inviteRole, user])

  const handleRoleChange = useCallback(async (memberId: string, role: Role) => {
    try {
      await api.put(`/team/members/${memberId}/role`, { role })
    } catch (err) {
      console.error('Failed to update role:', err)
    }
  }, [])

  const handleRemove = useCallback(async (memberId: string) => {
    try {
      await api.delete(`/team/members/${memberId}`)
    } catch (err) {
      console.error('Failed to remove member:', err)
    }
  }, [])

  const handleSaveSettings = useCallback(async () => {
    setSavingSettings(true)
    try {
      await api.post('/team', {
        name: teamName,
        description: teamDescription,
        defaultJiraProject,
        notifyOnFail,
        notifyOnPass,
      })
    } catch (err) {
      console.error('Failed to save settings:', err)
    } finally {
      setSavingSettings(false)
    }
  }, [teamName, teamDescription, defaultJiraProject, notifyOnFail, notifyOnPass])

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Team Management</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage your team members, invitations, and settings
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowHelp(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-body transition-colors"
          >
            <Info size={16} />
            How it works
          </button>
          <button
            onClick={() => setShowInvite(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-accent text-white px-4 py-2 text-sm font-semibold hover:bg-accent/90 transition-colors"
          >
            <UserPlus size={16} />
            Invite Member
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-body p-1 w-fit">
        {[
          { key: 'members' as const, label: 'Members', icon: Users },
          { key: 'invitations' as const, label: 'Invitations', icon: Mail },
          { key: 'settings' as const, label: 'Settings', icon: Settings },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
              tab === t.key ? 'bg-card text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
            )}
          >
            <t.icon size={16} />
            {t.label}
            {t.key === 'invitations' && invitations.filter(i => i.status === 'pending').length > 0 && (
              <span className="ml-1 rounded-full bg-accent text-white text-[10px] font-bold px-1.5 py-0.5 leading-none">
                {invitations.filter(i => i.status === 'pending').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Members Tab */}
      {tab === 'members' && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : (
            <div className="divide-y divide-border">
              {members.map(member => {
                const roleStyle = ROLE_STYLES[member.role]
                return (
                  <div key={member.id} className="flex items-center gap-4 px-6 py-4 hover:bg-body/50 transition-colors">
                    {/* Avatar */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent-light text-sm font-bold">
                      {getInitials(member.name)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-primary truncate">{member.name}</p>
                      <p className="text-xs text-text-secondary truncate">{member.email}</p>
                    </div>

                    {/* Role badge */}
                    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', roleStyle.bg, roleStyle.text)}>
                      <roleStyle.icon size={12} />
                      {member.role}
                    </span>

                    {/* Joined date */}
                    <span className="hidden sm:block text-xs text-text-muted whitespace-nowrap">
                      Joined {member.joinedAt.toLocaleDateString()}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <select
                          value={member.role}
                          onChange={e => handleRoleChange(member.id, e.target.value as Role)}
                          className="appearance-none rounded-lg border border-border bg-body px-3 py-1.5 text-xs font-medium text-text-secondary focus:border-accent outline-none pr-6 transition-colors"
                        >
                          <option value="Admin">Admin</option>
                          <option value="Manager">Manager</option>
                          <option value="User">User</option>
                        </select>
                        <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                      </div>
                      <button
                        onClick={() => handleRemove(member.id)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-status-red hover:bg-status-red/10 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Invitations Tab */}
      {tab === 'invitations' && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {invitations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Mail className="w-10 h-10 text-text-muted mb-3" />
              <p className="text-sm text-text-secondary">No pending invitations.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {invitations.map(inv => (
                <div key={inv.id} className="flex items-center gap-4 px-6 py-4 hover:bg-body/50 transition-colors">
                  <Mail size={18} className="text-text-muted shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{inv.email}</p>
                    <p className="text-xs text-text-secondary">
                      Sent {inv.sentAt.toLocaleDateString()} as {inv.role}
                    </p>
                  </div>
                  <span className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                    inv.status === 'pending' ? 'bg-status-yellow/10 text-status-yellow' :
                    inv.status === 'accepted' ? 'bg-status-green/10 text-status-green' :
                    'bg-status-red/10 text-status-red'
                  )}>
                    {inv.status === 'pending' && <Clock size={12} />}
                    {inv.status === 'accepted' && <CheckCircle2 size={12} />}
                    {inv.status === 'expired' && <XCircle size={12} />}
                    {inv.status}
                  </span>
                  {inv.status === 'pending' && (
                    <div className="flex gap-2">
                      <button className="p-1.5 rounded-lg text-text-muted hover:text-accent hover:bg-accent/10 transition-colors">
                        <RefreshCw size={14} />
                      </button>
                      <button className="p-1.5 rounded-lg text-text-muted hover:text-status-red hover:bg-status-red/10 transition-colors">
                        <XCircle size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {tab === 'settings' && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">Team Name</label>
            <input
              type="text"
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
              className="w-full rounded-lg border border-border bg-body px-4 py-2.5 text-sm text-text-primary focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">Description</label>
            <textarea
              value={teamDescription}
              onChange={e => setTeamDescription(e.target.value)}
              rows={3}
              placeholder="Describe your team..."
              className="w-full rounded-lg border border-border bg-body px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent outline-none resize-none transition-colors"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">Default Jira Project</label>
            <input
              type="text"
              value={defaultJiraProject}
              onChange={e => setDefaultJiraProject(e.target.value)}
              placeholder="e.g., QA, PROJ"
              className="w-full rounded-lg border border-border bg-body px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
            />
          </div>
          <div className="space-y-3">
            <p className="text-sm font-medium text-text-primary">Notification Preferences</p>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyOnFail}
                onChange={e => setNotifyOnFail(e.target.checked)}
                className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
              />
              <span className="text-sm text-text-secondary">Notify on test failure</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyOnPass}
                onChange={e => setNotifyOnPass(e.target.checked)}
                className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
              />
              <span className="text-sm text-text-secondary">Notify on test pass</span>
            </label>
          </div>
          <button
            onClick={handleSaveSettings}
            disabled={savingSettings}
            className="inline-flex items-center gap-2 rounded-lg bg-accent text-white px-5 py-2.5 text-sm font-semibold hover:bg-accent/90 disabled:opacity-50 transition-colors"
          >
            {savingSettings ? <Loader2 size={14} className="animate-spin" /> : <Settings size={16} />}
            Save Settings
          </button>
        </div>
      )}

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowInvite(false)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-sidebar shadow-2xl shadow-black/40 overflow-hidden">
            <div className="px-6 py-5 border-b border-border">
              <h3 className="text-lg font-semibold text-text-primary">Invite Team Member</h3>
              <p className="text-sm text-text-secondary mt-1">Send an invitation to join your team</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">Email Address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="w-full rounded-lg border border-border bg-body px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">Role</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Admin', 'Manager', 'User'] as Role[]).map(r => (
                    <button
                      key={r}
                      onClick={() => setInviteRole(r)}
                      className={cn(
                        'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                        inviteRole === r
                          ? 'border-accent bg-accent/10 text-accent-light'
                          : 'border-border bg-body text-text-secondary hover:bg-card'
                      )}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
              <button
                onClick={() => setShowInvite(false)}
                className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={!inviteEmail.trim() || inviting}
                className="inline-flex items-center gap-2 rounded-lg bg-accent text-white px-5 py-2 text-sm font-semibold hover:bg-accent/90 disabled:opacity-50 transition-colors"
              >
                {inviting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Send Invite
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HowItWorks modal */}
      <HowItWorks steps={howItWorksSteps} isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  )
}
