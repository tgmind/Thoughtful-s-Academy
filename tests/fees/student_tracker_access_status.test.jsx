import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import StudentTracker from '../../src/pages/admin/StudentTracker'
import {
  checkBatchFeeStatus,
  formatStudentAccessBadge,
  BATCH_ACCESS_STATUS,
  FEE_MODES,
} from '../../src/utils/feeAccess'

// Mock Supabase
const mockProfiles = [
  {
    id: 'student-paid-1',
    full_name: 'Aarav Sharma',
    email: 'aarav@example.com',
    phone: '9876543210',
    is_active: true,
    created_at: '2026-10-01T10:00:00Z',
    role: 'student',
  },
  {
    id: 'student-trial-2',
    full_name: 'Diya Patel',
    email: 'diya@example.com',
    phone: '9876543211',
    is_active: true,
    created_at: '2026-10-16T10:00:00Z',
    role: 'student',
  },
  {
    id: 'student-overdue-3',
    full_name: 'Rohan Verma',
    email: 'rohan@example.com',
    phone: '9876543212',
    is_active: true,
    created_at: '2026-09-01T10:00:00Z',
    role: 'student',
  },
]

const mockStudentProfiles = [
  {
    id: 'student-paid-1',
    batch_id: 'batch-monthly-1',
    roll_number: 'R-101',
    parent_phone: '9876500001',
    date_of_birth: '2008-05-15',
    trial_ends_at: '2026-10-03T10:00:00Z', // Trial expired long ago
    batches: { id: 'batch-monthly-1', name: 'Physics Masterclass', fee_mode: 'monthly', fee_amount: 1500 },
  },
  {
    id: 'student-trial-2',
    batch_id: 'batch-monthly-1',
    roll_number: 'R-102',
    parent_phone: '9876500002',
    date_of_birth: '2008-08-20',
    trial_ends_at: new Date(Date.now() + 40 * 3600000).toISOString(), // ~40 hours left
    batches: { id: 'batch-monthly-1', name: 'Physics Masterclass', fee_mode: 'monthly', fee_amount: 1500 },
  },
  {
    id: 'student-overdue-3',
    batch_id: 'batch-monthly-1',
    roll_number: 'R-103',
    parent_phone: '9876500003',
    date_of_birth: '2007-12-10',
    trial_ends_at: null, // No active trial
    batches: { id: 'batch-monthly-1', name: 'Physics Masterclass', fee_mode: 'monthly', fee_amount: 1500 },
  },
]

const mockBatches = [
  {
    id: 'batch-monthly-1',
    name: 'Physics Masterclass',
    fee_mode: 'monthly',
    fee_amount: 1500,
    validity_days: null,
    validity_end_date: null,
    subjects: ['Physics'],
  },
]

const mockFeeRecords = [
  {
    id: 'fee-1',
    student_id: 'student-paid-1',
    batch_id: 'batch-monthly-1',
    amount: 1500,
    payment_month: new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    status: 'verified',
    paid_at: '2026-10-12T10:00:00Z',
    reference_id: 'UPI-987654321',
  },
]

const mockAdminOverrides = []
const mockAttendance = []

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: vi.fn((table) => {
      const builder = {
        select: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        order: vi.fn(() => builder),
        maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
        insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
        update: vi.fn(() => builder),
        upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
        then: (resolve) => {
          if (table === 'profiles') {
            resolve({ data: mockProfiles, error: null })
          } else if (table === 'student_profiles') {
            resolve({ data: mockStudentProfiles, error: null })
          } else if (table === 'batches') {
            resolve({ data: mockBatches, error: null })
          } else if (table === 'fee_records') {
            resolve({ data: mockFeeRecords, error: null })
          } else if (table === 'admin_access_overrides') {
            resolve({ data: mockAdminOverrides, error: null })
          } else if (table === 'attendance') {
            resolve({ data: mockAttendance, error: null })
          } else {
            resolve({ data: [], error: null })
          }
        },
      }
      return builder
    }),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
  },
}))

vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'admin-user-id', role: 'admin' },
  }),
}))

describe('Authoritative Student Access and Fee Status Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('formatStudentAccessBadge authoritative mapping', () => {
    it('formats Fee Paid / Verified correctly', () => {
      const badge = formatStudentAccessBadge({
        status: BATCH_ACCESS_STATUS.ACTIVE,
        feeAmount: 1500,
        verifiedRecord: { id: 'rec-1' },
      })
      expect(badge.label).toBe('Fee Paid / Verified')
      expect(badge.color).toContain('emerald')
    })

    it('formats Provisional Access for pending submissions correctly', () => {
      const badge = formatStudentAccessBadge({
        status: BATCH_ACCESS_STATUS.PENDING_VERIFICATION,
        isActive: true,
      })
      expect(badge.label).toBe('Provisional Access')
      expect(badge.color).toContain('sky')
    })

    it('formats Pending Verification / Access Frozen when provisional access is disabled', () => {
      const badge = formatStudentAccessBadge({
        status: BATCH_ACCESS_STATUS.PENDING_VERIFICATION,
        isActive: false,
      })
      expect(badge.label).toBe('Pending Verification / Access Frozen')
      expect(badge.color).toContain('amber')
    })

    it('formats Trial Active with remaining hours', () => {
      const badge = formatStudentAccessBadge({
        status: BATCH_ACCESS_STATUS.TRIAL,
        isTrialActive: true,
        trialHoursLeft: 47,
      })
      expect(badge.label).toBe('Trial Active (47h)')
      expect(badge.color).toContain('amber')
    })

    it('formats Trial Expiring when 6 hours or fewer remain', () => {
      const badge = formatStudentAccessBadge({
        status: BATCH_ACCESS_STATUS.TRIAL_EXPIRING,
        isTrialActive: true,
        trialHoursLeft: 4,
      })
      expect(badge.label).toBe('Trial Expiring (4h)')
      expect(badge.color).toContain('amber')
    })

    it('formats Trial Expired / Access Frozen', () => {
      const badge = formatStudentAccessBadge({
        status: BATCH_ACCESS_STATUS.TRIAL_EXPIRED,
      })
      expect(badge.label).toBe('Trial Expired / Access Frozen')
      expect(badge.color).toContain('rose')
    })

    it('formats Fee Due / Grace Period', () => {
      const badge = formatStudentAccessBadge({
        status: BATCH_ACCESS_STATUS.GRACE_PERIOD,
      })
      expect(badge.label).toBe('Fee Due / Grace Period')
      expect(badge.color).toContain('amber')
    })

    it('formats Fee Overdue / Access Frozen', () => {
      const badge = formatStudentAccessBadge({
        status: BATCH_ACCESS_STATUS.FROZEN,
      })
      expect(badge.label).toBe('Fee Overdue / Access Frozen')
      expect(badge.color).toContain('rose')
    })

    it('formats Payment Rejected / Access Frozen', () => {
      const badge = formatStudentAccessBadge({
        status: BATCH_ACCESS_STATUS.REJECTED,
      })
      expect(badge.label).toBe('Payment Rejected / Access Frozen')
      expect(badge.color).toContain('rose')
    })

    it('formats Course Validity Expired / Access Frozen', () => {
      const badge = formatStudentAccessBadge({
        status: BATCH_ACCESS_STATUS.EXPIRED,
      })
      expect(badge.label).toBe('Course Validity Expired / Access Frozen')
      expect(badge.color).toContain('slate')
    })

    it('formats Access Granted / Fee Waived', () => {
      const badge = formatStudentAccessBadge({
        status: BATCH_ACCESS_STATUS.ADMIN_OVERRIDE,
        isWaived: true,
      })
      expect(badge.label).toBe('Access Granted / Fee Waived')
      expect(badge.color).toContain('teal')
    })

    it('formats Account Suspended', () => {
      const badge = formatStudentAccessBadge({
        status: BATCH_ACCESS_STATUS.SUSPENDED,
      })
      expect(badge.label).toBe('Account Suspended')
      expect(badge.color).toContain('rose')
    })

    it('formats Data Error / Unable to Determine for null or data error input', () => {
      expect(formatStudentAccessBadge(null).label).toBe('Data Error / Unable to Determine')
      expect(formatStudentAccessBadge({ status: BATCH_ACCESS_STATUS.DATA_ERROR }).label).toBe('Data Error / Unable to Determine')
    })
  })

  describe('Precedence verification in checkBatchFeeStatus', () => {
    it('verified payment takes precedence over active trial', () => {
      const status = checkBatchFeeStatus({
        student: {
          id: 's-1',
          is_active: true,
          trial_ends_at: new Date(Date.now() + 86400000).toISOString(),
        },
        batch: { id: 'b-1', fee_mode: FEE_MODES.MONTHLY, fee_amount: 1000 },
        feeRecords: [{
          batch_id: 'b-1',
          payment_month: new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
          status: 'verified',
          paid_at: new Date().toISOString(),
        }],
      })

      const badge = formatStudentAccessBadge(status)
      expect(badge.label).toBe('Fee Paid / Verified')
      expect(status.isActive).toBe(true)
    })

    it('provisional access takes precedence over active trial', () => {
      const status = checkBatchFeeStatus({
        student: {
          id: 's-2',
          is_active: true,
          trial_ends_at: new Date(Date.now() + 86400000).toISOString(),
        },
        batch: { id: 'b-1', fee_mode: FEE_MODES.MONTHLY, fee_amount: 1000 },
        feeRecords: [{
          batch_id: 'b-1',
          payment_month: new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
          status: 'pending',
          paid_at: new Date().toISOString(),
        }],
      })

      const badge = formatStudentAccessBadge(status)
      expect(badge.label).toBe('Provisional Access')
      expect(status.isActive).toBe(true)
    })
  })

  describe('StudentTracker UI Component Integration', () => {
    it('renders real, authoritative access statuses and does not display misleading Trial Over on paid student', async () => {
      render(
        <MemoryRouter>
          <StudentTracker />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Aarav Sharma')).toBeInTheDocument()
      })

      // Aarav Sharma is Fee Paid / Verified. He must NOT have a "Trial Over" badge next to his name.
      expect(screen.getByText('Fee Paid / Verified')).toBeInTheDocument()
      expect(screen.queryByText('Trial Over')).not.toBeInTheDocument()

      // Diya Patel has an active trial
      expect(screen.getByText(/Trial Active/i)).toBeInTheDocument()

      // Rohan Verma is overdue on day 11+
      expect(screen.getByText(/Fee Overdue \/ Access Frozen/i)).toBeInTheDocument()
    })

    it('opens Student Profile Drawer with dedicated fee details and admin action buttons', async () => {
      render(
        <MemoryRouter>
          <StudentTracker />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Aarav Sharma')).toBeInTheDocument()
      })

      const viewButtons = screen.getAllByRole('button', { name: /^view$/i })
      fireEvent.click(viewButtons[0])

      await waitFor(() => {
        expect(screen.getByText('Student Profile')).toBeInTheDocument()
      })

      expect(screen.getByText('Fee Architecture Details')).toBeInTheDocument()
      expect(screen.getByText(/Verified Payment Record/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Approve & Grant Full Access/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /\+2 Days Trial/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /\+7 Days Trial/i })).toBeInTheDocument()
    })
  })
})
