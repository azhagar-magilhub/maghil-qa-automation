import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

// Mock the auth store before importing the component
const mockSignIn = vi.fn()
const mockClearError = vi.fn()
const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('@/store/auth.store', () => ({
  useAuthStore: vi.fn(() => ({
    signIn: mockSignIn,
    loading: false,
    error: null,
    clearError: mockClearError,
    user: null,
  })),
}))

import LoginPage from '@/pages/LoginPage'
import { useAuthStore } from '@/store/auth.store'

const renderLoginPage = () =>
  render(
    <MemoryRouter initialEntries={['/login']}>
      <LoginPage />
    </MemoryRouter>,
  )

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuthStore).mockReturnValue({
      signIn: mockSignIn,
      loading: false,
      error: null,
      clearError: mockClearError,
      user: null,
    } as unknown as ReturnType<typeof useAuthStore>)
  })

  it('renders login form with email and password fields', () => {
    renderLoginPage()

    expect(screen.getByPlaceholderText('you@company.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument()
  })

  it('shows "Sign In" heading', () => {
    renderLoginPage()

    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument()
  })

  it('has "Sign In" submit button', () => {
    renderLoginPage()

    const submitButton = screen.getByRole('button', { name: /sign in/i })
    expect(submitButton).toBeInTheDocument()
    expect(submitButton).toHaveAttribute('type', 'submit')
  })

  it('has link to register page', () => {
    renderLoginPage()

    const registerLink = screen.getByRole('link', { name: /create account/i })
    expect(registerLink).toBeInTheDocument()
    expect(registerLink).toHaveAttribute('href', '/register')
  })

  it('has link to forgot password', () => {
    renderLoginPage()

    const forgotLink = screen.getByRole('link', { name: /forgot password/i })
    expect(forgotLink).toBeInTheDocument()
    expect(forgotLink).toHaveAttribute('href', '/forgot-password')
  })

  it('shows error message on failed login', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      signIn: mockSignIn,
      loading: false,
      error: 'Invalid email or password',
      clearError: mockClearError,
      user: null,
    } as unknown as ReturnType<typeof useAuthStore>)

    renderLoginPage()

    expect(screen.getByText('Invalid email or password')).toBeInTheDocument()
  })

  it('calls signIn with email and password on form submit', async () => {
    const user = userEvent.setup()
    mockSignIn.mockResolvedValue(undefined)

    renderLoginPage()

    await user.type(screen.getByPlaceholderText('you@company.com'), 'test@example.com')
    await user.type(screen.getByPlaceholderText('Enter your password'), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(mockClearError).toHaveBeenCalled()
    expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123')
  })
})
