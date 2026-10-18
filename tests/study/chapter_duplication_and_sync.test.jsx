import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import StudentStudySection from '../../src/pages/student/StudySection'
import TeacherStudySection from '../../src/pages/teacher/StudySection'

let mockStudyCards = []
let mockChapters = []
let mockBatches = []
let mockAuthState = {}
let realtimeCallbacks = {}

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
        return createChainableQueryBuilder(() => [{
          id: 'user-student-1',
          batch_id: 'batch-1',
          full_name: 'Alex Student',
          email: 'student@example.com',
          batches: { name: 'Target Batch 2026' },
          subjects: ['Physics', 'Chemistry'],
        }])
      }
      if (table === 'study_cards') {
        return createChainableQueryBuilder(
          () => mockStudyCards,
          (payload) => {
            const newCard = { ...payload, id: `card_${Date.now()}` }
            mockStudyCards.push(newCard)
          },
          (payload) => {
            mockStudyCards = mockStudyCards.map(c => ({ ...c, ...payload }))
          }
        )
      }
      if (table === 'chapters') {
        return createChainableQueryBuilder(
          () => mockChapters,
          (payload) => {
            const newCh = { ...payload, id: `ch_${Date.now()}` }
            mockChapters.push(newCh)
          },
          (payload) => {
            mockChapters = mockChapters.map(ch => ({ ...ch, ...payload }))
          }
        )
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
    channel: vi.fn((chanName) => {
      const chan = {
        on: vi.fn((eventType, filter, cb) => {
          const callback = cb || filter
          const tbl = filter?.table || 'all'
          realtimeCallbacks[`${chanName}_${tbl}`] = callback
          return chan
        }),
        subscribe: vi.fn().mockReturnThis(),
      }
      return chan
    }),
    removeChannel: vi.fn(),
  },
}))

vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => mockAuthState,
}))

vi.mock('../../src/lib/activityLogger', () => ({
  logActivity: vi.fn(),
}))

describe('Chapter Duplication, Synchronization and Realtime Consistency', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    realtimeCallbacks = {}
    window.confirm = vi.fn(() => true)

    mockAuthState = {
      user: { id: 'teacher-1', email: 'teacher@example.com' },
      profile: { id: 'teacher-1', role: 'teacher', full_name: 'Prof. Marie Curie' },
      loading: false,
    }

    mockBatches = [
      {
        id: 'batch-1',
        name: 'Target Batch 2026',
        subjects: ['Physics', 'Chemistry'],
        teacher_id: 'teacher-1',
        teacher_ids: ['teacher-1'],
      },
    ]

    // Canonical database records matching the forensic case
    mockChapters = [
      {
        id: '57426311-6a19-4379-9837-d07059cff8cc',
        batch_id: 'batch-1',
        subject: 'Physics',
        title: 'Demo Chapter',
        display_order: 1,
      },
      {
        id: 'c59082fb-2193-4add-93d3-5d2a1cf509db',
        batch_id: 'batch-1',
        subject: 'Physics',
        title: 'Projectile Motion PYQs',
        display_order: 2,
      },
    ]

    // 3 cards have chapter_id pointing to Demo Chapter, but with the out-of-sync string "New Chapter"
    mockStudyCards = [
      {
        id: 'card-1',
        title: 'Motion in 1D',
        type: 'youtube_video',
        url: 'https://www.youtube.com/watch?v=demo1',
        subject: 'Physics',
        chapter_id: '57426311-6a19-4379-9837-d07059cff8cc',
        chapter: 'New Chapter', // Out-of-sync string from previous rename
        batch_id: 'batch-1',
        batch_ids: ['batch-1'],
        is_active: true,
        is_public: true,
      },
      {
        id: 'card-2',
        title: 'Is this the Start of AGI?',
        type: 'youtube_video',
        url: 'https://www.youtube.com/watch?v=demo2',
        subject: 'Physics',
        chapter_id: '57426311-6a19-4379-9837-d07059cff8cc',
        chapter: 'New Chapter',
        batch_id: 'batch-1',
        batch_ids: ['batch-1'],
        is_active: true,
        is_public: true,
      },
      {
        id: 'card-3',
        title: 'Sigma Web Development Course',
        type: 'youtube_video',
        url: 'https://www.youtube.com/watch?v=demo3',
        subject: 'Physics',
        chapter_id: '57426311-6a19-4379-9837-d07059cff8cc',
        chapter: 'New Chapter',
        batch_id: 'batch-1',
        batch_ids: ['batch-1'],
        is_active: true,
        is_public: true,
      },
      {
        id: 'card-4',
        title: 'Project Motion PYQs Part 1',
        type: 'youtube_video',
        url: 'https://www.youtube.com/watch?v=demo4',
        subject: 'Physics',
        chapter_id: 'c59082fb-2193-4add-93d3-5d2a1cf509db',
        chapter: 'Projectile Motion PYQs',
        batch_id: 'batch-1',
        batch_ids: ['batch-1'],
        is_active: true,
        is_public: true,
      },
      {
        id: 'card-5',
        title: 'Projectile Motion PYQs Part 2',
        type: 'youtube_video',
        url: 'https://www.youtube.com/watch?v=demo5',
        subject: 'Physics',
        chapter_id: 'c59082fb-2193-4add-93d3-5d2a1cf509db',
        chapter: 'Projectile Motion PYQs',
        batch_id: 'batch-1',
        batch_ids: ['batch-1'],
        is_active: true,
        is_public: true,
      },
    ]
  })

  describe('Elimination of Phantom Virtual Chapters and Dual Matching', () => {
    it('Teacher Portal: prevents synthesis of "New Chapter" and renders exactly 2 canonical chapters', async () => {
      render(
        <MemoryRouter initialEntries={['/teacher/study?batch=batch-1&subject=Physics&folder=video']}>
          <TeacherStudySection />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.queryByText(/Loading study workspace/i)).not.toBeInTheDocument()
      })

      // Must render canonical Demo Chapter
      expect(await screen.findByText('Demo Chapter')).toBeInTheDocument()
      // Must render Projectile Motion PYQs
      expect(screen.getByText('Projectile Motion PYQs')).toBeInTheDocument()

      // MUST NOT render phantom "New Chapter"
      expect(screen.queryByText('New Chapter')).not.toBeInTheDocument()

      // Header count must accurately state 2 Chapters • 5 Videos (not 3 Chapters • 5 Videos)
      expect(screen.getByText('(2 Chapters • 5 Videos)')).toBeInTheDocument()

      // Chapter 1 has 3 lectures, Chapter 2 has 2 lectures
      expect(screen.getByText('3 Lectures')).toBeInTheDocument()
      expect(screen.getByText('2 Lectures')).toBeInTheDocument()
    })

    it('Student Portal: prevents synthesis of "New Chapter" and correctly counts 2 Chapters • 5 Videos', async () => {
      mockAuthState = {
        user: { id: 'user-student-1', email: 'student@example.com' },
        profile: { id: 'user-student-1', role: 'student', full_name: 'Alex Student' },
        loading: false,
      }

      render(
        <MemoryRouter initialEntries={['/student/study?subject=Physics&category=video']}>
          <StudentStudySection />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.queryByText(/Loading Study Workspace/i)).not.toBeInTheDocument()
      })
      expect(screen.getByText('Demo Chapter')).toBeInTheDocument()
      expect(screen.getByText('Projectile Motion PYQs')).toBeInTheDocument()

      // No phantom chapter
      expect(screen.queryByText('New Chapter')).not.toBeInTheDocument()

      // Header count must reflect exactly 2 Chapters • 5 Videos
      expect(screen.getByText(/\(2 Chapters • 5 Videos\)/i)).toBeInTheDocument()
    })

    it('Opening Demo Chapter shows all 3 assigned cards without card duplication in other chapters', async () => {
      render(
        <MemoryRouter initialEntries={['/teacher/study?batch=batch-1&subject=Physics&folder=video&chapter=57426311-6a19-4379-9837-d07059cff8cc']}>
          <TeacherStudySection />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.queryByText(/Loading study workspace/i)).not.toBeInTheDocument()
      })

      // All 3 cards assigned to Demo Chapter are rendered
      expect(await screen.findByText('Motion in 1D')).toBeInTheDocument()
      expect(screen.getByText('Is this the Start of AGI?')).toBeInTheDocument()
      expect(screen.getByText('Sigma Web Development Course')).toBeInTheDocument()

      // Cards from Chapter 2 are NOT rendered in Chapter 1
      expect(screen.queryByText('Project Motion PYQs Part 1')).not.toBeInTheDocument()
      expect(screen.queryByText('Projectile Motion PYQs Part 2')).not.toBeInTheDocument()
    })
  })

  describe('Legacy Card Fallback & Orphaned Virtual Chapter Isolation', () => {
    it('allows virtual chapter synthesis ONLY for legacy cards without chapter_id', async () => {
      // Add an unassigned legacy card that has chapter string but NO chapter_id
      mockStudyCards.push({
        id: 'legacy-card-1',
        title: 'Legacy Thermodynamics Overview',
        type: 'youtube_video',
        url: 'https://www.youtube.com/watch?v=thermo',
        subject: 'Physics',
        chapter_id: null, // Legacy card without foreign key
        chapter: 'Thermodynamics & Heat',
        batch_id: 'batch-1',
        batch_ids: ['batch-1'],
        is_active: true,
        is_public: true,
      })

      render(
        <MemoryRouter initialEntries={['/teacher/study?batch=batch-1&subject=Physics&folder=video']}>
          <TeacherStudySection />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.queryByText(/Loading study workspace/i)).not.toBeInTheDocument()
      })

      // The legacy card correctly synthesizes a virtual chapter for its orphaned title
      expect(await screen.findByText('Thermodynamics & Heat')).toBeInTheDocument()

      // The cards with chapter_id still do NOT synthesize any duplicate chapter
      expect(screen.queryByText('New Chapter')).not.toBeInTheDocument()
    })
  })

  describe('Admin Portal & Teacher Portal Parity', () => {
    it('Admin Portal (isAdmin=true) renders identical canonical chapters and counts', async () => {
      mockAuthState = {
        user: { id: 'admin-1', email: 'admin@example.com' },
        profile: { id: 'admin-1', role: 'admin', full_name: 'Platform Administrator' },
        loading: false,
      }

      render(
        <MemoryRouter initialEntries={['/admin/study?batch=batch-1&subject=Physics&folder=video']}>
          <TeacherStudySection isAdmin={true} />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.queryByText(/Loading study workspace/i)).not.toBeInTheDocument()
      })

      // Canonical chapters match Teacher view 1:1
      expect(await screen.findByText('Demo Chapter')).toBeInTheDocument()
      expect(screen.getByText('Projectile Motion PYQs')).toBeInTheDocument()
      expect(screen.queryByText('New Chapter')).not.toBeInTheDocument()
      expect(screen.getByText('(2 Chapters • 5 Videos)')).toBeInTheDocument()
    })
  })

  describe('Realtime Consistency Across Sessions', () => {
    it('Teacher Portal registers Realtime listeners for both chapters and study_cards', async () => {
      render(
        <MemoryRouter initialEntries={['/teacher/study?batch=batch-1&subject=Physics&folder=video']}>
          <TeacherStudySection />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.queryByText(/Loading study workspace/i)).not.toBeInTheDocument()
      })

      // Check registered channels in realtimeCallbacks
      const channelKeys = Object.keys(realtimeCallbacks)
      expect(channelKeys.some(k => k.includes('chapters'))).toBe(true)
      expect(channelKeys.some(k => k.includes('study_cards'))).toBe(true)
    })

    it('Student Portal registers Realtime listeners for both chapters and study_cards', async () => {
      mockAuthState = {
        user: { id: 'user-student-1', email: 'student@example.com' },
        profile: { id: 'user-student-1', role: 'student', full_name: 'Alex Student' },
        loading: false,
      }

      render(
        <MemoryRouter initialEntries={['/student/study?subject=Physics&category=video']}>
          <StudentStudySection />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.queryByText(/Loading Study Workspace/i)).not.toBeInTheDocument()
      })

      const channelKeys = Object.keys(realtimeCallbacks)
      expect(channelKeys.some(k => k.includes('chapters'))).toBe(true)
      expect(channelKeys.some(k => k.includes('study_cards'))).toBe(true)
    })
  })
})
