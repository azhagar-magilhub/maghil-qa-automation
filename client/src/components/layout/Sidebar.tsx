import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  FileSpreadsheet,
  MessageSquare,
  FileText,
  ScrollText,
  Settings,
  Shield,
  X,
  ClipboardList,
  Zap,
  Globe,
  Smartphone,
  BarChart3,
  Database,
  Server,
  Bell,
  GitBranch,
  Eye,
  FileSearch,
  Sparkles,
  FileCheck,
  Flame,
  Camera,
  Shuffle,
  ClipboardCheck,
  BarChart2,
  ShieldCheck,
  FolderOpen,
  Users,
  Video,
  Clock,
  Link2,
  Activity,
  EyeOff,
  FileDown,
  BookOpen,
  Search,
  ListChecks,
  UserCog,
  History,
  Image,
  Library,
  ArrowUpDown,
  Heart,
  TrendingUp,
  Microscope,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFavoritesStore } from '@/store/favorites.store'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

const workspaceNavItems = [
  { label: 'Search', path: '/search', icon: Search },
  { label: 'Projects', path: '/projects', icon: FolderOpen },
  { label: 'Team', path: '/team', icon: Users },
  { label: 'Docs', path: '/docs', icon: BookOpen },
  { label: 'Activity', path: '/activity', icon: Activity },
]

const mainNavItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Excel to Jira', path: '/excel', icon: FileSpreadsheet },
  { label: 'Teams Chat', path: '/teams', icon: MessageSquare },
  { label: 'Reports', path: '/reports', icon: FileText },
  { label: 'Audit Log', path: '/audit', icon: ScrollText },
]

const qaTestingNavItems = [
  { label: 'Test Cases', path: '/test-cases', icon: ClipboardList },
  { label: 'API Runner', path: '/api-runner', icon: Zap },
  { label: 'Web Runner', path: '/web-runner', icon: Globe },
  { label: 'Mobile Runner', path: '/mobile-runner', icon: Smartphone },
  { label: 'Security', path: '/security', icon: Shield },
  { label: 'QA Dashboard', path: '/qa-dashboard', icon: BarChart3 },
  { label: 'Recorder', path: '/recorder', icon: Video },
  { label: 'Scheduler', path: '/scheduler', icon: Clock },
  { label: 'Screenshots', path: '/screenshots', icon: Image },
  { label: 'Test Library', path: '/test-library', icon: Library },
  { label: 'Test Metrics', path: '/test-metrics', icon: BarChart3 },
  { label: 'Priority', path: '/test-priority', icon: TrendingUp },
  { label: 'Root Cause', path: '/root-cause', icon: Microscope },
]

const platformNavItems = [
  { label: 'Test Data', path: '/test-data', icon: Database },
  { label: 'Environments', path: '/environments', icon: Server },
  { label: 'Notifications', path: '/notifications', icon: Bell },
  { label: 'CI/CD', path: '/cicd', icon: GitBranch },
  { label: 'Accessibility', path: '/accessibility', icon: Eye },
  { label: 'Log Analyzer', path: '/log-analyzer', icon: FileSearch },
  { label: 'Webhooks', path: '/webhooks', icon: Link2 },
  { label: 'API Analytics', path: '/api-analytics', icon: Activity },
  { label: 'Data Masking', path: '/data-masking', icon: EyeOff },
  { label: 'Mock Server', path: '/mock-server', icon: Server },
  { label: 'Collaboration', path: '/collaboration', icon: Users },
]

const aiNavItems = [
  { label: 'AI Hub', path: '/ai-hub', icon: Sparkles },
  { label: 'Contracts', path: '/contracts', icon: FileCheck },
  { label: 'Chaos', path: '/chaos', icon: Flame },
]

const releaseNavItems = [
  { label: 'DB Testing', path: '/db-testing', icon: Database },
  { label: 'Snapshots', path: '/snapshots', icon: Camera },
  { label: 'Flake Analyzer', path: '/flake-analyzer', icon: Shuffle },
  { label: 'Compliance', path: '/compliance', icon: ClipboardCheck },
  { label: 'Coverage', path: '/coverage', icon: BarChart2 },
  { label: 'Release Gate', path: '/release-gate', icon: ShieldCheck },
  { label: 'PDF Reports', path: '/pdf-reports', icon: FileDown },
  { label: 'Custom Dashboard', path: '/custom-dashboard', icon: LayoutDashboard },
]

const adminNavItems = [
  { label: 'Export/Import', path: '/export-import', icon: ArrowUpDown },
  { label: 'Setup Wizard', path: '/setup', icon: Shield },
  { label: 'Settings', path: '/settings', icon: Settings },
  { label: 'Onboarding', path: '/onboarding', icon: ListChecks },
  { label: 'Preferences', path: '/preferences', icon: UserCog },
  { label: 'Changelog', path: '/changelog', icon: History },
]

// All nav items lookup for favorites icon resolution
const allNavItems = [
  ...workspaceNavItems, ...mainNavItems, ...qaTestingNavItems,
  ...platformNavItems, ...aiNavItems, ...releaseNavItems, ...adminNavItems,
]

function NavItem({ item, onClose }: { item: { label: string; path: string; icon: any }; onClose: () => void }) {
  const { addFavorite, removeFavorite, isFavorite } = useFavoritesStore()
  const fav = isFavorite(item.path)

  return (
    <li className="group/nav relative">
      <NavLink
        to={item.path}
        onClick={onClose}
        className={({ isActive }) =>
          cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
            isActive
              ? 'bg-accent-bg text-accent-light'
              : 'text-text-secondary hover:bg-card hover:text-text-primary'
          )
        }
      >
        <item.icon size={18} />
        <span className="flex-1 truncate">{item.label}</span>
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            fav ? removeFavorite(item.path) : addFavorite(item.path, item.label)
          }}
          className={cn(
            'rounded p-0.5 transition-all',
            fav
              ? 'text-yellow-400 opacity-100'
              : 'text-text-muted opacity-0 group-hover/nav:opacity-100 hover:text-yellow-400'
          )}
        >
          <Heart size={12} className={fav ? 'fill-yellow-400' : ''} />
        </button>
      </NavLink>
    </li>
  )
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { favorites, removeFavorite } = useFavoritesStore()

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 flex h-screen w-60 flex-col bg-sidebar border-r border-border',
          'transition-transform duration-200 ease-in-out',
          'lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo area */}
        <div className="flex h-16 items-center justify-between px-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
              <span className="text-sm font-bold text-white">M</span>
            </div>
            <span className="text-lg font-semibold text-text-primary tracking-tight">
              maghil
            </span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden rounded-md p-1 text-text-secondary hover:text-text-primary hover:bg-card transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {/* FAVORITES section */}
          {favorites.length > 0 && (
            <div className="mb-6">
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-text-muted">
                Favorites
              </p>
              <ul className="space-y-0.5">
                {favorites.map((fav) => {
                  const navItem = allNavItems.find((n) => n.path === fav.path)
                  const Icon = navItem?.icon || Heart
                  return (
                    <li key={fav.path} className="group/fav relative">
                      <NavLink
                        to={fav.path}
                        onClick={onClose}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                            isActive
                              ? 'bg-accent-bg text-accent-light'
                              : 'text-text-secondary hover:bg-card hover:text-text-primary'
                          )
                        }
                      >
                        <Icon size={18} />
                        <span className="flex-1 truncate">{fav.label}</span>
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeFavorite(fav.path) }}
                          className="rounded p-0.5 text-text-muted opacity-0 group-hover/fav:opacity-100 hover:text-status-red transition-all"
                        >
                          <X size={12} />
                        </button>
                      </NavLink>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {/* WORKSPACE section */}
          <div className="mb-6">
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-text-muted">
              Workspace
            </p>
            <ul className="space-y-0.5">
              {workspaceNavItems.map((item) => (
                <NavItem key={item.path} item={item} onClose={onClose} />
              ))}
            </ul>
          </div>

          {/* MAIN section */}
          <div className="mb-6">
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-text-muted">
              Main
            </p>
            <ul className="space-y-0.5">
              {mainNavItems.map((item) => (
                <NavItem key={item.path} item={item} onClose={onClose} />
              ))}
            </ul>
          </div>

          {/* QA TESTING section */}
          <div className="mb-6">
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-text-muted">
              QA Testing
            </p>
            <ul className="space-y-0.5">
              {qaTestingNavItems.map((item) => (
                <NavItem key={item.path} item={item} onClose={onClose} />
              ))}
            </ul>
          </div>

          {/* PLATFORM section */}
          <div className="mb-6">
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-text-muted">
              Platform
            </p>
            <ul className="space-y-0.5">
              {platformNavItems.map((item) => (
                <NavItem key={item.path} item={item} onClose={onClose} />
              ))}
            </ul>
          </div>

          {/* AI & INTELLIGENCE section */}
          <div className="mb-6">
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-text-muted">
              AI & Intelligence
            </p>
            <ul className="space-y-0.5">
              {aiNavItems.map((item) => (
                <NavItem key={item.path} item={item} onClose={onClose} />
              ))}
            </ul>
          </div>

          {/* RELEASE section */}
          <div className="mb-6">
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-text-muted">
              Release
            </p>
            <ul className="space-y-0.5">
              {releaseNavItems.map((item) => (
                <NavItem key={item.path} item={item} onClose={onClose} />
              ))}
            </ul>
          </div>

          {/* ADMIN section */}
          <div>
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-text-muted">
              Admin
            </p>
            <ul className="space-y-0.5">
              {adminNavItems.map((item) => (
                <NavItem key={item.path} item={item} onClose={onClose} />
              ))}
            </ul>
          </div>
        </nav>

        {/* Footer branding */}
        <div className="border-t border-border px-5 py-3">
          <p className="text-[11px] text-text-muted text-center tracking-wide">
            powered by <span className="font-semibold text-text-secondary">maghil</span>
          </p>
        </div>
      </aside>
    </>
  )
}
