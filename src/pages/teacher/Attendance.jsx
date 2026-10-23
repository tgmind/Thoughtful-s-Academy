// src/pages/teacher/Attendance.jsx
// Teacher Portal: Realtime Batch Attentiveness Session Command Center & Analytics

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  CalendarCheck,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  Play,
  Square,
  AlertTriangle,
  RefreshCw,
  Search,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Flame,
  ShieldAlert,
  BarChart2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  initiateAttendanceSession,
  closeAttendanceSession,
  getActiveSessionForBatch,
  getSessionRoster,
  getAttendanceSessionsHistory,
  getComprehensiveAttendanceAnalytics,
} from '../../services/attendanceService'

const DURATION_PRESETS = [3, 5, 10, 15, 20]

export default function TeacherAttendance() {
  const { user } = useAuth()
  const [batches, setBatches] = useState([])
  const [selectedBatchId, setSelectedBatchId] = useState('')
  const [loading, setLoading] = useState(true)

  // Session Initiation State
  const [sessionTitle, setSessionTitle] = useState('Lecture Attentiveness Check')
  const [durationMinutes, setDurationMinutes] = useState(5)
  const [isStarting, setIsStarting] = useState(false)

  // Active Session Live State
  const [activeSession, setActiveSession] = useState(null)
  const [countdownSeconds, setCountdownSeconds] = useState(0)
  const [liveRoster, setLiveRoster] = useState([])
  const [rosterStats, setRosterStats] = useState(null)
  const [isClosing, setIsClosing] = useState(false)
  const [confirmCloseModal, setConfirmCloseModal] = useState(false)

  // Search & Filter
  const [rosterSearch, setRosterSearch] = useState('')
  const [rosterFilter, setRosterFilter] = useState('all') // 'all' | 'present' | 'pending' | 'absent'

  // History & Analytics
  const [historySessions, setHistorySessions] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [expandedSessionId, setExpandedSessionId] = useState(null)
  const [expandedRoster, setExpandedRoster] = useState(null)
  const [loadingExpanded, setLoadingExpanded] = useState(false)

  // 1. Load Batches assigned to this teacher
  const loadTeacherBatches = useCallback(async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('batches')
        .select('id, name, subject, teacher_id, teacher_ids')
        .eq('is_active', true)
        .order('name')

      if (error) throw error

      // Filter batches where teacher is assigned (or admin fallback)
      const assigned = (data || []).filter(
        b => b.teacher_id === user.id || (Array.isArray(b.teacher_ids) && b.teacher_ids.includes(user.id))
      )
      const availableBatches = assigned.length > 0 ? assigned : (data || [])
      setBatches(availableBatches)

      if (availableBatches.length > 0 && !selectedBatchId) {
        setSelectedBatchId(availableBatches[0].id)
      }
    } catch (err) {
      console.error('Failed to load teacher batches:', err)
      toast.error('Failed to load assigned batches')
    }
  }, [user, selectedBatchId])

  // 2. Load active session & roster for current selected batch
  const loadBatchSessionData = useCallback(async (bId) => {
    if (!bId) return
    try {
      const [
        { data: liveSess, secondsRemaining },
        { data: history },
        analyticsData,
      ] = await Promise.all([
        getActiveSessionForBatch(bId),
        getAttendanceSessionsHistory(bId, 15),
        getComprehensiveAttendanceAnalytics({ batchId: bId, days: 30 }),
      ])

      setActiveSession(liveSess)
      setCountdownSeconds(secondsRemaining)
      setHistorySessions(history || [])
      setAnalytics(analyticsData)

      if (liveSess) {
        const { roster, stats } = await getSessionRoster(liveSess.id, bId)
        setLiveRoster(roster)
        setRosterStats(stats)
      } else {
        setLiveRoster([])
        setRosterStats(null)
      }
    } catch (err) {
      console.error('Failed to load batch session data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTeacherBatches()
  }, [loadTeacherBatches])

  useEffect(() => {
    if (selectedBatchId) {
      loadBatchSessionData(selectedBatchId)
    }
  }, [selectedBatchId, loadBatchSessionData])

  // Realtime subscription for sessions and attendance
  useEffect(() => {
    if (!selectedBatchId) return

    const channel = supabase
      .channel(`teacher_attendance_sync_${selectedBatchId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_sessions' }, () => {
        loadBatchSessionData(selectedBatchId)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => {
        loadBatchSessionData(selectedBatchId)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedBatchId, loadBatchSessionData])

  // Countdown clock interval for active session
  useEffect(() => {
    if (!activeSession || countdownSeconds <= 0) return

    const timer = setInterval(() => {
      setCountdownSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          toast('Attendance session expired and closed automatically.', { icon: '⏰' })
          loadBatchSessionData(selectedBatchId)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [activeSession, countdownSeconds, selectedBatchId, loadBatchSessionData])

  // Action: Launch a new attentiveness check
  const handleLaunchSession = async (e) => {
    e.preventDefault()
    if (!selectedBatchId) {
      toast.error('Please select a batch')
      return
    }

    setIsStarting(true)
    try {
      const { data, error } = await initiateAttendanceSession({
        batchId: selectedBatchId,
        durationMinutes,
        title: sessionTitle.trim() || 'Lecture Attentiveness Check',
      })

      if (error) {
        toast.error(error.message || 'Failed to start attendance session')
      } else {
        toast.success(`Attentiveness check initiated for ${durationMinutes} mins!`)
        await loadBatchSessionData(selectedBatchId)
      }
    } catch (err) {
      toast.error('Error starting session: ' + err.message)
    } finally {
      setIsStarting(false)
    }
  }

  // Action: Close session early
  const handleCloseSession = async () => {
    if (!activeSession) return
    setIsClosing(true)
    try {
      const { success, summary, error } = await closeAttendanceSession(activeSession.id)
      if (error) {
        toast.error(error.message || 'Failed to close session')
      } else {
        toast.success(`Session closed! ${summary?.marked_present ?? 0} Present, ${summary?.marked_absent ?? 0} Absent.`)
        setConfirmCloseModal(false)
        await loadBatchSessionData(selectedBatchId)
      }
    } catch (err) {
      toast.error('Error closing session: ' + err.message)
    } finally {
      setIsClosing(false)
    }
  }

  // Action: Expand past session roster drilldown
  const handleToggleExpandSession = async (sessId) => {
    if (expandedSessionId === sessId) {
      setExpandedSessionId(null)
      setExpandedRoster(null)
      return
    }

    setExpandedSessionId(sessId)
    setLoadingExpanded(true)
    try {
      const { roster, stats } = await getSessionRoster(sessId, selectedBatchId)
      setExpandedRoster({ roster, stats })
    } catch (err) {
      toast.error('Failed to load session roster')
    } finally {
      setLoadingExpanded(false)
    }
  }

  // Filtered live roster
  const filteredLiveRoster = useMemo(() => {
    return (liveRoster || []).filter(s => {
      const matchesSearch =
        s.full_name.toLowerCase().includes(rosterSearch.toLowerCase()) ||
        s.roll_number.toLowerCase().includes(rosterSearch.toLowerCase())
      const matchesFilter = rosterFilter === 'all' || s.status === rosterFilter
      return matchesSearch && matchesFilter
    })
  }, [liveRoster, rosterSearch, rosterFilter])

  const selectedBatchObj = batches.find(b => b.id === selectedBatchId)

  return (
    <div className="space-y-6 pb-20 lg:pb-0">

      {/* ── Top Header & Batch Selector ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <CalendarCheck className="h-6 w-6 text-blue-950" />
            <span>Attendance & Attentiveness Center</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Initiate real-time attentiveness checks and monitor live student verification
          </p>
        </div>

        {/* Batch Dropdown */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-gray-600 uppercase tracking-wider shrink-0">
            Batch:
          </label>
          <select
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 font-bold text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-950 min-w-[200px]"
          >
            {batches.map(b => (
              <option key={b.id} value={b.id}>
                {b.name} {b.subject ? `(${b.subject})` : ''}
              </option>
            ))}
          </select>
          <button
            onClick={() => loadBatchSessionData(selectedBatchId)}
            className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Active Session Live Command Center (If a session is active) ── */}
      {activeSession ? (
        <div className="relative overflow-hidden bg-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-emerald-500/40">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 animate-pulse" />

          {/* Session Top Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] font-black tracking-widest uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Live Attentiveness Check Active
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {activeSession.title}
              </h2>
              <p className="text-xs text-slate-400">
                Batch: <strong className="text-slate-200">{selectedBatchObj?.name}</strong> • Started:{' '}
                {new Date(activeSession.started_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            {/* Countdown & End Session Button */}
            <div className="flex items-center gap-3">
              <div className="px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-700/80 font-mono text-center">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Remaining</p>
                <p className="text-2xl font-black text-emerald-400 tracking-tight">
                  {String(Math.floor(countdownSeconds / 60)).padStart(2, '0')}:
                  {String(countdownSeconds % 60).padStart(2, '0')}
                </p>
              </div>

              <button
                onClick={() => setConfirmCloseModal(true)}
                disabled={isClosing}
                className="px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-95 font-bold text-xs sm:text-sm text-white transition-all shadow-lg shadow-rose-600/20 flex items-center gap-2"
              >
                <Square className="h-4 w-4 fill-white" />
                <span>End Session Now</span>
              </button>
            </div>
          </div>

          {/* Realtime Live Statistics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
              <p className="text-xs text-slate-400 font-medium">Total Enrolled</p>
              <p className="text-2xl font-black text-white mt-1">{rosterStats?.totalEnrolled || 0}</p>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
              <p className="text-xs text-emerald-400 font-medium">Marked Present</p>
              <p className="text-2xl font-black text-emerald-400 mt-1">{rosterStats?.presentCount || 0}</p>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
              <p className="text-xs text-amber-400 font-medium">Pending Verification</p>
              <p className="text-2xl font-black text-amber-400 mt-1">{rosterStats?.pendingCount || 0}</p>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
              <p className="text-xs text-cyan-400 font-medium">Attentiveness Rate</p>
              <p className="text-2xl font-black text-cyan-400 mt-1">{rosterStats?.attentivenessRate || 0}%</p>
            </div>
          </div>

          {/* Live Student Roster Grid */}
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-400" />
                <span>Live Student Attentiveness Monitor ({filteredLiveRoster.length})</span>
              </h3>

              {/* Roster Filter & Search */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search student…"
                    value={rosterSearch}
                    onChange={(e) => setRosterSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400 w-44"
                  />
                </div>

                <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-0.5 text-xs font-semibold">
                  {['all', 'present', 'pending'].map(f => (
                    <button
                      key={f}
                      onClick={() => setRosterFilter(f)}
                      className={`px-3 py-1 rounded-lg capitalize transition-colors ${
                        rosterFilter === f ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Roster Table */}
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
              <table className="w-full text-xs">
                <thead className="bg-slate-900 text-slate-400 uppercase font-bold tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-left">Roll</th>
                    <th className="px-4 py-3 text-left">Student</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Verified Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredLiveRoster.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                        No students match the criteria
                      </td>
                    </tr>
                  ) : (
                    filteredLiveRoster.map(s => (
                      <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-slate-300">{s.roll_number}</td>
                        <td className="px-4 py-3 font-semibold text-white">{s.full_name}</td>
                        <td className="px-4 py-3">
                          {s.status === 'present' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              <CheckCircle className="h-3 w-3" />
                              Present
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                              <Clock className="h-3 w-3" />
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-400 font-mono">
                          {s.marked_at ? new Date(s.marked_at).toLocaleTimeString('en-IN') : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* ── Initiate Attentiveness Check Launcher Card ── */
        <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-7 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-950 flex items-center justify-center shadow-inner">
              <Play className="h-6 w-6 ml-0.5 text-blue-950" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
                Launch Attentiveness Check
              </h2>
              <p className="text-xs sm:text-sm text-gray-500">
                Trigger an on-demand verification window for {selectedBatchObj?.name || 'this batch'}
              </p>
            </div>
          </div>

          <form onSubmit={handleLaunchSession} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Session Topic / Lecture Name
                </label>
                <input
                  type="text"
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  placeholder="e.g. Physics Ch-4 Motion Attentiveness Check"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-950"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Window Duration (Minutes)
                </label>
                <div className="flex items-center gap-2">
                  {DURATION_PRESETS.map(mins => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDurationMinutes(mins)}
                      className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all ${
                        durationMinutes === mins
                          ? 'bg-blue-950 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-20 px-3 py-2.5 rounded-xl border border-gray-200 text-center text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-950"
                  />
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-800">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Attentive Check Protocol:</p>
                <p className="mt-0.5 leading-relaxed text-amber-700">
                  A high-priority notification and live countdown popup will immediately activate on the screens of all students in <strong>{selectedBatchObj?.name}</strong>. When the {durationMinutes}-minute timer expires, all unverified students will be permanently recorded as <strong>Absent</strong> and this cannot be altered by students.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={isStarting}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-blue-950 hover:bg-blue-900 active:scale-95 text-white font-bold text-sm shadow-xl shadow-blue-950/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Play className="h-4 w-4 fill-white" />
              <span>{isStarting ? 'Initiating Window…' : `Start ${durationMinutes}-Minute Attentiveness Check`}</span>
            </button>
          </form>
        </div>
      )}

      {/* ── Batch Attendance Analytics Summary Cards ── */}
      {analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">30-Day Attentiveness Rate</p>
            <p className={`text-3xl font-black mt-2 ${
              analytics.summary.overallRate >= 75 ? 'text-emerald-600' : analytics.summary.overallRate >= 50 ? 'text-amber-500' : 'text-rose-600'
            }`}>
              {analytics.summary.overallRate}%
            </p>
            <p className="text-[11px] text-gray-400 mt-1">Across all recent sessions</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Sessions Conducted</p>
            <p className="text-3xl font-black text-gray-900 mt-2">{analytics.summary.totalSessions}</p>
            <p className="text-[11px] text-gray-400 mt-1">Attentiveness checks</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Total Marks Verified</p>
            <p className="text-3xl font-black text-emerald-600 mt-2">{analytics.summary.totalPresent}</p>
            <p className="text-[11px] text-gray-400 mt-1">Student attendance confirmations</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Critical At-Risk Students</p>
            <p className="text-3xl font-black text-rose-600 mt-2">{analytics.summary.atRiskCount}</p>
            <p className="text-[11px] text-gray-400 mt-1">&lt; 50% attendance rate</p>
          </div>
        </div>
      )}

      {/* ── Past Sessions History & Expandable Rosters ── */}
      <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900 text-sm sm:text-base">Session History & Verification Logs</h3>
            <p className="text-xs text-gray-400 mt-0.5">Audit log of all attentiveness checks for {selectedBatchObj?.name}</p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 bg-slate-100 rounded-full text-slate-700">
            {historySessions.length} Sessions
          </span>
        </div>

        {historySessions.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">
            No attendance sessions conducted for this batch yet.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {historySessions.map(sess => {
              const isExpanded = expandedSessionId === sess.id
              return (
                <div key={sess.id} className="transition-colors">
                  <div
                    onClick={() => handleToggleExpandSession(sess.id)}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/70 cursor-pointer"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          sess.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {sess.status === 'active' ? 'Active Window' : 'Closed'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(sess.started_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} at{' '}
                          {new Date(sess.started_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <h4 className="font-bold text-gray-900 text-sm sm:text-base">{sess.title}</h4>
                      <p className="text-xs text-gray-500">
                        Proctor: <strong>{sess.profiles?.full_name || 'Teacher'}</strong> • Duration: {sess.duration_minutes}m
                      </p>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className={`text-base font-black ${
                          sess.rate_pct >= 75 ? 'text-emerald-600' : sess.rate_pct >= 50 ? 'text-amber-500' : 'text-rose-600'
                        }`}>
                          {sess.rate_pct}% Present
                        </p>
                        <p className="text-[11px] text-gray-400">
                          {sess.present_count} Present • {sess.absent_count} Absent
                        </p>
                      </div>

                      <button
                        type="button"
                        className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                      >
                        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Session Roster Drilldown */}
                  {isExpanded && (
                    <div className="bg-slate-50 p-5 border-t border-gray-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="font-bold text-xs uppercase tracking-wider text-slate-600">
                          Session Student Roster
                        </h5>
                        {expandedRoster?.stats && (
                          <span className="text-xs text-slate-500">
                            {expandedRoster.stats.presentCount} of {expandedRoster.stats.totalEnrolled} Verified
                          </span>
                        )}
                      </div>

                      {loadingExpanded ? (
                        <div className="py-6 text-center text-xs text-gray-400">Loading roster drilldown…</div>
                      ) : expandedRoster?.roster?.length ? (
                        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                          <table className="w-full text-xs">
                            <thead className="bg-gray-50 text-gray-500 uppercase font-bold">
                              <tr>
                                <th className="px-4 py-2 text-left">Roll</th>
                                <th className="px-4 py-2 text-left">Student Name</th>
                                <th className="px-4 py-2 text-left">Status</th>
                                <th className="px-4 py-2 text-left">Marked At</th>
                                <th className="px-4 py-2 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {expandedRoster.roster.map(r => (
                                <tr key={r.id} className="hover:bg-gray-50/50">
                                  <td className="px-4 py-2.5 font-mono font-bold text-gray-700">{r.roll_number}</td>
                                  <td className="px-4 py-2.5 font-semibold text-gray-900">{r.full_name}</td>
                                  <td className="px-4 py-2.5">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                      r.status === 'present'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-rose-100 text-rose-800'
                                    }`}>
                                      {r.status === 'present' ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                      {r.status}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5 text-gray-400 font-mono">
                                    {r.marked_at ? new Date(r.marked_at).toLocaleTimeString('en-IN') : 'Auto-absent'}
                                  </td>
                                  <td className="px-4 py-2.5 text-right">
                                    <Link
                                      to={`/teacher/messages?contact=${r.id}`}
                                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:underline"
                                    >
                                      <MessageCircle className="h-3 w-3" />
                                      Message
                                    </Link>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 py-3">No student records found for this session.</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── At-Risk Students Intervention Watchlist ── */}
      {analytics?.atRiskStudents?.length > 0 && (
        <div className="bg-white rounded-3xl border border-rose-100 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-rose-700">
            <ShieldAlert className="h-5 w-5" />
            <h3 className="font-bold text-sm sm:text-base">
              At-Risk Students Watchlist (&lt; 75% Attentiveness Rate)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {analytics.atRiskStudents.map(s => (
              <div key={s.id} className="p-4 rounded-2xl bg-rose-50/50 border border-rose-100 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-gray-900 text-xs sm:text-sm truncate">{s.full_name}</p>
                  <p className="text-[11px] text-gray-500">Roll: {s.roll_number} • Missed: {s.absent} sessions</p>
                  <p className="text-xs font-black text-rose-600 mt-1">{s.rate}% Attentive</p>
                </div>
                <Link
                  to={`/teacher/messages?contact=${s.id}`}
                  className="p-2.5 rounded-xl bg-white text-rose-700 hover:bg-rose-100 border border-rose-200 shadow-sm transition-colors"
                  title="Message Student"
                >
                  <MessageCircle className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Confirm End Session Modal ── */}
      {confirmCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-gray-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Square className="h-6 w-6 fill-rose-600" />
            </div>

            <h3 className="text-lg font-black text-gray-900">End Attendance Session Early?</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Ending this session will immediately finalize records. All {rosterStats?.pendingCount || 0} students who have not yet confirmed presence will be <strong>permanently marked absent</strong>.
            </p>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setConfirmCloseModal(false)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCloseSession}
                disabled={isClosing}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md disabled:opacity-50"
              >
                {isClosing ? 'Finalizing…' : 'Yes, End & Finalize Absentees'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
