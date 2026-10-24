import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import TeacherStudySection from '../../src/pages/teacher/StudySection'

let mockStudyCards = []
let mockChapters = []
let mockBatches = []
let mockAuthState = {}

function createChainableQueryBuilder(getTableData) {
  const handler = {
    get(target, prop) {
      if (prop === 'then') {
        return (resolve) => {
          const res = typeof getTableData === 'function' ? getTableData() : getTableData
          return Promise.resolve({ data: res, error: null }).then(resolve)
        }
      }
      if (prop === 'catch') {
        return (reject) => Promise.resolve({ data: [], error: null }).catch(reject)
      }
      if (prop === 'maybeSingle' || prop === 'single') {
        return vi.fn().mockImplementation(() => {
          const res = typeof getTableData === 'function' ? getTableData() : getTableData
          return Promise.resolve({ data: Array.isArray(res) ? (res[0] || null) : (res || null), error: null })
        })
      }
      return vi.fn(() => new Proxy(target, handler))
    },
  }
  return new Proxy({}, handler)
}

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: vi.fn((table) => {
      if (table === 'batches') {
        return createChainableQueryBuilder(() => mockBatches)
      }
      if (table === 'study_cards') {
        return createChainableQueryBuilder(() => mockStudyCards)
      }
      if (table === 'chapters') {
        return createChainableQueryBuilder(() => mockChapters)
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

vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => mockAuthState,
}))

vi.mock('../../src/lib/activityLogger', () => ({
  logActivity: vi.fn(),
}))

describe('Teacher/Admin StudySection Mobile Layout & Clipping Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthState = {
      user: { id: 'admin-1', email: 'admin@thoughtful.edu' },
      profile: { id: 'admin-1', full_name: 'Super Admin', role: 'admin' },
      loading: false,
    }
    mockBatches = [
      {
        id: 'batch-9',
        name: 'Class 9 Marathon',
        subjects: ['Physics', 'Chemistry', 'Maths', 'Biology', 'English'],
        teacher_ids: ['admin-1'],
        is_active: true,
      },
    ]
    mockChapters = []
    mockStudyCards = [
      { id: 'c-1', title: 'Newton Laws', subject: 'Physics', card_type: 'notes', batch_ids: ['batch-9'] },
      { id: 'c-2', title: 'Equations', subject: 'Maths', card_type: 'notes', batch_ids: ['batch-9'] },
      { id: 'c-3', title: 'Grammar', subject: 'English', card_type: 'notes', batch_ids: ['batch-9'] },
      { id: 'c-4', title: 'Poem', subject: 'English', card_type: 'notes', batch_ids: ['batch-9'] },
    ]
  })

  it('renders root container without nested scroll trap overflow-x-hidden and with balanced bottom padding', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/admin/study?batch=batch-9']}>
        <TeacherStudySection isAdmin={true} />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Class 9 Marathon')).toBeInTheDocument()
    })

    const rootContainer = container.querySelector('.space-y-4')
    expect(rootContainer).toBeInTheDocument()
    expect(rootContainer.className).not.toContain('overflow-x-hidden')
    expect(rootContainer.className).toContain('pb-28')
  })

  it('renders odd 5th subject card with col-span-2 spanning on mobile to prevent clipping and empty voids', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/study?batch=batch-9']}>
        <TeacherStudySection isAdmin={true} />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Class 9 Marathon Subjects/i)).toBeInTheDocument()
    })

    // 5 subjects: Physics, Chemistry, Maths, Biology, English
    expect(screen.getByText('Physics')).toBeInTheDocument()
    expect(screen.getByText('Chemistry')).toBeInTheDocument()
    expect(screen.getByText('Maths')).toBeInTheDocument()
    expect(screen.getByText('Biology')).toBeInTheDocument()

    // English is the 5th subject: its button has col-span-2 sm:col-span-1
    const englishHeadings = screen.getAllByText('English')
    expect(englishHeadings.length).toBeGreaterThan(0)
    const englishButton = englishHeadings[0].closest('button')
    expect(englishButton).toBeInTheDocument()
    expect(englishButton.className).toContain('col-span-2')
    expect(englishButton.className).toContain('sm:col-span-1')
  })
})
