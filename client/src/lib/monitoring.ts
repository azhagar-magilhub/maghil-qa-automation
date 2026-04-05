// Error tracking and performance monitoring
// Placeholder for Sentry integration

export function initMonitoring() {
  // Capture unhandled errors
  window.addEventListener('error', (event) => {
    console.error('[Monitoring] Unhandled error:', event.error)
    // In production, send to Sentry:
    // Sentry.captureException(event.error)
  })

  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[Monitoring] Unhandled rejection:', event.reason)
    // Sentry.captureException(event.reason)
  })

  // Performance observer for long tasks
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 100) {
          console.warn('[Monitoring] Long task:', entry.duration.toFixed(0), 'ms')
        }
      }
    })
    try {
      observer.observe({ type: 'longtask', buffered: true })
    } catch {
      // longtask not supported
    }
  }
}

// Web Vitals tracking
export function reportWebVitals() {
  if ('web-vital' in window) return
  // Track LCP, FID, CLS
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      console.log(`[WebVital] ${entry.name}:`, entry.startTime.toFixed(0), 'ms')
    }
  })
  try {
    observer.observe({ type: 'largest-contentful-paint', buffered: true })
    observer.observe({ type: 'first-input', buffered: true })
    observer.observe({ type: 'layout-shift', buffered: true })
  } catch {
    // Not all vitals supported in all browsers
  }
}
