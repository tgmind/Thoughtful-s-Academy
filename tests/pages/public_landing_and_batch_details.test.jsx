import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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
    expect(screen.getAllByText(/Thoughtful's/i).length).toBeGreaterThan(0)

    // The hero emblem should render Academy brand text
    expect(screen.getByText(/Center for Science & Mathematics/i)).toBeInTheDocument()

    // Must NOT render old personal image or founder photo
    expect(screen.queryByAltText(/Founder/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Subodh Verma/i)).not.toBeInTheDocument()

    // Running Batches section must be present
    await waitFor(() => {
      expect(screen.getByText(/Running Batches/i)).toBeInTheDocument()
    })

    // "What's on" notification card must be present
    expect(screen.getAllByText(/What's on/i).length).toBeGreaterThan(0)

    await waitFor(() => {
      expect(screen.getByText(/Featured lectures/i)).toBeInTheDocument()
    }, { timeout: 3000 })

    // All lectures section should be rendered
    expect(screen.getByText(/All lectures/i)).toBeInTheDocument()
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
})
