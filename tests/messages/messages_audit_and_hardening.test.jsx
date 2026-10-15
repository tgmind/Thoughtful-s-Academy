import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import {
  renderMessageContent,
  initials,
  shortTime,
  sepLabel,
  avatarBg,
  isSameCalendarDay,
} from '../../src/utils/messageUtils'
import StudentMessages from '../../src/pages/student/Messages'
import TeacherMessages from '../../src/pages/teacher/Messages'
import AdminMessages from '../../src/pages/admin/AdminMessages'

// Query builder mock for Supabase
function createChainableQueryBuilder(table, getTableData) {
  let filterConditions = []
  let insertData = null
  let updateData = null
  let isDelete = false

  const builder = {
    select(_fields = '*') {
      return builder
    },
    insert(rows) {
      insertData = Array.isArray(rows) ? rows : [rows]
      return builder
    },
    update(data) {
      updateData = data
      return builder
    },
    delete() {
      isDelete = true
      return builder
    },
    eq(col, val) {
      filterConditions.push({ col, op: 'eq', val })
      return builder
    },
    neq(col, val) {
      filterConditions.push({ col, op: 'neq', val })
      return builder
    },
    in(col, vals) {
      filterConditions.push({ col, op: 'in', val: vals })
      return builder
    },
    or(expr) {
      filterConditions.push({ op: 'or', expr })
      return builder
    },
    order(_col, _opts) {
      return builder
    },
    limit(_n) {
      return builder
    },
    single() {
      return builder.then((res) => ({ data: res.data?.[0] || null, error: res.error }))
    },
    maybeSingle() {
      return builder.then((res) => ({ data: res.data?.[0] || null, error: null }))
    },
    then(resolve) {
      const allRows = getTableData(table) || []
      let rows = [...allRows]

      if (insertData) {
        const created = insertData.map((item, idx) => ({
          id: `new-${Date.now()}-${idx}`,
          created_at: new Date().toISOString(),
          is_read: false,
          ...item,
        }))
        allRows.push(...created)
        return Promise.resolve({ data: created, error: null }).then(resolve)
      }

      if (updateData) {
        return Promise.resolve({ data: rows, error: null }).then(resolve)
      }

      if (isDelete) {
        return Promise.resolve({ data: [], error: null }).then(resolve)
      }

      for (const f of filterConditions) {
        if (f.op === 'eq') {
          rows = rows.filter((r) => r[f.col] === f.val)
        } else if (f.op === 'neq') {
          rows = rows.filter((r) => r[f.col] !== f.val)
        } else if (f.op === 'in') {
          rows = rows.filter((r) => f.val.includes(r[f.col]))
        }
      }

      return Promise.resolve({ data: rows, error: null }).then(resolve)
    },
  }
  return builder
}

let mockTableData = {}

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: vi.fn((table) => createChainableQueryBuilder(table, (t) => mockTableData[t])),
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
}

vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => mockAuthState,
}))

describe('Messaging Feature Audit & Hardening Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTableData = {
      profiles: [],
      teacher_profiles: [],
      student_profiles: [],
      batches: [],
      messages: [],
    }
  })

  describe('1. messageUtils: formatting, security and linkification', () => {
    it('linkifies http and https URLs into safe anchor tags', () => {
      const text = 'Join lecture at https://meet.google.com/abc-defg-hij immediately.'
      const rendered = renderMessageContent(text, false)
      expect(Array.isArray(rendered)).toBe(true)
      const link = rendered.find((el) => el?.props?.href === 'https://meet.google.com/abc-defg-hij')
      expect(link).toBeDefined()
      expect(link.props.target).toBe('_blank')
      expect(link.props.rel).toBe('noopener noreferrer')
    })

    it('returns raw text unchanged when no URLs are present', () => {
      const text = 'Hello team, the physics assignment is due tomorrow.'
      expect(renderMessageContent(text, false)).toBe(text)
    })

    it('extracts initials accurately from various name formats', () => {
      expect(initials('Ananya Sharma')).toBe('AS')
      expect(initials('Rahul')).toBe('R')
      expect(initials('Dr. Rajesh Kumar Gupta')).toBe('DR')
      expect(initials('')).toBe('?')
      expect(initials(null)).toBe('?')
    })

    it('handles relative calendar days properly in sepLabel and shortTime', () => {
      const today = new Date().toISOString()
      expect(sepLabel(today)).toBe('Today')
      expect(typeof shortTime(today)).toBe('string')
      expect(isSameCalendarDay(new Date(), new Date())).toBe(true)

      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      expect(sepLabel(yesterday.toISOString())).toBe('Yesterday')
      expect(isSameCalendarDay(new Date(), yesterday)).toBe(false)
    })

    it('generates consistent palette background colors', () => {
      const c1 = avatarBg('Teacher A')
      const c2 = avatarBg('Teacher A')
      expect(c1).toBe(c2)
      expect(typeof c1).toBe('string')
    })
  })

  describe('2. Student Messaging', () => {
    it('supports deep-linking via query parameters to auto-select contact', async () => {
      mockAuthState.user = { id: 'student-1' }
      mockTableData.profiles = [
        { id: 'teacher-10', full_name: 'Prof. HC Verma', role: 'teacher', is_active: true },
        { id: 'admin-1', full_name: 'Super Admin', role: 'admin', is_active: true },
      ]
      mockTableData.messages = [
        {
          id: 'msg-1',
          sender_id: 'teacher-10',
          receiver_id: 'student-1',
          content: 'Welcome to Class 12 Physics!',
          created_at: new Date().toISOString(),
          is_read: false,
          is_broadcast: false,
        },
      ]

      render(
        <MemoryRouter initialEntries={['/student/messages?teacher=teacher-10']}>
          <Routes>
            <Route path="/student/messages" element={<StudentMessages />} />
          </Routes>
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getAllByText('Prof. HC Verma').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Welcome to Class 12 Physics!').length).toBeGreaterThan(0)
      })
    })

    it('displays batch announcement indicator on broadcast messages and renders attachments', async () => {
      mockAuthState.user = { id: 'student-1' }
      mockTableData.profiles = [
        { id: 'teacher-10', full_name: 'Prof. HC Verma', role: 'teacher', is_active: true },
      ]
      mockTableData.messages = [
        {
          id: 'bcast-msg-1',
          sender_id: 'teacher-10',
          receiver_id: 'student-1',
          content: 'Formula sheet uploaded for upcoming mock test.',
          attachment_url: 'https://drive.google.com/file/d/123/view',
          created_at: new Date().toISOString(),
          is_read: true,
          is_broadcast: true,
        },
      ]

      render(
        <MemoryRouter initialEntries={['/student/messages?contact=teacher-10']}>
          <Routes>
            <Route path="/student/messages" element={<StudentMessages />} />
          </Routes>
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Announcement')).toBeInTheDocument()
        expect(screen.getAllByText(/Formula sheet uploaded/).length).toBeGreaterThan(0)
        expect(screen.getByText('View Attachment')).toBeInTheDocument()
      })
    })
  })

  describe('3. Teacher Messaging & Permissions', () => {
    it('disables student messaging composer when can_message_students is false', async () => {
      mockAuthState.user = { id: 'teacher-1' }
      mockTableData.teacher_profiles = [
        { id: 'teacher-1', can_message_students: false },
      ]
      mockTableData.profiles = [
        { id: 'teacher-1', full_name: 'Teacher One', role: 'teacher', is_active: true },
        { id: 'student-99', full_name: 'Pooja Verma', role: 'student', is_active: true },
      ]
      mockTableData.messages = [
        {
          id: 'prev-msg',
          sender_id: 'student-99',
          receiver_id: 'teacher-1',
          content: 'Sir, I had a question on mechanics.',
          created_at: new Date().toISOString(),
          is_read: false,
          is_broadcast: false,
        },
      ]

      render(
        <MemoryRouter initialEntries={['/teacher/messages?student=student-99']}>
          <Routes>
            <Route path="/teacher/messages" element={<TeacherMessages />} />
          </Routes>
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(
          screen.getByText('Student messaging permission is currently disabled by administrator.')
        ).toBeInTheDocument()
      })
      // Input should not be present
      expect(screen.queryByPlaceholderText(/Message Pooja Verma/)).toBeNull()
    })

    it('enables composer and tags broadcast messages with is_broadcast: true and batch_id', async () => {
      mockAuthState.user = { id: 'teacher-1' }
      mockTableData.teacher_profiles = [
        { id: 'teacher-1', can_message_students: true },
      ]
      mockTableData.batches = [
        { id: 'batch-1', name: 'NEET Dropper Batch 2026', subject: 'Biology', teacher_id: 'teacher-1', is_active: true },
      ]
      mockTableData.student_profiles = [
        { id: 'student-1', batch_id: 'batch-1' },
        { id: 'student-2', batch_id: 'batch-1' },
      ]

      render(
        <MemoryRouter initialEntries={['/teacher/messages']}>
          <Routes>
            <Route path="/teacher/messages" element={<TeacherMessages />} />
          </Routes>
        </MemoryRouter>
      )

      // Switch to Broadcast mode
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Broadcast/i })).toBeInTheDocument()
      })
      fireEvent.click(screen.getByRole('button', { name: /Broadcast/i }))

      // Select the batch
      await waitFor(() => {
        expect(screen.getByText('NEET Dropper Batch 2026')).toBeInTheDocument()
      })
      fireEvent.click(screen.getByText('NEET Dropper Batch 2026'))

      // Compose input should be present and enabled
      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/Broadcast message to all students in NEET Dropper Batch 2026/)
        ).toBeInTheDocument()
      })

      const textarea = screen.getByPlaceholderText(/Broadcast message to all students in NEET Dropper Batch 2026/)
      fireEvent.change(textarea, { target: { value: 'Class starts tomorrow at 8 AM sharp!' } })

      const sendBtn = screen.getByRole('button', { name: /Send broadcast/i })
      fireEvent.click(sendBtn)

      await waitFor(() => {
        const bcastEntries = mockTableData.messages.filter((m) => m.is_broadcast === true)
        expect(bcastEntries.length).toBe(2)
        expect(bcastEntries[0].batch_id).toBe('batch-1')
        expect(bcastEntries[0].content).toBe('Class starts tomorrow at 8 AM sharp!')
      })
    })
  })

  describe('4. Admin Messaging & Moderation', () => {
    it('includes Admins, Teachers, and Students tabs and allows messaging other Admins', async () => {
      mockAuthState.user = { id: 'admin-1' }
      mockTableData.profiles = [
        { id: 'admin-2', full_name: 'Co-Administrator Sarah', role: 'admin', is_active: true },
        { id: 'teacher-1', full_name: 'Teacher One', role: 'teacher', is_active: true },
        { id: 'student-1', full_name: 'Student One', role: 'student', is_active: true },
      ]

      render(
        <MemoryRouter initialEntries={['/admin/messages']}>
          <Routes>
            <Route path="/admin/messages" element={<AdminMessages />} />
          </Routes>
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Admins' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Teachers' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Students' })).toBeInTheDocument()
        expect(screen.getByText('Co-Administrator Sarah')).toBeInTheDocument()
      })
    })

    it('renders delete action for admin moderation', async () => {
      mockAuthState.user = { id: 'admin-1' }
      mockTableData.profiles = [
        { id: 'student-1', full_name: 'Rohan Gupta', role: 'student', is_active: true },
      ]
      mockTableData.messages = [
        {
          id: 'msg-mod-1',
          sender_id: 'student-1',
          receiver_id: 'admin-1',
          content: 'Offensive or erroneous message needing moderation',
          created_at: new Date().toISOString(),
          is_read: true,
          is_broadcast: false,
        },
      ]

      render(
        <MemoryRouter initialEntries={['/admin/messages?student=student-1']}>
          <Routes>
            <Route path="/admin/messages" element={<AdminMessages />} />
          </Routes>
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Offensive or erroneous message needing moderation')).toBeInTheDocument()
        expect(screen.getByTitle('Delete message')).toBeInTheDocument()
      })
    })

    it('supports deep-linking via ?teacher= parameter and switches to direct conversation', async () => {
      mockAuthState.user = { id: 'admin-1' }
      mockTableData.profiles = [
        { id: 'teacher-20', full_name: 'Dr. Neha Physics', role: 'teacher', is_active: true },
      ]
      mockTableData.messages = [
        {
          id: 'msg-teach-1',
          sender_id: 'teacher-20',
          receiver_id: 'admin-1',
          content: 'Requesting syllabus review for Batch 2.',
          created_at: new Date().toISOString(),
          is_read: false,
          is_broadcast: false,
        },
      ]

      render(
        <MemoryRouter initialEntries={['/admin/messages?teacher=teacher-20']}>
          <Routes>
            <Route path="/admin/messages" element={<AdminMessages />} />
          </Routes>
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getAllByText('Dr. Neha Physics').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Requesting syllabus review for Batch 2.').length).toBeGreaterThan(0)
      })
    })

    it('supports deep-linking via ?batch= parameter into broadcast mode', async () => {
      mockAuthState.user = { id: 'admin-1' }
      mockTableData.batches = [
        { id: 'batch-99', name: 'JEE Advanced Elite', subject: 'Math', is_active: true },
      ]

      render(
        <MemoryRouter initialEntries={['/admin/messages?batch=batch-99']}>
          <Routes>
            <Route path="/admin/messages" element={<AdminMessages />} />
          </Routes>
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/Broadcast announcement to all students in JEE Advanced Elite/i)
        ).toBeInTheDocument()
      })
    })
  })

  describe('5. Teacher Batch & Broadcast Hardening', () => {
    it('supports deep-linking via ?batch= parameter into broadcast mode for assigned batch', async () => {
      mockAuthState.user = { id: 'teacher-1' }
      mockTableData.teacher_profiles = [
        { id: 'teacher-1', can_message_students: true },
      ]
      mockTableData.batches = [
        { id: 'batch-77', name: 'Foundation Class 10', subject: 'Science', teacher_id: 'teacher-1', is_active: true },
      ]

      render(
        <MemoryRouter initialEntries={['/teacher/messages?batch=batch-77']}>
          <Routes>
            <Route path="/teacher/messages" element={<TeacherMessages />} />
          </Routes>
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/Broadcast message to all students in Foundation Class 10/i)
        ).toBeInTheDocument()
      })
    })

    it('renders delete action on teacher broadcast announcements', async () => {
      mockAuthState.user = { id: 'teacher-1' }
      mockTableData.teacher_profiles = [
        { id: 'teacher-1', can_message_students: true },
      ]
      mockTableData.batches = [
        { id: 'batch-1', name: 'Class 12 Physics', subject: 'Physics', teacher_id: 'teacher-1', is_active: true },
      ]
      mockTableData.messages = [
        {
          id: 'bcast-1',
          batch_id: 'batch-1',
          sender_id: 'teacher-1',
          receiver_id: 'student-1',
          content: 'Test tomorrow at 9 AM',
          created_at: new Date().toISOString(),
          is_broadcast: true,
        },
      ]

      render(
        <MemoryRouter initialEntries={['/teacher/messages?batch=batch-1']}>
          <Routes>
            <Route path="/teacher/messages" element={<TeacherMessages />} />
          </Routes>
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Test tomorrow at 9 AM')).toBeInTheDocument()
        expect(screen.getByTitle('Delete broadcast announcement')).toBeInTheDocument()
      })
    })
  })

  describe('6. Student Self-Deletion Hardening', () => {
    it('renders delete action on student own sent direct messages', async () => {
      mockAuthState.user = { id: 'student-1' }
      mockTableData.profiles = [
        { id: 'teacher-1', full_name: 'Teacher One', role: 'teacher', is_active: true },
      ]
      mockTableData.messages = [
        {
          id: 'msg-stud-1',
          sender_id: 'student-1',
          receiver_id: 'teacher-1',
          content: 'Hello sir, sent accidentally',
          created_at: new Date().toISOString(),
          is_read: false,
          is_broadcast: false,
        },
      ]

      render(
        <MemoryRouter initialEntries={['/student/messages?teacher=teacher-1']}>
          <Routes>
            <Route path="/student/messages" element={<StudentMessages />} />
          </Routes>
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('Hello sir, sent accidentally')).toBeInTheDocument()
        expect(screen.getByTitle('Delete message')).toBeInTheDocument()
      })
    })
  })
})
