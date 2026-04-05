import { useState, useEffect } from 'react'
import {
  Info, ArrowRight, Save, CheckCircle2, User, Clock, CalendarDays,
  LayoutGrid, Moon, LayoutDashboard, Settings, Pencil, Monitor
} from 'lucide-react'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { updateProfile } from 'firebase/auth'
import { db, auth } from '@/lib/firebase'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'
import HowItWorks, { type HowItWorksStep } from '@/components/shared/HowItWorks'

interface Preferences {
  displayName: string
  timezone: string
  dateFormat: string
  tableDensity: 'compact' | 'comfortable' | 'spacious'
  theme: 'light' | 'dark' | 'system'
  defaultPage: string
}

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Australia/Sydney',
  'Pacific/Auckland',
  'UTC',
]

const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
]

const TABLE_DENSITIES = [
  { value: 'compact' as const, label: 'Compact' },
  { value: 'comfortable' as const, label: 'Comfortable' },
  { value: 'spacious' as const, label: 'Spacious' },
]

const THEMES = [
  { value: 'light' as const, label: 'Light', icon: Monitor },
  { value: 'dark' as const, label: 'Dark', icon: Moon },
  { value: 'system' as const, label: 'System', icon: Settings },
]

const DEFAULT_PAGES = [
  { value: '/dashboard', label: 'Dashboard' },
  { value: '/excel', label: 'Excel to Jira' },
  { value: '/teams', label: 'Teams Chat' },
  { value: '/test-cases', label: 'Test Cases' },
  { value: '/api-runner', label: 'API Runner' },
  { value: '/qa-dashboard', label: 'QA Dashboard' },
  { value: '/ai-hub', label: 'AI Hub' },
  { value: '/projects', label: 'Projects' },
]

const howItWorksSteps: HowItWorksStep[] = [
  {
    title: 'Set Display',
    description:
      'Update your display name and choose a timezone. These settings affect how your name appears across the platform and how timestamps are displayed.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <User className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Profile</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Pencil className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Edit</span>
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
    title: 'Choose Format',
    description:
      'Select your preferred date format and table density. These settings customize how data is presented throughout the platform.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <CalendarDays className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Date</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <LayoutGrid className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Density</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-status-green/10 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-status-green" />
          </div>
          <span className="text-xs text-text-secondary">Applied</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Save Preferences',
    description:
      'Click Save to persist your preferences. Changes are stored in Firestore and applied immediately across all your sessions.',
    preview: (
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Settings className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-text-secondary">Configure</span>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
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
          <span className="text-xs text-text-secondary">Saved</span>
        </div>
      </div>
    ),
  },
]

export default function PreferencesPage() {
  const { user, profile } = useAuthStore()
  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [prefs, setPrefs] = useState<Preferences>({
    displayName: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    dateFormat: 'MM/DD/YYYY',
    tableDensity: 'comfortable',
    theme: 'dark',
    defaultPage: '/dashboard',
  })

  // Load preferences from Firestore
  useEffect(() => {
    if (!user) return
    const load = async () => {
      try {
        const prefDoc = await getDoc(doc(db, `users/${user.uid}/settings/preferences`))
        if (prefDoc.exists()) {
          const data = prefDoc.data()
          setPrefs((prev) => ({
            ...prev,
            ...data,
            displayName: data.displayName || profile?.fullName || user.displayName || '',
          }))
        } else {
          setPrefs((prev) => ({
            ...prev,
            displayName: profile?.fullName || user.displayName || user.email?.split('@')[0] || '',
          }))
        }
      } catch {
        setPrefs((prev) => ({
          ...prev,
          displayName: profile?.fullName || user.displayName || '',
        }))
      }
    }
    load()
  }, [user, profile])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    setSaved(false)
    try {
      // Update Firestore preferences
      await setDoc(doc(db, `users/${user.uid}/settings/preferences`), {
        ...prefs,
        updatedAt: serverTimestamp(),
      })

      // Update Firebase Auth display name if changed
      if (auth.currentUser && prefs.displayName !== auth.currentUser.displayName) {
        await updateProfile(auth.currentUser, { displayName: prefs.displayName })
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Failed to save preferences:', err)
    } finally {
      setSaving(false)
    }
  }

  const update = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPrefs((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Preferences</h1>
          <p className="text-text-secondary">Customize your platform experience</p>
        </div>
        <button
          onClick={() => setShowHowItWorks(true)}
          className="flex items-center gap-2 rounded-full border border-border-subtle px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition"
        >
          <Info className="h-4 w-4" /> How it works
        </button>
      </div>

      {/* Settings Card */}
      <div className="rounded-xl bg-card border border-border divide-y divide-border">
        {/* Display Name */}
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <User size={16} className="text-text-secondary" />
            <h3 className="text-sm font-semibold text-text-primary">Display Name</h3>
          </div>
          <input
            type="text"
            value={prefs.displayName}
            onChange={(e) => update('displayName', e.target.value)}
            className="w-full max-w-md rounded-lg border border-border bg-body px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
            placeholder="Your name"
          />
        </div>

        {/* Timezone */}
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-text-secondary" />
            <h3 className="text-sm font-semibold text-text-primary">Timezone</h3>
          </div>
          <select
            value={prefs.timezone}
            onChange={(e) => update('timezone', e.target.value)}
            className="w-full max-w-md rounded-lg border border-border bg-body px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>

        {/* Date Format */}
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays size={16} className="text-text-secondary" />
            <h3 className="text-sm font-semibold text-text-primary">Date Format</h3>
          </div>
          <div className="flex items-center gap-2">
            {DATE_FORMATS.map((fmt) => (
              <button
                key={fmt.value}
                onClick={() => update('dateFormat', fmt.value)}
                className={cn(
                  'rounded-lg px-4 py-2 text-sm font-medium border transition',
                  prefs.dateFormat === fmt.value
                    ? 'bg-accent/10 border-accent text-accent-light'
                    : 'border-border text-text-secondary hover:border-border-subtle'
                )}
              >
                {fmt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table Density */}
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <LayoutGrid size={16} className="text-text-secondary" />
            <h3 className="text-sm font-semibold text-text-primary">Table Density</h3>
          </div>
          <div className="flex items-center gap-2">
            {TABLE_DENSITIES.map((density) => (
              <button
                key={density.value}
                onClick={() => update('tableDensity', density.value)}
                className={cn(
                  'rounded-lg px-4 py-2 text-sm font-medium border transition',
                  prefs.tableDensity === density.value
                    ? 'bg-accent/10 border-accent text-accent-light'
                    : 'border-border text-text-secondary hover:border-border-subtle'
                )}
              >
                {density.label}
              </button>
            ))}
          </div>
        </div>

        {/* Theme */}
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Moon size={16} className="text-text-secondary" />
            <h3 className="text-sm font-semibold text-text-primary">Default Theme</h3>
          </div>
          <div className="flex items-center gap-2">
            {THEMES.map((theme) => {
              const ThemeIcon = theme.icon
              return (
                <button
                  key={theme.value}
                  onClick={() => update('theme', theme.value)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium border transition',
                    prefs.theme === theme.value
                      ? 'bg-accent/10 border-accent text-accent-light'
                      : 'border-border text-text-secondary hover:border-border-subtle'
                  )}
                >
                  <ThemeIcon size={14} />
                  {theme.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Default Page */}
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <LayoutDashboard size={16} className="text-text-secondary" />
            <h3 className="text-sm font-semibold text-text-primary">Default Page</h3>
          </div>
          <select
            value={prefs.defaultPage}
            onChange={(e) => update('defaultPage', e.target.value)}
            className="w-full max-w-md rounded-lg border border-border bg-body px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            {DEFAULT_PAGES.map((page) => (
              <option key={page.value} value={page.value}>
                {page.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            'flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium text-white transition',
            saving ? 'bg-accent/60 cursor-not-allowed' : 'bg-accent hover:bg-accent-hover'
          )}
        >
          {saving ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Saving...
            </>
          ) : (
            <>
              <Save size={16} />
              Save Preferences
            </>
          )}
        </button>
        {saved && (
          <span className="flex items-center gap-1 text-sm text-status-green">
            <CheckCircle2 size={16} /> Saved successfully
          </span>
        )}
      </div>

      <HowItWorks steps={howItWorksSteps} isOpen={showHowItWorks} onClose={() => setShowHowItWorks(false)} />
    </div>
  )
}
