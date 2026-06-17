import { useState, useEffect } from 'react'
import { CheckCircle, Clock, XCircle, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

// Bug fix: toISOString() returns UTC — use local calendar date instead
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

  const cells = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d    = i + 1
      const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      return { d, date, status: statusMap[date] }
    }),
  ]

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth()
  const monthPrefix    = `${year}-${String(month + 1).padStart(2, '0')}`
  const monthPresent   = Object.entries(statusMap).filter(([d, s]) => d.startsWith(monthPrefix) && s === 'present').length
  const monthAbsent    = Object.entries(statusMap).filter(([d, s]) => d.startsWith(monthPrefix) && s === 'absent').length
  const monthLate      = Object.entries(statusMap).filter(([d, s]) => d.startsWith(monthPrefix) && s === 'late').length
  // Bug fix: count only marked days (not all elapsed days) so ring % matches global stats card
  const monthTotal     = monthPresent + monthAbsent + monthLate
  const monthPct       = monthTotal > 0 ? Math.round(((monthPresent + monthLate * 0.5) / monthTotal) * 100) : 0

  // consecutive present/late streak up to today
  // Bug fix: use local date string inside loop, not toISOString() (UTC)
  let streak = 0
  const check = new Date(today)
  while (true) {
    const ds = `${check.getFullYear()}-${String(check.getMonth() + 1).padStart(2, '0')}-${String(check.getDate()).padStart(2, '0')}`
    if (statusMap[ds] === 'present' || statusMap[ds] === 'late') {
      streak++
      check.setDate(check.getDate() - 1)
    } else { break }
  }

  const streakMsg  = streak >= 10 ? 'Unstoppable! 🚀' : streak >= 5 ? 'On fire! Keep it up!' : streak >= 2 ? 'Great momentum!' : 'Keep it up!'
  const pctColor   = monthPct >= 75 ? 'text-emerald-600' : monthPct >= 50 ? 'text-amber-500' : 'text-red-500'
  const ringColor  = monthPct >= 75 ? '#10b981' : monthPct >= 50 ? '#f59e0b' : '#ef4444'
  const R          = 28
  const circ       = 2 * Math.PI * R
  const dash       = (monthPct / 100) * circ

  const bars = [
    { label: 'Present', count: monthPresent, bar: 'bg-emerald-500', text: 'text-emerald-600' },
    { label: 'Late',    count: monthLate,    bar: 'bg-amber-400',   text: 'text-amber-500'  },
    { label: 'Absent',  count: monthAbsent,  bar: 'bg-red-400',     text: 'text-red-500'    },
  ]

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-gray-900">Study Heatmap</h3>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {viewDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} overview
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs font-semibold text-gray-600 min-w-[96px] text-center">
            {viewDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
          </span>
          <button
            onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
            disabled={isCurrentMonth}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Body: calendar stacks on small, side-by-side on md+ ── */}
      <div className="flex flex-col md:flex-row gap-6">

        {/* Left — calendar */}
        <div className="shrink-0 w-full md:w-auto">
          {/* weekday labels */}
          <div className="grid grid-cols-7 mb-1.5">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d, i) => (
              <div key={i} className="flex items-center justify-center text-[9px] font-bold text-gray-400 uppercase tracking-wide py-1">
                {d}
              </div>
            ))}
          </div>

          {/* day cells — use aspect-square so each cell is always square */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, i) => {
              if (!cell) return <div key={`e-${i}`} className="aspect-square" />
              const isToday  = cell.date === today
              const isFuture = cell.date > today
              return (
                <div
                  key={cell.date}
                  title={cell.status ? `${cell.date} — ${cell.status}` : cell.date}
                  className={[
                    'aspect-square rounded-lg flex items-center justify-center text-[11px] font-semibold transition-all cursor-default select-none min-w-0',
                    cell.status ? DAY_COLORS[cell.status] : isFuture ? 'bg-gray-50 text-gray-300' : 'bg-gray-100 text-gray-400 hover:bg-gray-200',
                    isToday ? 'ring-2 ring-blue-950 ring-offset-1' : '',
                  ].join(' ')}
                >
                  {cell.d}
                </div>
              )
            })}
          </div>

          {/* legend */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 pt-2.5 border-t border-gray-100">
            {[
              { dot: 'bg-emerald-500', label: 'Present' },
              { dot: 'bg-amber-400',   label: 'Late' },
              { dot: 'bg-red-400',     label: 'Absent' },
              { dot: 'bg-gray-100 border border-gray-200', label: 'No record' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-sm ${l.dot}`} />
                <span className="text-[10px] text-gray-400">{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Vertical divider — only on md+ */}
        <div className="hidden md:block w-px bg-gray-100 self-stretch" />
        {/* Horizontal divider on mobile */}
        <div className="block md:hidden h-px bg-gray-100 w-full" />

        {/* Right — stats */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">

          {/* 🔥 Streak hero */}
          {streak > 0 ? (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-400 p-4 shadow-lg shadow-orange-200">
              <div className="absolute -top-5 -right-5 w-24 h-24 bg-white/10 rounded-full" />
              <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-white/10 rounded-full" />
              <div className="relative flex items-center gap-3">
                <span className="text-5xl leading-none drop-shadow-md">🔥</span>
                <div>
                  <p className="text-white/75 text-[10px] font-bold uppercase tracking-widest mb-0.5">Current Streak</p>
                  <p className="text-white font-black leading-none" style={{ fontSize: 30 }}>
                    {streak}
                    <span className="text-lg font-bold ml-1">day{streak !== 1 ? 's' : ''}</span>
                  </p>
                  <p className="text-white/90 text-xs font-semibold mt-1">{streakMsg}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-orange-200 bg-orange-50 p-4 text-center">
              <p className="text-3xl mb-1">🔥</p>
              <p className="text-xs font-bold text-orange-500">Start your streak today!</p>
              <p className="text-[10px] text-orange-400 mt-0.5">Mark present to light the fire</p>
            </div>
          )}

          {/* Ring + bars */}
          <div className="flex items-center gap-4">
            {/* circular ring */}
            <div className="relative shrink-0">
              <svg width="72" height="72" className="-rotate-90">
                <circle cx="36" cy="36" r={R} fill="none" stroke="#f3f4f6" strokeWidth="7" />
                <circle
                  cx="36" cy="36" r={R} fill="none" stroke={ringColor} strokeWidth="7"
                  strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
                  style={{ transition: 'stroke-dasharray 0.6s ease' }}
                />
              </svg>
              <span className={`absolute inset-0 flex items-center justify-center text-sm font-extrabold ${pctColor}`}>
                {monthPct}%
              </span>
            </div>

            {/* progress bars */}
            <div className="flex-1 space-y-2">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">This month</p>
              {bars.map(({ label, count, bar, text }) => (
                <div key={label}>
                  <div className="flex justify-between text-[10px] mb-0.5">
                    <span className="text-gray-500">{label}</span>
                    <span className={`font-bold ${text}`}>{count} day{count !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${bar} rounded-full transition-all duration-500`}
                      style={{ width: monthTotal > 0 ? `${(count / monthTotal) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
        {/* end right stats */}

      </div>
      {/* end body flex */}

    </div>
  )
}

const STATUS_STYLES = {
  present: { label: 'Present', color: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3.5 w-3.5" /> },
  absent:  { label: 'Absent',  color: 'bg-red-100 text-red-800',     icon: <XCircle className="h-3.5 w-3.5" /> },
  late:    { label: 'Late',    color: 'bg-amber-100 text-amber-800', icon: <Clock className="h-3.5 w-3.5" /> },
}

export default function Attendance() {
  const { user } = useAuth()
  const [records,     setRecords]     = useState([])
  const [todayRecord, setTodayRecord] = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [marking,     setMarking]     = useState(null)
  const [confirm,     setConfirm]     = useState(null)
  const [page,        setPage]        = useState(1)
  const PER_PAGE = 20

  useEffect(() => {
    if (!user) return
    supabase.from('attendance').select('*').eq('student_id', user.id)
      .order('date', { ascending: false })
      .then(({ data }) => {
        const all = data ?? []
        setRecords(all)
        setTodayRecord(all.find(r => r.date === todayISO()) ?? null)
        setLoading(false)
      })
  }, [user])

  const mark = async (status) => {
    setMarking(status)
    const dateStr = todayISO()
    const { data, error } = await supabase.from('attendance').insert({
      student_id: user.id, date: dateStr, status, marked_by: user.id,
    }).select().single()
    if (error) {
      if (error.code === '23505') {
        // Bug fix: record already exists (admin may have marked it) — fetch and sync UI
        toast.error('Already marked today.')
        const { data: existing } = await supabase.from('attendance')
          .select('*').eq('student_id', user.id).eq('date', dateStr).single()
        if (existing) {
          setTodayRecord(existing)
          setRecords(r => [existing, ...r.filter(x => x.date !== dateStr)])
        }
        setConfirm(null)
      } else {
        // Bug fix: on generic error keep confirm open so user can retry
        toast.error(error.message)
      }
    } else {
      setTodayRecord(data)
      setRecords(r => [data, ...r])
      toast.success(`Marked as ${status}!`)
      setConfirm(null)
    }
    setMarking(null)
  }

  const present = records.filter(r => r.status === 'present').length
  const absent  = records.filter(r => r.status === 'absent').length
  const late    = records.filter(r => r.status === 'late').length
  const total   = present + absent + late
  const pct     = total > 0 ? Math.round(((present + late * 0.5) / total) * 100) : 0

  const paged      = records.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const totalPages = Math.ceil(records.length / PER_PAGE)

  return (
    <div className="space-y-6 pb-20 lg:pb-0">

      {/* Mark today */}
      <div className="bg-blue-50 rounded-2xl border border-blue-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-blue-950" />
          <div>
            <h2 className="font-bold text-gray-900">Today's Attendance</h2>
            <p className="text-sm text-gray-500">{new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</p>
          </div>
        </div>

        {todayRecord ? (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl ${STATUS_STYLES[todayRecord.status]?.color}`}>
            {STATUS_STYLES[todayRecord.status]?.icon}
            <span className="font-semibold">Marked as {STATUS_STYLES[todayRecord.status]?.label}</span>
            {todayRecord.marked_at && (
              <span className="ml-auto text-xs opacity-70">
                {new Date(todayRecord.marked_at).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}
              </span>
            )}
          </div>
        ) : confirm ? (
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="font-medium text-gray-900 mb-3">
              Mark yourself as <span className="capitalize font-bold">{confirm}</span> today?
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => mark(confirm)} disabled={!!marking}
                className="px-6 py-2 bg-blue-950 text-white font-semibold rounded-lg hover:bg-blue-900 disabled:opacity-50 transition-colors">
                {marking ? 'Saving…' : 'Confirm'}
              </button>
              <button onClick={() => setConfirm(null)} className="px-6 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-100">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <button onClick={() => setConfirm('present')}
              className="flex flex-col items-center gap-1.5 p-4 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl font-semibold transition-colors border-2 border-transparent hover:border-green-300">
              <CheckCircle className="h-6 w-6" />
              <span className="text-sm">Present</span>
            </button>
            <button onClick={() => setConfirm('late')}
              className="flex flex-col items-center gap-1.5 p-4 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl font-semibold transition-colors border-2 border-transparent hover:border-amber-300">
              <Clock className="h-6 w-6" />
              <span className="text-sm">Late</span>
            </button>
            <button onClick={() => setConfirm('absent')}
              className="flex flex-col items-center gap-1.5 p-4 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl font-semibold transition-colors border-2 border-transparent hover:border-red-300">
              <XCircle className="h-6 w-6" />
              <span className="text-sm">Absent</span>
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{present}</p>
          <p className="text-xs text-gray-500 mt-1">Present</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-red-500">{absent}</p>
          <p className="text-xs text-gray-500 mt-1">Absent</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className={`text-2xl font-bold ${pct >= 75 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{pct}%</p>
          <p className="text-xs text-gray-500 mt-1">Attendance</p>
        </div>
      </div>

      {/* Monthly heatmap */}
      <MonthHeatmap records={records} />

      {/* Attendance history */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Attendance History</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No attendance records yet.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Date', 'Day', 'Status', 'Marked At'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paged.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {new Date(r.date + 'T00:00:00').toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(r.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday:'short' })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[r.status]?.color}`}>
                          {STATUS_STYLES[r.status]?.icon} {STATUS_STYLES[r.status]?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {r.marked_at ? new Date(r.marked_at).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">Showing {(page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE, records.length)} of {records.length}</p>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => p-1)} disabled={page===1}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">← Prev</button>
                  <button onClick={() => setPage(p => p+1)} disabled={page===totalPages}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">Next →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  )
}
