import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import WatchLecture from '../../src/pages/student/WatchLecture'

function createChainableQueryBuilder(defaultData = []) {
  const handler = {
    get(target, prop) {
      if (prop === 'then') {
        return (resolve) => Promise.resolve({ data: defaultData, error: null }).then(resolve)
      }
      if (prop === 'catch') {
        return (reject) => Promise.resolve({ data: defaultData, error: null }).catch(reject)
      }
      if (prop === 'maybeSingle' || prop === 'single') {
        return vi.fn().mockResolvedValue({ data: defaultData[0] || null, error: null })
      }
      return vi.fn(() => new Proxy(target, handler))
    },
  }
  return new Proxy({}, handler)
}

let mockTableData = {}

// Mock supabase client
vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: vi.fn((table) => {
      const data = mockTableData[table] !== undefined ? mockTableData[table] : []
      return createChainableQueryBuilder(data)
    }),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
  },
}))

// Mock useAuth
const mockAuthState = {
  user: null,
  profile: null,
  loading: false,
}

vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => mockAuthState,
}))

// Mock ProtectedVideoPlayer
vi.mock('../../src/components/shared/ProtectedVideoPlayer', () => ({
  default: () => <div data-testid="protected-video-player">Mock Player</div>,
}))

// Mock youtube helper
vi.mock('../../src/utils/youtube', async () => {
  const actual = await vi.importActual('../../src/utils/youtube')
  return {
    ...actual,
    fetchPlaylistItems: vi.fn().mockResolvedValue([]),
    getLectureProgress: vi.fn().mockReturnValue(null),
  }
})

describe('Interactive Player: Doubt Visibility, Tab Vanishing & Deduplication', () => {
  const singleVideoCard = {
    id: 'single-video-01',
    title: 'Demo Lecture | MOTION Class-9 CBSE/ICSE | The Digital Gyanify',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    type: 'youtube_video',
    description: 'Learn the fundamentals of Motion in a simple, student-friendly way.',
    is_public: true,
    is_active: true,
    subject: 'Physics',
  }

  const enrolledPrivateCard = {
    id: 'private-video-01',
    title: 'Advanced Rotation Dynamics Lecture 4',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    type: 'youtube_video',
    description: 'Deep dive into moment of inertia tensors and rotational stability.',
    is_public: false,
    is_active: true,
    subject: 'Physics',
    batch_id: 'batch-jee-2026',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockTableData = {}
  })

  it('1. Public/Demo viewer from landing page cannot ask doubt and Lectures tab vanishes on single video', async () => {
    mockAuthState.user = null
    mockAuthState.profile = null

    render(
      <MemoryRouter initialEntries={[{ pathname: '/watch/single-video-01', state: { card: singleVideoCard } }]}>
        <Routes>
          <Route path="/watch/:cardId?" element={<WatchLecture />} />
        </Routes>
      </MemoryRouter>
    )

    // Wait for player to load
    expect(await screen.findByTestId('protected-video-player')).toBeInTheDocument()

    // 1. Should NOT show "Ask Doubt at MM:SS" button below video
    expect(screen.queryByText(/Ask Doubt at/i)).not.toBeInTheDocument()
    expect(screen.getByText('Landscape Cinema')).toBeInTheDocument()

    // 2. The Lectures tab must vanish for single video
    expect(screen.queryByRole('button', { name: /^Lectures$/i })).not.toBeInTheDocument()

    // 3. Only Notes and Doubts tabs exist
    expect(screen.getByRole('button', { name: /^Notes$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Doubts$/i })).toBeInTheDocument()

    // 4. "Class Brief & Objectives" should NOT be duplicated in Notes
    expect(screen.queryByText('Class Brief & Objectives')).not.toBeInTheDocument()
    expect(screen.queryByText('Class Brief')).not.toBeInTheDocument()

    // 5. Switching to Doubts tab must show Enrolled Feature showcase with NO doubt submission form
    const doubtsTabBtn = screen.getByRole('button', { name: /^Doubts$/i })
    fireEvent.click(doubtsTabBtn)

    expect(screen.getByText('Enrolled Feature')).toBeInTheDocument()
    expect(screen.getByText(/Reserved for Enrolled Students/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/Your Question \/ Doubt:/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Send Doubt at/i)).not.toBeInTheDocument()
  })

  it('2. Teacher viewing lecture has NO option to ask doubt, but has Educator Doubts Queue', async () => {
    mockAuthState.user = { id: 'teacher-subodh-123' }
    mockAuthState.profile = { id: 'teacher-subodh-123', role: 'teacher', full_name: 'Subodh Sir' }

    render(
      <MemoryRouter initialEntries={[{ pathname: '/teacher/watch/private-video-01', state: { card: enrolledPrivateCard } }]}>
        <Routes>
          <Route path="/teacher/watch/:cardId?" element={<WatchLecture />} />
        </Routes>
      </MemoryRouter>
    )

    expect(await screen.findByTestId('protected-video-player')).toBeInTheDocument()

    // 1. Below video: NO "Ask Doubt at MM:SS" button
    expect(screen.queryByText(/Ask Doubt at/i)).not.toBeInTheDocument()
    // Should have "Manage Doubts Hub"
    expect(screen.getByText('Manage Doubts Hub')).toBeInTheDocument()

    // 2. Lectures tab vanishes on single video
    expect(screen.queryByRole('button', { name: /^Lectures$/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Notes$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Doubts$/i })).toBeInTheDocument()

    // 3. Switch to Doubts tab -> Educator Review view (NO doubt form)
    fireEvent.click(screen.getByRole('button', { name: /^Doubts$/i }))

    expect(screen.getByText('Educator Review')).toBeInTheDocument()
    expect(screen.getByText('Lecture Doubts Queue')).toBeInTheDocument()
    expect(screen.queryByLabelText(/Your Question \/ Doubt:/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Send Doubt at/i)).not.toBeInTheDocument()
  })

  it('3. Admin viewing lecture has NO option to ask doubt', async () => {
    mockAuthState.user = { id: 'admin-123' }
    mockAuthState.profile = { id: 'admin-123', role: 'admin', full_name: 'Director Admin' }

    render(
      <MemoryRouter initialEntries={[{ pathname: '/admin/watch/private-video-01', state: { card: enrolledPrivateCard } }]}>
        <Routes>
          <Route path="/admin/watch/:cardId?" element={<WatchLecture />} />
        </Routes>
      </MemoryRouter>
    )

    expect(await screen.findByTestId('protected-video-player')).toBeInTheDocument()

    expect(screen.queryByText(/Ask Doubt at/i)).not.toBeInTheDocument()
    expect(screen.getByText('Manage Doubts Hub')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /^Doubts$/i }))
    expect(screen.getByText('Educator Review')).toBeInTheDocument()
    expect(screen.queryByLabelText(/Your Question \/ Doubt:/i)).not.toBeInTheDocument()
  })

  it('4. Enrolled student watching course video has full Ask Doubt option and clean single-video tabs', async () => {
    mockAuthState.user = { id: 'student-rahul-123' }
    mockAuthState.profile = { id: 'student-rahul-123', role: 'student', full_name: 'Rahul Sharma' }
    mockTableData = {
      student_profiles: [
        {
          id: 'student-rahul-123',
          batch_id: 'batch-jee-2026',
          roll_number: '2026-JEE-001',
          batches: { id: 'batch-jee-2026', name: 'JEE Advanced' },
          subjects: ['Physics', 'Chemistry', 'Mathematics'],
        },
      ],
    }

    render(
      <MemoryRouter initialEntries={[{ pathname: '/student/watch/private-video-01', state: { card: enrolledPrivateCard } }]}>
        <Routes>
          <Route path="/student/watch/:cardId?" element={<WatchLecture />} />
        </Routes>
      </MemoryRouter>
    )

    expect(await screen.findByTestId('protected-video-player')).toBeInTheDocument()

    // 1. Enrolled student gets "Ask Doubt at 0:00" below video
    expect(await screen.findByText(/Ask Doubt at/i)).toBeInTheDocument()

    // 2. Lectures tab vanishes on single video
    expect(screen.queryByRole('button', { name: /^Lectures$/i })).not.toBeInTheDocument()

    // 3. Switch to Doubts tab -> Student Doubt Form is present
    fireEvent.click(screen.getByRole('button', { name: /^Doubts$/i }))
    expect(screen.getByLabelText(/Your Question \/ Doubt:/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Send Doubt at/i })).toBeInTheDocument()

    // 4. Description appears in "Lecture Highlights & Outline" only, NOT duplicated in tabs
    expect(screen.getByText('Lecture Highlights & Outline')).toBeInTheDocument()
    expect(screen.queryByText('Class Brief & Objectives')).not.toBeInTheDocument()
  })
})
