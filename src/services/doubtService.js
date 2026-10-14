import { supabase } from '../lib/supabase'

/**
 * Canonical Doubt Resolution Hub Eligibility States
 */
export const DOUBT_ELIGIBILITY_STATUS = {
  INITIALIZING: 'INITIALIZING',
  LOADING_ENROLLMENT: 'LOADING_ENROLLMENT',
  EDUCATOR: 'EDUCATOR',
  STUDENT_ELIGIBLE: 'STUDENT_ELIGIBLE',
  STUDENT_NOT_ENROLLED: 'STUDENT_NOT_ENROLLED',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  ERROR: 'ERROR',
}

/**
 * Authoritative Doubt Resolution Hub Eligibility Decision Machine.
 * Resolves user authentication, student profile, batch enrollment, and lecture association.
 *
 * @param {object} params
 * @param {boolean} [params.authLoading=false] - Whether AuthContext is currently resolving session
 * @param {object|null} [params.user=null] - Authenticated Supabase user object
 * @param {object|null} [params.profile=null] - Authenticated user profile (role, full_name, etc.)
 * @param {object|null} [params.studentProfile=null] - Loaded student_profiles record (batch_id, roll_number, subjects, batches)
 * @param {boolean} [params.studentProfileLoading=false] - Whether student_profiles is currently fetching
 * @param {Error|null} [params.studentProfileError=null] - Any error encountered while fetching student_profiles
 * @param {object|null} [params.card=null] - The current study_card record
 * @param {boolean} [params.cardLoading=false] - Whether the card is currently being fetched
 * @returns {string} One of DOUBT_ELIGIBILITY_STATUS values
 */
export function getDoubtEligibility({
  authLoading = false,
  user = null,
  profile = null,
  studentProfile = null,
  studentProfileLoading = false,
  studentProfileError = null,
  card = null,
  cardLoading = false,
}) {
  // 1. While auth or card is loading, state is INITIALIZING
  if (authLoading || cardLoading) {
    return DOUBT_ELIGIBILITY_STATUS.INITIALIZING
  }

  // 2. Educators (Teacher or Admin) always access Educator Doubts Queue
  if (user && (profile?.role === 'teacher' || profile?.role === 'admin')) {
    return DOUBT_ELIGIBILITY_STATUS.EDUCATOR
  }

  // 3. Unauthenticated visitor
  if (!user) {
    return DOUBT_ELIGIBILITY_STATUS.UNAUTHENTICATED
  }

  // 4. Authenticated Student flow
  if (profile?.role === 'student') {
    if (studentProfileError) {
      return DOUBT_ELIGIBILITY_STATUS.ERROR
    }

    if (studentProfileLoading || !studentProfile) {
      return DOUBT_ELIGIBILITY_STATUS.LOADING_ENROLLMENT
    }

    // Authoritative batch enrollment check
    const studentBatchId = studentProfile.batch_id ? String(studentProfile.batch_id).trim() : null
    if (!studentBatchId) {
      return DOUBT_ELIGIBILITY_STATUS.STUDENT_NOT_ENROLLED
    }

    // Card batch association: card.batch_id OR card.batch_ids array
    const cardBatchId = card?.batch_id ? String(card.batch_id).trim() : null
    const cardBatchIds = Array.isArray(card?.batch_ids)
      ? card.batch_ids.map((b) => (b ? String(b).trim() : null)).filter(Boolean)
      : []

    const hasCardBatchConstraint = Boolean(cardBatchId || cardBatchIds.length > 0)
    const isBatchEnrolled =
      !hasCardBatchConstraint ||
      (cardBatchId && cardBatchId === studentBatchId) ||
      cardBatchIds.includes(studentBatchId)

    if (isBatchEnrolled) {
      return DOUBT_ELIGIBILITY_STATUS.STUDENT_ELIGIBLE
    }

    return DOUBT_ELIGIBILITY_STATUS.STUDENT_NOT_ENROLLED
  }

  // Fallback for any unknown / unassigned role
  return DOUBT_ELIGIBILITY_STATUS.UNAUTHENTICATED
}

/**
 * Standard error helper to detect if the database migration 028 has not been applied yet.
 * PostgREST returns code 'PGRST205' when a table is missing from schema cache.
 */
export function isMissingTableError(error) {
  if (!error) return false
  return (
    error.code === 'PGRST205' ||
    (typeof error.message === 'string' && error.message.toLowerCase().includes('schema cache')) ||
    (typeof error.message === 'string' && error.message.toLowerCase().includes("could not find the table 'public.doubts'"))
  )
}

/**
 * Format timestamp seconds into MM:SS or HH:MM:SS
 */
export function formatTimestamp(seconds = 0) {
  const s = Math.max(0, Math.floor(seconds || 0))
  const hrs = Math.floor(s / 3600)
  const mins = Math.floor((s % 3600) / 60)
  const secs = s % 60
  if (hrs > 0) {
    return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`
  }
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`
}

/**
 * Create a new timestamped doubt (Student action).
 * Must persist authoritatively in the shared database.
 */
export async function createDoubt(doubtData) {
  const {
    student_id,
    student_name,
    roll_number = null,
    batch_id = null,
    batch_name = null,
    subject = 'General',
    study_card_id = null,
    lecture_title,
    video_url = null,
    timestamp_seconds = 0,
    question,
  } = doubtData

  if (!student_id || !question?.trim() || !lecture_title?.trim()) {
    throw new Error('Student ID, lecture title, and question text are required.')
  }

  const payload = {
    student_id,
    student_name: student_name?.trim() || 'Student',
    roll_number: roll_number?.trim() || null,
    batch_id: batch_id || null,
    batch_name: batch_name?.trim() || null,
    subject: subject?.trim() || 'General',
    study_card_id: study_card_id || null,
    lecture_title: lecture_title?.trim(),
    video_url: video_url?.trim() || null,
    timestamp_seconds: Math.max(0, Math.floor(timestamp_seconds || 0)),
    question: question.trim(),
    status: 'pending',
    addressed_by: null,
    addressed_by_name: null,
    addressed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('doubts')
    .insert([payload])
    .select('*')
    .single()

  if (error) {
    if (isMissingTableError(error)) {
      const err = new Error(
        'Database setup required: Migration 028_doubt_resolution_hub.sql must be applied in Supabase SQL editor.'
      )
      err.code = 'PGRST205'
      throw err
    }
    throw error
  }

  return data
}

/**
 * Fetch all doubts asked by a specific student.
 */
export async function fetchStudentDoubts(studentId) {
  if (!studentId) return { doubts: [], stats: { total: 0, pending: 0, addressed: 0 }, isSchemaReady: true }

  const { data, error } = await supabase
    .from('doubts')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })

  if (error) {
    if (isMissingTableError(error)) {
      return {
        doubts: [],
        stats: { total: 0, pending: 0, addressed: 0 },
        isSchemaReady: false,
        error,
      }
    }
    throw error
  }

  const doubts = data ?? []
  const stats = {
    total: doubts.length,
    pending: doubts.filter((d) => d.status === 'pending').length,
    addressed: doubts.filter((d) => d.status === 'addressed').length,
  }

  return { doubts, stats, isSchemaReady: true }
}

/**
 * Fetch recent doubts for a specific student and lecture.
 */
export async function fetchStudentDoubtsForLecture(studentId, studyCardId) {
  if (!studentId || !studyCardId) return []

  const { data, error } = await supabase
    .from('doubts')
    .select('*')
    .eq('student_id', studentId)
    .eq('study_card_id', studyCardId)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    if (isMissingTableError(error)) return []
    throw error
  }

  return data ?? []
}

/**
 * Fetch doubts authorized for a teacher based on verified batch & subject assignments.
 */
export async function fetchTeacherDoubts(teacherId) {
  if (!teacherId) return { doubts: [], groups: {}, stats: { pending: 0, addressedToday: 0 }, isSchemaReady: true }

  // 1. Authoritative assignment discovery: find teacher's assigned batches & subject
  const [batchesRes, profileRes] = await Promise.all([
    supabase
      .from('batches')
      .select('id, name, subjects, teacher_id, teacher_ids')
      .or(`teacher_id.eq.${teacherId},teacher_ids.cs.{${teacherId}}`)
      .eq('is_active', true),
    supabase
      .from('teacher_profiles')
      .select('subject')
      .eq('id', teacherId)
      .maybeSingle(),
  ])

  const assignedBatches = batchesRes.data ?? []
  const assignedBatchIds = assignedBatches.map((b) => b.id)
  const _teacherSubject = profileRes.data?.subject?.trim()

  // 2. Query doubts table: strictly scoped to assigned batches (never unbound across academy)
  if (assignedBatchIds.length === 0) {
    return {
      doubts: [],
      batches: [],
      groups: {},
      stats: { pending: 0, addressedToday: 0 },
      isSchemaReady: true,
    }
  }

  let query = supabase
    .from('doubts')
    .select('*')
    .in('batch_id', assignedBatchIds)

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    if (isMissingTableError(error)) {
      return {
        doubts: [],
        batches: assignedBatches,
        groups: {},
        stats: { pending: 0, addressedToday: 0 },
        isSchemaReady: false,
        error,
      }
    }
    throw error
  }

  const allDoubts = data ?? []

  // Teacher pending queue shows only active (pending) doubts by default
  const pendingDoubts = allDoubts.filter((d) => d.status === 'pending')

  // Calculate addressed today count for teacher encouragement
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const addressedToday = allDoubts.filter(
    (d) =>
      d.status === 'addressed' &&
      d.addressed_by === teacherId &&
      d.addressed_at &&
      new Date(d.addressed_at) >= todayStart
  ).length

  // Build subject & batch groups
  const groups = {}
  pendingDoubts.forEach((d) => {
    const subj = d.subject || 'General'
    const batch = d.batch_name || 'Unassigned Batch'
    const key = `${subj} — ${batch}`
    if (!groups[key]) {
      groups[key] = {
        subject: subj,
        batchName: batch,
        batchId: d.batch_id,
        items: [],
      }
    }
    groups[key].items.push(d)
  })

  return {
    doubts: pendingDoubts,
    allDoubts,
    batches: assignedBatches,
    groups,
    stats: {
      pending: pendingDoubts.length,
      addressedToday,
    },
    isSchemaReady: true,
  }
}

/**
 * Fetch all doubts for Administrator with complete operational visibility.
 */
export async function fetchAdminDoubts() {
  // Query doubts, all batches, and all teachers concurrently
  const [doubtsRes, batchesRes, teachersRes] = await Promise.all([
    supabase.from('doubts').select('*').order('created_at', { ascending: false }),
    supabase.from('batches').select('id, name, subject, subjects, teacher_id, teacher_ids').eq('is_active', true),
    supabase.from('profiles').select('id, full_name, email').eq('role', 'teacher').eq('is_active', true),
  ])

  if (doubtsRes.error) {
    if (isMissingTableError(doubtsRes.error)) {
      return {
        doubts: [],
        teacherGroups: {},
        subjectBatchGroups: {},
        teachers: teachersRes.data ?? [],
        batches: batchesRes.data ?? [],
        stats: { total: 0, pending: 0, addressed: 0, unassigned: 0 },
        isSchemaReady: false,
        error: doubtsRes.error,
      }
    }
    throw doubtsRes.error
  }

  const doubts = doubtsRes.data ?? []
  const batches = batchesRes.data ?? []
  const teachers = teachersRes.data ?? []

  // Create lookup maps
  const batchMap = new Map(batches.map((b) => [b.id, b]))
  const teacherMap = new Map(teachers.map((t) => [t.id, t]))

  // Helper to find responsible teacher(s) for a doubt
  function getResponsibleTeachers(doubt) {
    const list = []
    if (doubt.batch_id && batchMap.has(doubt.batch_id)) {
      const b = batchMap.get(doubt.batch_id)
      if (b.teacher_id && teacherMap.has(b.teacher_id)) {
        list.push(teacherMap.get(b.teacher_id))
      }
      if (Array.isArray(b.teacher_ids)) {
        b.teacher_ids.forEach((tId) => {
          if (teacherMap.has(tId) && !list.some((existing) => existing.id === tId)) {
            list.push(teacherMap.get(tId))
          }
        })
      }
    }
    return list
  }

  // 1. Group View A: Teacher-wise
  const teacherGroups = {}
  // Initialize group for every teacher
  teachers.forEach((t) => {
    teacherGroups[t.id] = {
      teacherId: t.id,
      teacherName: t.full_name,
      teacherEmail: t.email,
      items: [],
      pendingCount: 0,
      addressedCount: 0,
    }
  })
  // Group for Unassigned doubts
  const unassignedGroup = {
    teacherId: 'unassigned',
    teacherName: 'Unassigned / General',
    teacherEmail: null,
    items: [],
    pendingCount: 0,
    addressedCount: 0,
  }

  doubts.forEach((d) => {
    const assignedTeachers = getResponsibleTeachers(d)
    if (assignedTeachers.length === 0) {
      unassignedGroup.items.push(d)
      if (d.status === 'pending') unassignedGroup.pendingCount++
      else unassignedGroup.addressedCount++
    } else {
      assignedTeachers.forEach((t) => {
        const grp = teacherGroups[t.id]
        if (grp) {
          grp.items.push(d)
          if (d.status === 'pending') grp.pendingCount++
          else grp.addressedCount++
        }
      })
    }
  })

  // 2. Group View B: Subject & Batch-wise
  const subjectBatchGroups = {}
  doubts.forEach((d) => {
    const subj = d.subject || 'General'
    const batch = d.batch_name || 'No Batch'
    const key = `${subj} — ${batch}`
    if (!subjectBatchGroups[key]) {
      subjectBatchGroups[key] = {
        subject: subj,
        batchName: batch,
        batchId: d.batch_id,
        items: [],
        pendingCount: 0,
        addressedCount: 0,
      }
    }
    subjectBatchGroups[key].items.push(d)
    if (d.status === 'pending') subjectBatchGroups[key].pendingCount++
    else subjectBatchGroups[key].addressedCount++
  })

  const stats = {
    total: doubts.length,
    pending: doubts.filter((d) => d.status === 'pending').length,
    addressed: doubts.filter((d) => d.status === 'addressed').length,
    unassigned: unassignedGroup.items.filter((d) => d.status === 'pending').length,
  }

  return {
    doubts,
    teachers,
    batches,
    teacherGroups,
    unassignedGroup,
    subjectBatchGroups,
    stats,
    isSchemaReady: true,
  }
}

/**
 * Mark a doubt as addressed in class.
 * Authorized for assigned teachers and administrators.
 */
export async function markDoubtAddressed(doubtId, educatorId, educatorName) {
  if (!doubtId || !educatorId) {
    throw new Error('Doubt ID and educator ID are required.')
  }

  const { data, error } = await supabase
    .from('doubts')
    .update({
      status: 'addressed',
      addressed_by: educatorId,
      addressed_by_name: educatorName || 'Educator',
      addressed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', doubtId)
    .select('*')
    .single()

  if (error) {
    if (isMissingTableError(error)) {
      throw new Error('Database migration 028 must be executed in Supabase.')
    }
    throw error
  }

  return data
}

/**
 * Delete a doubt.
 * Students can delete their own doubts when cleared via self-study.
 * Admins can delete any doubt for moderation.
 */
export async function deleteDoubt(doubtId, userId, isAdmin = false) {
  if (!doubtId) throw new Error('Doubt ID is required.')

  let query = supabase.from('doubts').delete().eq('id', doubtId)
  if (!isAdmin && userId) {
    query = query.eq('student_id', userId)
  }

  const { error } = await query

  if (error) {
    if (isMissingTableError(error)) {
      throw new Error('Database migration 028 must be executed in Supabase.')
    }
    throw error
  }

  return true
}

/**
 * Realtime subscription to the doubts table.
 * Preserves clean single-channel lifecycle and unmount cleanup.
 */
export function subscribeToDoubts(onEvent) {
  if (!supabase || typeof supabase.channel !== 'function') {
    return () => {}
  }

  const channelId = `doubts_realtime_${Math.random().toString(36).substring(2, 9)}`

  const channel = supabase
    .channel(channelId)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'doubts' },
      (payload) => {
        if (typeof onEvent === 'function') {
          onEvent(payload)
        }
      }
    )
    .subscribe()

  return () => {
    if (typeof supabase.removeChannel === 'function') {
      supabase.removeChannel(channel)
    }
  }
}

/**
 * Lightweight pending doubts count for navigation badges.
 */
export async function countPendingDoubts(role, userId) {
  try {
    if (role === 'admin') {
      const { count, error } = await supabase
        .from('doubts')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
      if (error) return 0
      return count ?? 0
    }

    if (role === 'teacher') {
      const { data: batches } = await supabase
        .from('batches')
        .select('id')
        .or(`teacher_id.eq.${userId},teacher_ids.cs.{${userId}}`)
        .eq('is_active', true)

      const batchIds = (batches ?? []).map((b) => b.id)
      if (batchIds.length === 0) return 0

      const { count, error } = await supabase
        .from('doubts')
        .select('id', { count: 'exact', head: true })
        .in('batch_id', batchIds)
        .eq('status', 'pending')

      if (error) return 0
      return count ?? 0
    }

    return 0
  } catch {
    return 0
  }
}
