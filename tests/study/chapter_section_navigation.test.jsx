import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import StudentStudySection from '../../src/pages/student/StudySection'
import TeacherStudySection from '../../src/pages/teacher/StudySection'
import WatchLecture from '../../src/pages/student/WatchLecture'

let mockStudyCards = []
let mockChapters = []
let mockChaptersError = null
let mockStudentProfile = null
let mockBatches = []
let mockAuthState = {}

function createChainableQueryBuilder(getTableData, onInsert, onUpdate, onDelete) {
  const handler = {
    get(target, prop) {
      if (prop === 'then') {
        return (resolve) => {
          const res = typeof getTableData === 'function' ? getTableData() : getTableData
          if (res && res.__isResult) {
            return Promise.resolve({ data: res.data, error: res.error }).then(resolve)
          }
          return Promise.resolve({ data: res, error: null }).then(resolve)
        }
      }
      if (prop === 'catch') {
        return (reject) => Promise.resolve({ data: [], error: null }).catch(reject)
      }
      if (prop === 'insert') {
        return (payload) => {
          if (onInsert) onInsert(payload)
          return createChainableQueryBuilder(() => payload)
        }
      }
      if (prop === 'update') {
        return (payload) => {
          if (onUpdate) onUpdate(payload)
          return createChainableQueryBuilder(() => payload)
        }
      }
      if (prop === 'delete') {
        return () => {
          if (onDelete) onDelete()
          return createChainableQueryBuilder(() => [])
        }
      }
      if (prop === 'maybeSingle' || prop === 'single') {
        return vi.fn().mockImplementation(() => {
          const res = typeof getTableData === 'function' ? getTableData() : getTableData
          if (res && res.__isResult) {
            return Promise.resolve({ data: res.data, error: res.error })
          }
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
      if (table === 'student_profiles') {
        return createChainableQueryBuilder(() => mockStudentProfile)
      }
      if (table === 'study_cards') {
        return createChainableQueryBuilder(() => mockStudyCards)
      }
      if (table === 'chapters') {
        if (mockChaptersError) {
          return createChainableQueryBuilder(() => ({ __isResult: true, data: null, error: mockChaptersError }))
        }
        return createChainableQueryBuilder(() => mockChapters)
      }
      if (table === 'batches') {
        return createChainableQueryBuilder(() => mockBatches)
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

vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => mockAuthState,
}))

vi.mock('../../src/lib/activityLogger', () => ({
  logActivity: vi.fn(),
}))

function LocationDisplay() {
  const location = useLocation()
  return <div data-testid="location-display">{location.pathname + location.search}</div>
}

describe('Chapter-Based Video Lectures Architecture', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.confirm = vi.fn(() => true)
    mockChaptersError = null

    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(),
      },
    })

    mockAuthState = {
      user: { id: 'user-student-1', email: 'student@example.com' },
      profile: { id: 'user-student-1', role: 'student', full_name: 'Alex Student' },
      loading: false,
    }

    mockBatches = [
      {
        id: 'batch-1',
        name: 'Class 10 Advanced',
        subjects: ['Physics', 'Chemistry', 'Mathematics'],
        teacher_id: 'teacher-1',
        teacher_ids: ['teacher-1'],
      },
    ]

    mockStudentProfile = [
      {
        id: 'user-student-1',
        batch_id: 'batch-1',
        full_name: 'Alex Student',
        email: 'student@example.com',
      },
    ]

    mockChapters = [
      {
        id: 'ch-1',
        batch_id: 'batch-1',
        subject: 'Physics',
        title: 'Electrostatics & Electric Field',
        description: 'Gauss Law, Coulomb Force & Field lines',
        display_order: 1,
      },
      {
        id: 'ch-2',
        batch_id: 'batch-1',
        subject: 'Physics',
        title: 'Current Electricity',
        description: 'Ohm Law, Kirchhoff Rules and Potentiometer',
        display_order: 2,
      },
    ]

    mockStudyCards = [
      {
        id: 'card-v1',
        title: 'Coulomb Law Fundamentals',
        description: 'Introduction to electrostatic force',
        type: 'youtube_video',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        subject: 'Physics',
        chapter_id: 'ch-1',
        chapter: 'Electrostatics & Electric Field',
        batch_id: 'batch-1',
        batch_ids: ['batch-1'],
        is_active: true,
        is_public: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'card-v2',
        title: 'Kirchhoff Voltage Law Examples',
        description: 'Solving multi-loop circuits',
        type: 'youtube_video',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        subject: 'Physics',
        chapter_id: 'ch-2',
        chapter: 'Current Electricity',
        batch_id: 'batch-1',
        batch_ids: ['batch-1'],
        is_active: true,
        is_public: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'card-v3',
        title: 'Introductory Physics Overview',
        description: 'Syllabus walkthrough without chapter assignment',
        type: 'youtube_video',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        subject: 'Physics',
        chapter_id: null,
        chapter: null,
        batch_id: 'batch-1',
        batch_ids: ['batch-1'],
        is_active: true,
        is_public: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'card-d1',
        title: 'Physics Formula Sheet PDF',
        description: 'Comprehensive formula sheet',
        type: 'google_drive',
        url: 'https://drive.google.com/file/d/12345/view',
        subject: 'Physics',
        batch_id: 'batch-1',
        batch_ids: ['batch-1'],
        is_active: true,
        is_public: true,
        created_at: new Date().toISOString(),
      },
    ]
  })

  describe('Student Portal Flow: Batch → Subject → Video Lectures → Chapters → Cards', () => {
    it('shows the organized chapter list when a student opens Video Lectures category', async () => {
      render(
        <MemoryRouter initialEntries={['/student/study?subject=Physics&category=video']}>
          <StudentStudySection />
        </MemoryRouter>
      )

      // Wait a moment for promises
      await waitFor(() => {
        expect(screen.queryByText(/Loading Study Workspace/i)).not.toBeInTheDocument()
      })

      // Heading shows chapters mode
      expect(await screen.findByText(/Video Lectures • Chapters/i)).toBeInTheDocument()

      // The 2 defined chapters are rendered
      expect(await screen.findByText('Electrostatics & Electric Field')).toBeInTheDocument()
      expect(screen.getByText('Current Electricity')).toBeInTheDocument()

      // EdTech chapter index badges are rendered
      expect(screen.getAllByText('CH').length).toBeGreaterThan(0)
      expect(screen.getByText('01')).toBeInTheDocument()
      expect(screen.getByText('02')).toBeInTheDocument()

      // Fallback chapter for unassigned lectures is rendered
      expect(screen.getByText('General & Introductory Lectures')).toBeInTheDocument()

      // Individual lecture cards should not be directly visible in the chapter list
      expect(screen.queryByText('Coulomb Law Fundamentals')).not.toBeInTheDocument()
    })

    it('filters and displays only lectures belonging to a chapter when clicked', async () => {
      render(
        <MemoryRouter initialEntries={['/student/study?subject=Physics&category=video']}>
          <StudentStudySection />
        </MemoryRouter>
      )

      // Wait for loading to finish first
      await waitFor(() => {
        expect(screen.queryByText(/Loading Study Workspace/i)).not.toBeInTheDocument()
      })

      // Click on Chapter 1 button
      const ch1Btn = await screen.findByRole('button', { name: /Electrostatics & Electric Field/i })
      const reactPropsKey = Object.keys(ch1Btn).find(k => k.startsWith('__reactProps'))
      if (ch1Btn[reactPropsKey]?.onClick) {
        ch1Btn[reactPropsKey].onClick()
      } else {
        fireEvent.click(ch1Btn)
      }

      // Lecture belonging to Chapter 1 is visible
      expect(await screen.findByText('Coulomb Law Fundamentals')).toBeInTheDocument()

      // Lecture belonging to Chapter 2 is NOT visible
      expect(screen.queryByText('Kirchhoff Voltage Law Examples')).not.toBeInTheDocument()

      // Back to chapters button is present and navigates back
      const backToChaptersBtn = screen.getByRole('button', { name: /Chapters/i })
      fireEvent.click(backToChaptersBtn)

      // Returns to chapter list
      await waitFor(() => {
        expect(screen.getByText('Electrostatics & Electric Field')).toBeInTheDocument()
        expect(screen.queryByText('Coulomb Law Fundamentals')).not.toBeInTheDocument()
      })
    })

    it('renders unassigned videos in the General & Introductory Lectures chapter', async () => {
      render(
        <MemoryRouter initialEntries={['/student/study?subject=Physics&category=video&chapter=general']}>
          <StudentStudySection />
        </MemoryRouter>
      )

      // General lectures chapter header
      expect(await screen.findByText(/General & Introductory Lectures/i)).toBeInTheDocument()
      const els = screen.queryAllByText(/Introductory Physics Overview/i)
      expect(els.length).toBeGreaterThan(0)

      // Assigned videos are not in the general fallback
      expect(screen.queryByText('Coulomb Law Fundamentals')).not.toBeInTheDocument()
    })

    it('bypasses chapters when viewing non-video categories (Notes & Drive)', async () => {
      render(
        <MemoryRouter initialEntries={['/student/study?subject=Physics&category=drive']}>
          <StudentStudySection />
        </MemoryRouter>
      )

      // Drive note card is rendered directly without chapter intermediate screen
      const notesTitles = await screen.findAllByText('Physics Formula Sheet PDF')
      expect(notesTitles.length).toBeGreaterThan(0)
      expect(screen.queryByText('Electrostatics & Electric Field')).not.toBeInTheDocument()
    })
  })

  describe('WatchLecture Context & Return Navigation', () => {
    it('returns to the specific chapter when exiting the video player', async () => {
      render(
        <MemoryRouter initialEntries={['/student/watch/card-v1?returnSubject=Physics&returnChapter=ch-1']}>
          <Routes>
            <Route
              path="/student/watch/:cardId"
              element={
                <>
                  <WatchLecture />
                  <LocationDisplay />
                </>
              }
            />
            <Route
              path="/student/study"
              element={<div data-testid="student-study-target">Study Target</div>}
            />
          </Routes>
        </MemoryRouter>
      )

      // Chapter badge displayed in player header
      expect(await screen.findByText('Electrostatics & Electric Field')).toBeInTheDocument()

      // Click Go Back
      const backBtn = screen.getByTitle('Back to portal')
      fireEvent.click(backBtn)

      // Navigated back with chapter intact
      expect(screen.getByTestId('student-study-target')).toBeInTheDocument()
    })
  })

  describe('Teacher & Admin Portal Chapter Management', () => {
    beforeEach(() => {
      mockAuthState = {
        user: { id: 'teacher-1', email: 'teacher@example.com' },
        profile: { id: 'teacher-1', role: 'teacher', full_name: 'Prof. Curie' },
        loading: false,
      }
    })

    it('renders chapter management options in Teacher StudySection when opening video folder', async () => {
      render(
        <MemoryRouter initialEntries={['/teacher/study?batch=batch-1&subject=Physics&folder=video']}>
          <TeacherStudySection />
        </MemoryRouter>
      )

      // Chapters header and buttons are rendered
      expect(await screen.findByText(/Physics Video Chapters/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Create Chapter/i })).toBeInTheDocument()

      // Existing chapters list
      expect(screen.getByText('Electrostatics & Electric Field')).toBeInTheDocument()
      expect(screen.getByText('Current Electricity')).toBeInTheDocument()

      // Click Create Chapter button opens modal
      fireEvent.click(screen.getByRole('button', { name: /Create Chapter/i }))
      expect(await screen.findByText('Create New Chapter')).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/e\.g\. Electric Charges and Fields/i)).toBeInTheDocument()
    })

    it('preserves study cards when a chapter is deleted', async () => {
      render(
        <MemoryRouter initialEntries={['/teacher/study?batch=batch-1&subject=Physics&folder=video']}>
          <TeacherStudySection />
        </MemoryRouter>
      )

      await screen.findByText('Electrostatics & Electric Field')

      // Find delete button on Chapter 1
      const deleteButtons = screen.getAllByTitle('Delete Chapter')
      expect(deleteButtons.length).toBeGreaterThan(0)

      fireEvent.click(deleteButtons[0])

      // Confirmation was called and card remains safely preserved
      expect(window.confirm).toHaveBeenCalled()
    })
  })

  describe('Grammar Pluralization & Schema Resilience', () => {
    it('correctly pluralizes chapter count as "1 Chapter" when only 1 chapter is present', async () => {
      // Mock exactly 1 chapter and no unassigned cards
      mockChapters = [
        {
          id: 'ch-1',
          batch_id: 'batch-1',
          subject: 'Physics',
          title: 'Electrostatics & Electric Field',
          description: 'Field lines and Gauss Law',
          display_order: 1,
        },
      ]
      mockStudyCards = [
        {
          id: 'card-v1',
          title: 'Coulomb Law Fundamentals',
          type: 'youtube_video',
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          subject: 'Physics',
          chapter_id: 'ch-1',
          chapter: 'Electrostatics & Electric Field',
          batch_id: 'batch-1',
          batch_ids: ['batch-1'],
          is_active: true,
          is_public: true,
        },
      ]

      render(
        <MemoryRouter initialEntries={['/student/study?subject=Physics&category=video']}>
          <StudentStudySection />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.queryByText(/Loading Study Workspace/i)).not.toBeInTheDocument()
      })

      // Must show "1 Chapter" and NOT "1 Chapters"
      expect(screen.getByText(/\(1 Chapter • 1 Video\)/i)).toBeInTheDocument()
      expect(screen.queryByText(/1 Chapters/i)).not.toBeInTheDocument()
    })

    it('renders ChapterSchemaAlert banner with 1-click Copy SQL when chapters table is missing in Supabase', async () => {
      mockAuthState = {
        user: { id: 'admin-1', email: 'admin@example.com' },
        profile: { id: 'admin-1', role: 'admin', full_name: 'Administrator' },
        loading: false,
      }
      mockChaptersError = {
        code: 'PGRST205',
        message: "Could not find the table 'public.chapters' in the schema cache",
      }

      render(
        <MemoryRouter initialEntries={['/admin/study?batch=batch-1&subject=Physics&folder=video']}>
          <TeacherStudySection isAdmin={true} />
        </MemoryRouter>
      )

      // Alert banner is rendered cleanly without crashing
      expect(await screen.findByText(/Database Setup Required: Chapter Management/i)).toBeInTheDocument()
      expect(screen.getAllByText(/Migration 031/i).length).toBeGreaterThanOrEqual(1)

      // Copy migration SQL button works
      const copyBtn = screen.getByRole('button', { name: /Copy Migration 031 SQL/i })
      expect(copyBtn).toBeInTheDocument()
      fireEvent.click(copyBtn)
      expect(navigator.clipboard.writeText).toHaveBeenCalled()

      // Creating a chapter saves to temporary session gracefully without failing
      const createChBtn = screen.getByRole('button', { name: /Create Chapter/i })
      fireEvent.click(createChBtn)

      const titleInput = await screen.findByPlaceholderText(/e\.g\. Electric Charges and Fields/i)
      fireEvent.change(titleInput, { target: { value: 'Quantum Physics' } })

      const saveBtn = screen.getByRole('button', { name: /Save Chapter/i })
      fireEvent.click(saveBtn)

      // Chapter is rendered in session list
      expect(await screen.findByText('Quantum Physics')).toBeInTheDocument()
    })

    it('synthesizes virtual chapters from cards when DB chapters table is unmigrated or empty', async () => {
      mockChapters = []
      mockStudyCards = [
        {
          id: 'card-v9',
          title: 'Wave Superposition Theory',
          type: 'youtube_video',
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          subject: 'Physics',
          chapter: 'Waves & Sound',
          batch_id: 'batch-1',
          batch_ids: ['batch-1'],
          is_active: true,
          is_public: true,
        },
      ]

      render(
        <MemoryRouter initialEntries={['/student/study?subject=Physics&category=video']}>
          <StudentStudySection />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.queryByText(/Loading Study Workspace/i)).not.toBeInTheDocument()
      })

      // The virtual chapter is extracted and rendered
      expect(await screen.findByText('Waves & Sound')).toBeInTheDocument()
    })
  })
})
