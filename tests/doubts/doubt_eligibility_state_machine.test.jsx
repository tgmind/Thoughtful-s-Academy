import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import {
  DOUBT_ELIGIBILITY_STATUS,
  getDoubtEligibility,
  subscribeToDoubts,
} from '../../src/services/doubtService'
import WatchLecture from '../../src/pages/student/WatchLecture'

// Chainable query builder for mocked Supabase
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

const mockAuthState = {
  user: null,
  profile: null,
  loading: false,
}

vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => mockAuthState,
}))

vi.mock('../../src/components/shared/ProtectedVideoPlayer', () => ({
  default: () => <div data-testid="protected-video-player">Mock Player</div>,
}))

vi.mock('../../src/utils/youtube', async () => {
  const actual = await vi.importActual('../../src/utils/youtube')
  return {
    ...actual,
    fetchPlaylistItems: vi.fn().mockResolvedValue([]),
    getLectureProgress: vi.fn().mockReturnValue(null),
  }
})

describe('Doubt Eligibility State Machine: Unit Tests (getDoubtEligibility)', () => {
  const baseCard = {
    id: 'card-motion-01',
    title: 'Demo Lecture | MOTION Class-9 CBSE/ICSE | The Digital Gyanify',
    batch_id: 'batch-class-9',
    is_public: true,
  }

  it('returns INITIALIZING when auth is loading or card is loading', () => {
    expect(getDoubtEligibility({ authLoading: true })).toBe(DOUBT_ELIGIBILITY_STATUS.INITIALIZING)
    expect(getDoubtEligibility({ cardLoading: true })).toBe(DOUBT_ELIGIBILITY_STATUS.INITIALIZING)
  })

  it('returns UNAUTHENTICATED when user is not logged in', () => {
    expect(getDoubtEligibility({ user: null, authLoading: false })).toBe(
      DOUBT_ELIGIBILITY_STATUS.UNAUTHENTICATED
    )
  })

  it('returns EDUCATOR for teacher or admin roles', () => {
    const teacherUser = { id: 'teacher-1' }
    const adminUser = { id: 'admin-1' }

    expect(
      getDoubtEligibility({
        user: teacherUser,
        profile: { role: 'teacher' },
        card: baseCard,
      })
    ).toBe(DOUBT_ELIGIBILITY_STATUS.EDUCATOR)

    expect(
      getDoubtEligibility({
        user: adminUser,
        profile: { role: 'admin' },
        card: baseCard,
      })
    ).toBe(DOUBT_ELIGIBILITY_STATUS.EDUCATOR)
  })

  it('returns LOADING_ENROLLMENT when studentProfileLoading is true', () => {
    expect(
      getDoubtEligibility({
        user: { id: 'student-1' },
        profile: { role: 'student' },
        studentProfileLoading: true,
        card: baseCard,
      })
    ).toBe(DOUBT_ELIGIBILITY_STATUS.LOADING_ENROLLMENT)
  })

  it('returns ERROR when studentProfileError is set', () => {
    expect(
      getDoubtEligibility({
        user: { id: 'student-1' },
        profile: { role: 'student' },
        studentProfileError: new Error('Network error'),
        card: baseCard,
      })
    ).toBe(DOUBT_ELIGIBILITY_STATUS.ERROR)
  })

  it('returns STUDENT_ELIGIBLE for enrolled student even with is_public: true and "Demo Lecture" title', () => {
    const status = getDoubtEligibility({
      user: { id: 'student-1' },
      profile: { role: 'student' },
      studentProfile: { batch_id: 'batch-class-9' },
      studentProfileLoading: false,
      card: baseCard, // has is_public: true and title: 'Demo Lecture | MOTION...'
    })
    expect(status).toBe(DOUBT_ELIGIBILITY_STATUS.STUDENT_ELIGIBLE)
  })

  it('returns STUDENT_ELIGIBLE when student is in card.batch_ids array', () => {
    const multiBatchCard = {
      id: 'card-chem-01',
      title: 'Atomic Structure',
      batch_ids: ['batch-class-9', 'batch-class-10'],
    }
    const status = getDoubtEligibility({
      user: { id: 'student-1' },
      profile: { role: 'student' },
      studentProfile: { batch_id: 'batch-class-10' },
      card: multiBatchCard,
    })
    expect(status).toBe(DOUBT_ELIGIBILITY_STATUS.STUDENT_ELIGIBLE)
  })

  it('returns STUDENT_ELIGIBLE when card has no batch restriction (batch_id null and batch_ids empty)', () => {
    const openCard = {
      id: 'card-open-01',
      title: 'General Science',
      batch_id: null,
      batch_ids: [],
    }
    const status = getDoubtEligibility({
      user: { id: 'student-1' },
      profile: { role: 'student' },
      studentProfile: { batch_id: 'batch-class-9' },
      card: openCard,
    })
    expect(status).toBe(DOUBT_ELIGIBILITY_STATUS.STUDENT_ELIGIBLE)
  })

  it('returns STUDENT_NOT_ENROLLED when student belongs to a different batch', () => {
    const status = getDoubtEligibility({
      user: { id: 'student-1' },
      profile: { role: 'student' },
      studentProfile: { batch_id: 'batch-class-11' },
      card: baseCard, // belongs to batch-class-9
    })
    expect(status).toBe(DOUBT_ELIGIBILITY_STATUS.STUDENT_NOT_ENROLLED)
  })

  it('returns STUDENT_NOT_ENROLLED when student has no batch_id assigned', () => {
    const status = getDoubtEligibility({
      user: { id: 'student-1' },
      profile: { role: 'student' },
      studentProfile: { batch_id: null },
      card: baseCard,
    })
    expect(status).toBe(DOUBT_ELIGIBILITY_STATUS.STUDENT_NOT_ENROLLED)
  })
})

describe('Doubt Eligibility in Interactive Player: Component Integration Tests', () => {
  const motionCard = {
    id: '018bb046-6729-4af6-8275-c100d808050d',
    title: 'Demo Lecture | MOTION Class-9 CBSE/ICSE | The Digital Gyanify',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    type: 'youtube_video',
    description: 'Learn the fundamentals of Motion in a simple, student-friendly way.',
    is_public: true,
    is_active: true,
    subject: 'Physics',
    batch_id: '7273c358-9f50-480f-b050-42c4d7df1fae',
    batches: { name: 'Class 9 Marathon' },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockTableData = {}
  })

  it('Enrolled student watching "Motion" sees doubt submission form despite is_public and demo title', async () => {
    mockAuthState.user = { id: 'student-bc7e0614' }
    mockAuthState.profile = { id: 'student-bc7e0614', role: 'student', full_name: 'Enrolled Student' }
    mockAuthState.loading = false
    mockTableData = {
      student_profiles: [
        {
          id: 'student-bc7e0614',
          batch_id: '7273c358-9f50-480f-b050-42c4d7df1fae',
          roll_number: 'C9-042',
          batches: { id: '7273c358-9f50-480f-b050-42c4d7df1fae', name: 'Class 9 Marathon' },
        },
      ],
      doubts: [],
    }

    render(
      <MemoryRouter initialEntries={[{ pathname: '/student/watch/' + motionCard.id, state: { card: motionCard } }]}>
        <Routes>
          <Route path="/student/watch/:cardId?" element={<WatchLecture />} />
        </Routes>
      </MemoryRouter>
    )

    // Player loads
    expect(await screen.findByTestId('protected-video-player')).toBeInTheDocument()

    // Enrolled student has "Ask Doubt at 0:00" button in player control bar
    expect(await screen.findByText(/Ask Doubt at/i)).toBeInTheDocument()

    // Click on Doubts tab
    const doubtsTab = screen.getByRole('button', { name: /^Doubts$/i })
    fireEvent.click(doubtsTab)

    // Verify doubt submission form is visible
    expect(screen.getByLabelText(/Your Question \/ Doubt:/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Send Doubt at/i })).toBeInTheDocument()

    // Verify the public promotional gate is NOT visible
    expect(screen.queryByText(/Reserved for Enrolled Students/i)).not.toBeInTheDocument()
    expect(screen.queryByText('Join an enrolled batch or sign in to your student account')).not.toBeInTheDocument()
  })

  it('Student enrolled in a different batch sees authenticated batch-required gate without Sign In button', async () => {
    mockAuthState.user = { id: 'student-other-batch' }
    mockAuthState.profile = { id: 'student-other-batch', role: 'student', full_name: 'Class 10 Student' }
    mockAuthState.loading = false
    mockTableData = {
      student_profiles: [
        {
          id: 'student-other-batch',
          batch_id: 'batch-class-10-different',
          roll_number: 'C10-099',
          batches: { id: 'batch-class-10-different', name: 'Class 10 Pinnacle' },
        },
      ],
    }

    render(
      <MemoryRouter initialEntries={[{ pathname: '/student/watch/' + motionCard.id, state: { card: motionCard } }]}>
        <Routes>
          <Route path="/student/watch/:cardId?" element={<WatchLecture />} />
        </Routes>
      </MemoryRouter>
    )

    expect(await screen.findByTestId('protected-video-player')).toBeInTheDocument()

    // Student does not see "Ask Doubt at" since they are not enrolled in this lecture's batch
    expect(screen.queryByText(/Ask Doubt at/i)).not.toBeInTheDocument()

    // Click Doubts tab
    fireEvent.click(screen.getByRole('button', { name: /^Doubts$/i }))

    // Expect the dedicated batch-feature explanation for non-enrolled students
    expect(await screen.findByText('Reserved for Batch Students')).toBeInTheDocument()
    expect(screen.getByText('Batch Feature')).toBeInTheDocument()
    expect(screen.getByText(/exclusively available for students enrolled in this lecture's batch curriculum/i)).toBeInTheDocument()

    // Must NOT ask an already signed-in student to "Sign In"
    expect(screen.queryByRole('link', { name: /^Sign In$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Sign In$/i })).not.toBeInTheDocument()

    // Shows helpful navigation to study portal
    expect(screen.getByRole('button', { name: /My Study Portal/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /My Doubts Hub/i })).toBeInTheDocument()
  })

  it('Unauthenticated visitor sees public promotional gate with Enroll and Sign In buttons', async () => {
    mockAuthState.user = null
    mockAuthState.profile = null
    mockAuthState.loading = false

    render(
      <MemoryRouter initialEntries={[{ pathname: '/watch/' + motionCard.id, state: { card: motionCard } }]}>
        <Routes>
          <Route path="/watch/:cardId?" element={<WatchLecture />} />
        </Routes>
      </MemoryRouter>
    )

    expect(await screen.findByTestId('protected-video-player')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /^Doubts$/i }))

    expect(screen.getByText('Enrolled Feature')).toBeInTheDocument()
    expect(screen.getByText(/Reserved for Enrolled Students/i)).toBeInTheDocument()
    expect(screen.getByText(/Join an enrolled batch or sign in to your student account/i)).toBeInTheDocument()

    // Offers both Enroll and Sign In
    expect(screen.getByRole('button', { name: /Enroll in Batch/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument()
  })

  it('Realtime subscription guards against missing channel gracefully', () => {
    const cleanup = subscribeToDoubts('card-123', vi.fn())
    expect(typeof cleanup).toBe('function')
    expect(() => cleanup()).not.toThrow()
  })
})
