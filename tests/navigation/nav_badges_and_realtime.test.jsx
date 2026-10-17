import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// Mock doubtService
vi.mock('../../src/services/doubtService', () => ({
  countPendingDoubts: vi.fn(),
}))

import { countPendingDoubts } from '../../src/services/doubtService'

// Dynamic mock store for supabase
let mockStore = {
  messages: [],
  notifications: [],
  notification_reads: [],
  live_classes: [],
  homework: [],
  homework_submissions: [],
  fee_records: [],
  student_profiles: [],
}

let activeRealtimeHandlers = []

vi.mock('../../src/lib/supabase', () => {
  return {
    supabase: {
      from: (table) => {
        let filterConditions = []
        let isCount = false
        let isHead = false

        const builder = {
          select(_fields, opts) {
            if (opts?.count === 'exact') isCount = true
            if (opts?.head) isHead = true
            return builder
          },
          eq(col, val) {
            filterConditions.push({ col, op: 'eq', val })
            return builder
          },
          is(col, val) {
            filterConditions.push({ col, op: 'is', val })
            return builder
          },
          or(expr) {
            filterConditions.push({ op: 'or', expr })
            return builder
          },
          order() {
            return builder
          },
          limit() {
            return builder
          },
          maybeSingle() {
            return builder.then((res) => ({
              data: res.data?.[0] || null,
              error: res.error || null,
            }))
          },
          then(resolve) {
            const tableRows = mockStore[table] || []
            let rows = [...tableRows]

            for (const f of filterConditions) {
              if (f.op === 'eq') {
                rows = rows.filter((r) => r[f.col] === f.val)
              } else if (f.op === 'is') {
                rows = rows.filter((r) => r[f.col] === f.val)
              }
            }

            if (isCount) {
              return Promise.resolve({
                data: isHead ? null : rows,
                count: rows.length,
                error: null,
              }).then(resolve)
            }

            return Promise.resolve({
              data: rows,
              count: rows.length,
              error: null,
            }).then(resolve)
          },
        }
        return builder
      },
      channel: (name) => {
        const chan = {
          name,
          on: (event, filter, callback) => {
            activeRealtimeHandlers.push({ name, event, filter, callback })
            return chan
          },
          subscribe: () => chan,
        }
        return chan
      },
      removeChannel: vi.fn(),
    },
  }
})

import { useNavBadges } from '../../src/hooks/useNavBadges'

describe('useNavBadges Realtime & Navigation Badge Audit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    activeRealtimeHandlers = []
    mockStore = {
      messages: [],
      notifications: [],
      notification_reads: [],
      live_classes: [],
      homework: [],
      homework_submissions: [],
      fee_records: [],
      student_profiles: [],
    }
  })

  it('correctly seeds badges for student with unread items and suppresses dot for active path', async () => {
    mockStore.student_profiles = [{ id: 's1', batch_id: 'batch_alpha' }]
    mockStore.messages = [
      { id: 'm1', receiver_id: 's1', is_read: false },
      { id: 'm2', receiver_id: 's1', is_read: true },
    ]
    mockStore.notifications = [
      { id: 'n1', is_active: true, target_role: 'all', target_batch_id: null },
    ]
    mockStore.live_classes = [
      { id: 'lc1', is_active: true, batch_id: 'batch_alpha' },
    ]
    mockStore.homework = [
      { id: 'hw1', is_active: true, batch_id: 'batch_alpha' },
    ]

    const wrapper = ({ children }) => (
      <MemoryRouter initialEntries={['/student/dashboard']}>
        {children}
      </MemoryRouter>
    )

    const { result } = renderHook(() => useNavBadges('student', 's1'), { wrapper })

    await waitFor(() => {
      expect(result.current['/student/messages']).toBe(true)
      expect(result.current['/student/notifications']).toBe(true)
      expect(result.current['/student/live-class']).toBe(true)
      expect(result.current['/student/homework']).toBe(true)
    })
  })

  it('suppresses the dot if the student is currently on that route', async () => {
    mockStore.student_profiles = [{ id: 's1', batch_id: 'batch_alpha' }]
    mockStore.messages = [{ id: 'm1', receiver_id: 's1', is_read: false }]

    const wrapper = ({ children }) => (
      <MemoryRouter initialEntries={['/student/messages']}>
        {children}
      </MemoryRouter>
    )

    const { result } = renderHook(() => useNavBadges('student', 's1'), { wrapper })

    await waitFor(() => {
      // Because user is on /student/messages, dot should remain false
      expect(result.current['/student/messages']).toBeFalsy()
    })
  })

  it('raises dot when a realtime message INSERT arrives while on another route', async () => {
    mockStore.student_profiles = [{ id: 's1', batch_id: 'batch_alpha' }]
    mockStore.messages = []

    const wrapper = ({ children }) => (
      <MemoryRouter initialEntries={['/student/dashboard']}>
        {children}
      </MemoryRouter>
    )

    const { result } = renderHook(() => useNavBadges('student', 's1'), { wrapper })

    await waitFor(() => {
      expect(result.current['/student/messages']).toBeFalsy()
    })

    // Simulate realtime message insert event
    act(() => {
      const msgHandler = activeRealtimeHandlers.find(
        (h) => h.filter?.table === 'messages' && h.filter?.filter === 'receiver_id=eq.s1'
      )
      if (msgHandler) {
        msgHandler.callback({
          eventType: 'INSERT',
          new: { id: 'm_new', receiver_id: 's1', is_read: false },
        })
      }
    })

    await waitFor(() => {
      expect(result.current['/student/messages']).toBe(true)
    })
  })

  it('seeds teacher badges correctly for unread messages, notifications, and pending doubts', async () => {
    countPendingDoubts.mockResolvedValue(3)
    mockStore.messages = [{ id: 'm1', receiver_id: 't1', is_read: false }]
    mockStore.notifications = [
      { id: 'n1', is_active: true, target_role: 'teacher', target_batch_id: null },
    ]

    const wrapper = ({ children }) => (
      <MemoryRouter initialEntries={['/teacher/dashboard']}>
        {children}
      </MemoryRouter>
    )

    const { result } = renderHook(() => useNavBadges('teacher', 't1'), { wrapper })

    await waitFor(() => {
      expect(result.current['/teacher/messages']).toBe(true)
      expect(result.current['/teacher/notifications']).toBe(true)
      expect(result.current['/teacher/doubts']).toBe(true)
    })
  })

  it('seeds admin badges correctly for pending fees and doubts', async () => {
    countPendingDoubts.mockResolvedValue(5)
    mockStore.fee_records = [
      { id: 'fee1', status: 'pending' },
      { id: 'fee2', status: 'pending' },
    ]
    mockStore.messages = []

    const wrapper = ({ children }) => (
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        {children}
      </MemoryRouter>
    )

    const { result } = renderHook(() => useNavBadges('admin', 'a1'), { wrapper })

    await waitFor(() => {
      expect(result.current['/admin/fees']).toBe(true)
      expect(result.current['/admin/doubts']).toBe(true)
      expect(result.current['/admin/messages']).toBeFalsy()
    })
  })

  it('clears live class dot when live class is deleted or marked inactive', async () => {
    mockStore.student_profiles = [{ id: 's1', batch_id: 'batch_alpha' }]
    mockStore.live_classes = [{ id: 'lc1', is_active: true, batch_id: 'batch_alpha' }]

    const wrapper = ({ children }) => (
      <MemoryRouter initialEntries={['/student/dashboard']}>
        {children}
      </MemoryRouter>
    )

    const { result } = renderHook(() => useNavBadges('student', 's1'), { wrapper })

    await waitFor(() => {
      expect(result.current['/student/live-class']).toBe(true)
    })

    // Now mark inactive via realtime event
    mockStore.live_classes = []
    act(() => {
      const liveHandler = activeRealtimeHandlers.find(
        (h) => h.filter?.table === 'live_classes'
      )
      if (liveHandler) {
        liveHandler.callback({
          eventType: 'UPDATE',
          new: { id: 'lc1', is_active: false },
        })
      }
    })

    await waitFor(() => {
      expect(result.current['/student/live-class']).toBe(false)
    })
  })

  it('refreshes on window focus / visibility change without crashing', async () => {
    mockStore.student_profiles = [{ id: 's1', batch_id: 'batch_alpha' }]
    mockStore.messages = []

    const wrapper = ({ children }) => (
      <MemoryRouter initialEntries={['/student/dashboard']}>
        {children}
      </MemoryRouter>
    )

    const { result } = renderHook(() => useNavBadges('student', 's1'), { wrapper })

    await waitFor(() => {
      expect(result.current['/student/messages']).toBeFalsy()
    })

    // New unread message enters store
    mockStore.messages = [{ id: 'm2', receiver_id: 's1', is_read: false }]

    // Trigger visibilitychange
    act(() => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'visible',
      })
      document.dispatchEvent(new Event('visibilitychange'))
    })

    await waitFor(() => {
      expect(result.current['/student/messages']).toBe(true)
    })
  })
})
