import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Search,
  LayoutDashboard,
  FileSpreadsheet,
  MessageSquare,
  FileText,
  ScrollText,
  Settings,
  Shield,
  ClipboardList,
  Zap,
  Globe,
  Smartphone,
  BarChart3,
  Database,
  Server,
  Bell,
  GitBranch,
  Eye,
  FileSearch,
  Sparkles,
  FileCheck,
  Flame,
  Camera,
  Shuffle,
  ClipboardCheck,
  BarChart2,
  ShieldCheck,
  FolderOpen,
  Users,
  Video,
  Clock,
  Link2,
  Activity,
  EyeOff,
  FileDown,
  BookOpen,
  Plus,
  Play,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

interface CommandItem {
  id: string
  label: string
  icon: React.ElementType
  path: string
  category: 'pages' | 'actions' | 'recent'
  shortcut?: string
}

const allPages: CommandItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', category: 'pages', shortcut: 'G D' },
  { id: 'excel', label: 'Excel to Jira', icon: FileSpreadsheet, path: '/excel', category: 'pages', shortcut: 'G E' },
  { id: 'teams', label: 'Teams Chat', icon: MessageSquare, path: '/teams', category: 'pages', shortcut: 'G T' },
  { id: 'reports', label: 'Reports', icon: FileText, path: '/reports', category: 'pages', shortcut: 'G R' },
  { id: 'audit', label: 'Audit Log', icon: ScrollText, path: '/audit', category: 'pages' },
  { id: 'test-cases', label: 'Test Cases', icon: ClipboardList, path: '/test-cases', category: 'pages' },
  { id: 'api-runner', label: 'API Runner', icon: Zap, path: '/api-runner', category: 'pages' },
  { id: 'web-runner', label: 'Web Runner', icon: Globe, path: '/web-runner', category: 'pages' },
  { id: 'mobile-runner', label: 'Mobile Runner', icon: Smartphone, path: '/mobile-runner', category: 'pages' },
  { id: 'security', label: 'Security Scanner', icon: Shield, path: '/security', category: 'pages' },
  { id: 'qa-dashboard', label: 'QA Dashboard', icon: BarChart3, path: '/qa-dashboard', category: 'pages' },
  { id: 'recorder', label: 'Test Recorder', icon: Video, path: '/recorder', category: 'pages' },
  { id: 'scheduler', label: 'Test Scheduler', icon: Clock, path: '/scheduler', category: 'pages' },
  { id: 'test-data', label: 'Test Data Generator', icon: Database, path: '/test-data', category: 'pages' },
  { id: 'environments', label: 'Environment Manager', icon: Server, path: '/environments', category: 'pages' },
  { id: 'notifications', label: 'Notifications', icon: Bell, path: '/notifications', category: 'pages' },
  { id: 'cicd', label: 'CI/CD Pipeline', icon: GitBranch, path: '/cicd', category: 'pages' },
  { id: 'accessibility', label: 'Accessibility Testing', icon: Eye, path: '/accessibility', category: 'pages' },
  { id: 'log-analyzer', label: 'Log Analyzer', icon: FileSearch, path: '/log-analyzer', category: 'pages' },
  { id: 'webhooks', label: 'Webhooks', icon: Link2, path: '/webhooks', category: 'pages' },
  { id: 'api-analytics', label: 'API Analytics', icon: Activity, path: '/api-analytics', category: 'pages' },
  { id: 'data-masking', label: 'Data Masking', icon: EyeOff, path: '/data-masking', category: 'pages' },
  { id: 'ai-hub', label: 'AI Hub', icon: Sparkles, path: '/ai-hub', category: 'pages' },
  { id: 'contracts', label: 'Contract Testing', icon: FileCheck, path: '/contracts', category: 'pages' },
  { id: 'chaos', label: 'Chaos Engineering', icon: Flame, path: '/chaos', category: 'pages' },
  { id: 'db-testing', label: 'Database Testing', icon: Database, path: '/db-testing', category: 'pages' },
  { id: 'snapshots', label: 'Snapshot Testing', icon: Camera, path: '/snapshots', category: 'pages' },
  { id: 'flake-analyzer', label: 'Flake Analyzer', icon: Shuffle, path: '/flake-analyzer', category: 'pages' },
  { id: 'compliance', label: 'Compliance', icon: ClipboardCheck, path: '/compliance', category: 'pages' },
  { id: 'coverage', label: 'Coverage Mapper', icon: BarChart2, path: '/coverage', category: 'pages' },
  { id: 'release-gate', label: 'Release Gate', icon: ShieldCheck, path: '/release-gate', category: 'pages' },
  { id: 'pdf-reports', label: 'PDF Reports', icon: FileDown, path: '/pdf-reports', category: 'pages' },
  { id: 'custom-dashboard', label: 'Custom Dashboard', icon: LayoutDashboard, path: '/custom-dashboard', category: 'pages' },
  { id: 'projects', label: 'Projects', icon: FolderOpen, path: '/projects', category: 'pages' },
  { id: 'team', label: 'Team Management', icon: Users, path: '/team', category: 'pages' },
  { id: 'docs', label: 'Documentation', icon: BookOpen, path: '/docs', category: 'pages' },
  { id: 'search', label: 'Global Search', icon: Search, path: '/search', category: 'pages' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/settings', category: 'pages', shortcut: 'G S' },
  { id: 'setup', label: 'Setup Wizard', icon: Shield, path: '/setup', category: 'pages' },
]

const actionItems: CommandItem[] = [
  { id: 'new-test', label: 'Create Test Case', icon: Plus, path: '/test-cases', category: 'actions', shortcut: 'N T' },
  { id: 'new-api', label: 'New API Collection', icon: Plus, path: '/api-runner', category: 'actions', shortcut: 'N A' },
  { id: 'run-security', label: 'Run Security Scan', icon: Play, path: '/security', category: 'actions' },
  { id: 'run-web-test', label: 'Run Web Test', icon: Play, path: '/web-runner', category: 'actions' },
  { id: 'run-mobile-test', label: 'Run Mobile Test', icon: Play, path: '/mobile-runner', category: 'actions' },
  { id: 'generate-data', label: 'Generate Test Data', icon: Database, path: '/test-data', category: 'actions' },
  { id: 'view-reports', label: 'View Reports', icon: FileText, path: '/reports', category: 'actions' },
  { id: 'start-recording', label: 'Start Test Recording', icon: Video, path: '/recorder', category: 'actions' },
]

const RECENT_KEY = 'commandPalette_recentPages'

function getRecentPages(): CommandItem[] {
  try {
    const stored = localStorage.getItem(RECENT_KEY)
    if (!stored) return []
    const ids: string[] = JSON.parse(stored)
    return ids
      .map((id) => {
        const page = allPages.find((p) => p.id === id)
        return page ? { ...page, category: 'recent' as const } : null
      })
      .filter(Boolean) as CommandItem[]
  } catch {
    return []
  }
}

function addRecentPage(pageId: string) {
  try {
    const stored = localStorage.getItem(RECENT_KEY)
    let ids: string[] = stored ? JSON.parse(stored) : []
    ids = [pageId, ...ids.filter((id) => id !== pageId)].slice(0, 5)
    localStorage.setItem(RECENT_KEY, JSON.stringify(ids))
  } catch {
    // ignore
  }
}

function fuzzyMatch(text: string, query: string): boolean {
  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  let qi = 0
  for (let ti = 0; ti < lowerText.length && qi < lowerQuery.length; ti++) {
    if (lowerText[ti] === lowerQuery[qi]) qi++
  }
  return qi === lowerQuery.length
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const location = useLocation()

  // Track recent pages on location change
  useEffect(() => {
    const page = allPages.find((p) => p.path === location.pathname)
    if (page) addRecentPage(page.id)
  }, [location.pathname])

  // Focus input and reset state when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  const filteredResults = useMemo(() => {
    const recentPages = getRecentPages()

    if (!query.trim()) {
      const groups: { category: string; items: CommandItem[] }[] = []
      if (recentPages.length > 0) {
        groups.push({ category: 'Recent', items: recentPages })
      }
      groups.push({ category: 'Pages', items: allPages.slice(0, 8) })
      groups.push({ category: 'Actions', items: actionItems })
      return groups
    }

    const matchedPages = allPages.filter((item) => fuzzyMatch(item.label, query))
    const matchedActions = actionItems.filter((item) => fuzzyMatch(item.label, query))

    const groups: { category: string; items: CommandItem[] }[] = []
    if (matchedPages.length > 0) groups.push({ category: 'Pages', items: matchedPages })
    if (matchedActions.length > 0) groups.push({ category: 'Actions', items: matchedActions })
    return groups
  }, [query])

  const flatItems = useMemo(
    () => filteredResults.flatMap((g) => g.items),
    [filteredResults]
  )

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [flatItems.length])

  const handleSelect = useCallback(
    (item: CommandItem) => {
      addRecentPage(item.id)
      navigate(item.path)
      onClose()
    },
    [navigate, onClose]
  )

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, flatItems.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (flatItems[selectedIndex]) {
          handleSelect(flatItems[selectedIndex])
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, flatItems, selectedIndex, handleSelect, onClose])

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return
    const selected = listRef.current.querySelector('[data-selected="true"]')
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  if (!isOpen) return null

  let globalIndex = 0

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-xl rounded-2xl border border-border bg-sidebar shadow-2xl shadow-black/40 overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search size={18} className="shrink-0 text-text-secondary" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, actions..."
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-md border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[360px] overflow-y-auto py-2">
          {flatItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-text-muted">
              No results found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            filteredResults.map((group) => (
              <div key={group.category} className="mb-1">
                <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                  {group.category}
                </p>
                {group.items.map((item) => {
                  const idx = globalIndex++
                  const isSelected = idx === selectedIndex
                  return (
                    <button
                      key={`${item.category}-${item.id}`}
                      data-selected={isSelected}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                        isSelected
                          ? 'bg-accent-bg text-accent-light'
                          : 'text-text-secondary hover:bg-card hover:text-text-primary'
                      )}
                    >
                      <item.icon size={16} className="shrink-0" />
                      <span className="flex-1 text-left font-medium">{item.label}</span>
                      {item.category === 'actions' && (
                        <ArrowRight size={14} className="shrink-0 opacity-50" />
                      )}
                      {item.shortcut && (
                        <span className="flex items-center gap-1">
                          {item.shortcut.split(' ').map((key, i) => (
                            <kbd
                              key={i}
                              className="inline-flex items-center justify-center rounded border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium text-text-muted"
                            >
                              {key}
                            </kbd>
                          ))}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[10px] text-text-muted">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-card px-1 py-0.5 font-medium">&#8593;</kbd>
              <kbd className="rounded border border-border bg-card px-1 py-0.5 font-medium">&#8595;</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-card px-1 py-0.5 font-medium">&#9166;</kbd>
              select
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-card px-1 py-0.5 font-medium">esc</kbd>
            close
          </span>
        </div>
      </div>
    </div>
  )
}
