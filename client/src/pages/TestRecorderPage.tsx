import { useState, useCallback } from 'react'
import {
  Play, Plus, Trash2, GripVertical, Code, Save, ArrowRight, Info,
  MousePointer2, Type, Navigation, Clock, CheckSquare, ChevronDown,
  Loader2, CircleDot, Video, FileCode, Wand2, ArrowDown, ArrowUp
} from 'lucide-react'
import { collection, addDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'
import HowItWorks from '@/components/shared/HowItWorks'
import api from '@/lib/api'

// ─── HowItWorks Steps ──────────────────────────────────────────────────────

const howItWorksSteps = [
  {
    title: 'Record Actions',
    description: 'Enter a target URL and start the recorder. User interactions are captured as discrete test steps.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Video className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Record</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <MousePointer2 className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Interact</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Build Steps',
    description: 'Add, remove, and reorder test steps. Each step has an action type, element selector, and optional value.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Plus className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Add</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <GripVertical className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Reorder</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Generate Script',
    description: 'Convert your steps into a runnable Playwright test script in JavaScript or TypeScript.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Wand2 className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Generate</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <FileCode className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Script</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Save & Run',
    description: 'Save the generated script as a test execution in the Web Runner and execute it immediately.',
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
            <Play className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Run</span>
        </div>
      </div>
    ),
  },
]

// ─── Types ──────────────────────────────────────────────────────────────────

type ActionType = 'Click' | 'Type' | 'Navigate' | 'Wait' | 'Assert'
type Language = 'javascript' | 'typescript'

interface TestStep {
  id: string
  action: ActionType
  selector: string
  value: string
}

const ACTION_OPTIONS: { value: ActionType; label: string; icon: typeof MousePointer2 }[] = [
  { value: 'Click', label: 'Click', icon: MousePointer2 },
  { value: 'Type', label: 'Type', icon: Type },
  { value: 'Navigate', label: 'Navigate', icon: Navigation },
  { value: 'Wait', label: 'Wait', icon: Clock },
  { value: 'Assert', label: 'Assert', icon: CheckSquare },
]

// ─── Script Generator ───────────────────────────────────────────────────────

function generateScript(steps: TestStep[], targetUrl: string, lang: Language): string {
  const isTs = lang === 'typescript'
  const lines: string[] = []

  lines.push(`import { test, expect } from '@playwright/test';`)
  lines.push('')
  lines.push(`test('recorded test', async ({ page }) => {`)
  lines.push(`  await page.goto('${targetUrl}');`)
  lines.push('')

  for (const step of steps) {
    switch (step.action) {
      case 'Click':
        lines.push(`  await page.locator('${step.selector}').click();`)
        break
      case 'Type':
        lines.push(`  await page.locator('${step.selector}').fill('${step.value}');`)
        break
      case 'Navigate':
        lines.push(`  await page.goto('${step.value || step.selector}');`)
        break
      case 'Wait':
        lines.push(`  await page.waitForTimeout(${step.value || '1000'});`)
        break
      case 'Assert':
        if (step.value) {
          lines.push(`  await expect(page.locator('${step.selector}')).toContainText('${step.value}');`)
        } else {
          lines.push(`  await expect(page.locator('${step.selector}')).toBeVisible();`)
        }
        break
    }
  }

  lines.push('});')
  return lines.join('\n')
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function TestRecorderPage() {
  const { user } = useAuthStore()
  const [showHelp, setShowHelp] = useState(false)

  // Recorder state
  const [targetUrl, setTargetUrl] = useState('https://')
  const [isRecording, setIsRecording] = useState(false)
  const [language, setLanguage] = useState<Language>('typescript')

  // Steps
  const [steps, setSteps] = useState<TestStep[]>([])

  // Script
  const [generatedScript, setGeneratedScript] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Drag state
  const [dragIdx, setDragIdx] = useState<number | null>(null)

  const addStep = useCallback(() => {
    setSteps(prev => [
      ...prev,
      { id: crypto.randomUUID(), action: 'Click', selector: '', value: '' },
    ])
  }, [])

  const removeStep = useCallback((id: string) => {
    setSteps(prev => prev.filter(s => s.id !== id))
  }, [])

  const updateStep = useCallback((id: string, field: keyof TestStep, val: string) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, [field]: val } : s))
  }, [])

  const moveStep = useCallback((idx: number, direction: 'up' | 'down') => {
    setSteps(prev => {
      const arr = [...prev]
      const target = direction === 'up' ? idx - 1 : idx + 1
      if (target < 0 || target >= arr.length) return prev
      ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
      return arr
    })
  }, [])

  const handleGenerate = useCallback(() => {
    if (steps.length === 0) return
    setGeneratedScript(generateScript(steps, targetUrl, language))
  }, [steps, targetUrl, language])

  const handleSave = useCallback(async () => {
    if (!generatedScript || !user) return
    setSaving(true)
    try {
      await addDoc(collection(db, 'testExecutions'), {
        userId: user.uid,
        name: `Recorded Test — ${new Date().toLocaleString()}`,
        type: 'web',
        script: generatedScript,
        targetUrl,
        status: 'PENDING',
        steps: steps.map(s => ({ action: s.action, selector: s.selector, value: s.value })),
        createdAt: Timestamp.now(),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Failed to save recording:', err)
    } finally {
      setSaving(false)
    }
  }, [generatedScript, user, targetUrl, steps])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">No-Code Test Recorder</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Build test scripts visually — no coding required
          </p>
        </div>
        <button
          onClick={() => setShowHelp(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-body transition-colors"
        >
          <Info size={16} />
          How it works
        </button>
      </div>

      {/* URL + Record */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1.5 block text-sm font-medium text-text-primary">Target URL</label>
            <input
              type="url"
              value={targetUrl}
              onChange={e => setTargetUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full rounded-lg border border-border bg-body px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
            />
          </div>
          <button
            onClick={() => setIsRecording(!isRecording)}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors',
              isRecording
                ? 'bg-status-red text-white hover:bg-status-red/90'
                : 'bg-accent text-white hover:bg-accent/90'
            )}
          >
            {isRecording ? (
              <>
                <CircleDot size={16} className="animate-pulse" />
                Stop Recording
              </>
            ) : (
              <>
                <Video size={16} />
                Start Recording
              </>
            )}
          </button>
        </div>

        {isRecording && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-status-red/10 border border-status-red/20 px-4 py-3">
            <CircleDot size={14} className="text-status-red animate-pulse" />
            <span className="text-sm font-medium text-status-red">Recording in progress</span>
            <span className="text-xs text-text-secondary ml-2">Add steps below to build your test</span>
          </div>
        )}
      </div>

      {/* Language selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-text-secondary">Language:</span>
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(['javascript', 'typescript'] as Language[]).map(lang => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={cn(
                'px-4 py-1.5 text-sm font-medium capitalize transition-colors',
                language === lang
                  ? 'bg-accent text-white'
                  : 'bg-card text-text-secondary hover:bg-body'
              )}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

      {/* Steps Builder */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Test Steps</h2>
          <button
            onClick={addStep}
            className="inline-flex items-center gap-2 rounded-lg bg-accent text-white px-4 py-2 text-sm font-semibold hover:bg-accent/90 transition-colors"
          >
            <Plus size={16} />
            Add Step
          </button>
        </div>

        {steps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MousePointer2 className="w-10 h-10 text-text-muted mb-3" />
            <p className="text-sm text-text-secondary">No steps yet. Click "Add Step" to begin building your test.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {steps.map((step, idx) => (
              <div
                key={step.id}
                className={cn(
                  'flex items-start gap-3 rounded-lg border border-border bg-body p-4 transition-colors',
                  dragIdx === idx && 'border-accent/50 bg-accent/5'
                )}
              >
                {/* Drag handle + step number */}
                <div className="flex flex-col items-center gap-1 pt-1">
                  <GripVertical size={16} className="text-text-muted cursor-grab" />
                  <span className="text-xs font-bold text-text-muted">{idx + 1}</span>
                  <div className="flex flex-col gap-0.5 mt-1">
                    <button
                      onClick={() => moveStep(idx, 'up')}
                      disabled={idx === 0}
                      className="p-0.5 rounded text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors"
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      onClick={() => moveStep(idx, 'down')}
                      disabled={idx === steps.length - 1}
                      className="p-0.5 rounded text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors"
                    >
                      <ArrowDown size={12} />
                    </button>
                  </div>
                </div>

                {/* Fields */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Action dropdown */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-text-secondary">Action</label>
                    <div className="relative">
                      <select
                        value={step.action}
                        onChange={e => updateStep(step.id, 'action', e.target.value)}
                        className="w-full appearance-none rounded-lg border border-border bg-card px-3 py-2 text-sm text-text-primary focus:border-accent focus:ring-1 focus:ring-accent outline-none pr-8 transition-colors"
                      >
                        {ACTION_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                    </div>
                  </div>

                  {/* Selector */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-text-secondary">Selector</label>
                    <input
                      type="text"
                      value={step.selector}
                      onChange={e => updateStep(step.id, 'selector', e.target.value)}
                      placeholder="#login-btn, .card, [data-id]"
                      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
                    />
                  </div>

                  {/* Value */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-text-secondary">Value</label>
                    <input
                      type="text"
                      value={step.value}
                      onChange={e => updateStep(step.id, 'value', e.target.value)}
                      placeholder={
                        step.action === 'Type' ? 'Text to type...' :
                        step.action === 'Wait' ? '1000 (ms)' :
                        step.action === 'Assert' ? 'Expected text...' :
                        step.action === 'Navigate' ? 'https://...' :
                        'Optional'
                      }
                      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Remove */}
                <button
                  onClick={() => removeStep(step.id)}
                  className="mt-5 p-1.5 rounded-lg text-text-muted hover:text-status-red hover:bg-status-red/10 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generate + Script Preview */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Generated Script</h2>
          <button
            onClick={handleGenerate}
            disabled={steps.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-accent text-white px-4 py-2 text-sm font-semibold hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Wand2 size={16} />
            Generate Script
          </button>
        </div>

        <textarea
          value={generatedScript}
          onChange={e => setGeneratedScript(e.target.value)}
          placeholder="// Click 'Generate Script' to convert your steps to code..."
          rows={14}
          className="w-full rounded-lg border border-border bg-body px-4 py-3 text-sm text-text-primary font-mono placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent outline-none resize-none transition-colors"
        />

        {generatedScript && (
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-status-green text-white px-5 py-2.5 text-sm font-semibold hover:bg-status-green/90 disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              Save to Web Runner
            </button>
            {saved && (
              <span className="text-sm text-status-green font-medium">Saved successfully!</span>
            )}
          </div>
        )}
      </div>

      {/* HowItWorks modal */}
      <HowItWorks steps={howItWorksSteps} isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  )
}
