import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Project {
  id: string
  name: string
  description: string
  jiraProjectKey: string
}

interface ProjectState {
  activeProject: Project | null
  setActiveProject: (project: Project | null) => void
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      activeProject: null,
      setActiveProject: (project) => set({ activeProject: project }),
    }),
    { name: 'qa-active-project' }
  )
)
