import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  HelpCircle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Layers,
  ChevronDown,
  ChevronRight,
  History,
  Sparkles,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import DoubtCard from '../../components/doubts/DoubtCard'
import DoubtSchemaAlert from '../../components/doubts/DoubtSchemaAlert'
import {
  fetchTeacherDoubts,
  markDoubtAddressed,
  subscribeToDoubts,
} from '../../services/doubtService'

export default function TeacherDoubts() {
  const { user, profile } = useAuth()

  const [doubts, setDoubts] = useState([])
  const [allDoubts, setAllDoubts] = useState([])
  const [batches, setBatches] = useState([])
  const [groups, setGroups] = useState({})
  const [stats, setStats] = useState({ pending: 0, addressedToday: 0 })
  const [loading, setLoading] = useState(true)
  const [isSchemaReady, setIsSchemaReady] = useState(true)
  const [resolvingId, setResolvingId] = useState(null)

  // Filter states
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [batchFilter, setBatchFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewHistory, setViewHistory] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState({})

  // Load teacher doubts
  const loadDoubts = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const res = await fetchTeacherDoubts(user.id)
      setIsSchemaReady(res.isSchemaReady)
      setDoubts(res.doubts)
      setAllDoubts(res.allDoubts ?? res.doubts)
      setBatches(res.batches ?? [])
      setGroups(res.groups ?? {})
      setStats(res.stats ?? { pending: 0, addressedToday: 0 })
    } catch (err) {
      toast.error(err.message || 'Failed to load teacher doubts.')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadDoubts()
  }, [loadDoubts])

  // Realtime subscription
  useEffect(() => {
    if (!user?.id) return
    const unsubscribe = subscribeToDoubts(() => {
      loadDoubts()
    })
    return () => unsubscribe()
  }, [user?.id, loadDoubts])

  // Handle Mark as Addressed in Class
  const handleMarkAddressed = async (doubtId) => {
    if (!doubtId) return
    setResolvingId(doubtId)

    // Save previous state for rollback
    const prevDoubts = [...doubts]
    const target = doubts.find((d) => d.id === doubtId)

    // Optimistic mutation: remove from active teacher pending queue
    setDoubts((prev) => prev.filter((d) => d.id !== doubtId))
    setStats((prev) => ({
      pending: Math.max(0, prev.pending - 1),
      addressedToday: prev.addressedToday + 1,
    }))

    try {
      await markDoubtAddressed(
        doubtId,
        user.id,
        profile?.full_name || 'Teacher'
      )
      toast.success('Doubt marked as addressed in class!')
    } catch (err) {
      // Rollback on failure
      setDoubts(prevDoubts)
      setStats({
        pending: prevDoubts.length,
        addressedToday: Math.max(0, stats.addressedToday),
      })
      toast.error(err.message || 'Failed to update doubt status.')
    } finally {
      setResolvingId(null)
    }
  }

  // Toggle group accordion
  const toggleGroup = (key) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  // Distinct subjects for filter pills
  const availableSubjects = useMemo(() => {
    const list = new Set()
    allDoubts.forEach((d) => {
      if (d.subject) list.add(d.subject)
    })
    return Array.from(list).sort()
  }, [allDoubts])

  // Distinct batches for filter pills
  const availableBatches = useMemo(() => {
    const map = new Map()
    batches.forEach((b) => map.set(b.id, b.name))
    allDoubts.forEach((d) => {
      if (d.batch_id && d.batch_name) map.set(d.batch_id, d.batch_name)
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [batches, allDoubts])

  // Filtered dataset
  const currentDoubts = useMemo(() => {
    const pool = viewHistory
      ? allDoubts.filter((d) => d.status === 'addressed')
      : doubts // pending only

    return pool.filter((d) => {
      const matchSubject = subjectFilter === 'all' || d.subject === subjectFilter
      const matchBatch = batchFilter === 'all' || d.batch_id === batchFilter

      const q = searchQuery.toLowerCase().trim()
      const matchQuery =
        !q ||
        d.question?.toLowerCase().includes(q) ||
        d.student_name?.toLowerCase().includes(q) ||
        d.roll_number?.toLowerCase().includes(q) ||
        d.lecture_title?.toLowerCase().includes(q)

      return matchSubject && matchBatch && matchQuery
    })
  }, [doubts, allDoubts, viewHistory, subjectFilter, batchFilter, searchQuery])

  // Re-group filtered items by Subject & Batch
  const groupedDoubts = useMemo(() => {
    const map = {}
    currentDoubts.forEach((d) => {
      const subj = d.subject || 'General'
      const batch = d.batch_name || 'General Batch'
      const key = `${subj} — ${batch}`
      if (!map[key]) {
        map[key] = {
          subject: subj,
          batchName: batch,
          items: [],
        }
      }
      map[key].items.push(d)
    })
    return map
  }, [currentDoubts])

  const groupKeys = Object.keys(groupedDoubts)

  return (
    <div className="max-w-6xl mx-auto w-full space-y-4 sm:space-y-6 min-w-0">
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4 min-w-0">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-50 text-amber-700 rounded-2xl border border-amber-200/80 shrink-0">
              <HelpCircle className="h-5 w-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Faculty Doubt Hub
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Questions asked by students in your assigned batches & subjects during lecture playback.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto min-w-0">
          {/* History Toggle */}
          <button
            type="button"
            onClick={() => setViewHistory((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border active:scale-95 ${
              viewHistory
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <History className="h-3.5 w-3.5 shrink-0" />
            <span>{viewHistory ? 'Active Pending' : 'Resolved History'}</span>
          </button>

          {/* Refresh */}
          <button
            type="button"
            onClick={loadDoubts}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── SCHEMA SETUP ALERT ──────────────────────────────────────────── */}
      {!isSchemaReady && <DoubtSchemaAlert isAdmin={false} onRetry={loadDoubts} />}

      {/* ── STATS BAR ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4 min-w-0">
        {/* Active Pending */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-5 border border-amber-200/80 shadow-xs flex flex-col sm:flex-row items-center gap-2 sm:gap-3.5 text-center sm:text-left bg-gradient-to-br from-white to-amber-50/20 min-w-0">
          <div className="p-2 sm:p-3 bg-amber-50 text-amber-700 rounded-xl sm:rounded-2xl shrink-0">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-bold text-amber-600/90 uppercase tracking-wider truncate">
              Pending Queue
            </p>
            <p className="text-lg sm:text-2xl font-black text-amber-950 mt-0.5">
              {stats.pending}
            </p>
          </div>
        </div>

        {/* Addressed Today */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-5 border border-emerald-200/80 shadow-xs flex flex-col sm:flex-row items-center gap-2 sm:gap-3.5 text-center sm:text-left bg-gradient-to-br from-white to-emerald-50/20 min-w-0">
          <div className="p-2 sm:p-3 bg-emerald-50 text-emerald-700 rounded-xl sm:rounded-2xl shrink-0">
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-bold text-emerald-600/90 uppercase tracking-wider truncate">
              Addressed Today
            </p>
            <p className="text-lg sm:text-2xl font-black text-emerald-950 mt-0.5">
              {stats.addressedToday}
            </p>
          </div>
        </div>
      </div>

      {/* ── CONTROLS: SUBJECT-WISE & BATCH-WISE FILTERS ─────────────────── */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
        {/* Search */}
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student name, roll number, question, or lecture…"
            className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all placeholder-slate-400"
          />
        </div>

        {/* Filter Pills (Subject & Batch) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-100">
          {/* Subject Filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
              Subject:
            </span>
            <button
              type="button"
              onClick={() => setSubjectFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                subjectFilter === 'all'
                  ? 'bg-blue-950 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All
            </button>
            {availableSubjects.map((subj) => (
              <button
                key={subj}
                type="button"
                onClick={() => setSubjectFilter(subj)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  subjectFilter === subj
                    ? 'bg-blue-950 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {subj}
              </button>
            ))}
          </div>

          {/* Batch Selector */}
          {availableBatches.length > 0 && (
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Batch:
              </span>
              <select
                value={batchFilter}
                onChange={(e) => setBatchFilter(e.target.value)}
                className="text-xs font-bold px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="all">All Batches</option>
                {availableBatches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ── SUBJECT-WISE & BATCH-WISE GROUPED DOUBTS ─────────────────────── */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 space-y-2">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-amber-500" />
          <p>Loading doubts for your classes…</p>
        </div>
      ) : groupKeys.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-slate-200/80 shadow-xs space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-700 mx-auto flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
            {viewHistory
              ? 'No resolved doubts match current filters'
              : 'Zero Pending Doubts! All caught up.'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {viewHistory
              ? 'You have not marked any doubts as addressed yet, or they do not match the active filter.'
              : 'When students in your batches ask questions during lecture playback, they will appear right here organized by subject and batch.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupKeys.map((groupKey) => {
            const group = groupedDoubts[groupKey]
            const isCollapsed = collapsedGroups[groupKey]

            return (
              <div
                key={groupKey}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden"
              >
                {/* Group Accordion Header */}
                <button
                  type="button"
                  onClick={() => toggleGroup(groupKey)}
                  className="w-full px-5 py-4 bg-slate-50/80 hover:bg-slate-100/70 border-b border-slate-200/60 flex items-center justify-between text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-indigo-50 text-indigo-700 rounded-xl">
                      <Layers className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="font-black text-sm text-slate-900 tracking-tight">
                        {group.subject}{' '}
                        <span className="text-slate-400 font-normal">/</span>{' '}
                        <span className="text-slate-700">{group.batchName}</span>
                      </h2>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-200/70">
                      {group.items.length} {viewHistory ? 'Addressed' : 'Pending'}
                    </span>
                    {isCollapsed ? (
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* Group Items */}
                {!isCollapsed && (
                  <div className="p-4 sm:p-5 space-y-4">
                    {group.items.map((doubt) => (
                      <DoubtCard
                        key={doubt.id}
                        doubt={doubt}
                        role="teacher"
                        onMarkAddressed={handleMarkAddressed}
                        isResolving={resolvingId === doubt.id}
                      />
                    ))}
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
