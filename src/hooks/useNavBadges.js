import { useEffect, useRef, useState, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// ─── Pure count helpers (no React state) ─────────────────────────────────────

async function countUnreadMessages(userId) {
  const { count } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('receiver_id', userId)
    .eq('is_read', false)
  return count ?? 0
}

// Unread notifications visible to a student (mirrors student/Notifications.jsx).
async function studentNotifUnread(userId, batchId) {
  const now = new Date().toISOString()
  let q = supabase
    .from('notifications')
    .select('id')
    .eq('is_active', true)
    .or('target_role.eq.student,target_role.eq.all')
    .or('scheduled_at.is.null,scheduled_at.lte.' + now)
    .or('expires_at.is.null,expires_at.gte.' + now)
    // 👇 Include notifications targeted directly at this specific student
    .or(`target_user_id.is.null,target_user_id.eq.${userId}`)

  q = batchId
    ? q.or(`target_batch_id.is.null,target_batch_id.eq.${batchId}`)
    : q.is('target_batch_id', null)

  const [{ data: notifs }, { data: reads }] = await Promise.all([
    q,
    supabase.from('notification_reads').select('notification_id').eq('user_id', userId),
  ])
  const readSet = new Set((reads ?? []).map(r => r.notification_id))
  return (notifs ?? []).filter(n => !readSet.has(n.id)).length
}

// Unread notifications visible to a teacher (mirrors teacher InboxTab).
async function teacherNotifUnread(userId) {
  const now = new Date().toISOString()
  const q = supabase
    .from('notifications')
    .select('id')
    .eq('is_active', true)
    .or('target_role.eq.teacher,target_role.eq.all')
    .or('scheduled_at.is.null,scheduled_at.lte.' + now)
    .or('expires_at.is.null,expires_at.gte.' + now)

  const [{ data: notifs }, { data: reads }] = await Promise.all([
    q,
    supabase.from('notification_reads').select('notification_id').eq('user_id', userId),
  ])
  const readSet = new Set((reads ?? []).map(r => r.notification_id))
  return (notifs ?? []).filter(n => !readSet.has(n.id)).length
}

// Is there an active live class the student can see? (mirrors student/LiveClass.jsx)
async function studentLiveActive(batchId) {
  let q = supabase
    .from('live_classes')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
  if (batchId) q = q.or(`batch_id.is.null,batch_id.eq.${batchId}`)
  else         q = q.is('batch_id', null)
  const { count } = await q
  return (count ?? 0) > 0
}

// Does the student have active homework they haven't submitted yet?
async function studentHomeworkPending(userId, batchId) {
  if (!batchId) return false
  const [{ data: hw }, { data: subs }] = await Promise.all([
    supabase.from('homework').select('id').eq('batch_id', batchId).eq('is_active', true),
    supabase.from('homework_submissions').select('homework_id').eq('student_id', userId),
  ])
  const submitted = new Set((subs ?? []).map(s => s.homework_id))
  return (hw ?? []).some(h => !submitted.has(h.id))
}

async function adminPendingFees() {
  const { count } = await supabase
    .from('fee_records')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')
  return count ?? 0
}

// ─── Hook ────────────────────────────────────────────────────────────────────
//
// Returns a map { [navPath]: boolean }. A `true` value means "show an unseen
// dot on that sidebar item". A dot is raised when something new/unread exists
// for that section and cleared the moment the user opens that section's route.
// Everything updates live via Supabase realtime.

export function useNavBadges(role, userId) {
  const [badges, setBadges] = useState({})
  const location = useLocation()
  const pathRef = useRef(location.pathname)
  pathRef.current = location.pathname

  const setDot = useCallback((path, on) => {
    setBadges(prev => (!!prev[path] === !!on ? prev : { ...prev, [path]: !!on }))
  }, [])

  // Raise a dot only if the user isn't already viewing that section.
  const raise = useCallback((path) => {
    if (pathRef.current.startsWith(path)) return
    setDot(path, true)
  }, [setDot])

  // Clear the dot for whichever section the user just navigated into.
  useEffect(() => {
    setBadges(prev => {
      let changed = false
      const next = { ...prev }
      for (const path of Object.keys(prev)) {
        if (prev[path] && location.pathname.startsWith(path)) { next[path] = false; changed = true }
      }
      return changed ? next : prev
    })
  }, [location.pathname])

  useEffect(() => {
    if (!role || !userId) return
    let cancelled = false
    let channel = null

    // Seed initial dots, skipping any section the user is already viewing.
    const seed = (map) => {
      if (cancelled) return
      setBadges(prev => {
        const next = { ...prev }
        for (const [path, on] of Object.entries(map)) {
          next[path] = !!on && !pathRef.current.startsWith(path)
        }
        return next
      })
    }

    // Recompute a single section's dot from a fresh count.
    const refresh = async (path, getCount) => {
      const c = await getCount()
      if (cancelled) return
      if (c > 0) raise(path)        // only shows if not currently viewing
      else setDot(path, false)
    }

    const init = async () => {
      if (role === 'student') {
        const { data: sp } = await supabase
          .from('student_profiles').select('batch_id').eq('id', userId).maybeSingle()
        if (cancelled) return
        const batchId = sp?.batch_id ?? null

        const [msg, notif, live, hw] = await Promise.all([
          countUnreadMessages(userId),
          studentNotifUnread(userId, batchId),
          studentLiveActive(batchId),
          studentHomeworkPending(userId, batchId),
        ])
        seed({
          '/student/messages': msg > 0,
          '/student/notifications': notif > 0,
          '/student/live-class': live,
          '/student/homework': hw,
        })

        channel = supabase
          .channel(`nav_badges_${userId}`)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${userId}` },
            () => raise('/student/messages'))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' },
            () => refresh('/student/notifications', () => studentNotifUnread(userId, batchId)))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'notification_reads', filter: `user_id=eq.${userId}` },
            () => refresh('/student/notifications', () => studentNotifUnread(userId, batchId)))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'live_classes' },
            () => refresh('/student/live-class', () => studentLiveActive(batchId)))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'homework' },
            () => refresh('/student/homework', () => studentHomeworkPending(userId, batchId)))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'homework_submissions', filter: `student_id=eq.${userId}` },
            () => refresh('/student/homework', () => studentHomeworkPending(userId, batchId)))
          .subscribe()

      } else if (role === 'teacher') {
        const [msg, notif] = await Promise.all([
          countUnreadMessages(userId),
          teacherNotifUnread(userId),
        ])
        seed({
          '/teacher/messages': msg > 0,
          '/teacher/notifications': notif > 0,
        })

        channel = supabase
          .channel(`nav_badges_${userId}`)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${userId}` },
            () => raise('/teacher/messages'))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' },
            () => refresh('/teacher/notifications', () => teacherNotifUnread(userId)))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'notification_reads', filter: `user_id=eq.${userId}` },
            () => refresh('/teacher/notifications', () => teacherNotifUnread(userId)))
          .subscribe()

      } else if (role === 'admin') {
        const [msg, fees] = await Promise.all([
          countUnreadMessages(userId),
          adminPendingFees(),
        ])
        seed({
          '/admin/messages': msg > 0,
          '/admin/fees': fees > 0,
        })

        channel = supabase
          .channel(`nav_badges_${userId}`)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${userId}` },
            () => raise('/admin/messages'))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'fee_records' },
            () => refresh('/admin/fees', () => adminPendingFees()))
          .subscribe()
      }
    }

    init()

    return () => { cancelled = true; if (channel) supabase.removeChannel(channel) }
  }, [role, userId, raise, setDot])

  return badges
}