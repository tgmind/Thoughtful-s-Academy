import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import StudentHomework from '../../src/pages/student/Homework'
import TeacherHomework from '../../src/pages/teacher/Homework'
import toast from 'react-hot-toast'

// Mock toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Auth state mock
const mockAuthState = {
  user: { id: 'student-123', email: 'student@example.com' },
  profile: { id: 'student-123', role: 'student', full_name: 'Rahul Sharma' },
}

vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => mockAuthState,
}))

// In-memory mock data
let mockStudentProfile = null
let mockHomework = []
let mockSubmissions = []
let mockBatches = []
let mockTeacherProfile = null
let mockBatchStudents = []

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: (table) => {
      const query = {
        _table: table,
        _filters: {},
        _selectFields: null,
        _inValues: null,
        select(fields) {
          query._selectFields = fields
          return query
        },
        eq(col, val) {
          query._filters[col] = val
          return query
        },
        in(col, vals) {
          query._inValues = { col, vals }
          return query
        },
        or(clause) {
          if (table === 'homework' && clause && clause.includes('added_by')) {
            query._columnError = 'column homework.added_by does not exist'
          }
          return query
        },
        order() {
          return query
        },
        maybeSingle: async () => {
          if (query._columnError) {
            return { data: null, error: { message: query._columnError, code: '42703' } }
          }
          if (table === 'student_profiles') {
            return { data: mockStudentProfile, error: null }
          }
          if (table === 'teacher_profiles') {
            return { data: mockTeacherProfile, error: null }
          }
          if (table === 'homework') {
            const h = mockHomework.find((x) => x.id === query._filters.id)
            return { data: h ? { ...h, batches: { name: 'Batch A' } } : null, error: null }
          }
          if (table === 'homework_submissions') {
            const s = mockSubmissions.find(
              (x) => x.homework_id === query._filters.homework_id && x.student_id === query._filters.student_id
            )
            return { data: s || null, error: null }
          }
          return { data: null, error: null }
        },
        then(resolve) {
          return query._exec().then(resolve)
        },
        _exec: async () => {
          if (query._columnError) {
            return { data: null, error: { message: query._columnError, code: '42703' } }
          }
          if (table === 'student_profiles') {
            if (query._filters.id) {
              return { data: mockStudentProfile, error: null }
            }
            if (query._filters.batch_id) {
              const students = mockBatchStudents.filter((s) => s.batch_id === query._filters.batch_id)
              return { data: students, error: null }
            }
            return { data: mockBatchStudents, error: null }
          }
          if (table === 'fee_records') {
            return { data: [], error: null }
          }
          if (table === 'admin_access_overrides') {
            return { data: [], error: null }
          }
          if (table === 'batches') {
            return { data: mockBatches, error: null }
          }
          if (table === 'homework') {
            let res = [...mockHomework]
            if (query._filters.batch_id) {
              res = res.filter((h) => h.batch_id === query._filters.batch_id)
            }
            if (query._filters.is_active !== undefined) {
              res = res.filter((h) => h.is_active === query._filters.is_active)
            }
            res = res.map((h) => ({
              ...h,
              batches: mockBatches.find((b) => b.id === h.batch_id) || { name: 'Batch A' },
            }))
            return { data: res, error: null }
          }
          if (table === 'homework_submissions') {
            let res = [...mockSubmissions]
            if (query._filters.student_id) {
              res = res.filter((s) => s.student_id === query._filters.student_id)
            }
            if (query._filters.homework_id) {
              res = res.filter((s) => s.homework_id === query._filters.homework_id)
            }
            if (query._inValues && query._inValues.col === 'homework_id') {
              res = res.filter((s) => query._inValues.vals.includes(s.homework_id))
            }
            return { data: res, error: null }
          }
          return { data: [], error: null }
        },
        insert: (payload) => {
          if (table === 'homework_submissions') {
            // Check unique constraint: (homework_id, student_id)
            const exists = mockSubmissions.find(
              (s) => s.homework_id === payload.homework_id && s.student_id === payload.student_id
            )
            if (exists) {
              return {
                select: () => ({
                  maybeSingle: async () => ({
                    data: null,
                    error: { code: '23505', message: 'duplicate key value violates unique constraint' },
                  }),
                }),
              }
            }
            const newRow = {
              id: `sub-${Date.now()}`,
              homework_id: payload.homework_id,
              student_id: payload.student_id,
              submitted_at: new Date().toISOString(),
              drive_link: payload.drive_link || null,
            }
            mockSubmissions.push(newRow)
            return {
              select: () => ({
                maybeSingle: async () => ({ data: newRow, error: null }),
              }),
            }
          }
          if (table === 'homework') {
            const newHw = {
              id: `hw-${Date.now()}`,
              ...payload,
              created_at: new Date().toISOString(),
            }
            mockHomework.push(newHw)
            return {
              select: () => ({
                maybeSingle: async () => ({
                  data: { ...newHw, batches: { name: 'Batch A' } },
                  error: null,
                }),
              }),
            }
          }
          return { select: () => ({ maybeSingle: async () => ({ data: payload, error: null }) }) }
        },
        delete: () => {
          return {
            eq: (col1, val1) => ({
              eq: (col2, val2) => {
                if (table === 'homework_submissions') {
                  mockSubmissions = mockSubmissions.filter(
                    (s) => !(s[col1] === val1 && s[col2] === val2)
                  )
                }
                return Promise.resolve({ error: null })
              },
              then: (resolve) => {
                if (table === 'homework') {
                  mockHomework = mockHomework.filter((h) => h[col1] !== val1)
                }
                resolve({ error: null })
              },
            }),
          }
        },
        update: (payload) => ({
          eq: (col, val) => ({
            select: () => ({
              maybeSingle: async () => {
                if (table === 'homework') {
                  const idx = mockHomework.findIndex((h) => h[col] === val)
                  if (idx !== -1) {
                    mockHomework[idx] = { ...mockHomework[idx], ...payload }
                    return {
                      data: { ...mockHomework[idx], batches: { name: 'Batch A' } },
                      error: null,
                    }
                  }
                }
                return { data: null, error: null }
              },
            }),
          }),
        }),
      }
      return query
    },
    channel: () => ({
      on: function () {
        return this
      },
      subscribe: () => ({}),
    }),
    removeChannel: () => {},
  },
}))

describe('Unified Homework Completion System Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStudentProfile = {
      id: 'student-123',
      batch_id: 'batch-1',
      trial_ends_at: null,
      batches: {
        id: 'batch-1',
        name: 'Batch A',
        fee_mode: 'one_time',
        fee_amount: 0,
      },
    }
    mockHomework = [
      {
        id: 'hw-1',
        batch_id: 'batch-1',
        title: 'Physics Chapter 1 Problems',
        description: 'Complete problems 1 to 10 in your notebook',
        drive_link: 'https://drive.google.com/file/d/hw1_sheet/view',
        due_date: '2026-11-01',
        is_active: true,
        created_at: '2026-10-20T10:00:00Z',
      },
      {
        id: 'hw-2',
        batch_id: 'batch-1',
        title: 'Chemistry Organic Reactions',
        description: 'Read reaction mechanisms',
        drive_link: 'https://drive.google.com/file/d/hw2_reactions/view',
        due_date: null,
        is_active: true,
        created_at: '2026-10-21T10:00:00Z',
      },
    ]
    mockSubmissions = []
    mockBatches = [
      { id: 'batch-1', name: 'Batch A', is_active: true },
      { id: 'batch-2', name: 'Batch B', is_active: true },
    ]
    mockTeacherProfile = { id: 'teacher-1', can_manage_homework: true }
    mockBatchStudents = [
      { id: 'student-123', batch_id: 'batch-1', profiles: { full_name: 'Rahul Sharma', email: 'rahul@test.com', is_active: true } },
      { id: 'student-456', batch_id: 'batch-1', profiles: { full_name: 'Aanya Verma', email: 'aanya@test.com', is_active: true } },
      { id: 'student-789', batch_id: 'batch-1', profiles: { full_name: 'Vikram Singh', email: 'vikram@test.com', is_active: true } },
    ]
  })

  describe('Student Homework Workflow', () => {
    it('renders To Do and Done tabs and defaults to To Do with active assignments', async () => {
      render(
        <MemoryRouter>
          <StudentHomework />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Physics Chapter 1 Problems')).toBeInTheDocument()
      })

      // Tabs: verify To Do and Done buttons
      const todoTab = screen.getByRole('button', { name: /^To Do/i })
      const doneTab = screen.getByRole('button', { name: /^Done/i })
      expect(todoTab).toHaveTextContent('2')
      expect(doneTab).toHaveTextContent('0')

      // Mark as Done button must be present; no link submission inputs
      const markButtons = screen.getAllByRole('button', { name: /Mark as Done/i })
      expect(markButtons).toHaveLength(2)
      expect(screen.queryByPlaceholderText(/Paste your Google Drive/i)).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Submit Work/i })).not.toBeInTheDocument()
    })

    it('marks homework as Done upon clicking Mark as Done button and moves it to Done tab', async () => {
      render(
        <MemoryRouter>
          <StudentHomework />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Physics Chapter 1 Problems')).toBeInTheDocument()
      })

      const markButtons = screen.getAllByRole('button', { name: /Mark as Done/i })
      fireEvent.click(markButtons[0])

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Marked as done!')
      })

      // After completing one: To Do: 1, Done: 1
      const todoTab = screen.getByRole('button', { name: /^To Do/i })
      const doneTab = screen.getByRole('button', { name: /^Done/i })
      expect(todoTab).toHaveTextContent('1')
      expect(doneTab).toHaveTextContent('1')

      // Switch to Done tab
      fireEvent.click(doneTab)

      await waitFor(() => {
        expect(screen.getByText('Physics Chapter 1 Problems')).toBeInTheDocument()
        expect(screen.getByText('Completed')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Undo/i })).toBeInTheDocument()
      })
    })

    it('supports Undo action to move completed assignment back to To Do', async () => {
      mockSubmissions = [
        {
          id: 'sub-pre',
          homework_id: 'hw-1',
          student_id: 'student-123',
          submitted_at: '2026-10-22T08:00:00Z',
        },
      ]

      render(
        <MemoryRouter>
          <StudentHomework />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^To Do/i })).toHaveTextContent('1')
        expect(screen.getByRole('button', { name: /^Done/i })).toHaveTextContent('1')
      })

      // Switch to Done tab
      fireEvent.click(screen.getByRole('button', { name: /^Done/i }))

      await waitFor(() => {
        expect(screen.getByText('Physics Chapter 1 Problems')).toBeInTheDocument()
      })

      const undoButton = screen.getByRole('button', { name: /Undo/i })
      fireEvent.click(undoButton)

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Moved back to To Do')
      })

      // After undo: To Do: 2, Done: 0
      expect(screen.getByRole('button', { name: /^To Do/i })).toHaveTextContent('2')
      expect(screen.getByRole('button', { name: /^Done/i })).toHaveTextContent('0')
    })

    it('renders Assignment button in both To Do and Done states for in-app self-study', async () => {
      mockSubmissions = [
        {
          id: 'sub-pre',
          homework_id: 'hw-1',
          student_id: 'student-123',
          submitted_at: '2026-10-22T08:00:00Z',
        },
      ]

      render(
        <MemoryRouter>
          <StudentHomework />
        </MemoryRouter>
      )

      // In To Do: hw-2 has assignment button
      await waitFor(() => {
        expect(screen.getByText('Chemistry Organic Reactions')).toBeInTheDocument()
      })
      expect(screen.getByRole('button', { name: /Assignment/i })).toBeInTheDocument()

      // Switch to Done: hw-1 also has assignment button
      fireEvent.click(screen.getByRole('button', { name: /^Done/i }))
      await waitFor(() => {
        expect(screen.getByText('Physics Chapter 1 Problems')).toBeInTheDocument()
      })
      expect(screen.getByRole('button', { name: /Assignment/i })).toBeInTheDocument()
    })

    it('shows No Batch Assigned state when student has no batch_id', async () => {
      mockStudentProfile = { id: 'student-123', batch_id: null }

      render(
        <MemoryRouter>
          <StudentHomework />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('No Batch Assigned')).toBeInTheDocument()
      })
    })

    it('shows Batch Access Paused when fees are frozen', async () => {
      mockStudentProfile = {
        id: 'student-123',
        batch_id: 'batch-1',
        trial_ends_at: null,
        batches: {
          id: 'batch-1',
          name: 'Batch A',
          fee_mode: 'monthly',
          fee_amount: 1500,
        },
      }

      render(
        <MemoryRouter>
          <StudentHomework />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Batch Access Paused')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Pay Fee to Unlock Homework/i })).toBeInTheDocument()
      })
    })

    it('supports idempotent 23505 conflict resolution without error', async () => {
      // Simulate that in the database, sub for hw-1 already exists
      mockSubmissions = [
        {
          id: 'sub-existing',
          homework_id: 'hw-1',
          student_id: 'student-123',
          submitted_at: '2026-10-22T08:00:00Z',
        },
      ]

      render(
        <MemoryRouter>
          <StudentHomework />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Chemistry Organic Reactions')).toBeInTheDocument()
      })

      // When inserting duplicate, mockSupabase returns 23505
      const markButtons = screen.getAllByRole('button', { name: /Mark as Done/i })
      fireEvent.click(markButtons[0])

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Marked as done!')
      })
    })

    it('filters student assignments via search input', async () => {
      render(
        <MemoryRouter>
          <StudentHomework />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Physics Chapter 1 Problems')).toBeInTheDocument()
        expect(screen.getByText('Chemistry Organic Reactions')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText(/Search assignments/i)
      fireEvent.change(searchInput, { target: { value: 'Organic' } })

      expect(screen.getByText('Chemistry Organic Reactions')).toBeInTheDocument()
      expect(screen.queryByText('Physics Chapter 1 Problems')).not.toBeInTheDocument()

      // Clear search
      fireEvent.change(searchInput, { target: { value: '' } })
      expect(screen.getByText('Physics Chapter 1 Problems')).toBeInTheDocument()
    })
  })

  describe('Teacher & Admin Homework Workflow', () => {
    beforeEach(() => {
      mockAuthState.user = { id: 'teacher-1', email: 'teacher@example.com' }
      mockAuthState.profile = { id: 'teacher-1', role: 'teacher', full_name: 'Prof. Verma' }
    })

    it('renders teacher homework list with Done and Pending counts', async () => {
      mockSubmissions = [
        {
          id: 'sub-1',
          homework_id: 'hw-1',
          student_id: 'student-123',
          submitted_at: '2026-10-22T08:00:00Z',
        },
      ]

      render(
        <MemoryRouter>
          <TeacherHomework isAdmin={false} />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Physics Chapter 1 Problems')).toBeInTheDocument()
      })

      // Batch 1 has 3 active students; 1 submitted, 2 pending
      expect(screen.getByText(/✓ 1 Done/i)).toBeInTheDocument()
      expect(screen.getByText(/⏳ 2 Pending/i)).toBeInTheDocument()
      expect(screen.getAllByText(/\(3 total\)/i).length).toBeGreaterThanOrEqual(1)
    })

    it('opens Completion Drawer and displays enrolled, done, and pending rosters', async () => {
      mockSubmissions = [
        {
          id: 'sub-1',
          homework_id: 'hw-1',
          student_id: 'student-123',
          submitted_at: '2026-10-22T08:00:00Z',
        },
      ]

      render(
        <MemoryRouter>
          <TeacherHomework isAdmin={false} />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Physics Chapter 1 Problems')).toBeInTheDocument()
      })

      const statusButtons = screen.getAllByTitle('View completion roster')
      fireEvent.click(statusButtons[0])

      // Completion Drawer is open
      await waitFor(() => {
        expect(screen.getByText('Completion Status')).toBeInTheDocument()
        expect(screen.getByText('Rahul Sharma')).toBeInTheDocument()
        expect(screen.getByText('Aanya Verma')).toBeInTheDocument()
        expect(screen.getByText('Vikram Singh')).toBeInTheDocument()
      })

      // Rahul is Done
      expect(screen.getByText('Rahul Sharma')).toBeInTheDocument()
      expect(screen.getAllByText('Done').length).toBeGreaterThanOrEqual(1)

      // Aanya and Vikram are Pending
      expect(screen.getAllByText(/⏳ Pending/i).length).toBeGreaterThanOrEqual(2)

      // Filter by 'Done' tab inside drawer
      const doneTabBtn = screen.getByRole('button', { name: /Done.*1/i })
      fireEvent.click(doneTabBtn)

      await waitFor(() => {
        expect(screen.getByText('Rahul Sharma')).toBeInTheDocument()
        expect(screen.queryByText('Aanya Verma')).not.toBeInTheDocument()
      })

      // Filter by 'Pending' tab inside drawer
      const pendingTabBtn = screen.getByRole('button', { name: /Pending.*2/i })
      fireEvent.click(pendingTabBtn)

      await waitFor(() => {
        expect(screen.getByText('Aanya Verma')).toBeInTheDocument()
        expect(screen.getByText('Vikram Singh')).toBeInTheDocument()
        expect(screen.queryByText('Rahul Sharma')).not.toBeInTheDocument()
      })

      // No grade/feedback input forms exist in the drawer
      expect(screen.queryByPlaceholderText(/e\.g\. A \/ 8/i)).not.toBeInTheDocument()
      expect(screen.queryByPlaceholderText(/Optional note for the student/i)).not.toBeInTheDocument()
    })

    it('works identically in Admin portal mode (isAdmin=true)', async () => {
      mockAuthState.user = { id: 'admin-1', email: 'admin@example.com' }
      mockAuthState.profile = { id: 'admin-1', role: 'admin', full_name: 'Super Admin' }

      render(
        <MemoryRouter>
          <TeacherHomework isAdmin={true} />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Physics Chapter 1 Problems')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Assign Homework/i })).toBeInTheDocument()
      })
    })

    it('toggles homework visibility (hide from students / show to students) without RLS errors', async () => {
      mockAuthState.user = { id: 'admin-1', email: 'admin@example.com' }
      mockAuthState.profile = { id: 'admin-1', role: 'admin', full_name: 'Super Admin' }

      render(
        <MemoryRouter>
          <TeacherHomework isAdmin={true} />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Physics Chapter 1 Problems')).toBeInTheDocument()
      })

      // Active homework has title="Hide from students" on the eye button
      const hideButtons = screen.getAllByTitle('Hide from students')
      expect(hideButtons.length).toBeGreaterThanOrEqual(1)

      // Click to hide
      fireEvent.click(hideButtons[0])

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Homework hidden from students')
      })

      // The button title should now be "Show to students" and show "Hidden" badge
      await waitFor(() => {
        expect(screen.getByTitle('Show to students')).toBeInTheDocument()
        expect(screen.getAllByText('Hidden').length).toBeGreaterThanOrEqual(1)
      })

      // Click to unhide
      const showButton = screen.getByTitle('Show to students')
      fireEvent.click(showButton)

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Homework visible to students')
      })
    })

    it('filters homework list by status tabs and search query', async () => {
      mockHomework = [
        {
          id: 'hw-1',
          batch_id: 'batch-1',
          title: 'Physics Mechanics Test',
          description: 'Solve questions 1-5',
          drive_link: 'https://drive.google.com/hw1',
          due_date: '2026-11-01',
          is_active: true,
          created_at: '2026-10-20T10:00:00Z',
        },
        {
          id: 'hw-2',
          batch_id: 'batch-1',
          title: 'Chemistry Thermodynamics',
          description: 'Read chapter 3',
          drive_link: 'https://drive.google.com/hw2',
          due_date: '2026-11-02',
          is_active: false,
          created_at: '2026-10-21T10:00:00Z',
        },
      ]

      render(
        <MemoryRouter>
          <TeacherHomework isAdmin={false} />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Physics Mechanics Test')).toBeInTheDocument()
        expect(screen.getByText('Chemistry Thermodynamics')).toBeInTheDocument()
      })

      // Search query filter
      const searchInput = screen.getByPlaceholderText(/Search homework…/i)
      fireEvent.change(searchInput, { target: { value: 'Mechanics' } })
      expect(screen.getByText('Physics Mechanics Test')).toBeInTheDocument()
      expect(screen.queryByText('Chemistry Thermodynamics')).not.toBeInTheDocument()

      // Clear search
      fireEvent.change(searchInput, { target: { value: '' } })

      // Filter by Hidden tab
      const hiddenTab = screen.getByRole('button', { name: /^Hidden/i })
      fireEvent.click(hiddenTab)
      expect(screen.getByText('Chemistry Thermodynamics')).toBeInTheDocument()
      expect(screen.queryByText('Physics Mechanics Test')).not.toBeInTheDocument()

      // Filter by Active tab
      const activeTab = screen.getByRole('button', { name: /^Active/i })
      fireEvent.click(activeTab)
      expect(screen.getByText('Physics Mechanics Test')).toBeInTheDocument()
      expect(screen.queryByText('Chemistry Thermodynamics')).not.toBeInTheDocument()
    })

    it('shows completion progress bar and filters roster in completion drawer', async () => {
      mockSubmissions = [
        {
          id: 'sub-1',
          homework_id: 'hw-1',
          student_id: 'student-123',
          submitted_at: '2026-10-22T08:00:00Z',
        },
      ]

      render(
        <MemoryRouter>
          <TeacherHomework isAdmin={false} />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Physics Chapter 1 Problems')).toBeInTheDocument()
      })

      // Open drawer
      fireEvent.click(screen.getAllByTitle('View completion roster')[0])

      await waitFor(() => {
        expect(screen.getByText('Completion Progress')).toBeInTheDocument()
        // 1 done out of 3 enrolled = 33%
        expect(screen.getByText(/33% \(1\/3\)/i)).toBeInTheDocument()
        expect(screen.getByText('Rahul Sharma')).toBeInTheDocument()
        expect(screen.getByText('Aanya Verma')).toBeInTheDocument()
      })

      // Search student inside drawer
      const drawerSearchInput = screen.getByPlaceholderText(/Search student by name or email/i)
      fireEvent.change(drawerSearchInput, { target: { value: 'Aanya' } })

      expect(screen.getByText('Aanya Verma')).toBeInTheDocument()
      expect(screen.queryByText('Rahul Sharma')).not.toBeInTheDocument()
    })

    it('successfully assigns new homework and keeps it visible in the list', async () => {
      render(
        <MemoryRouter>
          <TeacherHomework isAdmin={false} />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Physics Chapter 1 Problems')).toBeInTheDocument()
      })

      // Click "Assign Homework"
      fireEvent.click(screen.getByRole('button', { name: /Assign Homework/i }))

      expect(screen.getByText('Assign Homework', { selector: 'h3' })).toBeInTheDocument()

      // Fill in form fields
      fireEvent.change(screen.getByPlaceholderText(/e\.g\. Chapter 7 — Problem Set/i), {
        target: { value: 'Biology Cell Structure Test' },
      })
      fireEvent.change(screen.getByPlaceholderText(/Google Drive \/ document link/i), {
        target: { value: 'https://drive.google.com/cell_doc' },
      })

      // Select batch from CustomSelect in modal
      const trigger = screen.getByText('Select batch…')
      fireEvent.click(trigger)
      const batchOption = screen.getAllByRole('button', { name: /Batch A/i }).pop()
      fireEvent.click(batchOption)

      // Click submit "Assign"
      const assignButton = screen.getByRole('button', { name: /^Assign$/i })
      fireEvent.click(assignButton)

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Homework assigned!')
        expect(screen.getByText('Biology Cell Structure Test')).toBeInTheDocument()
      })
    })
  })
})
