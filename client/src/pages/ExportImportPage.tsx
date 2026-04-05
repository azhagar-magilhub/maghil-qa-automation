import { useState, useRef, useCallback } from 'react'
import {
  ArrowUpDown, Download, Upload, Info, ArrowRight, FileJson, CheckCircle2,
  Merge, AlertCircle, FolderOpen, X
} from 'lucide-react'
import {
  collection, getDocs, doc, setDoc, serverTimestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'
import HowItWorks from '@/components/shared/HowItWorks'

// ─── Types ──────────────────────────────────────────────────────────────────

interface ExportCollection {
  key: string
  label: string
  firestorePath: string
}

type ConflictStrategy = 'skip' | 'overwrite' | 'merge'

interface ImportPreview {
  [key: string]: number
}

// ─── Config ─────────────────────────────────────────────────────────────────

const EXPORT_COLLECTIONS: ExportCollection[] = [
  { key: 'integrations', label: 'Integrations', firestorePath: 'users' },
  { key: 'testSuites', label: 'Test Suites', firestorePath: 'testSuites' },
  { key: 'apiCollections', label: 'API Collections', firestorePath: 'apiCollections' },
  { key: 'schedules', label: 'Schedules', firestorePath: 'schedules' },
  { key: 'maskingRules', label: 'Masking Rules', firestorePath: 'maskingRules' },
  { key: 'dashboardLayouts', label: 'Dashboard Layouts', firestorePath: 'dashboardLayouts' },
]

// ─── How It Works ───────────────────────────────────────────────────────────

const howItWorksSteps = [
  {
    title: 'Select Data',
    description: 'Choose which configuration data to export: integrations, test suites, API collections, schedules, and more.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Select</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <FolderOpen className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Data</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Export JSON',
    description: 'Download your selected configuration as a single JSON file. Perfect for backups and environment migration.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Download className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Export</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <FileJson className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">JSON</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Upload Config',
    description: 'Drag and drop a JSON config file or use the file picker. See a preview of what will be imported before confirming.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Upload className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Upload</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Preview</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Import & Merge',
    description: 'Choose how to handle conflicts: skip existing, overwrite, or merge. Then import your configuration safely.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Merge className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Merge</span>
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
]

// ─── Component ──────────────────────────────────────────────────────────────

export default function ExportImportPage() {
  const { user } = useAuthStore()
  const [showHelp, setShowHelp] = useState(false)
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export')

  // Export state
  const [selectedExports, setSelectedExports] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState(false)

  // Import state
  const [importData, setImportData] = useState<Record<string, any[]> | null>(null)
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null)
  const [conflictStrategy, setConflictStrategy] = useState<ConflictStrategy>('skip')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Toast
  const [toast, setToast] = useState<string | null>(null)

  // ─── Export ───────────────────────────────────────────────────────────

  const toggleExportSelection = (key: string) => {
    setSelectedExports((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleExport = async () => {
    if (!user || selectedExports.size === 0) return
    setExporting(true)

    try {
      const exportBundle: Record<string, any[]> = {}

      for (const col of EXPORT_COLLECTIONS) {
        if (!selectedExports.has(col.key)) continue
        const snap = await getDocs(collection(db, col.firestorePath))
        exportBundle[col.key] = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      }

      const blob = new Blob([JSON.stringify(exportBundle, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `maghil-qa-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      showToast('Export completed successfully')
    } catch (err) {
      showToast('Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  // ─── Import ───────────────────────────────────────────────────────────

  const processFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        setImportData(data)
        const preview: ImportPreview = {}
        Object.keys(data).forEach((key) => {
          if (Array.isArray(data[key])) {
            preview[key] = data[key].length
          }
        })
        setImportPreview(preview)
        setImportResult(null)
      } catch {
        showToast('Invalid JSON file')
      }
    }
    reader.readAsText(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type === 'application/json') {
      processFile(file)
    }
  }, [processFile])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleImport = async () => {
    if (!user || !importData) return
    setImporting(true)

    try {
      let importedCount = 0

      for (const [key, items] of Object.entries(importData)) {
        if (!Array.isArray(items)) continue
        const col = EXPORT_COLLECTIONS.find((c) => c.key === key)
        if (!col) continue

        for (const item of items) {
          const { id, ...data } = item
          const docId = id || `imported_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

          if (conflictStrategy === 'skip') {
            try {
              const snap = await getDocs(collection(db, col.firestorePath))
              const exists = snap.docs.some((d) => d.id === docId)
              if (exists) continue
            } catch { /* proceed */ }
          }

          await setDoc(doc(db, col.firestorePath, docId), {
            ...data,
            importedAt: serverTimestamp(),
          }, conflictStrategy === 'merge' ? { merge: true } : undefined)
          importedCount++
        }
      }

      setImportResult(`Successfully imported ${importedCount} items`)
      showToast('Import completed')
    } catch (err) {
      setImportResult('Import failed. Please try again.')
    } finally {
      setImporting(false)
    }
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
              <ArrowUpDown className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-text-primary">Export / Import</h1>
              <p className="text-xs text-text-secondary">Backup and restore your configuration</p>
            </div>
          </div>
          <button
            onClick={() => setShowHelp(true)}
            className="flex items-center gap-2 rounded-full border border-border-subtle px-4 py-1.5 text-sm text-text-secondary hover:text-text-primary transition"
          >
            <Info className="h-4 w-4" /> How it works
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-border">
          <button
            onClick={() => setActiveTab('export')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'export'
                ? 'border-accent text-accent-light'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            )}
          >
            <Download size={16} /> Export
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'import'
                ? 'border-accent text-accent-light'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            )}
          >
            <Upload size={16} /> Import
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-2xl mx-auto">
            {/* ── Export Tab ────────────────────────────────────────── */}
            {activeTab === 'export' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-base font-semibold text-text-primary mb-1">Select data to export</h2>
                  <p className="text-sm text-text-secondary">Choose the configuration sections you want to include in your export file.</p>
                </div>

                <div className="space-y-2">
                  {EXPORT_COLLECTIONS.map((col) => (
                    <label
                      key={col.key}
                      className={cn(
                        'flex items-center gap-4 rounded-xl border p-4 cursor-pointer transition-colors',
                        selectedExports.has(col.key)
                          ? 'border-accent/40 bg-accent/5'
                          : 'border-border bg-card hover:border-border-subtle'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedExports.has(col.key)}
                        onChange={() => toggleExportSelection(col.key)}
                        className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                      />
                      <div>
                        <p className="text-sm font-medium text-text-primary">{col.label}</p>
                        <p className="text-xs text-text-secondary">Collection: {col.firestorePath}</p>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (selectedExports.size === EXPORT_COLLECTIONS.length) {
                        setSelectedExports(new Set())
                      } else {
                        setSelectedExports(new Set(EXPORT_COLLECTIONS.map((c) => c.key)))
                      }
                    }}
                    className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-card transition-colors"
                  >
                    {selectedExports.size === EXPORT_COLLECTIONS.length ? 'Deselect All' : 'Select All'}
                  </button>
                  <button
                    onClick={handleExport}
                    disabled={selectedExports.size === 0 || exporting}
                    className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors disabled:opacity-50"
                  >
                    <Download size={16} />
                    {exporting ? 'Exporting...' : 'Export as JSON'}
                  </button>
                </div>
              </div>
            )}

            {/* ── Import Tab ────────────────────────────────────────── */}
            {activeTab === 'import' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-base font-semibold text-text-primary mb-1">Import configuration</h2>
                  <p className="text-sm text-text-secondary">Upload a previously exported JSON file to restore or migrate configuration.</p>
                </div>

                {/* Drop zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    'rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-colors',
                    dragActive
                      ? 'border-accent bg-accent/5'
                      : 'border-border hover:border-accent/40 bg-card'
                  )}
                >
                  <Upload className="mx-auto h-8 w-8 text-text-secondary/50 mb-3" />
                  <p className="text-sm font-medium text-text-primary">
                    Drag & drop your JSON file here
                  </p>
                  <p className="text-xs text-text-secondary mt-1">or click to browse</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>

                {/* Preview */}
                {importPreview && (
                  <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-text-primary">Import Preview</h3>
                      <button
                        onClick={() => { setImportData(null); setImportPreview(null); setImportResult(null) }}
                        className="rounded-md p-1 text-text-secondary hover:text-text-primary hover:bg-sidebar transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="space-y-2">
                      {Object.entries(importPreview).map(([key, count]) => (
                        <div key={key} className="flex items-center justify-between rounded-lg bg-sidebar px-4 py-2.5">
                          <span className="text-sm text-text-primary capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <span className="text-sm font-medium text-accent-light">{count} items</span>
                        </div>
                      ))}
                    </div>

                    {/* Conflict resolution */}
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">Conflict Resolution</label>
                      <div className="flex gap-2">
                        {(['skip', 'overwrite', 'merge'] as ConflictStrategy[]).map((strategy) => (
                          <button
                            key={strategy}
                            onClick={() => setConflictStrategy(strategy)}
                            className={cn(
                              'flex-1 rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors',
                              conflictStrategy === strategy
                                ? 'border-accent bg-accent/10 text-accent-light'
                                : 'border-border text-text-secondary hover:text-text-primary hover:bg-sidebar'
                            )}
                          >
                            {strategy === 'skip' && 'Skip Existing'}
                            {strategy === 'overwrite' && 'Overwrite'}
                            {strategy === 'merge' && 'Merge'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Import button */}
                    <button
                      onClick={handleImport}
                      disabled={importing}
                      className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors disabled:opacity-50"
                    >
                      <Upload size={16} />
                      {importing ? 'Importing...' : 'Import'}
                    </button>

                    {/* Result */}
                    {importResult && (
                      <div className={cn(
                        'rounded-lg px-4 py-3 text-sm',
                        importResult.includes('Successfully')
                          ? 'bg-status-green/10 text-status-green'
                          : 'bg-status-red/10 text-status-red'
                      )}>
                        {importResult}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[70] rounded-lg bg-status-green/90 px-4 py-2.5 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      <HowItWorks steps={howItWorksSteps} isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  )
}
