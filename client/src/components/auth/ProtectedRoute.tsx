import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { SkeletonPage } from '@/components/shared/Skeleton'

export default function ProtectedRoute() {
  const { user, initialized } = useAuthStore()

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-body">
        <div className="w-full max-w-6xl px-6">
          <div className="flex flex-col items-center gap-6 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent">
              <span className="text-base font-bold text-white">M</span>
            </div>
            <p className="text-sm text-text-secondary">Loading your workspace...</p>
          </div>
          <SkeletonPage />
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
