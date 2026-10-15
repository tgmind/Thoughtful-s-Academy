import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import StudySection from '../../src/pages/student/StudySection'

let mockStudyCards = []
let mockStudentProfile = null

function createChainableQueryBuilder(getTableData) {
  const handler = {
    get(target, prop) {
      if (prop === 'then') {
        return (resolve) => {
          const data = typeof getTableData === 'function' ? getTableData() : getTableData
          return Promise.resolve({ data, error: null }).then(resolve)
        }
      }
      if (prop === 'catch') {
        return (reject) => Promise.resolve({ data: [], error: null }).catch(reject)
      }
      if (prop === 'maybeSingle' || prop === 'single') {
        return vi.fn().mockImplementation(() => {
          const data = typeof getTableData === 'function' ? getTableData() : getTableData
          return Promise.resolve({ data: data?.[0] || data || null, error: null })
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
      if (table === 'student_profiles') {
        return createChainableQueryBuilder(() => mockStudentProfile)
      }
      if (table === 'study_cards') {
        return createChainableQueryBuilder(() => mockStudyCards)
      }
      if (table === 'student_bookmarks') {
        return createChainableQueryBuilder(() => [])
      }
      if (table === 'live_classes') {
        return createChainableQueryBuilder(() => [])
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

const mockAuthState = {
  user: { id: 'student-uuid-1', email: 'student@example.com' },
  profile: { id: 'student-uuid-1', role: 'student', full_name: 'Test Student' },
  loading: false,
}

vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => mockAuthState,
}))

describe('Free Library Audit: Public and Enrolled Batch Filtering', () => {
  const BATCH_CLASS_9 = 'batch-class-9'
  const BATCH_OTHERS = 'batch-others'

  beforeEach(() => {
    vi.clearAllMocks()

    mockStudentProfile = {
      id: 'student-uuid-1',
      batch_id: BATCH_CLASS_9,
      subjects: ['Physics', 'Chemistry', 'Maths'],
      batches: { name: 'Class 9 Marathon' },
    }

    mockStudyCards = [
      {
        id: 'card-1',
        title: 'Class 9 Public Demo Lecture',
        subject: 'Physics',
        type: 'youtube_video',
        is_public: true,
        is_active: true,
        batch_id: BATCH_CLASS_9,
        batch_ids: [BATCH_CLASS_9],
        display_order: 1,
      },
      {
        id: 'card-2',
        title: 'Class 9 Public Chapter Notes',
        subject: 'Physics',
        type: 'google_drive',
        is_public: true,
        is_active: true,
        batch_id: BATCH_CLASS_9,
        batch_ids: [BATCH_CLASS_9],
        display_order: 2,
      },
      {
        id: 'card-3',
        title: 'Sigma Web Development Course', // From user screenshot: private card
        subject: 'Physics',
        type: 'youtube_playlist',
        is_public: false, // PRIVATE TO ENROLLED BATCH!
        is_active: true,
        batch_id: BATCH_CLASS_9,
        batch_ids: [BATCH_CLASS_9],
        display_order: 3,
      },
      {
        id: 'card-4',
        title: 'Advanced Private Electromagnetism',
        subject: 'Physics',
        type: 'youtube_video',
        is_public: false, // PRIVATE TO ENROLLED BATCH!
        is_active: true,
        batch_id: BATCH_CLASS_9,
        batch_ids: [BATCH_CLASS_9],
        display_order: 4,
      },
      {
        id: 'card-5',
        title: 'R Shankar (Other Batch Public Lecture)',
        subject: 'Others',
        type: 'youtube_playlist',
        is_public: true, // PUBLIC BUT FOR DIFFERENT BATCH!
        is_active: true,
        batch_id: BATCH_OTHERS,
        batch_ids: [BATCH_OTHERS],
        display_order: 5,
      },
      {
        id: 'card-6',
        title: 'Salim Sir Physics (Other Batch Public Lecture)',
        subject: 'Others',
        type: 'youtube_video',
        is_public: true, // PUBLIC BUT FOR DIFFERENT BATCH!
        is_active: true,
        batch_id: BATCH_OTHERS,
        batch_ids: [BATCH_OTHERS],
        display_order: 6,
      },
    ]
  })

  it('Free Library strictly excludes private cards (is_public: false) belonging to the batch', async () => {
    render(
      <MemoryRouter initialEntries={['/student/study']}>
        <StudySection />
      </MemoryRouter>
    )

    // Click the Free Library tab
    const freeLibraryBtn = await screen.findByRole('button', { name: /Free Library/i })
    fireEvent.click(freeLibraryBtn)

    // Wait for Free Library header to display
    expect(await screen.findByText('Free Library & Public Content')).toBeInTheDocument()

    // 1. Must render public cards belonging to Class 9 Marathon
    expect(screen.getAllByText('Class 9 Public Demo Lecture').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Class 9 Public Chapter Notes').length).toBeGreaterThan(0)

    // 2. MUST NEVER render private cards even if enrolled in Class 9 Marathon
    expect(screen.queryByText('Sigma Web Development Course')).not.toBeInTheDocument()
    expect(screen.queryByText('Advanced Private Electromagnetism')).not.toBeInTheDocument()

    // 3. MUST NEVER render cards from other batches
    expect(screen.queryByText('R Shankar (Other Batch Public Lecture)')).not.toBeInTheDocument()
    expect(screen.queryByText('Salim Sir Physics (Other Batch Public Lecture)')).not.toBeInTheDocument()

    // 4. Item counter must accurately report 2 available public cards for Class 9 Marathon
    expect(screen.getByText(/2 items available/)).toBeInTheDocument()
  })

  it('My Batch tab shows the complete enrolled curriculum (both public and private cards)', async () => {
    render(
      <MemoryRouter initialEntries={['/student/study']}>
        <StudySection />
      </MemoryRouter>
    )

    // In My Batch tab, click Physics subject workspace
    const physicsCard = await screen.findByRole('button', { name: /Physics/i })
    fireEvent.click(physicsCard)

    // Click 'Videos' category to see chapters
    const videosCategory = await screen.findByRole('button', { name: /Video Lectures/i })
    fireEvent.click(videosCategory)

    // In the new chapter architecture, open the general chapter containing unassigned batch lectures
    const generalChapter = await screen.findByText(/General & Introductory Lectures/i)
    const chBtn = generalChapter.closest('button')
    const reactPropsKey = Object.keys(chBtn).find(k => k.startsWith('__reactProps'))
    if (chBtn[reactPropsKey]?.onClick) {
      chBtn[reactPropsKey].onClick()
    } else {
      fireEvent.click(chBtn)
    }

    // In My Batch curriculum, all 3 Physics video/playlist cards (both public demo and private courses) must be present
    expect(await screen.findByText('Class 9 Public Demo Lecture')).toBeInTheDocument()
    expect(screen.getByText('Sigma Web Development Course')).toBeInTheDocument()
    expect(screen.getByText('Advanced Private Electromagnetism')).toBeInTheDocument()

    // Other batch cards must still be excluded
    expect(screen.queryByText('R Shankar (Other Batch Public Lecture)')).not.toBeInTheDocument()
  })
})
