import { useState, useEffect, useCallback } from 'react'
import {
  FolderOpen, Plus, Settings, Users, CheckCircle2, ArrowRight,
  Info, Loader2, Trash2, Calendar, Pencil
} from 'lucide-react'
import {
  collection, query, where, orderBy, onSnapshot, Timestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/auth.store'
import { useProjectStore } from '@/store/project.store'
import { cn } from '@/lib/utils'
import HowItWorks from '@/components/shared/HowItWorks'
import api from '@/lib/api'

// ─── HowItWorks Steps ──────────────────────────────────────────────────────

const howItWorksSteps = [
  {
    title: 'Create Projects',
    description: 'Organize your QA work into projects. Each project maps to a Jira project key for seamless integration.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Plus className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Create</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <FolderOpen className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Project</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Switch Context',
    description: 'Click any project to set it as active. All tests, reports, and data filter to the active project.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <FolderOpen className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Select</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Active</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Manage & Collaborate',
    description: 'Invite team members, configure Jira integration, and manage project settings from one place.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Users className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Team</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <Settings className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Configure</span>
        </div>
      </div>
    ),
  },
]

// ─── Types ──────────────────────────────────────────────────────────────────

interface Project {
  id: string
  name: string
  description: string
  jiraProjectKey: string
  memberCount: number
  createdAt: Date
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const { user } = useAuthStore()
  const { activeProject, setActiveProject } = useProjectStore()
  const [showHelp, setShowHelp] = useState(false)
  const [showCreate, setShowCreate] = useState(false)

  // Projects list
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  // Create form
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [jiraKey, setJiraKey] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'projects'),
      where('userId', '==', user.uid)
    )
    const unsub = onSnapshot(q, snap => {
      const items = snap.docs.map(d => {
        const data = d.data()
        return {
          id: d.id,
          name: data.name || 'Untitled',
          description: data.description || '',
          jiraProjectKey: data.jiraProjectKey || '',
          memberCount: data.memberCount || 1,
          createdAt: data.createdAt?.toDate() || new Date(),
        }
      })
      items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      setProjects(items)
      setLoading(false)
    }, () => {
      // Fallback: if query fails, load without filter
      setLoading(false)
    })
    return unsub
  }, [user])

  const handleCreate = useCallback(async () => {
    if (!name.trim() || !user) return
    setCreating(true)
    try {
      const res = await api.post('/projects', {
        name: name.trim(),
        description: description.trim(),
        jiraProjectKey: jiraKey.trim().toUpperCase(),
      })
      setShowCreate(false)
      setName('')
      setDescription('')
      setJiraKey('')
      // Auto-select newly created project
      if (res.data?.id) {
        setActiveProject({
          id: res.data.id,
          name: name.trim(),
          description: description.trim(),
          jiraProjectKey: jiraKey.trim().toUpperCase(),
        })
      }
    } catch (err) {
      console.error('Failed to create project:', err)
    } finally {
      setCreating(false)
    }
  }, [name, description, jiraKey, user, setActiveProject])

  const handleSelect = useCallback((project: Project) => {
    setActiveProject({
      id: project.id,
      name: project.name,
      description: project.description,
      jiraProjectKey: project.jiraProjectKey,
    })
  }, [setActiveProject])

  const handleDelete = useCallback(async (id: string) => {
    try {
      await api.delete(`/projects/${id}`)
      if (activeProject?.id === id) {
        setActiveProject(null)
      }
    } catch (err) {
      console.error('Failed to delete project:', err)
    }
  }, [activeProject, setActiveProject])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Projects</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Organize your QA work into separate projects
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowHelp(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-body transition-colors"
          >
            <Info size={16} />
            How it works
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-accent text-white px-4 py-2 text-sm font-semibold hover:bg-accent/90 transition-colors"
          >
            <Plus size={16} />
            New Project
          </button>
        </div>
      </div>

      {/* Active Project indicator */}
      {activeProject && (
        <div className="flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/5 px-5 py-3">
          <CheckCircle2 size={18} className="text-accent shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-text-primary">Active Project: {activeProject.name}</p>
            {activeProject.jiraProjectKey && (
              <p className="text-xs text-text-secondary">Jira: {activeProject.jiraProjectKey}</p>
            )}
          </div>
          <button
            onClick={() => setActiveProject(null)}
            className="text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {/* Projects Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-border bg-card flex flex-col items-center justify-center py-16 text-center">
          <FolderOpen className="w-10 h-10 text-text-muted mb-3" />
          <p className="text-sm text-text-secondary">No projects yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => {
            const isActive = activeProject?.id === project.id
            return (
              <div
                key={project.id}
                onClick={() => handleSelect(project)}
                className={cn(
                  'relative rounded-xl border bg-card p-5 cursor-pointer transition-all hover:shadow-lg hover:shadow-black/5',
                  isActive
                    ? 'border-accent shadow-md shadow-accent/10'
                    : 'border-border hover:border-accent/40'
                )}
              >
                {isActive && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle2 size={18} className="text-accent" />
                  </div>
                )}

                <div className="flex items-start gap-3 mb-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                    <FolderOpen size={20} className="text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-text-primary truncate">{project.name}</h3>
                    {project.jiraProjectKey && (
                      <span className="inline-block mt-1 rounded bg-body border border-border px-1.5 py-0.5 text-[10px] font-bold text-text-secondary tracking-wide">
                        {project.jiraProjectKey}
                      </span>
                    )}
                  </div>
                </div>

                {project.description && (
                  <p className="text-xs text-text-secondary line-clamp-2 mb-3">{project.description}</p>
                )}

                <div className="flex items-center gap-4 text-xs text-text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Users size={12} />
                    {project.memberCount} member{project.memberCount !== 1 ? 's' : ''}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar size={12} />
                    {project.createdAt.toLocaleDateString()}
                  </span>
                </div>

                {/* Delete button */}
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(project.id) }}
                  className="absolute bottom-3 right-3 p-1.5 rounded-lg text-text-muted hover:text-status-red hover:bg-status-red/10 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowCreate(false)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-sidebar shadow-2xl shadow-black/40 overflow-hidden">
            <div className="px-6 py-5 border-b border-border">
              <h3 className="text-lg font-semibold text-text-primary">New Project</h3>
              <p className="text-sm text-text-secondary mt-1">Create a new QA project</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">Project Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="My QA Project"
                  className="w-full rounded-lg border border-border bg-body px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Describe your project..."
                  className="w-full rounded-lg border border-border bg-body px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent outline-none resize-none transition-colors"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">Jira Project Key</label>
                <input
                  type="text"
                  value={jiraKey}
                  onChange={e => setJiraKey(e.target.value)}
                  placeholder="e.g., QA, PROJ"
                  className="w-full rounded-lg border border-border bg-body px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors uppercase"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!name.trim() || creating}
                className="inline-flex items-center gap-2 rounded-lg bg-accent text-white px-5 py-2 text-sm font-semibold hover:bg-accent/90 disabled:opacity-50 transition-colors"
              >
                {creating && <Loader2 size={14} className="animate-spin" />}
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HowItWorks modal */}
      <HowItWorks steps={howItWorksSteps} isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  )
}
