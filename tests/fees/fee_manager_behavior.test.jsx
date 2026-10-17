import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import FeeManager from '../../src/pages/admin/FeeManager'

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
    user: { id: 'admin-1', email: 'admin@thoughtful.test' },
    profile: { id: 'admin-1', full_name: 'Super Admin', role: 'admin' },
    loading: false,
  }),
}))

describe('FeeManager - 6-Month Behavior & Defaulter Analysis', () => {
  beforeEach(() => {
    const now = new Date()
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevMonthLabel = prevMonthDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

    mockTablesData = {
      batches: [
        {
          id: 'batch-monthly-1',
          name: 'Class 10 - Regular Monthly',
          fee_mode: 'monthly',
          fee_amount: 1500,
          validity_days: null,
          validity_end_date: null,
          is_active: true,
        },
      ],
      profiles: [
        {
          // Student 1: Enrolled just today (brand new student in current month)
          id: 'student-new',
          full_name: 'Aarav Newcomer',
          email: 'aarav@test.com',
          phone: '9876543210',
          role: 'student',
          is_active: true,
          created_at: now.toISOString(),
        },
        {
          // Student 2: Enrolled 5 months ago, paid previous month, unpaid current month
          id: 'student-existing',
          full_name: 'Priya Senior',
          email: 'priya@test.com',
          phone: '9876543211',
          role: 'student',
          is_active: true,
          created_at: new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString(),
        },
      ],
      student_profiles: [
        {
          id: 'student-new',
          batch_id: 'batch-monthly-1',
          roll_number: '101',
          parent_phone: '9876500001',
          trial_ends_at: null,
          batches: {
            id: 'batch-monthly-1',
            name: 'Class 10 - Regular Monthly',
            fee_mode: 'monthly',
            fee_amount: 1500,
          },
        },
        {
          id: 'student-existing',
          batch_id: 'batch-monthly-1',
          roll_number: '102',
          parent_phone: '9876500002',
          trial_ends_at: null,
          batches: {
            id: 'batch-monthly-1',
            name: 'Class 10 - Regular Monthly',
            fee_mode: 'monthly',
            fee_amount: 1500,
          },
        },
      ],
      fee_records: [
        {
          id: 'fee-1',
          student_id: 'student-existing',
          batch_id: 'batch-monthly-1',
          amount: 1500,
          payment_month: prevMonthLabel,
          fee_mode: 'monthly',
          status: 'verified',
          paid_at: prevMonthDate.toISOString(),
        },
      ],
    }

    mockSupabase = createChainableQueryBuilder(mockTablesData)
  })

  it('does NOT falsely penalize a newly enrolled student with 6M Unpaid', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/fees']}>
        <Routes>
          <Route path="/admin/fees" element={<FeeManager />} />
        </Routes>
      </MemoryRouter>
    )

    // Wait for student names to be rendered
    await waitFor(() => {
      expect(screen.getByText('Aarav Newcomer')).toBeInTheDocument()
    })

    // Aarav joined in the current month, so he should NOT be marked with 🚨 6M Unpaid or repeat defaulter
    expect(screen.queryByText(/6M Unpaid/i)).not.toBeInTheDocument()

    // Aarav has only 1 month unpaid (consecutiveUnpaid = 1), so he should NOT have repeat defaulter badge
    const studentCard = screen.getByText('Aarav Newcomer').closest('.bg-white')
    expect(studentCard).not.toHaveTextContent(/🚨.*Unpaid/)
  })

  it('renders clear 3-letter month labels and payment status symbols instead of ambiguous single letters', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/fees']}>
        <Routes>
          <Route path="/admin/fees" element={<FeeManager />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Aarav Newcomer')).toBeInTheDocument()
    })

    // Verify the legend is present in the header
    expect(screen.getByText(/Student Fee Status \(/i)).toBeInTheDocument()
    expect(screen.getAllByText('Paid').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Pending').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Unpaid').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('N/A')).toBeInTheDocument()

    // Check for short month labels (e.g. Oct, Sep, Aug, Jul, Jun, May or appropriate current months)
    const now = new Date()
    const currentShortMonth = now.toLocaleDateString('en-IN', { month: 'short' })
    expect(screen.getAllByText(currentShortMonth).length).toBeGreaterThan(0)

    // Check tooltip titles for newly enrolled student:
    // For months prior to enrollment, the title contains "Not Enrolled"
    const notEnrolledBadges = screen.getAllByTitle(/Not Enrolled/i)
    expect(notEnrolledBadges.length).toBeGreaterThan(0)

    // For verified month of Priya Senior, title should indicate "Paid & Verified" or "Paid (₹1500)"
    const paidBadges = screen.getAllByTitle(/Paid/i)
    expect(paidBadges.length).toBeGreaterThan(0)
  })
})
