// src/components/analytics/AttendanceChart.jsx
import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts'
import { Link } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'

function localDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function dateRange(days) {
  const dates = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    dates.push(localDateStr(d))
  }
  return dates
}

export default function AttendanceChart() {
  const [batchData,   setBatchData]   = useState([])
  const [trendData,   setTrendData]   = useState([])
  const [atRisk,      setAtRisk]      = useState([])
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    const load = async () => {
      const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const monthStart = new Date(); monthStart.setDate(1)

      const [{ data: att }, { data: batches }, { data: students }] = await Promise.all([
        supabase.from('attendance').select('student_id, status, date')
          .gte('date', localDateStr(thirtyDaysAgo)),
        supabase.from('batches').select('id, name').eq('is_active', true),
        supabase.from('profiles').select('id, full_name')
          .eq('role', 'student').eq('is_active', true),
      ])

      const spRes = await supabase.from('student_profiles').select('id, batch_id, batches(name)')
      const spMap = {}; (spRes.data ?? []).forEach(s => { spMap[s.id] = s })

      // Batch-wise attendance this month
      const batchStats = {}
      ;(batches ?? []).forEach(b => { batchStats[b.id] = { name: b.name, present: 0, late: 0, total: 0 } })
      ;(att ?? []).filter(a => a.date >= localDateStr(monthStart)).forEach(a => {
        const bId = spMap[a.student_id]?.batch_id
        if (bId && batchStats[bId]) {
          batchStats[bId].total++
          if (a.status === 'present') batchStats[bId].present++
          else if (a.status === 'late') batchStats[bId].late++
        }
      })
      setBatchData(Object.values(batchStats).map(b => ({
        name: b.name,
        pct:  b.total > 0 ? Math.round(((b.present + b.late * 0.5) / b.total) * 100) : 0,
      })))

      // 30-day trend
      const dates = dateRange(30)
      const dayMap = {}
      ;(att ?? []).forEach(a => {
        if (!dayMap[a.date]) dayMap[a.date] = { present: 0, late: 0, total: 0 }
        dayMap[a.date].total++
        if (a.status === 'present') dayMap[a.date].present++
        else if (a.status === 'late') dayMap[a.date].late++
      })
      setTrendData(dates.map(d => ({
        date: d.slice(5),  // MM-DD
        pct:  dayMap[d] ? Math.round(((dayMap[d].present + dayMap[d].late * 0.5) / dayMap[d].total) * 100) : 0,
      })))

      // At-risk students (< 50% in last 30 days)
      const studentAtt = {}
      ;(att ?? []).forEach(a => {
        if (!studentAtt[a.student_id]) studentAtt[a.student_id] = { present: 0, late: 0, total: 0 }
        studentAtt[a.student_id].total++
        if (a.status === 'present') studentAtt[a.student_id].present++
        else if (a.status === 'late') studentAtt[a.student_id].late++
      })
      const risks = (students ?? [])
        .map(s => ({
          ...s,
          pct:   studentAtt[s.id] ? Math.round(((studentAtt[s.id].present + studentAtt[s.id].late * 0.5) / studentAtt[s.id].total) * 100) : 0,
          batch: spMap[s.id]?.batches?.name ?? '—',
        }))
        .filter(s => s.pct < 50)
        .sort((a, b) => a.pct - b.pct)
        .slice(0, 10)
      setAtRisk(risks)

      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="py-12 text-center text-gray-400 text-sm">Loading analytics…</div>

  const barColor = (pct) => pct >= 75 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626'

  return (
    <div className="space-y-6">
      {/* Batch comparison */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="font-bold text-gray-900 mb-4">Batch-wise Attendance — This Month</h3>
        {batchData.length === 0
          ? <p className="text-gray-400 text-sm text-center py-6">No attendance data yet</p>
          : <ResponsiveContainer width="100%" height={220}>
              <BarChart data={batchData} margin={{ top:5, right:10, left:0, bottom:5 }}>
                <XAxis dataKey="name" tick={{ fontSize:11 }} />
                <YAxis domain={[0,100]} tick={{ fontSize:11 }} unit="%" />
                <Tooltip formatter={(v) => [`${v}%`, 'Attendance']} />
                <Bar dataKey="pct" radius={[6,6,0,0]}
                  fill="#1e2771"
                  label={{ position:'top', fontSize:11, formatter: v => `${v}%` }}
                />
              </BarChart>
            </ResponsiveContainer>
        }
      </div>

      {/* 30-day trend */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="font-bold text-gray-900 mb-4">Attendance Trend — Last 30 Days</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={trendData} margin={{ top:5, right:10, left:0, bottom:5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize:10 }} interval={4} />
            <YAxis domain={[0,100]} tick={{ fontSize:11 }} unit="%" />
            <Tooltip formatter={(v) => [`${v}%`, 'Present']} />
            <Line type="monotone" dataKey="pct" stroke="#1e2771" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* At-risk students */}
      {atRisk.length > 0 && (
        <div className="bg-white rounded-2xl border border-red-100 p-5">
          <h3 className="font-bold text-red-700 mb-3 flex items-center gap-2">
            ⚠ At-Risk Students <span className="text-xs font-normal text-red-500">(&lt;50% attendance)</span>
          </h3>
          <div className="space-y-2">
            {atRisk.map(s => (
              <div key={s.id} className="flex items-center gap-3 py-2 border-b border-gray-50">
                <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 text-xs font-bold flex items-center justify-center">
                  {s.full_name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{s.full_name}</p>
                  <p className="text-xs text-gray-400">{s.batch}</p>
                </div>
                <span className="font-bold text-red-600 text-sm">{s.pct}%</span>
                <Link to="/admin/messages" className="p-1.5 text-gray-400 hover:text-blue-600">
                  <MessageCircle className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
