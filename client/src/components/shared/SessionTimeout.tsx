import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, LogOut, RefreshCw } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'

const INACTIVITY_TIMEOUT = 30 * 60 * 1000 // 30 minutes
const WARNING_COUNTDOWN = 60 // 60 seconds

export default function SessionTimeout() {
  const { signOut, user } = useAuthStore()
  const navigate = useNavigate()
  const [showWarning, setShowWarning] = useState(false)
  const [countdown, setCountdown] = useState(WARNING_COUNTDOWN)
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  const handleLogout = useCallback(async () => {
    setShowWarning(false)
    clearTimers()
    await signOut()
    navigate('/login')
  }, [signOut, navigate])

  const clearTimers = useCallback(() => {
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current)
      inactivityTimer.current = null
    }
    if (countdownInterval.current) {
      clearInterval(countdownInterval.current)
      countdownInterval.current = null
    }
  }, [])

  const resetInactivityTimer = useCallback(() => {
    if (showWarning) return // Don't reset while warning is showing

    clearTimers()
    inactivityTimer.current = setTimeout(() => {
      setShowWarning(true)
      setCountdown(WARNING_COUNTDOWN)
    }, INACTIVITY_TIMEOUT)
  }, [showWarning, clearTimers])

  const handleStayLoggedIn = useCallback(() => {
    setShowWarning(false)
    setCountdown(WARNING_COUNTDOWN)
    clearTimers()
    // Restart the inactivity timer
    inactivityTimer.current = setTimeout(() => {
      setShowWarning(true)
      setCountdown(WARNING_COUNTDOWN)
    }, INACTIVITY_TIMEOUT)
  }, [clearTimers])

  // Start countdown when warning is shown
  useEffect(() => {
    if (!showWarning) return

    countdownInterval.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          handleLogout()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current)
      }
    }
  }, [showWarning, handleLogout])

  // Track user activity
  useEffect(() => {
    if (!user) return

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click']
    const handleActivity = () => resetInactivityTimer()

    events.forEach((event) => window.addEventListener(event, handleActivity))
    resetInactivityTimer()

    return () => {
      events.forEach((event) => window.removeEventListener(event, handleActivity))
      clearTimers()
    }
  }, [user, resetInactivityTimer, clearTimers])

  if (!showWarning) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-status-amber/10 flex items-center justify-center">
            <Clock className="w-6 h-6 text-status-amber" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Session Expiring</h2>
            <p className="text-sm text-text-secondary">Your session is about to expire</p>
          </div>
        </div>

        <p className="text-text-secondary mb-6">
          You have been inactive for 30 minutes. Your session will expire in{' '}
          <span className="font-mono font-bold text-accent text-lg">{countdown}</span>{' '}
          seconds.
        </p>

        <div className="flex gap-3">
          <button
            onClick={handleStayLoggedIn}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Stay Logged In
          </button>
          <button
            onClick={handleLogout}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-surface-alt hover:bg-border text-text-secondary rounded-lg font-medium transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </div>
      </div>
    </div>
  )
}
