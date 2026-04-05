import { useState } from 'react'
import { MessageCircle, X, Send, CheckCircle2, Bug, Lightbulb, MessageSquare } from 'lucide-react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'

type FeedbackType = 'bug' | 'feature' | 'general'

const FEEDBACK_TYPES: { key: FeedbackType; label: string; icon: React.ElementType }[] = [
  { key: 'bug', label: 'Bug Report', icon: Bug },
  { key: 'feature', label: 'Feature Request', icon: Lightbulb },
  { key: 'general', label: 'General Feedback', icon: MessageSquare },
]

export default function FeedbackWidget() {
  const { user } = useAuthStore()
  const [isOpen, setIsOpen] = useState(false)
  const [type, setType] = useState<FeedbackType>('general')
  const [message, setMessage] = useState('')
  const [screenshotNote, setScreenshotNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async () => {
    if (!message.trim() || !user) return
    setSubmitting(true)
    try {
      await addDoc(collection(db, 'feedback'), {
        type,
        message: message.trim(),
        screenshotNote: screenshotNote.trim() || null,
        userId: user.uid,
        userEmail: user.email,
        page: window.location.pathname,
        userAgent: navigator.userAgent,
        createdAt: serverTimestamp(),
      })
      setSubmitted(true)
      setTimeout(() => {
        setSubmitted(false)
        setIsOpen(false)
        setMessage('')
        setScreenshotNote('')
        setType('general')
      }, 2000)
    } catch (err) {
      console.error('Failed to submit feedback:', err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/30 hover:bg-accent-hover transition-all hover:scale-105"
          title="Send feedback"
        >
          <MessageCircle size={20} />
        </button>
      )}

      {/* Popup */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-80 rounded-2xl border border-border bg-sidebar shadow-2xl shadow-black/30 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-text-primary">Send Feedback</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-md p-1 text-text-secondary hover:text-text-primary hover:bg-card transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {submitted ? (
            <div className="px-5 py-10 text-center">
              <CheckCircle2 className="h-10 w-10 text-status-green mx-auto mb-3" />
              <p className="text-sm font-medium text-text-primary">Thank you!</p>
              <p className="text-xs text-text-secondary mt-1">Your feedback has been submitted.</p>
            </div>
          ) : (
            <div className="px-5 py-4 space-y-4">
              {/* Type selector */}
              <div>
                <label className="text-xs font-medium text-text-secondary mb-2 block">Type</label>
                <div className="flex items-center gap-1.5">
                  {FEEDBACK_TYPES.map((ft) => {
                    const Icon = ft.icon
                    return (
                      <button
                        key={ft.key}
                        onClick={() => setType(ft.key)}
                        className={cn(
                          'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border transition',
                          type === ft.key
                            ? 'bg-accent/10 border-accent text-accent-light'
                            : 'border-border text-text-secondary hover:border-border-subtle'
                        )}
                      >
                        <Icon size={12} />
                        {ft.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="text-xs font-medium text-text-secondary mb-2 block">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-border bg-body px-3 py-2 text-sm text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:ring-2 focus:ring-accent/40"
                  placeholder="Describe your feedback..."
                />
              </div>

              {/* Screenshot note */}
              <div>
                <label className="text-xs font-medium text-text-secondary mb-2 block">
                  Screenshot / Reference (optional)
                </label>
                <input
                  type="text"
                  value={screenshotNote}
                  onChange={(e) => setScreenshotNote(e.target.value)}
                  className="w-full rounded-lg border border-border bg-body px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
                  placeholder="e.g., Page URL or description"
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={!message.trim() || submitting}
                className={cn(
                  'w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition',
                  !message.trim() || submitting
                    ? 'bg-accent/40 cursor-not-allowed'
                    : 'bg-accent hover:bg-accent-hover'
                )}
              >
                {submitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    Submit Feedback
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
