import { useState } from 'react'
import { TriangleAlert, Trash2, RefreshCcw, ShieldAlert, ChevronDown, ChevronRight, Users, UserCog, ToggleLeft, ToggleRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const CONFIRM_WORD = 'RESET'

const DELETION_STEPS = [
  { label: 'Notification reads',       table: 'notification_reads', pkCol: 'user_id' },
  { label: 'Student bookmarks',        table: 'student_bookmarks' },
  { label: 'Homework submissions',     table: 'homework_submissions' },
  { label: 'Attendance records',       table: 'attendance' },
  { label: 'Fee records',              table: 'fee_records' },
  { label: 'Messages',                 table: 'messages' },
  { label: 'Salary records',           table: 'salary_records' },
  { label: 'Homework assignments',     table: 'homework' },
  { label: 'Notifications',            table: 'notifications' },
  { label: 'Live classes',             table: 'live_classes' },
  { label: 'Study cards',              table: 'study_cards' },
  { label: 'Student profiles',         table: 'student_profiles' },
  { label: 'Teacher profiles',         table: 'teacher_profiles' },
  { label: 'Batches',                  table: 'batches' },
  { label: 'QR settings',              table: 'qr_settings' },
  { label: 'User profiles (non-admin)', table: 'profiles', filter: true },
]

const ALL_PERMS = [
  { key: 'can_manage_study_cards', label: 'Study Cards',       short: 'Study Cards' },
  { key: 'can_manage_homework',    label: 'Homework',          short: 'Homework'    },
  { key: 'can_drop_live_class',    label: 'Live Class Links',  short: 'Live Class'  },
  { key: 'can_message_students',   label: 'Message Students',  short: 'Messages'    },
  { key: 'can_view_attendance',    label: 'View Attendance',   short: 'Attendance'  },
  { key: 'can_view_fee_records',   label: 'View Fee Records',  short: 'Fee Records' },
]

export default function AdminSettings() {
  const { user } = useAuth()

  // ── Full reset ──
  const [showModal,  setShowModal]  = useState(false)
  const [input,      setInput]      = useState('')
  const [resetting,  setResetting]  = useState(false)
  const [progress,   setProgress]   = useState([])
  const [done,       setDone]       = useState(false)

  const openModal  = () => { setInput(''); setProgress([]); setDone(false); setShowModal(true) }
  const closeModal = () => { if (!resetting) setShowModal(false) }

  // ── Delete students ──
  const [studentsOpen,     setStudentsOpen]     = useState(false)
  const [studentList,      setStudentList]      = useState([])
  const [batches,          setBatches]          = useState([])
  const [batchFilter,      setBatchFilter]      = useState('')
  const [selectedStudents, setSelectedStudents] = useState(new Set())
  const [loadingStudents,  setLoadingStudents]  = useState(false)
  const [showStudentModal, setShowStudentModal] = useState(false)
  const [deletingStudents, setDeletingStudents] = useState(false)
  const [studentProgress,  setStudentProgress]  = useState([])
  const [studentDone,      setStudentDone]      = useState(false)

  // ── Delete teachers ──
  const [teachersOpen,     setTeachersOpen]     = useState(false)
  const [teacherList,      setTeacherList]      = useState([])
  const [selectedTeachers, setSelectedTeachers] = useState(new Set())
  const [loadingTeachers,  setLoadingTeachers]  = useState(false)
  const [showTeacherModal, setShowTeacherModal] = useState(false)
  const [deletingTeachers, setDeletingTeachers] = useState(false)
  const [teacherProgress,  setTeacherProgress]  = useState([])
  const [teacherDone,      setTeacherDone]      = useState(false)

  // ── Teacher Permissions ──
  const [permsOpen,     setPermsOpen]     = useState(false)
  const [permList,      setPermList]      = useState([])
  const [loadingPerms,  setLoadingPerms]  = useState(false)
  const [savingPerm,    setSavingPerm]    = useState(null)

  // ── Permission handlers ──
  const loadPerms = async () => {
    setLoadingPerms(true)
    const [{ data: profiles }, { data: tps }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email').eq('role', 'teacher').order('full_name'),
      supabase.from('teacher_profiles').select('id, can_manage_study_cards, can_manage_homework, can_drop_live_class, can_message_students, can_view_attendance, can_view_fee_records'),
    ])
    const tpMap = {}; (tps ?? []).forEach(t => { if (t && t.id) tpMap[t.id] = t })
    setPermList((profiles ?? []).map(t => ({
      id: t.id,
      full_name: t.full_name,
      email: t.email,
      can_manage_study_cards: tpMap[t.id]?.can_manage_study_cards ?? false,
      can_manage_homework:    tpMap[t.id]?.can_manage_homework    ?? false,
      can_drop_live_class:    tpMap[t.id]?.can_drop_live_class    ?? false,
      can_message_students:   tpMap[t.id]?.can_message_students   ?? false,
      can_view_attendance:    tpMap[t.id]?.can_view_attendance    ?? false,
      can_view_fee_records:   tpMap[t.id]?.can_view_fee_records   ?? false,
    })))
    setLoadingPerms(false)
  }

  const togglePermsOpen = () => {
    const opening = !permsOpen
    setPermsOpen(opening)
    if (opening && permList.length === 0) loadPerms()
  }

  const togglePerm = async (teacherId, field, currentVal) => {
    setSavingPerm(`${teacherId}_${field}`)
    const { error } = await supabase.from('teacher_profiles')
      .upsert({ id: teacherId, [field]: !currentVal }, { onConflict: 'id' })
    if (error) { toast.error(error.message) }
    else {
      setPermList(l => l.map(t => t.id === teacherId ? { ...t, [field]: !currentVal } : t))
      toast.success('Permission updated')
    }
    setSavingPerm(null)
  }

  const runReset = async () => {
    if (input !== CONFIRM_WORD || !user) return
    setResetting(true)
    for (const step of DELETION_STEPS) {
      try {
        let query = supabase.from(step.table).delete()
        if (step.filter) {
          query = query.neq('id', user.id).neq('role', 'admin')
        } else {
          const col = step.pkCol ?? 'id'
          query = query.not(col, 'is', null)
        }
        const { error } = await query
        if (error) console.error(`Reset error on ${step.table}:`, error.message)
      } catch (e) {
        console.error(`Unexpected error on ${step.table}:`, e)
      }
      setProgress(prev => [...prev, step.label])
    }
    setResetting(false)
    setDone(true)
    toast.success('All data has been reset successfully.')
  }

  // ── Student section ──
  const loadStudents = async () => {
    setLoadingStudents(true)
    const [res1, res2, res3] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email').eq('role', 'student').order('full_name'),
      supabase.from('student_profiles').select('id, batch_id, batches(id, name)'),
      supabase.from('batches').select('id, name').order('name'),
    ])
    const profiles = res1?.data ?? []
    const sps = res2?.data ?? []
    const batchData = res3?.data ?? []
    const spMap = {}; sps.forEach(sp => { spMap[sp.id] = sp })
    setStudentList(profiles.map(s => ({
      ...s,
      batch_id:   spMap[s.id]?.batch_id ?? null,
      batch_name: spMap[s.id]?.batches?.name ?? '—',
    })))
    setBatches(batchData)
    setLoadingStudents(false)
  }

  const toggleStudentsOpen = () => {
    const opening = !studentsOpen
    setStudentsOpen(opening)
    if (opening && studentList.length === 0) loadStudents()
    if (!opening) setSelectedStudents(new Set())
  }

  const toggleStudentSelect = (id) => {
    setSelectedStudents(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const visibleStudents = batchFilter
    ? studentList.filter(s => s.batch_id === batchFilter)
    : studentList

  const allVisibleSelected = visibleStudents.length > 0 && visibleStudents.every(s => selectedStudents.has(s.id))

  const toggleSelectAllStudents = () => {
    setSelectedStudents(prev => {
      const next = new Set(prev)
      if (allVisibleSelected) {
        visibleStudents.forEach(s => next.delete(s.id))
      } else {
        visibleStudents.forEach(s => next.add(s.id))
      }
      return next
    })
  }

  const runStudentDelete = async () => {
    const ids = [...selectedStudents]
    if (!ids.length) return
    setDeletingStudents(true)

    const steps = [
      { label: 'Notification reads',   table: 'notification_reads',  col: 'user_id'    },
      { label: 'Student bookmarks',    table: 'student_bookmarks',   col: 'student_id' },
      { label: 'Homework submissions', table: 'homework_submissions', col: 'student_id' },
      { label: 'Attendance records',   table: 'attendance',          col: 'student_id' },
      { label: 'Fee records',          table: 'fee_records',         col: 'student_id' },
      { label: 'Student profiles',     table: 'student_profiles',    col: 'id'         },
    ]

    for (const step of steps) {
      try {
        const { error } = await supabase.from(step.table).delete().in(step.col, ids)
        if (error) console.error(`Delete error on ${step.table}:`, error.message)
      } catch (e) { console.error(e) }
      setStudentProgress(p => [...p, step.label])
    }

    // Messages need two passes (sender + receiver)
    try { await supabase.from('messages').delete().in('sender_id',   ids) } catch { /* ignore */ }
    try { await supabase.from('messages').delete().in('receiver_id', ids) } catch { /* ignore */ }
    setStudentProgress(p => [...p, 'Messages'])

    try {
      const { error } = await supabase.from('profiles').delete().in('id', ids)
      if (error) {
        console.error('Delete error on profiles:', error.message)
        toast.error('Failed to delete user accounts: ' + error.message)
        setDeletingStudents(false)
        return
      }
    } catch (e) { console.error(e) }
    setStudentProgress(p => [...p, 'User accounts'])

    setDeletingStudents(false)
    setStudentDone(true)
    setStudentList(prev => prev.filter(s => !ids.includes(s.id)))
    setSelectedStudents(new Set())
    toast.success(`${ids.length} student${ids.length > 1 ? 's' : ''} deleted.`)
  }

  // ── Teacher section ──
  const loadTeachers = async () => {
    setLoadingTeachers(true)
    const [{ data: profiles }, { data: tps }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email').eq('role', 'teacher').order('full_name'),
      supabase.from('teacher_profiles').select('id, subject'),
    ])
    const tpMap = {}; (tps ?? []).forEach(t => { tpMap[t.id] = t })
    setTeacherList((profiles ?? []).map(t => ({ ...t, subject: tpMap[t.id]?.subject ?? '—' })))
    setLoadingTeachers(false)
  }

  const toggleTeachersOpen = () => {
    const opening = !teachersOpen
    setTeachersOpen(opening)
    if (opening && teacherList.length === 0) loadTeachers()
    if (!opening) setSelectedTeachers(new Set())
  }

  const toggleTeacherSelect = (id) => {
    setSelectedTeachers(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const allTeachersSelected = teacherList.length > 0 && teacherList.every(t => selectedTeachers.has(t.id))

  const toggleSelectAllTeachers = () => {
    setSelectedTeachers(allTeachersSelected ? new Set() : new Set(teacherList.map(t => t.id)))
  }

  const runTeacherDelete = async () => {
    const ids = [...selectedTeachers]
    if (!ids.length) return
    setDeletingTeachers(true)

    try { await supabase.from('notification_reads').delete().in('user_id',    ids) } catch { /* ignore */ }
    setTeacherProgress(p => [...p, 'Notification reads'])

    try { await supabase.from('salary_records').delete().in('teacher_id', ids) } catch { /* ignore */ }
    setTeacherProgress(p => [...p, 'Salary records'])

    try { await supabase.from('messages').delete().in('sender_id',   ids) } catch { /* ignore */ }
    try { await supabase.from('messages').delete().in('receiver_id', ids) } catch { /* ignore */ }
    setTeacherProgress(p => [...p, 'Messages'])

    // Delete homework submissions for homework belonging to these teachers
    try {
      const { data: hwData } = await supabase.from('homework').select('id').in('teacher_id', ids)
      const hwIds = (hwData ?? []).map(h => h.id)
      if (hwIds.length > 0) {
        await supabase.from('homework_submissions').delete().in('homework_id', hwIds)
      }
    } catch { /* ignore */ }
    setTeacherProgress(p => [...p, 'Homework submissions'])

    try { await supabase.from('homework').delete().in('teacher_id',    ids) } catch { /* ignore */ }
    setTeacherProgress(p => [...p, 'Homework assignments'])

    try { await supabase.from('live_classes').delete().in('teacher_id', ids) } catch { /* ignore */ }
    setTeacherProgress(p => [...p, 'Live classes'])

    // Nullify FK columns and clean up teacher_ids array before deleting profiles.
    try {
      await supabase.from('batches').update({ teacher_id: null }).in('teacher_id', ids)
      const { data: bList } = await supabase.from('batches').select('id, teacher_ids')
      if (bList && bList.length > 0) {
        for (const b of bList) {
          if (Array.isArray(b.teacher_ids) && b.teacher_ids.some(tId => ids.includes(tId))) {
            const nextIds = b.teacher_ids.filter(tId => !ids.includes(tId))
            await supabase.from('batches').update({ teacher_ids: nextIds }).eq('id', b.id)
          }
        }
      }
    } catch { /* ignore */ }
    try { await supabase.from('study_cards').update({ added_by: null }).in('added_by', ids) } catch { /* ignore */ }
    try { await supabase.from('attendance').update({ marked_by: null }).in('marked_by', ids) } catch { /* ignore */ }
    try { await supabase.from('notifications').update({ created_by: null }).in('created_by', ids) } catch { /* ignore */ }
    setTeacherProgress(p => [...p, 'References cleared'])

    try { await supabase.from('teacher_profiles').delete().in('id', ids) } catch { /* ignore */ }
    setTeacherProgress(p => [...p, 'Teacher profiles'])

    try { await supabase.from('profiles').delete().in('id', ids) } catch { /* ignore */ }
    setTeacherProgress(p => [...p, 'User accounts'])

    setDeletingTeachers(false)
    setTeacherDone(true)
    setTeacherList(prev => prev.filter(t => !ids.includes(t.id)))
    setSelectedTeachers(new Set())
    toast.success(`${ids.length} teacher${ids.length > 1 ? 's' : ''} deleted.`)
  }

  const confirmed = input === CONFIRM_WORD

  return (
    <div className="p-3 sm:p-6 w-full max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Admin Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage institute-level settings and data.</p>
      </div>

      {/* ── Remove Students ── */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={toggleStudentsOpen}
          className="w-full bg-gray-50 px-5 py-4 flex items-center justify-between hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-gray-600 shrink-0" />
            <div className="text-left">
              <p className="font-semibold text-gray-800 text-sm">Remove Students</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Permanently delete one or more students and all their records.
              </p>
            </div>
          </div>
          {studentsOpen
            ? <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
            : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />}
        </button>

        {studentsOpen && (
          <div className="border-t border-gray-200 bg-white px-5 py-4 space-y-3">
            {loadingStudents ? (
              <p className="py-4 text-center text-sm text-gray-400">Loading students…</p>
            ) : (
              <>
                {/* Filters + select-all */}
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={batchFilter}
                    onChange={e => { setBatchFilter(e.target.value); setSelectedStudents(new Set()) }}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="">All Batches ({studentList.length})</option>
                    {batches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({studentList.filter(s => s.batch_id === b.id).length})
                      </option>
                    ))}
                  </select>
                  {visibleStudents.length > 0 && (
                    <button onClick={toggleSelectAllStudents} className="text-xs text-blue-700 hover:underline">
                      {allVisibleSelected ? 'Deselect All' : `Select All (${visibleStudents.length})`}
                    </button>
                  )}
                  {selectedStudents.size > 0 && (
                    <span className="text-xs text-gray-500 ml-auto">{selectedStudents.size} selected</span>
                  )}
                </div>

                {/* List */}
                {visibleStudents.length === 0 ? (
                  <p className="text-sm text-gray-400 py-3 text-center">No students found</p>
                ) : (
                  <div className="max-h-64 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
                    {visibleStudents.map(s => (
                      <label key={s.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedStudents.has(s.id)}
                          onChange={() => toggleStudentSelect(s.id)}
                          className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">{s.full_name}</p>
                          <p className="text-xs text-gray-400 truncate">{s.email} · {s.batch_name}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => { setStudentProgress([]); setStudentDone(false); setShowStudentModal(true) }}
                    disabled={selectedStudents.size === 0}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete {selectedStudents.size > 0
                      ? `${selectedStudents.size} Student${selectedStudents.size > 1 ? 's' : ''}`
                      : 'Selected'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Remove Teachers ── */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={toggleTeachersOpen}
          className="w-full bg-gray-50 px-5 py-4 flex items-center justify-between hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <UserCog className="h-5 w-5 text-gray-600 shrink-0" />
            <div className="text-left">
              <p className="font-semibold text-gray-800 text-sm">Remove Teachers</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Permanently delete one or more teachers and all their data.
              </p>
            </div>
          </div>
          {teachersOpen
            ? <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
            : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />}
        </button>

        {teachersOpen && (
          <div className="border-t border-gray-200 bg-white px-5 py-4 space-y-3">
            {loadingTeachers ? (
              <p className="py-4 text-center text-sm text-gray-400">Loading teachers…</p>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  {teacherList.length > 0 && (
                    <button onClick={toggleSelectAllTeachers} className="text-xs text-blue-700 hover:underline">
                      {allTeachersSelected ? 'Deselect All' : `Select All (${teacherList.length})`}
                    </button>
                  )}
                  {selectedTeachers.size > 0 && (
                    <span className="text-xs text-gray-500 ml-auto">{selectedTeachers.size} selected</span>
                  )}
                </div>

                {teacherList.length === 0 ? (
                  <p className="text-sm text-gray-400 py-3 text-center">No teachers found</p>
                ) : (
                  <div className="max-h-64 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
                    {teacherList.map(t => (
                      <label key={t.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedTeachers.has(t.id)}
                          onChange={() => toggleTeacherSelect(t.id)}
                          className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">{t.full_name}</p>
                          <p className="text-xs text-gray-400 truncate">{t.email} · {t.subject}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => { setTeacherProgress([]); setTeacherDone(false); setShowTeacherModal(true) }}
                    disabled={selectedTeachers.size === 0}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete {selectedTeachers.size > 0
                      ? `${selectedTeachers.size} Teacher${selectedTeachers.size > 1 ? 's' : ''}`
                      : 'Selected'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Teacher Permissions ── */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={togglePermsOpen}
          className="w-full bg-gray-50 px-5 py-4 flex items-center justify-between hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <ToggleRight className="h-5 w-5 text-blue-600 shrink-0" />
            <div className="text-left">
              <p className="font-semibold text-gray-800 text-sm">Teacher Permissions</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Control which teachers can manage homework and study cards.
              </p>
            </div>
          </div>
          {permsOpen
            ? <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
            : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />}
        </button>

        {permsOpen && (
          <div className="border-t border-gray-200 bg-white px-4 sm:px-5 py-4 space-y-4">
            {loadingPerms ? (
              <p className="py-6 text-center text-sm text-gray-400">Loading teachers…</p>
            ) : permList.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">No teachers found</p>
            ) : (
              <>
                {/* Desktop View: Full-width Table */}
                <div className="hidden md:block overflow-x-auto border border-gray-200/80 rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Teacher</th>
                        {ALL_PERMS.map(p => (
                          <th key={p.key} className="px-3 py-3 text-center whitespace-nowrap">{p.short}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {permList.map(t => (
                        <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-purple-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                                {t.full_name?.[0]?.toUpperCase() ?? '?'}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-900 truncate text-xs">{t.full_name}</p>
                                <p className="text-[10px] text-slate-400 truncate">{t.email}</p>
                              </div>
                            </div>
                          </td>
                          {ALL_PERMS.map(p => {
                            const val = !!t[p.key]
                            const isSaving = savingPerm === `${t.id}_${p.key}`
                            return (
                              <td key={p.key} className="px-3 py-3 text-center">
                                <button
                                  onClick={() => togglePerm(t.id, p.key, val)}
                                  disabled={isSaving}
                                  title={`${p.label}: ${val ? 'Enabled' : 'Disabled'}`}
                                  className={`p-1 rounded-lg transition-all ${
                                    isSaving ? 'opacity-40' : 'hover:scale-110 cursor-pointer'
                                  }`}
                                >
                                  {val
                                    ? <ToggleRight className="h-6 w-6 text-blue-600 mx-auto" />
                                    : <ToggleLeft  className="h-6 w-6 text-slate-300 mx-auto" />}
                                </button>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View: Flex/Grid Cards */}
                <div className="md:hidden space-y-3">
                  {permList.map(t => (
                    <div key={t.id} className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {t.full_name?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-slate-900 truncate">{t.full_name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{t.email}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                        {ALL_PERMS.map(p => {
                          const val = !!t[p.key]
                          const isSaving = savingPerm === `${t.id}_${p.key}`
                          return (
                            <button
                              key={p.key}
                              onClick={() => togglePerm(t.id, p.key, val)}
                              disabled={isSaving}
                              className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                                val
                                  ? 'bg-blue-50/90 border-blue-200 text-blue-900'
                                  : 'bg-white border-slate-200/80 text-slate-500'
                              }`}
                            >
                              <span>{p.label}</span>
                              {val
                                ? <ToggleRight className="h-5 w-5 text-blue-600 shrink-0" />
                                : <ToggleLeft  className="h-5 w-5 text-slate-300 shrink-0" />}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            <p className="text-xs text-slate-400">
              Changes take effect immediately across all teacher portals.
            </p>
          </div>
        )}
      </div>

      {/* ── Danger Zone ── */}
      <div className="border border-red-200 rounded-xl overflow-hidden">
        <div className="bg-red-50 px-5 py-4 flex items-center gap-3 border-b border-red-200">
          <ShieldAlert className="h-5 w-5 text-red-600 shrink-0" />
          <div>
            <p className="font-semibold text-red-700 text-sm">Danger Zone</p>
            <p className="text-xs text-red-600 mt-0.5">These actions are irreversible. Proceed with extreme caution.</p>
          </div>
        </div>

        <div className="px-5 py-5 bg-white space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-800">Reset All Institute Data</p>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Permanently deletes all students, teachers, batches, attendance, fees, messages,
                study cards, live classes, announcements, salary records, and homework.
                Your admin account will be preserved.
              </p>
              <div className="mt-2 flex items-start gap-1.5">
                <TriangleAlert className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700">
                  Supabase Auth login accounts are not removed by this action — delete them
                  manually from the Supabase Dashboard → Authentication → Users if needed.
                </p>
              </div>
            </div>
            <button
              onClick={openModal}
              className="shrink-0 flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Reset Data
            </button>
          </div>
        </div>
      </div>

      {/* ── Student Delete Modal ── */}
      {showStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    Delete {selectedStudents.size} Student{selectedStudents.size !== 1 ? 's' : ''}?
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">This cannot be undone.</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              {!studentDone ? (
                <>
                  <p className="text-sm text-gray-600">
                    The following students and all their data will be permanently deleted:
                  </p>
                  <ul className="text-xs text-gray-500 space-y-1 max-h-36 overflow-y-auto">
                    {studentList.filter(s => selectedStudents.has(s.id)).map(s => (
                      <li key={s.id} className="flex items-center gap-1.5">
                        <span className="text-red-400">•</span>
                        {s.full_name}
                        <span className="text-gray-400">({s.email})</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Includes attendance, fee records, homework submissions, bookmarks, and messages.
                  </p>

                  {deletingStudents && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <RefreshCcw className="h-4 w-4 animate-spin text-red-500" />
                        Deleting…
                      </div>
                      <div className="text-xs text-gray-400 space-y-0.5 max-h-28 overflow-y-auto">
                        {studentProgress.map(p => (
                          <div key={p} className="flex items-center gap-1.5">
                            <span className="text-green-500">✓</span> {p}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-4 space-y-2">
                  <div className="text-4xl">✓</div>
                  <p className="font-semibold text-gray-800">Deleted Successfully</p>
                  <p className="text-sm text-gray-500">The selected students have been removed.</p>
                </div>
              )}
            </div>

            <div className="px-6 pb-6 flex justify-end gap-3">
              {!studentDone ? (
                <>
                  <button
                    onClick={() => { if (!deletingStudents) setShowStudentModal(false) }}
                    disabled={deletingStudents}
                    className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={runStudentDelete}
                    disabled={deletingStudents}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {deletingStudents
                      ? <><RefreshCcw className="h-3.5 w-3.5 animate-spin" /> Deleting…</>
                      : <><Trash2 className="h-3.5 w-3.5" /> Confirm Delete</>}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowStudentModal(false)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-950 rounded-lg hover:bg-blue-900 transition-colors"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Teacher Delete Modal ── */}
      {showTeacherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    Delete {selectedTeachers.size} Teacher{selectedTeachers.size !== 1 ? 's' : ''}?
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">This cannot be undone.</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              {!teacherDone ? (
                <>
                  <p className="text-sm text-gray-600">
                    The following teachers and all their data will be permanently deleted:
                  </p>
                  <ul className="text-xs text-gray-500 space-y-1 max-h-36 overflow-y-auto">
                    {teacherList.filter(t => selectedTeachers.has(t.id)).map(t => (
                      <li key={t.id} className="flex items-center gap-1.5">
                        <span className="text-red-400">•</span>
                        {t.full_name}
                        <span className="text-gray-400">({t.email})</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Includes salary records, homework assignments, live classes, and messages.
                  </p>

                  {deletingTeachers && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <RefreshCcw className="h-4 w-4 animate-spin text-red-500" />
                        Deleting…
                      </div>
                      <div className="text-xs text-gray-400 space-y-0.5 max-h-28 overflow-y-auto">
                        {teacherProgress.map(p => (
                          <div key={p} className="flex items-center gap-1.5">
                            <span className="text-green-500">✓</span> {p}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-4 space-y-2">
                  <div className="text-4xl">✓</div>
                  <p className="font-semibold text-gray-800">Deleted Successfully</p>
                  <p className="text-sm text-gray-500">The selected teachers have been removed.</p>
                </div>
              )}
            </div>

            <div className="px-6 pb-6 flex justify-end gap-3">
              {!teacherDone ? (
                <>
                  <button
                    onClick={() => { if (!deletingTeachers) setShowTeacherModal(false) }}
                    disabled={deletingTeachers}
                    className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={runTeacherDelete}
                    disabled={deletingTeachers}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {deletingTeachers
                      ? <><RefreshCcw className="h-3.5 w-3.5 animate-spin" /> Deleting…</>
                      : <><Trash2 className="h-3.5 w-3.5" /> Confirm Delete</>}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowTeacherModal(false)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-950 rounded-lg hover:bg-blue-900 transition-colors"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Full Reset Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <TriangleAlert className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Confirm Full Reset</p>
                  <p className="text-xs text-gray-500 mt-0.5">This cannot be undone.</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              {!done ? (
                <>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    The following will be permanently deleted:
                  </p>
                  <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside leading-relaxed">
                    <li>All student &amp; teacher accounts (profiles)</li>
                    <li>All batches and enrollment data</li>
                    <li>All attendance, fees, salary records</li>
                    <li>All messages, announcements, notifications</li>
                    <li>All study cards, live classes, homework</li>
                    <li>QR payment settings</li>
                  </ul>
                  <p className="text-xs font-medium text-gray-700 mt-2">
                    Your admin account will <span className="text-green-600">not</span> be deleted.
                  </p>

                  {resetting ? (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <RefreshCcw className="h-4 w-4 animate-spin text-red-500" />
                        Deleting data…
                      </div>
                      <div className="text-xs text-gray-400 space-y-0.5 max-h-36 overflow-y-auto pr-1">
                        {progress.map(p => (
                          <div key={p} className="flex items-center gap-1.5">
                            <span className="text-green-500">✓</span> {p}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 pt-1">
                      <label className="block text-xs font-medium text-gray-700">
                        Type <span className="font-mono font-bold text-red-600">{CONFIRM_WORD}</span> to confirm
                      </label>
                      <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder={CONFIRM_WORD}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 font-mono"
                        autoFocus
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-4 space-y-2">
                  <div className="text-4xl">✓</div>
                  <p className="font-semibold text-gray-800">Reset Complete</p>
                  <p className="text-sm text-gray-500">
                    All institute data has been cleared. You can now start fresh.
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 pb-6 flex justify-end gap-3">
              {!done ? (
                <>
                  <button
                    onClick={closeModal}
                    disabled={resetting}
                    className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={runReset}
                    disabled={!confirmed || resetting}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {resetting
                      ? <><RefreshCcw className="h-3.5 w-3.5 animate-spin" /> Resetting…</>
                      : <><Trash2 className="h-3.5 w-3.5" /> Reset Everything</>}
                  </button>
                </>
              ) : (
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-950 rounded-lg hover:bg-blue-900 transition-colors"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
