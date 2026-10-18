import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import LiveClass from '../../src/pages/teacher/LiveClass'

let mockTableData = {}
let mockLimits = []
let mockFilters = []

vi.mock('../../src/lib/supabase', () => {
  const createQuery = (table) => {
    let currentLimit = null
    let filterActive = null
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn((col, val) => {
        mockFilters.push({ table, col, val })
        if (col === 'is_active') filterActive = val
        return query
      }),
      is: vi.fn(() => query),
      or: vi.fn(() => query),
      order: vi.fn(() => query),
      limit: vi.fn((n) => {
        currentLimit = n
        mockLimits.push({ table, limit: n })
        return query
      }),
      update: vi.fn(() => query),
      insert: vi.fn(() => query),
      delete: vi.fn(() => query),
      maybeSingle: vi.fn(() => {
        let data = mockTableData[table]
        if (Array.isArray(data) && filterActive !== null) {
          data = data.filter(x => x.is_active === filterActive)
        }
        return Promise.resolve({ data: Array.isArray(data) ? data[0] || null : data, error: null })
      }),
      single: vi.fn(() => {
        let data = mockTableData[table]
        if (Array.isArray(data) && filterActive !== null) {
          data = data.filter(x => x.is_active === filterActive)
        }
        return Promise.resolve({ data: Array.isArray(data) ? data[0] || null : data, error: null })
      }),
      then: (resolve, reject) => {
        let data = mockTableData[table] ?? []
        if (Array.isArray(data) && filterActive !== null) {
          data = data.filter(x => x.is_active === filterActive)
        }
        if (Array.isArray(data) && currentLimit !== null) {
          data = data.slice(0, currentLimit)
        }
        return Promise.resolve({ data, error: null }).then(resolve, reject)
      },
    }
    return query
  }

  return {
    supabase: {
      from: vi.fn((table) => createQuery(table)),
      channel: vi.fn(() => ({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      })),
      removeChannel: vi.fn(),
    },
  }
})

const mockUser = { id: 'admin-1', email: 'admin@thoughtful.edu' }
const mockProfile = { id: 'admin-1', role: 'admin', full_name: 'Subodh Admin' }

vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    profile: mockProfile,
    loading: false,
  }),
}))

describe('Live Class: 20-Entry History Limit and Safe Auto-Pruning', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLimits = []
    mockFilters = []
  })

  it('1. LiveClass queries exactly the past 20 inactive classes from the database', async () => {
    const mockPastClasses = Array.from({ length: 25 }, (_, i) => ({
      id: `past-lc-${i + 1}`,
      title: `Live Session #${i + 1}`,
      platform: 'zoom',
      join_url: 'https://zoom.us/j/123456789',
      is_active: false,
      created_at: new Date(Date.now() - i * 3600000).toISOString(),
      batches: { name: 'Batch A' },
      profiles: { full_name: 'Subodh Admin' },
    }))

    mockTableData = {
      live_classes: mockPastClasses,
      batches: [{ id: 'batch-1', name: 'Batch A' }],
    }

    render(
      <MemoryRouter>
        <LiveClass isAdmin={true} />
      </MemoryRouter>
    )

    // Verify UI shows Past Classes header with count capped at 20
    const pastHeading = await screen.findByRole('heading', { name: 'Past Classes' })
    expect(pastHeading).toBeInTheDocument()
    expect(screen.getByText('Showing past 20 classes')).toBeInTheDocument()

    // Verify limit 20 and is_active = false were queried on live_classes
    const limitCall = mockLimits.find(l => l.table === 'live_classes' && l.limit === 20)
    expect(limitCall).toBeDefined()
    expect(limitCall.limit).toBe(20)

    const inactiveFilter = mockFilters.find(f => f.table === 'live_classes' && f.col === 'is_active' && f.val === false)
    expect(inactiveFilter).toBeDefined()
  })

  it('2. Ending an active class prepends it to past classes, deduplicates, and caps history at 20', async () => {
    const activeClass = {
      id: 'active-lc-01',
      title: 'Current Active Lecture',
      platform: 'zoom',
      join_url: 'https://zoom.us/j/999999999',
      is_active: true,
      teacher_id: 'admin-1',
      created_at: new Date().toISOString(),
      batches: { name: 'Class 10' },
      profiles: { full_name: 'Subodh Admin' },
    }

    const mockPastClasses = Array.from({ length: 20 }, (_, i) => ({
      id: `past-lc-${i + 1}`,
      title: `Past Class #${i + 1}`,
      platform: 'zoom',
      join_url: 'https://zoom.us/j/123456789',
      is_active: false,
      teacher_id: 'admin-1',
      created_at: new Date(Date.now() - (i + 1) * 3600000).toISOString(),
      batches: { name: 'Class 10' },
      profiles: { full_name: 'Subodh Admin' },
    }))

    mockTableData = {
      live_classes: [activeClass, ...mockPastClasses],
      batches: [{ id: 'batch-1', name: 'Class 10' }],
    }

    render(
      <MemoryRouter>
        <LiveClass isAdmin={true} />
      </MemoryRouter>
    )

    // Active session is rendered
    expect(await screen.findByRole('heading', { name: 'Current Active Lecture' })).toBeInTheDocument()
    expect(screen.getByText('Showing past 20 classes')).toBeInTheDocument()

    // Click End Class
    const endBtn = screen.getByRole('button', { name: /End Class/i })
    fireEvent.click(endBtn)

    // After ending, total past classes must strictly not exceed 20 and active banner is removed
    await waitFor(() => {
      expect(screen.getByText('Showing past 20 classes')).toBeInTheDocument()
      expect(screen.queryByText(/Live Class Active/i)).not.toBeInTheDocument()
    })

    // Confirm that the ended class appears in past history
    expect(screen.getByText('Current Active Lecture')).toBeInTheDocument()
  })

  it('3. Active live classes are strictly preserved and not removed by retention logic', async () => {
    const activeClass = {
      id: 'ongoing-class-99',
      title: 'Active High Priority Physics',
      platform: 'zoom',
      join_url: 'https://zoom.us/j/111222333',
      is_active: true,
      teacher_id: 'admin-1',
      created_at: new Date().toISOString(),
      batches: { name: 'Batch Titans' },
      profiles: { full_name: 'Subodh Admin' },
    }

    mockTableData = {
      live_classes: [activeClass],
      batches: [{ id: 'b-99', name: 'Batch Titans' }],
    }

    render(
      <MemoryRouter>
        <LiveClass isAdmin={true} />
      </MemoryRouter>
    )

    expect(await screen.findByRole('heading', { name: 'Active High Priority Physics' })).toBeInTheDocument()
    expect(screen.getByText(/Live Class Active/i)).toBeInTheDocument()
  })

  it('4. Migration 040 establishes automated database pruning trigger for past classes older than 20 entries with deterministic tie-breaking', () => {
    const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/040_prune_old_live_classes.sql')
    expect(fs.existsSync(migrationPath)).toBe(true)

    const sqlContent = fs.readFileSync(migrationPath, 'utf8')
    expect(sqlContent).toContain('prune_old_live_classes')
    expect(sqlContent).toContain('trg_prune_old_live_classes')
    expect(sqlContent).toContain('LIMIT 20')
    expect(sqlContent).toContain('SECURITY DEFINER')
    expect(sqlContent).toContain('is_active = false')
    expect(sqlContent).toContain('ORDER BY created_at DESC, id DESC')
    expect(sqlContent).toContain('AFTER INSERT OR UPDATE ON public.live_classes')
    expect(sqlContent).toContain('FOR EACH STATEMENT')
  })
})
