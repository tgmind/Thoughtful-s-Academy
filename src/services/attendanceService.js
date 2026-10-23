// src/services/attendanceService.js
// Authoritative Service Layer for Teacher & Admin-Initiated Attendance Sessions

import { supabase } from '../lib/supabase'

export function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Initiates an on-demand attendance session for a batch.
 * @param {Object} params
 * @param {string} params.batchId - The UUID of the batch
 * @param {number} [params.durationMinutes=5] - Duration window in minutes (1 - 180)
 * @param {string} [params.title='Lecture Attentiveness Check'] - Session label
 */
export async function initiateAttendanceSession({ batchId, durationMinutes = 5, title = 'Lecture Attentiveness Check' }) {
  try {
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) throw new Error('Authentication required to initiate attendance')

    const clampedDuration = Math.max(1, Math.min(180, parseInt(durationMinutes, 10) || 5))
    const now = new Date()
    const expiresAt = new Date(now.getTime() + clampedDuration * 60 * 1000)

    // First auto-close any previously active session for this batch to ensure single live session
    await closeAnyActiveBatchSessions(batchId)

    const { data, error } = await supabase
      .from('attendance_sessions')
      .insert({
        batch_id: batchId,
        created_by: user.id,
        title: title.trim() || 'Lecture Attentiveness Check',
        duration_minutes: clampedDuration,
        started_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        status: 'active',
      })
      .select('*, batches(name)')
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (err) {
    console.error('Failed to initiate attendance session:', err)
    return { data: null, error: err }
  }
}

/**
 * Closes an active attendance session and marks unattended students as absent.
 * @param {string} sessionId - UUID of the session
 */
export async function closeAttendanceSession(sessionId) {
  try {
    // Attempt stored procedure first
    const { data: rpcData, error: rpcErr } = await supabase.rpc('close_attendance_session', {
      p_session_id: sessionId,
    })

    if (!rpcErr && rpcData?.success) {
      return { success: true, summary: rpcData, error: null }
    }

    // Direct fallback if RPC is bypassed or fails
    const now = new Date().toISOString()
    const { data: session, error: sessErr } = await supabase
      .from('attendance_sessions')
      .update({ status: 'closed', closed_at: now })
      .eq('id', sessionId)
      .select()
      .single()

    if (sessErr) throw sessErr

    // Insert absent records for enrolled students without an entry
    const { data: enrolled } = await supabase
      .from('student_profiles')
      .select('id')
      .eq('batch_id', session.batch_id)

    const { data: marked } = await supabase
      .from('attendance')
      .select('student_id')
      .eq('session_id', sessionId)

    const markedSet = new Set((marked || []).map(m => m.student_id))
    const absentees = (enrolled || [])
      .filter(s => !markedSet.has(s.id))
      .map(s => ({
        student_id: s.id,
        batch_id: session.batch_id,
        session_id: sessionId,
        date: localDateStr(new Date(session.started_at)),
        status: 'absent',
        marked_at: now,
        marked_by: session.created_by,
      }))

    if (absentees.length > 0) {
      await supabase.from('attendance').insert(absentees)
    }

    return {
      success: true,
      summary: {
        session_id: sessionId,
        batch_id: session.batch_id,
        marked_present: markedSet.size,
        marked_absent: absentees.length,
        total_enrolled: (enrolled || []).length,
      },
      error: null,
    }
  } catch (err) {
    console.error('Failed to close attendance session:', err)
    return { success: false, summary: null, error: err }
  }
}

/**
 * Housekeeping routine to scan and close any sessions past their expires_at.
 */
export async function checkAndCloseExpiredSessions() {
  try {
    const { data, error } = await supabase.rpc('check_and_close_expired_sessions')
    if (error) {
      // Fallback query
      const now = new Date().toISOString()
      const { data: expired } = await supabase
        .from('attendance_sessions')
        .select('id')
        .eq('status', 'active')
        .lte('expires_at', now)

      if (expired && expired.length > 0) {
        for (const s of expired) {
          await closeAttendanceSession(s.id)
        }
      }
      return expired ? expired.length : 0
    }
    return data ?? 0
  } catch (err) {
    console.error('Error closing expired sessions:', err)
    return 0
  }
}

/**
 * Retrieves the currently active attendance session for a student.
 * @param {string} studentId
 */
export async function getActiveSessionForStudent(studentId) {
  try {
    // 1. Try RPC helper
    const { data: rpcData, error: rpcErr } = await supabase.rpc('get_active_session_for_student', {
      p_student_id: studentId,
    })

    if (!rpcErr && rpcData) {
      return { data: rpcData, error: null }
    }

    // 2. Direct query fallback
    await checkAndCloseExpiredSessions()

    const { data: sp } = await supabase
      .from('student_profiles')
      .select('batch_id, batches(name)')
      .eq('id', studentId)
      .maybeSingle()

    if (!sp?.batch_id) {
      return { data: { has_active_session: false, reason: 'no_batch' }, error: null }
    }

    const now = new Date().toISOString()
    const { data: session } = await supabase
      .from('attendance_sessions')
      .select('*, profiles:created_by(full_name)')
      .eq('batch_id', sp.batch_id)
      .eq('status', 'active')
      .gt('expires_at', now)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!session) {
      return { data: { has_active_session: false }, error: null }
    }

    const { data: att } = await supabase
      .from('attendance')
      .select('*')
      .eq('session_id', session.id)
      .eq('student_id', studentId)
      .maybeSingle()

    const expiresAt = new Date(session.expires_at).getTime()
    const secondsRemaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))

    return {
      data: {
        has_active_session: true,
        session_id: session.id,
        batch_id: session.batch_id,
        batch_name: sp.batches?.name || 'Class',
        title: session.title,
        duration_minutes: session.duration_minutes,
        started_at: session.started_at,
        expires_at: session.expires_at,
        seconds_remaining: secondsRemaining,
        created_by_name: session.profiles?.full_name || 'Teacher',
        already_marked: !!att,
        marked_status: att?.status || null,
        marked_at: att?.marked_at || null,
      },
      error: null,
    }
  } catch (err) {
    console.error('Error fetching student active session:', err)
    return { data: null, error: err }
  }
}

/**
 * Retrieves the currently active attendance session for a specific batch.
 * @param {string} batchId
 */
export async function getActiveSessionForBatch(batchId) {
  try {
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('attendance_sessions')
      .select('*, profiles:created_by(full_name), batches(name)')
      .eq('batch_id', batchId)
      .eq('status', 'active')
      .gt('expires_at', now)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    if (!data) return { data: null, secondsRemaining: 0, error: null }

    const expiresAt = new Date(data.expires_at).getTime()
    const secondsRemaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))

    return { data, secondsRemaining, error: null }
  } catch (err) {
    console.error('Error fetching active session for batch:', err)
    return { data: null, secondsRemaining: 0, error: err }
  }
}

/**
 * Closes any currently active session for a batch before creating a new one.
 */
async function closeAnyActiveBatchSessions(batchId) {
  try {
    const { data: actives } = await supabase
      .from('attendance_sessions')
      .select('id')
      .eq('batch_id', batchId)
      .eq('status', 'active')

    if (actives && actives.length > 0) {
      for (const s of actives) {
        await closeAttendanceSession(s.id)
      }
    }
  } catch {
    // Non-fatal cleanup
  }
}

/**
 * Student marks their attendance as Present for an active session.
 * @param {Object} params
 * @param {string} params.sessionId
 * @param {string} params.studentId
 * @param {string} params.batchId
 */
export async function markStudentPresent({ sessionId, studentId, batchId }) {
  try {
    const today = localDateStr()
    const { data, error } = await supabase
      .from('attendance')
      .insert({
        session_id: sessionId,
        student_id: studentId,
        batch_id: batchId,
        date: today,
        status: 'present',
        marked_at: new Date().toISOString(),
        marked_by: studentId,
      })
      .select()
      .maybeSingle()

    if (error) {
      // 23505 indicates already marked
      if (error.code === '23505') {
        const { data: existing } = await supabase
          .from('attendance')
          .select('*')
          .eq('session_id', sessionId)
          .eq('student_id', studentId)
          .maybeSingle()

        return { data: existing, alreadyMarked: true, error: null }
      }
      throw error
    }

    return { data, alreadyMarked: false, error: null }
  } catch (err) {
    console.error('Failed to mark student present:', err)
    return { data: null, error: err }
  }
}

/**
 * Retrieves full session roster with individual student attendance statuses.
 * @param {string} sessionId
 * @param {string} batchId
 */
export async function getSessionRoster(sessionId, batchId) {
  try {
    const [{ data: enrolled, error: enrollErr }, { data: attendanceRecords, error: attErr }, { data: session }] = await Promise.all([
      supabase
        .from('student_profiles')
        .select('id, roll_number, profiles(full_name, email, phone)')
        .eq('batch_id', batchId),
      supabase
        .from('attendance')
        .select('student_id, status, marked_at')
        .eq('session_id', sessionId),
      supabase
        .from('attendance_sessions')
        .select('*')
        .eq('id', sessionId)
        .maybeSingle(),
    ])

    if (enrollErr) throw enrollErr
    if (attErr) throw attErr

    const attMap = {}
    ;(attendanceRecords || []).forEach(r => {
      attMap[r.student_id] = r
    })

    const isSessionActive = session?.status === 'active' && new Date(session.expires_at) > new Date()

    const roster = (enrolled || []).map(s => {
      const rec = attMap[s.id]
      let status = 'absent'
      if (rec) {
        status = rec.status
      } else if (isSessionActive) {
        status = 'pending'
      }

      return {
        id: s.id,
        roll_number: s.roll_number || '—',
        full_name: s.profiles?.full_name || 'Student',
        email: s.profiles?.email || '',
        phone: s.profiles?.phone || '',
        status,
        marked_at: rec?.marked_at || null,
      }
    })

    const presentCount = roster.filter(r => r.status === 'present').length
    const absentCount = roster.filter(r => r.status === 'absent').length
    const pendingCount = roster.filter(r => r.status === 'pending').length
    const totalEnrolled = roster.length
    const rate = totalEnrolled > 0 ? Math.round((presentCount / totalEnrolled) * 100) : 0

    return {
      roster,
      stats: {
        totalEnrolled,
        presentCount,
        absentCount,
        pendingCount,
        attentivenessRate: rate,
      },
      session,
      error: null,
    }
  } catch (err) {
    console.error('Failed to get session roster:', err)
    return { roster: [], stats: null, session: null, error: err }
  }
}

/**
 * Retrieves past attendance sessions for a batch or institution.
 * @param {string} [batchId]
 * @param {number} [limit=20]
 */
export async function getAttendanceSessionsHistory(batchId = null, limit = 20) {
  try {
    let query = supabase
      .from('attendance_sessions')
      .select('*, batches(name), profiles:created_by(full_name)')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (batchId) {
      query = query.eq('batch_id', batchId)
    }

    const { data: sessions, error } = await query
    if (error) throw error

    // Populate attendance stats for each session
    const sessionIds = (sessions || []).map(s => s.id)
    if (sessionIds.length === 0) return { data: [], error: null }

    const { data: records } = await supabase
      .from('attendance')
      .select('session_id, status')
      .in('session_id', sessionIds)

    const sessionStats = {}
    ;(records || []).forEach(r => {
      if (!sessionStats[r.session_id]) {
        sessionStats[r.session_id] = { present: 0, absent: 0, total: 0 }
      }
      sessionStats[r.session_id].total++
      if (r.status === 'present') sessionStats[r.session_id].present++
      else if (r.status === 'absent') sessionStats[r.session_id].absent++
    })

    const decorated = (sessions || []).map(s => {
      const st = sessionStats[s.id] || { present: 0, absent: 0, total: 0 }
      const pct = st.total > 0 ? Math.round((st.present / st.total) * 100) : 0
      return {
        ...s,
        present_count: st.present,
        absent_count: st.absent,
        total_records: st.total,
        rate_pct: pct,
      }
    })

    return { data: decorated, error: null }
  } catch (err) {
    console.error('Failed to load session history:', err)
    return { data: [], error: err }
  }
}

/**
 * Computes deep attendance analytics for admin or teacher dashboard.
 * @param {Object} options
 * @param {string} [options.batchId]
 * @param {number} [options.days=30]
 */
export async function getComprehensiveAttendanceAnalytics({ batchId = null, days = 30 } = {}) {
  try {
    await checkAndCloseExpiredSessions()

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startDateStr = localDateStr(startDate)

    // Parallel fetch core metrics
    const [
      { data: sessions, error: sessErr },
      { data: batches, error: batchErr },
      { data: attendanceRows, error: attErr },
      { data: allStudents, error: stuErr },
    ] = await Promise.all([
      supabase
        .from('attendance_sessions')
        .select('*, batches(name), profiles:created_by(full_name)')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false }),
      supabase.from('batches').select('id, name, teacher_id, teacher_ids').eq('is_active', true),
      supabase
        .from('attendance')
        .select('id, student_id, batch_id, session_id, date, status, marked_at')
        .gte('date', startDateStr),
      supabase
        .from('student_profiles')
        .select('id, batch_id, roll_number, batches(name), profiles(full_name, phone, is_active)')
        .eq('profiles.is_active', true),
    ])

    if (sessErr) throw sessErr
    if (batchErr) throw batchErr
    if (attErr) throw attErr
    if (stuErr) throw stuErr

    // Filter by batch if specified
    const activeSessions = (sessions || []).filter(s => !batchId || s.batch_id === batchId)
    const filteredRows = (attendanceRows || []).filter(r => !batchId || r.batch_id === batchId)
    const filteredStudents = (allStudents || []).filter(s => !batchId || s.batch_id === batchId)

    // 1. Overall Aggregates
    const totalSessions = activeSessions.length
    const totalMarks = filteredRows.length
    const totalPresent = filteredRows.filter(r => r.status === 'present').length
    const totalAbsent = filteredRows.filter(r => r.status === 'absent').length
    const overallRate = totalMarks > 0 ? Math.round((totalPresent / totalMarks) * 100) : 0

    // 2. Batch Breakdown
    const batchMap = {}
    ;(batches || []).forEach(b => {
      batchMap[b.id] = { id: b.id, name: b.name, present: 0, absent: 0, total: 0 }
    })
    filteredRows.forEach(r => {
      if (r.batch_id && batchMap[r.batch_id]) {
        batchMap[r.batch_id].total++
        if (r.status === 'present') batchMap[r.batch_id].present++
        else if (r.status === 'absent') batchMap[r.batch_id].absent++
      }
    })
    const batchBreakdown = Object.values(batchMap).map(b => ({
      id: b.id,
      name: b.name,
      present: b.present,
      absent: b.absent,
      total: b.total,
      rate: b.total > 0 ? Math.round((b.present / b.total) * 100) : 0,
    }))

    // 3. Trend across the date range
    const trendDates = []
    const dayMap = {}
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const ds = localDateStr(d)
      trendDates.push(ds)
      dayMap[ds] = { date: ds.slice(5), present: 0, absent: 0, total: 0 }
    }

    filteredRows.forEach(r => {
      if (dayMap[r.date]) {
        dayMap[r.date].total++
        if (r.status === 'present') dayMap[r.date].present++
        else if (r.status === 'absent') dayMap[r.date].absent++
      }
    })

    const trend = trendDates.map(ds => {
      const item = dayMap[ds]
      return {
        date: item.date,
        fullDate: ds,
        rate: item.total > 0 ? Math.round((item.present / item.total) * 100) : 0,
        present: item.present,
        absent: item.absent,
        total: item.total,
      }
    })

    // 4. Student At-Risk Analysis (<50% and 50-75% thresholds)
    const studentStats = {}
    filteredRows.forEach(r => {
      if (!studentStats[r.student_id]) {
        studentStats[r.student_id] = { present: 0, absent: 0, total: 0, lastAttended: null }
      }
      studentStats[r.student_id].total++
      if (r.status === 'present') {
        studentStats[r.student_id].present++
        if (!studentStats[r.student_id].lastAttended || r.date > studentStats[r.student_id].lastAttended) {
          studentStats[r.student_id].lastAttended = r.date
        }
      } else if (r.status === 'absent') {
        studentStats[r.student_id].absent++
      }
    })

    const atRiskStudents = filteredStudents
      .map(s => {
        const stat = studentStats[s.id] || { present: 0, absent: 0, total: 0, lastAttended: null }
        const rate = stat.total > 0 ? Math.round((stat.present / stat.total) * 100) : 0
        return {
          id: s.id,
          full_name: s.profiles?.full_name || 'Student',
          phone: s.profiles?.phone || '',
          roll_number: s.roll_number || '—',
          batch_name: s.batches?.name || '—',
          batch_id: s.batch_id,
          present: stat.present,
          absent: stat.absent,
          total: stat.total,
          rate,
          lastAttended: stat.lastAttended,
        }
      })
      .filter(s => s.total > 0 && s.rate < 75)
      .sort((a, b) => a.rate - b.rate)

    // 5. Currently Active Live Sessions
    const nowIso = new Date().toISOString()
    const currentlyActive = (activeSessions || []).filter(
      s => s.status === 'active' && s.expires_at > nowIso
    )

    return {
      summary: {
        totalSessions,
        totalMarks,
        totalPresent,
        totalAbsent,
        overallRate,
        atRiskCount: atRiskStudents.filter(s => s.rate < 50).length,
      },
      batchBreakdown,
      trend,
      atRiskStudents,
      recentSessions: activeSessions.slice(0, 15),
      currentlyActive,
      error: null,
    }
  } catch (err) {
    console.error('Failed to get comprehensive attendance analytics:', err)
    return {
      summary: { totalSessions: 0, totalMarks: 0, totalPresent: 0, totalAbsent: 0, overallRate: 0, atRiskCount: 0 },
      batchBreakdown: [],
      trend: [],
      atRiskStudents: [],
      recentSessions: [],
      currentlyActive: [],
      error: err,
    }
  }
}
