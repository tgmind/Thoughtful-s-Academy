import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Login from '../../src/pages/Login'

// Mock AuthContext
const mockUseAuth = vi.fn()
vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

// Mock Supabase
vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'student', is_active: true }, error: null }),
    })),
  },
}))

describe('Login Page Redesign (Theme Parity with Public Landing)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
      user: null,
      profile: null,
      loading: false,
      refreshProfile: vi.fn(),
    })
  })

  it('renders redesigned login page with editorial branding and verified access badge', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )

    // Check heading and badges
    expect(screen.getByRole('heading', { name: /Welcome back/i })).toBeInTheDocument()
    expect(screen.getAllByText(/Verified Access/i).length).toBeGreaterThan(0)
    expect(screen.getByPlaceholderText(/you@email.com/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Your password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Log In/i })).toBeInTheDocument()
    expect(screen.getByText(/Register now/i)).toBeInTheDocument()
  })

  it('toggles password visibility when eye button is clicked', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )

    const pwInput = screen.getByPlaceholderText(/Your password/i)
    expect(pwInput).toHaveAttribute('type', 'password')

    const toggleBtn = screen.getByRole('button', { name: /Show password/i })
    fireEvent.click(toggleBtn)

    expect(pwInput).toHaveAttribute('type', 'text')
  })

  it('switches to reset password view when Forgot Password is clicked and back', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )

    const forgotBtn = screen.getByRole('button', { name: /Forgot password\?/i })
    fireEvent.click(forgotBtn)

    expect(screen.getByRole('heading', { name: /Reset Password/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Send Reset Link/i })).toBeInTheDocument()

    const backBtn = screen.getByRole('button', { name: /Back to login/i })
    fireEvent.click(backBtn)

    expect(screen.getByRole('heading', { name: /Welcome back/i })).toBeInTheDocument()
  })
})
