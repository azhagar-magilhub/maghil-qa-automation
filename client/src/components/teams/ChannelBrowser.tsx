import { useState, useEffect } from 'react'
import { ChevronRight, ChevronDown, Hash, Users, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import api from '@/lib/api'

interface Channel {
  id: string
  displayName: string
  description?: string
}

interface Team {
  id: string
  displayName: string
  description?: string
}

interface ChannelBrowserProps {
  onSelectChannel: (teamId: string, channelId: string, channelName: string) => void
  selectedChannelId: string | null
}

export default function ChannelBrowser({ onSelectChannel, selectedChannelId }: ChannelBrowserProps) {
  const [teams, setTeams] = useState<Team[]>([])
  const [channelsByTeam, setChannelsByTeam] = useState<Record<string, Channel[]>>({})
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set())
  const [loadingTeams, setLoadingTeams] = useState(true)
  const [loadingChannels, setLoadingChannels] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTeams()
  }, [])

  const fetchTeams = async () => {
    try {
      setLoadingTeams(true)
      setError(null)
      const { data } = await api.get('/api/v1/teams/joined')
      setTeams(data.teams ?? data ?? [])
    } catch (err) {
      setError('Failed to load teams')
      console.error(err)
    } finally {
      setLoadingTeams(false)
    }
  }

  const fetchChannels = async (teamId: string) => {
    if (channelsByTeam[teamId]) return
    try {
      setLoadingChannels((prev) => new Set(prev).add(teamId))
      const { data } = await api.get(`/api/v1/teams/${teamId}/channels`)
      setChannelsByTeam((prev) => ({ ...prev, [teamId]: data.channels ?? data ?? [] }))
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingChannels((prev) => {
        const next = new Set(prev)
        next.delete(teamId)
        return next
      })
    }
  }

  const toggleTeam = (teamId: string) => {
    setExpandedTeams((prev) => {
      const next = new Set(prev)
      if (next.has(teamId)) {
        next.delete(teamId)
      } else {
        next.add(teamId)
        fetchChannels(teamId)
      }
      return next
    })
  }

  if (loadingTeams) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
        <Loader2 className="h-5 w-5 animate-spin mb-2" />
        <span className="text-xs">Loading teams...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-3 py-6 text-center">
        <p className="text-sm text-status-red mb-3">{error}</p>
        <button
          onClick={fetchTeams}
          className="text-xs text-accent hover:text-accent-light transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  if (teams.length === 0) {
    return (
      <div className="px-3 py-6 text-center">
        <Users className="h-8 w-8 text-text-muted mx-auto mb-2" />
        <p className="text-sm text-text-secondary">No teams found</p>
        <p className="text-xs text-text-muted mt-1">Ensure Teams integration is configured</p>
      </div>
    )
  }

  return (
    <div className="py-2">
      <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-widest text-text-muted">
        Teams & Channels
      </p>
      <ul className="space-y-0.5">
        {teams.map((team) => {
          const isExpanded = expandedTeams.has(team.id)
          const channels = channelsByTeam[team.id] ?? []
          const isLoadingCh = loadingChannels.has(team.id)

          return (
            <li key={team.id}>
              <button
                onClick={() => toggleTeam(team.id)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-text-secondary hover:bg-card hover:text-text-primary transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                )}
                <Users className="h-4 w-4 shrink-0 text-status-blue" />
                <span className="truncate">{team.displayName}</span>
              </button>

              {isExpanded && (
                <ul className="ml-4 mt-0.5 space-y-0.5">
                  {isLoadingCh ? (
                    <li className="flex items-center gap-2 px-3 py-1.5 text-xs text-text-muted">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading channels...
                    </li>
                  ) : channels.length === 0 ? (
                    <li className="px-3 py-1.5 text-xs text-text-muted">No channels</li>
                  ) : (
                    channels.map((ch) => (
                      <li key={ch.id}>
                        <button
                          onClick={() => onSelectChannel(team.id, ch.id, ch.displayName)}
                          className={cn(
                            'flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors',
                            selectedChannelId === ch.id
                              ? 'bg-accent/10 text-accent-light font-medium'
                              : 'text-text-secondary hover:bg-card hover:text-text-primary'
                          )}
                        >
                          <Hash className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{ch.displayName}</span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
