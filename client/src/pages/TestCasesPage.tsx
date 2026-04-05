import { useState, useEffect, useCallback } from 'react'
import {
  ClipboardList, Plus, Trash2, Edit3, Play, ChevronDown, ChevronRight,
  Save, FolderOpen, Folder, MoreVertical, CheckSquare, XSquare, MinusSquare,
  Square, Upload, Search, X, Info, ArrowRight, FolderPlus, FileText, List, Users, Flag
} from 'lucide-react'
import {
  collection, doc, addDoc, updateDoc, deleteDoc, query, where, orderBy,
  onSnapshot, getDocs, serverTimestamp, Timestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'
import { usePageTitle } from '@/hooks/usePageTitle'
import HowItWorks from '@/components/shared/HowItWorks'
import { SkeletonTable } from '@/components/shared/Skeleton'
import BulkActions from '@/components/shared/BulkActions'
import api from '@/lib/api'
import { Download } from 'lucide-react'

const howItWorksSteps = [
  {
    title: 'Create Suites',
    description: 'Organize test cases into hierarchical suites. Right-click a suite to add sub-suites, rename, or delete.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <FolderPlus className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">New suite</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Folder className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Suite</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Write Test Cases',
    description: 'Add test cases with step-by-step instructions, expected results, priority levels, and tags for easy filtering.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <FileText className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Title</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <List className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Steps</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Create Test Runs',
    description: 'Select a suite and create a test run. All test cases in the suite are included and ready for execution.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Play className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Select</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Users className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Assign</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Execute Tests',
    description: 'Mark each test case as Pass, Fail, Blocked, or Skipped. Track progress in real time with run-level statistics.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <CheckSquare className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Pass</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-red/10 flex items-center justify-center">
            <XSquare className="w-6 h-6 text-status-red" />
          </div>
          <span className="text-xs text-text-secondary">Fail</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-yellow/10 flex items-center justify-center">
            <Flag className="w-6 h-6 text-status-yellow" />
          </div>
          <span className="text-xs text-text-secondary">Block</span>
        </div>
      </div>
    ),
  },
]

// ─── Types ───────────────────────────────────────────────────────────────────

interface TestSuite {
  id: string
  name: string
  userId: string
  parentId: string | null
  tags: string[]
  createdAt: Date
}

interface TestStep {
  description: string
  expectedResult: string
}

interface TestCase {
  id: string
  suiteId: string
  title: string
  preconditions: string
  steps: TestStep[]
  priority: 'Critical' | 'High' | 'Medium' | 'Low'
  type: 'Smoke' | 'Regression' | 'Sanity' | 'Exploratory'
  tags: string[]
  jiraKey: string
  createdAt: Date
}

interface TestRun {
  id: string
  name: string
  suiteId: string
  assignedTo: string
  status: 'In Progress' | 'Completed'
  totalCount: number
  passCount: number
  failCount: number
  blockedCount: number
  skippedCount: number
  createdAt: Date
}

interface TestResult {
  id: string
  testCaseId: string
  status: 'pass' | 'fail' | 'blocked' | 'skipped' | 'pending'
  notes: string
}

type ViewMode = 'list' | 'editor' | 'runs' | 'execute'

// ─── Priority / Type badge colors ────────────────────────────────────────────

const priorityColors: Record<string, string> = {
  Critical: 'bg-status-red/20 text-status-red',
  High: 'bg-orange-500/20 text-orange-400',
  Medium: 'bg-status-yellow/20 text-status-yellow',
  Low: 'bg-status-blue/20 text-status-blue',
}

const typeColors: Record<string, string> = {
  Smoke: 'bg-purple-500/20 text-purple-400',
  Regression: 'bg-status-blue/20 text-status-blue',
  Sanity: 'bg-status-green/20 text-status-green',
  Exploratory: 'bg-teal-500/20 text-teal-400',
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TestCasesPage() {
  usePageTitle('Test Cases')
  const { user } = useAuthStore()

  const [showHelp, setShowHelp] = useState(false)

  // Suites
  const [suitesLoading, setSuitesLoading] = useState(true)
  const [suites, setSuites] = useState<TestSuite[]>([])
  const [expandedSuites, setExpandedSuites] = useState<Set<string>>(new Set())
  const [selectedSuiteId, setSelectedSuiteId] = useState<string | null>(null)
  const [newSuiteName, setNewSuiteName] = useState('')
  const [showNewSuiteInput, setShowNewSuiteInput] = useState(false)

  // Cases
  const [cases, setCases] = useState<TestCase[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [editingCase, setEditingCase] = useState<TestCase | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterType, setFilterType] = useState('')
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([])

  // Editor form state
  const [formTitle, setFormTitle] = useState('')
  const [formPreconditions, setFormPreconditions] = useState('')
  const [formSteps, setFormSteps] = useState<TestStep[]>([{ description: '', expectedResult: '' }])
  const [formPriority, setFormPriority] = useState<TestCase['priority']>('Medium')
  const [formType, setFormType] = useState<TestCase['type']>('Regression')
  const [formTags, setFormTags] = useState('')
  const [formJiraKey, setFormJiraKey] = useState('')

  // Test Runs
  const [runs, setRuns] = useState<TestRun[]>([])
  const [activeRun, setActiveRun] = useState<TestRun | null>(null)
  const [runResults, setRunResults] = useState<TestResult[]>([])
  const [newRunName, setNewRunName] = useState('')
  const [newRunAssignee, setNewRunAssignee] = useState('')

  // Context menu
  const [contextMenu, setContextMenu] = useState<{ suiteId: string; x: number; y: number } | null>(null)

  // ─── Load Suites ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'testSuites'), where('userId', '==', user.uid), orderBy('createdAt', 'asc'))
    const unsub = onSnapshot(q, (snap) => {
      setSuites(snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt instanceof Timestamp ? d.data().createdAt.toDate() : new Date(),
      } as TestSuite)))
      setSuitesLoading(false)
    })
    return unsub
  }, [user])

  // ─── Load Cases for selected suite ────────────────────────────────────────

  useEffect(() => {
    if (!selectedSuiteId) { setCases([]); return }
    const q = query(
      collection(db, `testSuites/${selectedSuiteId}/testCases`),
      orderBy('createdAt', 'asc')
    )
    const unsub = onSnapshot(q, (snap) => {
      setCases(snap.docs.map((d) => ({
        id: d.id,
        suiteId: selectedSuiteId,
        ...d.data(),
        createdAt: d.data().createdAt instanceof Timestamp ? d.data().createdAt.toDate() : new Date(),
      } as TestCase)))
    })
    return unsub
  }, [selectedSuiteId])

  // ─── Load Test Runs ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'testRuns'), where('suiteId', '==', selectedSuiteId || ''), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setRuns(snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt instanceof Timestamp ? d.data().createdAt.toDate() : new Date(),
      } as TestRun)))
    })
    return unsub
  }, [user, selectedSuiteId])

  // ─── Suite Actions ────────────────────────────────────────────────────────

  const createSuite = async () => {
    if (!user || !newSuiteName.trim()) return
    await addDoc(collection(db, 'testSuites'), {
      name: newSuiteName.trim(),
      userId: user.uid,
      parentId: null,
      tags: [],
      createdAt: serverTimestamp(),
    })
    setNewSuiteName('')
    setShowNewSuiteInput(false)
  }

  const deleteSuite = async (suiteId: string) => {
    const casesSnap = await getDocs(collection(db, `testSuites/${suiteId}/testCases`))
    for (const c of casesSnap.docs) {
      await deleteDoc(doc(db, `testSuites/${suiteId}/testCases`, c.id))
    }
    await deleteDoc(doc(db, 'testSuites', suiteId))
    if (selectedSuiteId === suiteId) setSelectedSuiteId(null)
    setContextMenu(null)
  }

  const toggleExpand = (id: string) => {
    setExpandedSuites((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ─── Case Editor ──────────────────────────────────────────────────────────

  const openEditor = (tc?: TestCase) => {
    if (tc) {
      setEditingCase(tc)
      setFormTitle(tc.title)
      setFormPreconditions(tc.preconditions)
      setFormSteps(tc.steps.length > 0 ? tc.steps : [{ description: '', expectedResult: '' }])
      setFormPriority(tc.priority)
      setFormType(tc.type)
      setFormTags(tc.tags.join(', '))
      setFormJiraKey(tc.jiraKey)
    } else {
      setEditingCase(null)
      setFormTitle('')
      setFormPreconditions('')
      setFormSteps([{ description: '', expectedResult: '' }])
      setFormPriority('Medium')
      setFormType('Regression')
      setFormTags('')
      setFormJiraKey('')
    }
    setViewMode('editor')
  }

  const saveCase = async () => {
    if (!selectedSuiteId || !formTitle.trim()) return
    const data = {
      title: formTitle.trim(),
      preconditions: formPreconditions,
      steps: formSteps.filter((s) => s.description.trim()),
      priority: formPriority,
      type: formType,
      tags: formTags.split(',').map((t) => t.trim()).filter(Boolean),
      jiraKey: formJiraKey.trim(),
      createdAt: serverTimestamp(),
    }
    if (editingCase) {
      await updateDoc(doc(db, `testSuites/${selectedSuiteId}/testCases`, editingCase.id), data)
    } else {
      await addDoc(collection(db, `testSuites/${selectedSuiteId}/testCases`), data)
    }
    setViewMode('list')
  }

  const deleteCase = async (caseId: string) => {
    if (!selectedSuiteId) return
    await deleteDoc(doc(db, `testSuites/${selectedSuiteId}/testCases`, caseId))
  }

  const addStep = () => setFormSteps([...formSteps, { description: '', expectedResult: '' }])
  const removeStep = (idx: number) => setFormSteps(formSteps.filter((_, i) => i !== idx))
  const updateStep = (idx: number, field: keyof TestStep, value: string) => {
    const updated = [...formSteps]
    updated[idx] = { ...updated[idx], [field]: value }
    setFormSteps(updated)
  }

  // ─── Test Runs ────────────────────────────────────────────────────────────

  const createTestRun = async () => {
    if (!user || !selectedSuiteId || !newRunName.trim()) return
    const runRef = await addDoc(collection(db, 'testRuns'), {
      name: newRunName.trim(),
      suiteId: selectedSuiteId,
      assignedTo: newRunAssignee.trim() || user.uid,
      status: 'In Progress',
      totalCount: cases.length,
      passCount: 0,
      failCount: 0,
      blockedCount: 0,
      skippedCount: 0,
      createdAt: serverTimestamp(),
    })
    // Create result entries for each case
    for (const tc of cases) {
      await addDoc(collection(db, `testRuns/${runRef.id}/results`), {
        testCaseId: tc.id,
        status: 'pending',
        notes: '',
      })
    }
    setNewRunName('')
    setNewRunAssignee('')
    startExecution(runRef.id)
  }

  const startExecution = useCallback(async (runId: string) => {
    const run = runs.find((r) => r.id === runId)
    if (!run) {
      // Fetch fresh
      const snap = await getDocs(query(collection(db, 'testRuns'), where('__name__', '==', runId)))
      if (snap.empty) return
      const d = snap.docs[0]
      setActiveRun({ id: d.id, ...d.data(), createdAt: new Date() } as TestRun)
    } else {
      setActiveRun(run)
    }

    const resultsSnap = await getDocs(collection(db, `testRuns/${runId}/results`))
    setRunResults(resultsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as TestResult)))
    setViewMode('execute')
  }, [runs])

  const updateResultStatus = async (resultId: string, status: TestResult['status']) => {
    if (!activeRun) return
    await updateDoc(doc(db, `testRuns/${activeRun.id}/results`, resultId), { status })
    setRunResults((prev) => prev.map((r) => r.id === resultId ? { ...r, status } : r))

    // Update run counts
    const updatedResults = runResults.map((r) => r.id === resultId ? { ...r, status } : r)
    const counts = { passCount: 0, failCount: 0, blockedCount: 0, skippedCount: 0 }
    updatedResults.forEach((r) => {
      if (r.status === 'pass') counts.passCount++
      if (r.status === 'fail') counts.failCount++
      if (r.status === 'blocked') counts.blockedCount++
      if (r.status === 'skipped') counts.skippedCount++
    })
    await updateDoc(doc(db, 'testRuns', activeRun.id), counts)

    // Auto-file bug on fail
    if (status === 'fail') {
      const tc = cases.find((c) => c.id === runResults.find((r) => r.id === resultId)?.testCaseId)
      if (tc) {
        try {
          await api.post('/jira/bug', {
            summary: `[Test Failure] ${tc.title}`,
            description: `Test case "${tc.title}" failed during test run "${activeRun.name}".\n\nSteps:\n${tc.steps.map((s, i) => `${i + 1}. ${s.description} -> Expected: ${s.expectedResult}`).join('\n')}`,
            priority: tc.priority,
            labels: ['auto-filed', 'test-failure'],
          })
        } catch { /* bug filing is best-effort */ }
      }
    }
  }

  const updateResultNotes = async (resultId: string, notes: string) => {
    if (!activeRun) return
    await updateDoc(doc(db, `testRuns/${activeRun.id}/results`, resultId), { notes })
    setRunResults((prev) => prev.map((r) => r.id === resultId ? { ...r, notes } : r))
  }

  // ─── Filtered cases ───────────────────────────────────────────────────────

  const filteredCases = cases.filter((tc) => {
    if (searchQuery && !tc.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (filterPriority && tc.priority !== filterPriority) return false
    if (filterType && tc.type !== filterType) return false
    return true
  })

  // ─── Run progress ─────────────────────────────────────────────────────────

  const completedCount = runResults.filter((r) => r.status !== 'pending').length
  const progressPercent = runResults.length > 0 ? Math.round((completedCount / runResults.length) * 100) : 0

  // ─── Suite tree helpers ────────────────────────────────────────────────────

  const rootSuites = suites.filter((s) => !s.parentId)
  const childSuites = (parentId: string) => suites.filter((s) => s.parentId === parentId)

  // ─── Render ────────────────────────────────────────────────────────────────

  if (suitesLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="space-y-2">
          <div className="h-7 w-48 animate-pulse rounded-md bg-card-hover" />
          <div className="h-4 w-72 animate-pulse rounded-md bg-card-hover" />
        </div>
        <SkeletonTable rows={5} cols={5} />
      </div>
    )
  }

  return (
    <>
    <div className="flex h-[calc(100vh-4rem)] gap-0 overflow-hidden" onClick={() => setContextMenu(null)}>
      {/* ── Left Panel: Suite Tree ───────────────────────────────────────── */}
      <div className="w-72 flex-shrink-0 border-r border-border bg-sidebar flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Test Suites</h2>
          <button
            onClick={() => setShowNewSuiteInput(true)}
            className="rounded-md p-1.5 text-text-secondary hover:text-text-primary hover:bg-card transition-colors"
            title="New Suite"
          >
            <Plus size={16} />
          </button>
        </div>

        {showNewSuiteInput && (
          <div className="p-3 border-b border-border">
            <input
              autoFocus
              value={newSuiteName}
              onChange={(e) => setNewSuiteName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') createSuite(); if (e.key === 'Escape') setShowNewSuiteInput(false) }}
              placeholder="Suite name..."
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <div className="flex gap-2 mt-2">
              <button onClick={createSuite} className="flex-1 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90">Create</button>
              <button onClick={() => setShowNewSuiteInput(false)} className="flex-1 rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary">Cancel</button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2">
          {rootSuites.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-text-secondary">No test suites yet. Create one to get started.</p>
          )}
          {rootSuites.map((suite) => (
            <SuiteTreeNode
              key={suite.id}
              suite={suite}
              childSuites={childSuites}
              expandedSuites={expandedSuites}
              selectedSuiteId={selectedSuiteId}
              toggleExpand={toggleExpand}
              onSelect={(id) => { setSelectedSuiteId(id); setViewMode('list') }}
              onContextMenu={(id, e) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ suiteId: id, x: e.clientX, y: e.clientY }) }}
            />
          ))}
        </div>
      </div>

      {/* ── Context Menu ──────────────────────────────────────────────────── */}
      {contextMenu && (
        <div
          className="fixed z-50 rounded-lg bg-card border border-border shadow-xl py-1 min-w-[140px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => deleteSuite(contextMenu.suiteId)}
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-status-red hover:bg-sidebar transition-colors"
          >
            <Trash2 size={14} /> Delete Suite
          </button>
        </div>
      )}

      {/* ── Right Panel ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex justify-end px-4 pt-2">
          <button onClick={() => setShowHelp(true)} className="flex items-center gap-2 rounded-full border border-border-subtle px-4 py-1.5 text-sm text-text-secondary hover:text-text-primary transition">
            <Info className="h-4 w-4" /> How it works
          </button>
        </div>
        {!selectedSuiteId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <ClipboardList className="mx-auto h-12 w-12 text-text-secondary/40 mb-3" />
              <p className="text-text-secondary">Select a test suite from the left panel</p>
              <p className="text-text-secondary/60 text-sm mt-1">or create a new one to get started</p>
            </div>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-border px-4 pt-3">
              <TabButton active={viewMode === 'list' || viewMode === 'editor'} onClick={() => setViewMode('list')}>
                Test Cases
              </TabButton>
              <TabButton active={viewMode === 'runs' || viewMode === 'execute'} onClick={() => setViewMode('runs')}>
                Test Runs
              </TabButton>
            </div>

            {/* ── List View ────────────────────────────────────────────── */}
            {viewMode === 'list' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search test cases..."
                      className="w-full rounded-lg border border-border bg-card pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                  <select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="">All Priorities</option>
                    <option>Critical</option>
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="">All Types</option>
                    <option>Smoke</option>
                    <option>Regression</option>
                    <option>Sanity</option>
                    <option>Exploratory</option>
                  </select>
                  <button
                    onClick={() => openEditor()}
                    className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
                  >
                    <Plus size={16} /> New Test Case
                  </button>
                  <button className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-card transition-colors">
                    <Upload size={16} /> Import Excel
                  </button>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-sidebar">
                      <tr className="text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">
                        <th className="px-4 py-3 w-10">
                          <input
                            type="checkbox"
                            checked={filteredCases.length > 0 && selectedCaseIds.length === filteredCases.length}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedCaseIds(filteredCases.map((c) => c.id))
                              else setSelectedCaseIds([])
                            }}
                            className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                          />
                        </th>
                        <th className="px-4 py-3">Title</th>
                        <th className="px-4 py-3">Priority</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Tags</th>
                        <th className="px-4 py-3">Jira</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredCases.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-12 text-center text-sm text-text-secondary">
                            No test cases found. Create your first test case.
                          </td>
                        </tr>
                      ) : (
                        filteredCases.map((tc) => (
                          <tr key={tc.id} className={cn('hover:bg-card/50 transition-colors', selectedCaseIds.includes(tc.id) && 'bg-accent/5')}>
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selectedCaseIds.includes(tc.id)}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedCaseIds([...selectedCaseIds, tc.id])
                                  else setSelectedCaseIds(selectedCaseIds.filter((id) => id !== tc.id))
                                }}
                                className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                              />
                            </td>
                            <td className="px-4 py-3 text-sm text-text-primary font-medium">{tc.title}</td>
                            <td className="px-4 py-3">
                              <span className={cn('inline-block rounded-full px-2.5 py-0.5 text-xs font-medium', priorityColors[tc.priority])}>
                                {tc.priority}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={cn('inline-block rounded-full px-2.5 py-0.5 text-xs font-medium', typeColors[tc.type])}>
                                {tc.type}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {tc.tags.map((tag) => (
                                  <span key={tag} className="rounded bg-sidebar px-2 py-0.5 text-xs text-text-secondary">{tag}</span>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-accent-light">{tc.jiraKey || '---'}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => openEditor(tc)} className="rounded-md p-1.5 text-text-secondary hover:text-text-primary hover:bg-card transition-colors" title="Edit">
                                  <Edit3 size={14} />
                                </button>
                                <button onClick={() => deleteCase(tc.id)} className="rounded-md p-1.5 text-text-secondary hover:text-status-red hover:bg-card transition-colors" title="Delete">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Bulk Actions */}
                <BulkActions
                  selectedIds={selectedCaseIds}
                  totalCount={filteredCases.length}
                  onSelectAll={() => setSelectedCaseIds(filteredCases.map((c) => c.id))}
                  onDeselectAll={() => setSelectedCaseIds([])}
                  actions={[
                    {
                      label: 'Run Selected',
                      icon: <Play size={14} />,
                      onClick: () => { /* trigger run for selected */ setSelectedCaseIds([]) },
                    },
                    {
                      label: 'Export Selected',
                      icon: <Download size={14} />,
                      onClick: (ids) => {
                        const selected = cases.filter((c) => ids.includes(c.id))
                        const blob = new Blob([JSON.stringify(selected, null, 2)], { type: 'application/json' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = 'test-cases-export.json'
                        document.body.appendChild(a)
                        a.click()
                        document.body.removeChild(a)
                        URL.revokeObjectURL(url)
                        setSelectedCaseIds([])
                      },
                    },
                    {
                      label: 'Delete Selected',
                      icon: <Trash2 size={14} />,
                      variant: 'danger',
                      onClick: async (ids) => {
                        if (!selectedSuiteId) return
                        for (const id of ids) {
                          await deleteCase(id)
                        }
                        setSelectedCaseIds([])
                      },
                    },
                  ]}
                />
              </div>
            )}

            {/* ── Editor View ──────────────────────────────────────────── */}
            {viewMode === 'editor' && (
              <div className="flex-1 overflow-auto p-6">
                <div className="max-w-3xl mx-auto space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-text-primary">
                      {editingCase ? 'Edit Test Case' : 'New Test Case'}
                    </h2>
                    <button onClick={() => setViewMode('list')} className="rounded-md p-1.5 text-text-secondary hover:text-text-primary hover:bg-card">
                      <X size={18} />
                    </button>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">Title</label>
                    <input
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="Enter test case title..."
                      className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>

                  {/* Preconditions */}
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">Preconditions</label>
                    <textarea
                      value={formPreconditions}
                      onChange={(e) => setFormPreconditions(e.target.value)}
                      placeholder="Describe any preconditions..."
                      rows={3}
                      className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                    />
                  </div>

                  {/* Steps */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-text-secondary">Steps</label>
                      <button onClick={addStep} className="flex items-center gap-1 text-xs text-accent-light hover:underline">
                        <Plus size={12} /> Add Step
                      </button>
                    </div>
                    <div className="space-y-3">
                      {formSteps.map((step, idx) => (
                        <div key={idx} className="flex gap-3 items-start rounded-lg border border-border bg-sidebar/50 p-3">
                          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent-light mt-0.5">
                            {idx + 1}
                          </span>
                          <div className="flex-1 space-y-2">
                            <input
                              value={step.description}
                              onChange={(e) => updateStep(idx, 'description', e.target.value)}
                              placeholder="Step description..."
                              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
                            />
                            <input
                              value={step.expectedResult}
                              onChange={(e) => updateStep(idx, 'expectedResult', e.target.value)}
                              placeholder="Expected result..."
                              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
                            />
                          </div>
                          {formSteps.length > 1 && (
                            <button onClick={() => removeStep(idx)} className="rounded-md p-1 text-text-secondary hover:text-status-red mt-0.5">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Priority + Type row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1.5">Priority</label>
                      <select
                        value={formPriority}
                        onChange={(e) => setFormPriority(e.target.value as TestCase['priority'])}
                        className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        <option>Critical</option>
                        <option>High</option>
                        <option>Medium</option>
                        <option>Low</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1.5">Type</label>
                      <select
                        value={formType}
                        onChange={(e) => setFormType(e.target.value as TestCase['type'])}
                        className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        <option>Smoke</option>
                        <option>Regression</option>
                        <option>Sanity</option>
                        <option>Exploratory</option>
                      </select>
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">Tags (comma separated)</label>
                    <input
                      value={formTags}
                      onChange={(e) => setFormTags(e.target.value)}
                      placeholder="e.g. login, auth, smoke"
                      className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>

                  {/* Jira Key */}
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">Link to Jira Key</label>
                    <input
                      value={formJiraKey}
                      onChange={(e) => setFormJiraKey(e.target.value)}
                      placeholder="e.g. PROJ-123"
                      className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-2">
                    <button onClick={saveCase} className="flex items-center gap-2 rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white hover:bg-accent/90 transition-colors">
                      <Save size={16} /> Save
                    </button>
                    <button onClick={() => setViewMode('list')} className="rounded-lg border border-border px-6 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-card transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Test Runs View ────────────────────────────────────────── */}
            {viewMode === 'runs' && (
              <div className="flex-1 overflow-auto p-6">
                <div className="max-w-4xl mx-auto space-y-6">
                  {/* Create Run */}
                  <div className="rounded-xl border border-border bg-card p-5">
                    <h3 className="text-sm font-semibold text-text-primary mb-4">Create Test Run</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <input
                        value={newRunName}
                        onChange={(e) => setNewRunName(e.target.value)}
                        placeholder="Run name..."
                        className="rounded-lg border border-border bg-sidebar px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                      <input
                        value={newRunAssignee}
                        onChange={(e) => setNewRunAssignee(e.target.value)}
                        placeholder="Assign to (email or ID)..."
                        className="rounded-lg border border-border bg-sidebar px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                      <button
                        onClick={createTestRun}
                        disabled={!newRunName.trim() || cases.length === 0}
                        className="flex items-center justify-center gap-2 rounded-lg bg-status-blue px-4 py-2.5 text-sm font-medium text-white hover:bg-status-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Play size={16} /> Start Run ({cases.length} cases)
                      </button>
                    </div>
                  </div>

                  {/* Runs List */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-text-primary">Previous Runs</h3>
                    {runs.length === 0 ? (
                      <p className="text-sm text-text-secondary">No test runs yet for this suite.</p>
                    ) : (
                      runs.map((run) => {
                        const total = run.totalCount || 1
                        const pPct = Math.round((run.passCount / total) * 100)
                        return (
                          <div key={run.id} className="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-text-primary">{run.name}</p>
                              <p className="text-xs text-text-secondary mt-0.5">
                                {run.createdAt.toLocaleDateString()} -- Assigned: {run.assignedTo}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                              <span className="text-status-green">{run.passCount} pass</span>
                              <span className="text-status-red">{run.failCount} fail</span>
                              <span className="text-status-yellow">{run.blockedCount} blocked</span>
                              <span className="text-text-secondary">{run.skippedCount} skip</span>
                            </div>
                            <div className="w-24 h-2 rounded-full bg-sidebar overflow-hidden">
                              <div className="h-full bg-status-green rounded-full transition-all" style={{ width: `${pPct}%` }} />
                            </div>
                            <button
                              onClick={() => startExecution(run.id)}
                              className="rounded-md p-2 text-text-secondary hover:text-text-primary hover:bg-sidebar transition-colors"
                              title="Continue execution"
                            >
                              <Play size={16} />
                            </button>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── Execute View ──────────────────────────────────────────── */}
            {viewMode === 'execute' && activeRun && (
              <div className="flex-1 overflow-auto p-6">
                <div className="max-w-4xl mx-auto space-y-6">
                  {/* Run Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-text-primary">{activeRun.name}</h2>
                      <p className="text-sm text-text-secondary">Executing {runResults.length} test cases</p>
                    </div>
                    <button onClick={() => setViewMode('runs')} className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-card transition-colors">
                      Back to Runs
                    </button>
                  </div>

                  {/* Progress */}
                  <div className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-text-secondary">Progress</span>
                      <span className="text-sm font-medium text-text-primary">{completedCount}/{runResults.length} ({progressPercent}%)</span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-sidebar overflow-hidden">
                      <div className="h-full bg-accent rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                    </div>
                    <div className="flex gap-4 mt-3 text-xs">
                      <span className="text-status-green">{runResults.filter((r) => r.status === 'pass').length} Passed</span>
                      <span className="text-status-red">{runResults.filter((r) => r.status === 'fail').length} Failed</span>
                      <span className="text-status-yellow">{runResults.filter((r) => r.status === 'blocked').length} Blocked</span>
                      <span className="text-text-secondary">{runResults.filter((r) => r.status === 'skipped').length} Skipped</span>
                    </div>
                  </div>

                  {/* Case-by-case execution */}
                  <div className="space-y-3">
                    {runResults.map((result) => {
                      const tc = cases.find((c) => c.id === result.testCaseId)
                      if (!tc) return null
                      return (
                        <div key={result.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-text-primary">{tc.title}</p>
                            <StatusBadge status={result.status} />
                          </div>
                          {tc.steps.length > 0 && (
                            <div className="text-xs text-text-secondary space-y-1 pl-2 border-l-2 border-border ml-1">
                              {tc.steps.map((s, i) => (
                                <p key={i}><span className="text-text-primary font-medium">{i + 1}.</span> {s.description} <span className="text-accent-light">-&gt; {s.expectedResult}</span></p>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            {(['pass', 'fail', 'blocked', 'skipped'] as const).map((st) => (
                              <button
                                key={st}
                                onClick={() => updateResultStatus(result.id, st)}
                                className={cn(
                                  'flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors border',
                                  result.status === st
                                    ? st === 'pass' ? 'bg-status-green/20 text-status-green border-status-green/40'
                                    : st === 'fail' ? 'bg-status-red/20 text-status-red border-status-red/40'
                                    : st === 'blocked' ? 'bg-status-yellow/20 text-status-yellow border-status-yellow/40'
                                    : 'bg-card text-text-secondary border-border'
                                    : 'border-border text-text-secondary hover:bg-card'
                                )}
                              >
                                {st === 'pass' && <CheckSquare size={12} />}
                                {st === 'fail' && <XSquare size={12} />}
                                {st === 'blocked' && <MinusSquare size={12} />}
                                {st === 'skipped' && <Square size={12} />}
                                {st.charAt(0).toUpperCase() + st.slice(1)}
                              </button>
                            ))}
                          </div>
                          <input
                            value={result.notes}
                            onChange={(e) => updateResultNotes(result.id, e.target.value)}
                            placeholder="Notes..."
                            className="w-full rounded-lg border border-border bg-sidebar px-3 py-2 text-xs text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
    <HowItWorks steps={howItWorksSteps} isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SuiteTreeNode({
  suite,
  childSuites,
  expandedSuites,
  selectedSuiteId,
  toggleExpand,
  onSelect,
  onContextMenu,
}: {
  suite: TestSuite
  childSuites: (id: string) => TestSuite[]
  expandedSuites: Set<string>
  selectedSuiteId: string | null
  toggleExpand: (id: string) => void
  onSelect: (id: string) => void
  onContextMenu: (id: string, e: React.MouseEvent) => void
}) {
  const children = childSuites(suite.id)
  const isExpanded = expandedSuites.has(suite.id)
  const isSelected = selectedSuiteId === suite.id

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer text-sm transition-colors',
          isSelected ? 'bg-accent/15 text-accent-light' : 'text-text-secondary hover:bg-card hover:text-text-primary'
        )}
        onClick={() => onSelect(suite.id)}
        onContextMenu={(e) => onContextMenu(suite.id, e)}
      >
        {children.length > 0 ? (
          <button onClick={(e) => { e.stopPropagation(); toggleExpand(suite.id) }} className="p-0.5">
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="w-5" />
        )}
        {isExpanded ? <FolderOpen size={14} className="flex-shrink-0" /> : <Folder size={14} className="flex-shrink-0" />}
        <span className="truncate">{suite.name}</span>
      </div>
      {isExpanded && children.length > 0 && (
        <div className="ml-4">
          {children.map((child) => (
            <SuiteTreeNode
              key={child.id}
              suite={child}
              childSuites={childSuites}
              expandedSuites={expandedSuites}
              selectedSuiteId={selectedSuiteId}
              toggleExpand={toggleExpand}
              onSelect={onSelect}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
        active
          ? 'border-accent text-accent-light'
          : 'border-transparent text-text-secondary hover:text-text-primary'
      )}
    >
      {children}
    </button>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pass: 'bg-status-green/20 text-status-green',
    fail: 'bg-status-red/20 text-status-red',
    blocked: 'bg-status-yellow/20 text-status-yellow',
    skipped: 'bg-card text-text-secondary',
    pending: 'bg-sidebar text-text-secondary',
  }
  return (
    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', styles[status] || styles.pending)}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}
