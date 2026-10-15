import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import DashboardShell from '../../src/components/layout/DashboardShell'
import StudySection from '../../src/pages/student/StudySection'

// Test helpers and mocks
let mockStudyCards = []
let mockStudentProfile = null
let mockBatches = []

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
})
