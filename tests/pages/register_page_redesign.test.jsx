import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Register from '../../src/pages/Register'

const mockBatches = [
  {
    id: 'batch-1',
    name: 'Class 9 Foundation',
    subjects: ['Physics', 'Chemistry', 'Maths'],
    is_active: true,
  },
  {
    id: 'batch-2',
    name: 'Class 10 Board Mastery',
    subjects: ['Science', 'Maths'],
    is_active: true,
  },
]

// Mock Supabase
vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
    },
    from: vi.fn((table) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockBatches, error: null }),
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: { name: 'Class 9 Foundation' }, error: null }),
    })),
  },
}))

describe('Register Page Redesign (Theme Parity with Public Landing & Login)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders redesigned Register page with Step 1 and brand editorial content', () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    )

    // Heading & steps
    expect(screen.getByRole('heading', { name: /Student Registration/i })).toBeInTheDocument()
    expect(screen.getByText(/Account Info/i)).toBeInTheDocument()
    expect(screen.getByText(/Batch & Course/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Student Enrollment/i).length).toBeGreaterThan(0)

    // Fields
    expect(screen.getByPlaceholderText(/Ravi Kumar/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/you@email.com/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/\+91 9876543210/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Min. 8 characters/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Re-enter your password/i)).toBeInTheDocument()

    // CTA
    expect(screen.getByRole('button', { name: /Continue to Batch Details/i })).toBeInTheDocument()
    expect(screen.getByText(/Log in/i)).toBeInTheDocument()
  })

  it('validates required fields on Step 1 before proceeding', async () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    )

    const continueBtn = screen.getByRole('button', { name: /Continue to Batch Details/i })
    fireEvent.click(continueBtn)

    expect(await screen.findByText(/Full name is required/i)).toBeInTheDocument()
    expect(await screen.findByText(/Email address is required/i)).toBeInTheDocument()
    expect(await screen.findByText(/Password is required/i)).toBeInTheDocument()
  })

  it('navigates to Step 2 when Step 1 is valid, and allows navigating back', async () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByPlaceholderText(/Ravi Kumar/i), { target: { value: 'Aarav Sharma' } })
    fireEvent.change(screen.getByPlaceholderText(/you@email.com/i), { target: { value: 'aarav@example.com' } })
    fireEvent.change(screen.getByPlaceholderText(/Min. 8 characters/i), { target: { value: 'Password123!' } })
    fireEvent.change(screen.getByPlaceholderText(/Re-enter your password/i), { target: { value: 'Password123!' } })

    const continueBtn = screen.getByRole('button', { name: /Continue to Batch Details/i })
    fireEvent.click(continueBtn)

    // Should now show Step 2
    expect(await screen.findByRole('heading', { name: /Batch & Enrollment/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/Target Batch \/ Cohort/i)).toBeInTheDocument()

    // Go back to Step 1
    const backBtn = screen.getByRole('button', { name: /Back to Account Info/i })
    fireEvent.click(backBtn)

    expect(await screen.findByRole('heading', { name: /Student Registration/i })).toBeInTheDocument()
  })
})
