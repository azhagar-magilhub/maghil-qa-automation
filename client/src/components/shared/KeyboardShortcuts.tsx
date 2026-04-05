import { useEffect, useRef, useCallback, createContext, useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CommandPalette from './CommandPalette'
import ShortcutsHelp from './ShortcutsHelp'

// ---------- Context for palette open state ----------
interface CommandPaletteContextValue {
  openPalette: () => void
}

const CommandPaletteContext = createContext<CommandPaletteContextValue>({
  openPalette: () => {},
})

export function useCommandPaletteContext() {
  return useContext(CommandPaletteContext)
}

// ---------- Main component ----------
export default function KeyboardShortcuts({ children }: { children?: React.ReactNode }) {
  const navigate = useNavigate()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const pendingPrefix = useRef<string | null>(null)
  const prefixTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearPrefix = useCallback(() => {
    pendingPrefix.current = null
    if (prefixTimer.current) {
      clearTimeout(prefixTimer.current)
      prefixTimer.current = null
    }
  }, [])

  const openPalette = useCallback(() => setPaletteOpen(true), [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore when typing in inputs/textareas/contenteditable
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return
      }

      const isMac = navigator.platform.toUpperCase().includes('MAC')
      const mod = isMac ? e.metaKey : e.ctrlKey

      // Cmd/Ctrl+K — Command Palette
      if (mod && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen((prev) => !prev)
        clearPrefix()
        return
      }

      // Cmd/Ctrl+/ — Shortcuts help
      if (mod && e.key === '/') {
        e.preventDefault()
        setShortcutsOpen((prev) => !prev)
        clearPrefix()
        return
      }

      // Don't process chord shortcuts when modals are open
      if (paletteOpen || shortcutsOpen) return

      // Chord shortcuts: G then X, N then X
      const key = e.key.toUpperCase()

      if (pendingPrefix.current) {
        const prefix = pendingPrefix.current
        clearPrefix()

        const chordMap: Record<string, Record<string, string>> = {
          G: {
            D: '/dashboard',
            E: '/excel',
            T: '/teams',
            R: '/reports',
            S: '/settings',
          },
          N: {
            T: '/test-cases',
            A: '/api-runner',
          },
        }

        const path = chordMap[prefix]?.[key]
        if (path) {
          e.preventDefault()
          navigate(path)
        }
        return
      }

      // Start a chord if G or N is pressed
      if (key === 'G' || key === 'N') {
        e.preventDefault()
        pendingPrefix.current = key
        prefixTimer.current = setTimeout(() => {
          pendingPrefix.current = null
        }, 1000)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      clearPrefix()
    }
  }, [navigate, paletteOpen, shortcutsOpen, clearPrefix])

  return (
    <CommandPaletteContext.Provider value={{ openPalette }}>
      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <ShortcutsHelp isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      {children}
    </CommandPaletteContext.Provider>
  )
}
