import { useState, useEffect } from 'react'
import {
  Database, Play, Loader2, Link2, CheckCircle2, XCircle, Table,
  ArrowLeftRight, ShieldCheck, AlertTriangle, Plus, Trash2, Info, ArrowRight, Plug, Code, CheckSquare, Shield
} from 'lucide-react'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'
import HowItWorks from '@/components/shared/HowItWorks'
import api from '@/lib/api'

const howItWorksSteps = [
  {
    title: 'Connect Database',
    description: 'Add a database connection by specifying type (PostgreSQL, MySQL, MongoDB), host, port, and credentials.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Database className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Database</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Plug className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Connect</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Write Query',
    description: 'Write SQL queries or MongoDB commands in the built-in editor. Execute against any connected database.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Code className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Write</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Play className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Run</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Run & Validate',
    description: 'Execute queries and view results in a formatted table. Check row counts and execution times.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Check</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Table className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Results</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Check Integrity',
    description: 'Run integrity checks to validate foreign keys, orphaned records, and data consistency across tables.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Integrity</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <CheckSquare className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Validated</span>
        </div>
      </div>
    ),
  },
]

// ─── Types ───────────────────────────────────────────────────────────────────

type DBType = 'postgresql' | 'mysql' | 'mongodb'
type ViewMode = 'query' | 'schema-diff' | 'integrity'

interface DBConnection {
  id: string
  name: string
  type: DBType
  host: string
  port: number
  database: string
  connected: boolean
}

interface QueryResult {
  columns: string[]
  rows: Record<string, string | number | null>[]
  rowCount: number
  executionTime: number
}

interface IntegrityCheck {
  name: string
  table: string
  type: string
  status: 'pass' | 'fail' | 'warn'
  detail: string
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function DatabaseTestingPage() {
  const [showHelp, setShowHelp] = useState(false)
  const { user } = useAuthStore()
  const [viewMode, setViewMode] = useState<ViewMode>('query')
  const [connections, setConnections] = useState<DBConnection[]>([])
  const [showConnForm, setShowConnForm] = useState(false)
  const [selectedConn, setSelectedConn] = useState<string>('')
  const [sqlQuery, setSqlQuery] = useState('')
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null)
  const [executing, setExecuting] = useState(false)

  // Connection form
  const [connType, setConnType] = useState<DBType>('postgresql')
  const [connHost, setConnHost] = useState('')
  const [connPort, setConnPort] = useState('')
  const [connDb, setConnDb] = useState('')
  const [connUser, setConnUser] = useState('')
  const [connPass, setConnPass] = useState('')

  // Schema diff
  const [diffConn1, setDiffConn1] = useState('')
  const [diffConn2, setDiffConn2] = useState('')

  // Integrity
  const [integrityChecks, setIntegrityChecks] = useState<IntegrityCheck[]>([])

  useEffect(() => {
    if (!user) return
    const ref = collection(db, 'dbConnections')
    const q = query(ref, where('userId', '==', user.uid))
    const unsub = onSnapshot(q, (snap) => {
      const conns = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as DBConnection[]
      setConnections(conns)
      if (conns.length > 0 && !selectedConn) setSelectedConn(conns[0].id)
    })
    return () => unsub()
  }, [user])

  const handleExecuteQuery = async () => {
    if (!sqlQuery.trim()) return
    setExecuting(true)
    try {
      const res = await api.post('/api/v1/db/query', { connectionId: selectedConn, query: sqlQuery })
      setQueryResult(res.data)
    } catch {
      setQueryResult(null)
    } finally {
      setExecuting(false)
    }
  }

  const handleAddConnection = () => {
    const newConn: DBConnection = {
      id: String(Date.now()),
      name: `${connType.toUpperCase()} - ${connDb}`,
      type: connType, host: connHost,
      port: Number(connPort) || 5432,
      database: connDb, connected: false
    }
    setConnections((prev) => [...prev, newConn])
    setShowConnForm(false)
    setConnHost(''); setConnPort(''); setConnDb(''); setConnUser(''); setConnPass('')
  }

  const schemaDiff = [
    { table: 'users', col: 'phone', left: 'VARCHAR(20)', right: 'VARCHAR(50)', diff: true },
    { table: 'users', col: 'id', left: 'SERIAL PRIMARY KEY', right: 'SERIAL PRIMARY KEY', diff: false },
    { table: 'users', col: 'email', left: 'VARCHAR(255) UNIQUE', right: 'VARCHAR(255) UNIQUE', diff: false },
    { table: 'orders', col: 'discount', left: '(missing)', right: 'DECIMAL(5,2)', diff: true },
    { table: 'orders', col: 'total', left: 'DECIMAL(10,2)', right: 'DECIMAL(10,2)', diff: false },
    { table: 'products', col: 'category_id', left: 'INT REFERENCES categories(id)', right: '(missing)', diff: true },
  ]

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Database className="text-[#A855F7]" size={26} /> Database Testing
          </h1>
          <p className="text-sm text-text-secondary mt-1">Query, compare schemas, and validate database integrity</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowConnForm(!showConnForm)} className="flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors">
            <Plus size={16} /> Add Connection
          </button>
          <button onClick={() => setShowHelp(true)} className="flex items-center gap-2 rounded-full border border-border-subtle px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition">
            <Info className="h-4 w-4" /> How it works
          </button>
        </div>
      </div>

      {/* Connections bar */}
      {connections.length === 0 && !showConnForm && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Database className="h-12 w-12 text-text-muted mb-4" />
          <h3 className="text-lg font-medium text-text-primary mb-1">No database connections yet</h3>
          <p className="text-sm text-text-secondary mb-4">Add a database connection to start running queries and integrity checks.</p>
          <button onClick={() => setShowConnForm(true)} className="flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors">
            <Plus size={16} /> Add Connection
          </button>
        </div>
      )}
      <div className="flex gap-2 flex-wrap">
        {connections.map((conn) => (
          <button
            key={conn.id}
            onClick={() => setSelectedConn(conn.id)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
              selectedConn === conn.id ? 'bg-[#A855F7]/10 border-[#A855F7]/30 text-[#A855F7]' : 'bg-card border-border text-text-secondary hover:text-text-primary'
            )}
          >
            <span className={cn('h-2 w-2 rounded-full', conn.connected ? 'bg-[#22C55E]' : 'bg-[#EF4444]')} />
            {conn.name}
          </button>
        ))}
      </div>

      {/* Connection Form */}
      {showConnForm && (
        <div className="rounded-xl bg-card border border-border p-5 space-y-4">
          <h3 className="text-sm font-semibold text-text-primary">New Connection</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-text-secondary block mb-1">Database Type</label>
              <select value={connType} onChange={(e) => setConnType(e.target.value as DBType)} className="w-full rounded-lg bg-body border border-border px-3 py-2 text-sm text-text-primary outline-none">
                <option value="postgresql">PostgreSQL</option>
                <option value="mysql">MySQL</option>
                <option value="mongodb">MongoDB</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Host</label>
              <input value={connHost} onChange={(e) => setConnHost(e.target.value)} placeholder="localhost" className="w-full rounded-lg bg-body border border-border px-3 py-2 text-sm text-text-primary outline-none focus:border-accent" />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Port</label>
              <input value={connPort} onChange={(e) => setConnPort(e.target.value)} placeholder="5432" className="w-full rounded-lg bg-body border border-border px-3 py-2 text-sm text-text-primary outline-none focus:border-accent" />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Database</label>
              <input value={connDb} onChange={(e) => setConnDb(e.target.value)} placeholder="my_database" className="w-full rounded-lg bg-body border border-border px-3 py-2 text-sm text-text-primary outline-none focus:border-accent" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-secondary block mb-1">Username</label>
              <input value={connUser} onChange={(e) => setConnUser(e.target.value)} placeholder="db_user" className="w-full rounded-lg bg-body border border-border px-3 py-2 text-sm text-text-primary outline-none focus:border-accent" />
            </div>
            <div>
              <label className="text-xs text-text-secondary block mb-1">Password</label>
              <input type="password" value={connPass} onChange={(e) => setConnPass(e.target.value)} placeholder="********" className="w-full rounded-lg bg-body border border-border px-3 py-2 text-sm text-text-primary outline-none focus:border-accent" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowConnForm(false)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
            <button onClick={handleAddConnection} className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors">Connect</button>
          </div>
        </div>
      )}

      {/* View Mode Tabs */}
      <div className="flex gap-1 bg-card rounded-lg p-1 border border-border">
        {([
          { key: 'query', label: 'SQL Query', icon: Table },
          { key: 'schema-diff', label: 'Schema Diff', icon: ArrowLeftRight },
          { key: 'integrity', label: 'Integrity Checks', icon: ShieldCheck },
        ] as { key: ViewMode; label: string; icon: React.ElementType }[]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setViewMode(tab.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors flex-1 justify-center',
              viewMode === tab.key ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary hover:bg-body'
            )}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* SQL Query View */}
      {viewMode === 'query' && (
        <div className="space-y-4">
          <div className="rounded-xl bg-card border border-border p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary">Query Editor</h3>
              <button
                onClick={handleExecuteQuery}
                disabled={executing || !sqlQuery.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-[#22C55E] text-white rounded-lg text-xs font-medium hover:bg-[#22C55E]/90 disabled:opacity-50 transition-colors"
              >
                {executing ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                Execute
              </button>
            </div>
            <textarea
              value={sqlQuery}
              onChange={(e) => setSqlQuery(e.target.value)}
              className="w-full h-32 rounded-lg bg-[#0D1117] border border-border p-4 text-xs text-[#E6EDF3] font-mono resize-none outline-none focus:border-accent"
              spellCheck={false}
            />
          </div>

          {queryResult && (
            <div className="rounded-xl bg-card border border-border p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary">Results</h3>
                <span className="text-xs text-text-secondary">{queryResult.rowCount} rows | {queryResult.executionTime}ms</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      {queryResult.columns.map((col) => (
                        <th key={col} className="px-3 py-2 text-left text-text-secondary font-semibold uppercase text-[10px] tracking-wider">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {queryResult.rows.map((row, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-body/50 transition-colors">
                        {queryResult.columns.map((col) => (
                          <td key={col} className="px-3 py-2 text-text-primary">{String(row[col] ?? 'NULL')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Schema Diff View */}
      {viewMode === 'schema-diff' && (
        <div className="space-y-4">
          <div className="rounded-xl bg-card border border-border p-5 space-y-4">
            <h3 className="text-sm font-semibold text-text-primary">Compare Schemas</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-text-secondary block mb-1">Connection A</label>
                <select value={diffConn1} onChange={(e) => setDiffConn1(e.target.value)} className="w-full rounded-lg bg-body border border-border px-3 py-2 text-sm text-text-primary outline-none">
                  {connections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-text-secondary block mb-1">Connection B</label>
                <select value={diffConn2} onChange={(e) => setDiffConn2(e.target.value)} className="w-full rounded-lg bg-body border border-border px-3 py-2 text-sm text-text-primary outline-none">
                  {connections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-card border border-border p-5 space-y-3">
            <h3 className="text-sm font-semibold text-text-primary">Schema Differences</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-3 py-2 text-left text-text-secondary font-semibold text-[10px] uppercase tracking-wider">Table</th>
                    <th className="px-3 py-2 text-left text-text-secondary font-semibold text-[10px] uppercase tracking-wider">Column</th>
                    <th className="px-3 py-2 text-left text-text-secondary font-semibold text-[10px] uppercase tracking-wider">Connection A</th>
                    <th className="px-3 py-2 text-left text-text-secondary font-semibold text-[10px] uppercase tracking-wider">Connection B</th>
                  </tr>
                </thead>
                <tbody>
                  {schemaDiff.map((d, i) => (
                    <tr key={i} className={cn('border-b border-border/50', d.diff && 'bg-[#EAB308]/5')}>
                      <td className="px-3 py-2 text-text-primary font-medium">{d.table}</td>
                      <td className="px-3 py-2 text-text-primary">{d.col}</td>
                      <td className={cn('px-3 py-2 font-mono', d.left === '(missing)' ? 'text-[#EF4444]' : 'text-text-primary')}>{d.left}</td>
                      <td className={cn('px-3 py-2 font-mono', d.right === '(missing)' ? 'text-[#EF4444]' : d.diff ? 'text-[#22C55E]' : 'text-text-primary')}>{d.right}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Integrity Checks View */}
      {viewMode === 'integrity' && (
        <div className="rounded-xl bg-card border border-border p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">Constraint & Integrity Checks</h3>
            <button className="flex items-center gap-2 px-3 py-1.5 bg-[#22C55E] text-white rounded-md text-xs font-medium hover:bg-[#22C55E]/90 transition-colors">
              <Play size={12} /> Run All Checks
            </button>
          </div>
          <div className="space-y-2">
            {integrityChecks.map((check, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-body border border-border px-4 py-3">
                <div className="flex items-center gap-3">
                  {check.status === 'pass' && <CheckCircle2 size={16} className="text-[#22C55E]" />}
                  {check.status === 'fail' && <XCircle size={16} className="text-[#EF4444]" />}
                  {check.status === 'warn' && <AlertTriangle size={16} className="text-[#EAB308]" />}
                  <div>
                    <p className="text-xs text-text-primary font-medium">{check.name}</p>
                    <p className="text-[10px] text-text-secondary">{check.table} | {check.detail}</p>
                  </div>
                </div>
                <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase',
                  check.status === 'pass' ? 'bg-[#22C55E]/10 text-[#22C55E]' :
                  check.status === 'fail' ? 'bg-[#EF4444]/10 text-[#EF4444]' :
                  'bg-[#EAB308]/10 text-[#EAB308]'
                )}>{check.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
    <HowItWorks steps={howItWorksSteps} isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  )
}
