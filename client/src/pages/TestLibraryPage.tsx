import { useState, useEffect } from 'react'
import {
  Library, Plus, Search, X, Info, ArrowRight, Copy, Code,
  FolderOpen, BookOpen, CheckCircle2, Heart, HeartOff,
  FileCode2, Braces, Hash
} from 'lucide-react'
import {
  collection, doc, addDoc, updateDoc, deleteDoc, query, orderBy,
  onSnapshot, serverTimestamp, Timestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'
import HowItWorks from '@/components/shared/HowItWorks'

// ─── Types ──────────────────────────────────────────────────────────────────

type SnippetCategory = 'Login Flows' | 'API Auth' | 'Form Validation' | 'Navigation' | 'Data Setup' | 'Assertions'
type SnippetLanguage = 'JavaScript' | 'TypeScript' | 'Python'

interface TestSnippet {
  id: string
  title: string
  description: string
  category: SnippetCategory
  language: SnippetLanguage
  code: string
  userId: string
  createdAt: Date
}

const CATEGORIES: SnippetCategory[] = ['Login Flows', 'API Auth', 'Form Validation', 'Navigation', 'Data Setup', 'Assertions']
const LANGUAGES: SnippetLanguage[] = ['JavaScript', 'TypeScript', 'Python']

const CATEGORY_ICONS: Record<SnippetCategory, React.ReactNode> = {
  'Login Flows': <FolderOpen size={14} />,
  'API Auth': <Braces size={14} />,
  'Form Validation': <CheckCircle2 size={14} />,
  'Navigation': <ArrowRight size={14} />,
  'Data Setup': <Hash size={14} />,
  'Assertions': <FileCode2 size={14} />,
}

const LANG_COLORS: Record<SnippetLanguage, string> = {
  JavaScript: 'bg-yellow-500/20 text-yellow-400',
  TypeScript: 'bg-blue-500/20 text-blue-400',
  Python: 'bg-green-500/20 text-green-400',
}

// ─── How It Works ───────────────────────────────────────────────────────────

const howItWorksSteps = [
  {
    title: 'Browse Library',
    description: 'Explore a shared library of reusable test snippets organized by category. Search and filter to find what you need.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Library className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Browse</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Search className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Find</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Create Snippets',
    description: 'Add new test snippets with a title, description, category, language, and code. Share reusable components with your team.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Plus className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Create</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Code className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Code</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Copy & Use',
    description: 'Click the copy button to copy any snippet to your clipboard. Paste it directly into your test editor or IDE.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Copy className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Copy</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Paste</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Share with Team',
    description: 'All snippets are shared across your organization. Star your favorites for quick access later.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Share</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Heart className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Favorite</span>
        </div>
      </div>
    ),
  },
]

// ─── Component ──────────────────────────────────────────────────────────────

export default function TestLibraryPage() {
  const { user } = useAuthStore()
  const [showHelp, setShowHelp] = useState(false)

  // Data
  const [snippets, setSnippets] = useState<TestSnippet[]>([])

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [filterLanguage, setFilterLanguage] = useState<string>('')

  // New snippet modal
  const [showNewModal, setShowNewModal] = useState(false)
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formCategory, setFormCategory] = useState<SnippetCategory>('Login Flows')
  const [formLanguage, setFormLanguage] = useState<SnippetLanguage>('JavaScript')
  const [formCode, setFormCode] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  // Favorites (localStorage)
  const [starredIds, setStarredIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('maghil-library-stars')
      return new Set(saved ? JSON.parse(saved) : [])
    } catch { return new Set() }
  })

  // Toast
  const [toast, setToast] = useState<string | null>(null)

  // ─── Persist stars ────────────────────────────────────────────────────

  useEffect(() => {
    localStorage.setItem('maghil-library-stars', JSON.stringify([...starredIds]))
  }, [starredIds])

  // ─── Load snippets ────────────────────────────────────────────────────

  useEffect(() => {
    const q = query(collection(db, 'testLibrary'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setSnippets(snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt instanceof Timestamp ? d.data().createdAt.toDate() : new Date(),
      } as TestSnippet)))
    })
    return unsub
  }, [])

  // ─── Filtering ────────────────────────────────────────────────────────

  const filtered = snippets.filter((s) => {
    if (searchQuery && !s.title.toLowerCase().includes(searchQuery.toLowerCase()) && !s.description.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (filterCategory && s.category !== filterCategory) return false
    if (filterLanguage && s.language !== filterLanguage) return false
    return true
  })

  // ─── Actions ──────────────────────────────────────────────────────────

  const saveSnippet = async () => {
    if (!user || !formTitle.trim() || !formCode.trim()) return
    const data = {
      title: formTitle.trim(),
      description: formDescription.trim(),
      category: formCategory,
      language: formLanguage,
      code: formCode,
      userId: user.uid,
      createdAt: serverTimestamp(),
    }
    if (editingId) {
      await updateDoc(doc(db, 'testLibrary', editingId), data)
    } else {
      await addDoc(collection(db, 'testLibrary'), data)
    }
    closeModal()
    showToast(editingId ? 'Snippet updated' : 'Snippet created')
  }

  const deleteSnippet = async (id: string) => {
    await deleteDoc(doc(db, 'testLibrary', id))
    showToast('Snippet deleted')
  }

  const openEdit = (s: TestSnippet) => {
    setEditingId(s.id)
    setFormTitle(s.title)
    setFormDescription(s.description)
    setFormCategory(s.category)
    setFormLanguage(s.language)
    setFormCode(s.code)
    setShowNewModal(true)
  }

  const closeModal = () => {
    setShowNewModal(false)
    setEditingId(null)
    setFormTitle('')
    setFormDescription('')
    setFormCategory('Login Flows')
    setFormLanguage('JavaScript')
    setFormCode('')
  }

  const copyToClipboard = async (code: string) => {
    await navigator.clipboard.writeText(code)
    showToast('Copied to clipboard')
  }

  const toggleStar = (id: string) => {
    setStarredIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <>
      <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10">
              <Library className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-text-primary">Test Library</h1>
              <p className="text-xs text-text-secondary">{snippets.length} snippets</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewModal(true)}
              className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
            >
              <Plus size={16} /> New Snippet
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
              placeholder="Search snippets..."
              className="w-full rounded-lg border border-border bg-card pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={filterLanguage}
            onChange={(e) => setFilterLanguage(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="">All Languages</option>
            {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        {/* Snippets Grid */}
        <div className="flex-1 overflow-auto p-6">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Library className="h-12 w-12 text-text-secondary/40 mb-3" />
              <p className="text-text-secondary">No snippets found</p>
              <p className="text-text-secondary/60 text-sm mt-1">
                Create your first snippet to build your test library
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((snippet) => (
                <div
                  key={snippet.id}
                  className="rounded-xl border border-border bg-card overflow-hidden hover:border-accent/30 transition-colors"
                >
                  {/* Card header */}
                  <div className="flex items-start justify-between p-4 pb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-text-primary truncate">{snippet.title}</h3>
                      <p className="text-xs text-text-secondary mt-1 line-clamp-2">{snippet.description}</p>
                    </div>
                    <button
                      onClick={() => toggleStar(snippet.id)}
                      className="ml-2 p-1 rounded-md hover:bg-sidebar transition-colors flex-shrink-0"
                    >
                      {starredIds.has(snippet.id) ? (
                        <Heart size={16} className="text-status-red fill-status-red" />
                      ) : (
                        <HeartOff size={16} className="text-text-secondary" />
                      )}
                    </button>
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-2 px-4 pb-2">
                    <span className="flex items-center gap-1 rounded-full bg-sidebar px-2 py-0.5 text-xs text-text-secondary">
                      {CATEGORY_ICONS[snippet.category]} {snippet.category}
                    </span>
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', LANG_COLORS[snippet.language])}>
                      {snippet.language}
                    </span>
                  </div>

                  {/* Code preview */}
                  <div className="mx-4 mb-3 rounded-lg bg-body border border-border overflow-hidden">
                    <pre className="p-3 text-xs text-text-secondary font-mono max-h-32 overflow-auto whitespace-pre-wrap">
                      {snippet.code}
                    </pre>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 px-4 pb-3">
                    <button
                      onClick={() => copyToClipboard(snippet.code)}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-accent-light hover:bg-accent/10 transition-colors"
                    >
                      <Copy size={12} /> Copy
                    </button>
                    <button
                      onClick={() => copyToClipboard(snippet.code)}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-card transition-colors"
                    >
                      <Code size={12} /> Insert into Editor
                    </button>
                    <div className="flex-1" />
                    <button
                      onClick={() => openEdit(snippet)}
                      className="rounded-md px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-sidebar transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteSnippet(snippet.id)}
                      className="rounded-md px-2 py-1 text-xs text-text-secondary hover:text-status-red hover:bg-sidebar transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* New/Edit Snippet Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-border bg-sidebar shadow-2xl shadow-black/40 overflow-hidden">
            <div className="flex items-center justify-between px-6 pt-5">
              <h2 className="text-lg font-semibold text-text-primary">
                {editingId ? 'Edit Snippet' : 'New Snippet'}
              </h2>
              <button onClick={closeModal} className="rounded-md p-1 text-text-secondary hover:text-text-primary hover:bg-card transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Title</label>
                <input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Snippet title..."
                  className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Description</label>
                <input
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Brief description..."
                  className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              {/* Category + Language row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as SnippetCategory)}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Language</label>
                  <select
                    value={formLanguage}
                    onChange={(e) => setFormLanguage(e.target.value as SnippetLanguage)}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              {/* Code */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Code</label>
                <textarea
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  placeholder="Paste your test snippet here..."
                  rows={10}
                  className="w-full rounded-lg border border-border bg-body px-4 py-3 text-sm text-text-primary font-mono placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 pb-5">
              <button
                onClick={closeModal}
                className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-card transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveSnippet}
                disabled={!formTitle.trim() || !formCode.trim()}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                {editingId ? 'Update' : 'Save'} Snippet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[70] rounded-lg bg-status-green/90 px-4 py-2.5 text-sm font-medium text-white shadow-lg animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}

      <HowItWorks steps={howItWorksSteps} isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  )
}
