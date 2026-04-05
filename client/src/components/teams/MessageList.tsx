import { useState } from 'react'
import { Search, Calendar, Loader2, CheckSquare, Square, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import api from '@/lib/api'

export interface TeamsMessage {
  id: string
  from: {
    user?: {
      displayName: string
    }
  }
  body: {
    content: string
    contentType: string
  }
  createdDateTime: string
}

interface MessageListProps {
  teamId: string | null
  channelId: string | null
  channelName: string | null
  selectedMessages: TeamsMessage[]
  onSelectionChange: (messages: TeamsMessage[]) => void
}

export default function MessageList({
  teamId,
  channelId,
  channelName,
  selectedMessages,
  onSelectionChange,
}: MessageListProps) {
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [keyword, setKeyword] = useState('')
  const [messages, setMessages] = useState<TeamsMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedIds = new Set(selectedMessages.map((m) => m.id))

  const fetchMessages = async () => {
    if (!teamId || !channelId) return
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (fromDate) params.set('from', fromDate)
      if (toDate) params.set('to', toDate)
      if (keyword.trim()) params.set('keyword', keyword.trim())

      const { data } = await api.get(
        `/api/v1/teams/${teamId}/channels/${channelId}/messages?${params.toString()}`
      )
      setMessages(data.messages ?? data ?? [])
      setFetched(true)
    } catch (err) {
      setError('Failed to fetch messages')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const toggleMessage = (msg: TeamsMessage) => {
    if (selectedIds.has(msg.id)) {
      onSelectionChange(selectedMessages.filter((m) => m.id !== msg.id))
    } else {
      onSelectionChange([...selectedMessages, msg])
    }
  }

  const toggleAll = () => {
    if (selectedMessages.length === messages.length) {
      onSelectionChange([])
    } else {
      onSelectionChange([...messages])
    }
  }

  const getSenderName = (msg: TeamsMessage) =>
    msg.from?.user?.displayName ?? 'Unknown User'

  const getSenderInitial = (msg: TeamsMessage) => {
    const name = getSenderName(msg)
    return name.charAt(0).toUpperCase()
  }

  const formatTimestamp = (ts: string) => {
    const d = new Date(ts)
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const stripHtml = (html: string) => {
    const tmp = document.createElement('div')
    tmp.innerHTML = html
    return tmp.textContent ?? tmp.innerText ?? ''
  }

  if (!teamId || !channelId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
        <MessageSquare className="h-10 w-10 text-text-muted mb-3" />
        <p className="text-sm font-medium">Select a channel</p>
        <p className="text-xs text-text-muted mt-1">
          Browse teams on the left and pick a channel to view messages
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Channel header */}
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-text-primary">
          # {channelName}
        </h2>
      </div>

      {/* Filters */}
      <div className="border-b border-border px-4 py-3 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[140px]">
            <label className="block text-[11px] font-medium text-text-muted uppercase tracking-wide mb-1">
              From
            </label>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full rounded-lg border border-border bg-body py-2 pl-8 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-[11px] font-medium text-text-muted uppercase tracking-wide mb-1">
              To
            </label>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full rounded-lg border border-border bg-body py-2 pl-8 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-[11px] font-medium text-text-muted uppercase tracking-wide mb-1">
              Keyword
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Filter messages..."
                className="w-full rounded-lg border border-border bg-body py-2 pl-8 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>
          <button
            onClick={fetchMessages}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Fetch Messages
          </button>
        </div>
      </div>

      {/* Toolbar */}
      {messages.length > 0 && (
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <button
            onClick={toggleAll}
            className="flex items-center gap-2 text-xs text-text-secondary hover:text-text-primary transition-colors"
          >
            {selectedMessages.length === messages.length ? (
              <CheckSquare className="h-4 w-4 text-accent" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            {selectedMessages.length === messages.length ? 'Deselect all' : 'Select all'}
          </button>
          <span className="text-xs text-text-muted">
            {messages.length} message{messages.length !== 1 ? 's' : ''}
            {selectedMessages.length > 0 && (
              <> &middot; {selectedMessages.length} selected</>
            )}
          </span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="mx-4 mt-4 rounded-lg border border-status-red/30 bg-status-red/10 px-4 py-3 text-sm text-status-red">
            {error}
          </div>
        )}

        {!fetched && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-16 text-text-secondary">
            <Search className="h-8 w-8 text-text-muted mb-2" />
            <p className="text-sm">Set filters and click Fetch Messages</p>
          </div>
        )}

        {fetched && messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-16 text-text-secondary">
            <MessageSquare className="h-8 w-8 text-text-muted mb-2" />
            <p className="text-sm">No messages found</p>
            <p className="text-xs text-text-muted mt-1">Try adjusting the date range or keyword</p>
          </div>
        )}

        <div className="divide-y divide-border">
          {messages.map((msg) => {
            const isSelected = selectedIds.has(msg.id)
            return (
              <div
                key={msg.id}
                onClick={() => toggleMessage(msg)}
                className={cn(
                  'flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors',
                  isSelected ? 'bg-accent/5' : 'hover:bg-card'
                )}
              >
                <div className="pt-0.5">
                  {isSelected ? (
                    <CheckSquare className="h-4 w-4 text-accent" />
                  ) : (
                    <Square className="h-4 w-4 text-text-muted" />
                  )}
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-status-blue/20 text-status-blue text-sm font-bold">
                  {getSenderInitial(msg)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-text-primary">
                      {getSenderName(msg)}
                    </span>
                    <span className="text-[11px] text-text-muted">
                      {formatTimestamp(msg.createdDateTime)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-text-secondary line-clamp-2">
                    {msg.body.contentType === 'html'
                      ? stripHtml(msg.body.content)
                      : msg.body.content}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
