import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Smartphone, Tablet, Play, Upload, Loader2, CheckCircle2, XCircle,
  AlertTriangle, Clock, Bug, ChevronDown, ChevronRight, Image,
  Server, Cpu, UploadCloud, Trash2, FileCode, History, Info, ArrowRight, Code, FileText
} from 'lucide-react'
import {
  collection, query, where, orderBy, onSnapshot, limit, Timestamp
} from 'firebase/firestore'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'
import HowItWorks from '@/components/shared/HowItWorks'
import api from '@/lib/api'

const howItWorksSteps = [
  {
    title: 'Select Device',
    description: 'Choose from available real or emulated iOS and Android devices. Check device status before starting a test.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Smartphone className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Pick device</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Selected</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Upload App',
    description: 'Upload your APK or IPA build file. The app is stored securely and deployed to the selected device for testing.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Upload className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">APK/IPA</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <FileCode className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Uploaded</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Write Script',
    description: 'Write an Appium test script using the built-in editor. Configure desired capabilities for the target device.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Code className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Script</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <FileText className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Ready</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Run Test',
    description: 'Execute the test and monitor progress. View screenshots, error logs, and auto-filed bugs when tests fail.',
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
            <Smartphone className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">On device</span>
        </div>
      </div>
    ),
  },
]

// ─── Types ───────────────────────────────────────────────────────────────────

interface Device {
  id: string
  name: string
  platform: 'iOS' | 'Android'
  platformVersion: string
  status: 'available' | 'busy' | 'offline'
  udid?: string
}

interface Capabilities {
  platformName: string
  platformVersion: string
  deviceName: string
  app: string
  automationName: string
}

interface TestExecution {
  id: string
  name: string
  status: 'PASS' | 'FAIL' | 'ERROR' | 'RUNNING'
  duration: number
  device: string
  platform: string
  errorLogs: string[]
  screenshots: string[]
  createdAt: Date
  autoFiledBug: string | null
}

interface MatrixCell {
  device: string
  platform: string
  status: 'PASS' | 'FAIL' | 'ERROR' | 'PENDING'
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_SCRIPT = `// Appium-style test script
describe('App launch test', () => {
  it('should launch the app', async () => {
    const el = await $('~welcome-screen');
    await expect(el).toBeDisplayed();
  });

  it('should navigate to login', async () => {
    const loginBtn = await $('~login-button');
    await loginBtn.click();
    const loginScreen = await $('~login-screen');
    await expect(loginScreen).toBeDisplayed();
  });
});`

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusColor(status: string) {
  switch (status) {
    case 'PASS': return 'bg-status-green'
    case 'FAIL': return 'bg-status-red'
    case 'ERROR': return 'bg-status-yellow'
    case 'RUNNING': return 'bg-status-blue'
    case 'PENDING': return 'bg-card'
    default: return 'bg-card'
  }
}

function deviceStatusColor(status: string) {
  switch (status) {
    case 'available': return 'bg-status-green'
    case 'busy': return 'bg-status-yellow'
    case 'offline': return 'bg-status-red/50'
    default: return 'bg-card'
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function MobileTestRunnerPage() {
  const [showHelp, setShowHelp] = useState(false)
  const { user } = useAuthStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Devices
  const [devices, setDevices] = useState<Device[]>([])
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [loadingDevices, setLoadingDevices] = useState(true)

  // App upload
  const [uploadedApp, setUploadedApp] = useState<{ name: string; url: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragOver, setDragOver] = useState(false)

  // Capabilities
  const [capabilities, setCapabilities] = useState<Capabilities>({
    platformName: 'Android',
    platformVersion: '',
    deviceName: '',
    app: '',
    automationName: 'UiAutomator2',
  })

  // Script
  const [script, setScript] = useState(DEFAULT_SCRIPT)

  // Execution
  const [running, setRunning] = useState(false)
  const [latestResult, setLatestResult] = useState<TestExecution | null>(null)

  // History & Matrix
  const [history, setHistory] = useState<TestExecution[]>([])
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'results' | 'matrix'>('results')
  const [matrixData, setMatrixData] = useState<MatrixCell[]>([])

  // ─── Fetch Devices ───────────────────────────────────────────────────────

  useEffect(() => {
    const fetchDevices = async () => {
      setLoadingDevices(true)
      try {
        const { data } = await api.get('/api/v1/mobile-test/devices')
        setDevices(data)
      } catch {
        // Fallback: common device profiles shown when device API is unreachable.
        // These are NOT live devices — they serve as selectable templates so the
        // user can still configure capabilities while the backend is offline.
        setDevices([
          { id: 'fallback-1', name: 'Pixel 7 Pro', platform: 'Android', platformVersion: '13', status: 'offline' },
          { id: 'fallback-2', name: 'Samsung Galaxy S23', platform: 'Android', platformVersion: '14', status: 'offline' },
          { id: 'fallback-3', name: 'iPhone 15 Pro', platform: 'iOS', platformVersion: '17.2', status: 'offline' },
          { id: 'fallback-4', name: 'iPhone 14', platform: 'iOS', platformVersion: '16.6', status: 'offline' },
          { id: 'fallback-5', name: 'iPad Pro 12.9"', platform: 'iOS', platformVersion: '17.2', status: 'offline' },
        ])
      } finally {
        setLoadingDevices(false)
      }
    }
    fetchDevices()
  }, [])

  // ─── Firestore History ───────────────────────────────────────────────────

  useEffect(() => {
    if (!user?.uid) return
    const q = query(
      collection(db, 'testExecutions'),
      where('userId', '==', user.uid),
      where('type', '==', 'MOBILE_APPIUM'),
      orderBy('createdAt', 'desc'),
      limit(20)
    )
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt instanceof Timestamp
          ? d.data().createdAt.toDate()
          : new Date(d.data().createdAt),
      })) as TestExecution[]
      setHistory(items)

      // Build matrix from recent runs
      const matrix: MatrixCell[] = []
      const seen = new Set<string>()
      items.forEach((item) => {
        const key = `${item.device}-${item.platform}`
        if (!seen.has(key)) {
          seen.add(key)
          matrix.push({ device: item.device, platform: item.platform, status: item.status as any })
        }
      })
      setMatrixData(matrix)
    })
    return unsub
  }, [user?.uid])

  // ─── File Upload ─────────────────────────────────────────────────────────

  const handleFileUpload = useCallback(
    async (file: File) => {
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (ext !== 'apk' && ext !== 'ipa') {
        alert('Please upload an .apk or .ipa file')
        return
      }
      setUploading(true)
      setUploadProgress(0)
      try {
        const storageRef = ref(storage, `apps/${user?.uid}/${Date.now()}_${file.name}`)
        const task = uploadBytesResumable(storageRef, file)
        task.on('state_changed', (snap) => {
          setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100))
        })
        await task
        const url = await getDownloadURL(storageRef)
        setUploadedApp({ name: file.name, url })
        setCapabilities((prev) => ({ ...prev, app: url }))
      } catch {
        alert('Upload failed')
      } finally {
        setUploading(false)
      }
    },
    [user?.uid]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFileUpload(file)
    },
    [handleFileUpload]
  )

  const handleSelectDevice = useCallback((device: Device) => {
    setSelectedDevice(device)
    setCapabilities((prev) => ({
      ...prev,
      platformName: device.platform,
      platformVersion: device.platformVersion,
      deviceName: device.name,
      automationName: device.platform === 'iOS' ? 'XCUITest' : 'UiAutomator2',
    }))
  }, [])

  // ─── Run Test ────────────────────────────────────────────────────────────

  const handleRunTest = useCallback(async () => {
    if (running || !selectedDevice) return
    setRunning(true)
    setLatestResult(null)
    try {
      const { data } = await api.post('/api/v1/mobile-test/run', {
        deviceId: selectedDevice.id,
        capabilities,
        script,
      })
      setLatestResult(data)
    } catch (err: any) {
      setLatestResult({
        id: 'error',
        name: 'Mobile Test Run',
        status: 'ERROR',
        duration: 0,
        device: selectedDevice.name,
        platform: selectedDevice.platform,
        errorLogs: [err.response?.data?.message || err.message || 'Unknown error'],
        screenshots: [],
        createdAt: new Date(),
        autoFiledBug: null,
      })
    } finally {
      setRunning(false)
    }
  }, [running, selectedDevice, capabilities, script])

  const handleAutoFileBug = useCallback(async (execution: TestExecution) => {
    try {
      await api.post('/api/v1/bugs/auto-file', {
        executionId: execution.id,
        type: 'MOBILE_APPIUM',
        summary: `[Mobile Test Fail] ${execution.name || execution.device}`,
        description: execution.errorLogs.join('\n'),
      })
    } catch {
      // silently fail
    }
  }, [])

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Mobile Test Runner</h1>
          <p className="text-sm text-text-secondary mt-1">
            Run Appium-based mobile tests across real and emulated devices
          </p>
        </div>
        <button onClick={() => setShowHelp(true)} className="flex items-center gap-2 rounded-full border border-border-subtle px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition">
          <Info className="h-4 w-4" /> How it works
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* ── Left: Device Selector ──────────────────────────────────────── */}
        <div className="xl:col-span-1">
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <Server size={16} className="text-text-secondary" />
              <h3 className="text-sm font-semibold text-text-primary">Devices</h3>
            </div>
            <div className="max-h-[400px] overflow-y-auto divide-y divide-border">
              {loadingDevices ? (
                <div className="p-6 flex items-center justify-center">
                  <Loader2 size={20} className="animate-spin text-text-secondary" />
                </div>
              ) : (
                devices.map((device) => (
                  <button
                    key={device.id}
                    onClick={() => handleSelectDevice(device)}
                    disabled={device.status === 'offline'}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
                      selectedDevice?.id === device.id
                        ? 'bg-accent/10'
                        : 'hover:bg-body',
                      device.status === 'offline' && 'opacity-40 cursor-not-allowed'
                    )}
                  >
                    {device.platform === 'iOS' ? (
                      <Smartphone size={18} className="text-text-secondary" />
                    ) : (
                      <Smartphone size={18} className="text-status-green" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {device.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className={cn(
                            'rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase text-white',
                            device.platform === 'iOS' ? 'bg-status-blue' : 'bg-status-green'
                          )}
                        >
                          {device.platform}
                        </span>
                        <span className="text-[10px] text-text-secondary">
                          v{device.platformVersion}
                        </span>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'h-2.5 w-2.5 rounded-full',
                        deviceStatusColor(device.status)
                      )}
                      title={device.status}
                    />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── Center: Configuration ──────────────────────────────────────── */}
        <div className="xl:col-span-2 space-y-4">
          {/* App Upload Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            className={cn(
              'rounded-xl border-2 border-dashed bg-card p-6 text-center transition-colors',
              dragOver
                ? 'border-accent bg-accent/5'
                : 'border-border hover:border-text-secondary/30'
            )}
          >
            {uploading ? (
              <div className="space-y-2">
                <Loader2 size={28} className="animate-spin text-accent mx-auto" />
                <p className="text-sm text-text-secondary">Uploading... {uploadProgress}%</p>
                <div className="h-1.5 w-full max-w-xs mx-auto rounded-full bg-body overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            ) : uploadedApp ? (
              <div className="flex items-center justify-center gap-3">
                <FileCode size={20} className="text-status-green" />
                <span className="text-sm font-medium text-text-primary">
                  {uploadedApp.name}
                </span>
                <button
                  onClick={() => {
                    setUploadedApp(null)
                    setCapabilities((prev) => ({ ...prev, app: '' }))
                  }}
                  className="text-text-secondary hover:text-status-red transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ) : (
              <>
                <UploadCloud size={32} className="text-text-secondary/40 mx-auto mb-2" />
                <p className="text-sm text-text-secondary mb-1">
                  Drag and drop .apk or .ipa file here
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-accent-light hover:underline"
                >
                  or click to browse
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".apk,.ipa"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileUpload(file)
                  }}
                />
              </>
            )}
          </div>

          {/* Capabilities Builder */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Cpu size={16} className="text-text-secondary" />
              <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Desired Capabilities
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  ['platformName', 'Platform'],
                  ['platformVersion', 'Platform Version'],
                  ['deviceName', 'Device Name'],
                  ['app', 'App Path / URL'],
                  ['automationName', 'Automation Name'],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className={key === 'app' ? 'col-span-2' : ''}>
                  <label className="block text-[11px] text-text-secondary mb-1">{label}</label>
                  <input
                    type="text"
                    value={capabilities[key]}
                    onChange={(e) =>
                      setCapabilities((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    className="w-full rounded-lg border border-border bg-body px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/40 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Script Editor */}
          <div className="rounded-xl border border-border bg-card p-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
              Test Script
            </label>
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              rows={14}
              spellCheck={false}
              className="w-full rounded-lg border border-border bg-[#0d1117] px-4 py-3 font-mono text-sm text-green-400 placeholder:text-text-secondary/40 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent resize-none leading-relaxed"
            />
          </div>

          {/* Run button */}
          <button
            onClick={handleRunTest}
            disabled={running || !selectedDevice}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all',
              running || !selectedDevice
                ? 'bg-accent/50 cursor-not-allowed'
                : 'bg-accent hover:bg-accent/90 active:scale-[0.98]'
            )}
          >
            {running ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Running on Device...
              </>
            ) : (
              <>
                <Play size={16} />
                Run on Device
              </>
            )}
          </button>

          {/* Results */}
          {latestResult && (
            <div className="rounded-xl border border-border bg-card">
              <div className="flex border-b border-border">
                <button
                  onClick={() => setActiveTab('results')}
                  className={cn(
                    'px-5 py-3 text-sm font-medium transition-colors border-b-2',
                    activeTab === 'results'
                      ? 'border-accent text-accent-light'
                      : 'border-transparent text-text-secondary hover:text-text-primary'
                  )}
                >
                  Results
                </button>
                <button
                  onClick={() => setActiveTab('matrix')}
                  className={cn(
                    'px-5 py-3 text-sm font-medium transition-colors border-b-2',
                    activeTab === 'matrix'
                      ? 'border-accent text-accent-light'
                      : 'border-transparent text-text-secondary hover:text-text-primary'
                  )}
                >
                  Device Matrix
                </button>
              </div>

              <div className="p-5">
                {activeTab === 'results' ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white',
                          statusColor(latestResult.status)
                        )}
                      >
                        {latestResult.status === 'PASS' && <CheckCircle2 size={14} />}
                        {latestResult.status === 'FAIL' && <XCircle size={14} />}
                        {latestResult.status === 'ERROR' && <AlertTriangle size={14} />}
                        {latestResult.status === 'RUNNING' && (
                          <Loader2 size={14} className="animate-spin" />
                        )}
                        {latestResult.status}
                      </span>
                      <span className="flex items-center gap-1.5 text-sm text-text-secondary">
                        <Clock size={14} />
                        {latestResult.duration}ms
                      </span>
                      <span className="text-sm text-text-secondary">
                        {latestResult.device} ({latestResult.platform})
                      </span>
                    </div>

                    {/* Screenshots */}
                    {latestResult.screenshots.length > 0 ? (
                      <div className="flex gap-3 overflow-x-auto pb-2">
                        {latestResult.screenshots.map((url, i) => (
                          <div
                            key={i}
                            className="flex-shrink-0 w-32 h-56 rounded-lg border border-border bg-body overflow-hidden"
                          >
                            <img src={url} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 rounded-lg border border-border bg-body p-4">
                        <Image size={20} className="text-text-secondary" />
                        <p className="text-sm text-text-secondary">No screenshots captured</p>
                      </div>
                    )}

                    {latestResult.errorLogs.length > 0 && (
                      <div className="rounded-lg border border-status-red/30 bg-status-red/5 p-4">
                        {latestResult.errorLogs.map((log, i) => (
                          <pre key={i} className="text-xs text-status-red font-mono whitespace-pre-wrap">
                            {log}
                          </pre>
                        ))}
                      </div>
                    )}

                    {latestResult.status === 'FAIL' && !latestResult.autoFiledBug && (
                      <button
                        onClick={() => handleAutoFileBug(latestResult)}
                        className="flex items-center gap-2 rounded-lg border border-status-red/30 bg-status-red/10 px-4 py-2.5 text-sm font-medium text-status-red hover:bg-status-red/20 transition-colors"
                      >
                        <Bug size={16} />
                        Auto-file Bug in Jira
                      </button>
                    )}
                  </div>
                ) : (
                  /* Device/OS Matrix */
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-3">
                      Device / OS Matrix
                    </p>
                    {matrixData.length === 0 ? (
                      <p className="text-sm text-text-secondary">No matrix data available</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {matrixData.map((cell, i) => (
                          <div
                            key={i}
                            className={cn(
                              'rounded-lg border p-3 text-center',
                              cell.status === 'PASS'
                                ? 'border-status-green/30 bg-status-green/5'
                                : cell.status === 'FAIL'
                                ? 'border-status-red/30 bg-status-red/5'
                                : 'border-border bg-body'
                            )}
                          >
                            <p className="text-xs font-medium text-text-primary truncate">
                              {cell.device}
                            </p>
                            <p className="text-[10px] text-text-secondary mt-0.5">
                              {cell.platform}
                            </p>
                            <span
                              className={cn(
                                'mt-2 inline-block rounded-full px-2 py-0.5 text-[9px] font-bold text-white',
                                statusColor(cell.status)
                              )}
                            >
                              {cell.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: History ─────────────────────────────────────────────── */}
        <div className="xl:col-span-1">
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <History size={16} className="text-text-secondary" />
              <h3 className="text-sm font-semibold text-text-primary">Run History</h3>
              <span className="ml-auto rounded-full bg-body px-2 py-0.5 text-[10px] font-semibold text-text-secondary">
                {history.length}
              </span>
            </div>
            <div className="max-h-[600px] overflow-y-auto divide-y divide-border">
              {history.length === 0 && (
                <div className="p-6 text-center text-sm text-text-secondary">
                  No mobile test runs yet
                </div>
              )}
              {history.map((item) => (
                <div key={item.id} className="px-4 py-3">
                  <button
                    onClick={() =>
                      setExpandedHistory(expandedHistory === item.id ? null : item.id)
                    }
                    className="flex w-full items-center gap-2 text-left"
                  >
                    {expandedHistory === item.id ? (
                      <ChevronDown size={14} className="text-text-secondary" />
                    ) : (
                      <ChevronRight size={14} className="text-text-secondary" />
                    )}
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white',
                        statusColor(item.status)
                      )}
                    >
                      {item.status}
                    </span>
                    <span className="text-sm text-text-primary truncate flex-1">
                      {item.device}
                    </span>
                    <span className="text-[10px] text-text-secondary">{item.duration}ms</span>
                  </button>
                  {expandedHistory === item.id && (
                    <div className="mt-2 ml-5 space-y-1 text-xs text-text-secondary">
                      <p>Device: {item.device}</p>
                      <p>Platform: {item.platform}</p>
                      <p>
                        Date: {item.createdAt.toLocaleDateString()}{' '}
                        {item.createdAt.toLocaleTimeString()}
                      </p>
                      {item.errorLogs.length > 0 && (
                        <div className="mt-1 rounded bg-status-red/10 p-2 text-status-red font-mono">
                          {item.errorLogs[0]}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
    <HowItWorks steps={howItWorksSteps} isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  )
}
