import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Analytics from '../../src/pages/admin/Analytics'
import AttendanceChart from '../../src/components/analytics/AttendanceChart'

// Mock ResizeObserver for Recharts
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock dependencies
vi.mock('../../src/services/attendanceService', () => ({
  getComprehensiveAttendanceAnalytics: vi.fn().mockResolvedValue({
    summary: { totalSessions: 0, totalMarks: 0, totalPresent: 0, totalAbsent: 0, overallRate: 0, atRiskCount: 0 },
    batchBreakdown: [],
    trend: [],
    currentlyActive: [
      {
        id: 'sess-active-1',
        title: 'Institute Attentiveness Check',
        batch_id: 'batch-9',
        started_at: new Date().toISOString(),
        duration_minutes: 5,
        batches: { name: 'Class 9 Marathon' },
        profiles: { full_name: 'Subodh' },
      },
    ],
    atRiskStudents: [],
  }),
  getAttendanceSessionsHistory: vi.fn().mockResolvedValue({ data: [] }),
  initiateAttendanceSession: vi.fn().mockResolvedValue({ data: {}, error: null }),
  closeAttendanceSession: vi.fn().mockResolvedValue({ success: true, error: null }),
  getSessionRoster: vi.fn().mockResolvedValue({ roster: [], stats: {} }),
}))

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: vi.fn((table) => {
      if (table === 'batches') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [{ id: 'batch-9', name: 'Class 9 Marathon' }], error: null }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }
    }),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
  },
}))

describe('Analytics UI Redesign & Pill Hierarchy Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders executive analytics header and segmented pill tabs', async () => {
    const { container } = render(
      <MemoryRouter>
        <Analytics />
      </MemoryRouter>
    )

    // Executive title and overline pill
    expect(screen.getByText(/Executive Intelligence Suite/i)).toBeInTheDocument()
    expect(screen.getByText(/Institute Analytics & Attentiveness Command/i)).toBeInTheDocument()

    // Segmented pill buttons with icons and indicator tags
    expect(screen.getByText('Attendance Analytics')).toBeInTheDocument()
    expect(screen.getByText('Fees Analytics')).toBeInTheDocument()
    expect(screen.getByText('Live Telemetry')).toBeInTheDocument()
    expect(screen.getByText('Collections')).toBeInTheDocument()

    // Container has mobile safe-area bottom padding to prevent bottom dock clipping
    const outerContainer = container.firstChild
    expect(outerContainer.className).toContain('pb-28')
  })

  it('renders Live Attentiveness Check active card with beautiful pills and text hierarchy', async () => {
    render(
      <MemoryRouter>
        <AttendanceChart />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Live Attentiveness Check')).toBeInTheDocument()
    })

    // Badges and pills
    const livePill = screen.getByText('Live Attentiveness Check')
    expect(livePill.className).toContain('whitespace-nowrap')
    expect(livePill.className).toContain('rounded-full')

    expect(screen.getByText(/Started/i)).toBeInTheDocument()
    expect(screen.getByText(/Batch:/i)).toBeInTheDocument()
    expect(screen.getByText(/Proctor:/i)).toBeInTheDocument()
    expect(screen.getByText(/Window:/i)).toBeInTheDocument()

    // End session button
    expect(screen.getByRole('button', { name: /End Session & Finalize/i })).toBeInTheDocument()
  })

  it('renders At-Risk Student Matrix with responsive search and reassuring empty state pill', async () => {
    render(
      <MemoryRouter>
        <AttendanceChart />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('At-Risk Student Intervention Matrix')).toBeInTheDocument()
    })

    // Search input has proper responsive placeholder
    const searchInput = screen.getByPlaceholderText(/Search at-risk student…/i)
    expect(searchInput).toBeInTheDocument()

    // Threshold filter pills
    expect(screen.getByText(/< 50% Critical/i)).toBeInTheDocument()
    expect(screen.getByText(/< 75% Warning/i)).toBeInTheDocument()

    // Reassuring empty state
    expect(screen.getByText(/All Clear • Retention Healthy/i)).toBeInTheDocument()
    expect(screen.getByText(/No Students Below 50% Attendance Threshold/i)).toBeInTheDocument()
  })

  it('renders session verification logs with empty state icon, pill, and action launcher', async () => {
    render(
      <MemoryRouter>
        <AttendanceChart />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Attentiveness Session Verification Logs')).toBeInTheDocument()
    })

    // Empty state header and action button
    expect(screen.getByText('Log Archive Empty')).toBeInTheDocument()
    expect(screen.getByText('No Attendance Sessions Recorded Yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Launch First Attentiveness Check/i })).toBeInTheDocument()
  })
})
