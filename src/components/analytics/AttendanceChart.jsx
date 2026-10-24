// src/components/analytics/AttendanceChart.jsx
// Upgraded Executive Attendance & Attentiveness Intelligence Command Center

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts'
import { Link } from 'react-router-dom'
import {
  MessageCircle,
  CalendarCheck,
  Clock,
  CheckCircle,
  XCircle,
  Play,
  Square,
  AlertTriangle,
  Users,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Search,
  ShieldAlert,
  Flame,
  Radio,
  Layers,
  Calendar,
  Sparkles,
  ShieldCheck,
  Activity,
  UserCheck,
  AlertCircle,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import {
  getComprehensiveAttendanceAnalytics,
  initiateAttendanceSession,
  closeAttendanceSession,
  getSessionRoster,
  getAttendanceSessionsHistory,
} from '../../services/attendanceService'

const DURATION_PRESETS = [3, 5, 10, 15, 20]

export default function AttendanceChart() {
  const [loading, setLoading] = useState(true)
  const [batches, setBatches] = useState([])
  const [selectedBatch, setSelectedBatch] = useState('all')
  const [timeframeDays, setTimeframeDays] = useState(30)

  // Analytics data from service
  const [analytics, setAnalytics] = useState(null)
  const [sessionsHistory, setSessionsHistory] = useState([])

  // Live Admin Launcher State
  const [showLauncherModal, setShowLauncherModal] = useState(false)
  const [launchBatchId, setLaunchBatchId] = useState('')
  const [launchTitle, setLaunchTitle] = useState('Institute Attentiveness Check')
  const [launchDuration, setLaunchDuration] = useState(5)
  const [isLaunching, setIsLaunching] = useState(false)

  // Session Close State
  const [closingSessionId, setClosingSessionId] = useState(null)

  // Expandable Session Roster Drilldown
  const [expandedSessionId, setExpandedSessionId] = useState(null)
  const [expandedRosterData, setExpandedRosterData] = useState(null)
  const [loadingExpanded, setLoadingExpanded] = useState(false)

  // At-risk threshold filter ('50' | '75')
  const [atRiskThreshold, setAtRiskThreshold] = useState('50')
  const [atRiskSearch, setAtRiskSearch] = useState('')

  // 1. Fetch available batches
  const loadBatches = useCallback(async () => {
    try {
      const { data } = await supabase.from('batches').select('id, name').eq('is_active', true).order('name')
      setBatches(data || [])
      if (data && data.length > 0 && !launchBatchId) {
        setLaunchBatchId(data[0].id)
      }
    } catch (err) {
      console.error('Failed to load batches:', err)
    }
  }, [launchBatchId])

  // 2. Fetch comprehensive analytics
  const loadAnalytics = useCallback(async () => {
    try {
      const bId = selectedBatch === 'all' ? null : selectedBatch
      const [res, { data: hist }] = await Promise.all([
        getComprehensiveAttendanceAnalytics({ batchId: bId, days: timeframeDays }),
        getAttendanceSessionsHistory(bId, 20),
      ])
      setAnalytics(res)
      setSessionsHistory(hist || [])
    } catch (err) {
      console.error('Failed to load attendance analytics:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedBatch, timeframeDays])

  useEffect(() => {
    loadBatches()
  }, [loadBatches])

  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('admin_analytics_attendance_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_sessions' }, () => {
        loadAnalytics()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => {
        loadAnalytics()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadAnalytics])

  // Admin initiates session for a batch
  const handleLaunchSession = async (e) => {
    e.preventDefault()
    if (!launchBatchId) {
      toast.error('Please select a batch')
      return
    }
    setIsLaunching(true)
    try {
      const { data, error } = await initiateAttendanceSession({
        batchId: launchBatchId,
        durationMinutes: launchDuration,
        title: launchTitle.trim() || 'Institute Attentiveness Check',
      })
      if (error) {
        toast.error(error.message || 'Failed to start attendance session')
      } else {
        toast.success(`Attentiveness check initiated for ${launchDuration} mins!`)
        setShowLauncherModal(false)
        await loadAnalytics()
      }
    } catch (err) {
      toast.error('Error starting session: ' + err.message)
    } finally {
      setIsLaunching(false)
    }
  }

  // Admin closes active session early
  const handleCloseSession = async (sessId) => {
    setClosingSessionId(sessId)
    try {
      const { success, summary, error } = await closeAttendanceSession(sessId)
      if (error) {
        toast.error(error.message || 'Failed to close session')
      } else {
        toast.success(`Session ended! ${summary?.marked_present ?? 0} Present, ${summary?.marked_absent ?? 0} Absent.`)
        await loadAnalytics()
      }
    } catch (err) {
      toast.error('Error closing session: ' + err.message)
    } finally {
      setClosingSessionId(null)
    }
  }

  // Toggle drilldown into session roster
  const handleToggleExpandSession = async (sess) => {
    if (expandedSessionId === sess.id) {
      setExpandedSessionId(null)
      setExpandedRosterData(null)
      return
    }

    setExpandedSessionId(sess.id)
    setLoadingExpanded(true)
    try {
      const { roster, stats } = await getSessionRoster(sess.id, sess.batch_id)
      setExpandedRosterData({ roster, stats })
    } catch (err) {
      toast.error('Failed to load session roster')
    } finally {
      setLoadingExpanded(false)
    }
  }

  // Filtered at-risk list
  const filteredAtRisk = useMemo(() => {
    if (!analytics?.atRiskStudents) return []
    const thresholdNum = Number(atRiskThreshold)
    return analytics.atRiskStudents.filter(s => {
      const matchesSearch =
        s.full_name.toLowerCase().includes(atRiskSearch.toLowerCase()) ||
        s.roll_number.toLowerCase().includes(atRiskSearch.toLowerCase()) ||
        s.batch_name.toLowerCase().includes(atRiskSearch.toLowerCase())
      const matchesThreshold = s.rate < thresholdNum
      return matchesSearch && matchesThreshold
    })
  }, [analytics, atRiskThreshold, atRiskSearch])

  if (loading) {
    return <div className="py-16 text-center text-gray-400 text-sm">Loading attendance analytics…</div>
  }

  const { summary, batchBreakdown, trend, currentlyActive } = analytics || {
    summary: { totalSessions: 0, totalMarks: 0, totalPresent: 0, totalAbsent: 0, overallRate: 0, atRiskCount: 0 },
    batchBreakdown: [],
    trend: [],
    currentlyActive: [],
  }

  return (
    <div className="space-y-6">

      {/* ── Filter Bar & Actions ── */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-4 sm:p-6 space-y-4 transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-700 shadow-2xs">
              <Activity className="h-3 w-3 text-indigo-600" /> Proctoring Engine & Telemetry
            </span>
            <h3 className="font-display font-black text-base sm:text-lg text-slate-900 tracking-tight mt-1">
              Attentiveness Parameters & Live Check Launcher
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Filter by batch cohort, inspect engagement windows, or broadcast an instant check.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => loadAnalytics()}
              className="w-10 h-10 rounded-2xl border border-slate-200/90 bg-slate-50/80 hover:bg-slate-100 active:scale-95 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
              title="Refresh Analytics Telemetry"
              aria-label="Refresh Analytics Telemetry"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowLauncherModal(true)}
              className="px-4 sm:px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-950 via-indigo-950 to-blue-900 text-white font-extrabold text-xs flex items-center gap-2 shadow-md shadow-blue-950/25 hover:shadow-lg hover:scale-[1.01] active:scale-95 transition-all cursor-pointer"
            >
              <Play className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span>Launch Attentiveness Check</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          {/* Batch Selector */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
              <Layers className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1 sm:flex-initial">
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block leading-none mb-1">
                Batch Filter
              </label>
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="w-full sm:w-auto px-3 py-1.5 rounded-xl border border-slate-200/90 bg-slate-50/90 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900 cursor-pointer shadow-2xs"
              >
                <option value="all">All Academic Batches</option>
                {batches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Timeframe Selector Capsule */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block leading-none mb-1">
                Timeframe Window
              </label>
              <div className="inline-flex rounded-xl bg-slate-100/90 p-1 border border-slate-200/80 shadow-inner gap-1">
                {[
                  { label: '7 Days', val: 7 },
                  { label: '30 Days', val: 30 },
                  { label: '90 Days', val: 90 },
                ].map(t => (
                  <button
                    key={t.val}
                    type="button"
                    onClick={() => setTimeframeDays(t.val)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      timeframeDays === t.val
                        ? 'bg-white text-blue-950 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Live Active Sessions Banner (if any live right now) ── */}
      {currentlyActive && currentlyActive.length > 0 && (
        <div className="space-y-3">
          {currentlyActive.map(sess => (
            <div
              key={sess.id}
              className="relative overflow-hidden bg-gradient-to-br from-[#070b16] via-[#0d1424] to-[#0a1020] text-white rounded-3xl p-4 sm:p-5 border border-emerald-500/40 shadow-xl shadow-emerald-950/20 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              {/* Subtle ambient decorative glow */}
              <div className="absolute -top-16 -right-16 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-center gap-3.5 min-w-0 relative z-10">
                <div className="relative p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0 shadow-inner">
                  <Radio className="h-6 w-6" />
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 ring-2 ring-slate-950" />
                  </span>
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase tracking-wider whitespace-nowrap shrink-0 shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live Attentiveness Check
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-300 font-medium bg-white/10 px-2.5 py-0.5 rounded-full border border-white/10 whitespace-nowrap shrink-0">
                      <Clock className="h-3 w-3 text-emerald-400" />
                      Started {new Date(sess.started_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <h4 className="text-base sm:text-lg font-black text-white mt-1 tracking-tight truncate">
                    {sess.title}
                  </h4>

                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-xs text-slate-300">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white/10 text-white font-bold border border-white/15">
                      Batch: <strong className="text-emerald-300 font-extrabold">{sess.batches?.name}</strong>
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-200 font-bold border border-indigo-400/30">
                      Proctor: <strong>{sess.profiles?.full_name || 'Admin'}</strong>
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/25">
                      Window: {sess.duration_minutes}m
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 relative z-10 w-full sm:w-auto">
                <button
                  onClick={() => handleCloseSession(sess.id)}
                  disabled={closingSessionId === sess.id}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-black shadow-lg shadow-rose-950/40 flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap border border-rose-400/30 active:scale-95 disabled:opacity-50"
                >
                  <Square className="h-3.5 w-3.5 fill-white" />
                  <span>{closingSessionId === sess.id ? 'Finalizing…' : 'End Session & Finalize'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Executive Top-Level KPI Metric Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1 */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Overall Attentiveness
            </span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider border ${
              summary.overallRate >= 75
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : summary.overallRate >= 50
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              {summary.overallRate >= 75 ? 'Healthy' : summary.overallRate >= 50 ? 'Warning' : 'Critical'}
            </span>
          </div>
          <div className="mt-3">
            <p className={`text-2xl sm:text-3xl font-black font-display tracking-tight ${
              summary.overallRate >= 75 ? 'text-emerald-600' : summary.overallRate >= 50 ? 'text-amber-500' : 'text-rose-600'
            }`}>
              {summary.overallRate}%
            </p>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
              Average verified presence
            </p>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Sessions Conducted
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
              {timeframeDays} Days
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black font-display text-slate-900 tracking-tight">
              {summary.totalSessions}
            </p>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
              Interactive checks launched
            </p>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Student Verifications
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
              {summary.totalAbsent} Missed
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black font-display text-emerald-600 tracking-tight">
              {summary.totalPresent}
            </p>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
              Confirmed present check-ins
            </p>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Critical At-Risk (&lt;50%)
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
              Alert Watch
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black font-display text-rose-600 tracking-tight">
              {summary.atRiskCount}
            </p>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
              Immediate intervention required
            </p>
          </div>
        </div>
      </div>

      {/* ── Data Visualizations: Batch Comparison & Trend ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {/* Batch-wise Attentiveness Bar Chart */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-4 gap-2">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Cohort Analytics
              </span>
              <h3 className="font-display font-black text-slate-900 text-base">Batch Attentiveness Rates</h3>
              <p className="text-xs text-slate-400 mt-0.5">Comparison across active academic cohorts</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 rounded-xl text-slate-700 border border-slate-200/60 shrink-0">
              {batchBreakdown.length} Batches
            </span>
          </div>

          {batchBreakdown.length === 0 ? (
            <p className="text-slate-400 text-xs text-center py-16">No attendance telemetry recorded yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={batchBreakdown} margin={{ top: 15, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} unit="%" />
                <Tooltip
                  formatter={(v) => [`${v}%`, 'Attentiveness']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '16px', color: '#fff', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.15)' }}
                />
                <Bar
                  dataKey="rate"
                  radius={[8, 8, 0, 0]}
                  fill="#1e2771"
                  label={{ position: 'top', fontSize: 11, formatter: (v) => `${v}%`, fill: '#1e2771', fontWeight: 800 }}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Multi-Day Trend Line Chart */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-4 gap-2">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Chronological Trend
              </span>
              <h3 className="font-display font-black text-slate-900 text-base">Attentiveness Trajectory</h3>
              <p className="text-xs text-slate-400 mt-0.5">Daily verification rate over the last {timeframeDays} days</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 rounded-xl text-slate-700 border border-slate-200/60 shrink-0">
              {timeframeDays}-Day View
            </span>
          </div>

          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trend} margin={{ top: 15, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} interval={Math.floor(timeframeDays / 7)} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} unit="%" />
              <Tooltip
                formatter={(v) => [`${v}%`, 'Attentiveness']}
                contentStyle={{ backgroundColor: '#0f172a', borderRadius: '16px', color: '#fff', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.15)' }}
              />
              <Line
                type="monotone"
                dataKey="rate"
                stroke="#0284c7"
                strokeWidth={3}
                dot={{ r: 2.5, fill: '#0284c7' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Session-by-Session Attentiveness Audit Log ── */}
      <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-2xs">
        <div className="px-5 sm:px-6 py-4.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-wider border border-slate-200/60">
              <CalendarCheck className="h-3 w-3 text-indigo-600" /> Audit Trail
            </span>
            <h3 className="font-display font-black text-slate-900 text-base sm:text-lg tracking-tight mt-1">
              Attentiveness Session Verification Logs
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Click any session to view complete student-by-student roster drilldown
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 bg-slate-100 rounded-full text-slate-700 border border-slate-200/80 shrink-0 self-start sm:self-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
            {sessionsHistory.length} Sessions Logged
          </span>
        </div>

        {sessionsHistory.length === 0 ? (
          /* Reimagined, Beautiful Empty State (replacing raw plain text in Image 1) */
          <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50/80 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
              <CalendarCheck className="h-7 w-7" />
            </div>
            <div className="space-y-1 max-w-sm">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider">
                Log Archive Empty
              </span>
              <h4 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                No Attendance Sessions Recorded Yet
              </h4>
              <p className="text-xs text-slate-500 font-medium">
                Launch an interactive attentiveness check above to verify live student engagement in real time.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowLauncherModal(true)}
              className="mt-2 px-4 py-2 rounded-xl bg-blue-950 hover:bg-blue-900 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <Play className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span>Launch First Attentiveness Check</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sessionsHistory.map(sess => {
              const isExpanded = expandedSessionId === sess.id
              return (
                <div key={sess.id} className="transition-colors">
                  <div
                    onClick={() => handleToggleExpandSession(sess)}
                    className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                          sess.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {sess.status === 'active' ? 'Active Window' : 'Closed'}
                        </span>
                        <span className="text-xs text-slate-400 font-mono font-medium">
                          {new Date(sess.started_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} at{' '}
                          {new Date(sess.started_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <h4 className="font-black text-slate-900 text-sm sm:text-base tracking-tight">
                        {sess.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold">
                          Batch: {sess.batches?.name}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold">
                          Proctor: {sess.profiles?.full_name || 'Admin'}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                          Window: {sess.duration_minutes}m
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                      <div className="text-left md:text-right">
                        <span className={`text-base font-black ${
                          sess.rate_pct >= 75 ? 'text-emerald-600' : sess.rate_pct >= 50 ? 'text-amber-500' : 'text-rose-600'
                        }`}>
                          {sess.rate_pct}% Present
                        </span>
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium mt-0.5">
                          <span className="inline-flex items-center gap-0.5 text-emerald-600 font-bold">
                            {sess.present_count} Present
                          </span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-0.5 text-rose-600 font-bold">
                            {sess.absent_count} Absent
                          </span>
                        </div>
                      </div>

                      <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Session Roster Drilldown */}
                  {isExpanded && (
                    <div className="bg-slate-50/80 p-4 sm:p-5 border-t border-slate-200/70 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="font-extrabold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-indigo-600" /> Session Student Roster Drilldown
                        </span>
                        {expandedRosterData?.stats && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-white border border-slate-200 text-slate-700 shadow-2xs">
                            {expandedRosterData.stats.presentCount} of {expandedRosterData.stats.totalEnrolled} Verified ({expandedRosterData.stats.attentivenessRate}%)
                          </span>
                        )}
                      </div>

                      {loadingExpanded ? (
                        <div className="py-6 text-center text-xs text-slate-400">Loading roster drilldown…</div>
                      ) : expandedRosterData?.roster?.length ? (
                        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
                          <table className="w-full text-xs">
                            <thead className="bg-slate-50/90 text-slate-500 uppercase font-black text-[10px] tracking-wider border-b border-slate-100">
                              <tr>
                                <th className="px-4 py-2.5 text-left">Roll No</th>
                                <th className="px-4 py-2.5 text-left">Student Name</th>
                                <th className="px-4 py-2.5 text-left">Status</th>
                                <th className="px-4 py-2.5 text-left">Verified Time</th>
                                <th className="px-4 py-2.5 text-right">Intervention</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {expandedRosterData.roster.map(r => (
                                <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                                  <td className="px-4 py-2.5 font-mono font-bold text-slate-700">{r.roll_number}</td>
                                  <td className="px-4 py-2.5 font-bold text-slate-900">{r.full_name}</td>
                                  <td className="px-4 py-2.5">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] border ${
                                      r.status === 'present'
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                        : 'bg-rose-50 text-rose-800 border-rose-200'
                                    }`}>
                                      {r.status === 'present' ? <CheckCircle className="h-3 w-3 text-emerald-600" /> : <XCircle className="h-3 w-3 text-rose-600" />}
                                      {r.status}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5 text-slate-400 font-mono text-[11px]">
                                    {r.marked_at ? new Date(r.marked_at).toLocaleTimeString('en-IN') : 'Auto-absent'}
                                  </td>
                                  <td className="px-4 py-2.5 text-right">
                                    <Link
                                      to={`/admin/messages?contact=${r.id}`}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-indigo-700 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition-colors"
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
                        <p className="text-xs text-slate-400 py-3 text-center">No student records found for this session.</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── At-Risk Student Intervention Matrix ── */}
      <div className="bg-white rounded-3xl border border-rose-200/80 p-4 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 pb-3 border-b border-rose-100">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-600 flex items-center justify-center shrink-0 shadow-2xs">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-black uppercase tracking-wider border border-rose-200/70">
                Retention Alert Matrix
              </span>
              <h3 className="font-display font-black text-base sm:text-lg text-slate-900 tracking-tight mt-0.5">
                At-Risk Student Intervention Matrix
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Students requiring attendance counseling, attentiveness check reviews, or proactive guardian alerts.
              </p>
            </div>
          </div>

          {/* Search & Filter Controls: Stacked & Responsive for mobile without truncation */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1 lg:pt-0">
            <div className="relative flex-1 sm:w-56">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search at-risk student…"
                value={atRiskSearch}
                onChange={(e) => setAtRiskSearch(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 bg-slate-50/90 border border-slate-200/90 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-2xs"
              />
              {atRiskSearch && (
                <button
                  type="button"
                  onClick={() => setAtRiskSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/80 shadow-inner gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setAtRiskThreshold('50')}
                className={`flex-1 sm:flex-initial px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  atRiskThreshold === '50'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                &lt; 50% Critical
              </button>
              <button
                type="button"
                onClick={() => setAtRiskThreshold('75')}
                className={`flex-1 sm:flex-initial px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  atRiskThreshold === '75'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                &lt; 75% Warning
              </button>
            </div>
          </div>
        </div>

        {filteredAtRisk.length === 0 ? (
          /* Reimagined, Beautiful Empty State (replacing raw plain text in Image 1) */
          <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shadow-2xs">
              <CheckCircle className="h-7 w-7" />
            </div>
            <div className="space-y-1 max-w-sm">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100/70 text-emerald-800 text-[10px] font-black uppercase tracking-wider border border-emerald-200/80 shadow-2xs">
                All Clear • Retention Healthy
              </span>
              <h4 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                No Students Below {atRiskThreshold}% Attendance Threshold
              </h4>
              <p className="text-xs text-slate-500 font-medium">
                All enrolled students in the selected batch and timeframe maintain verified attendance above the {atRiskThreshold}% warning line.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredAtRisk.map(s => (
              <div
                key={s.id}
                className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200/70 flex items-center justify-between gap-3 hover:bg-rose-50/80 transition-colors shadow-2xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="font-black text-slate-900 text-xs sm:text-sm truncate">{s.full_name}</p>
                    <span className="text-[10px] font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-rose-200/80 text-rose-700 shrink-0">
                      #{s.roll_number}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                    {s.batch_name}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black shadow-2xs">
                      {s.rate}% Attentive
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">
                      ({s.absent} missed)
                    </span>
                  </div>
                </div>

                <Link
                  to={`/admin/messages?contact=${s.id}`}
                  className="p-2.5 rounded-xl bg-white text-rose-700 hover:bg-rose-600 hover:text-white border border-rose-200 shadow-2xs transition-all active:scale-95 shrink-0"
                  title="Message Student Directly"
                  aria-label={`Message ${s.full_name}`}
                >
                  <MessageCircle className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Admin Launcher Modal ── */}
      {showLauncherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-950 to-indigo-900 text-white flex items-center justify-center shadow-md shadow-blue-950/20 shrink-0">
                <Play className="h-5 w-5 fill-amber-400 text-amber-400 ml-0.5" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 block">
                  Proctoring Engine
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Initiate Attentiveness Check
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Broadcasts a real-time attendance verification window to all active student portals.
                </p>
              </div>
            </div>

            <form onSubmit={handleLaunchSession} className="space-y-4">
              <div>
                <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                  Target Academic Batch
                </label>
                <select
                  value={launchBatchId}
                  onChange={(e) => setLaunchBatchId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900 cursor-pointer shadow-2xs"
                >
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                  Session Topic / Identifier
                </label>
                <input
                  type="text"
                  value={launchTitle}
                  onChange={(e) => setLaunchTitle(e.target.value)}
                  placeholder="e.g. Morning Lecture Attentiveness Check"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                  Duration Window (Minutes)
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {DURATION_PRESETS.map(mins => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setLaunchDuration(mins)}
                      className={`py-2 rounded-xl font-black text-xs transition-all cursor-pointer ${
                        launchDuration === mins
                          ? 'bg-blue-950 text-white shadow-xs scale-102 ring-1 ring-blue-950'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-[11.5px] text-amber-900 leading-relaxed space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-950">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>Permanent Real-time Audit Policy</span>
                </div>
                <p>
                  Students currently online will receive an urgent prompt with a countdown timer. Those who fail to verify attendance before the window expires are automatically locked in as <strong className="text-rose-700 font-extrabold">Absent</strong>.
                </p>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowLauncherModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLaunching}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-950 to-indigo-900 hover:from-blue-900 hover:to-indigo-800 text-white font-extrabold text-xs shadow-md shadow-blue-950/30 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isLaunching ? 'Initiating…' : 'Start Attentiveness Window'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
