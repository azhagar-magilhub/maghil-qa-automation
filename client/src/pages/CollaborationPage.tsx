import { useState, useEffect, useRef } from 'react'
import {
  Users, MessageSquare, Activity, Lock, Unlock, Send,
  ArrowRight, Circle, Clock, Info, Loader2, FileText, AtSign,
} from 'lucide-react'
import {
  collection, query, where, orderBy, onSnapshot, doc,
  setDoc, serverTimestamp, limit, Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/auth.store'
import { usePresence, type PresenceUser } from '@/hooks/usePresence'
import { cn } from '@/lib/utils'
import HowItWorks from '@/components/shared/HowItWorks'

// ─── HowItWorks Steps ───────────────────────────────────────────────────────

const howItWorksSteps = [
  {
    title: 'See Who\'s Online',
    description: 'View all team members currently active on the platform with their current page and last seen time.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Users className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Online</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Circle className="w-6 h-6 text-status-green fill-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Active</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Collaborate on Tests',
    description: 'See which test cases and collections others are editing in real time. Lock indicators prevent conflicts.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Lock className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Editing</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Unlock className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Available</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Share Notes',
    description: 'Use real-time shared notepads per test suite. Notes sync instantly via Firestore so everyone sees changes live.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <FileText className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Write</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Send className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Synced</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Track Activity',
    description: 'View a live stream of all team actions — test runs, bug filings, configuration changes, and more.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Activity className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Actions</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Clock className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Timeline</span>
        </div>
      </div>
    ),
  },
]

// ─── Page name map ──────────────────────────────────────────────────────────

const pageNames: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/test-cases': 'Test Cases',
  '/api-runner': 'API Runner',
  '/web-runner': 'Web Runner',
  '/mobile-runner': 'Mobile Runner',
  '/security': 'Security Scanner',
  '/qa-dashboard': 'QA Dashboard',
  '/collaboration': 'Collaboration',
  '/test-priority': 'Test Priority',
  '/root-cause': 'Root Cause',
  '/mock-server': 'Mock Server',
  '/test-metrics': 'Test Metrics',
  '/settings': 'Settings',
  '/reports': 'Reports',
}

function getPageLabel(path: string) {
  return pageNames[path] || path.replace('/', '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface AuditLog {
  id: string
  action: string
  userName: string
  details?: string
  createdAt: Timestamp | null
}

interface SharedNote {
  content: string
  lastEditor: string
  updatedAt: Timestamp | null
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function CollaborationPage() {
  const { user, profile } = useAuthStore()
  const { onlineUsers } = usePresence()
  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const [activityLogs, setActivityLogs] = useState<AuditLog[]>([])
  const [selectedSuiteId, setSelectedSuiteId] = useState('default')
  const [noteContent, setNoteContent] = useState('')
  const [noteSaving, setNoteSaving] = useState(false)
  const [suiteIds] = useState(['default', 'regression', 'smoke', 'integration', 'e2e'])
  const noteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Listen to audit logs for activity feed
  useEffect(() => {
    const q = query(
      collection(db, 'auditLogs'),
      orderBy('createdAt', 'desc'),
      limit(30)
    )
    const unsub = onSnapshot(q, (snap) => {
      const logs: AuditLog[] = []
      snap.forEach((d) => {
        logs.push({ id: d.id, ...d.data() } as AuditLog)
      })
      setActivityLogs(logs)
    })
    return () => unsub()
  }, [])

  // Listen to shared note for selected suite
  useEffect(() => {
    const noteRef = doc(db, 'sharedNotes', selectedSuiteId)
    const unsub = onSnapshot(noteRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as SharedNote
        setNoteContent(data.content || '')
      } else {
        setNoteContent('')
      }
    })
    return () => unsub()
  }, [selectedSuiteId])

  // Debounced note save
  const handleNoteChange = (value: string) => {
    setNoteContent(value)
    if (noteTimeoutRef.current) clearTimeout(noteTimeoutRef.current)
    noteTimeoutRef.current = setTimeout(async () => {
      setNoteSaving(true)
      try {
        await setDoc(doc(db, 'sharedNotes', selectedSuiteId), {
          content: value,
          lastEditor: profile?.fullName || user?.displayName || 'Unknown',
          updatedAt: serverTimestamp(),
        }, { merge: true })
      } catch (err) {
        console.error('Failed to save note:', err)
      }
      setNoteSaving(false)
    }, 600)
  }

  // Highlight @mentions in text
  const renderMentions = (text: string) => {
    const parts = text.split(/(@\w+)/g)
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} className="bg-accent/20 text-accent-light rounded px-1 font-medium">
            {part}
          </span>
        )
      }
      return <span key={i}>{part}</span>
    })
  }

  const formatTime = (ts: Timestamp | null) => {
    if (!ts) return 'just now'
    const d = ts.toDate()
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return 'just now'
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHr = Math.floor(diffMin / 60)
    if (diffHr < 24) return `${diffHr}h ago`
    return d.toLocaleDateString()
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Real-Time Collaboration</h1>
          <p className="text-sm text-text-secondary mt-1">
            See who is online, share notes, and track team activity in real time
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 rounded-lg bg-status-green/10 px-3 py-1.5 text-sm text-status-green font-medium">
            <Circle className="w-2.5 h-2.5 fill-status-green" />
            {onlineUsers.length} Online
          </span>
          <button
            onClick={() => setShowHowItWorks(true)}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-card/80 transition-colors"
          >
            <Info size={16} />
            How It Works
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Online Users Panel ─────────────────────────────── */}
        <div className="lg:col-span-1 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users size={18} className="text-accent" />
            <h2 className="text-base font-semibold text-text-primary">Online Users</h2>
          </div>

          {onlineUsers.length === 0 ? (
            <p className="text-sm text-text-muted py-6 text-center">No users online</p>
          ) : (
            <ul className="space-y-3">
              {onlineUsers.map((u) => (
                <li key={u.userId} className="flex items-center gap-3 rounded-lg bg-body p-3">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    {u.avatarUrl ? (
                      <img src={u.avatarUrl} alt={u.displayName} className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent">
                        {getInitials(u.displayName)}
                      </div>
                    )}
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-status-green border-2 border-card" />
                  </div>
                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {u.displayName}
                      {u.userId === user?.uid && (
                        <span className="ml-1.5 text-[10px] font-semibold text-accent-light">(you)</span>
                      )}
                    </p>
                    <p className="text-xs text-text-muted truncate flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent/40" />
                      {getPageLabel(u.currentPage)}
                    </p>
                  </div>
                  {/* Last seen */}
                  <span className="text-[10px] text-text-muted whitespace-nowrap">
                    {formatTime(u.lastSeen)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {/* Live Cursors Concept — editing indicators */}
          <div className="mt-5 pt-4 border-t border-border">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">Editing Activity</h3>
            {onlineUsers.filter(u => u.currentPage === '/test-cases' && u.userId !== user?.uid).length > 0 ? (
              <ul className="space-y-2">
                {onlineUsers
                  .filter(u => u.currentPage === '/test-cases' && u.userId !== user?.uid)
                  .map((u) => (
                    <li key={u.userId} className="flex items-center gap-2 text-sm text-text-secondary">
                      <Lock size={14} className="text-status-amber shrink-0" />
                      <span className="truncate">
                        <span className="font-medium text-text-primary">{u.displayName}</span>
                        {' '}is editing Test Cases
                      </span>
                    </li>
                  ))}
              </ul>
            ) : (
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <Unlock size={14} />
                <span>No active edits</span>
              </div>
            )}
          </div>
        </div>

        {/* ─── Middle column: Shared Notes ───────────────────── */}
        <div className="lg:col-span-1 rounded-xl border border-border bg-card p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MessageSquare size={18} className="text-accent" />
              <h2 className="text-base font-semibold text-text-primary">Shared Notes</h2>
            </div>
            {noteSaving && (
              <span className="flex items-center gap-1.5 text-xs text-text-muted">
                <Loader2 size={12} className="animate-spin" />
                Saving...
              </span>
            )}
          </div>

          {/* Suite selector */}
          <div className="flex gap-1.5 mb-4 flex-wrap">
            {suiteIds.map((sid) => (
              <button
                key={sid}
                onClick={() => setSelectedSuiteId(sid)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors capitalize',
                  selectedSuiteId === sid
                    ? 'bg-accent text-white'
                    : 'bg-body text-text-secondary hover:text-text-primary'
                )}
              >
                {sid}
              </button>
            ))}
          </div>

          {/* Notepad */}
          <textarea
            value={noteContent}
            onChange={(e) => handleNoteChange(e.target.value)}
            placeholder="Type shared notes here... Use @name to mention team members"
            className="flex-1 min-h-[240px] rounded-lg border border-border bg-body p-3 text-sm text-text-primary placeholder-text-muted resize-none focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
          />

          {/* Mention hint */}
          <div className="mt-3 flex items-center gap-1.5 text-xs text-text-muted">
            <AtSign size={12} />
            <span>Use @name to mention team members in notes</span>
          </div>

          {/* Preview mentions */}
          {noteContent.includes('@') && (
            <div className="mt-3 rounded-lg bg-body border border-border p-3">
              <p className="text-xs font-medium text-text-muted mb-1">Preview</p>
              <p className="text-sm text-text-secondary leading-relaxed">
                {renderMentions(noteContent.slice(0, 200))}
                {noteContent.length > 200 && <span className="text-text-muted">...</span>}
              </p>
            </div>
          )}
        </div>

        {/* ─── Activity Feed ─────────────────────────────────── */}
        <div className="lg:col-span-1 rounded-xl border border-border bg-card p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={18} className="text-accent" />
            <h2 className="text-base font-semibold text-text-primary">Activity Feed</h2>
          </div>

          {activityLogs.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-10">
              <p className="text-sm text-text-muted">No recent activity</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto max-h-[500px] space-y-1">
              {activityLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-body transition-colors"
                >
                  <div className="mt-1 w-2 h-2 rounded-full bg-accent shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-text-primary leading-snug">
                      <span className="font-medium">{log.userName || 'System'}</span>
                      {' '}{log.action}
                    </p>
                    {log.details && (
                      <p className="text-xs text-text-muted mt-0.5 truncate">{log.details}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-text-muted whitespace-nowrap mt-0.5">
                    {formatTime(log.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <HowItWorks steps={howItWorksSteps} isOpen={showHowItWorks} onClose={() => setShowHowItWorks(false)} />
    </div>
  )
}
