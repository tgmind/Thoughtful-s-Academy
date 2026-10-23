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
    <div className="space-y-6 pb-12">

      {/* ── Filter Bar & Actions ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Batch Selector */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
              Filter Batch
            </label>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="px-3.5 py-2 rounded-xl border border-gray-200 bg-gray-50 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-950"
            >
              <option value="all">All Batches</option>
              {batches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Timeframe Selector */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
              Timeframe
            </label>
            <div className="flex rounded-xl bg-gray-100 p-0.5 text-xs font-semibold">
              {[
                { label: '7 Days', val: 7 },
                { label: '30 Days', val: 30 },
                { label: '90 Days', val: 90 },
              ].map(t => (
                <button
                  key={t.val}
                  onClick={() => setTimeframeDays(t.val)}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    timeframeDays === t.val ? 'bg-white text-blue-950 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadAnalytics()}
            className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors"
            title="Refresh Analytics"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowLauncherModal(true)}
            className="px-5 py-2.5 rounded-xl bg-blue-950 hover:bg-blue-900 active:scale-95 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all"
          >
            <Play className="h-3.5 w-3.5 fill-white" />
            <span>Launch Attentiveness Check</span>
          </button>
        </div>
      </div>

      {/* ── Live Active Sessions Banner (if any live right now) ── */}
      {currentlyActive && currentlyActive.length > 0 && (
        <div className="space-y-3">
          {currentlyActive.map(sess => (
            <div
              key={sess.id}
              className="bg-slate-950 text-white rounded-2xl p-5 border border-emerald-500/40 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5">
                <div className="relative p-3 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <Radio className="h-6 w-6" />
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Live Attentiveness Check
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Started {new Date(sess.started_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h4 className="text-base font-black text-white mt-0.5">{sess.title}</h4>
                  <p className="text-xs text-slate-400">
                    Batch: <strong className="text-slate-200">{sess.batches?.name}</strong> • Proctor:{' '}
                    <strong className="text-slate-200">{sess.profiles?.full_name || 'Admin'}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleCloseSession(sess.id)}
                  disabled={closingSessionId === sess.id}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Overall Attentiveness</p>
          <p className={`text-3xl font-black mt-2 ${
            summary.overallRate >= 75 ? 'text-emerald-600' : summary.overallRate >= 50 ? 'text-amber-500' : 'text-rose-600'
          }`}>
            {summary.overallRate}%
          </p>
          <p className="text-xs text-gray-500 mt-1">Average verified presence</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Sessions Conducted</p>
          <p className="text-3xl font-black text-gray-900 mt-2">{summary.totalSessions}</p>
          <p className="text-xs text-gray-500 mt-1">In selected timeframe</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Student Verifications</p>
          <p className="text-3xl font-black text-emerald-600 mt-2">{summary.totalPresent}</p>
          <p className="text-xs text-gray-500 mt-1">Confirmed present ({summary.totalAbsent} missed)</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Critical At-Risk (&lt;50%)</p>
          <p className="text-3xl font-black text-rose-600 mt-2">{summary.atRiskCount}</p>
          <p className="text-xs text-gray-500 mt-1">Immediate intervention required</p>
        </div>
      </div>

      {/* ── Data Visualizations: Batch Comparison & Trend ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Batch-wise Attentiveness Bar Chart */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-gray-900 text-base">Batch Attentiveness Rates</h3>
              <p className="text-xs text-gray-400">Comparison across active academic batches</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 rounded-lg text-slate-700">
              {batchBreakdown.length} Batches
            </span>
          </div>

          {batchBreakdown.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-16">No attendance data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={batchBreakdown} margin={{ top: 15, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} unit="%" />
                <Tooltip
                  formatter={(v) => [`${v}%`, 'Attentiveness']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', border: 'none' }}
                />
                <Bar
                  dataKey="rate"
                  radius={[8, 8, 0, 0]}
                  fill="#1e2771"
                  label={{ position: 'top', fontSize: 11, formatter: (v) => `${v}%`, fill: '#1e2771' }}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Multi-Day Trend Line Chart */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-gray-900 text-base">Attentiveness Trajectory</h3>
              <p className="text-xs text-gray-400">Daily verification rate over the last {timeframeDays} days</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 rounded-lg text-slate-700">
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
                contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', border: 'none' }}
              />
              <Line
                type="monotone"
                dataKey="rate"
                stroke="#0284c7"
                strokeWidth={3}
                dot={{ r: 2, fill: '#0284c7' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Session-by-Session Attentiveness Audit Log ── */}
      <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900 text-base">Attentiveness Session Verification Logs</h3>
            <p className="text-xs text-gray-400 mt-0.5">Click any session to view complete student-by-student roster drilldown</p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-slate-100 rounded-full text-slate-700">
            {sessionsHistory.length} Sessions Logged
          </span>
        </div>

        {sessionsHistory.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">No attendance sessions recorded yet.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {sessionsHistory.map(sess => {
              const isExpanded = expandedSessionId === sess.id
              return (
                <div key={sess.id} className="transition-colors">
                  <div
                    onClick={() => handleToggleExpandSession(sess)}
                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50/70 cursor-pointer"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          sess.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {sess.status === 'active' ? 'Active Window' : 'Closed'}
                        </span>
                        <span className="text-xs text-gray-400 font-medium">
                          {new Date(sess.started_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} at{' '}
                          {new Date(sess.started_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <h4 className="font-bold text-gray-900 text-sm sm:text-base">{sess.title}</h4>
                      <p className="text-xs text-gray-500">
                        Batch: <strong className="text-gray-900">{sess.batches?.name}</strong> • Proctor:{' '}
                        <strong>{sess.profiles?.full_name || 'Admin'}</strong> • Window: {sess.duration_minutes}m
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
                          Session Student Roster Drilldown
                        </h5>
                        {expandedRosterData?.stats && (
                          <span className="text-xs text-slate-500">
                            {expandedRosterData.stats.presentCount} of {expandedRosterData.stats.totalEnrolled} Verified ({expandedRosterData.stats.attentivenessRate}%)
                          </span>
                        )}
                      </div>

                      {loadingExpanded ? (
                        <div className="py-6 text-center text-xs text-gray-400">Loading roster drilldown…</div>
                      ) : expandedRosterData?.roster?.length ? (
                        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                          <table className="w-full text-xs">
                            <thead className="bg-gray-50 text-gray-500 uppercase font-bold">
                              <tr>
                                <th className="px-4 py-2.5 text-left">Roll No</th>
                                <th className="px-4 py-2.5 text-left">Student Name</th>
                                <th className="px-4 py-2.5 text-left">Status</th>
                                <th className="px-4 py-2.5 text-left">Verified Time</th>
                                <th className="px-4 py-2.5 text-right">Intervention</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {expandedRosterData.roster.map(r => (
                                <tr key={r.id} className="hover:bg-gray-50/50">
                                  <td className="px-4 py-2.5 font-mono font-bold text-gray-700">{r.roll_number}</td>
                                  <td className="px-4 py-2.5 font-semibold text-gray-900">{r.full_name}</td>
                                  <td className="px-4 py-2.5">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
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
                                      to={`/admin/messages?contact=${r.id}`}
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

      {/* ── At-Risk Student Intervention Matrix ── */}
      <div className="bg-white rounded-3xl border border-rose-100 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-rose-700">
            <ShieldAlert className="h-5 w-5" />
            <div>
              <h3 className="font-bold text-base text-gray-900">At-Risk Student Intervention Matrix</h3>
              <p className="text-xs text-gray-400">Students requiring attendance counseling or parent alerts</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search at-risk student…"
                value={atRiskSearch}
                onChange={(e) => setAtRiskSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-rose-500 w-44"
              />
            </div>

            <div className="flex rounded-xl bg-gray-100 p-0.5 text-xs font-semibold">
              <button
                onClick={() => setAtRiskThreshold('50')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  atRiskThreshold === '50' ? 'bg-rose-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                &lt; 50% Critical
              </button>
              <button
                onClick={() => setAtRiskThreshold('75')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  atRiskThreshold === '75' ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                &lt; 75% Warning
              </button>
            </div>
          </div>
        </div>

        {filteredAtRisk.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-8">
            No students currently fall below the {atRiskThreshold}% attendance threshold.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredAtRisk.map(s => (
              <div
                key={s.id}
                className="p-4 rounded-2xl bg-rose-50/40 border border-rose-100 flex items-center justify-between gap-3 hover:bg-rose-50/70 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-gray-900 text-xs sm:text-sm truncate">{s.full_name}</p>
                  <p className="text-[11px] text-gray-500">
                    {s.batch_name} • Roll: {s.roll_number}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-black text-rose-600">{s.rate}% Attentive</span>
                    <span className="text-[10px] text-gray-400">({s.absent} missed)</span>
                  </div>
                </div>

                <Link
                  to={`/admin/messages?contact=${s.id}`}
                  className="p-2.5 rounded-xl bg-white text-rose-700 hover:bg-rose-100 border border-rose-200 shadow-sm transition-colors"
                  title="Message Student"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-gray-100 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-950 flex items-center justify-center">
                <Play className="h-6 w-6 ml-0.5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900">Initiate Attentiveness Check</h3>
                <p className="text-xs text-gray-500">Triggers realtime attendance window on student portals</p>
              </div>
            </div>

            <form onSubmit={handleLaunchSession} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Target Batch
                </label>
                <select
                  value={launchBatchId}
                  onChange={(e) => setLaunchBatchId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-950"
                >
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Session Topic / Title
                </label>
                <input
                  type="text"
                  value={launchTitle}
                  onChange={(e) => setLaunchTitle(e.target.value)}
                  placeholder="e.g. Morning Lecture Attentiveness Check"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-950"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Duration (Minutes)
                </label>
                <div className="flex items-center gap-2">
                  {DURATION_PRESETS.map(mins => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setLaunchDuration(mins)}
                      className={`flex-1 py-2 rounded-xl font-bold text-xs transition-all ${
                        launchDuration === mins
                          ? 'bg-blue-950 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800 leading-relaxed">
                When started, students in this batch will see an urgent popup with countdown timer. Those who do not confirm before expiration will be permanently recorded as <strong>Absent</strong>.
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowLauncherModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLaunching}
                  className="px-5 py-2 rounded-xl bg-blue-950 hover:bg-blue-900 text-white font-bold text-xs shadow-md disabled:opacity-50"
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
