import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import PayFee from '../../src/pages/student/PayFee'
import StudentDashboard from '../../src/pages/student/StudentDashboard'

function createChainableQueryBuilder(tablesData = {}) {
  const createQuery = (table) => {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      is: vi.fn(() => query),
      or: vi.fn(() => query),
      order: vi.fn(() => query),
      limit: vi.fn(() => query),
      maybeSingle: vi.fn(() => {
        const data = tablesData[table]
        return Promise.resolve({ data: Array.isArray(data) ? data[0] || null : data, error: null })
      }),
      single: vi.fn(() => {
        const data = tablesData[table]
        return Promise.resolve({ data: Array.isArray(data) ? data[0] || null : data, error: null })
      }),
      then: (resolve, reject) => {
        const data = tablesData[table] ?? []
        return Promise.resolve({ data, error: null }).then(resolve, reject)
      },
    }
    return query
  }

  return {
    from: vi.fn((table) => createQuery(table)),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
  }
}

let mockTablesData = {}
let mockSupabase = null

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: (table) => mockSupabase.from(table),
    channel: (name) => mockSupabase.channel(name),
    removeChannel: (ch) => mockSupabase.removeChannel(ch),
  },
}))

vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'student-test-1', email: 'student@test.com' },
    profile: { id: 'student-test-1', full_name: 'Test Student', role: 'student', is_active: true },
    loading: false,
  }),
}))

describe('Student Fee Portal UI & Mobile Banner Responsiveness', () => {
  beforeEach(() => {
    const now = new Date()
    const currentMonthLabel = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

    mockTablesData = {
      batches: [
        {
          id: 'batch-1',
          name: 'Class 9 Marathon',
          fee_mode: 'monthly',
          fee_amount: 100,
          validity_days: null,
          validity_end_date: null,
          is_active: true,
        },
      ],
      qr_settings: {
        id: 'qr-1',
        payee_name: "Thoughtful's Academy",
        upi_id: 'academy@upi',
        qr_image_url: 'https://example.com/qr.png',
        is_active: true,
      },
      profiles: {
        id: 'student-test-1',
        full_name: 'Test Student',
        email: 'student@test.com',
        role: 'student',
        is_active: true,
      },
      student_profiles: {
        id: 'student-test-1',
        batch_id: 'batch-1',
        roll_number: 'TS01',
        trial_ends_at: null,
        batches: {
          id: 'batch-1',
          name: 'Class 9 Marathon',
          fee_mode: 'monthly',
          fee_amount: 100,
        },
      },
      fee_records: [
        {
          id: 'fee-rec-1',
          student_id: 'student-test-1',
          batch_id: 'batch-1',
          amount: 100,
          payment_month: currentMonthLabel,
          fee_mode: 'monthly',
          reference_id: 'Cash Deposit',
          status: 'pending',
          paid_at: now.toISOString(),
          batches: {
            id: 'batch-1',
            name: 'Class 9 Marathon',
            fee_mode: 'monthly',
            fee_amount: 100,
          },
        },
      ],
      notifications: [],
      announcements: [],
      attendance: [],
      homework_submissions: [],
      doubts: [],
    }

    mockSupabase = createChainableQueryBuilder(mockTablesData)
  })

  it('renders PayFee with responsive 2-column layout and mobile transaction cards', async () => {
    render(
      <MemoryRouter initialEntries={['/student/pay-fee']}>
        <Routes>
          <Route path="/student/pay-fee" element={<PayFee />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Fee Payment Portal')).toBeInTheDocument()
    })

    // Container should NOT be cramped to max-w-lg
    const portalContainer = screen.getByText('Fee Payment Portal').closest('.max-w-6xl')
    expect(portalContainer).toBeInTheDocument()

    // Form inputs rendered
    expect(screen.getByText('Enter Fee Details')).toBeInTheDocument()
    expect(screen.getByDisplayValue('100')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Proceed to Pay/i })).toBeInTheDocument()

    // Payment History section rendered
    expect(screen.getByText('Payment History')).toBeInTheDocument()
    expect(screen.getByText('1 record')).toBeInTheDocument()

    // Both mobile cards and desktop table elements are rendered
    const batchOccurrences = screen.getAllByText('Class 9 Marathon')
    expect(batchOccurrences.length).toBeGreaterThanOrEqual(1)

    // Check for Provisional Active label in history
    const provisionalLabels = screen.getAllByText('Provisional Active')
    expect(provisionalLabels.length).toBeGreaterThanOrEqual(1)
  })

  it('renders compact, beautiful mobile layout for pending verification banner in StudentDashboard', async () => {
    render(
      <MemoryRouter initialEntries={['/student/dashboard']}>
        <Routes>
          <Route path="/student/dashboard" element={<StudentDashboard />} />
        </Routes>
      </MemoryRouter>
    )

    // Wait for the banner to render
    await waitFor(() => {
      expect(screen.getByText('Payment Under Review')).toBeInTheDocument()
    })

    // Mobile view should contain compact title and tag
    expect(screen.getByText('Payment Under Review')).toBeInTheDocument()
    expect(screen.getAllByText('Provisional Access').length).toBeGreaterThanOrEqual(1)

    // Desktop view should also contain full title
    expect(screen.getByText('Fee Payment Submitted · Under Review')).toBeInTheDocument()

    // Status link to /student/pay-fee is present
    const statusLinks = screen.getAllByRole('link', { name: /View Status/i })
    expect(statusLinks.length).toBeGreaterThanOrEqual(1)
    expect(statusLinks[0]).toHaveAttribute('href', '/student/pay-fee')
  })
})
