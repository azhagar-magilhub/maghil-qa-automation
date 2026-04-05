import { useState, useEffect, useRef } from 'react'
import {
  Plus, Trash2, Send, Save, Upload, FileJson, Copy, MoreVertical,
  FolderOpen, Folder, ChevronDown, ChevronRight, Play, X, Search,
  Zap, CheckSquare, XSquare, Info, ArrowRight, FolderPlus, Code, CheckCircle2, BarChart3
} from 'lucide-react'
import {
  collection, doc, addDoc, updateDoc, deleteDoc, query, where, orderBy,
  onSnapshot, serverTimestamp, Timestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'
import { usePageTitle } from '@/hooks/usePageTitle'
import HowItWorks from '@/components/shared/HowItWorks'
import BulkActions from '@/components/shared/BulkActions'
import api from '@/lib/api'

const howItWorksSteps = [
  {
    title: 'Create Collection',
    description: 'Organize API requests into collections. Import from Postman JSON or create new collections from scratch.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <FolderPlus className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">New</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <FileJson className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Collection</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Build Request',
    description: 'Set the HTTP method, URL, headers, query params, and body. Use environment variables for dynamic values.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Code className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Method</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Send className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Send</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Add Assertions',
    description: 'Define assertions to validate status codes, response bodies, headers, and response times automatically.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Status</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <CheckSquare className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Assert</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Run & Verify',
    description: 'Execute requests and see results instantly. Failed assertions are highlighted. Auto-file Jira bugs on failures.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Play className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Execute</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Results</span>
        </div>
      </div>
    ),
  },
]

// ─── Types ───────────────────────────────────────────────────────────────────

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface KeyValuePair {
  key: string
  value: string
  enabled: boolean
}

interface Assertion {
  type: 'status' | 'body' | 'header' | 'time'
  path: string
  operator: 'equals' | 'contains' | 'gt' | 'lt' | 'exists'
  value: string
}

interface AssertionResult extends Assertion {
  passed: boolean
  actual: string
}

interface ApiRequest {
  id: string
  collectionId: string
  folderId: string | null
  name: string
  method: HttpMethod
  url: string
  params: KeyValuePair[]
  headers: KeyValuePair[]
  body: string
  authType: 'none' | 'bearer' | 'basic' | 'apikey'
  authToken: string
  authUsername: string
  authPassword: string
  authKeyName: string
  authKeyValue: string
  assertions: Assertion[]
  createdAt: Date
}

interface ApiCollection {
  id: string
  name: string
  userId: string
  createdAt: Date
}

interface ApiFolder {
  id: string
  collectionId: string
  name: string
  parentId: string | null
}

interface ResponseData {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
  time: number
  assertionResults: AssertionResult[]
}

interface Environment {
  name: string
  variables: Record<string, string>
}

// ─── Constants ───────────────────────────────────────────────────────────────

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'bg-status-green/20 text-status-green',
  POST: 'bg-status-blue/20 text-status-blue',
  PUT: 'bg-orange-500/20 text-orange-400',
  PATCH: 'bg-purple-500/20 text-purple-400',
  DELETE: 'bg-status-red/20 text-status-red',
}

const DEFAULT_HEADERS: KeyValuePair[] = [
  { key: 'Content-Type', value: 'application/json', enabled: true },
  { key: 'Accept', value: 'application/json', enabled: true },
]

const DEFAULT_ENVIRONMENTS: Environment[] = [
  { name: 'Dev', variables: { baseUrl: 'http://localhost:3000' } },
  { name: 'Staging', variables: { baseUrl: 'https://staging.example.com' } },
  { name: 'Prod', variables: { baseUrl: 'https://api.example.com' } },
]

type RequestTab = 'params' | 'headers' | 'body' | 'auth' | 'assertions'
type ResponseTab = 'body' | 'headers' | 'assertions'

// ─── Component ───────────────────────────────────────────────────────────────

export default function ApiTestRunnerPage() {
  usePageTitle('API Runner')
  const { user } = useAuthStore()
  const [showHelp, setShowHelp] = useState(false)

  // Collections & requests
  const [collections, setCollections] = useState<ApiCollection[]>([])
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set())
  const [requests, setRequests] = useState<ApiRequest[]>([])
  const [selectedRequest, setSelectedRequest] = useState<ApiRequest | null>(null)

  // New collection
  const [showNewCollection, setShowNewCollection] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')

  // Request editor state
  const [method, setMethod] = useState<HttpMethod>('GET')
  const [url, setUrl] = useState('')
  const [reqTab, setReqTab] = useState<RequestTab>('params')
  const [params, setParams] = useState<KeyValuePair[]>([{ key: '', value: '', enabled: true }])
  const [headers, setHeaders] = useState<KeyValuePair[]>([...DEFAULT_HEADERS])
  const [body, setBody] = useState('')
  const [authType, setAuthType] = useState<ApiRequest['authType']>('none')
  const [authToken, setAuthToken] = useState('')
  const [authUsername, setAuthUsername] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authKeyName, setAuthKeyName] = useState('')
  const [authKeyValue, setAuthKeyValue] = useState('')
  const [assertions, setAssertions] = useState<Assertion[]>([])
  const [requestName, setRequestName] = useState('New Request')

  // Response
  const [response, setResponse] = useState<ResponseData | null>(null)
  const [respTab, setRespTab] = useState<ResponseTab>('body')
  const [sending, setSending] = useState(false)

  // Environment
  const [environments, setEnvironments] = useState<Environment[]>(DEFAULT_ENVIRONMENTS)
  const [selectedEnv, setSelectedEnv] = useState<string>('Dev')

  // Collection run
  const [showCollectionRun, setShowCollectionRun] = useState(false)
  const [runningCollection, setRunningCollection] = useState(false)
  const [collectionRunResults, setCollectionRunResults] = useState<{ name: string; status: number; time: number; assertions: AssertionResult[]; error?: string }[]>([])
  const [runCollectionId, setRunCollectionId] = useState<string | null>(null)

  // Import
  const [showImport, setShowImport] = useState(false)
  const [importType, setImportType] = useState<'postman' | 'openapi'>('postman')
  const [importJson, setImportJson] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Bulk selection
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([])

  // ─── Load Collections ──────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'apiCollections'), where('userId', '==', user.uid), orderBy('createdAt', 'asc'))
    const unsub = onSnapshot(q, (snap) => {
      setCollections(snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt instanceof Timestamp ? d.data().createdAt.toDate() : new Date(),
      } as ApiCollection)))
    })
    return unsub
  }, [user])

  // ─── Load Requests for expanded collections ──────────────────────────

  useEffect(() => {
    if (!user || expandedCollections.size === 0) return
    const unsubs: (() => void)[] = []
    expandedCollections.forEach((colId) => {
      const q = query(collection(db, `apiCollections/${colId}/requests`), orderBy('createdAt', 'asc'))
      const unsub = onSnapshot(q, (snap) => {
        const newReqs = snap.docs.map((d) => ({
          id: d.id,
          collectionId: colId,
          ...d.data(),
          createdAt: d.data().createdAt instanceof Timestamp ? d.data().createdAt.toDate() : new Date(),
        } as ApiRequest))
        setRequests((prev) => {
          const filtered = prev.filter((r) => r.collectionId !== colId)
          return [...filtered, ...newReqs]
        })
      })
      unsubs.push(unsub)
    })
    return () => unsubs.forEach((u) => u())
  }, [user, expandedCollections])

  // ─── Collection Actions ───────────────────────────────────────────────

  const createCollection = async () => {
    if (!user || !newCollectionName.trim()) return
    await addDoc(collection(db, 'apiCollections'), {
      name: newCollectionName.trim(),
      userId: user.uid,
      createdAt: serverTimestamp(),
    })
    setNewCollectionName('')
    setShowNewCollection(false)
  }

  const deleteCollection = async (colId: string) => {
    const reqs = requests.filter((r) => r.collectionId === colId)
    for (const r of reqs) {
      await deleteDoc(doc(db, `apiCollections/${colId}/requests`, r.id))
    }
    await deleteDoc(doc(db, 'apiCollections', colId))
    if (selectedRequest?.collectionId === colId) setSelectedRequest(null)
  }

  const toggleCollection = (id: string) => {
    setExpandedCollections((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ─── Request Actions ──────────────────────────────────────────────────

  const selectRequest = (req: ApiRequest) => {
    setSelectedRequest(req)
    setMethod(req.method)
    setUrl(req.url)
    setParams(req.params?.length ? req.params : [{ key: '', value: '', enabled: true }])
    setHeaders(req.headers?.length ? req.headers : [...DEFAULT_HEADERS])
    setBody(req.body || '')
    setAuthType(req.authType || 'none')
    setAuthToken(req.authToken || '')
    setAuthUsername(req.authUsername || '')
    setAuthPassword(req.authPassword || '')
    setAuthKeyName(req.authKeyName || '')
    setAuthKeyValue(req.authKeyValue || '')
    setAssertions(req.assertions || [])
    setRequestName(req.name)
    setResponse(null)
  }

  const createRequest = async (collectionId: string) => {
    const reqRef = await addDoc(collection(db, `apiCollections/${collectionId}/requests`), {
      name: 'New Request',
      method: 'GET',
      url: '',
      params: [],
      headers: [...DEFAULT_HEADERS],
      body: '',
      authType: 'none',
      authToken: '',
      authUsername: '',
      authPassword: '',
      authKeyName: '',
      authKeyValue: '',
      assertions: [],
      folderId: null,
      createdAt: serverTimestamp(),
    })
    // Auto-expand and select
    setExpandedCollections((prev) => new Set([...prev, collectionId]))
    // The onSnapshot will pick up the new request
    setTimeout(() => {
      setRequests((prev) => {
        const found = prev.find((r) => r.id === reqRef.id)
        if (found) selectRequest(found)
        return prev
      })
    }, 500)
  }

  const saveRequest = async () => {
    if (!selectedRequest) return
    const data = {
      name: requestName,
      method, url, params, headers, body,
      authType, authToken, authUsername, authPassword, authKeyName, authKeyValue,
      assertions,
    }
    await updateDoc(doc(db, `apiCollections/${selectedRequest.collectionId}/requests`, selectedRequest.id), data)
  }

  const deleteRequest = async (req: ApiRequest) => {
    await deleteDoc(doc(db, `apiCollections/${req.collectionId}/requests`, req.id))
    if (selectedRequest?.id === req.id) setSelectedRequest(null)
  }

  // ─── Environment variable replacement ────────────────────────────────

  const resolveUrl = (rawUrl: string): string => {
    const env = environments.find((e) => e.name === selectedEnv)
    if (!env) return rawUrl
    let resolved = rawUrl
    Object.entries(env.variables).forEach(([k, v]) => {
      resolved = resolved.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v)
    })
    return resolved
  }

  // ─── Send Request ─────────────────────────────────────────────────────

  const sendRequest = async () => {
    setSending(true)
    setResponse(null)
    const startTime = Date.now()

    try {
      const resolvedUrl = resolveUrl(url)

      // Build query params
      const activeParams = params.filter((p) => p.enabled && p.key)
      const queryString = activeParams.map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&')
      const fullUrl = queryString ? `${resolvedUrl}?${queryString}` : resolvedUrl

      // Build headers
      const headerObj: Record<string, string> = {}
      headers.filter((h) => h.enabled && h.key).forEach((h) => { headerObj[h.key] = h.value })

      // Auth
      if (authType === 'bearer' && authToken) headerObj['Authorization'] = `Bearer ${authToken}`
      if (authType === 'basic' && authUsername) headerObj['Authorization'] = `Basic ${btoa(`${authUsername}:${authPassword}`)}`
      if (authType === 'apikey' && authKeyName && authKeyValue) headerObj[authKeyName] = authKeyValue

      // Send via backend proxy to avoid CORS
      const res = await api.post('/api-runner/proxy', {
        method, url: fullUrl, headers: headerObj,
        body: ['POST', 'PUT', 'PATCH'].includes(method) ? body : undefined,
      })

      const elapsed = Date.now() - startTime
      const respData = res.data

      // Evaluate assertions
      const assertionResults: AssertionResult[] = assertions.map((a) => {
        let actual = ''
        let passed = false
        try {
          if (a.type === 'status') {
            actual = String(respData.status)
            passed = evaluateAssertion(actual, a.operator, a.value)
          } else if (a.type === 'body') {
            const parsed = typeof respData.body === 'string' ? JSON.parse(respData.body) : respData.body
            actual = String(getNestedValue(parsed, a.path))
            passed = evaluateAssertion(actual, a.operator, a.value)
          } else if (a.type === 'header') {
            actual = String(respData.headers?.[a.path.toLowerCase()] || '')
            passed = evaluateAssertion(actual, a.operator, a.value)
          } else if (a.type === 'time') {
            actual = String(elapsed)
            passed = evaluateAssertion(actual, a.operator, a.value)
          }
        } catch {
          actual = 'Error evaluating'
        }
        return { ...a, passed, actual }
      })

      setResponse({
        status: respData.status || 200,
        statusText: respData.statusText || 'OK',
        headers: respData.headers || {},
        body: typeof respData.body === 'string' ? respData.body : JSON.stringify(respData.body, null, 2),
        time: elapsed,
        assertionResults,
      })
    } catch (err: unknown) {
      const elapsed = Date.now() - startTime
      const errorMessage = err instanceof Error ? err.message : 'Request failed'
      setResponse({
        status: 0,
        statusText: 'Error',
        headers: {},
        body: JSON.stringify({ error: errorMessage }, null, 2),
        time: elapsed,
        assertionResults: [],
      })
    } finally {
      setSending(false)
    }
  }

  // ─── Collection Run ───────────────────────────────────────────────────

  const runCollection = async (colId: string) => {
    setRunCollectionId(colId)
    setShowCollectionRun(true)
    setRunningCollection(true)
    setCollectionRunResults([])

    const colRequests = requests.filter((r) => r.collectionId === colId)
    const results: typeof collectionRunResults = []

    for (const req of colRequests) {
      const startTime = Date.now()
      try {
        const resolvedUrl = resolveUrl(req.url)
        const headerObj: Record<string, string> = {}
        req.headers?.filter((h) => h.enabled && h.key).forEach((h) => { headerObj[h.key] = h.value })

        if (req.authType === 'bearer' && req.authToken) headerObj['Authorization'] = `Bearer ${req.authToken}`

        const res = await api.post('/api-runner/proxy', {
          method: req.method, url: resolvedUrl, headers: headerObj,
          body: ['POST', 'PUT', 'PATCH'].includes(req.method) ? req.body : undefined,
        })
        const elapsed = Date.now() - startTime
        const respData = res.data

        const assertionResults: AssertionResult[] = (req.assertions || []).map((a) => {
          let actual = ''
          let passed = false
          try {
            if (a.type === 'status') { actual = String(respData.status); passed = evaluateAssertion(actual, a.operator, a.value) }
            else if (a.type === 'time') { actual = String(elapsed); passed = evaluateAssertion(actual, a.operator, a.value) }
          } catch { actual = 'Error' }
          return { ...a, passed, actual }
        })

        const entry = { name: req.name, status: respData.status || 200, time: elapsed, assertions: assertionResults }
        results.push(entry)
        setCollectionRunResults([...results])

        // Auto-file bug for failed assertions
        const anyFailed = assertionResults.some((a) => !a.passed)
        if (anyFailed) {
          try {
            await api.post('/jira/bug', {
              summary: `[API Test Failure] ${req.name}`,
              description: `API request "${req.name}" (${req.method} ${req.url}) had failed assertions during collection run.`,
              priority: 'High',
              labels: ['auto-filed', 'api-test-failure'],
            })
          } catch { /* best-effort */ }
        }
      } catch (err: unknown) {
        const elapsed = Date.now() - startTime
        const errorMessage = err instanceof Error ? err.message : 'Request failed'
        results.push({ name: req.name, status: 0, time: elapsed, assertions: [], error: errorMessage })
        setCollectionRunResults([...results])
      }
    }

    // Save run to Firestore
    if (colId) {
      await addDoc(collection(db, `apiCollections/${colId}/runs`), {
        results,
        environment: selectedEnv,
        createdAt: serverTimestamp(),
      })
    }

    setRunningCollection(false)
  }

  // ─── Import ───────────────────────────────────────────────────────────

  const handleImport = async () => {
    if (!user || !importJson.trim()) return
    try {
      const data = JSON.parse(importJson)

      if (importType === 'postman') {
        // Parse Postman Collection v2.1
        const colName = data.info?.name || 'Imported Collection'
        const colRef = await addDoc(collection(db, 'apiCollections'), {
          name: colName,
          userId: user.uid,
          createdAt: serverTimestamp(),
        })

        const items = data.item || []
        for (const item of items) {
          if (item.request) {
            await addDoc(collection(db, `apiCollections/${colRef.id}/requests`), {
              name: item.name || 'Untitled',
              method: item.request.method || 'GET',
              url: typeof item.request.url === 'string' ? item.request.url : item.request.url?.raw || '',
              params: [],
              headers: (item.request.header || []).map((h: { key: string; value: string }) => ({ key: h.key, value: h.value, enabled: true })),
              body: item.request.body?.raw || '',
              authType: 'none',
              authToken: '', authUsername: '', authPassword: '', authKeyName: '', authKeyValue: '',
              assertions: [],
              folderId: null,
              createdAt: serverTimestamp(),
            })
          }
        }
      } else {
        // Parse OpenAPI / Swagger
        const title = data.info?.title || 'Imported API'
        const colRef = await addDoc(collection(db, 'apiCollections'), {
          name: title,
          userId: user.uid,
          createdAt: serverTimestamp(),
        })

        const basePath = data.servers?.[0]?.url || data.basePath || ''
        const paths = data.paths || {}
        for (const [path, methods] of Object.entries(paths)) {
          for (const [m, details] of Object.entries(methods as Record<string, { summary?: string }>)) {
            if (['get', 'post', 'put', 'patch', 'delete'].includes(m)) {
              await addDoc(collection(db, `apiCollections/${colRef.id}/requests`), {
                name: details.summary || `${m.toUpperCase()} ${path}`,
                method: m.toUpperCase(),
                url: `${basePath}${path}`,
                params: [], headers: [...DEFAULT_HEADERS],
                body: '', authType: 'none',
                authToken: '', authUsername: '', authPassword: '', authKeyName: '', authKeyValue: '',
                assertions: [], folderId: null,
                createdAt: serverTimestamp(),
              })
            }
          }
        }
      }

      setShowImport(false)
      setImportJson('')
    } catch {
      alert('Invalid JSON. Please check the format and try again.')
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setImportJson(ev.target?.result as string)
    }
    reader.readAsText(file)
  }

  // ─── Key-value pair helpers ───────────────────────────────────────────

  const addKvPair = (setter: React.Dispatch<React.SetStateAction<KeyValuePair[]>>) => {
    setter((prev) => [...prev, { key: '', value: '', enabled: true }])
  }

  const updateKvPair = (setter: React.Dispatch<React.SetStateAction<KeyValuePair[]>>, idx: number, field: keyof KeyValuePair, value: string | boolean) => {
    setter((prev) => {
      const updated = [...prev]
      updated[idx] = { ...updated[idx], [field]: value }
      return updated
    })
  }

  const removeKvPair = (setter: React.Dispatch<React.SetStateAction<KeyValuePair[]>>, idx: number) => {
    setter((prev) => prev.filter((_, i) => i !== idx))
  }

  // ─── Assertion helpers ────────────────────────────────────────────────

  const addAssertion = () => {
    setAssertions([...assertions, { type: 'status', path: '', operator: 'equals', value: '200' }])
  }

  const updateAssertion = (idx: number, field: keyof Assertion, value: string) => {
    const updated = [...assertions]
    updated[idx] = { ...updated[idx], [field]: value }
    setAssertions(updated)
  }

  const removeAssertion = (idx: number) => setAssertions(assertions.filter((_, i) => i !== idx))

  // ─── Status color ─────────────────────────────────────────────────────

  const statusColor = (code: number) => {
    if (code >= 200 && code < 300) return 'bg-status-green/20 text-status-green'
    if (code >= 400 && code < 500) return 'bg-status-yellow/20 text-status-yellow'
    if (code >= 500) return 'bg-status-red/20 text-status-red'
    return 'bg-card text-text-secondary'
  }

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <>
    <div className="flex h-[calc(100vh-4rem)] gap-0 overflow-hidden">
      {/* ── Left Panel: Collection Tree ──────────────────────────────── */}
      <div className="w-72 flex-shrink-0 border-r border-border bg-sidebar flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Collections</h2>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowHelp(true)} className="rounded-md p-1.5 text-text-secondary hover:text-text-primary hover:bg-card transition-colors" title="How it works">
              <Info size={14} />
            </button>
            <button onClick={() => setShowImport(true)} className="rounded-md p-1.5 text-text-secondary hover:text-text-primary hover:bg-card transition-colors" title="Import">
              <Upload size={14} />
            </button>
            <button onClick={() => setShowNewCollection(true)} className="rounded-md p-1.5 text-text-secondary hover:text-text-primary hover:bg-card transition-colors" title="New Collection">
              <Plus size={16} />
            </button>
          </div>
        </div>

        {showNewCollection && (
          <div className="p-3 border-b border-border">
            <input
              autoFocus
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') createCollection(); if (e.key === 'Escape') setShowNewCollection(false) }}
              placeholder="Collection name..."
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <div className="flex gap-2 mt-2">
              <button onClick={createCollection} className="flex-1 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90">Create</button>
              <button onClick={() => setShowNewCollection(false)} className="flex-1 rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary">Cancel</button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2">
          {collections.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-text-secondary">No collections yet. Create one or import from Postman.</p>
          )}
          {collections.map((col) => {
            const isExpanded = expandedCollections.has(col.id)
            const colRequests = requests.filter((r) => r.collectionId === col.id)
            return (
              <div key={col.id}>
                <div className="flex items-center gap-1 rounded-lg px-2 py-1.5 hover:bg-card transition-colors group">
                  <button onClick={() => toggleCollection(col.id)} className="p-0.5 text-text-secondary">
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                  <button onClick={() => toggleCollection(col.id)} className="flex items-center gap-2 flex-1 text-sm text-text-secondary hover:text-text-primary truncate">
                    {isExpanded ? <FolderOpen size={14} /> : <Folder size={14} />}
                    <span className="truncate">{col.name}</span>
                  </button>
                  <div className="hidden group-hover:flex items-center gap-0.5">
                    <button onClick={() => createRequest(col.id)} className="rounded p-1 text-text-secondary hover:text-text-primary" title="Add Request">
                      <Plus size={12} />
                    </button>
                    <button onClick={() => runCollection(col.id)} className="rounded p-1 text-text-secondary hover:text-status-green" title="Run Collection">
                      <Play size={12} />
                    </button>
                    <button onClick={() => deleteCollection(col.id)} className="rounded p-1 text-text-secondary hover:text-status-red" title="Delete">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                {isExpanded && (
                  <div className="ml-4 space-y-0.5">
                    {colRequests.map((req) => (
                      <div
                        key={req.id}
                        onClick={() => selectRequest(req)}
                        className={cn(
                          'flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer text-sm transition-colors group/req',
                          selectedRequest?.id === req.id
                            ? 'bg-accent/15 text-accent-light'
                            : 'text-text-secondary hover:bg-card hover:text-text-primary',
                          selectedRequestIds.includes(req.id) && 'bg-accent/5'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={selectedRequestIds.includes(req.id)}
                          onChange={(e) => {
                            e.stopPropagation()
                            if (e.target.checked) setSelectedRequestIds([...selectedRequestIds, req.id])
                            else setSelectedRequestIds(selectedRequestIds.filter((id) => id !== req.id))
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="h-3.5 w-3.5 rounded border-border text-accent focus:ring-accent flex-shrink-0"
                        />
                        <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold uppercase', METHOD_COLORS[req.method])}>
                          {req.method}
                        </span>
                        <span className="truncate flex-1">{req.name}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteRequest(req) }}
                          className="hidden group-hover/req:block rounded p-0.5 text-text-secondary hover:text-status-red"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                    {colRequests.length === 0 && (
                      <p className="px-2 py-2 text-xs text-text-secondary/60">No requests</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Center + Bottom Panel ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedRequest ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Zap className="mx-auto h-12 w-12 text-text-secondary/40 mb-3" />
              <p className="text-text-secondary">Select a request or create a new one</p>
              <p className="text-text-secondary/60 text-sm mt-1">to start testing your API</p>
            </div>
          </div>
        ) : (
          <>
            {/* ── Request Editor (Center) ─────────────────────────────── */}
            <div className="flex-1 flex flex-col overflow-hidden border-b border-border">
              {/* URL bar */}
              <div className="flex items-center gap-3 p-4 border-b border-border">
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as HttpMethod)}
                  className={cn('rounded-lg border border-border px-3 py-2.5 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-accent', METHOD_COLORS[method])}
                  style={{ backgroundColor: 'transparent' }}
                >
                  {(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as HttpMethod[]).map((m) => (
                    <option key={m} value={m} className="bg-card text-text-primary">{m}</option>
                  ))}
                </select>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="{{baseUrl}}/api/endpoint"
                  className="flex-1 rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent font-mono"
                  onKeyDown={(e) => { if (e.key === 'Enter') sendRequest() }}
                />
                <select
                  value={selectedEnv}
                  onChange={(e) => setSelectedEnv(e.target.value)}
                  className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  {environments.map((env) => (
                    <option key={env.name} value={env.name}>{env.name}</option>
                  ))}
                </select>
                <button
                  onClick={sendRequest}
                  disabled={sending || !url}
                  className="flex items-center gap-2 rounded-lg bg-status-blue px-6 py-2.5 text-sm font-semibold text-white hover:bg-status-blue/90 disabled:opacity-50 transition-colors"
                >
                  <Send size={16} /> {sending ? 'Sending...' : 'Send'}
                </button>
                <button
                  onClick={saveRequest}
                  className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-card transition-colors"
                >
                  <Save size={16} /> Save
                </button>
              </div>

              {/* Request name */}
              <div className="px-4 pt-3 pb-1">
                <input
                  value={requestName}
                  onChange={(e) => setRequestName(e.target.value)}
                  className="bg-transparent text-sm text-text-secondary focus:text-text-primary focus:outline-none border-b border-transparent focus:border-border pb-1"
                  placeholder="Request name"
                />
              </div>

              {/* Request Tabs */}
              <div className="flex items-center gap-1 px-4 border-b border-border">
                {(['params', 'headers', 'body', 'auth', 'assertions'] as RequestTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setReqTab(tab)}
                    className={cn(
                      'px-3 py-2 text-xs font-medium capitalize border-b-2 transition-colors',
                      reqTab === tab ? 'border-accent text-accent-light' : 'border-transparent text-text-secondary hover:text-text-primary'
                    )}
                  >
                    {tab}
                    {tab === 'assertions' && assertions.length > 0 && (
                      <span className="ml-1 rounded-full bg-accent/20 px-1.5 text-[10px] text-accent-light">{assertions.length}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-auto p-4">
                {/* Params */}
                {reqTab === 'params' && (
                  <KeyValueEditor pairs={params} setPairs={setParams} addPair={() => addKvPair(setParams)} updatePair={(i, f, v) => updateKvPair(setParams, i, f, v)} removePair={(i) => removeKvPair(setParams, i)} />
                )}

                {/* Headers */}
                {reqTab === 'headers' && (
                  <KeyValueEditor pairs={headers} setPairs={setHeaders} addPair={() => addKvPair(setHeaders)} updatePair={(i, f, v) => updateKvPair(setHeaders, i, f, v)} removePair={(i) => removeKvPair(setHeaders, i)} />
                )}

                {/* Body */}
                {reqTab === 'body' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-text-secondary">JSON Body</span>
                      <button
                        onClick={() => { try { setBody(JSON.stringify(JSON.parse(body), null, 2)) } catch { /* ignore */ } }}
                        className="text-xs text-accent-light hover:underline"
                      >
                        Format JSON
                      </button>
                    </div>
                    <textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder='{"key": "value"}'
                      className="w-full h-48 rounded-lg border border-border bg-sidebar px-4 py-3 text-sm text-text-primary font-mono placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                    />
                  </div>
                )}

                {/* Auth */}
                {reqTab === 'auth' && (
                  <div className="space-y-4 max-w-md">
                    <select
                      value={authType}
                      onChange={(e) => setAuthType(e.target.value as ApiRequest['authType'])}
                      className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                      <option value="none">No Auth</option>
                      <option value="bearer">Bearer Token</option>
                      <option value="basic">Basic Auth</option>
                      <option value="apikey">API Key</option>
                    </select>
                    {authType === 'bearer' && (
                      <input value={authToken} onChange={(e) => setAuthToken(e.target.value)} placeholder="Token" className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-text-primary font-mono placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent" />
                    )}
                    {authType === 'basic' && (
                      <div className="space-y-2">
                        <input value={authUsername} onChange={(e) => setAuthUsername(e.target.value)} placeholder="Username" className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent" />
                        <input value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="Password" type="password" className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent" />
                      </div>
                    )}
                    {authType === 'apikey' && (
                      <div className="space-y-2">
                        <input value={authKeyName} onChange={(e) => setAuthKeyName(e.target.value)} placeholder="Header name (e.g. X-API-Key)" className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent" />
                        <input value={authKeyValue} onChange={(e) => setAuthKeyValue(e.target.value)} placeholder="API Key value" className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-text-primary font-mono placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent" />
                      </div>
                    )}
                  </div>
                )}

                {/* Assertions */}
                {reqTab === 'assertions' && (
                  <div className="space-y-3">
                    {assertions.map((a, idx) => (
                      <div key={idx} className="flex items-center gap-2 rounded-lg border border-border bg-sidebar/50 p-3">
                        <select value={a.type} onChange={(e) => updateAssertion(idx, 'type', e.target.value)} className="rounded-md border border-border bg-card px-2 py-1.5 text-xs text-text-primary focus:outline-none">
                          <option value="status">Status</option>
                          <option value="body">Body</option>
                          <option value="header">Header</option>
                          <option value="time">Time (ms)</option>
                        </select>
                        {(a.type === 'body' || a.type === 'header') && (
                          <input value={a.path} onChange={(e) => updateAssertion(idx, 'path', e.target.value)} placeholder="Path / key" className="rounded-md border border-border bg-card px-2 py-1.5 text-xs text-text-primary w-28 focus:outline-none font-mono" />
                        )}
                        <select value={a.operator} onChange={(e) => updateAssertion(idx, 'operator', e.target.value)} className="rounded-md border border-border bg-card px-2 py-1.5 text-xs text-text-primary focus:outline-none">
                          <option value="equals">equals</option>
                          <option value="contains">contains</option>
                          <option value="gt">greater than</option>
                          <option value="lt">less than</option>
                          <option value="exists">exists</option>
                        </select>
                        <input value={a.value} onChange={(e) => updateAssertion(idx, 'value', e.target.value)} placeholder="Expected value" className="flex-1 rounded-md border border-border bg-card px-2 py-1.5 text-xs text-text-primary focus:outline-none font-mono" />
                        <button onClick={() => removeAssertion(idx)} className="rounded p-1 text-text-secondary hover:text-status-red">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    <button onClick={addAssertion} className="flex items-center gap-1 text-xs text-accent-light hover:underline">
                      <Plus size={12} /> Add Assertion
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ── Response Viewer (Bottom) ────────────────────────────── */}
            <div className="h-[40%] min-h-[200px] flex flex-col border-t border-border bg-sidebar/30">
              {!response ? (
                <div className="flex-1 flex items-center justify-center text-text-secondary text-sm">
                  {sending ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                      Sending request...
                    </div>
                  ) : 'Hit Send to get a response'}
                </div>
              ) : (
                <>
                  {/* Response status bar */}
                  <div className="flex items-center gap-4 px-4 py-2 border-b border-border">
                    <span className={cn('rounded-full px-3 py-1 text-xs font-bold', statusColor(response.status))}>
                      {response.status} {response.statusText}
                    </span>
                    <span className="text-xs text-text-secondary">{response.time}ms</span>
                    <div className="flex-1" />
                    <div className="flex items-center gap-1">
                      {(['body', 'headers', 'assertions'] as ResponseTab[]).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setRespTab(tab)}
                          className={cn(
                            'px-3 py-1 text-xs font-medium capitalize rounded-md transition-colors',
                            respTab === tab ? 'bg-card text-text-primary' : 'text-text-secondary hover:text-text-primary'
                          )}
                        >
                          {tab}
                          {tab === 'assertions' && response.assertionResults.length > 0 && (
                            <span className={cn(
                              'ml-1 rounded-full px-1.5 text-[10px]',
                              response.assertionResults.every((a) => a.passed) ? 'bg-status-green/20 text-status-green' : 'bg-status-red/20 text-status-red'
                            )}>
                              {response.assertionResults.filter((a) => a.passed).length}/{response.assertionResults.length}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => { navigator.clipboard.writeText(response.body) }}
                      className="rounded p-1.5 text-text-secondary hover:text-text-primary hover:bg-card transition-colors"
                      title="Copy response"
                    >
                      <Copy size={14} />
                    </button>
                  </div>

                  {/* Response Content */}
                  <div className="flex-1 overflow-auto p-4">
                    {respTab === 'body' && (
                      <pre className="text-xs text-text-primary font-mono whitespace-pre-wrap break-words">{response.body}</pre>
                    )}
                    {respTab === 'headers' && (
                      <div className="space-y-1">
                        {Object.entries(response.headers).map(([k, v]) => (
                          <div key={k} className="flex gap-3 text-xs">
                            <span className="text-accent-light font-mono">{k}:</span>
                            <span className="text-text-primary font-mono">{v}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {respTab === 'assertions' && (
                      <div className="space-y-2">
                        {response.assertionResults.length === 0 ? (
                          <p className="text-xs text-text-secondary">No assertions configured for this request.</p>
                        ) : (
                          response.assertionResults.map((a, idx) => (
                            <div key={idx} className={cn(
                              'flex items-center gap-3 rounded-lg border p-3 text-xs',
                              a.passed ? 'border-status-green/30 bg-status-green/5' : 'border-status-red/30 bg-status-red/5'
                            )}>
                              {a.passed ? <CheckSquare size={14} className="text-status-green flex-shrink-0" /> : <XSquare size={14} className="text-status-red flex-shrink-0" />}
                              <span className="text-text-primary">
                                {a.type}{a.path ? `.${a.path}` : ''} {a.operator} {a.value}
                              </span>
                              <span className="text-text-secondary ml-auto">Actual: {a.actual}</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Collection Run Modal ──────────────────────────────────────── */}
      {showCollectionRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-2xl rounded-xl bg-card border border-border shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="text-lg font-semibold text-text-primary">Collection Run</h3>
              <button onClick={() => setShowCollectionRun(false)} className="rounded-md p-1.5 text-text-secondary hover:text-text-primary hover:bg-sidebar">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-5 space-y-3">
              {runningCollection && (
                <div className="flex items-center gap-2 text-sm text-accent-light">
                  <div className="h-4 w-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  Running requests...
                </div>
              )}
              {collectionRunResults.map((r, idx) => (
                <div key={idx} className="flex items-center gap-3 rounded-lg border border-border bg-sidebar/50 p-3">
                  <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold', statusColor(r.status))}>
                    {r.status || 'ERR'}
                  </span>
                  <span className="flex-1 text-sm text-text-primary truncate">{r.name}</span>
                  <span className="text-xs text-text-secondary">{r.time}ms</span>
                  {r.assertions.length > 0 && (
                    <span className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-medium',
                      r.assertions.every((a) => a.passed) ? 'bg-status-green/20 text-status-green' : 'bg-status-red/20 text-status-red'
                    )}>
                      {r.assertions.filter((a) => a.passed).length}/{r.assertions.length} pass
                    </span>
                  )}
                  {r.error && <span className="text-xs text-status-red truncate max-w-[150px]">{r.error}</span>}
                </div>
              ))}
              {!runningCollection && collectionRunResults.length === 0 && (
                <p className="text-sm text-text-secondary">No results yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Import Modal ──────────────────────────────────────────────── */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-lg rounded-xl bg-card border border-border shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="text-lg font-semibold text-text-primary">Import Collection</h3>
              <button onClick={() => setShowImport(false)} className="rounded-md p-1.5 text-text-secondary hover:text-text-primary hover:bg-sidebar">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setImportType('postman')}
                  className={cn('flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors',
                    importType === 'postman' ? 'border-accent bg-accent/10 text-accent-light' : 'border-border text-text-secondary hover:text-text-primary'
                  )}
                >
                  <FileJson size={16} className="inline mr-2" /> Postman Collection
                </button>
                <button
                  onClick={() => setImportType('openapi')}
                  className={cn('flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors',
                    importType === 'openapi' ? 'border-accent bg-accent/10 text-accent-light' : 'border-border text-text-secondary hover:text-text-primary'
                  )}
                >
                  <FileJson size={16} className="inline mr-2" /> OpenAPI / Swagger
                </button>
              </div>

              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.yaml,.yml"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-lg border-2 border-dashed border-border px-4 py-6 text-sm text-text-secondary hover:border-accent/50 hover:text-text-primary transition-colors"
                >
                  <Upload size={20} className="mx-auto mb-2" />
                  Click to upload a file or paste JSON below
                </button>
              </div>

              <textarea
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder="Paste JSON here..."
                rows={6}
                className="w-full rounded-lg border border-border bg-sidebar px-4 py-3 text-xs text-text-primary font-mono placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent resize-none"
              />

              <button
                onClick={handleImport}
                disabled={!importJson.trim()}
                className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    {/* Bulk Actions */}
    <BulkActions
      selectedIds={selectedRequestIds}
      totalCount={requests.length}
      onSelectAll={() => setSelectedRequestIds(requests.map((r) => r.id))}
      onDeselectAll={() => setSelectedRequestIds([])}
      actions={[
        {
          label: 'Run Selected',
          icon: <Play size={14} />,
          onClick: () => { setSelectedRequestIds([]) },
        },
        {
          label: 'Delete Selected',
          icon: <Trash2 size={14} />,
          variant: 'danger',
          onClick: async (ids) => {
            for (const id of ids) {
              const req = requests.find((r) => r.id === id)
              if (req) await deleteRequest(req)
            }
            setSelectedRequestIds([])
          },
        },
      ]}
    />
    <HowItWorks steps={howItWorksSteps} isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function KeyValueEditor({
  pairs,
  setPairs,
  addPair,
  updatePair,
  removePair,
}: {
  pairs: KeyValuePair[]
  setPairs: React.Dispatch<React.SetStateAction<KeyValuePair[]>>
  addPair: () => void
  updatePair: (idx: number, field: keyof KeyValuePair, value: string | boolean) => void
  removePair: (idx: number) => void
}) {
  return (
    <div className="space-y-2">
      {pairs.map((p, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={p.enabled}
            onChange={(e) => updatePair(idx, 'enabled', e.target.checked)}
            className="rounded border-border"
          />
          <input
            value={p.key}
            onChange={(e) => updatePair(idx, 'key', e.target.value)}
            placeholder="Key"
            className="flex-1 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-text-primary font-mono placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <input
            value={p.value}
            onChange={(e) => updatePair(idx, 'value', e.target.value)}
            placeholder="Value"
            className="flex-1 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-text-primary font-mono placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <button onClick={() => removePair(idx)} className="rounded p-1 text-text-secondary hover:text-status-red">
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button onClick={addPair} className="flex items-center gap-1 text-xs text-accent-light hover:underline">
        <Plus size={12} /> Add Row
      </button>
    </div>
  )
}

// ─── Utility functions ───────────────────────────────────────────────────────

function evaluateAssertion(actual: string, operator: string, expected: string): boolean {
  switch (operator) {
    case 'equals': return actual === expected
    case 'contains': return actual.includes(expected)
    case 'gt': return Number(actual) > Number(expected)
    case 'lt': return Number(actual) < Number(expected)
    case 'exists': return actual !== '' && actual !== 'undefined' && actual !== 'null'
    default: return false
  }
}

function getNestedValue(obj: unknown, path: string): unknown {
  if (!path) return obj
  const keys = path.split('.')
  let current: unknown = obj
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[key]
  }
  return current
}
