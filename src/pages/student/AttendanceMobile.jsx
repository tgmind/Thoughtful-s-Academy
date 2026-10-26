import { useState, useEffect, useCallback } from 'react'
import { CheckCircle, Clock, XCircle, Calendar, ChevronLeft, ChevronRight, ShieldCheck, Flame, Radio } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { getActiveSessionForStudent, markStudentPresent } from '../../services/attendanceService'

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const DAY_COLORS = {
  present: 'bg-emerald-500 text-white shadow-sm shadow-emerald-200',
  late:    'bg-amber-400 text-white shadow-sm shadow-amber-200',
  absent:  'bg-red-400 text-white shadow-sm shadow-red-200',
}

function MonthHeatmap({ records }) {
  const now = new Date()
  const [viewDate, setViewDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1))

  const year  = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const statusMap = {}
  records.forEach(r => { statusMap[r.date] = r.status })

  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth  = new Date(year, month + 1, 0).getDate()
  const today        = todayISO()

  const rawCells = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d    = i + 1
      const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      return { d, date, status: statusMap[date] }
    }),
  ]

  // Pad to complete 7-day grid rows cleanly
  const totalSlots = Math.ceil(rawCells.length / 7) * 7
  const cells = [
    ...rawCells,
    ...Array(totalSlots - rawCells.length).fill(null)
  ]

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth()
  const monthPrefix    = `${year}-${String(month + 1).padStart(2, '0')}`
  const monthPresent   = Object.entries(statusMap).filter(([d, s]) => d.startsWith(monthPrefix) && s === 'present').length
  const monthAbsent    = Object.entries(statusMap).filter(([d, s]) => d.startsWith(monthPrefix) && s === 'absent').length
  const monthLate      = Object.entries(statusMap).filter(([d, s]) => d.startsWith(monthPrefix) && s === 'late').length
  const monthTotal     = monthPresent + monthAbsent + monthLate
  const monthPct       = monthTotal > 0 ? Math.round(((monthPresent + monthLate * 0.5) / monthTotal) * 100) : 0

  // consecutive present/late streak up to today
  let streak = 0
  const [cy, cm, cd] = today.split('-').map(Number)
  const check = new Date(cy, cm - 1, cd)
  while (true) {
    const ds = `${check.getFullYear()}-${String(check.getMonth() + 1).padStart(2, '0')}-${String(check.getDate()).padStart(2, '0')}`
    if (statusMap[ds] === 'present' || statusMap[ds] === 'late') {
      streak++
      check.setDate(check.getDate() - 1)
    } else { break }
  }

  const streakMsg  = streak >= 10 ? 'Unstoppable! 🚀' : streak >= 5 ? 'On fire! Keep it up!' : streak >= 2 ? 'Great momentum!' : streak === 1 ? 'Good start!' : 'Start your streak today!'
  const pctColor   = monthPct >= 75 ? 'text-emerald-600' : monthPct >= 50 ? 'text-amber-500' : 'text-red-500'
  const ringColor  = monthPct >= 75 ? '#10b981' : monthPct >= 50 ? '#f59e0b' : '#ef4444'
  const R          = 25
  const circ       = 2 * Math.PI * R
  const dash       = (monthPct / 100) * circ

  const bars = [
    { label: 'Present', count: monthPresent, bar: 'bg-emerald-500', text: 'text-emerald-600' },
    { label: 'Late',    count: monthLate,    bar: 'bg-amber-400',   text: 'text-amber-500'  },
    { label: 'Absent',  count: monthAbsent,  bar: 'bg-red-400',     text: 'text-red-500'    },
  ]

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100 mb-5">
        <div>
          <h3 className="font-bold text-gray-900 text-base sm:text-lg">Study Heatmap</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {viewDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} attendance & attentiveness overview
          </p>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center gap-1 self-start sm:self-auto bg-gray-50/90 p-1 rounded-xl border border-gray-100">
          <button
            type="button"
            onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
            className="p-1.5 rounded-lg hover:bg-white hover:shadow-xs text-gray-600 transition-all active:scale-95"
            title="Previous month"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs font-bold text-gray-700 min-w-[100px] text-center select-none">
            {viewDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
          </span>
          <button
            type="button"
            onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
            disabled={isCurrentMonth}
            className="p-1.5 rounded-lg hover:bg-white hover:shadow-xs text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed transition-all active:scale-95"
            title="Next month"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Body: Compact side-by-side on Laptop (lg+), clean vertical stack on mobile */}
      <div className="flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-8">

        {/* Left Column: Calendar Grid (Constrained on laptop so cells are perfectly proportioned) */}
        <div className="w-full max-w-md mx-auto lg:mx-0 lg:w-[350px] xl:w-[375px] shrink-0">
          {/* Weekday labels */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center mb-1.5">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
              <div key={i} className="text-[11px] font-bold text-gray-400 py-1 tracking-wider uppercase select-none">
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{day[0]}</span>
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center">
            {cells.map((cell, idx) => {
              if (!cell) {
                return <div key={`empty-${idx}`} className="aspect-square opacity-0 pointer-events-none" />
              }
              const isToday  = cell.date === today
              const isFuture = cell.date > today
              return (
                <div
                  key={cell.date}
                  title={
                    cell.status
                      ? `${new Date(cell.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} — ${cell.status.charAt(0).toUpperCase() + cell.status.slice(1)}`
                      : isToday
                      ? `Today (${new Date(cell.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})`
                      : new Date(cell.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
                  }
                  className={`aspect-square flex flex-col items-center justify-center rounded-xl text-xs font-semibold transition-all select-none relative ${
                    cell.status
                      ? DAY_COLORS[cell.status] || 'bg-gray-100 text-gray-600'
                      : isToday
                      ? 'border-2 border-dashed border-blue-500 text-blue-600 bg-blue-50/40 font-bold'
                      : isFuture
                      ? 'text-gray-300 bg-gray-50/60'
                      : 'text-gray-500 hover:bg-gray-100/80 hover:text-gray-900'
                  } ${isToday && cell.status ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
                >
                  <span>{cell.d}</span>
                  {isToday && (
                    <span className={`w-1 h-1 rounded-full mt-0.5 ${cell.status ? 'bg-white' : 'bg-blue-600'}`} />
                  )}
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 mt-3.5 border-t border-gray-100 text-[11px] text-gray-500">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 shadow-xs shadow-emerald-200" />
                <span>Present</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 shadow-xs shadow-amber-200" />
                <span>Late</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-red-400 shadow-xs shadow-red-200" />
                <span>Absent</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-blue-600 font-medium">
              <span className="w-2.5 h-2.5 rounded-sm border-2 border-dashed border-blue-500 bg-blue-50/40 inline-block" />
              <span>Today</span>
            </div>
          </div>
        </div>

        {/* Right Column: Monthly Analytics & Streak (Side-by-side on laptop, below on mobile) */}
        <div className="flex-1 min-w-0 flex flex-col justify-between space-y-4 pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l border-gray-100 lg:pl-8">

          {/* 🔥 Streak Banner */}
          <div className={`p-4 rounded-2xl border transition-all ${
            streak > 0
              ? 'bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-amber-500/10 border-amber-200 shadow-xs'
              : 'bg-slate-50 border-slate-200/70'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm shrink-0 ${
                  streak > 0 ? 'bg-gradient-to-tr from-amber-500 to-orange-400 text-white shadow-amber-500/20' : 'bg-slate-200 text-slate-400'
                }`}>
                  <Flame className={`h-6 w-6 ${streak > 0 ? 'fill-white animate-pulse' : ''}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Attendance Streak</span>
                    {streak > 0 && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 uppercase tracking-wider">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className={`text-lg sm:text-xl font-black ${streak > 0 ? 'text-amber-600' : 'text-slate-600'}`}>
                      {streak} day streak
                    </span>
                    <span className="text-xs text-gray-500 font-medium hidden sm:inline">
                      • {streakMsg}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 font-medium mt-1.5 sm:hidden">
              {streakMsg}
            </p>
          </div>

          {/* Monthly Attentiveness Circular Gauge & Distribution Bars */}
          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Circular Gauge */}
              <div className="flex items-center gap-3.5 shrink-0">
                <div className="relative shrink-0">
                  <svg width="64" height="64" className="-rotate-90">
                    <circle cx="32" cy="32" r={R} fill="none" stroke="#e2e8f0" strokeWidth="6" />
                    <circle
                      cx="32"
                      cy="32"
                      r={R}
                      fill="none"
                      stroke={ringColor}
                      strokeWidth="6"
                      strokeDasharray={`${dash} ${circ}`}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dasharray 0.6s ease' }}
                    />
                  </svg>
                  <span className={`absolute inset-0 flex items-center justify-center text-xs sm:text-sm font-black ${pctColor}`}>
                    {monthPct}%
                  </span>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-800">Monthly Attentiveness</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {monthTotal > 0 ? `${monthPresent} of ${monthTotal} sessions marked` : 'No sessions recorded this month'}
                  </p>
                </div>
              </div>

              {/* Quick counts pills */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-100/70 text-emerald-800 font-bold">
                  {monthPresent} Present
                </span>
                <span className="text-xs px-2.5 py-1 rounded-lg bg-rose-100/70 text-rose-800 font-bold">
                  {monthAbsent} Missed
                </span>
              </div>
            </div>

            {/* Distribution Bars */}
            <div className="pt-2 border-t border-slate-200/50 space-y-2">
              {bars.map(({ label, count, bar, text }) => (
                <div key={label}>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-gray-500 font-medium">{label}</span>
                    <span className={`font-bold ${text}`}>
                      {count} {count === 1 ? 'session' : 'sessions'}
                      {monthTotal > 0 ? ` (${Math.round((count / monthTotal) * 100)}%)` : ''}
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-200/70 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${bar} rounded-full transition-all duration-500`}
                      style={{ width: monthTotal > 0 ? `${(count / monthTotal) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly Insight Note */}
          <div className="flex items-center justify-between text-[11px] text-gray-400 px-1">
            <span>
              Recorded for {viewDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </span>
            <span className="font-medium text-gray-500">
              {monthTotal} total lecture session{monthTotal !== 1 ? 's' : ''}
            </span>
          </div>

        </div>

      </div>
    </div>
  )
}

const STATUS_STYLES = {
  present: { label: 'Present', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: <CheckCircle className="h-4 w-4 text-emerald-600" /> },
  absent:  { label: 'Absent',  color: 'bg-rose-100 text-rose-800 border-rose-200',     icon: <XCircle className="h-4 w-4 text-rose-600" /> },
  late:    { label: 'Late',    color: 'bg-amber-100 text-amber-800 border-amber-200', icon: <Clock className="h-4 w-4 text-amber-600" /> },
}

export default function Attendance() {
  const { user } = useAuth()
  const [records, setRecords] = useState([])
  const [activeSession, setActiveSession] = useState(null)
  const [countdownSeconds, setCountdownSeconds] = useState(0)
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(false)
  const [page, setPage] = useState(1)
  const PER_PAGE = 20

  const loadData = useCallback(async () => {
    if (!user) return
    try {
      const [{ data: attData }, { data: sessData }] = await Promise.all([
        supabase
          .from('attendance')
          .select('*, attendance_sessions(title, duration_minutes, profiles:created_by(full_name))')
          .eq('student_id', user.id)
          .order('date', { ascending: false })
          .order('marked_at', { ascending: false }),
        getActiveSessionForStudent(user.id),
      ])

      const all = attData ?? []
      setRecords(all)

      if (sessData?.has_active_session) {
        setActiveSession(sessData)
        setCountdownSeconds(sessData.seconds_remaining)
      } else {
        setActiveSession(null)
      }
    } catch (err) {
      console.error('Failed to load attendance portal data:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadData()

    // Realtime listeners for live sessions and attendance marking
    const channel = supabase
      .channel(`student_attendance_portal_${user?.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_sessions' }, () => {
        loadData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance', filter: `student_id=eq.${user?.id}` }, () => {
        loadData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, loadData])

  // Countdown timer
  useEffect(() => {
    if (!activeSession || countdownSeconds <= 0) return

    const timer = setInterval(() => {
      setCountdownSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          toast.error('Attendance window expired. Unmarked students are recorded as absent.')
          loadData()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [activeSession, countdownSeconds, loadData])

  // Action: mark Present during live session
  const handleMarkPresent = async () => {
    if (!activeSession?.session_id) return
    setMarking(true)
    try {
      const { data, alreadyMarked, error } = await markStudentPresent({
        sessionId: activeSession.session_id,
        studentId: user.id,
        batchId: activeSession.batch_id,
      })

      if (error) {
        toast.error(error.message || 'Failed to mark attendance')
      } else {
        toast.success(alreadyMarked ? 'Already marked for this session!' : 'Attentiveness verified: Marked Present!')
        await loadData()
      }
    } catch (err) {
      toast.error('Error marking attendance: ' + err.message)
    } finally {
      setMarking(false)
    }
  }

  const present = records.filter(r => r.status === 'present').length
  const absent  = records.filter(r => r.status === 'absent').length
  const late    = records.filter(r => r.status === 'late').length
  const total   = present + absent + late
  const pct     = total > 0 ? Math.round(((present + late * 0.5) / total) * 100) : 0

  const todayStr = todayISO()
  const todayRecords = records.filter(r => r.date === todayStr)

  const paged      = records.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const totalPages = Math.ceil(records.length / PER_PAGE)

  return (
    <div className="space-y-6 pb-20 lg:pb-0">

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Calendar className="h-6 w-6 text-blue-950" />
            <span>Attendance & Attentiveness</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Realtime session-based verification initiated by faculty during class
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
            Official Attentiveness Log
          </span>
        </div>
      </div>

      {/* ── Active Attentiveness Check Section ── */}
      {activeSession && !activeSession.already_marked && countdownSeconds > 0 ? (
        <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white rounded-3xl p-6 sm:p-7 shadow-xl shadow-emerald-500/20 border border-emerald-400/40">
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-300"></span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/20 text-white backdrop-blur-sm">
                  Live Attentiveness Check in Progress
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {activeSession.title || 'Lecture Attendance'}
              </h2>

              <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed">
                Initiated by <strong>{activeSession.created_by_name}</strong> for batch <strong>{activeSession.batch_name}</strong>. Please confirm your presence now.
              </p>

              {/* Countdown Deck */}
              <div className="flex items-center gap-3 pt-1">
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black/25 backdrop-blur-md border border-white/10 font-mono">
                  <Clock className="h-4 w-4 text-amber-300 animate-spin-slow" />
                  <span className="text-xl font-black tracking-tight text-white">
                    {String(Math.floor(countdownSeconds / 60)).padStart(2, '0')}:
                    {String(countdownSeconds % 60).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-emerald-200 ml-1">remaining</span>
                </div>
                <span className="text-[11px] text-emerald-200">
                  Window closes automatically
                </span>
              </div>
            </div>

            <div className="flex flex-col items-stretch md:items-end gap-2 shrink-0">
              <button
                onClick={handleMarkPresent}
                disabled={marking}
                className="px-7 py-4 rounded-2xl bg-white text-emerald-900 hover:bg-emerald-50 active:scale-95 font-black text-base shadow-lg shadow-black/10 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50"
              >
                <CheckCircle className="h-5 w-5 text-emerald-600" />
                <span>{marking ? 'Recording Attendance…' : 'I am Present in Class'}</span>
              </button>
              <p className="text-[10px] text-emerald-200/90 text-center md:text-right">
                Unmarked students are permanently recorded as Absent upon expiry.
              </p>
            </div>
          </div>
        </div>
      ) : activeSession && activeSession.already_marked ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Attentiveness Verified</span>
                <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-bold">Session Active</span>
              </div>
              <h3 className="font-bold text-gray-900 text-sm sm:text-base">{activeSession.title}</h3>
              <p className="text-xs text-gray-500">
                You marked yourself present at {activeSession.marked_at ? new Date(activeSession.marked_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'earlier today'}.
              </p>
            </div>
          </div>
          <span className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs self-start sm:self-center">
            Marked Present ✓
          </span>
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-500 flex items-center justify-center shrink-0 shadow-sm">
            <Radio className="h-5 w-5 text-slate-400" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">No Active Attendance Session</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Attendance is initiated live by your assigned teacher or administrator during lectures to gauge attentiveness. When initiated, a live countdown window will appear automatically.
            </p>
          </div>
        </div>
      )}

      {/* ── Today's Sessions Log (if any took place today) ── */}
      {todayRecords.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-900" />
            <span>Today&apos;s Lecture Attendance</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {todayRecords.map(r => (
              <div key={r.id} className={`flex items-center justify-between p-3.5 rounded-xl border ${STATUS_STYLES[r.status]?.color}`}>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-gray-900 truncate">
                    {r.attendance_sessions?.title || 'Class Attendance'}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {r.marked_at ? new Date(r.marked_at).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }) : 'Auto-finalized'}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-lg">
                  {STATUS_STYLES[r.status]?.icon}
                  {STATUS_STYLES[r.status]?.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Summary KPI Cards ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center shadow-sm">
          <p className="text-2xl sm:text-3xl font-black text-emerald-600">{present}</p>
          <p className="text-xs font-semibold text-gray-500 mt-1">Sessions Present</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center shadow-sm">
          <p className="text-2xl sm:text-3xl font-black text-rose-500">{absent}</p>
          <p className="text-xs font-semibold text-gray-500 mt-1">Sessions Missed</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center shadow-sm">
          <p className={`text-2xl sm:text-3xl font-black ${pct >= 75 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>
            {pct}%
          </p>
          <p className="text-xs font-semibold text-gray-500 mt-1">Attentiveness Rate</p>
        </div>
      </div>

      {/* ── Monthly Study Heatmap ── */}
      <MonthHeatmap records={records} />

      {/* ── Attendance History Log ── */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-sm">Attendance History Log</h3>
          <span className="text-xs text-gray-400">{records.length} total sessions recorded</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading attendance history…</div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No attendance records yet.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Date', 'Lecture / Session', 'Status', 'Marked At'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paged.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-gray-900 whitespace-nowrap">
                        {new Date(r.date + 'T00:00:00').toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                      </td>
                      <td className="px-5 py-3.5 text-gray-700">
                        <span className="font-semibold">{r.attendance_sessions?.title || 'Lecture Attendance'}</span>
                        {r.attendance_sessions?.profiles?.full_name && (
                          <span className="block text-[11px] text-gray-400">Proctor: {r.attendance_sessions.profiles.full_name}</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${STATUS_STYLES[r.status]?.color}`}>
                          {STATUS_STYLES[r.status]?.icon}
                          <span>{STATUS_STYLES[r.status]?.label}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 text-xs whitespace-nowrap">
                        {r.marked_at ? new Date(r.marked_at).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit' }) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Showing {(page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE, records.length)} of {records.length} records
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => p - 1)}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                  >
                    ← Prev
                  </button>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  )
}
