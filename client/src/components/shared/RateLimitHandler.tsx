/**
 * RateLimitHandler
 *
 * Rate limiting is handled via Axios response interceptors in @/lib/api.ts:
 * - 429 (Too Many Requests): Shows a warning toast and auto-retries using the Retry-After header
 * - 503 (Service Unavailable): Shows an error toast
 *
 * This module is intentionally empty as the interceptor is registered globally
 * when api.ts is imported. No React component is needed.
 */

export {}
