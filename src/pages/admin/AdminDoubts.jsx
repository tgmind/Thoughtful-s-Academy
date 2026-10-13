import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  HelpCircle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Users,
  Layers,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  UserCheck,
  AlertCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import DoubtCard from '../../components/doubts/DoubtCard'
import DoubtSchemaAlert from '../../components/doubts/DoubtSchemaAlert'
import {
  fetchAdminDoubts,
  markDoubtAddressed,
  deleteDoubt,
  subscribeToDoubts,
} from '../../services/doubtService'

export default function AdminDoubts() {
  const { user, profile } = useAuth()

  const [doubts, setDoubts] = useState([])
  const [teachers, setTeachers] = useState([])
  const [batches, setBatches] = useState([])
  const [teacherGroups, setTeacherGroups] = useState({})
  const [unassignedGroup, setUnassignedGroup] = useState({ items: [], pendingCount: 0, addressedCount: 0 })
  const [subjectBatchGroups, setSubjectBatchGroups] = useState({})
  const [stats, setStats] = useState({ total: 0, pending: 0, addressed: 0, unassigned: 0 })
  const [loading, setLoading] = useState(true)
  const [isSchemaReady, setIsSchemaReady] = useState(true)

  // View mode: 'teacher' (View A) | 'subjectBatch' (View B)
  const [viewMode, setViewMode] = useState('teacher')

  // Filters
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'pending' | 'addressed'
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTeacherId, setSelectedTeacherId] = useState('all')
  const [selectedSubject, setSelectedSubject] = useState('all')
  const [collapsedSections, setCollapsedSections] = useState({})
  const [resolvingId, setResolvingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  // Load admin doubts
  const loadDoubts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchAdminDoubts()
      setIsSchemaReady(res.isSchemaReady)
      setDoubts(res.doubts)
      setTeachers(res.teachers ?? [])
      setBatches(res.batches ?? [])
      setTeacherGroups(res.teacherGroups ?? {})
      setUnassignedGroup(res.unassignedGroup ?? { items: [], pendingCount: 0, addressedCount: 0 })
      setSubjectBatchGroups(res.subjectBatchGroups ?? {})
      setStats(res.stats ?? { total: 0, pending: 0, addressed: 0, unassigned: 0 })
    } catch (err) {
      toast.error(err.message || 'Failed to load doubt hub data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDoubts()
  }, [loadDoubts])

  // Realtime subscription
  useEffect(() => {
    const unsubscribe = subscribeToDoubts(() => {
      loadDoubts()
    })
    return () => unsubscribe()
  }, [loadDoubts])

  // Mark doubt addressed
  const handleMarkAddressed = async (doubtId) => {
    if (!doubtId) return
    setResolvingId(doubtId)
    try {
      await markDoubtAddressed(
        doubtId,
        user?.id,
        profile?.full_name || 'Administrator'
      )
      toast.success('Doubt marked as addressed in class!')
      loadDoubts()
    } catch (err) {
      toast.error(err.message || 'Failed to mark doubt as addressed.')
    } finally {
      setResolvingId(null)
    }
  }

  // Delete doubt (Admin moderation)
  const handleDeleteDoubt = async (doubtId) => {
    if (!doubtId) return
    setDeletingId(doubtId)
    try {
      await deleteDoubt(doubtId, user?.id, true)
      toast.success('Doubt deleted successfully.')
      loadDoubts()
    } catch (err) {
      toast.error(err.message || 'Failed to delete doubt.')
    } finally {
      setDeletingId(null)
    }
  }

  const toggleSection = (key) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  // Available subjects for filtering
  const availableSubjects = useMemo(() => {
    const set = new Set()
    doubts.forEach((d) => {
      if (d.subject) set.add(d.subject)
    })
    return Array.from(set).sort()
  }, [doubts])

  // Match item against active filters
  const filterDoubt = useCallback(
    (d) => {
      const matchStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'pending'
          ? d.status === 'pending'
          : d.status === 'addressed'

      const matchSubject =
        selectedSubject === 'all' ? true : d.subject === selectedSubject

      const q = searchQuery.toLowerCase().trim()
      const matchQuery =
        !q ||
        d.question?.toLowerCase().includes(q) ||
        d.student_name?.toLowerCase().includes(q) ||
        d.roll_number?.toLowerCase().includes(q) ||
        d.lecture_title?.toLowerCase().includes(q) ||
        d.subject?.toLowerCase().includes(q) ||
        d.batch_name?.toLowerCase().includes(q)

      return matchStatus && matchSubject && matchQuery
    },
    [statusFilter, selectedSubject, searchQuery]
  )

  return (
    <div className="max-w-6xl mx-auto w-full space-y-4 sm:space-y-6 min-w-0">
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4 min-w-0">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-950 text-amber-400 rounded-2xl shadow-xs shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Doubt Resolution Central
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Complete institutional audit of student doubts with dual Teacher-wise and Subject/Batch views.
          </p>
        </div>

        <button
          type="button"
          onClick={loadDoubts}
          disabled={loading}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Records</span>
        </button>
      </div>

      {/* ── SCHEMA SETUP ALERT (IF MIGRATION 028 PENDING) ────────────────── */}
      {!isSchemaReady && <DoubtSchemaAlert isAdmin={true} onRetry={loadDoubts} />}

      {/* ── STATS BAR ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 min-w-0">
        {/* Total Doubts */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-slate-200/80 shadow-xs min-w-0">
          <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">
            Total Inquiries
          </p>
          <p className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5">
            {stats.total}
          </p>
        </div>

        {/* Pending */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-amber-200/80 shadow-xs bg-gradient-to-br from-white to-amber-50/20 min-w-0">
          <p className="text-[10px] sm:text-[11px] font-bold text-amber-600 uppercase tracking-wider truncate">
            Pending
          </p>
          <p className="text-lg sm:text-2xl font-black text-amber-950 mt-0.5">
            {stats.pending}
          </p>
        </div>

        {/* Addressed */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-emerald-200/80 shadow-xs bg-gradient-to-br from-white to-emerald-50/20 min-w-0">
          <p className="text-[10px] sm:text-[11px] font-bold text-emerald-600 uppercase tracking-wider truncate">
            Addressed
          </p>
          <p className="text-lg sm:text-2xl font-black text-emerald-950 mt-0.5">
            {stats.addressed}
          </p>
        </div>

        {/* Unassigned */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-rose-200/80 shadow-xs bg-gradient-to-br from-white to-rose-50/20 min-w-0">
          <p className="text-[10px] sm:text-[11px] font-bold text-rose-600 uppercase tracking-wider truncate">
            Unassigned
          </p>
          <p className="text-lg sm:text-2xl font-black text-rose-950 mt-0.5">
            {stats.unassigned}
          </p>
        </div>
      </div>

      {/* ── VIEW MODE SELECTOR (DUAL VIEW TOGGLE) ────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-3xl border border-slate-200/80 shadow-xs">
        {/* View Toggle Tabs */}
        <div className="inline-flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('teacher')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'teacher'
                ? 'bg-blue-950 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>View A: Teacher-wise</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('subjectBatch')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'subjectBatch'
                ? 'bg-blue-950 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>View B: Subject & Batch-wise</span>
          </button>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-white text-amber-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pending
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('addressed')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'addressed'
                ? 'bg-white text-emerald-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Addressed
          </button>
        </div>
      </div>

      {/* ── SEARCH & ATTRIBUTE FILTERS ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student name, roll number, question, or lecture…"
            className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all placeholder-slate-400"
          />
        </div>

        {/* Subject Filter */}
        {availableSubjects.length > 0 && (
          <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Subject:
            </span>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="text-xs font-bold px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 w-full sm:w-auto"
            >
              <option value="all">All Subjects</option>
              {availableSubjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Teacher Filter (in Teacher-wise mode) */}
        {viewMode === 'teacher' && teachers.length > 0 && (
          <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Faculty:
            </span>
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="text-xs font-bold px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 w-full sm:w-auto"
            >
              <option value="all">All Faculty</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name}
                </option>
              ))}
              <option value="unassigned">Unassigned Only</option>
            </select>
          </div>
        )}
      </div>

      {/* ── MAIN CONTENT ACCORDION PANELS ───────────────────────────────── */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 space-y-2">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-amber-500" />
          <p>Compiling institutional doubt data…</p>
        </div>
      ) : doubts.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-slate-200/80 shadow-xs space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-700 mx-auto flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
            Zero Inquiries in System
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            No doubts have been submitted by students yet across all academy batches.
          </p>
        </div>
      ) : viewMode === 'teacher' ? (
        /* ══════════════ VIEW A: TEACHER-WISE GROUPING ══════════════ */
        <div className="space-y-6">
          {/* Loop over teachers */}
          {teachers
            .filter((t) => selectedTeacherId === 'all' || selectedTeacherId === t.id)
            .map((teacher) => {
              const grp = teacherGroups[teacher.id] || { items: [], pendingCount: 0, addressedCount: 0 }
              const filteredItems = grp.items.filter(filterDoubt)
              const isCollapsed = collapsedSections[`teacher_${teacher.id}`]

              return (
                <div
                  key={teacher.id}
                  className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden"
                >
                  {/* Teacher Header */}
                  <button
                    type="button"
                    onClick={() => toggleSection(`teacher_${teacher.id}`)}
                    className="w-full px-5 py-4 bg-slate-50/80 hover:bg-slate-100/70 border-b border-slate-200/60 flex items-center justify-between text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs border border-indigo-200/80">
                        {teacher.full_name ? teacher.full_name.slice(0, 2).toUpperCase() : 'T'}
                      </div>
                      <div>
                        <h2 className="font-black text-sm text-slate-900 tracking-tight">
                          {teacher.full_name}
                        </h2>
                        <p className="text-[11px] text-slate-500">
                          {teacher.email || 'Assigned Educator'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-200/70">
                        {grp.pendingCount} Pending
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-200/70">
                        {grp.addressedCount} Addressed
                      </span>
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {/* Doubts List */}
                  {!isCollapsed && (
                    <div className="p-4 sm:p-5 space-y-4">
                      {filteredItems.length === 0 ? (
                        <p className="text-xs text-slate-400 italic text-center py-4">
                          No doubts for this educator matching active filters.
                        </p>
                      ) : (
                        filteredItems.map((doubt) => (
                          <DoubtCard
                            key={doubt.id}
                            doubt={doubt}
                            role="admin"
                            onMarkAddressed={handleMarkAddressed}
                            onDelete={handleDeleteDoubt}
                            isResolving={resolvingId === doubt.id}
                            isDeleting={deletingId === doubt.id}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>
              )
            })}

          {/* Unassigned Section */}
          {(selectedTeacherId === 'all' || selectedTeacherId === 'unassigned') && (
            <div className="bg-white rounded-3xl border border-rose-200/80 shadow-xs overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('unassigned')}
                className="w-full px-5 py-4 bg-rose-50/60 hover:bg-rose-100/60 border-b border-rose-200/60 flex items-center justify-between text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs border border-rose-300">
                    <AlertCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="font-black text-sm text-rose-950 tracking-tight">
                      Unassigned Doubts Queue
                    </h2>
                    <p className="text-[11px] text-rose-700">
                      Doubts without an assigned batch teacher
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-rose-200 text-rose-900">
                    {unassignedGroup.items.length} Total
                  </span>
                  {collapsedSections['unassigned'] ? (
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  )}
                </div>
              </button>

              {!collapsedSections['unassigned'] && (
                <div className="p-4 sm:p-5 space-y-4">
                  {unassignedGroup.items.filter(filterDoubt).length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-4">
                      No unassigned doubts in queue.
                    </p>
                  ) : (
                    unassignedGroup.items.filter(filterDoubt).map((doubt) => (
                      <DoubtCard
                        key={doubt.id}
                        doubt={doubt}
                        role="admin"
                        onMarkAddressed={handleMarkAddressed}
                        onDelete={handleDeleteDoubt}
                        isResolving={resolvingId === doubt.id}
                        isDeleting={deletingId === doubt.id}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* ══════════════ VIEW B: SUBJECT & BATCH-WISE GROUPING ══════════════ */
        <div className="space-y-6">
          {Object.keys(subjectBatchGroups).map((key) => {
            const grp = subjectBatchGroups[key]
            const filteredItems = grp.items.filter(filterDoubt)
            const isCollapsed = collapsedSections[`sb_${key}`]

            if (selectedSubject !== 'all' && grp.subject !== selectedSubject) {
              return null
            }

            return (
              <div
                key={key}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleSection(`sb_${key}`)}
                  className="w-full px-5 py-4 bg-slate-50/80 hover:bg-slate-100/70 border-b border-slate-200/60 flex items-center justify-between text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-indigo-50 text-indigo-700 rounded-xl">
                      <Layers className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="font-black text-sm text-slate-900 tracking-tight">
                        {grp.subject}{' '}
                        <span className="text-slate-400 font-normal">/</span>{' '}
                        <span className="text-slate-700">{grp.batchName}</span>
                      </h2>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-200/70">
                      {grp.pendingCount} Pending
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-200/70">
                      {grp.addressedCount} Addressed
                    </span>
                    {isCollapsed ? (
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {!isCollapsed && (
                  <div className="p-4 sm:p-5 space-y-4">
                    {filteredItems.length === 0 ? (
                      <p className="text-xs text-slate-400 italic text-center py-4">
                        No doubts matching current status or search query.
                      </p>
                    ) : (
                      filteredItems.map((doubt) => (
                        <DoubtCard
                          key={doubt.id}
                          doubt={doubt}
                          role="admin"
                          onMarkAddressed={handleMarkAddressed}
                          onDelete={handleDeleteDoubt}
                          isResolving={resolvingId === doubt.id}
                          isDeleting={deletingId === doubt.id}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
