import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'

export default function ForgotPasswordPage() {
  const { resetPassword, error, clearError } = useAuthStore()

  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      clearError()
      setSubmitting(true)
      try {
        await resetPassword(email)
        setSent(true)
      } catch {
        // error set in store
      } finally {
        setSubmitting(false)
      }
    },
    [email, resetPassword, clearError],
  )

  return (
    <div className="flex min-h-screen items-center justify-center bg-body px-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-8 shadow-2xl shadow-black/30">
          {/* Logo */}
          <div className="mb-8 flex items-center justify-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
              <span className="text-sm font-bold text-white">QA</span>
            </div>
            <span className="text-base font-semibold text-text-primary tracking-tight">
              QA Automation Platform
            </span>
          </div>

          {sent ? (
            /* Success state */
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-status-green/15">
                <CheckCircle2 className="h-7 w-7 text-status-green" />
              </div>
              <h2 className="text-xl font-bold text-text-primary">Check Your Email</h2>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                We sent a password reset link to{' '}
                <span className="font-medium text-text-primary">{email}</span>. Please check your
                inbox and follow the instructions.
              </p>
              <Link
                to="/login"
                className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-accent hover:text-accent-light transition"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Sign In
              </Link>
            </div>
          ) : (
            /* Form state */
            <>
              <h2 className="text-center text-xl font-bold text-text-primary">
                Forgot Password?
              </h2>
              <p className="mt-2 text-center text-sm text-text-secondary">
                Enter your email address and we&apos;ll send you a link to reset your password.
              </p>

              {error && (
                <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-accent-light">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      required
                      className="w-full rounded-lg border border-border bg-sidebar py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-accent py-2.5 text-sm font-semibold uppercase tracking-wider text-white shadow-lg shadow-accent/25 hover:bg-accent-hover disabled:opacity-60 transition"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Send Reset Link
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary transition"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Powered by */}
        <p className="mt-6 text-center text-[11px] text-text-muted">
          Powered by <span className="font-semibold text-text-secondary">Maghil</span>
        </p>
      </div>
    </div>
  )
}
