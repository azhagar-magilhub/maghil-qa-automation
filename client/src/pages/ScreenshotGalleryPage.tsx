import { useState, useEffect } from 'react'
import {
  Image, Search, X, Info, ArrowRight, Filter, Columns2,
  CheckCircle2, XCircle, Calendar, Monitor, Smartphone as Phone,
  ChevronLeft, ChevronRight, ZoomIn
} from 'lucide-react'
import {
  collection, query, where, orderBy, onSnapshot, Timestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'
import HowItWorks from '@/components/shared/HowItWorks'

// ─── Types ──────────────────────────────────────────────────────────────────

interface ScreenshotEntry {
  id: string
  testName: string
  screenshotUrl: string
  status: 'pass' | 'fail'
  testType: 'Web' | 'Mobile' | 'Security'
  browser?: string
  device?: string
  createdAt: Date
}

// ─── How It Works ───────────────────────────────────────────────────────────

const howItWorksSteps = [
  {
    title: 'Browse Screenshots',
    description: 'View all test screenshots in a clean grid layout. Each card shows the test name, status, and execution details.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Image className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Gallery</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <ZoomIn className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Preview</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Filter by Type',
    description: 'Narrow down screenshots by test type (Web, Mobile, Security), status (Pass/Fail), or date range.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Filter className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Filter</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Results</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Compare Side-by-Side',
    description: 'Select two screenshots and compare them side-by-side to identify visual differences between test runs.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Columns2 className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Compare</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Diff</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Annotate',
    description: 'Click any screenshot to open the lightbox view. View full-size images with detailed test information.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <ZoomIn className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Open</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Image className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Full Size</span>
        </div>
      </div>
    ),
  },
]

// ─── Component ──────────────────────────────────────────────────────────────

export default function ScreenshotGalleryPage() {
  const { user } = useAuthStore()
  const [showHelp, setShowHelp] = useState(false)

  // Data
  const [screenshots, setScreenshots] = useState<ScreenshotEntry[]>([])

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Lightbox
  const [lightboxItem, setLightboxItem] = useState<ScreenshotEntry | null>(null)

  // Compare mode
  const [compareMode, setCompareMode] = useState(false)
  const [compareIds, setCompareIds] = useState<string[]>([])

  // ─── Load screenshots from testExecutions ─────────────────────────────

  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'testExecutions'),
      orderBy('createdAt', 'desc')
    )
    const unsub = onSnapshot(q, (snap) => {
      const items: ScreenshotEntry[] = []
      snap.docs.forEach((d) => {
        const data = d.data()
        if (!data.screenshotUrl) return
        items.push({
          id: d.id,
          testName: data.testName || data.name || 'Untitled Test',
          screenshotUrl: data.screenshotUrl,
          status: data.status === 'pass' || data.status === 'passed' ? 'pass' : 'fail',
          testType: data.testType || data.type || 'Web',
          browser: data.browser || data.browserName,
          device: data.device || data.deviceName,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
        })
      })
      setScreenshots(items)
    })
    return unsub
  }, [user])

  // ─── Filtering ────────────────────────────────────────────────────────

  const filtered = screenshots.filter((s) => {
    if (searchQuery && !s.testName.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (filterType && s.testType !== filterType) return false
    if (filterStatus && s.status !== filterStatus) return false
    if (dateFrom && s.createdAt < new Date(dateFrom)) return false
    if (dateTo) {
      const end = new Date(dateTo)
      end.setDate(end.getDate() + 1)
      if (s.createdAt >= end) return false
    }
    return true
  })

  // ─── Compare helpers ──────────────────────────────────────────────────

  const toggleCompareSelect = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 2) return [prev[1], id]
      return [...prev, id]
    })
  }

  const compareItems = compareIds.map((id) => screenshots.find((s) => s.id === id)).filter(Boolean) as ScreenshotEntry[]

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <>
      <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10">
              <Image className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-text-primary">Screenshot Gallery</h1>
              <p className="text-xs text-text-secondary">{filtered.length} screenshots</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setCompareMode(!compareMode); setCompareIds([]) }}
              className={cn(
                'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                compareMode
                  ? 'bg-accent text-white'
                  : 'border border-border text-text-secondary hover:text-text-primary hover:bg-card'
              )}
            >
              <Columns2 size={16} />
              {compareMode ? 'Exit Compare' : 'Compare'}
            </button>
            <button
              onClick={() => setShowHelp(true)}
              className="flex items-center gap-2 rounded-full border border-border-subtle px-4 py-1.5 text-sm text-text-secondary hover:text-text-primary transition"
            >
              <Info className="h-4 w-4" /> How it works
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 px-6 py-3 border-b border-border">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by test name..."
              className="w-full rounded-lg border border-border bg-card pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="">All Types</option>
            <option value="Web">Web</option>
            <option value="Mobile">Mobile</option>
            <option value="Security">Security</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="">All Statuses</option>
            <option value="pass">Pass</option>
            <option value="fail">Fail</option>
          </select>
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-text-secondary" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <span className="text-text-secondary text-sm">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>

        {/* Compare banner */}
        {compareMode && (
          <div className="px-6 py-2 bg-accent/5 border-b border-border">
            <p className="text-sm text-accent-light">
              Select 2 screenshots to compare. {compareIds.length}/2 selected.
              {compareIds.length === 2 && (
                <button
                  onClick={() => setCompareIds([])}
                  className="ml-3 text-xs underline text-text-secondary hover:text-text-primary"
                >
                  Reset
                </button>
              )}
            </p>
          </div>
        )}

        {/* Grid */}
        <div className="flex-1 overflow-auto p-6">
          {/* Side-by-side compare view */}
          {compareMode && compareItems.length === 2 ? (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Side-by-Side Comparison</h3>
              <div className="grid grid-cols-2 gap-6">
                {compareItems.map((item) => (
                  <div key={item.id} className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="aspect-video bg-body flex items-center justify-center overflow-hidden">
                      <img
                        src={item.screenshotUrl}
                        alt={item.testName}
                        className="w-full h-full object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).src = '' }}
                      />
                    </div>
                    <div className="p-4 space-y-2">
                      <p className="text-sm font-medium text-text-primary truncate">{item.testName}</p>
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          'rounded-full px-2.5 py-0.5 text-xs font-medium',
                          item.status === 'pass' ? 'bg-status-green/20 text-status-green' : 'bg-status-red/20 text-status-red'
                        )}>
                          {item.status === 'pass' ? 'Pass' : 'Fail'}
                        </span>
                        <span className="text-xs text-text-secondary">{item.testType}</span>
                        <span className="text-xs text-text-secondary">
                          {item.createdAt.toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Image className="h-12 w-12 text-text-secondary/40 mb-3" />
                  <p className="text-text-secondary">No screenshots found</p>
                  <p className="text-text-secondary/60 text-sm mt-1">
                    Screenshots appear here when tests capture them during execution
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filtered.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => compareMode ? toggleCompareSelect(item.id) : setLightboxItem(item)}
                      className={cn(
                        'group rounded-xl border bg-card overflow-hidden cursor-pointer transition-all hover:border-accent/40 hover:shadow-lg hover:shadow-black/10',
                        compareMode && compareIds.includes(item.id)
                          ? 'border-accent ring-2 ring-accent/30'
                          : 'border-border'
                      )}
                    >
                      {/* Thumbnail */}
                      <div className="aspect-video bg-body relative overflow-hidden">
                        <img
                          src={item.screenshotUrl}
                          alt={item.testName}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                          }}
                        />
                        {/* Zoom overlay */}
                        {!compareMode && (
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                            <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                        {/* Compare checkbox */}
                        {compareMode && (
                          <div className="absolute top-2 right-2">
                            <div className={cn(
                              'w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors',
                              compareIds.includes(item.id)
                                ? 'bg-accent border-accent text-white'
                                : 'border-white/60 bg-black/20'
                            )}>
                              {compareIds.includes(item.id) && (
                                <CheckCircle2 size={14} />
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-3 space-y-2">
                        <p className="text-sm font-medium text-text-primary truncate">{item.testName}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn(
                            'rounded-full px-2 py-0.5 text-xs font-medium',
                            item.status === 'pass' ? 'bg-status-green/20 text-status-green' : 'bg-status-red/20 text-status-red'
                          )}>
                            {item.status === 'pass' ? 'Pass' : 'Fail'}
                          </span>
                          <span className="rounded-full bg-sidebar px-2 py-0.5 text-xs text-text-secondary">
                            {item.testType}
                          </span>
                          {item.browser && (
                            <span className="flex items-center gap-1 text-xs text-text-secondary">
                              <Monitor size={10} /> {item.browser}
                            </span>
                          )}
                          {item.device && (
                            <span className="flex items-center gap-1 text-xs text-text-secondary">
                              <Phone size={10} /> {item.device}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-text-secondary">
                          {item.createdAt.toLocaleDateString()} at {item.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80" onClick={() => setLightboxItem(null)} />
          <div className="relative z-10 max-w-5xl w-full max-h-[90vh] flex flex-col">
            {/* Close button */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold text-white">{lightboxItem.testName}</h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className={cn(
                    'rounded-full px-2.5 py-0.5 text-xs font-medium',
                    lightboxItem.status === 'pass' ? 'bg-status-green/20 text-status-green' : 'bg-status-red/20 text-status-red'
                  )}>
                    {lightboxItem.status === 'pass' ? 'Pass' : 'Fail'}
                  </span>
                  <span className="text-sm text-white/60">{lightboxItem.testType}</span>
                  {lightboxItem.browser && <span className="text-sm text-white/60">{lightboxItem.browser}</span>}
                  {lightboxItem.device && <span className="text-sm text-white/60">{lightboxItem.device}</span>}
                  <span className="text-sm text-white/60">
                    {lightboxItem.createdAt.toLocaleDateString()} {lightboxItem.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setLightboxItem(null)}
                className="rounded-full p-2 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Image */}
            <div className="flex-1 min-h-0 rounded-xl overflow-hidden bg-black/40 flex items-center justify-center">
              <img
                src={lightboxItem.screenshotUrl}
                alt={lightboxItem.testName}
                className="max-w-full max-h-[75vh] object-contain"
              />
            </div>

            {/* Nav */}
            <div className="flex items-center justify-center gap-4 mt-3">
              <button
                onClick={() => {
                  const idx = filtered.findIndex((s) => s.id === lightboxItem.id)
                  if (idx > 0) setLightboxItem(filtered[idx - 1])
                }}
                disabled={filtered.findIndex((s) => s.id === lightboxItem.id) === 0}
                className="rounded-full p-2 text-white/60 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-sm text-white/60">
                {filtered.findIndex((s) => s.id === lightboxItem.id) + 1} / {filtered.length}
              </span>
              <button
                onClick={() => {
                  const idx = filtered.findIndex((s) => s.id === lightboxItem.id)
                  if (idx < filtered.length - 1) setLightboxItem(filtered[idx + 1])
                }}
                disabled={filtered.findIndex((s) => s.id === lightboxItem.id) === filtered.length - 1}
                className="rounded-full p-2 text-white/60 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      <HowItWorks steps={howItWorksSteps} isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  )
}
