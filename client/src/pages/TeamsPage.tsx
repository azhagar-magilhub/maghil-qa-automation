import { useState } from 'react'
import { MessageSquare, Info, FolderOpen, Calendar, Search, Filter, CheckSquare, List, ArrowRight } from 'lucide-react'
import { usePageTitle } from '@/hooks/usePageTitle'
import HowItWorks from '@/components/shared/HowItWorks'
import ChannelBrowser from '@/components/teams/ChannelBrowser'

const howItWorksSteps = [
  {
    title: 'Browse Channels',
    description: 'Connect to Microsoft Teams and browse your team channels in the left panel. Select a channel to load its messages.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Teams</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <FolderOpen className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Channels</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Filter Messages',
    description: 'Use date range and keyword filters to narrow down messages. Only relevant discussions are shown for easy selection.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Calendar className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Date</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Search className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Keywords</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Filter className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Results</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Select Messages',
    description: 'Click on messages to select them. Selected messages appear highlighted and are queued for ticket creation in the right panel.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <CheckSquare className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Pick</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <List className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Messages</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Convert to Tickets',
    description: 'Review selected messages, set Jira fields like issue type and priority, then bulk-create tickets from the conversations.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Message</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <CheckSquare className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Ticket</span>
        </div>
      </div>
    ),
  },
]
import MessageList, { type TeamsMessage } from '@/components/teams/MessageList'
import MessageToTicket from '@/components/teams/MessageToTicket'

export default function TeamsPage() {
  usePageTitle('Teams Chat')
  const [teamId, setTeamId] = useState<string | null>(null)
  const [channelId, setChannelId] = useState<string | null>(null)
  const [channelName, setChannelName] = useState<string | null>(null)
  const [selectedMessages, setSelectedMessages] = useState<TeamsMessage[]>([])
  const [showHelp, setShowHelp] = useState(false)

  const handleSelectChannel = (tId: string, cId: string, cName: string) => {
    setTeamId(tId)
    setChannelId(cId)
    setChannelName(cName)
    setSelectedMessages([])
  }

  return (
    <>
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-status-blue/10 p-2">
            <MessageSquare className="h-5 w-5 text-status-blue" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Teams Chat</h1>
            <p className="text-text-secondary text-sm">
              Browse channels, select messages, and convert them into Jira tickets
            </p>
          </div>
        </div>
        <button onClick={() => setShowHelp(true)} className="flex items-center gap-2 rounded-full border border-border-subtle px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition">
          <Info className="h-4 w-4" /> How it works
        </button>
      </div>

      {/* 3-column layout */}
      <div className="flex gap-4 h-[calc(100vh-180px)]">
        {/* Left panel: Channel browser */}
        <div className="w-60 shrink-0 rounded-xl border border-border bg-card overflow-y-auto">
          <ChannelBrowser
            onSelectChannel={handleSelectChannel}
            selectedChannelId={channelId}
          />
        </div>

        {/* Center panel: Messages */}
        <div className="flex-1 rounded-xl border border-border bg-card overflow-hidden flex flex-col">
          <MessageList
            teamId={teamId}
            channelId={channelId}
            channelName={channelName}
            selectedMessages={selectedMessages}
            onSelectionChange={setSelectedMessages}
          />
        </div>

        {/* Right panel: Ticket creation */}
        <div className="w-64 shrink-0 rounded-xl border border-border bg-card overflow-hidden">
          <MessageToTicket
            selectedMessages={selectedMessages}
            teamId={teamId}
            channelId={channelId}
          />
        </div>
      </div>
    </div>
    <HowItWorks steps={howItWorksSteps} isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  )
}
