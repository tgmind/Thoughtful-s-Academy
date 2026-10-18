import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import DashboardShell from '../../src/components/layout/DashboardShell'
import StudySection from '../../src/pages/student/StudySection'
import TeacherStudySection from '../../src/pages/teacher/StudySection'

// Test helpers and mocks
let mockStudyCards = []
let mockStudentProfile = null
let mockBatches = []
let mockChapters = []

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
      if (table === 'batches') {
        return createChainableQueryBuilder(() => mockBatches)
      }
      if (table === 'chapters') {
        return createChainableQueryBuilder(() => mockChapters)
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

let mockAuthState = {
  user: { id: 'student-uuid-1', email: 'student@example.com' },
  profile: { id: 'student-uuid-1', role: 'student', full_name: 'Test Student' },
  loading: false,
  signOut: vi.fn(),
}

vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => mockAuthState,
}))

vi.mock('../../src/hooks/useNavBadges', () => ({
  useNavBadges: () => ({}),
}))

vi.mock('../../src/components/shared/EnablePushBanner', () => ({
  default: () => null,
}))

vi.mock('../../src/components/shared/NotificationPopup', () => ({
  default: () => null,
}))

const MOCK_NAV_ITEMS = [
  { path: '/student/home', label: 'Home', icon: <span data-testid="icon-home">HomeIcon</span> },
  { path: '/student/study', label: 'Study Hub', icon: <span data-testid="icon-study">StudyIcon</span> },
  { path: '/student/attendance', label: 'Attendance', icon: <span data-testid="icon-att">AttIcon</span> },
  { path: '/student/doubts', label: 'Ask Doubts', icon: <span data-testid="icon-doubts">DoubtsIcon</span> },
]

// Location inspector component for routing tests
function LocationDisplay() {
  const location = useLocation()
  return <div data-testid="location-display">{location.pathname + location.search}</div>
}

describe('Global Search Integration — DashboardShell.jsx', () => {
  const BATCH_ID = 'batch-class-9'

  beforeEach(() => {
    vi.clearAllMocks()

    globalThis.localStorage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    }

    mockAuthState = {
      user: { id: 'student-uuid-1', email: 'student@example.com' },
      profile: { id: 'student-uuid-1', role: 'student', full_name: 'Student User' },
      loading: false,
      signOut: vi.fn(),
    }

    mockStudentProfile = {
      id: 'student-uuid-1',
      batch_id: BATCH_ID,
      subjects: ['Physics', 'Chemistry', 'Mathematics'],
      batches: { name: 'Class 9 Marathon' },
    }

    mockStudyCards = [
      {
        id: 'card-1',
        title: 'Newton Laws of Motion Lecture',
        subject: 'Physics',
        type: 'youtube_video',
        is_public: true,
        is_active: true,
        batch_id: BATCH_ID,
        batch_ids: [BATCH_ID],
      },
      {
        id: 'card-2',
        title: 'Chemical Reactions and Equations Notes',
        subject: 'Chemistry',
        type: 'google_drive',
        is_public: true,
        is_active: true,
        batch_id: BATCH_ID,
        batch_ids: [BATCH_ID],
      },
      {
        id: 'card-3',
        title: 'Sigma Web Development Course',
        subject: 'Physics',
        type: 'youtube_playlist',
        is_public: false,
        is_active: true,
        batch_id: BATCH_ID,
        batch_ids: [BATCH_ID],
      },
    ]
  })

  it('renders search button with tooltip "Global Search (⌘K / Ctrl+K)" and opens on click', async () => {
    render(
      <MemoryRouter initialEntries={['/student/home']}>
        <DashboardShell navItems={MOCK_NAV_ITEMS} pageTitle="Student Portal" />
        <LocationDisplay />
      </MemoryRouter>
    )

    const searchBtn = screen.getByRole('button', { name: /Global Search \(⌘K \/ Ctrl\+K\)/i })
    expect(searchBtn).toBeInTheDocument()
    expect(searchBtn).toHaveAttribute('title', 'Global Search (⌘K / Ctrl+K)')

    fireEvent.click(searchBtn)

    expect(await screen.findByPlaceholderText(/Search modules, subjects, lectures, or notes/i)).toBeInTheDocument()
  })

  it('opens Global Search via keyboard shortcut ⌘K / Ctrl+K', async () => {
    render(
      <MemoryRouter initialEntries={['/student/home']}>
        <DashboardShell navItems={MOCK_NAV_ITEMS} pageTitle="Student Portal" />
      </MemoryRouter>
    )

    fireEvent.keyDown(window, { key: 'k', metaKey: true })
    expect(await screen.findByPlaceholderText(/Search modules, subjects, lectures, or notes/i)).toBeInTheDocument()

    // ESC to close
    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/Search modules, subjects, lectures, or notes/i)).not.toBeInTheDocument()
    })
  })

  it('groups results into Portal Modules & Pages, Subject Workspaces, Lectures & Study Materials, and Quick Actions', async () => {
    render(
      <MemoryRouter initialEntries={['/student/home']}>
        <DashboardShell navItems={MOCK_NAV_ITEMS} pageTitle="Student Portal" />
      </MemoryRouter>
    )

    // Open search
    fireEvent.click(screen.getByRole('button', { name: /Global Search \(⌘K \/ Ctrl\+K\)/i }))
    const input = await screen.findByPlaceholderText(/Search modules, subjects, lectures, or notes/i)

    // Type "chem"
    fireEvent.change(input, { target: { value: 'chem' } })

    // Category 2: Subject Workspaces
    expect(await screen.findByText('Subject Workspaces')).toBeInTheDocument()
    expect(screen.getByText('Chemistry Workspace')).toBeInTheDocument()

    // Category 3: Lectures & Study Materials
    expect(screen.getByText('Lectures & Study Materials')).toBeInTheDocument()
    expect(screen.getByText('Chemical Reactions and Equations Notes')).toBeInTheDocument()

    // Category 4: Quick Actions
    expect(screen.getByText('Quick Actions')).toBeInTheDocument()
    expect(screen.getByText(/Filter Study Hub for "chem"/i)).toBeInTheDocument()
  })

  it('navigates to the correct destinations when search items are selected', async () => {
    render(
      <MemoryRouter initialEntries={['/student/home']}>
        <DashboardShell navItems={MOCK_NAV_ITEMS} pageTitle="Student Portal" />
        <LocationDisplay />
      </MemoryRouter>
    )

    // 1. Module navigation
    fireEvent.click(screen.getByRole('button', { name: /Global Search \(⌘K \/ Ctrl\+K\)/i }))
    const input = await screen.findByPlaceholderText(/Search modules, subjects, lectures, or notes/i)
    fireEvent.change(input, { target: { value: 'Study Hub' } })
    const studyHubOptions = await screen.findAllByText('Study Hub')
    // Click the option inside the command palette (last rendered)
    fireEvent.click(studyHubOptions[studyHubOptions.length - 1])
    expect(screen.getByTestId('location-display').textContent).toBe('/student/study')

    // 2. Video Lecture navigation -> /student/watch/:id
    fireEvent.click(screen.getByRole('button', { name: /Global Search \(⌘K \/ Ctrl\+K\)/i }))
    const input2 = await screen.findByPlaceholderText(/Search modules, subjects, lectures, or notes/i)
    fireEvent.change(input2, { target: { value: 'Newton' } })
    const lectureOption = await screen.findByText('Newton Laws of Motion Lecture')
    fireEvent.click(lectureOption)
    expect(screen.getByTestId('location-display').textContent).toBe('/student/watch/card-1?returnSubject=Physics')

    // 3. Document / Notes navigation -> /student/study?subject=...&cardId=...
    fireEvent.click(screen.getByRole('button', { name: /Global Search \(⌘K \/ Ctrl\+K\)/i }))
    const input3 = await screen.findByPlaceholderText(/Search modules, subjects, lectures, or notes/i)
    fireEvent.change(input3, { target: { value: 'Chemical Reactions' } })
    const notesOption = await screen.findByText('Chemical Reactions and Equations Notes')
    fireEvent.click(notesOption)
    expect(screen.getByTestId('location-display').textContent).toBe('/student/study?subject=Chemistry&cardId=card-2')

    // 4. Quick Action navigation -> /student/study?search=...
    fireEvent.click(screen.getByRole('button', { name: /Global Search \(⌘K \/ Ctrl\+K\)/i }))
    const input4 = await screen.findByPlaceholderText(/Search modules, subjects, lectures, or notes/i)
    fireEvent.change(input4, { target: { value: 'Physics' } })
    const quickAction = await screen.findByText(/Filter Study Hub for "Physics"/i)
    fireEvent.click(quickAction)
    expect(screen.getByTestId('location-display').textContent).toBe('/student/study?search=Physics')
  })
})

describe('Study Section Refinement — StudySection.jsx', () => {
  const BATCH_ID = 'batch-class-9'

  beforeEach(() => {
    vi.clearAllMocks()

    mockStudentProfile = {
      id: 'student-uuid-1',
      batch_id: BATCH_ID,
      subjects: ['Physics', 'Chemistry', 'Mathematics'],
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
        batch_id: BATCH_ID,
        batch_ids: [BATCH_ID],
        display_order: 1,
      },
      {
        id: 'card-2',
        title: 'Class 9 Public Chapter Notes',
        subject: 'Physics',
        type: 'google_drive',
        is_public: true,
        is_active: true,
        batch_id: BATCH_ID,
        batch_ids: [BATCH_ID],
        display_order: 2,
      },
      {
        id: 'card-3',
        title: 'Sigma Web Development Course',
        subject: 'Physics',
        type: 'youtube_playlist',
        is_public: false,
        is_active: true,
        batch_id: BATCH_ID,
        batch_ids: [BATCH_ID],
        display_order: 3,
      },
    ]
  })

  it('removes the middle search input and redundant active-batch indicator card', async () => {
    render(
      <MemoryRouter initialEntries={['/student/study']}>
        <StudySection />
      </MemoryRouter>
    )

    // 1. Welcome card rendered
    expect(await screen.findByText(/Welcome, Student!/i)).toBeInTheDocument()

    // 2. Middle search bar is REMOVED
    expect(screen.queryByPlaceholderText(/Search lectures, topics, or notes/i)).not.toBeInTheDocument()

    // 3. Separate grey indicator card with "Active Batch" badge is REMOVED
    expect(screen.queryByText('Active Batch')).not.toBeInTheDocument()
  })

  it('displays the enrolled batch name prominently in the Welcome card with statistics', async () => {
    render(
      <MemoryRouter initialEntries={['/student/study']}>
        <StudySection />
      </MemoryRouter>
    )

    // Enrolled in Class 9 Marathon inside the card badge
    await screen.findByText(/Welcome, Student!/i)
    const enrolledBadge = screen.getByText(/Enrolled in/i).parentElement
    expect(enrolledBadge).toHaveTextContent('Class 9 Marathon')

    // Subject count and material count pills
    const countElements = screen.getAllByText('3')
    expect(countElements.length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Subjects')).toBeInTheDocument()
    expect(screen.getByText('Materials')).toBeInTheDocument()
  })

  it('displays only the batch name in the top horizontal filter tab without redundant "My Batch" or inner badge', async () => {
    render(
      <MemoryRouter initialEntries={['/student/study']}>
        <StudySection />
      </MemoryRouter>
    )

    // The tab button displays "Class 9 Marathon"
    const batchTabButton = await screen.findByRole('button', { name: /Class 9 Marathon/i })
    expect(batchTabButton).toBeInTheDocument()

    // The text "My Batch" is not displayed in the button when batchName is loaded
    expect(batchTabButton.textContent).toBe('Class 9 Marathon')
  })

  it('activates search filter from ?search= URL param and shows dismissible search banner', async () => {
    render(
      <MemoryRouter initialEntries={['/student/study?search=Demo']}>
        <Routes>
          <Route
            path="/student/study"
            element={
              <>
                <StudySection />
                <LocationDisplay />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    )

    // Dismissible banner displays active query
    expect(await screen.findByText(/Search filter: “Demo”/i)).toBeInTheDocument()

    // Clear Filter button exists and works
    const clearBtn = screen.getByRole('button', { name: /Clear Filter/i })
    expect(clearBtn).toBeInTheDocument()

    fireEvent.click(clearBtn)

    // After clearing, banner disappears and URL is updated
    await waitFor(() => {
      expect(screen.queryByText(/Search filter: “Demo”/i)).not.toBeInTheDocument()
      expect(screen.getByTestId('location-display').textContent).toBe('/student/study')
    })
  })

  it('in drive links thumbnail, removes "CHAPTER NOTES" and displays study card title with all other text removed', async () => {
    render(
      <MemoryRouter initialEntries={['/student/study']}>
        <StudySection />
      </MemoryRouter>
    )

    // Wait for cards to load
    await screen.findByText('Class 9 Public Demo Lecture')

    // Find the drive card container for card-2
    const driveCard = document.getElementById('card-card-2')
    expect(driveCard).toBeInTheDocument()

    // Thumbnail is the aspect-video container inside the card
    const thumbnail = driveCard.querySelector('.aspect-video')
    expect(thumbnail).toBeInTheDocument()

    // 1. "CHAPTER NOTES" text must NOT be present in thumbnail
    expect(thumbnail.textContent).not.toContain('CHAPTER NOTES')

    // 2. Subject text must NOT be present in thumbnail (removed)
    expect(thumbnail.textContent).not.toContain('Physics')

    // 3. The card title must be displayed in the thumbnail in place of CHAPTER NOTES
    expect(thumbnail.textContent).toContain('Class 9 Public Chapter Notes')
  })
})

describe('Teacher & Admin Global Search & Study Header Refinements', () => {
  const TEACHER_BATCH_ID = 'batch-teach-10'

  beforeEach(() => {
    vi.clearAllMocks()

    globalThis.localStorage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    }

    mockAuthState = {
      user: { id: 'teacher-uuid-1', email: 'teacher@example.com' },
      profile: { id: 'teacher-uuid-1', role: 'teacher', full_name: 'Teacher Jane' },
      loading: false,
      signOut: vi.fn(),
    }

    mockBatches = [
      {
        id: TEACHER_BATCH_ID,
        name: 'Class 10 Advanced Physics',
        subjects: ['Physics', 'Chemistry'],
      },
    ]

    mockChapters = [
      {
        id: 'ch-rotational',
        title: 'Rotational Motion',
        chapter_number: 1,
        subject: 'Physics',
        batch_id: TEACHER_BATCH_ID,
      },
    ]

    mockStudyCards = [
      {
        id: 'card-rot-1',
        title: 'Torque and Physics Dynamics',
        subject: 'Physics',
        type: 'youtube_video',
        chapter_id: 'ch-rotational',
        chapter: 'Rotational Motion',
        is_public: true,
        is_active: true,
        batch_id: TEACHER_BATCH_ID,
        batch_ids: [TEACHER_BATCH_ID],
      },
      {
        id: 'card-rot-2',
        title: 'Rigid Body Equilibrium Notes',
        subject: 'Physics',
        type: 'google_drive',
        chapter_id: 'ch-rotational',
        chapter: 'Rotational Motion',
        is_public: true,
        is_active: true,
        batch_id: TEACHER_BATCH_ID,
        batch_ids: [TEACHER_BATCH_ID],
      },
    ]
  })

  it('provides Global Search for Teacher role with Batches, Subject Workspaces, Lectures, and Quick Actions', async () => {
    const TEACHER_NAV = [
      { path: '/teacher/home', label: 'Dashboard' },
      { path: '/teacher/study', label: 'Study Hub' },
    ]

    render(
      <MemoryRouter initialEntries={['/teacher/home']}>
        <DashboardShell navItems={TEACHER_NAV} pageTitle="Teacher Portal" />
        <LocationDisplay />
      </MemoryRouter>
    )

    // Open search modal via top nav search button
    const searchBtn = screen.getByRole('button', { name: /Global Search \(⌘K \/ Ctrl\+K\)/i })
    expect(searchBtn).toBeInTheDocument()
    fireEvent.click(searchBtn)

    const input = await screen.findByPlaceholderText(/Search modules, subjects, lectures, or notes/i)
    fireEvent.change(input, { target: { value: 'Phys' } })

    // 1. Batches category
    expect(await screen.findByText('Batches')).toBeInTheDocument()
    expect(screen.getByText('Class 10 Advanced Physics')).toBeInTheDocument()

    // 2. Subject Workspaces category
    expect(screen.getByText('Subject Workspaces')).toBeInTheDocument()
    expect(screen.getByText('Physics Workspace')).toBeInTheDocument()

    // 3. Lectures & Study Materials category
    expect(screen.getByText('Lectures & Study Materials')).toBeInTheDocument()
    const lectureOption = screen.getByText('Torque and Physics Dynamics')
    expect(lectureOption).toBeInTheDocument()

    // 4. Quick Action filter option for teacher study
    expect(screen.getByText('Quick Actions')).toBeInTheDocument()
    expect(screen.getByText(/Filter Study Materials for "Phys"/i)).toBeInTheDocument()

    // Select the lecture: navigates teacher to study section with cardId target
    fireEvent.click(lectureOption)
    expect(screen.getByTestId('location-display').textContent).toBe(
      `/teacher/study?batch=${TEACHER_BATCH_ID}&subject=Physics&cardId=card-rot-1`
    )
  })

  it('provides Global Search for Admin role with Batch results navigating to admin study batch', async () => {
    mockAuthState = {
      user: { id: 'admin-uuid-1', email: 'admin@example.com' },
      profile: { id: 'admin-uuid-1', role: 'admin', full_name: 'Institute Admin' },
      loading: false,
      signOut: vi.fn(),
    }

    const ADMIN_NAV = [
      { path: '/admin/dashboard', label: 'Dashboard' },
      { path: '/admin/study', label: 'Study Material' },
    ]

    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <DashboardShell navItems={ADMIN_NAV} pageTitle="Admin Portal" />
        <LocationDisplay />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: /Global Search \(⌘K \/ Ctrl\+K\)/i }))
    const input = await screen.findByPlaceholderText(/Search modules, subjects, lectures, or notes/i)
    fireEvent.change(input, { target: { value: 'Class 10' } })

    // Batches section
    expect(await screen.findByText('Batches')).toBeInTheDocument()
    const batchItem = screen.getByText('Class 10 Advanced Physics')
    expect(batchItem).toBeInTheDocument()

    // Click batch item navigates to admin study with batch param
    fireEvent.click(batchItem)
    expect(screen.getByTestId('location-display').textContent).toBe(`/admin/study?batch=${TEACHER_BATCH_ID}`)
  })

  it('removes local search input from Teacher/Admin study header and renders count badge in lower row', async () => {
    render(
      <MemoryRouter initialEntries={[`/teacher/study?batch=${TEACHER_BATCH_ID}&subject=Physics&folder=video`]}>
        <TeacherStudySection isAdmin={false} />
      </MemoryRouter>
    )

    // Wait for content to render
    await screen.findByText('Physics Video Chapters')

    // Local search input must NOT exist
    expect(screen.queryByPlaceholderText(/Search chapters or lectures/i)).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText(/Search cards/i)).not.toBeInTheDocument()

    // Relocated count badge must be rendered
    expect(screen.getByText(/\(1 Chapter • 1 Video\)/i)).toBeInTheDocument()
  })

  it('displays dismissible search banner when navigated via Global Search filter and clears filter on click', async () => {
    render(
      <MemoryRouter initialEntries={[`/teacher/study?batch=${TEACHER_BATCH_ID}&subject=Physics&folder=video&search=Torque`]}>
        <Routes>
          <Route
            path="/teacher/study"
            element={
              <>
                <TeacherStudySection isAdmin={false} />
                <LocationDisplay />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    )

    // Banner indicates global search filter is active
    expect(await screen.findByText(/Global search filter:/i)).toBeInTheDocument()
    expect(screen.getByText(/“Torque”/i)).toBeInTheDocument()

    // Click "Clear filter" button
    const clearBtn = screen.getByRole('button', { name: /Clear filter/i })
    expect(clearBtn).toBeInTheDocument()
    fireEvent.click(clearBtn)

    // Filter banner is removed and search param stripped from URL
    await waitFor(() => {
      expect(screen.queryByText(/Global search filter:/i)).not.toBeInTheDocument()
      expect(screen.getByTestId('location-display').textContent).toBe(
        `/teacher/study?batch=${TEACHER_BATCH_ID}&subject=Physics&folder=video`
      )
    })
  })
})

