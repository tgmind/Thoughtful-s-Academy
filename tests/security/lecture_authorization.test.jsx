import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
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

// Mock supabase client
vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => createChainableQueryBuilder([])),
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

describe('SEC-006: Direct Lecture Authorization & Access Control', () => {
  it('denies unauthenticated access to private study cards and prompts for login', async () => {
    mockAuthState.user = null
    mockAuthState.profile = null

    const privateCard = {
      id: 'private-lecture-01',
      title: 'Advanced Electrostatics Part 2',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      is_public: false,
      is_active: true,
      subject: 'Physics',
    }

    render(
      <MemoryRouter initialEntries={[{ pathname: '/watch/private-lecture-01', state: { card: privateCard } }]}>
        <Routes>
          <Route path="/watch/:cardId?" element={<WatchLecture />} />
        </Routes>
      </MemoryRouter>
    )

    // Should display access restriction
    expect(await screen.findByText('Enrolled Student Access Required')).toBeInTheDocument()
    expect(screen.getByText(/This lecture is part of an enrolled batch curriculum/)).toBeInTheDocument()
    expect(screen.getByText('Sign In to Watch')).toBeInTheDocument()
    expect(screen.getByText('Back to Home')).toBeInTheDocument()
  })

  it('permits unauthenticated viewing of public preview lectures', async () => {
    mockAuthState.user = null
    mockAuthState.profile = null

    const publicCard = {
      id: 'public-sample-01',
      title: 'Free Introductory Physics Lecture',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      is_public: true,
      is_active: true,
      subject: 'Physics',
    }

    render(
      <MemoryRouter initialEntries={[{ pathname: '/watch/public-sample-01', state: { card: publicCard } }]}>
        <Routes>
          <Route path="/watch/:cardId?" element={<WatchLecture />} />
        </Routes>
      </MemoryRouter>
    )

    // Public card should display header and player container
    const titleElements = await screen.findAllByText('Free Introductory Physics Lecture')
    expect(titleElements.length).toBeGreaterThan(0)
    expect(screen.queryByText('Enrolled Student Access Required')).not.toBeInTheDocument()
  })

  it('prompts unauthenticated user to log in when lecture is not found or inaccessible', async () => {
    mockAuthState.user = null
    mockAuthState.profile = null

    render(
      <MemoryRouter initialEntries={['/watch/non-existent-or-hidden']}>
        <Routes>
          <Route path="/watch/:cardId?" element={<WatchLecture />} />
        </Routes>
      </MemoryRouter>
    )

    expect(await screen.findByText('Enrolled Student Access Required')).toBeInTheDocument()
    expect(screen.getByText(/This lecture is reserved for enrolled students/)).toBeInTheDocument()
    expect(screen.getByText('Sign In to Watch')).toBeInTheDocument()
  })

  it('displays not found / restricted message when authenticated student accesses non-existent card', async () => {
    mockAuthState.user = { id: 'student-123' }
    mockAuthState.profile = { id: 'student-123', role: 'student' }

    render(
      <MemoryRouter initialEntries={['/watch/restricted-lecture-id']}>
        <Routes>
          <Route path="/watch/:cardId?" element={<WatchLecture />} />
        </Routes>
      </MemoryRouter>
    )

    expect(await screen.findByText('Lecture Not Found or Restricted')).toBeInTheDocument()
    expect(screen.getByText(/The requested video lecture could not be loaded or is restricted/)).toBeInTheDocument()
    expect(screen.getByText('Return to Study Portal')).toBeInTheDocument()
  })

  it('renders lecture successfully when authenticated student accesses enrolled lecture', async () => {
    mockAuthState.user = { id: 'student-123' }
    mockAuthState.profile = { id: 'student-123', role: 'student' }

    const enrolledCard = {
      id: 'enrolled-lecture-01',
      title: 'Rotational Dynamics Chapter 3',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      is_public: false,
      is_active: true,
      subject: 'Physics',
    }

    render(
      <MemoryRouter initialEntries={[{ pathname: '/watch/enrolled-lecture-01', state: { card: enrolledCard } }]}>
        <Routes>
          <Route path="/watch/:cardId?" element={<WatchLecture />} />
        </Routes>
      </MemoryRouter>
    )

    const titleElements = await screen.findAllByText('Rotational Dynamics Chapter 3')
    expect(titleElements.length).toBeGreaterThan(0)
    expect(screen.queryByText('Lecture Not Found or Restricted')).not.toBeInTheDocument()
    expect(screen.queryByText('Enrolled Student Access Required')).not.toBeInTheDocument()
  })
})
