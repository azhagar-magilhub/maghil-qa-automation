import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  ClipboardList,
  Zap,
  Shield,
  ScrollText,
  FileSpreadsheet,
  Play,
  ArrowRight,
  Info,
  Loader2,
  FileText,
  Database,
} from 'lucide-react'
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'
import HowItWorks, { type HowItWorksStep } from '@/components/shared/HowItWorks'

// ---------- Types ----------
interface SearchResult {
  id: string
  title: string
  type: 'Test Suite' | 'API Collection' | 'Test Execution' | 'Security Scan' | 'Ticket Batch' | 'Audit Log'
  date: Date | null
  path: string
}

const typeBadgeStyles: Record<string, string> = {
  'Test Suite': 'bg-accent/10 text-accent-light',
  'API Collection': 'bg-status-blue/10 text-status-blue',
  'Test Execution': 'bg-status-green/10 text-status-green',
  'Security Scan': 'bg-status-red/10 text-status-red',
  'Ticket Batch': 'bg-status-yellow/10 text-status-yellow',
  'Audit Log': 'bg-card text-text-secondary',
}

const typeIcons: Record<string, React.ElementType> = {
  'Test Suite': ClipboardList,
  'API Collection': Zap,
  'Test Execution': Play,
  'Security Scan': Shield,
  'Ticket Batch': FileSpreadsheet,
  'Audit Log': ScrollText,
}

// ---------- How It Works steps ----------
const howItWorksSteps: HowItWorksStep[] = [
  {
    title: 'Type Your Query',
    description: 'Enter keywords to search across all your test suites, API collections, security scans, tickets, and more.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Search className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Type query</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Browse Results',
    description: 'Results are grouped by type with color-coded badges so you can quickly find what you need.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <FileText className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Results</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Database className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Grouped</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Navigate to Item',
    description: 'Click any result to jump directly to that item. Easy and fast.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <ArrowRight className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Navigate</span>
        </div>
      </div>
    ),
  },
]

// ---------- Component ----------
export default function GlobalSearchPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [showHowItWorks, setShowHowItWorks] = useState(false)

  const doSearch = useCallback(
    async (q: string) => {
      if (!user || !q.trim()) {
        setResults([])
        setHasSearched(false)
        return
      }

      setLoading(true)
      setHasSearched(true)

      const lowerQ = q.toLowerCase()
      const found: SearchResult[] = []

      try {
        // Search testSuites
        const suitesSnap = await getDocs(
          query(collection(db, 'testSuites'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'), limit(50))
        )
        suitesSnap.forEach((doc) => {
          const d = doc.data()
          if (d.name?.toLowerCase().includes(lowerQ)) {
            found.push({
              id: doc.id,
              title: d.name,
              type: 'Test Suite',
              date: d.createdAt instanceof Timestamp ? d.createdAt.toDate() : null,
              path: '/test-cases',
            })
          }
        })

        // Search apiCollections
        const apiSnap = await getDocs(
          query(collection(db, 'apiCollections'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'), limit(50))
        )
        apiSnap.forEach((doc) => {
          const d = doc.data()
          if (d.name?.toLowerCase().includes(lowerQ)) {
            found.push({
              id: doc.id,
              title: d.name,
              type: 'API Collection',
              date: d.createdAt instanceof Timestamp ? d.createdAt.toDate() : null,
              path: '/api-runner',
            })
          }
        })

        // Search testExecutions
        const execSnap = await getDocs(
          query(collection(db, 'testExecutions'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'), limit(50))
        )
        execSnap.forEach((doc) => {
          const d = doc.data()
          const title = d.name || d.suiteName || d.type || 'Test Execution'
          if (title.toLowerCase().includes(lowerQ)) {
            found.push({
              id: doc.id,
              title,
              type: 'Test Execution',
              date: d.createdAt instanceof Timestamp ? d.createdAt.toDate() : null,
              path: '/qa-dashboard',
            })
          }
        })

        // Search securityScans
        const secSnap = await getDocs(
          query(collection(db, 'securityScans'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'), limit(50))
        )
        secSnap.forEach((doc) => {
          const d = doc.data()
          const title = d.targetUrl || d.name || 'Security Scan'
          if (title.toLowerCase().includes(lowerQ)) {
            found.push({
              id: doc.id,
              title,
              type: 'Security Scan',
              date: d.createdAt instanceof Timestamp ? d.createdAt.toDate() : null,
              path: '/security',
            })
          }
        })

        // Search ticketBatches
        const batchSnap = await getDocs(
          query(collection(db, 'ticketBatches'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'), limit(50))
        )
        batchSnap.forEach((doc) => {
          const d = doc.data()
          const title = d.fileName || d.name || 'Ticket Batch'
          if (title.toLowerCase().includes(lowerQ)) {
            found.push({
              id: doc.id,
              title,
              type: 'Ticket Batch',
              date: d.createdAt instanceof Timestamp ? d.createdAt.toDate() : null,
              path: '/excel',
            })
          }
        })

        // Search auditLogs
        const auditSnap = await getDocs(
          query(collection(db, 'auditLogs'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'), limit(50))
        )
        auditSnap.forEach((doc) => {
          const d = doc.data()
          const title = d.action || d.message || 'Audit Entry'
          if (title.toLowerCase().includes(lowerQ)) {
            found.push({
              id: doc.id,
              title,
              type: 'Audit Log',
              date: d.createdAt instanceof Timestamp ? d.createdAt.toDate() : null,
              path: '/audit',
            })
          }
        })
      } catch (err) {
        console.error('Search error:', err)
      }

      setResults(found)
      setLoading(false)
    },
    [user]
  )

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([])
      setHasSearched(false)
      return
    }

    const timer = setTimeout(() => {
      doSearch(searchQuery)
    }, 400)

    return () => clearTimeout(timer)
  }, [searchQuery, doSearch])

  // Group results by type
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, item) => {
    if (!acc[item.type]) acc[item.type] = []
    acc[item.type].push(item)
    return acc
  }, {})

  const formatDate = (date: Date | null) => {
    if (!date) return ''
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Global Search</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Search across tests, tickets, scans, and more
          </p>
        </div>
        <button
          onClick={() => setShowHowItWorks(true)}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-text-secondary hover:bg-card hover:text-text-primary transition-colors"
        >
          <Info size={16} />
          How It Works
        </button>
      </div>

      {/* Search input */}
      <div className="relative">
        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search across tests, tickets, scans, and more..."
          className="w-full rounded-xl border border-border bg-card py-4 pl-12 pr-4 text-base text-text-primary placeholder:text-text-muted outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
          autoFocus
        />
        {loading && (
          <Loader2 size={18} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-accent" />
        )}
      </div>

      {/* Results */}
      {!hasSearched && !searchQuery.trim() && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 mb-4">
            <Search size={28} className="text-accent" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary">Search across everything</h3>
          <p className="mt-1 max-w-sm text-sm text-text-secondary">
            Search across tests, tickets, scans, and more. Start typing to find what you need.
          </p>
        </div>
      )}

      {hasSearched && !loading && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-card mb-4">
            <Search size={28} className="text-text-muted" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary">No results found</h3>
          <p className="mt-1 max-w-sm text-sm text-text-secondary">
            Try a different search term or check your spelling.
          </p>
        </div>
      )}

      {Object.keys(grouped).length > 0 && (
        <div className="space-y-6">
          {Object.entries(grouped).map(([type, items]) => {
            const Icon = typeIcons[type] || FileText
            return (
              <div key={type}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon size={16} className="text-text-secondary" />
                  <h2 className="text-sm font-semibold text-text-primary">{type}</h2>
                  <span className="rounded-full bg-card px-2 py-0.5 text-[10px] font-medium text-text-muted">
                    {items.length}
                  </span>
                </div>
                <div className="space-y-1">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => navigate(item.path)}
                      className="flex w-full items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-left hover:border-accent/30 hover:bg-accent-bg transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate group-hover:text-accent-light transition-colors">
                          {item.title}
                        </p>
                        {item.date && (
                          <p className="mt-0.5 text-[11px] text-text-muted">
                            {formatDate(item.date)}
                          </p>
                        )}
                      </div>
                      <span
                        className={cn(
                          'shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                          typeBadgeStyles[item.type] ?? 'bg-card text-text-secondary'
                        )}
                      >
                        {item.type}
                      </span>
                      <ArrowRight size={14} className="shrink-0 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* How It Works modal */}
      <HowItWorks
        steps={howItWorksSteps}
        isOpen={showHowItWorks}
        onClose={() => setShowHowItWorks(false)}
      />
    </div>
  )
}
