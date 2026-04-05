import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react'
import { updateProfile } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'
import { usePageTitle } from '@/hooks/usePageTitle'

const heroSlides = [
  {
    headline: 'Build Reliable',
    accent: 'Automation',
    description:
      'Create robust test suites that integrate seamlessly with your Jira workflows and CI/CD pipelines.',
  },
  {
    headline: 'Empower Your',
    accent: 'QA Team',
    description:
      'Give your team the tools to ship confidently with real-time dashboards, traceability, and smart reporting.',
  },
  {
    headline: 'Deliver With',
    accent: 'Confidence',
    description:
      'Catch regressions early, track quality metrics, and maintain release readiness at all times.',
  },
]

export default function RegisterPage() {
  usePageTitle('Create Account')
  const navigate = useNavigate()
  const { signUp, loading, error, clearError, user } = useAuthStore()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [activeSlide, setActiveSlide] = useState(0)

  useEffect(() => {
    if (user) navigate('/', { replace: true })
  }, [user, navigate])

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % heroSlides.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      clearError()
      setLocalError(null)

      if (password !== confirmPassword) {
        setLocalError('Passwords do not match.')
        return
      }
      if (password.length < 6) {
        setLocalError('Password must be at least 6 characters.')
        return
      }

      try {
        await signUp(email, password, fullName)
        // Also set displayName on Firebase Auth and create Firestore profile directly
        if (auth.currentUser) {
          await updateProfile(auth.currentUser, { displayName: fullName })
          await setDoc(doc(db, 'users', auth.currentUser.uid), {
            email,
            fullName,
            role: 'USER',
            isActive: true,
            setupComplete: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }, { merge: true })
        }
        navigate('/')
      } catch {
        // error set in store
      }
    },
    [email, password, confirmPassword, fullName, signUp, clearError, navigate],
  )

  const displayError = localError || error

  return (
    <div className="flex min-h-screen">
      {/* ── Left Hero Panel ── */}
      <div className="relative hidden w-[70%] overflow-hidden lg:flex lg:flex-col lg:justify-between bg-gradient-to-br from-slate-900 via-[#1a0a0f] to-[#0f0a15]">
        <div className="pointer-events-none absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-accent/10 blur-[160px]" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-accent/5 blur-[120px]" />

        <div className="relative z-10 p-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
              <span className="text-lg font-bold text-white">QA</span>
            </div>
            <span className="text-lg font-semibold text-text-primary tracking-tight">
              QA Automation Platform
            </span>
          </div>
        </div>

        <div className="relative z-10 flex flex-1 flex-col items-start justify-center px-16 xl:px-24">
          {heroSlides.map((slide, idx) => (
            <div
              key={idx}
              className={cn(
                'absolute transition-all duration-700 ease-in-out',
                idx === activeSlide
                  ? 'translate-y-0 opacity-100'
                  : 'translate-y-6 opacity-0 pointer-events-none',
              )}
            >
              <h1 className="text-5xl font-extrabold leading-tight text-text-primary xl:text-6xl">
                {slide.headline}
                <br />
                <span className="text-accent-light">{slide.accent}</span>
              </h1>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-text-secondary">
                {slide.description}
              </p>
            </div>
          ))}
        </div>

        <div className="relative z-10 flex items-center gap-2.5 px-16 pb-12 xl:px-24">
          {heroSlides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveSlide(idx)}
              className={cn(
                'h-2.5 rounded-full transition-all duration-300',
                idx === activeSlide
                  ? 'w-8 bg-accent'
                  : 'w-2.5 bg-text-muted/40 hover:bg-text-muted/70',
              )}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      {/* ── Right Form Panel ── */}
      <div className="flex w-full flex-col items-center justify-center bg-white px-8 py-12 lg:w-[30%] lg:min-w-[420px]">
        <div className="mb-10 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
            <span className="text-sm font-bold text-white">QA</span>
          </div>
          <span className="text-base font-semibold text-slate-900 tracking-tight">
            QA Automation Platform
          </span>
        </div>

        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold text-slate-900">Create Account</h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Fill in your details to get started with the platform.
          </p>

          {displayError && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {displayError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {/* Full Name */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Full Name
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none transition"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Email Address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-11 text-sm text-slate-900 placeholder:text-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-11 text-sm text-slate-900 placeholder:text-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-accent py-2.5 text-sm font-semibold uppercase tracking-wider text-white shadow-lg shadow-accent/25 hover:bg-accent-hover disabled:opacity-60 transition"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Create Account
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Login link */}
          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-accent hover:text-accent-hover transition">
              Sign in
            </Link>
          </p>

          {/* Powered by */}
          <p className="mt-8 text-center text-[11px] text-slate-400">
            Powered by <span className="font-semibold text-slate-500">Maghil</span>
          </p>
        </div>
      </div>
    </div>
  )
}
