import { useState, useEffect } from 'react'
import {
  Sparkles, FileText, Code2, ScrollText, Braces, Play, Copy, Save,
  Download, Loader2, ChevronRight, CheckCircle2, Upload, Settings2, Cpu, Info, ArrowRight, List, Edit3, Zap
} from 'lucide-react'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'
import { usePageTitle } from '@/hooks/usePageTitle'
import HowItWorks from '@/components/shared/HowItWorks'
import api from '@/lib/api'

const howItWorksSteps = [
  {
    title: 'Choose Generator',
    description: 'Select from AI test case generation, script generation, release notes, or BDD feature writing from the tab bar.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Pick</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <List className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Generator</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Provide Input',
    description: 'Paste a Jira story, API spec, or feature description. Configure options like language, framework, and detail level.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <FileText className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Content</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Edit3 className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Configure</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Generate with AI',
    description: 'Click Generate to invoke the AI. Choose between Claude and OpenAI providers for different generation styles.',
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
            <Loader2 className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Processing</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Save Results',
    description: 'Review generated output, copy to clipboard, or save directly to your test management system.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Save className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Save</span>
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

// ─── Types ───────────────────────────────────────────────────────────────────

type MainTab = 'test-cases' | 'scripts' | 'release-notes' | 'bdd'
type ScriptFramework = 'playwright' | 'appium' | 'api'
type ScriptLang = 'javascript' | 'typescript' | 'python' | 'java'
type DetailLevel = 'brief' | 'standard' | 'comprehensive'
type ReleaseFormat = 'markdown' | 'html' | 'confluence'
type ReleaseTemplate = 'standard' | 'detailed' | 'changelog'
type SourceType = 'jira-story' | 'api-spec'
type AIProvider = 'claude' | 'openai'

interface GeneratedTestCase {
  id: string
  title: string
  steps: string[]
  expectedResults: string[]
  priority: string
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function AIHubPage() {
  usePageTitle('AI Hub')
  const { user } = useAuthStore()
  const [showHelp, setShowHelp] = useState(false)
  const [activeTab, setActiveTab] = useState<MainTab>('test-cases')
  const [aiProvider, setAIProvider] = useState<AIProvider>('claude')

  // Test Cases state
  const [sourceType, setSourceType] = useState<SourceType>('jira-story')
  const [sourceContent, setSourceContent] = useState('')
  const [detailLevel, setDetailLevel] = useState<DetailLevel>('standard')
  const [generatedCases, setGeneratedCases] = useState<GeneratedTestCase[]>([])
  const [generatingCases, setGeneratingCases] = useState(false)

  // Scripts state
  const [scriptFramework, setScriptFramework] = useState<ScriptFramework>('playwright')
  const [scriptLang, setScriptLang] = useState<ScriptLang>('typescript')
  const [scriptInput, setScriptInput] = useState('')
  const [generatedScript, setGeneratedScript] = useState('')
  const [generatingScript, setGeneratingScript] = useState(false)

  // Release Notes state
  const [ticketSource, setTicketSource] = useState('')
  const [releaseTemplate, setReleaseTemplate] = useState<ReleaseTemplate>('standard')
  const [releaseFormat, setReleaseFormat] = useState<ReleaseFormat>('markdown')
  const [generatedNotes, setGeneratedNotes] = useState('')
  const [generatingNotes, setGeneratingNotes] = useState(false)

  // BDD state
  const [bddInput, setBddInput] = useState('')
  const [generatedFeature, setGeneratedFeature] = useState('')
  const [generatingFeature, setGeneratingFeature] = useState(false)

  // Firestore listener for AI history
  useEffect(() => {
    if (!user) return
    const ref = collection(db, 'aiGenerations')
    const q = query(ref, where('userId', '==', user.uid), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, () => {})
    return () => unsub()
  }, [user])

  const handleGenerateTestCases = async () => {
    if (!sourceContent.trim()) return
    setGeneratingCases(true)
    try {
      const res = await api.post('/api/v1/ai/generate/test-cases', {
        sourceType, content: sourceContent, detailLevel
      })
      setGeneratedCases(res.data.testCases || [])
    } catch {
      setGeneratedCases([])
    } finally {
      setGeneratingCases(false)
    }
  }

  const handleGenerateScript = async () => {
    if (!scriptInput.trim()) return
    setGeneratingScript(true)
    try {
      const res = await api.post('/api/v1/ai/generate/script', {
        framework: scriptFramework, language: scriptLang, input: scriptInput
      })
      setGeneratedScript(res.data.script || '')
    } catch {
      setGeneratedScript('')
    } finally {
      setGeneratingScript(false)
    }
  }

  const handleGenerateNotes = async () => {
    if (!ticketSource.trim()) return
    setGeneratingNotes(true)
    try {
      const res = await api.post('/api/v1/ai/generate/release-notes', {
        tickets: ticketSource, template: releaseTemplate, format: releaseFormat
      })
      setGeneratedNotes(res.data.notes || '')
    } catch {
      setGeneratedNotes('')
    } finally {
      setGeneratingNotes(false)
    }
  }

  const handleGenerateBDD = async () => {
    if (!bddInput.trim()) return
    setGeneratingFeature(true)
    try {
      const res = await api.post('/api/v1/ai/generate/bdd', { requirement: bddInput })
      setGeneratedFeature(res.data.feature || '')
    } catch {
      setGeneratedFeature('')
    } finally {
      setGeneratingFeature(false)
    }
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const handleDownloadFeature = () => {
    const blob = new Blob([generatedFeature], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'feature.feature'
    a.click()
    URL.revokeObjectURL(url)
  }

  const mainTabs: { key: MainTab; label: string; icon: React.ElementType }[] = [
    { key: 'test-cases', label: 'Test Cases', icon: FileText },
    { key: 'scripts', label: 'Scripts', icon: Code2 },
    { key: 'release-notes', label: 'Release Notes', icon: ScrollText },
    { key: 'bdd', label: 'BDD / Gherkin', icon: Braces },
  ]

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Sparkles className="text-accent" size={26} /> AI Hub
          </h1>
          <p className="text-sm text-text-secondary mt-1">AI-powered generation for test cases, scripts, release notes, and BDD features</p>
        </div>
        <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg bg-card border border-border px-3 py-2">
          <Cpu size={16} className="text-text-secondary" />
          <span className="text-xs text-text-secondary">Provider:</span>
          <select
            value={aiProvider}
            onChange={(e) => setAIProvider(e.target.value as AIProvider)}
            className="bg-transparent text-sm text-text-primary border-none outline-none cursor-pointer"
          >
            <option value="claude">Claude</option>
            <option value="openai">OpenAI</option>
          </select>
        </div>
        <button onClick={() => setShowHelp(true)} className="flex items-center gap-2 rounded-full border border-border-subtle px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition">
          <Info className="h-4 w-4" /> How it works
        </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-card rounded-lg p-1 border border-border">
        {mainTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors flex-1 justify-center',
              activeTab === tab.key
                ? 'bg-accent text-white'
                : 'text-text-secondary hover:text-text-primary hover:bg-body'
            )}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Test Cases Tab ─────────────────────────────────────────────── */}
      {activeTab === 'test-cases' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Input panel */}
            <div className="rounded-xl bg-card border border-border p-5 space-y-4">
              <h3 className="text-sm font-semibold text-text-primary">Source Input</h3>
              <div className="flex gap-2">
                {(['jira-story', 'api-spec'] as SourceType[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => setSourceType(st)}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                      sourceType === st ? 'bg-accent text-white' : 'bg-body text-text-secondary border border-border hover:text-text-primary'
                    )}
                  >
                    {st === 'jira-story' ? 'Jira Story' : 'API Spec'}
                  </button>
                ))}
              </div>
              <textarea
                value={sourceContent}
                onChange={(e) => setSourceContent(e.target.value)}
                placeholder={sourceType === 'jira-story' ? 'Paste Jira story content here...' : 'Paste API spec (OpenAPI/Swagger) here...'}
                className="w-full h-48 rounded-lg bg-body border border-border p-3 text-sm text-text-primary placeholder:text-text-secondary/50 resize-none outline-none focus:border-accent"
              />
              <div>
                <label className="text-xs text-text-secondary block mb-1.5">Detail Level</label>
                <div className="flex gap-2">
                  {(['brief', 'standard', 'comprehensive'] as DetailLevel[]).map((dl) => (
                    <button
                      key={dl}
                      onClick={() => setDetailLevel(dl)}
                      className={cn(
                        'px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize',
                        detailLevel === dl ? 'bg-accent text-white' : 'bg-body text-text-secondary border border-border hover:text-text-primary'
                      )}
                    >
                      {dl}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleGenerateTestCases}
                disabled={generatingCases || !sourceContent.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors"
              >
                {generatingCases ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                Generate Test Cases
              </button>
            </div>

            {/* Results panel */}
            <div className="rounded-xl bg-card border border-border p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary">Generated Test Cases</h3>
                {generatedCases.length > 0 && (
                  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#22C55E] text-white rounded-md text-xs font-medium hover:bg-[#22C55E]/90 transition-colors">
                    <Save size={14} /> Save to Test Cases
                  </button>
                )}
              </div>
              {generatedCases.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-text-secondary">
                  <Sparkles size={40} className="mb-3 opacity-30" />
                  <p className="text-sm">Generated test cases will appear here</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {generatedCases.map((tc) => (
                    <div key={tc.id} className="rounded-lg bg-body border border-border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-text-primary">{tc.title}</h4>
                        <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full',
                          tc.priority === 'High' ? 'bg-[#EF4444]/20 text-[#EF4444]' : 'bg-[#EAB308]/20 text-[#EAB308]'
                        )}>{tc.priority}</span>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-text-secondary mb-1">Steps:</p>
                        {tc.steps.map((s, i) => (
                          <p key={i} className="text-xs text-text-secondary flex items-start gap-1.5">
                            <ChevronRight size={12} className="mt-0.5 shrink-0" /> {s}
                          </p>
                        ))}
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-text-secondary mb-1">Expected:</p>
                        {tc.expectedResults.map((r, i) => (
                          <p key={i} className="text-xs text-[#22C55E] flex items-start gap-1.5">
                            <CheckCircle2 size={12} className="mt-0.5 shrink-0" /> {r}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Scripts Tab ────────────────────────────────────────────────── */}
      {activeTab === 'scripts' && (
        <div className="space-y-4">
          {/* Framework sub-tabs */}
          <div className="flex gap-2">
            {([
              { key: 'playwright', label: 'Playwright' },
              { key: 'appium', label: 'Appium' },
              { key: 'api', label: 'API' },
            ] as { key: ScriptFramework; label: string }[]).map((f) => (
              <button
                key={f.key}
                onClick={() => setScriptFramework(f.key)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  scriptFramework === f.key ? 'bg-accent text-white' : 'bg-card text-text-secondary border border-border hover:text-text-primary'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl bg-card border border-border p-5 space-y-4">
              <h3 className="text-sm font-semibold text-text-primary">Input</h3>
              <textarea
                value={scriptInput}
                onChange={(e) => setScriptInput(e.target.value)}
                placeholder="Enter test case description or URL to test..."
                className="w-full h-40 rounded-lg bg-body border border-border p-3 text-sm text-text-primary placeholder:text-text-secondary/50 resize-none outline-none focus:border-accent"
              />
              <div>
                <label className="text-xs text-text-secondary block mb-1.5">Language</label>
                <div className="flex gap-2">
                  {(['javascript', 'typescript', 'python', 'java'] as ScriptLang[]).map((l) => (
                    <button
                      key={l}
                      onClick={() => setScriptLang(l)}
                      className={cn(
                        'px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize',
                        scriptLang === l ? 'bg-accent text-white' : 'bg-body text-text-secondary border border-border hover:text-text-primary'
                      )}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleGenerateScript}
                disabled={generatingScript || !scriptInput.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors"
              >
                {generatingScript ? <Loader2 size={16} className="animate-spin" /> : <Code2 size={16} />}
                Generate Script
              </button>
            </div>

            <div className="rounded-xl bg-card border border-border p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary">Generated Script</h3>
                {generatedScript && (
                  <div className="flex gap-2">
                    <button onClick={() => handleCopy(generatedScript)} className="flex items-center gap-1 px-2 py-1 bg-body border border-border rounded text-xs text-text-secondary hover:text-text-primary transition-colors">
                      <Copy size={12} /> Copy
                    </button>
                    <button className="flex items-center gap-1 px-2 py-1 bg-[#22C55E] text-white rounded text-xs hover:bg-[#22C55E]/90 transition-colors">
                      <Save size={12} /> Save
                    </button>
                  </div>
                )}
              </div>
              <pre className="w-full h-[350px] rounded-lg bg-[#0D1117] border border-border p-4 text-xs text-[#E6EDF3] font-mono overflow-auto whitespace-pre-wrap">
                {generatedScript || '// Generated script will appear here...'}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ─── Release Notes Tab ──────────────────────────────────────────── */}
      {activeTab === 'release-notes' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl bg-card border border-border p-5 space-y-4">
              <h3 className="text-sm font-semibold text-text-primary">Ticket Source</h3>
              <textarea
                value={ticketSource}
                onChange={(e) => setTicketSource(e.target.value)}
                placeholder="Paste ticket list (PROJ-123, PROJ-456) or date range (2026-03-01 to 2026-04-01)..."
                className="w-full h-32 rounded-lg bg-body border border-border p-3 text-sm text-text-primary placeholder:text-text-secondary/50 resize-none outline-none focus:border-accent"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-secondary block mb-1.5">Template</label>
                  <select
                    value={releaseTemplate}
                    onChange={(e) => setReleaseTemplate(e.target.value as ReleaseTemplate)}
                    className="w-full rounded-lg bg-body border border-border px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
                  >
                    <option value="standard">Standard</option>
                    <option value="detailed">Detailed</option>
                    <option value="changelog">Changelog</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-text-secondary block mb-1.5">Format</label>
                  <select
                    value={releaseFormat}
                    onChange={(e) => setReleaseFormat(e.target.value as ReleaseFormat)}
                    className="w-full rounded-lg bg-body border border-border px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
                  >
                    <option value="markdown">Markdown</option>
                    <option value="html">HTML</option>
                    <option value="confluence">Confluence</option>
                  </select>
                </div>
              </div>
              <button
                onClick={handleGenerateNotes}
                disabled={generatingNotes || !ticketSource.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors"
              >
                {generatingNotes ? <Loader2 size={16} className="animate-spin" /> : <ScrollText size={16} />}
                Generate Release Notes
              </button>
            </div>

            <div className="rounded-xl bg-card border border-border p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary">Preview</h3>
                {generatedNotes && (
                  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3B82F6] text-white rounded-md text-xs font-medium hover:bg-[#3B82F6]/90 transition-colors">
                    <Upload size={14} /> Publish to Confluence
                  </button>
                )}
              </div>
              <pre className="w-full h-[350px] rounded-lg bg-body border border-border p-4 text-xs text-text-primary font-mono overflow-auto whitespace-pre-wrap">
                {generatedNotes || 'Release notes will appear here...'}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ─── BDD Tab ────────────────────────────────────────────────────── */}
      {activeTab === 'bdd' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl bg-card border border-border p-5 space-y-4">
              <h3 className="text-sm font-semibold text-text-primary">Requirement Input</h3>
              <textarea
                value={bddInput}
                onChange={(e) => setBddInput(e.target.value)}
                placeholder="Describe the requirement in natural language..."
                className="w-full h-56 rounded-lg bg-body border border-border p-3 text-sm text-text-primary placeholder:text-text-secondary/50 resize-none outline-none focus:border-accent"
              />
              <button
                onClick={handleGenerateBDD}
                disabled={generatingFeature || !bddInput.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors"
              >
                {generatingFeature ? <Loader2 size={16} className="animate-spin" /> : <Braces size={16} />}
                Generate Feature File
              </button>
            </div>

            <div className="rounded-xl bg-card border border-border p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary">Generated Feature File</h3>
                {generatedFeature && (
                  <button
                    onClick={handleDownloadFeature}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#A855F7] text-white rounded-md text-xs font-medium hover:bg-[#A855F7]/90 transition-colors"
                  >
                    <Download size={14} /> Download .feature
                  </button>
                )}
              </div>
              <pre className="w-full h-[350px] rounded-lg bg-[#0D1117] border border-border p-4 text-xs text-[#E6EDF3] font-mono overflow-auto whitespace-pre-wrap">
                {generatedFeature || '# Feature file will appear here...'}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
    <HowItWorks steps={howItWorksSteps} isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  )
}
