import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings, Bell, Menu, LogOut, KeyRound, Sun, Moon, Search } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { useThemeStore } from '@/store/theme.store'
import { cn } from '@/lib/utils'
import { useCommandPaletteContext } from '@/components/shared/KeyboardShortcuts'

interface HeaderProps {
  onMenuToggle: () => void
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const { profile, user, signOut } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const { openPalette } = useCommandPaletteContext()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const displayName = profile?.fullName || user?.displayName || user?.email?.split('@')[0] || 'User'

  const initials = displayName !== 'User'
    ? displayName.charAt(0).toUpperCase()
    : profile?.email?.charAt(0).toUpperCase() ?? 'U'

  const handleSignOut = async () => {
    setDropdownOpen(false)
    await signOut()
    navigate('/login')
  }

  const roleBadgeColor: Record<string, string> = {
    ADMIN: 'bg-accent text-white',
    MANAGER: 'bg-status-blue text-white',
    USER: 'bg-status-green text-white',
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-sidebar px-4 lg:px-6">
      {/* Left: hamburger + page title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="rounded-md p-2 text-text-secondary hover:bg-card hover:text-text-primary transition-colors lg:hidden"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-base font-semibold text-text-primary">
          QA Automation Platform
        </h1>
      </div>

      {/* Right: icons + avatar */}
      <div className="flex items-center gap-2">
        <button
          onClick={openPalette}
          className="rounded-md p-2 text-text-secondary hover:bg-card hover:text-text-primary transition-colors"
          aria-label="Search (Cmd+K)"
        >
          <Search size={18} />
        </button>

        <button
          onClick={toggleTheme}
          className="rounded-md p-2 text-text-secondary hover:bg-card hover:text-text-primary transition-colors"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button
          onClick={() => navigate('/settings')}
          className="rounded-md p-2 text-text-secondary hover:bg-card hover:text-text-primary transition-colors"
          aria-label="Settings"
        >
          <Settings size={18} />
        </button>

        <button
          onClick={() => navigate('/notifications')}
          className="relative rounded-md p-2 text-text-secondary hover:bg-card hover:text-text-primary transition-colors"
          aria-label="Notifications"
        >
          <Bell size={18} />
          {/* Notification dot */}
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-accent" />
        </button>

        {/* User avatar + dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            {initials}
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-border bg-sidebar shadow-xl shadow-black/30 overflow-hidden">
              {/* User info */}
              <div className="px-4 py-3.5 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-text-primary">
                      {displayName}
                    </p>
                    <p className="truncate text-xs text-text-secondary">
                      {profile?.email}
                    </p>
                  </div>
                </div>
                {profile?.role && (
                  <span
                    className={cn(
                      'mt-2 inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                      roleBadgeColor[profile.role] ?? 'bg-card text-text-secondary'
                    )}
                  >
                    {profile.role}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="py-1.5">
                <button
                  onClick={() => {
                    setDropdownOpen(false)
                    navigate('/change-password')
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-text-secondary hover:bg-card hover:text-text-primary transition-colors"
                >
                  <KeyRound size={16} />
                  Change Password
                </button>
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-accent-light hover:bg-accent-bg transition-colors"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
