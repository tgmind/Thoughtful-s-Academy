import { useEffect, useRef, useState, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { countPendingDoubts } from '../services/doubtService'

// ─── Pure count helpers with robust try/catch ────────────────────────────────

async function countUnreadMessages(userId) {
  try {
    const { count, error } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .eq('is_read', false)
    if (error) return 0
    return count ?? 0
  } catch {
    return 0
  }
}

// Unread notifications visible to a student (mirrors student/Notifications.jsx)
async function studentNotifUnread(userId, batchId) {
  try {
    const now = new Date()
    const [{ data: notifs, error: notifErr }, { data: reads, error: readsErr }] = await Promise.all([
      supabase
        .from('notifications')
        .select('id, target_role, target_batch_id, target_user_id, scheduled_at, expires_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('notification_reads')
        .select('notification_id')
        .eq('user_id', userId)
        .order('read_at', { ascending: false })
        .limit(50),
    ])

    if (notifErr || readsErr) return 0

    const readSet = new Set((reads ?? []).map((r) => r.notification_id))
    return (notifs ?? []).filter((n) => {
      if (readSet.has(n.id)) return false
      if (n.scheduled_at && new Date(n.scheduled_at) > now) return false
      if (n.expires_at && new Date(n.expires_at) < now) return false
      if (n.target_user_id && n.target_user_id !== userId) return false
      if (n.target_role !== 'all' && n.target_role !== 'student') return false
      if (n.target_batch_id && batchId && n.target_batch_id !== batchId) return false
      if (n.target_batch_id && !batchId) return false
      return true
    }).length
  } catch {
    return 0
  }
}

// Unread notifications visible to a teacher (mirrors teacher InboxTab)
async function teacherNotifUnread(userId) {
  try {
    const now = new Date()
    const [{ data: notifs, error: notifErr }, { data: reads, error: readsErr }] = await Promise.all([
      supabase
        .from('notifications')
        .select('id, target_role, target_batch_id, scheduled_at, expires_at')
        .eq('is_active', true)
        .is('target_batch_id', null)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('notification_reads')
        .select('notification_id')
        .eq('user_id', userId)
        .order('read_at', { ascending: false })
        .limit(50),
    ])

    if (notifErr || readsErr) return 0

    const readSet = new Set((reads ?? []).map((r) => r.notification_id))
    return (notifs ?? []).filter((n) => {
      if (readSet.has(n.id)) return false
      if (n.scheduled_at && new Date(n.scheduled_at) > now) return false
      if (n.expires_at && new Date(n.expires_at) < now) return false
      if (n.target_role !== 'all' && n.target_role !== 'teacher') return false
      return true
    }).length
  } catch {
    return 0
  }
}

// Is there an active live class the student can see?
async function studentLiveActive(batchId) {
  try {
    let q = supabase
      .from('live_classes')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
    if (batchId) q = q.or(`batch_id.is.null,batch_id.eq.${batchId}`)
    else q = q.is('batch_id', null)
    const { count, error } = await q
    if (error) return false
    return (count ?? 0) > 0
  } catch {
    return false
  }
}

// Does the student have active homework they haven't submitted yet?
async function studentHomeworkPending(userId, batchId) {
  if (!batchId) return false
  try {
    const [{ data: hw, error: hwErr }, { data: subs, error: subsErr }] = await Promise.all([
      supabase.from('homework').select('id').eq('batch_id', batchId).eq('is_active', true),
      supabase.from('homework_submissions').select('homework_id').eq('student_id', userId),
    ])
    if (hwErr || subsErr) return false
    const submitted = new Set((subs ?? []).map((s) => s.homework_id))
    return (hw ?? []).some((h) => !submitted.has(h.id))
  } catch {
    return false
  }
}

async function adminPendingFees() {
  try {
    const { count, error } = await supabase
      .from('fee_records')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
    if (error) return 0
    return count ?? 0
  } catch {
    return 0
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────────
//
// Returns a map { [navPath]: boolean }. A `true` value means "show an unseen
// dot on that sidebar item". A dot is raised when something new/unread exists
// for that section and cleared while the user is actively inside that section.
// Everything updates live via Supabase realtime + tab focus & 25s heartbeat sync.

export function useNavBadges(role, userId) {
  const [badges, setBadges] = useState({})
  const location = useLocation()
  const pathRef = useRef(location.pathname)
  pathRef.current = location.pathname
  const studentBatchIdRef = useRef(null)

  const setDot = useCallback((path, on) => {
    setBadges((prev) => (!!prev[path] === !!on ? prev : { ...prev, [path]: !!on }))
  }, [])

  // Raise a dot only if the user isn't already viewing that section.
  const raise = useCallback(
    (path) => {
      if (pathRef.current.startsWith(path)) return
      setDot(path, true)
    },
    [setDot]
  )

  // Clear the dot for whichever section the user is currently viewing,
  // and re-verify previous route if navigating away from an unread section.
  const prevPathRef = useRef(location.pathname)
  useEffect(() => {
    const prev = prevPathRef.current
    const curr = location.pathname
    prevPathRef.current = curr

    // Clear dot for active path
    setBadges((old) => {
      let changed = false
      const next = { ...old }
      for (const path of Object.keys(old)) {
        if (old[path] && curr.startsWith(path)) {
          next[path] = false
          changed = true
        }
      }
      return changed ? next : old
    })

    // If navigating away, re-verify if unread items remain
    if (prev && prev !== curr && userId && role) {
      if (role === 'student') {
        if (prev.startsWith('/student/messages')) {
          countUnreadMessages(userId).then((c) => {
            if (c > 0 && !pathRef.current.startsWith('/student/messages')) {
              setDot('/student/messages', true)
            }
          })
        } else if (prev.startsWith('/student/notifications')) {
          studentNotifUnread(userId, studentBatchIdRef.current).then((c) => {
            if (c > 0 && !pathRef.current.startsWith('/student/notifications')) {
              setDot('/student/notifications', true)
            }
          })
        }
      } else if (role === 'teacher') {
        if (prev.startsWith('/teacher/messages')) {
          countUnreadMessages(userId).then((c) => {
            if (c > 0 && !pathRef.current.startsWith('/teacher/messages')) {
              setDot('/teacher/messages', true)
            }
          })
        } else if (prev.startsWith('/teacher/notifications')) {
          teacherNotifUnread(userId).then((c) => {
            if (c > 0 && !pathRef.current.startsWith('/teacher/notifications')) {
              setDot('/teacher/notifications', true)
            }
          })
        }
      } else if (role === 'admin') {
        if (prev.startsWith('/admin/messages')) {
          countUnreadMessages(userId).then((c) => {
            if (c > 0 && !pathRef.current.startsWith('/admin/messages')) {
              setDot('/admin/messages', true)
            }
          })
        }
      }
    }
  }, [location.pathname, role, userId, setDot])

  useEffect(() => {
    if (!role || !userId) return
    let cancelled = false
    let channel = null
    let pollTimer = null
    const suffix = `${userId}_${Date.now()}`

    // Seed initial dots, skipping any section the user is currently viewing.
    const seed = (map) => {
      if (cancelled) return
      setBadges((prev) => {
        const next = { ...prev }
        for (const [path, on] of Object.entries(map)) {
          next[path] = !!on && !pathRef.current.startsWith(path)
        }
        return next
      })
    }

    // Recompute a single section's dot from a fresh count.
    const refresh = async (path, getCount) => {
      try {
        const c = await getCount()
        if (cancelled) return
        if (c > 0) raise(path)
        else setDot(path, false)
      } catch {
        // Safe no-op on transient failure
      }
    }

    let refreshAll = () => {}

    const init = async () => {
      try {
        if (role === 'student') {
          const { data: sp } = await supabase
            .from('student_profiles')
            .select('batch_id')
            .eq('id', userId)
            .maybeSingle()
          if (cancelled) return
          const batchId = sp?.batch_id ?? null
          studentBatchIdRef.current = batchId

          refreshAll = async () => {
            if (cancelled) return
            const [msg, notif, live, hw] = await Promise.all([
              countUnreadMessages(userId),
              studentNotifUnread(userId, batchId),
              studentLiveActive(batchId),
              studentHomeworkPending(userId, batchId),
            ])
            if (cancelled) return
            seed({
              '/student/messages': msg > 0,
              '/student/notifications': notif > 0,
              '/student/live-class': live,
              '/student/homework': hw,
            })
          }

          await refreshAll()

          channel = supabase
            .channel(`nav_badges_s_${suffix}`)
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'messages', filter: `receiver_id=eq.${userId}` },
              (payload) => {
                if (payload.eventType === 'INSERT') {
                  raise('/student/messages')
                } else {
                  refresh('/student/messages', () => countUnreadMessages(userId).then((c) => c > 0))
                }
              }
            )
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'notifications' },
              () => refresh('/student/notifications', () => studentNotifUnread(userId, batchId))
            )
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'notification_reads', filter: `user_id=eq.${userId}` },
              () => refresh('/student/notifications', () => studentNotifUnread(userId, batchId))
            )
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'live_classes' },
              (payload) => {
                const { eventType, new: newRow } = payload || {}
                if (eventType === 'DELETE' || (newRow && !newRow.is_active)) {
                  setDot('/student/live-class', false)
                } else if (newRow && newRow.is_active) {
                  if (!newRow.batch_id || !batchId || newRow.batch_id === batchId) {
                    raise('/student/live-class')
                  }
                }
                refresh('/student/live-class', () => studentLiveActive(batchId))
              }
            )
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'homework' },
              () => refresh('/student/homework', () => studentHomeworkPending(userId, batchId))
            )
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'homework_submissions',
                filter: `student_id=eq.${userId}`,
              },
              () => refresh('/student/homework', () => studentHomeworkPending(userId, batchId))
            )
            .subscribe()
        } else if (role === 'teacher') {
          refreshAll = async () => {
            if (cancelled) return
            const [msg, notif, doubtsCount] = await Promise.all([
              countUnreadMessages(userId),
              teacherNotifUnread(userId),
              countPendingDoubts('teacher', userId),
            ])
            if (cancelled) return
            seed({
              '/teacher/messages': msg > 0,
              '/teacher/notifications': notif > 0,
              '/teacher/doubts': doubtsCount > 0,
            })
          }

          await refreshAll()

          channel = supabase
            .channel(`nav_badges_t_${suffix}`)
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'messages', filter: `receiver_id=eq.${userId}` },
              (payload) => {
                if (payload.eventType === 'INSERT') {
                  raise('/teacher/messages')
                } else {
                  refresh('/teacher/messages', () => countUnreadMessages(userId).then((c) => c > 0))
                }
              }
            )
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'notifications' },
              () => refresh('/teacher/notifications', () => teacherNotifUnread(userId))
            )
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'notification_reads', filter: `user_id=eq.${userId}` },
              () => refresh('/teacher/notifications', () => teacherNotifUnread(userId))
            )
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'doubts' },
              () => refresh('/teacher/doubts', () => countPendingDoubts('teacher', userId))
            )
            .subscribe()
        } else if (role === 'admin') {
          refreshAll = async () => {
            if (cancelled) return
            const [msg, fees, doubtsCount] = await Promise.all([
              countUnreadMessages(userId),
              adminPendingFees(),
              countPendingDoubts('admin', userId),
            ])
            if (cancelled) return
            seed({
              '/admin/messages': msg > 0,
              '/admin/fees': fees > 0,
              '/admin/doubts': doubtsCount > 0,
            })
          }

          await refreshAll()

          channel = supabase
            .channel(`nav_badges_a_${suffix}`)
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'messages', filter: `receiver_id=eq.${userId}` },
              (payload) => {
                if (payload.eventType === 'INSERT') {
                  raise('/admin/messages')
                } else {
                  refresh('/admin/messages', () => countUnreadMessages(userId).then((c) => c > 0))
                }
              }
            )
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'fee_records' },
              () => refresh('/admin/fees', () => adminPendingFees())
            )
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'doubts' },
              () => refresh('/admin/doubts', () => countPendingDoubts('admin', userId))
            )
            .subscribe()
        }

        // Active 25s heartbeat polling for fallback sync + immediate wake-up on tab focus
        pollTimer = setInterval(() => {
          if (!cancelled && document.visibilityState === 'visible') {
            refreshAll()
          }
        }, 25000)
      } catch (err) {
        console.warn('[useNavBadges] initialization error:', err)
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !cancelled) {
        refreshAll()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('focus', onVisibilityChange)

    init()

    return () => {
      cancelled = true
      if (pollTimer) clearInterval(pollTimer)
      if (channel) supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('focus', onVisibilityChange)
    }
  }, [role, userId, raise, setDot])

  return badges
}
