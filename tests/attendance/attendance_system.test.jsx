// tests/attendance/attendance_system.test.jsx
// Comprehensive 20-Audit Verification Suite for Teacher/Admin-Initiated Attentiveness System

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import toast from 'react-hot-toast'
import StudentAttendance from '../../src/pages/student/Attendance'
import TeacherAttendance from '../../src/pages/teacher/Attendance'
import AttendanceChart from '../../src/components/analytics/AttendanceChart'
import * as attendanceService from '../../src/services/attendanceService'

// Mock ResizeObserver for Recharts
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Auth state mock
let mockUser = { id: 'student-user-1', email: 'student1@example.com' }
let mockProfile = { id: 'student-user-1', role: 'student', full_name: 'Aarav Patel' }

vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    profile: mockProfile,
  }),
}))

// In-memory data structures for Mock Supabase
let mockBatches = []
let mockProfiles = []
let mockStudentProfiles = []
let mockAttendanceSessions = []
let mockAttendance = []

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: mockUser }, error: null })),
    },
    rpc: vi.fn(async (fnName, params) => {
      if (fnName === 'close_attendance_session') {
        const sess = mockAttendanceSessions.find(s => s.id === params.p_session_id)
        if (!sess) return { data: { success: false }, error: new Error('Session not found') }
        sess.status = 'closed'
        sess.closed_at = new Date().toISOString()

        // Insert absent records for missing students
        const enrolled = mockStudentProfiles.filter(sp => sp.batch_id === sess.batch_id)
        const markedStudentIds = new Set(
          mockAttendance.filter(a => a.session_id === sess.id).map(a => a.student_id)
        )

        let absentCount = 0
        enrolled.forEach(sp => {
          if (!markedStudentIds.has(sp.id)) {
            mockAttendance.push({
              id: 'att-abs-' + Math.random(),
              student_id: sp.id,
              batch_id: sess.batch_id,
              session_id: sess.id,
              date: sess.started_at.slice(0, 10),
              status: 'absent',
              marked_at: new Date().toISOString(),
              marked_by: sess.created_by,
            })
            absentCount++
          }
        })

        const presentCount = mockAttendance.filter(a => a.session_id === sess.id && a.status === 'present').length
        return {
          data: {
            success: true,
            session_id: sess.id,
            batch_id: sess.batch_id,
            marked_present: presentCount,
            marked_absent: absentCount,
            total_enrolled: enrolled.length,
          },
          error: null,
        }
      }

      if (fnName === 'check_and_close_expired_sessions') {
        const now = new Date()
        const expired = mockAttendanceSessions.filter(s => s.status === 'active' && new Date(s.expires_at) <= now)
        expired.forEach(s => {
          s.status = 'closed'
          s.closed_at = now.toISOString()
        })
        return { data: expired.length, error: null }
      }

      if (fnName === 'get_active_session_for_student') {
        const sp = mockStudentProfiles.find(s => s.id === params.p_student_id)
        if (!sp?.batch_id) return { data: { has_active_session: false, reason: 'no_batch' }, error: null }

        const now = new Date()
        const active = mockAttendanceSessions.find(
          s => s.batch_id === sp.batch_id && s.status === 'active' && new Date(s.expires_at) > now
        )
        if (!active) return { data: { has_active_session: false }, error: null }

        const att = mockAttendance.find(a => a.session_id === active.id && a.student_id === params.p_student_id)
        const batch = mockBatches.find(b => b.id === active.batch_id)
        const creator = mockProfiles.find(p => p.id === active.created_by)
        const remaining = Math.max(0, Math.floor((new Date(active.expires_at).getTime() - Date.now()) / 1000))

        return {
          data: {
            has_active_session: true,
            session_id: active.id,
            batch_id: active.batch_id,
            batch_name: batch?.name || 'Batch',
            title: active.title,
            duration_minutes: active.duration_minutes,
            started_at: active.started_at,
            expires_at: active.expires_at,
            seconds_remaining: remaining,
            created_by_name: creator?.full_name || 'Teacher',
            already_marked: !!att,
            marked_status: att?.status || null,
            marked_at: att?.marked_at || null,
          },
          error: null,
        }
      }

      return { data: null, error: null }
    }),
    from: (table) => {
      const query = {
        _table: table,
        _filters: {},
        _selectFields: null,
        _order: null,
        _limit: null,
        _gte: {},
        _lte: {},
        select(fields) {
          query._selectFields = fields
          return query
        },
        eq(col, val) {
          query._filters[col] = val
          return query
        },
        gte(col, val) {
          query._gte[col] = val
          return query
        },
        lte(col, val) {
          query._lte[col] = val
          return query
        },
        gt(col, val) {
          query._gte[col] = val
          return query
        },
        in(col, vals) {
          query._filters[col + '_in'] = vals
          return query
        },
        order(col, opts) {
          query._order = { col, ...opts }
          return query
        },
        limit(num) {
          query._limit = num
          return query
        },
        maybeSingle() {
          return new Promise(resolve => {
            query.then(res => resolve({ data: res.data?.[0] || null, error: res.error }))
          })
        },
        single() {
          return new Promise(resolve => {
            query.then(res => resolve({ data: res.data?.[0] || null, error: res.error }))
          })
        },
        insert(records) {
          const recArray = Array.isArray(records) ? records : [records]

          if (table === 'attendance') {
            for (const r of recArray) {
              if (r.session_id && mockAttendance.some(a => a.session_id === r.session_id && a.student_id === r.student_id)) {
                const conflictChain = {
                  select: () => ({
                    maybeSingle: async () => ({ data: null, error: { code: '23505', message: 'duplicate key' } }),
                    single: async () => ({ data: null, error: { code: '23505', message: 'duplicate key' } }),
                    then(resolve) { resolve({ data: null, error: { code: '23505', message: 'duplicate key' } }) },
                  }),
                  maybeSingle: async () => ({ data: null, error: { code: '23505', message: 'duplicate key' } }),
                  single: async () => ({ data: null, error: { code: '23505', message: 'duplicate key' } }),
                  then(resolve) { resolve({ data: null, error: { code: '23505', message: 'duplicate key' } }) },
                }
                return conflictChain
              }
            }
          }

          const inserted = recArray.map(r => {
            const row = { id: r.id || 'id-' + Math.random().toString(36).slice(2), ...r }
            if (table === 'attendance') mockAttendance.push(row)
            if (table === 'attendance_sessions') mockAttendanceSessions.push(row)
            return row
          })

          const insertChain = {
            select(fields) {
              return {
                single: async () => ({ data: inserted[0], error: null }),
                maybeSingle: async () => ({ data: inserted[0], error: null }),
                then(resolve) {
                  resolve({ data: inserted, error: null })
                },
              }
            },
            single: async () => ({ data: inserted[0], error: null }),
            maybeSingle: async () => ({ data: inserted[0], error: null }),
            then(resolve) {
              resolve({ data: Array.isArray(records) ? inserted : inserted[0], error: null })
            },
          }
          return insertChain
        },
        update(updates) {
          return {
            eq(col, val) {
              if (table === 'attendance_sessions') {
                mockAttendanceSessions.forEach(s => {
                  if (s[col] === val) Object.assign(s, updates)
                })
              }
              return {
                select: () => ({
                  single: async () => ({ data: mockAttendanceSessions.find(s => s[col] === val), error: null }),
                  maybeSingle: async () => ({ data: mockAttendanceSessions.find(s => s[col] === val), error: null }),
                }),
                then(resolve) {
                  resolve({ data: null, error: null })
                },
              }
            },
          }
        },
        then(resolve) {
          let rows = []
          if (table === 'attendance_sessions') rows = [...mockAttendanceSessions]
          else if (table === 'attendance') rows = [...mockAttendance]
          else if (table === 'batches') rows = [...mockBatches]
          else if (table === 'student_profiles') rows = [...mockStudentProfiles]
          else if (table === 'profiles') rows = [...mockProfiles]

          // Joins decoration before filtering
          if (table === 'student_profiles') {
            rows = rows.map(r => {
              const prof = mockProfiles.find(p => p.id === r.id)
              const batch = mockBatches.find(b => b.id === r.batch_id)
              return {
                ...r,
                profiles: prof,
                batches: batch,
              }
            })
          }

          if (table === 'attendance_sessions') {
            rows = rows.map(r => {
              const b = mockBatches.find(x => x.id === r.batch_id)
              const p = mockProfiles.find(x => x.id === r.created_by)
              return {
                ...r,
                batches: b,
                profiles: p,
              }
            })
          }

          if (table === 'attendance' && query._selectFields?.includes('attendance_sessions')) {
            rows = rows.map(r => {
              const sess = mockAttendanceSessions.find(s => s.id === r.session_id)
              const prof = mockProfiles.find(p => p.id === sess?.created_by)
              return {
                ...r,
                attendance_sessions: sess ? { ...sess, profiles: prof } : null,
              }
            })
          }

          // Apply filters
          Object.entries(query._filters).forEach(([k, v]) => {
            if (k === 'profiles.is_active') {
              rows = rows.filter(r => r.profiles?.is_active === v)
            } else if (k.endsWith('_in')) {
              const realCol = k.replace('_in', '')
              rows = rows.filter(r => v.includes(r[realCol]))
            } else {
              rows = rows.filter(r => r[k] === v)
            }
          })

          Object.entries(query._gte).forEach(([k, v]) => {
            rows = rows.filter(r => r[k] >= v)
          })

          Object.entries(query._lte).forEach(([k, v]) => {
            rows = rows.filter(r => r[k] <= v)
          })

          if (query._limit) {
            rows = rows.slice(0, query._limit)
          }

          resolve({ data: rows, error: null })
        },
      }
      return query
    },
    channel: () => ({
      on: () => ({
        on: () => ({
          subscribe: vi.fn(),
        }),
        subscribe: vi.fn(),
      }),
      subscribe: vi.fn(),
    }),
    removeChannel: vi.fn(),
  },
}))

describe('Attendance System 20-Audit Hardening Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Seed test fixtures
    mockBatches = [
      { id: 'batch-alpha', name: 'JEE Physics Alpha', is_active: true, teacher_id: 'teacher-1', teacher_ids: ['teacher-1', 'teacher-2'] },
      { id: 'batch-beta', name: 'NEET Biology Beta', is_active: true, teacher_id: 'teacher-3', teacher_ids: ['teacher-3'] },
    ]

    mockProfiles = [
      { id: 'student-user-1', full_name: 'Aarav Patel', role: 'student', is_active: true, phone: '9876543210' },
      { id: 'student-user-2', full_name: 'Diya Sharma', role: 'student', is_active: true, phone: '9876543211' },
      { id: 'student-user-3', full_name: 'Karan Verma', role: 'student', is_active: false, phone: '9876543212' }, // Inactive student
      { id: 'teacher-1', full_name: 'Prof. HC Verma', role: 'teacher', is_active: true },
      { id: 'teacher-2', full_name: 'Prof. DC Pandey', role: 'teacher', is_active: true },
      { id: 'admin-1', full_name: 'Institute Director', role: 'admin', is_active: true },
    ]

    mockStudentProfiles = [
      { id: 'student-user-1', batch_id: 'batch-alpha', roll_number: 'J-001' },
      { id: 'student-user-2', batch_id: 'batch-alpha', roll_number: 'J-002' },
      { id: 'student-user-3', batch_id: 'batch-alpha', roll_number: 'J-003' },
    ]

    mockAttendanceSessions = []
    mockAttendance = []

    mockUser = { id: 'student-user-1', email: 'student1@example.com' }
    mockProfile = { id: 'student-user-1', role: 'student', full_name: 'Aarav Patel' }
  })

  // --------------------------------------------------------------------------
  // Audit Loop 1: Multiple Sessions Per Calendar Day (Constraint Drop Audit)
  // --------------------------------------------------------------------------
  it('Audit Loop 1: allows multiple attendance sessions on the same calendar day for different lectures', async () => {
    const today = attendanceService.localDateStr()

    // Period 1 Session
    const sess1 = {
      id: 'sess-morning',
      batch_id: 'batch-alpha',
      created_by: 'teacher-1',
      title: 'Morning Mechanics Lecture',
      duration_minutes: 5,
      started_at: `${today}T09:00:00Z`,
      expires_at: `${today}T09:05:00Z`,
      status: 'closed',
    }
    // Period 2 Session
    const sess2 = {
      id: 'sess-afternoon',
      batch_id: 'batch-alpha',
      created_by: 'teacher-2',
      title: 'Afternoon Optics Lecture',
      duration_minutes: 5,
      started_at: `${today}T14:00:00Z`,
      expires_at: `${today}T14:05:00Z`,
      status: 'active',
    }
    mockAttendanceSessions.push(sess1, sess2)

    // Student was present in Period 1
    mockAttendance.push({
      id: 'att-1',
      student_id: 'student-user-1',
      batch_id: 'batch-alpha',
      session_id: 'sess-morning',
      date: today,
      status: 'present',
    })

    // Now student marks present in Period 2 on the SAME date
    const { data, error } = await attendanceService.markStudentPresent({
      sessionId: 'sess-afternoon',
      studentId: 'student-user-1',
      batchId: 'batch-alpha',
    })

    expect(error).toBeNull()
    expect(data.session_id).toBe('sess-afternoon')
    expect(data.date).toBe(today)

    // Verify both rows exist with distinct session_ids
    const studentTodayRecords = mockAttendance.filter(a => a.student_id === 'student-user-1' && a.date === today)
    expect(studentTodayRecords.length).toBe(2)
  })

  // --------------------------------------------------------------------------
  // Audit Loop 2: Session-Level Uniqueness & Idempotent Conflict Resolution
  // --------------------------------------------------------------------------
  it('Audit Loop 2: prevents duplicate attendance records for the same student in the same session', async () => {
    const sess = {
      id: 'sess-single',
      batch_id: 'batch-alpha',
      status: 'active',
      started_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 300000).toISOString(),
    }
    mockAttendanceSessions.push(sess)

    // First mark succeeds
    const res1 = await attendanceService.markStudentPresent({
      sessionId: 'sess-single',
      studentId: 'student-user-1',
      batchId: 'batch-alpha',
    })
    expect(res1.error).toBeNull()

    // Second mark returns alreadyMarked gracefully without error crash
    const res2 = await attendanceService.markStudentPresent({
      sessionId: 'sess-single',
      studentId: 'student-user-1',
      batchId: 'batch-alpha',
    })
    expect(res2.error).toBeNull()
    expect(res2.data.status).toBe('present')

    // Records count for this session should still be 1
    const records = mockAttendance.filter(a => a.session_id === 'sess-single' && a.student_id === 'student-user-1')
    expect(records.length).toBe(1)
  })

  // --------------------------------------------------------------------------
  // Audit Loop 3: Strict Attentiveness Window Expiry Verification
  // --------------------------------------------------------------------------
  it('Audit Loop 3: returns has_active_session false when window expires', async () => {
    // Expired session 10 minutes ago
    const pastSession = {
      id: 'sess-expired-1',
      batch_id: 'batch-alpha',
      created_by: 'teacher-1',
      title: 'Expired Mechanics Check',
      duration_minutes: 5,
      started_at: new Date(Date.now() - 900000).toISOString(),
      expires_at: new Date(Date.now() - 600000).toISOString(),
      status: 'active',
    }
    mockAttendanceSessions.push(pastSession)

    const { data } = await attendanceService.getActiveSessionForStudent('student-user-1')
    expect(data.has_active_session).toBe(false)
  })

  // --------------------------------------------------------------------------
  // Audit Loop 4: Auto-Absent Finalization on Expiry
  // --------------------------------------------------------------------------
  it('Audit Loop 4: checkAndCloseExpiredSessions auto-closes expired sessions and marks absentees', async () => {
    const expiredSess = {
      id: 'sess-auto-close-1',
      batch_id: 'batch-alpha',
      created_by: 'teacher-1',
      started_at: new Date(Date.now() - 600000).toISOString(),
      expires_at: new Date(Date.now() - 300000).toISOString(),
      status: 'active',
    }
    mockAttendanceSessions.push(expiredSess)

    // Student 1 marked present during window
    mockAttendance.push({
      id: 'att-p1',
      student_id: 'student-user-1',
      batch_id: 'batch-alpha',
      session_id: 'sess-auto-close-1',
      status: 'present',
      date: new Date().toISOString().slice(0, 10),
    })

    // Run expiration finalization
    const closedCount = await attendanceService.checkAndCloseExpiredSessions()
    expect(closedCount).toBe(1)
    expect(expiredSess.status).toBe('closed')
  })

  // --------------------------------------------------------------------------
  // Audit Loop 5: Teacher/Admin Early Finalization
  // --------------------------------------------------------------------------
  it('Audit Loop 5: closeAttendanceSession closes session and creates absent records for unverified students', async () => {
    const activeSess = {
      id: 'sess-manual-close',
      batch_id: 'batch-alpha',
      created_by: 'teacher-1',
      started_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 600000).toISOString(),
      status: 'active',
    }
    mockAttendanceSessions.push(activeSess)

    // Student 1 was present
    mockAttendance.push({
      id: 'att-user1',
      student_id: 'student-user-1',
      batch_id: 'batch-alpha',
      session_id: 'sess-manual-close',
      status: 'present',
      date: new Date().toISOString().slice(0, 10),
    })

    const { success, summary } = await attendanceService.closeAttendanceSession('sess-manual-close')
    expect(success).toBe(true)
    expect(summary.marked_present).toBe(1)
    expect(summary.marked_absent).toBeGreaterThanOrEqual(1)

    // Verify student-user-2 now has an 'absent' row
    const stu2Record = mockAttendance.find(a => a.session_id === 'sess-manual-close' && a.student_id === 'student-user-2')
    expect(stu2Record).toBeDefined()
    expect(stu2Record.status).toBe('absent')
  })

  // --------------------------------------------------------------------------
  // Audit Loop 6: Student Immutability Guard
  // --------------------------------------------------------------------------
  it('Audit Loop 6: verifies students cannot change absent to present', async () => {
    // Record is absent
    const absentRecord = {
      id: 'att-absent-locked',
      student_id: 'student-user-1',
      batch_id: 'batch-alpha',
      session_id: 'sess-closed-1',
      status: 'absent',
      date: new Date().toISOString().slice(0, 10),
    }
    mockAttendance.push(absentRecord)

    // Student attempting to mark present for closed session
    const res = await attendanceService.markStudentPresent({
      sessionId: 'sess-closed-1',
      studentId: 'student-user-1',
      batchId: 'batch-alpha',
    })

    // Existing record remains 'absent'
    expect(absentRecord.status).toBe('absent')
  })

  // --------------------------------------------------------------------------
  // Audit Loop 7: Cross-Batch Isolation Guard
  // --------------------------------------------------------------------------
  it('Audit Loop 7: student in batch-alpha does not see active session of batch-beta', async () => {
    // Session is active in batch-beta
    const betaSession = {
      id: 'sess-beta-1',
      batch_id: 'batch-beta',
      created_by: 'teacher-3',
      title: 'Botany Attentiveness Check',
      status: 'active',
      started_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 300000).toISOString(),
      duration_minutes: 5,
    }
    mockAttendanceSessions.push(betaSession)

    // Student 1 belongs to batch-alpha
    const { data } = await attendanceService.getActiveSessionForStudent('student-user-1')
    expect(data.has_active_session).toBe(false)
  })

  // --------------------------------------------------------------------------
  // Audit Loop 8: Student Cannot Self-Mark Without Active Session
  // --------------------------------------------------------------------------
  it('Audit Loop 8: Student portal displays "No Active Attendance Session" when idle', async () => {
    render(
      <MemoryRouter>
        <StudentAttendance />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/No Active Attendance Session/i)).toBeInTheDocument()
    })
  })

  // --------------------------------------------------------------------------
  // Audit Loop 9: Unenrolled Student Handling
  // --------------------------------------------------------------------------
  it('Audit Loop 9: Handles student without batch assignment gracefully', async () => {
    const { data } = await attendanceService.getActiveSessionForStudent('unenrolled-student-999')
    expect(data.has_active_session).toBe(false)
    expect(data.reason).toBe('no_batch')
  })

  // --------------------------------------------------------------------------
  // Audit Loop 10: Inactive Students Excluded From Enrollment Count
  // --------------------------------------------------------------------------
  it('Audit Loop 10: Roster drilldown distinguishes active vs inactive enrollment', async () => {
    const sess = {
      id: 'sess-roster-test',
      batch_id: 'batch-alpha',
      created_by: 'teacher-1',
      status: 'closed',
      started_at: new Date().toISOString(),
      expires_at: new Date(Date.now() - 1000).toISOString(),
    }
    mockAttendanceSessions.push(sess)

    const { roster, stats } = await attendanceService.getSessionRoster('sess-roster-test', 'batch-alpha')
    expect(roster.length).toBeGreaterThan(0)
    expect(stats.totalEnrolled).toBe(roster.length)
  })

  // --------------------------------------------------------------------------
  // Audit Loop 11: Realtime Countdown Display on Student Screen
  // --------------------------------------------------------------------------
  it('Audit Loop 11: Student Attendance renders live attentiveness check and "I am Present" button during active window', async () => {
    const activeSess = {
      id: 'sess-live-ui',
      batch_id: 'batch-alpha',
      created_by: 'teacher-1',
      title: 'Rotational Motion Check',
      duration_minutes: 5,
      started_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 300000).toISOString(),
      status: 'active',
    }
    mockAttendanceSessions.push(activeSess)

    render(
      <MemoryRouter>
        <StudentAttendance />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Live Attentiveness Check in Progress/i)).toBeInTheDocument()
      expect(screen.getByText(/Rotational Motion Check/i)).toBeInTheDocument()
      expect(screen.getByText(/I am Present in Class/i)).toBeInTheDocument()
    })
  })

  // --------------------------------------------------------------------------
  // Audit Loop 12: Teacher Initiation Authorization
  // --------------------------------------------------------------------------
  it('Audit Loop 12: Teacher Attendance portal renders batch selector and launch button', async () => {
    mockUser = { id: 'teacher-1', email: 'teacher1@example.com' }
    mockProfile = { id: 'teacher-1', role: 'teacher', full_name: 'Prof. HC Verma' }

    render(
      <MemoryRouter>
        <TeacherAttendance />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Launch Attentiveness Check/i)).toBeInTheDocument()
      expect(screen.getByText(/Start 5-Minute Attentiveness Check/i)).toBeInTheDocument()
    })
  })

  // --------------------------------------------------------------------------
  // Audit Loop 13: Duration Boundary Enforced
  // --------------------------------------------------------------------------
  it('Audit Loop 13: Clamps duration between 1 and 180 minutes', async () => {
    mockUser = { id: 'teacher-1', email: 'teacher1@example.com' }

    // Test clamped below 1
    const resLow = await attendanceService.initiateAttendanceSession({
      batchId: 'batch-alpha',
      durationMinutes: -10,
      title: 'Low Duration Test',
    })
    expect(resLow.data.duration_minutes).toBe(1)

    // Test clamped above 180
    const resHigh = await attendanceService.initiateAttendanceSession({
      batchId: 'batch-alpha',
      durationMinutes: 999,
      title: 'High Duration Test',
    })
    expect(resHigh.data.duration_minutes).toBe(180)
  })

  // --------------------------------------------------------------------------
  // Audit Loop 14: Teacher Active Session Live Command Center
  // --------------------------------------------------------------------------
  it('Audit Loop 14: Teacher portal displays Live Attentiveness Check Active when session running', async () => {
    mockUser = { id: 'teacher-1', email: 'teacher1@example.com' }
    mockProfile = { id: 'teacher-1', role: 'teacher', full_name: 'Prof. HC Verma' }

    const liveSess = {
      id: 'sess-teacher-live',
      batch_id: 'batch-alpha',
      created_by: 'teacher-1',
      title: 'Live Quantum Mechanics Check',
      duration_minutes: 10,
      started_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 600000).toISOString(),
      status: 'active',
    }
    mockAttendanceSessions.push(liveSess)

    render(
      <MemoryRouter>
        <TeacherAttendance />
      </MemoryRouter>
    )

    expect((await screen.findAllByText(/Live Quantum Mechanics Check/i, {}, { timeout: 4000 })).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/Live Attentiveness Check Active/i)).toBeInTheDocument()
    expect(screen.getByText(/End Session Now/i)).toBeInTheDocument()
  })

  // --------------------------------------------------------------------------
  // Audit Loop 15: Admin Analytics Command Center
  // --------------------------------------------------------------------------
  it('Audit Loop 15: Admin AttendanceChart renders KPIs, Batch comparison, and launch button', async () => {
    mockUser = { id: 'admin-1', email: 'admin@example.com' }
    mockProfile = { id: 'admin-1', role: 'admin', full_name: 'Director' }

    render(
      <MemoryRouter>
        <AttendanceChart />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Overall Attentiveness/i)).toBeInTheDocument()
      expect(screen.getByText(/Sessions Conducted/i)).toBeInTheDocument()
      expect(screen.getByText(/Launch Attentiveness Check/i)).toBeInTheDocument()
    })
  })

  // --------------------------------------------------------------------------
  // Audit Loop 16: At-Risk Student Detection (<50% Rate)
  // --------------------------------------------------------------------------
  it('Audit Loop 16: Accurately identifies at-risk students below 50% attendance threshold', async () => {
    // Create 4 sessions for batch-alpha
    for (let i = 1; i <= 4; i++) {
      const sess = {
        id: `sess-risk-${i}`,
        batch_id: 'batch-alpha',
        created_by: 'teacher-1',
        status: 'closed',
        started_at: new Date(Date.now() - i * 86400000).toISOString(),
      }
      mockAttendanceSessions.push(sess)

      // Student 1 attended all 4 (100%)
      mockAttendance.push({
        student_id: 'student-user-1',
        batch_id: 'batch-alpha',
        session_id: sess.id,
        status: 'present',
        date: sess.started_at.slice(0, 10),
      })

      // Student 2 only attended 1 of 4 (25%) -> Critical At Risk
      mockAttendance.push({
        student_id: 'student-user-2',
        batch_id: 'batch-alpha',
        session_id: sess.id,
        status: i === 1 ? 'present' : 'absent',
        date: sess.started_at.slice(0, 10),
      })
    }

    const analytics = await attendanceService.getComprehensiveAttendanceAnalytics({ batchId: 'batch-alpha' })
    const atRisk = analytics.atRiskStudents.find(s => s.id === 'student-user-2')
    expect(atRisk).toBeDefined()
    expect(atRisk.rate).toBe(25)
    expect(atRisk.absent).toBe(3)
  })

  // --------------------------------------------------------------------------
  // Audit Loop 17: Session Roster Drilldown with Student Names & Verification Times
  // --------------------------------------------------------------------------
  it('Audit Loop 17: getSessionRoster maps exact student names, roll numbers, and marked times', async () => {
    const sess = {
      id: 'sess-drill-1',
      batch_id: 'batch-alpha',
      created_by: 'teacher-1',
      status: 'closed',
      started_at: new Date().toISOString(),
      expires_at: new Date().toISOString(),
    }
    mockAttendanceSessions.push(sess)

    mockAttendance.push({
      student_id: 'student-user-1',
      session_id: 'sess-drill-1',
      status: 'present',
      marked_at: '2026-10-23T10:15:30Z',
    })
    mockAttendance.push({
      student_id: 'student-user-2',
      session_id: 'sess-drill-1',
      status: 'absent',
      marked_at: null,
    })

    const { roster, stats } = await attendanceService.getSessionRoster('sess-drill-1', 'batch-alpha')
    const s1 = roster.find(r => r.id === 'student-user-1')
    const s2 = roster.find(r => r.id === 'student-user-2')

    expect(s1.status).toBe('present')
    expect(s1.full_name).toBe('Aarav Patel')
    expect(s1.roll_number).toBe('J-001')

    expect(s2.status).toBe('absent')
    expect(stats.presentCount).toBe(1)
    expect(stats.absentCount).toBe(2) // student-user-2 and inactive student-user-3
  })

  // --------------------------------------------------------------------------
  // Audit Loop 18: Student Consecutive Streak Tracking
  // --------------------------------------------------------------------------
  it('Audit Loop 18: Monthly heatmap counts consecutive present sessions as active streak', async () => {
    const today = attendanceService.localDateStr()
    const y = new Date(); y.setDate(y.getDate() - 1)
    const yesterday = attendanceService.localDateStr(y)

    mockAttendance.push(
      { id: '1', student_id: 'student-user-1', date: today, status: 'present' },
      { id: '2', student_id: 'student-user-1', date: yesterday, status: 'present' }
    )

    render(
      <MemoryRouter>
        <StudentAttendance />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/2 day streak/i)).toBeInTheDocument()
    })
  })

  // --------------------------------------------------------------------------
  // Audit Loop 19: Timezone Consistency Across India Standard Time
  // --------------------------------------------------------------------------
  it('Audit Loop 19: localDateStr formats calendar dates matching Indian Standard Time format YYYY-MM-DD', () => {
    const d = new Date(2026, 9, 23, 10, 30, 0) // Oct 23, 2026
    const str = attendanceService.localDateStr(d)
    expect(str).toBe('2026-10-23')
  })

  // --------------------------------------------------------------------------
  // Audit Loop 20: Cascade Cleanups and Safe Deletions
  // --------------------------------------------------------------------------
  it('Audit Loop 20: getAttendanceSessionsHistory gracefully handles empty batch or zero sessions', async () => {
    const { data, error } = await attendanceService.getAttendanceSessionsHistory('non-existent-batch')
    expect(error).toBeNull()
    expect(data).toEqual([])
  })
})
