import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
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
      if (prop === 'upsert' || prop === 'delete' || prop === 'insert') {
        return vi.fn().mockReturnValue(Promise.resolve({ error: null }))
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

// Mock auth context state
let mockAuthState = {
  user: null,
  profile: null,
  loading: false,
}

vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => mockAuthState,
}))

// Mock ProtectedVideoPlayer
vi.mock('../../src/components/shared/ProtectedVideoPlayer', () => ({
  default: () => <div data-testid="mock-player">Mock Player</div>,
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

describe('Interactive Player: Header Styling & Bookmark Role Visibility', () => {
  const testLectureCard = {
    id: 'lecture-card-101',
    title: 'Demo Lecture | MOTION Class-9 CBSE/ICSE | The Digital Gyanify',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    type: 'youtube_video',
    description: 'Learn fundamentals of Motion in a clear way.',
    is_public: true,
    is_active: true,
    subject: 'Physics',
    chapter: 'Kinematics',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockTableData = {
      study_cards: [testLectureCard],
      student_profiles: [],
      fee_records: [],
      admin_access_overrides: [],
      student_bookmarks: [],
    }
  })

  it('1. Header displays stylized "Classroom" heading with no pill design or video title in top header', async () => {
    mockAuthState = {
      user: { id: 'student-1', email: 'student@example.com' },
      profile: { id: 'student-1', role: 'student', full_name: 'Aarav Sharma' },
      loading: false,
    }

    render(
      <MemoryRouter initialEntries={['/student/watch/lecture-card-101']}>
        <Routes>
          <Route path="/student/watch/:cardId" element={<WatchLecture />} />
        </Routes>
      </MemoryRouter>
    )

    // Top header has stylized Classroom heading
    const headerHeading = await screen.findByRole('heading', { name: 'Classroom' })
    expect(headerHeading).toBeInTheDocument()

    // Top header does NOT have study card subject or chapter pills
    const header = headerHeading.closest('header')
    expect(header).toBeInTheDocument()
    expect(header.textContent).toContain('Classroom')
    expect(header.textContent).not.toContain('Physics')
    expect(header.textContent).not.toContain('Kinematics')
    expect(header.textContent).not.toContain('Demo Lecture | MOTION')
  })

  it('2. Admin viewing lecture on /admin/watch/:cardId does NOT have the Bookmark button', async () => {
    mockAuthState = {
      user: { id: 'admin-1', email: 'admin@thoughtful.edu' },
      profile: { id: 'admin-1', role: 'admin', full_name: 'Subodh Admin' },
      loading: false,
    }

    render(
      <MemoryRouter initialEntries={['/admin/watch/lecture-card-101']}>
        <Routes>
          <Route path="/admin/watch/:cardId" element={<WatchLecture />} />
        </Routes>
      </MemoryRouter>
    )

    await screen.findByRole('heading', { name: 'Classroom' })
    expect(screen.queryByTitle('Bookmark')).not.toBeInTheDocument()
    expect(screen.queryByTitle('Bookmarked')).not.toBeInTheDocument()
    expect(screen.queryByText('Saved')).not.toBeInTheDocument()
  })

  it('3. Teacher viewing lecture on /teacher/watch/:cardId does NOT have the Bookmark button', async () => {
    mockAuthState = {
      user: { id: 'teacher-1', email: 'teacher@thoughtful.edu' },
      profile: { id: 'teacher-1', role: 'teacher', full_name: 'Prof. Verma' },
      loading: false,
    }

    render(
      <MemoryRouter initialEntries={['/teacher/watch/lecture-card-101']}>
        <Routes>
          <Route path="/teacher/watch/:cardId" element={<WatchLecture />} />
        </Routes>
      </MemoryRouter>
    )

    await screen.findByRole('heading', { name: 'Classroom' })
    expect(screen.queryByTitle('Bookmark')).not.toBeInTheDocument()
    expect(screen.queryByTitle('Bookmarked')).not.toBeInTheDocument()
    expect(screen.queryByText('Saved')).not.toBeInTheDocument()
  })

  it('4. Public / Guest / Demo viewer on /watch/:cardId does NOT have the Bookmark button', async () => {
    mockAuthState = {
      user: null,
      profile: null,
      loading: false,
    }

    render(
      <MemoryRouter initialEntries={['/watch/lecture-card-101']}>
        <Routes>
          <Route path="/watch/:cardId" element={<WatchLecture />} />
        </Routes>
      </MemoryRouter>
    )

    await screen.findByRole('heading', { name: 'Classroom' })
    expect(screen.queryByTitle('Bookmark')).not.toBeInTheDocument()
    expect(screen.queryByTitle('Bookmarked')).not.toBeInTheDocument()
    expect(screen.queryByText('Saved')).not.toBeInTheDocument()
  })

  it('5. Enrolled Student on /student/watch/:cardId HAS the Bookmark button and can toggle bookmark', async () => {
    mockAuthState = {
      user: { id: 'student-1', email: 'student@example.com' },
      profile: { id: 'student-1', role: 'student', full_name: 'Aarav Sharma' },
      loading: false,
    }

    render(
      <MemoryRouter initialEntries={['/student/watch/lecture-card-101']}>
        <Routes>
          <Route path="/student/watch/:cardId" element={<WatchLecture />} />
        </Routes>
      </MemoryRouter>
    )

    await screen.findByRole('heading', { name: 'Classroom' })

    // Bookmark button exists for student
    const bookmarkBtn = screen.getByTitle('Bookmark')
    expect(bookmarkBtn).toBeInTheDocument()
    expect(screen.getByText('Save')).toBeInTheDocument()

    // Clicking toggles bookmark
    fireEvent.click(bookmarkBtn)
    await waitFor(() => {
      expect(screen.getByText('Saved')).toBeInTheDocument()
    })
  })

  it('6. Migration 039 establishes student-only RLS policy and non-student bookmark purge', () => {
    const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/039_student_bookmarks_role_guard.sql')
    expect(fs.existsSync(migrationPath)).toBe(true)

    const sqlContent = fs.readFileSync(migrationPath, 'utf8')
    expect(sqlContent).toContain('DELETE FROM public.student_bookmarks')
    expect(sqlContent).toContain("role IN ('admin', 'teacher')")
    expect(sqlContent).toContain('DROP POLICY IF EXISTS "bookmarks: own"')
    expect(sqlContent).toContain('CREATE POLICY "student_bookmarks: student only"')
    expect(sqlContent).toContain("profiles.role = 'student'")
    expect(sqlContent).toContain('CREATE POLICY "student_bookmarks: admin access"')
    expect(sqlContent).toContain("profiles.role = 'admin'")
  })
})
