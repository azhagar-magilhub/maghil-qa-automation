import { useState } from 'react'
import {
  Plus, Trash2, Download, Play, Database, Upload, Copy, FileJson,
  FileText, Code, ChevronDown, Info, ArrowRight, Columns2, Hash, Zap, Send
} from 'lucide-react'
import { cn } from '@/lib/utils'
import HowItWorks from '@/components/shared/HowItWorks'
import api from '@/lib/api'

const howItWorksSteps = [
  {
    title: 'Build Schema',
    description: 'Define your data schema by adding fields with types like name, email, phone, address, UUID, and more. Use presets for common patterns.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Database className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Define</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Columns2 className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Schema</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Set Count',
    description: 'Choose how many records to generate. Adjust the count based on your testing needs, from a handful to thousands.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Hash className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Count</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Hash className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Amount</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Generate Data',
    description: 'Click Generate to create realistic mock data instantly. Preview results in a formatted table.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Zap className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Generate</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Database className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Data</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Export or Seed',
    description: 'Export data as JSON, CSV, or SQL. Optionally seed data directly to a connected database environment.',
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
            <Send className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Seed</span>
        </div>
      </div>
    ),
  },
]

// ─── Types ───────────────────────────────────────────────────────────────────

type FieldType = 'name' | 'email' | 'phone' | 'address' | 'date' | 'uuid' | 'number' | 'boolean' | 'text'

interface SchemaField {
  id: string
  name: string
  type: FieldType
}

interface Preset {
  label: string
  fields: Omit<SchemaField, 'id'>[]
}

const FIELD_TYPES: FieldType[] = ['name', 'email', 'phone', 'address', 'date', 'uuid', 'number', 'boolean', 'text']

const PRESETS: Preset[] = [
  {
    label: 'User Profile',
    fields: [
      { name: 'id', type: 'uuid' },
      { name: 'fullName', type: 'name' },
      { name: 'email', type: 'email' },
      { name: 'phone', type: 'phone' },
      { name: 'address', type: 'address' },
      { name: 'createdAt', type: 'date' },
    ],
  },
  {
    label: 'Order',
    fields: [
      { name: 'orderId', type: 'uuid' },
      { name: 'customerName', type: 'name' },
      { name: 'customerEmail', type: 'email' },
      { name: 'amount', type: 'number' },
      { name: 'orderDate', type: 'date' },
      { name: 'shipped', type: 'boolean' },
    ],
  },
  {
    label: 'Product',
    fields: [
      { name: 'sku', type: 'uuid' },
      { name: 'productName', type: 'text' },
      { name: 'price', type: 'number' },
      { name: 'inStock', type: 'boolean' },
      { name: 'addedDate', type: 'date' },
    ],
  },
  {
    label: 'Transaction',
    fields: [
      { name: 'txnId', type: 'uuid' },
      { name: 'senderName', type: 'name' },
      { name: 'senderEmail', type: 'email' },
      { name: 'amount', type: 'number' },
      { name: 'timestamp', type: 'date' },
      { name: 'confirmed', type: 'boolean' },
    ],
  },
]

// ─── Component ───────────────────────────────────────────────────────────────

export default function TestDataGeneratorPage() {
  const [showHelp, setShowHelp] = useState(false)
  const [fields, setFields] = useState<SchemaField[]>([
    { id: crypto.randomUUID(), name: '', type: 'text' },
  ])
  const [count, setCount] = useState(10)
  const [generatedData, setGeneratedData] = useState<Record<string, unknown>[]>([])
  const [generating, setGenerating] = useState(false)

  // Seed API state
  const [seedUrl, setSeedUrl] = useState('')
  const [seedMethod, setSeedMethod] = useState<'POST' | 'PUT'>('POST')
  const [seedHeaders, setSeedHeaders] = useState('')
  const [seeding, setSeeding] = useState(false)
  const [seedResult, setSeedResult] = useState<string | null>(null)

  // ── Helpers ──

  const addField = () => {
    setFields((prev) => [...prev, { id: crypto.randomUUID(), name: '', type: 'text' }])
  }

  const removeField = (id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id))
  }

  const updateField = (id: string, key: keyof Omit<SchemaField, 'id'>, value: string) => {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [key]: value } : f))
    )
  }

  const applyPreset = (preset: Preset) => {
    setFields(preset.fields.map((f) => ({ ...f, id: crypto.randomUUID() })))
  }

  // ── Generate ──

  const handleGenerate = async () => {
    const schema = fields.filter((f) => f.name.trim()).map(({ name, type }) => ({ name, type }))
    if (schema.length === 0) return
    setGenerating(true)
    try {
      const { data } = await api.post('/api/v1/test-data/generate', { schema, count })
      setGeneratedData(data.records ?? data)
    } catch {
      // Fallback: generate client-side mock data
      const rows: Record<string, unknown>[] = []
      for (let i = 0; i < count; i++) {
        const row: Record<string, unknown> = {}
        schema.forEach(({ name, type }) => {
          switch (type) {
            case 'name': row[name] = `User_${i + 1}`; break
            case 'email': row[name] = `user${i + 1}@example.com`; break
            case 'phone': row[name] = `+1-555-${String(1000 + i).slice(-4)}`; break
            case 'address': row[name] = `${100 + i} Main St, City, ST`; break
            case 'date': row[name] = new Date(Date.now() - Math.random() * 3.154e10).toISOString().split('T')[0]; break
            case 'uuid': row[name] = crypto.randomUUID(); break
            case 'number': row[name] = Math.floor(Math.random() * 10000); break
            case 'boolean': row[name] = Math.random() > 0.5; break
            case 'text': row[name] = `Sample text ${i + 1}`; break
          }
        })
        rows.push(row)
      }
      setGeneratedData(rows)
    } finally {
      setGenerating(false)
    }
  }

  // ── Export ──

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(generatedData, null, 2)], { type: 'application/json' })
    downloadBlob(blob, 'test-data.json')
  }

  const exportCSV = () => {
    if (generatedData.length === 0) return
    const keys = Object.keys(generatedData[0])
    const rows = [keys.join(','), ...generatedData.map((r) => keys.map((k) => JSON.stringify(r[k] ?? '')).join(','))]
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    downloadBlob(blob, 'test-data.csv')
  }

  const exportSQL = () => {
    if (generatedData.length === 0) return
    const keys = Object.keys(generatedData[0])
    const table = 'test_data'
    const inserts = generatedData.map((r) => {
      const vals = keys.map((k) => {
        const v = r[k]
        return typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : String(v)
      })
      return `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${vals.join(', ')});`
    })
    const blob = new Blob([inserts.join('\n')], { type: 'text/sql' })
    downloadBlob(blob, 'test-data.sql')
  }

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Seed ──

  const handleSeed = async () => {
    if (!seedUrl.trim() || generatedData.length === 0) return
    setSeeding(true)
    setSeedResult(null)
    try {
      let headersObj: Record<string, string> = {}
      if (seedHeaders.trim()) {
        try { headersObj = JSON.parse(seedHeaders) } catch { /* ignore */ }
      }
      const { data } = await api.post('/api/v1/test-data/seed', {
        targetUrl: seedUrl,
        method: seedMethod,
        headers: headersObj,
        records: generatedData,
      })
      setSeedResult(`Success: ${data.message ?? 'Seeded ' + generatedData.length + ' records'}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Seed request failed'
      setSeedResult(`Error: ${msg}`)
    } finally {
      setSeeding(false)
    }
  }

  // ── Render ──

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Database size={24} className="text-accent" />
            Test Data Generator
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Build schemas, generate mock data, and seed your environments.
          </p>
        </div>
        <button onClick={() => setShowHelp(true)} className="flex items-center gap-2 rounded-full border border-border-subtle px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition">
          <Info className="h-4 w-4" /> How it works
        </button>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => applyPreset(p)}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:border-accent transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Schema Builder */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-text-primary mb-4">Schema Builder</h2>
        <div className="space-y-2">
          {fields.map((field) => (
            <div key={field.id} className="flex items-center gap-3">
              <input
                type="text"
                value={field.name}
                onChange={(e) => updateField(field.id, 'name', e.target.value)}
                placeholder="Field name"
                className="flex-1 rounded-lg border border-border bg-body px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <div className="relative">
                <select
                  value={field.type}
                  onChange={(e) => updateField(field.id, 'type', e.target.value)}
                  className="appearance-none rounded-lg border border-border bg-body px-3 py-2 pr-8 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
              </div>
              <button
                onClick={() => removeField(field.id)}
                className="rounded-lg p-2 text-text-secondary hover:text-red-400 hover:bg-red-400/10 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={addField}
          className="mt-3 flex items-center gap-1.5 text-xs font-medium text-accent-light hover:text-accent transition-colors"
        >
          <Plus size={14} /> Add Field
        </button>
      </div>

      {/* Generate Row */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-text-secondary">Records:</label>
          <input
            type="number"
            min={1}
            max={1000}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-24 rounded-lg border border-border bg-card px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
        >
          <Play size={16} />
          {generating ? 'Generating...' : 'Generate'}
        </button>
        {generatedData.length > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={exportJSON} className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors">
              <FileJson size={14} /> JSON
            </button>
            <button onClick={exportCSV} className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors">
              <FileText size={14} /> CSV
            </button>
            <button onClick={exportSQL} className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors">
              <Code size={14} /> SQL INSERT
            </button>
          </div>
        )}
      </div>

      {/* Preview Table */}
      {generatedData.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {Object.keys(generatedData[0]).map((key) => (
                    <th key={key} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {generatedData.slice(0, 50).map((row, i) => (
                  <tr key={i} className="hover:bg-body/50 transition-colors">
                    {Object.values(row).map((val, j) => (
                      <td key={j} className="px-4 py-2.5 text-text-primary whitespace-nowrap">
                        {String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {generatedData.length > 50 && (
            <div className="px-4 py-2 text-xs text-text-secondary border-t border-border">
              Showing 50 of {generatedData.length} records
            </div>
          )}
        </div>
      )}

      {/* Seed API Section */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Upload size={16} className="text-accent-light" />
          Seed API
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="text-xs text-text-secondary mb-1 block">Target URL</label>
            <input
              type="text"
              value={seedUrl}
              onChange={(e) => setSeedUrl(e.target.value)}
              placeholder="https://api.example.com/seed"
              className="w-full rounded-lg border border-border bg-body px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Method</label>
            <select
              value={seedMethod}
              onChange={(e) => setSeedMethod(e.target.value as 'POST' | 'PUT')}
              className="w-full rounded-lg border border-border bg-body px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
            </select>
          </div>
        </div>
        <div className="mt-3">
          <label className="text-xs text-text-secondary mb-1 block">Headers (JSON)</label>
          <textarea
            value={seedHeaders}
            onChange={(e) => setSeedHeaders(e.target.value)}
            placeholder='{"Content-Type": "application/json"}'
            rows={2}
            className="w-full rounded-lg border border-border bg-body px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 font-mono focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleSeed}
            disabled={seeding || generatedData.length === 0}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
          >
            <Upload size={16} />
            {seeding ? 'Seeding...' : 'Seed API'}
          </button>
          {seedResult && (
            <span className={cn('text-sm', seedResult.startsWith('Error') ? 'text-red-400' : 'text-green-400')}>
              {seedResult}
            </span>
          )}
        </div>
      </div>
    </div>
    <HowItWorks steps={howItWorksSteps} isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  )
}
