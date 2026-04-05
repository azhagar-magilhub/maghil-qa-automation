import { useState } from 'react'
import {
  Info, ArrowRight, Sparkles, TrendingUp, BookOpen,
  Search, History, CheckCircle2, Rocket
} from 'lucide-react'
import { cn } from '@/lib/utils'
import HowItWorks, { type HowItWorksStep } from '@/components/shared/HowItWorks'

type BadgeType = 'new' | 'improvement' | 'bugfix'

interface ChangelogEntry {
  version: string
  date: string
  title: string
  badges: BadgeType[]
  items: { type: BadgeType; text: string }[]
}

const BADGE_CONFIG: Record<BadgeType, { label: string; className: string }> = {
  new: { label: 'New Feature', className: 'bg-status-green/10 text-status-green' },
  improvement: { label: 'Improvement', className: 'bg-status-blue/10 text-status-blue' },
  bugfix: { label: 'Bug Fix', className: 'bg-status-yellow/10 text-status-yellow' },
}

const changelog: ChangelogEntry[] = [
  {
    version: 'v2.0.0',
    date: 'April 2026',
    title: 'Full Platform Release',
    badges: ['new'],
    items: [
      { type: 'new', text: 'All 16 phases complete with 41 pages' },
      { type: 'new', text: 'AI Hub with Claude and OpenAI integration' },
      { type: 'new', text: 'No-Code Test Recorder' },
      { type: 'new', text: 'Test Scheduling with cron' },
      { type: 'new', text: 'Team Management and Multi-Project support' },
      { type: 'new', text: 'Command Palette (Cmd+K)' },
    ],
  },
  {
    version: 'v1.5.0',
    date: 'April 2026',
    title: 'Reporting and Analytics Expansion',
    badges: ['new', 'improvement'],
    items: [
      { type: 'new', text: 'PDF Report Generator' },
      { type: 'new', text: 'Custom Dashboard Builder' },
      { type: 'new', text: 'Webhook Management Hub' },
      { type: 'new', text: 'API Usage Analytics' },
      { type: 'new', text: 'Data Masking' },
    ],
  },
  {
    version: 'v1.0.0',
    date: 'April 2026',
    title: 'Initial Release',
    badges: ['new'],
    items: [
      { type: 'new', text: 'Excel to Jira bulk ticket creation' },
      { type: 'new', text: 'Teams Chat to Jira conversion' },
      { type: 'new', text: 'Confluence report publishing' },
      { type: 'new', text: 'Setup Wizard for integrations' },
      { type: 'new', text: 'Audit logging' },
      { type: 'new', text: 'Light and Dark theme toggle' },
    ],
  },
]

const howItWorksSteps: HowItWorksStep[] = [
  {
    title: 'Browse Updates',
    description:
      'The changelog lists every platform release in reverse chronological order. Scroll through to see what has changed.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Search className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Browse</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <History className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Releases</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Updated</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Check Features',
    description:
      'Each entry is tagged with badges: New Feature (green), Improvement (blue), or Bug Fix (yellow). Quickly see what type of changes were made.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">New</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-blue/10 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-status-blue" />
          </div>
          <span className="text-xs text-text-secondary">Improved</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-yellow/10 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-status-yellow" />
          </div>
          <span className="text-xs text-text-secondary">Fixed</span>
        </div>
      </div>
    ),
  },
  {
    title: 'View History',
    description:
      'Use the changelog to stay informed about platform evolution. Check back regularly for the latest updates and improvements.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <History className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">History</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Learn</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Rocket className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Adopt</span>
        </div>
      </div>
    ),
  },
]

export default function ChangelogPage() {
  const [showHowItWorks, setShowHowItWorks] = useState(false)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Changelog</h1>
          <p className="text-text-secondary">Platform updates and release history</p>
        </div>
        <button
          onClick={() => setShowHowItWorks(true)}
          className="flex items-center gap-2 rounded-full border border-border-subtle px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition"
        >
          <Info className="h-4 w-4" /> How it works
        </button>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />

        <div className="space-y-8">
          {changelog.map((entry) => (
            <div key={entry.version} className="relative pl-12">
              {/* Dot */}
              <div className="absolute left-[12px] top-2 h-4 w-4 rounded-full bg-accent border-4 border-body" />

              {/* Card */}
              <div className="rounded-xl bg-card border border-border p-6">
                {/* Version + Date */}
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <span className="text-lg font-bold text-text-primary">{entry.version}</span>
                  <span className="text-sm text-text-muted">{entry.date}</span>
                  {entry.badges.map((badge) => (
                    <span
                      key={badge}
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                        BADGE_CONFIG[badge].className
                      )}
                    >
                      {BADGE_CONFIG[badge].label}
                    </span>
                  ))}
                </div>

                {/* Title */}
                <h3 className="text-base font-semibold text-text-primary mb-3">{entry.title}</h3>

                {/* Items */}
                <ul className="space-y-2">
                  {entry.items.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span
                        className={cn(
                          'flex-shrink-0 mt-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider',
                          BADGE_CONFIG[item.type].className
                        )}
                      >
                        {item.type === 'new' ? 'NEW' : item.type === 'improvement' ? 'IMP' : 'FIX'}
                      </span>
                      <span className="text-sm text-text-secondary">{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      <HowItWorks steps={howItWorksSteps} isOpen={showHowItWorks} onClose={() => setShowHowItWorks(false)} />
    </div>
  )
}
