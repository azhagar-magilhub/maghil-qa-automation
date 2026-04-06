import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'
import { usePageTitle } from '@/hooks/usePageTitle'

const heroSlides = [
  {
    headline: 'Automate Your',
    accent: 'QA Testing',
    description:
      'Streamline Jira workflows with intelligent automation that saves hours of manual effort every sprint.',
  },
  {
    headline: 'Accelerate Your',
    accent: 'Release Cycles',
    description:
      'Reduce bottlenecks and ship faster with end-to-end test orchestration integrated into your pipeline.',
  },
  {
    headline: 'Scale Your',
    accent: 'Test Coverage',
    description:
      'Achieve comprehensive coverage across regression, smoke, and integration suites with zero overhead.',
  },
]

export default function LoginPage() {
  usePageTitle('Sign In')
  const navigate = useNavigate()
  const { signIn, loading, error, clearError, user } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [activeSlide, setActiveSlide] = useState(0)

  // Redirect if already authenticated
  useEffect(() => {
    if (user) navigate('/', { replace: true })
  }, [user, navigate])

  // Rotate hero slides
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
      try {
        await signIn(email, password)
        navigate('/')
      } catch {
        // error is set in store
      }
    },
    [email, password, signIn, clearError, navigate],
  )

  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      {/* ── Left Hero Panel ── */}
      <div className="relative hidden w-full overflow-hidden lg:flex lg:w-[70%] lg:flex-col lg:justify-between bg-gradient-to-br from-slate-900 via-[#1a0a0f] to-[#0f0a15]">
        {/* Decorative radial glow */}
        <div className="pointer-events-none absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-accent/10 blur-[160px]" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-accent/5 blur-[120px]" />

        {/* Logo */}
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

        {/* Hero Content */}
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

        {/* Dot Indicators */}
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
      <div className="flex w-full flex-col items-center justify-center bg-card px-4 py-8 sm:px-8 sm:py-12 lg:w-[30%] lg:min-w-[420px]">
        {/* Logo for mobile / top of form */}
        <div className="mb-10 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
            <span className="text-sm font-bold text-white">QA</span>
          </div>
          <span className="text-base font-semibold text-text-primary tracking-tight">
            QA Automation Platform
          </span>
        </div>

        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold text-text-primary">Sign In</h2>
          <p className="mt-1.5 text-sm text-text-secondary">
            Please enter your details to access your dashboard.
          </p>

          {error && (
            <div className="mt-4 rounded-lg border border-status-red/30 bg-status-red/10 px-4 py-3 text-sm text-status-red">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {/* Email / User ID */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                User ID
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="w-full rounded-lg border border-input-border bg-input-bg py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full rounded-lg border border-input-border bg-input-bg py-2.5 pl-10 pr-11 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="mt-1.5 flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-accent hover:text-accent-hover transition"
                >
                  Forgot password?
                </Link>
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
                  Sign In
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Spacer */}
          <div className="mt-4" />

          {/* Help Center */}
          <div className="mt-8 text-center">
            <a
              href="#"
              className="text-xs font-medium text-text-muted hover:text-text-secondary transition"
            >
              Help Center
            </a>
          </div>

          {/* Powered by */}
          <p className="mt-6 text-center text-[11px] text-text-muted">
            Powered by <span className="font-semibold text-text-secondary">Maghil</span>
          </p>
        </div>
      </div>
    </div>
  )
}
