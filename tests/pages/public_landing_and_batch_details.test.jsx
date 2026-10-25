import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Home from '../../src/pages/Home'
import BatchDetails from '../../src/pages/BatchDetails'

function createChainableQueryBuilder(getTableData, filters = []) {
  const handler = {
    get(target, prop) {
      if (prop === 'eq') {
        return (col, val) => {
          return createChainableQueryBuilder(getTableData, [...filters, (row) => row[col] === val])
        }
      }
      if (prop === 'then') {
        return (resolve) => {
          let data = typeof getTableData === 'function' ? getTableData() : getTableData
          if (Array.isArray(data)) {
            for (const f of filters) {
              data = data.filter(f)
            }
          }
          return Promise.resolve({ data, error: null }).then(resolve)
        }
      }
      if (prop === 'catch') {
        return (reject) => Promise.resolve({ data: [], error: null }).catch(reject)
      }
      if (prop === 'maybeSingle' || prop === 'single') {
        return vi.fn().mockImplementation(() => {
          let data = typeof getTableData === 'function' ? getTableData() : getTableData
          if (Array.isArray(data)) {
            for (const f of filters) {
              data = data.filter(f)
            }
          }
          return Promise.resolve({ data: data?.[0] || null, error: null })
        })
      }
      return vi.fn(() => new Proxy(target, handler))
    },
  }
  return new Proxy({}, handler)
}

const mockBatches = [
  {
    id: 'batch-1',
    name: 'Class 9 Marathon',
    description: 'Comprehensive Class 9 Foundation Course with daily live interactive sessions.',
    poster_url: 'https://drive.google.com/file/d/test-poster-id/view',
    subjects: ['Physics', 'Chemistry', 'Maths'],
    is_active: true,
    faculty_images: [
      { name: 'Dr. Verma', subject: 'Physics', image_url: '' }
    ],
    profiles: { full_name: 'Dr. Verma' },
  },
  {
    id: 'batch-2',
    name: 'Class 10 Deactivated',
    description: 'Deactivated course that was archived in admin portal.',
    poster_url: 'https://drive.google.com/file/d/test-poster-2/view',
    subjects: ['Physics'],
    is_active: false,
    faculty_images: [],
    profiles: { full_name: 'Teacher 1' },
  },
]

const mockStudyCards = [
  {
    id: 'card-1',
    title: 'Sound & Waves One Shot',
    description: 'Complete revision of Sound & Waves for class 9.',
    subject: 'Physics',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    type: 'youtube_video',
    is_featured: true,
    is_public: true,
    is_active: true,
    batch_ids: ['batch-1'],
    display_order: 1,
  },
  {
    id: 'card-2',
    title: 'Laws of Motion Detailed Notes',
    description: 'Handwritten chapter formula sheet and practice problems.',
    subject: 'Physics',
    url: 'https://drive.google.com/file/d/test-notes-id/view',
    type: 'google_drive',
    is_featured: false,
    is_public: true,
    is_active: true,
    batch_ids: ['batch-1'],
    display_order: 2,
  },
]

const mockNotifications = [
  {
    id: 'notif-1',
    title: 'Sunday Mock Test Scheduled',
    body: 'Complete syllabus physics mock test on Sunday 10:00 AM.',
    type: 'announcement',
    created_at: new Date().toISOString(),
    is_active: true,
  },
]

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: vi.fn((table) => {
      if (table === 'batches') {
        return createChainableQueryBuilder(() => mockBatches)
      }
      if (table === 'study_cards') {
        return createChainableQueryBuilder(() => mockStudyCards)
      }
      if (table === 'notifications') {
        return createChainableQueryBuilder(() => mockNotifications)
      }
      return createChainableQueryBuilder(() => [])
    }),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
  },
}))

describe('Public Landing Page & Batch Details Redesign (Mobbin & Vercel Aesthetic)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders Home page with coaching institute emblem in hero and NO person photo', async () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )

    // Institute name should be present
    expect(screen.getAllByText(/Graviton/i).length).toBeGreaterThan(0)

    // The hero emblem should render Academy brand text
    expect(screen.getByText(/Academic Excellence/i)).toBeInTheDocument()

    // Must NOT render old personal image or founder photo
    expect(screen.queryByAltText(/Founder/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Subodh Verma/i)).not.toBeInTheDocument()

    // Running Batches section must be present immediately on initial mount
    expect(screen.getByText(/Running Batches/i)).toBeInTheDocument()

    // "What's on" notification card must be present
    expect(screen.getAllByText(/What's on/i).length).toBeGreaterThan(0)

    await waitFor(() => {
      expect(screen.getByText(/Featured lectures/i)).toBeInTheDocument()
    }, { timeout: 3000 })

    // All lectures section should be rendered
    expect(screen.getByText(/All lectures/i)).toBeInTheDocument()
  })

  it('renders all sections together smoothly on initial load without layout pop-in', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )

    // All core landing page sections must be present in the initial DOM tree together
    expect(screen.getByRole('banner')).toBeInTheDocument() // Header
    expect(screen.getByText(/Empowering Concepts/i)).toBeInTheDocument() // Hero
    expect(screen.getByText(/Running Batches/i)).toBeInTheDocument() // Running Batches
    expect(screen.getByText(/Live & Recorded Classes/i)).toBeInTheDocument() // Trust Strip
    expect(screen.getByText(/All lectures/i)).toBeInTheDocument() // All Lectures
  })

  it('renders BatchDetails page with modern Vercel/Mobbin layout, batch selector, and free trial CTA', async () => {
    render(
      <MemoryRouter initialEntries={['/batch-details?id=batch-1']}>
        <BatchDetails />
      </MemoryRouter>
    )

    // Batch title in hero
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Class 9 Marathon' })).toBeInTheDocument()
    }, { timeout: 4000 })

    // Batch admission badge
    expect(screen.getByText(/BATCH ADMISSIONS OPEN · 2-DAY FREE TRIAL/i)).toBeInTheDocument()

    // Free trial enrollment CTA buttons
    expect(screen.getAllByText(/Enroll in this Batch/i).length).toBeGreaterThan(0)

    // Share batch button
    expect(screen.getByText(/Share Batch with Friends/i)).toBeInTheDocument()

    // Deactivated batch should NOT be visible or listed in the selector
    expect(screen.queryByText('Class 10 Deactivated')).not.toBeInTheDocument()
  })

  it('does not display deactivated batches when accessed directly via URL parameters', async () => {
    render(
      <MemoryRouter initialEntries={['/batch-details?id=batch-2']}>
        <BatchDetails />
      </MemoryRouter>
    )

    // Should fall back to available active batch and not render deactivated batch
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Class 10 Deactivated' })).not.toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Class 9 Marathon' })).toBeInTheDocument()
    })
  })

  it('renders hero dot indicators without hardcoded image text and auto-resets disturbed state on scroll', async () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )

    // The selection dock must have tab role indicators (dots) and NO bulky button labels like '✦ Einstein'
    const dotDocks = screen.getAllByRole('tablist', { name: /Hero showcase cards/i })
    expect(dotDocks.length).toBeGreaterThan(0)

    // Verify that the old text buttons are NOT in the selection bar
    expect(screen.queryByText('✦ Einstein')).not.toBeInTheDocument()
    expect(screen.queryByText('⚛ Graviton')).not.toBeInTheDocument()
    expect(screen.queryByText('⚡ Feynman')).not.toBeInTheDocument()

    // Query dot buttons
    const dotButtons = screen.getAllByRole('tab')
    expect(dotButtons.length).toBeGreaterThanOrEqual(3)

    // Initially, the middle dot (index 1 / Graviton Institute) is selected
    const initialActive = dotButtons.filter(b => b.getAttribute('aria-selected') === 'true')
    expect(initialActive.length).toBeGreaterThan(0)
    expect(initialActive[0].getAttribute('aria-label')).toMatch(/Graviton Institute/i)

    // User disturbs state by clicking card 1 (dot 0)
    fireEvent.click(dotButtons[0])
    expect(dotButtons[0].getAttribute('aria-selected')).toBe('true')

    // Simulate page scroll
    window.scrollY = 100
    fireEvent.scroll(window)

    // Should automatically reset back to initial state (Graviton Institute)
    await waitFor(() => {
      const resetActive = screen.getAllByRole('tab').filter(b => b.getAttribute('aria-selected') === 'true')
      expect(resetActive[0].getAttribute('aria-label')).toMatch(/Graviton Institute/i)
    })
  })

  it('automatically resets disturbed hero cards back to initial state after inactivity', async () => {
    vi.useFakeTimers()
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )

    const dotButtons = screen.getAllByRole('tab')
    // Click dot 2 (Card 3)
    fireEvent.click(dotButtons[2])
    expect(dotButtons[2].getAttribute('aria-selected')).toBe('true')

    // Advance time past the 4.5s inactivity threshold inside act
    act(() => {
      vi.advanceTimersByTime(5000)
    })

    // Should automatically reset back to Graviton Institute
    const activeDots = screen.getAllByRole('tab').filter(b => b.getAttribute('aria-selected') === 'true')
    expect(activeDots[0].getAttribute('aria-label')).toMatch(/Graviton Institute/i)

    vi.useRealTimers()
  })

  it('renders All lectures section with landmark academic wrapper, grand header, and auto-balancing symmetrical layout', async () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )

    // Academic vault badge and grand header
    expect(screen.getByText(/Academic Curriculum & Lectures/i)).toBeInTheDocument()
    expect(screen.getByText(/All lectures/i)).toBeInTheDocument()
    expect(screen.getByText(/Curated Lessons/i)).toBeInTheDocument()

    // Symmetrical flex container with justify-center exists
    const allLecturesHeading = screen.getByText(/All lectures/i)
    const section = allLecturesHeading.closest('section')
    expect(section).toBeInTheDocument()
    // Verify auto-balancing flex container with centered justification
    const flexGrid = section.querySelector('.flex.flex-wrap.justify-center')
    expect(flexGrid).toBeInTheDocument()
  })
})
