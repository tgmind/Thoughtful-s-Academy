import { useState, useEffect, useMemo } from 'react'
import { BookOpen, Users, UserCheck, Check, Search, X, Plus, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'

export default function BatchSubjectSyncModal({
  isOpen,
  onClose,
  batch,
  addedSubjects = [],
  onSyncComplete,
}) {
  const [mode, setMode] = useState('all') // 'all' | 'specific'
  const [students, setStudents] = useState([])
  const [loadingStudents, setLoadingStudents] = useState(true)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [selectedSubjects, setSelectedSubjects] = useState(() => new Set(addedSubjects))
  const [searchQuery, setSearchQuery] = useState('')
  const [syncing, setSyncing] = useState(false)

  // Reset selected subjects and mode when modal opens or addedSubjects changes
  useEffect(() => {
    setSelectedSubjects(new Set(addedSubjects))
  }, [addedSubjects, isOpen])

  // Fetch enrolled students for this batch when modal opens
  useEffect(() => {
    if (!isOpen || !batch?.id) return

    let cancelled = false
    setLoadingStudents(true)
    setSearchQuery('')
    setMode('all')

    const fetchStudents = async () => {
      try {
        const { data, error } = await supabase
          .from('student_profiles')
          .select('id, subjects, roll_number, profiles(full_name, email)')
          .eq('batch_id', batch.id)

        if (error) throw error
        if (cancelled) return

        const formatted = (data || []).map((sp) => {
          const profile = Array.isArray(sp.profiles) ? sp.profiles[0] : sp.profiles
          return {
            id: sp.id,
            full_name: profile?.full_name || 'Enrolled Student',
            email: profile?.email || '',
            roll_number: sp.roll_number || '—',
            subjects: Array.isArray(sp.subjects) ? sp.subjects : [],
          }
        })

        setStudents(formatted)
        // Default select all students
        setSelectedIds(new Set(formatted.map((s) => s.id)))
      } catch (err) {
        console.error('Error fetching batch students for subject sync:', err)
        toast.error('Could not load student roster for this batch')
      } finally {
        if (!cancelled) setLoadingStudents(false)
      }
    }

    fetchStudents()

    return () => {
      cancelled = true
    }
  }, [isOpen, batch?.id])

  // Filter students based on search query
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students
    const q = searchQuery.toLowerCase().trim()
    return students.filter(
      (s) =>
        s.full_name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.roll_number && s.roll_number.toLowerCase().includes(q))
    )
  }, [students, searchQuery])

  // Subject selection handlers
  const toggleSubject = (sub) => {
    setSelectedSubjects((prev) => {
      const next = new Set(prev)
      if (next.has(sub)) {
        if (next.size <= 1) {
          toast.error('Select at least one subject to sync')
          return prev
        }
        next.delete(sub)
      } else {
        next.add(sub)
      }
      return next
    })
  }

  const selectAllSubjects = () => {
    setSelectedSubjects(new Set(addedSubjects))
  }

  // Student selection handlers
  const toggleSelectStudent = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllStudents = () => {
    setSelectedIds(new Set(students.map((s) => s.id)))
  }

  const clearStudentSelection = () => {
    setSelectedIds(new Set())
  }

  // Handle Sync Execution
  const handleSync = async () => {
    const subjectsToSync = Array.from(selectedSubjects)
    if (!batch?.id || subjectsToSync.length === 0) {
      toast.error('Please select at least one subject to sync')
      return
    }

    const targetStudentIds = mode === 'all' ? null : Array.from(selectedIds)

    if (mode === 'specific' && targetStudentIds.length === 0) {
      toast.error('Please select at least one student or choose "Update All Students"')
      return
    }

    setSyncing(true)

    try {
      // 1. Try atomic database RPC
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('sync_batch_subjects', {
        p_batch_id: batch.id,
        p_new_subjects: subjectsToSync,
        p_student_ids: targetStudentIds,
      })

      if (rpcErr) {
        console.warn('RPC sync_batch_subjects failed, using direct update fallback:', rpcErr.message)
        // 2. Resilient Direct Update Fallback
        const targets = mode === 'all' ? students : students.filter((s) => selectedIds.has(s.id))
        let updatedCount = 0

        for (const st of targets) {
          const merged = Array.from(new Set([...(st.subjects || []), ...subjectsToSync]))
          const { error: updErr } = await supabase
            .from('student_profiles')
            .update({ subjects: merged })
            .eq('id', st.id)
          if (!updErr) updatedCount++
        }

        toast.success(
          `Successfully enrolled ${updatedCount} student(s) in: ${subjectsToSync.join(', ')}`
        )
        if (onSyncComplete) onSyncComplete(updatedCount)
        onClose()
        return
      }

      const count = rpcRes?.updated_count ?? (mode === 'all' ? students.length : targetStudentIds.length)
      toast.success(
        `Successfully enrolled ${count} student(s) in: ${subjectsToSync.join(', ')}`
      )
      if (onSyncComplete) onSyncComplete(count)
      onClose()
    } catch (err) {
      console.error('Error syncing batch subjects to students:', err)
      toast.error(err.message || 'Failed to sync subjects to students')
    } finally {
      setSyncing(false)
    }
  }

  if (!isOpen) return null

  const subjectsToSync = Array.from(selectedSubjects)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sync-modal-title"
      className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-lg w-full border border-slate-200/90 overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[88vh] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        {/* Mobile Pull Indicator */}
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />

        {/* Header - Resilient Non-Breaking Layout */}
        <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100/90 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white flex items-center justify-center shadow-xs shrink-0">
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <h3 id="sync-modal-title" className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-tight">
                  Sync New Subjects to Students
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5 min-w-0 flex-wrap">
                  <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 truncate max-w-[170px] sm:max-w-[240px]">
                    {batch?.name}
                  </span>
                  <span className="text-slate-300 font-bold text-xs shrink-0">•</span>
                  <span className="text-[11px] text-slate-500 font-semibold whitespace-nowrap shrink-0">
                    {students.length} Enrolled Student{students.length === 1 ? '' : 's'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={syncing}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer active:scale-95 -mr-1"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body - Overscroll contained, compact spacing */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 overflow-y-auto space-y-3.5 overscroll-contain">
          {/* Newly Added Subjects Interactive Selection Card */}
          <div className="bg-slate-50/90 rounded-2xl p-3.5 border border-slate-200/80">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Select Subjects to Sync:
                </span>
                <span className="text-[11px] text-slate-500 font-medium block">
                  Tap any subject chip to include or exclude
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200/70 whitespace-nowrap">
                  {selectedSubjects.size} of {addedSubjects.length} selected
                </span>
                {selectedSubjects.size < addedSubjects.length && (
                  <button
                    type="button"
                    onClick={selectAllSubjects}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                  >
                    Select All
                  </button>
                )}
              </div>
            </div>

            {/* Interactive Pill Buttons for choosing which subjects are synced */}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {addedSubjects.map((sub) => {
                const isSelected = selectedSubjects.has(sub)
                return (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => toggleSubject(sub)}
                    aria-pressed={isSelected}
                    title={isSelected ? `Click to exclude ${sub}` : `Click to include ${sub}`}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-2xs active:scale-95 ${
                      isSelected
                        ? 'bg-blue-950 border-blue-950 text-white shadow-xs'
                        : 'bg-white border-slate-200/90 text-slate-600 hover:border-slate-300 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    {isSelected ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                    ) : (
                      <Plus className="w-3.5 h-3.5 text-slate-400 stroke-[2.5]" />
                    )}
                    <span>{sub}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Sync Mode Choice Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
            {/* Mode 1: All Students */}
            <button
              type="button"
              onClick={() => setMode('all')}
              className={`p-3 sm:p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                mode === 'all'
                  ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-2 ring-indigo-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    mode === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Users className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 truncate">All Enrolled Students</h4>
                  <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                    Update all {students.length} in cohort
                  </p>
                </div>
              </div>
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                  mode === 'all'
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-slate-300'
                }`}
              >
                {mode === 'all' && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </button>

            {/* Mode 2: Specific Students */}
            <button
              type="button"
              onClick={() => setMode('specific')}
              className={`p-3 sm:p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                mode === 'specific'
                  ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-2 ring-indigo-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    mode === 'specific' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 truncate">Select Specific Students</h4>
                  <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                    Choose individuals to enroll
                  </p>
                </div>
              </div>
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                  mode === 'specific'
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-slate-300'
                }`}
              >
                {mode === 'specific' && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </button>
          </div>

          {/* Selective Roster Section (Visible only when mode === 'specific') */}
          {mode === 'specific' && (
            <div className="space-y-2.5 pt-1 animate-in fade-in duration-150">
              {/* Controls bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by student name or roll..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-1.5 shrink-0 text-xs">
                  <button
                    type="button"
                    onClick={selectAllStudents}
                    className="px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300 font-bold">|</span>
                  <button
                    type="button"
                    onClick={clearStudentSelection}
                    className="px-2.5 py-1 text-[11px] font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                    {selectedIds.size}/{students.length}
                  </span>
                </div>
              </div>

              {/* Scrollable Roster list */}
              <div className="border border-slate-200/90 rounded-2xl overflow-hidden max-h-48 sm:max-h-56 overflow-y-auto divide-y divide-slate-100 bg-white">
                {loadingStudents ? (
                  <div className="p-6 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" /> Loading student roster…
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    No students match your search filter.
                  </div>
                ) : (
                  filteredStudents.map((st) => {
                    const isSelected = selectedIds.has(st.id)
                    const alreadyHasAll = subjectsToSync.every((sub) =>
                      (st.subjects || []).includes(sub)
                    )

                    return (
                      <div
                        key={st.id}
                        onClick={() => toggleSelectStudent(st.id)}
                        className={`p-2.5 px-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                          isSelected ? 'bg-indigo-50/40' : 'hover:bg-slate-50/70'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectStudent(st.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 text-indigo-600 rounded-md border-slate-300 focus:ring-indigo-500 cursor-pointer shrink-0"
                          />
                          <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 text-xs font-black flex items-center justify-center shrink-0 border border-slate-200">
                            {st.full_name?.charAt(0)?.toUpperCase() || 'S'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-800 truncate">
                                {st.full_name}
                              </span>
                              {st.roll_number && st.roll_number !== '—' && (
                                <span className="text-[10px] font-semibold text-slate-400">
                                  #{st.roll_number}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-slate-400 truncate">
                              {st.email || 'No email registered'}
                            </div>
                          </div>
                        </div>

                        {/* Current Subjects or status badge */}
                        <div className="flex items-center gap-1 shrink-0">
                          {alreadyHasAll ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              Already Enrolled
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                              {(st.subjects || []).length} subject
                              {(st.subjects || []).length === 1 ? '' : 's'}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-t border-slate-100 bg-slate-50/80 flex flex-col-reverse sm:flex-row items-center sm:justify-between gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={syncing}
            className="w-full sm:w-auto py-2 sm:py-2.5 px-3.5 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 rounded-xl transition-all cursor-pointer text-center active:scale-95"
          >
            Skip / Keep Batch Only
          </button>

          <button
            type="button"
            onClick={handleSync}
            disabled={syncing || selectedSubjects.size === 0 || (mode === 'specific' && selectedIds.size === 0)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-950 to-indigo-950 hover:from-blue-900 hover:to-indigo-900 text-white text-xs sm:text-sm font-extrabold rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer active:scale-95"
          >
            {syncing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>Enrolling Students…</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 stroke-[3] shrink-0" />
                <span>
                  {mode === 'all'
                    ? `Enroll All ${students.length} Students`
                    : `Enroll ${selectedIds.size} Selected Students`}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
