import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  HelpCircle,
  CheckCircle2,
  Clock,
  Search,
  BookOpen,
  Filter,
  RefreshCw,
  Sparkles,
  X,
  ArrowRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import DoubtCard from '../../components/doubts/DoubtCard'
import DoubtSchemaAlert from '../../components/doubts/DoubtSchemaAlert'
import {
  fetchStudentDoubts,
  deleteDoubt,
  subscribeToDoubts,
} from '../../services/doubtService'

export default function StudentDoubts() {
  const { user } = useAuth()

  const [doubts, setDoubts] = useState([])
  const [stats, setStats] = useState({ total: 0, pending: 0, addressed: 0 })
  const [loading, setLoading] = useState(true)
  const [isSchemaReady, setIsSchemaReady] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'pending' | 'addressed'
  const [searchQuery, setSearchQuery] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  // Load student doubts
  const loadDoubts = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const res = await fetchStudentDoubts(user.id)
      setIsSchemaReady(res.isSchemaReady)
      setDoubts(res.doubts)
      setStats(res.stats)
    } catch (err) {
      toast.error(err.message || 'Failed to load doubts.')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadDoubts()
  }, [loadDoubts])

  // Realtime subscription for instant synchronization
  useEffect(() => {
    if (!user?.id) return
    const unsubscribe = subscribeToDoubts(() => {
      loadDoubts()
    })
    return () => unsubscribe()
  }, [user?.id, loadDoubts])

  // Handle student self-study deletion
  const handleDeleteDoubt = async (doubtId) => {
    if (!doubtId) return
    setDeletingId(doubtId)
    // Save previous state for rollback
    const prevDoubts = [...doubts]
    const target = doubts.find((d) => d.id === doubtId)
    // Optimistic removal
    setDoubts((prev) => prev.filter((d) => d.id !== doubtId))
    setStats((prev) => ({
      total: Math.max(0, prev.total - 1),
      pending: target?.status === 'pending' ? Math.max(0, prev.pending - 1) : prev.pending,
      addressed: target?.status === 'addressed' ? Math.max(0, prev.addressed - 1) : prev.addressed,
    }))

    try {
      await deleteDoubt(doubtId, user.id, false)
      toast.success('Doubt cleared! Great job resolving it through self-study.')
    } catch (err) {
      // Rollback
      setDoubts(prevDoubts)
      setStats({
        total: prevDoubts.length,
        pending: prevDoubts.filter((d) => d.status === 'pending').length,
        addressed: prevDoubts.filter((d) => d.status === 'addressed').length,
      })
      toast.error(err.message || 'Failed to delete doubt.')
    } finally {
      setDeletingId(null)
    }
  }

  // Filtered list
  const filteredDoubts = useMemo(() => {
    return doubts.filter((d) => {
      const matchStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'pending'
          ? d.status === 'pending'
          : d.status === 'addressed'

      const q = searchQuery.toLowerCase().trim()
      const matchQuery =
        !q ||
        d.question?.toLowerCase().includes(q) ||
        d.lecture_title?.toLowerCase().includes(q) ||
        d.subject?.toLowerCase().includes(q)

      return matchStatus && matchQuery
    })
  }, [doubts, statusFilter, searchQuery])

  return (
    <div className="max-w-5xl mx-auto w-full space-y-4 sm:space-y-6 min-w-0">
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4 min-w-0">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-amber-50 to-amber-100 text-amber-700 rounded-2xl border border-amber-200/80 shadow-2xs shrink-0">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  My Doubts Hub
                </h1>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100/70 text-amber-900 border border-amber-200/80 hidden xs:inline-block">
                  Academic Q&A
                </span>
              </div>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track questions asked during lectures, re-watch timestamps, or clear doubts resolved through self-study.
          </p>
        </div>

        <button
          type="button"
          onClick={loadDoubts}
          disabled={loading}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 shadow-2xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-amber-600' : 'text-slate-500'}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ── SCHEMA SETUP ALERT (IF MIGRATION 028 PENDING) ────────────────── */}
      {!isSchemaReady && <DoubtSchemaAlert isAdmin={false} onRetry={loadDoubts} />}

      {/* ── STATS CARDS (MINIMALISTIC & STRATEGIC) ───────────────────────── */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 min-w-0">
        {/* Total Doubts */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center gap-1.5 sm:gap-3.5 text-center sm:text-left min-w-0 transition-all hover:border-slate-300">
          <div className="p-2 sm:p-2.5 bg-blue-50 text-blue-700 rounded-xl sm:rounded-2xl shrink-0">
            <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider truncate">
              Total
            </p>
            <p className="text-base sm:text-2xl font-black text-slate-900 mt-0.5">
              {stats.total}
            </p>
          </div>
        </div>

        {/* Pending Review */}
        <div className="bg-gradient-to-br from-white to-amber-50/30 rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-amber-200/80 shadow-xs flex flex-col sm:flex-row items-center gap-1.5 sm:gap-3.5 text-center sm:text-left min-w-0 transition-all hover:border-amber-300">
          <div className="p-2 sm:p-2.5 bg-amber-100/70 text-amber-800 rounded-xl sm:rounded-2xl shrink-0">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-bold text-amber-700 uppercase tracking-wider truncate">
              Pending
            </p>
            <p className="text-base sm:text-2xl font-black text-amber-950 mt-0.5">
              {stats.pending}
            </p>
          </div>
        </div>

        {/* Addressed in Class */}
        <div className="bg-gradient-to-br from-white to-emerald-50/30 rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-emerald-200/80 shadow-xs flex flex-col sm:flex-row items-center gap-1.5 sm:gap-3.5 text-center sm:text-left min-w-0 transition-all hover:border-emerald-300">
          <div className="p-2 sm:p-2.5 bg-emerald-100/70 text-emerald-800 rounded-xl sm:rounded-2xl shrink-0">
            <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-bold text-emerald-700 uppercase tracking-wider truncate">
              Addressed
            </p>
            <p className="text-base sm:text-2xl font-black text-emerald-950 mt-0.5">
              {stats.addressed}
            </p>
          </div>
        </div>
      </div>

      {/* ── CONTROLS: SEGMENTED FILTER TABS & SEARCH ─────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 shadow-xs min-w-0">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl shrink-0 overflow-x-auto min-w-0">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'all'
                ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({stats.total})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'pending'
                ? 'bg-white text-amber-900 shadow-2xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pending ({stats.pending})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('addressed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'addressed'
                ? 'bg-white text-emerald-900 shadow-2xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Addressed ({stats.addressed})
          </button>
        </div>

        {/* Search Input with Instant Clear */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions, subjects, lectures…"
            className="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all placeholder-slate-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-md transition-colors cursor-pointer"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── DOUBTS LIST ─────────────────────────────────────────────────── */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 space-y-2 bg-white rounded-3xl border border-slate-200/80">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-amber-500" />
          <p className="font-semibold text-slate-600">Loading your doubts…</p>
        </div>
      ) : filteredDoubts.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-slate-200/80 shadow-xs space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-700 mx-auto flex items-center justify-center border border-amber-200/60 shadow-2xs">
            <HelpCircle className="h-6 w-6" />
          </div>
          <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
            {searchQuery
              ? 'No doubts match your search'
              : statusFilter === 'pending'
              ? 'No pending doubts'
              : statusFilter === 'addressed'
              ? 'No addressed doubts yet'
              : 'You have not asked any doubts yet'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            {doubts.length === 0 ? (
              <>
                When watching a video lecture in your Study section, tap the{' '}
                <strong className="font-bold text-slate-700">Ask Doubt</strong> button
                to submit questions at that exact lecture timestamp!
              </>
            ) : (
              'Try clearing your search query or switching filter tabs to see other doubts.'
            )}
          </p>
          {doubts.length === 0 ? (
            <div className="pt-2">
              <Link
                to="/student/study"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs bg-blue-950 text-white hover:bg-blue-900 active:scale-95 transition-all shadow-xs cursor-pointer"
              >
                <BookOpen className="h-3.5 w-3.5 text-amber-400" />
                <span>Go to Study Section</span>
                <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
              </Link>
            </div>
          ) : (
            searchQuery && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
                >
                  Clear search query
                </button>
              </div>
            )
          )}
        </div>
      ) : (
        <div className="space-y-3.5 sm:space-y-4">
          {filteredDoubts.map((doubt) => (
            <DoubtCard
              key={doubt.id}
              doubt={doubt}
              role="student"
              onDelete={handleDeleteDoubt}
              isDeleting={deletingId === doubt.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}
