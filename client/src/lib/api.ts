import axios from 'axios'
import { auth } from './firebase'
import { useToastStore } from '@/store/toast.store'

const api = axios.create({
  baseURL: import.meta.env.VITE_NESTJS_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach Firebase ID token to every request
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser
  if (user) {
    const token = await user.getIdToken()
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401, 429, and 503 responses
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status

    if (status === 401) {
      auth.signOut()
      window.location.href = '/login'
    }

    if (status === 429) {
      useToastStore.getState().addToast({
        type: 'warning',
        message: 'Too many requests',
        description: 'Please wait a moment before trying again.',
      })

      // Auto-retry with Retry-After header
      const retryAfter = error.response?.headers?.['retry-after']
      if (retryAfter && error.config && !error.config._retried) {
        const delay = (parseInt(retryAfter, 10) || 1) * 1000
        error.config._retried = true
        await new Promise((resolve) => setTimeout(resolve, delay))
        return api.request(error.config)
      }
    }

    if (status === 503) {
      useToastStore.getState().addToast({
        type: 'error',
        message: 'Service temporarily unavailable',
        description: 'The server is temporarily down. Please try again later.',
      })
    }

    return Promise.reject(error)
  }
)

export default api
