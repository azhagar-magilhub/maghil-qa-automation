import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

vi.mock('@/store/auth.store', () => ({
  useAuthStore: vi.fn(() => ({
    user: null,
    initialized: false,
  })),
}))

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useAuthStore } from '@/store/auth.store'

const renderWithRouter = (initialEntries: string[] = ['/protected']) =>
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/protected" element={<div>Protected Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading spinner when not initialized', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: null,
      initialized: false,
    } as unknown as ReturnType<typeof useAuthStore>)

    renderWithRouter()

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('redirects to /login when no user', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: null,
      initialized: true,
    } as unknown as ReturnType<typeof useAuthStore>)

    renderWithRouter()

    expect(screen.getByText('Login Page')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('renders Outlet when user exists', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: { uid: 'test-uid', email: 'test@test.com' },
      initialized: true,
    } as unknown as ReturnType<typeof useAuthStore>)

    renderWithRouter()

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument()
  })
})
