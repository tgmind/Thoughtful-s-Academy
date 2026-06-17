#!/bin/bash
# ============================================================
# phase5.sh — Admin Dashboard (Phase 5)
# Run inside coaching-institute folder: bash phase5.sh
# ============================================================
set -e
echo "🏗️  Building Phase 5 — Admin Dashboard..."

mkdir -p src/pages/admin

# ============================================================
# 1. ADMIN HOME
# ============================================================
cat > src/pages/admin/AdminHome.jsx << 'EOF'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Users, BookUser, CreditCard, MessageCircle, Activity, Video, CheckCircle, XCircle, Bell, QrCode, Layers, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

function todayISO() { return new Date().toISOString().split('T')[0] }

export default function AdminHome() {
  const { user } = useAuth()
  const [stats,    setStats]    = useState({ students:0, teachers:0, pending_fees:0, unread:0, attendance_pct:0, live:0 })
  const [fees,     setFees]     = useState([])
  const [msgs,     setMsgs]     = useState([])
  const [loading,  setLoading]  = useState(true)
  const [verifying,setVerifying]= useState(null)

  const load = async () => {
    if (!user) return
    const [s, t, pf, um, att, lc, recentFees, recentMsgs] = await Promise.all([
      supabase.from('profiles').select('id', { count:'exact' }).eq('role','student'),
      supabase.from('profiles').select('id', { count:'exact' }).eq('role','teacher').eq('is_active',true),
      supabase.from('fee_records').select('id', { count:'exact' }).eq('status','pending'),
      supabase.from('messages').select('id', { count:'exact' }).eq('receiver_id', user.id).eq('is_read', false),
      supabase.from('attendance').select('status').eq('date', todayISO()),
      supabase.from('live_classes').select('id', { count:'exact' }).eq('is_active', true),
      supabase.from('fee_records').select('*, profiles!student_id(full_name)').eq('status','pending').order('paid_at').limit(5),
      supabase.from('messages').select('*, profiles!sender_id(full_name, role)').eq('receiver_id', user.id).eq('is_read', false).order('created_at', { ascending:false }).limit(5),
    ])
    const attData = att.data ?? []
    const present = attData.filter(a => a.status === 'present').length
    const total   = attData.length
    setStats({
      students:      s.count   ?? 0,
      teachers:      t.count   ?? 0,
      pending_fees:  pf.count  ?? 0,
      unread:        um.count  ?? 0,
      attendance_pct: total > 0 ? Math.round((present / total) * 100) : 0,
      live:          lc.count  ?? 0,
    })
    setFees(recentFees.data ?? [])
    setMsgs(recentMsgs.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [user])
  // Refresh every 30 seconds
  useEffect(() => { const id = setInterval(load, 30000); return () => clearInterval(id) }, [user])

  const verifyFee = async (id, status) => {
    setVerifying(id)
    await supabase.from('fee_records').update({ status, verified_by: user.id, verified_at: new Date().toISOString() }).eq('id', id)
    setFees(f => f.filter(x => x.id !== id))
    setStats(s => ({ ...s, pending_fees: Math.max(0, s.pending_fees - 1) }))
    toast.success(status === 'verified' ? 'Fee verified ✓' : 'Fee rejected')
    setVerifying(null)
  }

  const statCards = [
    { label:'Total Students',   value: stats.students,       icon: <Users className="h-5 w-5" />,       color:'bg-blue-50 text-blue-700',   link:'/admin/students'  },
    { label:'Active Teachers',  value: stats.teachers,       icon: <BookUser className="h-5 w-5" />,    color:'bg-purple-50 text-purple-700',link:'/admin/teachers'  },
    { label:'Pending Fees',     value: stats.pending_fees,   icon: <CreditCard className="h-5 w-5" />,  color:'bg-amber-50 text-amber-700',  link:'/admin/fees'      },
    { label:'Unread Messages',  value: stats.unread,         icon: <MessageCircle className="h-5 w-5" />,color:'bg-green-50 text-green-700', link:'/admin/messages'  },
    { label:"Today's Attendance",value:`${stats.attendance_pct}%`,icon:<Activity className="h-5 w-5" />, color:'bg-teal-50 text-teal-700',  link:'/admin/students'  },
    { label:'Live Classes',     value: stats.live,           icon: <Video className="h-5 w-5" />,       color:'bg-red-50 text-red-700',      link:'/admin/live-class'},
  ]

  const quickActions = [
    { label:'Add Notification', icon:<Bell className="h-4 w-4" />,      path:'/admin/announcements', color:'bg-blue-950 text-white'    },
    { label:'Update QR',        icon:<QrCode className="h-4 w-4" />,    path:'/admin/qr',            color:'bg-amber-500 text-white'   },
    { label:'Add Batch',        icon:<Layers className="h-4 w-4" />,    path:'/admin/batches',       color:'bg-green-600 text-white'   },
    { label:'Pay Salary',       icon:<DollarSign className="h-4 w-4" />,path:'/admin/salary',        color:'bg-purple-600 text-white'  },
  ]

  if (loading) return <div className="py-12 text-center text-gray-400 text-sm">Loading…</div>

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {statCards.map(s => (
          <Link key={s.label} to={s.link}
            className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className={`w-9 h-9 rounded-lg ${s.color} flex items-center justify-center mb-3`}>{s.icon}</div>
            <p className="font-bold text-2xl text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {quickActions.map(a => (
          <Link key={a.label} to={a.path}
            className={`${a.color} rounded-xl p-3 flex items-center gap-2 font-semibold text-sm hover:opacity-90 transition-opacity shadow-sm`}>
            {a.icon} {a.label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending fees */}
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Pending Fee Verifications</h3>
            <Link to="/admin/fees" className="text-xs text-blue-700 font-medium hover:underline">View all</Link>
          </div>
          {fees.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">No pending fees 🎉</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {fees.map(f => (
                <div key={f.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{f.profiles?.full_name}</p>
                    <p className="text-xs text-gray-500">₹{f.amount} · {f.payment_month}</p>
                    <p className="text-xs text-gray-400 font-mono">{f.reference_id}</p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={() => verifyFee(f.id, 'verified')} disabled={verifying===f.id}
                      className="p-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors">
                      <CheckCircle className="h-4 w-4" />
                    </button>
                    <button onClick={() => verifyFee(f.id, 'rejected')} disabled={verifying===f.id}
                      className="p-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors">
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent messages */}
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Recent Messages</h3>
            <Link to="/admin/messages" className="text-xs text-blue-700 font-medium hover:underline">View all</Link>
          </div>
          {msgs.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">No unread messages 🎉</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {msgs.map(m => (
                <div key={m.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-950 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {m.profiles?.full_name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{m.profiles?.full_name}</p>
                    <p className="text-xs text-gray-500 truncate">{m.content}</p>
                  </div>
                  <Link to="/admin/messages" className="text-xs text-blue-700 font-medium flex-shrink-0 hover:underline">Reply</Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
EOF
echo "  ✅ AdminHome"

# ============================================================
# 2. STUDENT TRACKER
# ============================================================
cat > src/pages/admin/StudentTracker.jsx << 'EOF'
import { useState, useEffect } from 'react'
import { Search, Download, X, CheckCircle, XCircle, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

function todayISO() { return new Date().toISOString().split('T')[0] }
function monthLabel() { return new Date().toLocaleDateString('en-IN', { month:'long', year:'numeric' }) }

function AttBar({ pct }) {
  const color = pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width:`${pct}%` }} />
      </div>
      <span className={`text-xs font-semibold ${pct>=75?'text-green-700':pct>=50?'text-amber-700':'text-red-600'}`}>{pct}%</span>
    </div>
  )
}

export default function StudentTracker() {
  const [students,  setStudents]  = useState([])
  const [batches,   setBatches]   = useState([])
  const [search,    setSearch]    = useState('')
  const [batchF,    setBatchF]    = useState('')
  const [attF,      setAttF]      = useState('all')
  const [loading,   setLoading]   = useState(true)
  const [selected,  setSelected]  = useState(null)
  const [deacting,  setDeacting]  = useState(null)

  useEffect(() => {
    Promise.all([
      supabase.from('profiles').select('id, full_name, email, phone, is_active, created_at')
        .eq('role','student').order('full_name'),
      supabase.from('student_profiles').select('id, batch_id, roll_number, batches(name)'),
      supabase.from('attendance').select('student_id, status'),
      supabase.from('fee_records').select('student_id, status, payment_month').eq('payment_month', monthLabel()),
      supabase.from('batches').select('id, name').eq('is_active', true).order('name'),
    ]).then(([p, sp, att, fees, b]) => {
      const spMap  = {}; (sp.data ?? []).forEach(s => { spMap[s.id] = s })
      const feeMap = {}; (fees.data ?? []).forEach(f => { feeMap[f.student_id] = f.status })
      const attMap = {}
      ;(att.data ?? []).forEach(a => {
        if (!attMap[a.student_id]) attMap[a.student_id] = { present:0, total:0 }
        attMap[a.student_id].total++
        if (a.status === 'present') attMap[a.student_id].present++
      })
      const enriched = (p.data ?? []).map(s => ({
        ...s,
        batch_name:    spMap[s.id]?.batches?.name ?? '—',
        batch_id:      spMap[s.id]?.batch_id ?? null,
        roll_number:   spMap[s.id]?.roll_number ?? '—',
        att_pct:       attMap[s.id]
          ? Math.round((attMap[s.id].present / attMap[s.id].total) * 100) : 0,
        fee_status:    feeMap[s.id] ?? 'not_paid',
      }))
      setStudents(enriched)
      setBatches(b.data ?? [])
      setLoading(false)
    })
  }, [])

  const toggleActive = async (s) => {
    setDeacting(s.id)
    await supabase.from('profiles').update({ is_active: !s.is_active }).eq('id', s.id)
    setStudents(list => list.map(x => x.id === s.id ? { ...x, is_active: !x.is_active } : x))
    toast.success(s.is_active ? 'Account deactivated' : 'Account reactivated')
    setDeacting(null)
  }

  const exportCSV = () => {
    const rows = [['Name','Email','Phone','Batch','Roll','Attendance%','Fee Status','Active']]
    filtered.forEach(s => rows.push([s.full_name, s.email, s.phone||'', s.batch_name, s.roll_number, s.att_pct+'%', s.fee_status, s.is_active?'Yes':'No']))
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
    a.download = 'students.csv'; a.click()
  }

  const filtered = students.filter(s => {
    const matchSearch = s.full_name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase())
    const matchBatch  = !batchF || s.batch_id === batchF
    const matchAtt    = attF === 'all' || (attF==='good'&&s.att_pct>=75) || (attF==='warning'&&s.att_pct>=50&&s.att_pct<75) || (attF==='poor'&&s.att_pct<50)
    return matchSearch && matchBatch && matchAtt
  })

  const FEE_COLORS = { verified:'bg-green-100 text-green-800', pending:'bg-amber-100 text-amber-800', rejected:'bg-red-100 text-red-800', not_paid:'bg-gray-100 text-gray-600' }
  const FEE_LABELS = { verified:'Verified', pending:'Pending', rejected:'Rejected', not_paid:'Not Paid' }

  return (
    <div className="space-y-4 pb-20 lg:pb-0">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students…"
            className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
        </div>
        <select value={batchF} onChange={e => setBatchF(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600">
          <option value="">All Batches</option>
          {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={attF} onChange={e => setAttF(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600">
          <option value="all">All Attendance</option>
          <option value="good">Good (≥75%)</option>
          <option value="warning">Warning (50–75%)</option>
          <option value="poor">Poor (&lt;50%)</option>
        </select>
        <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <p className="text-sm text-gray-500">{filtered.length} students</p>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Student','Batch','Phone','Attendance','Fee Status','Status','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(5)].map((_,i) => (
                  <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No students found</td></tr>
              ) : (
                filtered.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-950 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {s.full_name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{s.full_name}</p>
                          <p className="text-xs text-gray-400">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{s.batch_name}</td>
                    <td className="px-4 py-3 text-gray-500">{s.phone || '—'}</td>
                    <td className="px-4 py-3 w-32"><AttBar pct={s.att_pct} /></td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${FEE_COLORS[s.fee_status]}`}>
                        {FEE_LABELS[s.fee_status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${s.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {s.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setSelected(s)} className="px-2.5 py-1 text-xs bg-blue-50 text-blue-700 rounded-lg font-medium hover:bg-blue-100">View</button>
                        <button onClick={() => toggleActive(s)} disabled={deacting===s.id}
                          className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${s.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
                          {s.is_active ? 'Suspend' : 'Restore'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student detail slide-over */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/30" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Student Profile</h3>
              <button onClick={() => setSelected(null)} className="p-1 text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5 space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-blue-950 text-white text-xl font-bold flex items-center justify-center">
                  {selected.full_name[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-lg text-gray-900">{selected.full_name}</p>
                  <p className="text-sm text-gray-500">{selected.email}</p>
                  {selected.phone && <p className="text-sm text-gray-500">{selected.phone}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Batch</p>
                  <p className="font-semibold text-gray-900 mt-0.5">{selected.batch_name}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Roll Number</p>
                  <p className="font-semibold text-gray-900 mt-0.5">{selected.roll_number}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Attendance</p>
                  <p className="font-bold text-xl mt-0.5" style={{color: selected.att_pct>=75?'#16a34a':selected.att_pct>=50?'#d97706':'#dc2626'}}>
                    {selected.att_pct}%
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">This Month Fee</p>
                  <p className={`font-semibold mt-0.5 capitalize ${selected.fee_status==='verified'?'text-green-700':selected.fee_status==='pending'?'text-amber-700':'text-red-600'}`}>
                    {selected.fee_status.replace('_',' ')}
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1">Joined</p>
                <p className="font-medium text-gray-900 text-sm">
                  {new Date(selected.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}
                </p>
              </div>
              <button onClick={() => toggleActive(selected)}
                className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-colors ${selected.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
                {selected.is_active ? 'Suspend Account' : 'Restore Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
EOF
echo "  ✅ StudentTracker"

# ============================================================
# 3. FEE MANAGER
# ============================================================
cat > src/pages/admin/FeeManager.jsx << 'EOF'
import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Download, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const TABS = ['Pending', 'All Records']
const STATUS_COLORS = { pending:'bg-amber-100 text-amber-800', verified:'bg-green-100 text-green-800', rejected:'bg-red-100 text-red-800' }

export default function FeeManager() {
  const { user } = useAuth()
  const [tab,       setTab]       = useState('Pending')
  const [pending,   setPending]   = useState([])
  const [all,       setAll]       = useState([])
  const [search,    setSearch]    = useState('')
  const [statusF,   setStatusF]   = useState('')
  const [loading,   setLoading]   = useState(true)
  const [acting,    setActing]    = useState(null)
  const [rejectId,  setRejectId]  = useState(null)
  const [reason,    setReason]    = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('fee_records').select('*, profiles!student_id(full_name, email)').eq('status','pending').order('paid_at'),
      supabase.from('fee_records').select('*, profiles!student_id(full_name, email)').order('paid_at', { ascending:false }).limit(100),
    ]).then(([p, a]) => {
      setPending(p.data ?? [])
      setAll(a.data ?? [])
      setLoading(false)
    })
  }, [])

  const verify = async (id) => {
    setActing(id)
    await supabase.from('fee_records').update({ status:'verified', verified_by:user.id, verified_at:new Date().toISOString() }).eq('id', id)
    setPending(f => f.filter(x => x.id !== id))
    setAll(f => f.map(x => x.id === id ? { ...x, status:'verified' } : x))
    toast.success('Fee verified ✓')
    setActing(null)
  }

  const reject = async () => {
    if (!rejectId) return
    setActing(rejectId)
    await supabase.from('fee_records').update({ status:'rejected', notes:reason, verified_by:user.id, verified_at:new Date().toISOString() }).eq('id', rejectId)
    setPending(f => f.filter(x => x.id !== rejectId))
    setAll(f => f.map(x => x.id === rejectId ? { ...x, status:'rejected' } : x))
    toast.success('Fee rejected')
    setActing(null); setRejectId(null); setReason('')
  }

  const exportCSV = () => {
    const rows = [['Student','Email','Month','Amount','Reference','Status','Date']]
    filteredAll.forEach(r => rows.push([r.profiles?.full_name, r.profiles?.email, r.payment_month, r.amount, r.reference_id||'', r.status, new Date(r.paid_at).toLocaleDateString('en-IN')]))
    const csv = rows.map(r => r.map(v=>`"${v}"`).join(',')).join('\n')
    const a = document.createElement('a'); a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv); a.download='fees.csv'; a.click()
  }

  const filteredAll = all.filter(r => {
    const matchS = r.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) || r.profiles?.email?.toLowerCase().includes(search.toLowerCase())
    const matchSt = !statusF || r.status === statusF
    return matchS && matchSt
  })

  if (loading) return <div className="py-12 text-center text-gray-400 text-sm">Loading…</div>

  return (
    <div className="space-y-4 pb-20 lg:pb-0">
      <div className="flex gap-2">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab===t?'bg-blue-950 text-white':'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {t} {t==='Pending' && pending.length > 0 && <span className="ml-1 bg-amber-400 text-white text-xs rounded-full px-1.5">{pending.length}</span>}
          </button>
        ))}
      </div>

      {tab === 'Pending' && (
        pending.length === 0
          ? <div className="text-center py-16 bg-white rounded-xl border border-gray-100"><p className="text-gray-400">No pending verifications 🎉</p></div>
          : <div className="space-y-3">
              {pending.map(f => (
                <div key={f.id} className="bg-white rounded-xl border border-amber-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-gray-900">{f.profiles?.full_name}</p>
                      <p className="text-sm text-gray-500">{f.profiles?.email}</p>
                      <div className="flex gap-3 mt-2 text-sm">
                        <span className="font-semibold text-green-700">₹{f.amount}</span>
                        <span className="text-gray-500">{f.payment_month}</span>
                        <span className="font-mono text-xs text-gray-400">{f.reference_id}</span>
                      </div>
                      {f.screenshot_url && (
                        <a href={f.screenshot_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-1 inline-block">View Screenshot</a>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => verify(f.id)} disabled={acting===f.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors">
                        <CheckCircle className="h-4 w-4" /> Verify
                      </button>
                      <button onClick={() => { setRejectId(f.id); setReason('') }} disabled={acting===f.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold rounded-lg transition-colors">
                        <XCircle className="h-4 w-4" /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
      )}

      {tab === 'All Records' && (
        <>
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student…"
                className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
            </div>
            <select value={statusF} onChange={e => setStatusF(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none">
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
            </select>
            <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
              <Download className="h-4 w-4" /> Export
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>{['Student','Month','Amount','Reference','Status','Date'].map(h=>(
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredAll.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3"><p className="font-medium">{r.profiles?.full_name}</p><p className="text-xs text-gray-400">{r.profiles?.email}</p></td>
                      <td className="px-4 py-3 text-gray-600">{r.payment_month}</td>
                      <td className="px-4 py-3 font-semibold">₹{r.amount}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.reference_id||'—'}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[r.status]}`}>{r.status}</span></td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{new Date(r.paid_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Reject modal */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-gray-900 mb-3">Reject Fee Payment</h3>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
              placeholder="Reason for rejection (optional)…"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setRejectId(null)} className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl font-semibold text-sm">Cancel</button>
              <button onClick={reject} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700">Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
EOF
echo "  ✅ FeeManager"

# ============================================================
# 4. TEACHER MANAGER
# ============================================================
cat > src/pages/admin/TeacherManager.jsx << 'EOF'
import { useState, useEffect } from 'react'
import { X, Lock, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'

const PERMS = [
  { key:'can_manage_study_cards', label:'Study Cards'      },
  { key:'can_drop_live_class',    label:'Live Class Links' },
  { key:'can_message_students',   label:'Message Students' },
  { key:'can_view_attendance',    label:'View Attendance'  },
  { key:'can_view_fee_records',   label:'View Fee Records' },
]

function Toggle({ on, onChange }) {
  return (
    <button onClick={() => onChange(!on)}
      className={`relative w-10 h-5.5 rounded-full transition-colors flex-shrink-0 ${on ? 'bg-blue-950' : 'bg-gray-300'}`}
      style={{ height:'22px' }}>
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${on ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  )
}

export default function TeacherManager() {
  const [teachers, setTeachers] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('profiles').select('id, full_name, email, phone, is_active, created_at').eq('role','teacher').order('full_name'),
      supabase.from('teacher_profiles').select('*'),
    ]).then(([p, tp]) => {
      const tpMap = {}; (tp.data ?? []).forEach(t => { tpMap[t.id] = t })
      setTeachers((p.data ?? []).map(t => ({ ...t, ...tpMap[t.id] })))
      setLoading(false)
    })
  }, [])

  const updatePerm = async (teacherId, key, val) => {
    setSaving(true)
    const { error } = await supabase.from('teacher_profiles').update({ [key]: val }).eq('id', teacherId)
    if (error) { toast.error(error.message); setSaving(false); return }
    setTeachers(list => list.map(t => t.id === teacherId ? { ...t, [key]: val } : t))
    if (selected?.id === teacherId) setSelected(s => ({ ...s, [key]: val }))
    toast.success('Permission updated')
    setSaving(false)
  }

  const toggleActive = async (t) => {
    await supabase.from('profiles').update({ is_active: !t.is_active }).eq('id', t.id)
    setTeachers(list => list.map(x => x.id === t.id ? { ...x, is_active: !x.is_active } : x))
    if (selected?.id === t.id) setSelected(s => ({ ...s, is_active: !s.is_active }))
    toast.success(t.is_active ? 'Account suspended' : 'Account restored')
  }

  if (loading) return <div className="py-12 text-center text-gray-400 text-sm">Loading…</div>

  return (
    <div className="space-y-4 pb-20 lg:pb-0">
      <p className="text-sm text-gray-500">{teachers.length} teachers</p>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>{['Teacher','Subject','Salary','Permissions','Status','Actions'].map(h=>(
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {teachers.length === 0
                ? <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No teachers yet</td></tr>
                : teachers.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-purple-700 text-white text-xs font-bold flex items-center justify-center">{t.full_name[0].toUpperCase()}</div>
                        <div><p className="font-semibold">{t.full_name}</p><p className="text-xs text-gray-400">{t.email}</p></div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{t.subject || '—'}</td>
                    <td className="px-4 py-3 font-semibold">₹{Number(t.salary_amount||0).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {PERMS.map(p => (
                          <span key={p.key} title={p.label}
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${t[p.key] ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                            {t[p.key] ? '✓' : '×'}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${t.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {t.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setSelected(t)} className="px-2.5 py-1 text-xs bg-purple-50 text-purple-700 rounded-lg font-medium hover:bg-purple-100">Edit Permissions</button>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* Permissions slide-over */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/30" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-sm bg-white h-full overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Edit Permissions</h3>
              <button onClick={() => setSelected(null)} className="p-1 text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-purple-700 text-white text-lg font-bold flex items-center justify-center">{selected.full_name[0].toUpperCase()}</div>
                <div>
                  <p className="font-bold text-gray-900">{selected.full_name}</p>
                  <p className="text-sm text-gray-500">{selected.subject || 'No subject set'}</p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Feature Permissions</p>
                {PERMS.map(p => (
                  <div key={p.key} className="flex items-center justify-between py-2 border-b border-gray-50">
                    <span className="text-sm font-medium text-gray-700">{p.label}</span>
                    <Toggle on={!!selected[p.key]} onChange={val => updatePerm(selected.id, p.key, val)} />
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Salary</p>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 text-sm">Monthly: ₹</span>
                  <input type="number" defaultValue={selected.salary_amount || 0}
                    onBlur={async e => {
                      const val = parseFloat(e.target.value) || 0
                      await supabase.from('teacher_profiles').update({ salary_amount: val }).eq('id', selected.id)
                      setTeachers(list => list.map(t => t.id === selected.id ? { ...t, salary_amount: val } : t))
                      toast.success('Salary updated')
                    }}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
                </div>
              </div>

              <button onClick={() => toggleActive(selected)}
                className={`w-full py-2.5 rounded-xl font-semibold text-sm ${selected.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
                {selected.is_active ? 'Suspend Account' : 'Restore Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
EOF
echo "  ✅ TeacherManager"

# ============================================================
# 5. BATCH MANAGER
# ============================================================
cat > src/pages/admin/BatchManager.jsx << 'EOF'
import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, X, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'

const EMPTY = { name:'', description:'', subject:'', teacher_id:'' }

export default function BatchManager() {
  const [batches,   setBatches]   = useState([])
  const [teachers,  setTeachers]  = useState([])
  const [counts,    setCounts]    = useState({})
  const [showForm,  setShowForm]  = useState(false)
  const [editing,   setEditing]   = useState(null)
  const [form,      setForm]      = useState(EMPTY)
  const [saving,    setSaving]    = useState(false)
  const [deleting,  setDeleting]  = useState(null)
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('batches').select('*, profiles!teacher_id(full_name)').order('name'),
      supabase.from('profiles').select('id, full_name').eq('role','teacher').order('full_name'),
      supabase.from('student_profiles').select('batch_id'),
    ]).then(([b, t, sp]) => {
      setBatches(b.data ?? [])
      setTeachers(t.data ?? [])
      const c = {}; (sp.data ?? []).forEach(s => { if (s.batch_id) c[s.batch_id] = (c[s.batch_id]||0)+1 })
      setCounts(c)
      setLoading(false)
    })
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const openAdd  = () => { setEditing(null); setForm(EMPTY); setShowForm(true) }
  const openEdit = (b) => { setEditing(b.id); setForm({ name:b.name, description:b.description||'', subject:b.subject||'', teacher_id:b.teacher_id||'' }); setShowForm(true) }

  const save = async () => {
    if (!form.name.trim()) { toast.error('Batch name is required'); return }
    setSaving(true)
    const payload = { ...form, teacher_id: form.teacher_id || null }
    const { data, error } = editing
      ? await supabase.from('batches').update(payload).eq('id', editing).select('*, profiles!teacher_id(full_name)').single()
      : await supabase.from('batches').insert({ ...payload, is_active:true }).select('*, profiles!teacher_id(full_name)').single()
    setSaving(false)
    if (error) { toast.error(error.message); return }
    if (editing) setBatches(b => b.map(x => x.id === editing ? data : x))
    else         setBatches(b => [...b, data])
    setShowForm(false)
    toast.success(editing ? 'Batch updated!' : 'Batch created!')
  }

  const toggleActive = async (b) => {
    const { data } = await supabase.from('batches').update({ is_active: !b.is_active }).eq('id', b.id).select('*, profiles!teacher_id(full_name)').single()
    if (data) setBatches(list => list.map(x => x.id === b.id ? data : x))
  }

  const deleteBatch = async (id) => {
    if ((counts[id]||0) > 0) { toast.error('Cannot delete — students are enrolled in this batch'); return }
    setDeleting(id)
    await supabase.from('batches').delete().eq('id', id)
    setBatches(b => b.filter(x => x.id !== id))
    setDeleting(null)
    toast.success('Batch deleted')
  }

  if (loading) return <div className="py-12 text-center text-gray-400 text-sm">Loading…</div>

  return (
    <div className="space-y-5 pb-20 lg:pb-0">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-lg text-gray-900">Batches</h2>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-950 text-white text-sm font-semibold rounded-xl hover:bg-blue-900 transition-colors">
          <Plus className="h-4 w-4" /> Add Batch
        </button>
      </div>

      {batches.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <p className="text-gray-400">No batches yet. Create your first batch!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {batches.map(b => (
            <div key={b.id} className={`bg-white rounded-xl border ${b.is_active ? 'border-gray-100' : 'border-gray-200 opacity-60'} p-4`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-gray-900">{b.name}</h3>
                  {b.subject && <p className="text-sm text-gray-500">{b.subject}</p>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${b.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {b.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              {b.description && <p className="text-xs text-gray-500 mb-3">{b.description}</p>}
              <div className="flex items-center gap-3 text-sm text-gray-500 mb-4">
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {counts[b.id]||0} students</span>
                {b.profiles?.full_name && <span>· {b.profiles.full_name}</span>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(b)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors">
                  <Edit2 className="h-3.5 w-3.5" /> Edit
                </button>
                <button onClick={() => toggleActive(b)} className={`px-2.5 py-1.5 text-xs rounded-lg font-medium transition-colors ${b.is_active ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
                  {b.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={() => deleteBatch(b.id)} disabled={deleting===b.id}
                  className="p-1.5 text-gray-400 hover:text-red-600 transition-colors ml-auto">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">{editing ? 'Edit Batch' : 'Create Batch'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              {[{k:'name',l:'Batch Name *',p:'e.g. Class 10 Science'},{k:'subject',l:'Subject',p:'e.g. Mathematics'},{k:'description',l:'Description',p:'Brief description…'}].map(f => (
                <div key={f.k}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{f.l}</label>
                  <input value={form[f.k]} onChange={e => set(f.k, e.target.value)} placeholder={f.p}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm" />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Assign Teacher</label>
                <select value={form.teacher_id} onChange={e => set('teacher_id', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm">
                  <option value="">No teacher assigned</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl font-semibold text-sm">Cancel</button>
                <button onClick={save} disabled={saving} className="flex-1 py-2.5 bg-blue-950 text-white font-bold rounded-xl hover:bg-blue-900 disabled:opacity-50 text-sm">
                  {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
EOF
echo "  ✅ BatchManager"

# ============================================================
# 6. QR MANAGER
# ============================================================
cat > src/pages/admin/QRManager.jsx << 'EOF'
import { useState, useEffect } from 'react'
import { QrCode, Copy, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

export default function QRManager() {
  const { user } = useAuth()
  const [current,  setCurrent]  = useState(null)
  const [history,  setHistory]  = useState([])
  const [form,     setForm]     = useState({ upi_id:'', payee_name:'', description:'' })
  const [file,     setFile]     = useState(null)
  const [preview,  setPreview]  = useState(null)
  const [saving,   setSaving]   = useState(false)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    supabase.from('qr_settings').select('*').order('updated_at', { ascending:false })
      .then(({ data }) => {
        const active = data?.find(d => d.is_active)
        setCurrent(active ?? null)
        setHistory(data ?? [])
        setLoading(false)
      })
  }, [])

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const save = async () => {
    if (!file && !form.upi_id) { toast.error('Upload a QR image or enter a UPI ID'); return }
    setSaving(true)
    try {
      let qr_image_url = current?.qr_image_url ?? ''
      if (file) {
        const path = `qr-codes/${Date.now()}-${file.name}`
        const { error: upErr } = await supabase.storage.from('qr-codes').upload(path, file, { upsert:true })
        if (upErr) throw upErr
        const { data: { publicUrl } } = supabase.storage.from('qr-codes').getPublicUrl(path)
        qr_image_url = publicUrl
      }
      // Deactivate all existing
      await supabase.from('qr_settings').update({ is_active:false }).eq('is_active', true)
      // Insert new
      const { data, error } = await supabase.from('qr_settings').insert({
        qr_image_url, upi_id:form.upi_id, payee_name:form.payee_name,
        description:form.description, is_active:true, updated_by:user.id,
      }).select().single()
      if (error) throw error
      setCurrent(data)
      setHistory(h => [data, ...h.map(x => ({ ...x, is_active:false }))])
      setFile(null); setPreview(null); setForm({ upi_id:'', payee_name:'', description:'' })
      toast.success('QR code updated!')
    } catch (err) {
      toast.error(err.message)
    }
    setSaving(false)
  }

  if (loading) return <div className="py-12 text-center text-gray-400 text-sm">Loading…</div>

  return (
    <div className="space-y-6 pb-20 lg:pb-0 max-w-2xl">

      {/* Current QR */}
      {current && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
          <h2 className="font-bold text-gray-900 mb-4 flex items-center justify-center gap-2">
            <QrCode className="h-5 w-5" /> Current Payment QR
          </h2>
          <img src={current.qr_image_url} alt="QR Code" className="w-52 h-52 mx-auto rounded-xl border-2 border-gray-200 object-contain mb-4" />
          {current.payee_name && <p className="font-bold text-gray-900">{current.payee_name}</p>}
          {current.upi_id && (
            <button onClick={() => { navigator.clipboard.writeText(current.upi_id); toast.success('Copied!') }}
              className="flex items-center gap-2 mx-auto mt-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors">
              <Copy className="h-4 w-4" /> {current.upi_id}
            </button>
          )}
          {current.description && <p className="text-sm text-gray-500 mt-2">{current.description}</p>}
          <p className="text-xs text-gray-400 mt-3">Last updated: {new Date(current.updated_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</p>
        </div>
      )}

      {/* Update form */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <h3 className="font-bold text-gray-900">{current ? 'Update QR Code' : 'Set Up Payment QR'}</h3>

        {/* File upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">QR Image</label>
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
            {preview
              ? <img src={preview} alt="preview" className="h-full object-contain rounded-xl p-1" />
              : <div className="flex flex-col items-center gap-2 text-gray-400">
                  <Upload className="h-6 w-6" />
                  <span className="text-sm">Click to upload QR image</span>
                </div>
            }
            <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </label>
        </div>

        {[{k:'upi_id',l:'UPI ID',p:'yourname@upi'},{k:'payee_name',l:'Payee Name',p:'Institute Name'},{k:'description',l:'Note (optional)',p:'e.g. Monthly fee payment'}].map(f => (
          <div key={f.k}>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{f.l}</label>
            <input value={form[f.k]} onChange={e => setForm(x => ({...x,[f.k]:e.target.value}))} placeholder={f.p}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm" />
          </div>
        ))}

        <button onClick={save} disabled={saving}
          className="w-full py-3 bg-blue-950 hover:bg-blue-900 text-white font-bold rounded-xl disabled:opacity-50 transition-colors">
          {saving ? 'Saving…' : current ? 'Update QR Code' : 'Set QR Code'}
        </button>
      </div>

      {/* History */}
      {history.length > 1 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100"><h3 className="font-semibold text-gray-900 text-sm">QR History</h3></div>
          <div className="divide-y divide-gray-50">
            {history.filter(h => !h.is_active).map(h => (
              <div key={h.id} className="px-4 py-3 flex items-center gap-3 opacity-60">
                <img src={h.qr_image_url} alt="" className="w-10 h-10 rounded object-contain border border-gray-200" />
                <div>
                  <p className="text-sm font-medium text-gray-700">{h.payee_name || h.upi_id || 'QR Code'}</p>
                  <p className="text-xs text-gray-400">{new Date(h.updated_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
EOF
echo "  ✅ QRManager"

# ============================================================
# 7. SALARY MANAGER
# ============================================================
cat > src/pages/admin/SalaryManager.jsx << 'EOF'
import { useState, useEffect } from 'react'
import { DollarSign, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

function getMonths() {
  const months = []
  const now = new Date()
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(d.toLocaleDateString('en-IN', { month:'long', year:'numeric' }))
  }
  return months
}

const METHODS = ['UPI','Cash','Bank Transfer','Cheque']

export default function SalaryManager() {
  const { user } = useAuth()
  const [teachers,  setTeachers]  = useState([])
  const [records,   setRecords]   = useState([])
  const [form,      setForm]      = useState({ teacher_id:'', amount:'', month:getMonths()[0], method:'UPI', reference_id:'' })
  const [saving,    setSaving]    = useState(false)
  const [search,    setSearch]    = useState('')
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('profiles').select('id, full_name').eq('role','teacher').order('full_name'),
      supabase.from('teacher_profiles').select('id, salary_amount'),
      supabase.from('salary_records').select('*, profiles!teacher_id(full_name)').order('created_at', { ascending:false }).limit(50),
    ]).then(([p, tp, r]) => {
      const tpMap = {}; (tp.data ?? []).forEach(t => { tpMap[t.id] = t })
      setTeachers((p.data ?? []).map(t => ({ ...t, salary_amount: tpMap[t.id]?.salary_amount ?? 0 })))
      setRecords(r.data ?? [])
      setLoading(false)
    })
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const onTeacherChange = (id) => {
    const t = teachers.find(x => x.id === id)
    set('teacher_id', id)
    if (t) set('amount', t.salary_amount?.toString() ?? '')
  }

  const pay = async () => {
    if (!form.teacher_id || !form.amount) { toast.error('Select teacher and amount'); return }
    setSaving(true)
    const { data, error } = await supabase.from('salary_records').insert({
      teacher_id: form.teacher_id, amount: parseFloat(form.amount),
      payment_month: form.month, payment_method: form.method,
      reference_id: form.reference_id || null, status:'paid', paid_at: new Date().toISOString(), paid_by: user.id,
    }).select('*, profiles!teacher_id(full_name)').single()
    setSaving(false)
    if (error) { toast.error(error.message); return }
    setRecords(r => [data, ...r])
    setForm(f => ({ ...f, teacher_id:'', amount:'', reference_id:'' }))
    toast.success(`Salary paid to ${data.profiles?.full_name}!`)
  }

  const filtered = records.filter(r => r.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()))

  if (loading) return <div className="py-12 text-center text-gray-400 text-sm">Loading…</div>

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pay form */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <h2 className="font-bold text-gray-900 flex items-center gap-2"><DollarSign className="h-5 w-5 text-green-600" /> Pay Teacher Salary</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Teacher</label>
            <select value={form.teacher_id} onChange={e => onTeacherChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm">
              <option value="">Select teacher…</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name} — ₹{Number(t.salary_amount).toLocaleString('en-IN')}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount (₹)</label>
              <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Month</label>
              <select value={form.month} onChange={e => set('month', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm">
                {getMonths().map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Method</label>
              <select value={form.method} onChange={e => set('method', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm">
                {METHODS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Reference ID</label>
              <input value={form.reference_id} onChange={e => set('reference_id', e.target.value)} placeholder="Transaction ID"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm" />
            </div>
          </div>
          <button onClick={pay} disabled={saving}
            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl disabled:opacity-50 transition-colors">
            {saving ? 'Processing…' : 'Pay Salary ✓'}
          </button>
        </div>

        {/* Quick salary overview */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="font-bold text-gray-900 mb-3 text-sm">Monthly Salary Overview</h3>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {teachers.map(t => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-sm font-medium text-gray-900">{t.full_name}</span>
                <span className="font-bold text-green-700 text-sm">₹{Number(t.salary_amount).toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* History */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-sm flex-1">Salary History</h3>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter teacher…"
              className="pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none w-36" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>{['Teacher','Month','Amount','Method','Reference','Paid On'].map(h=>(
                <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0
                ? <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No salary records yet</td></tr>
                : filtered.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{r.profiles?.full_name}</td>
                    <td className="px-4 py-3 text-gray-600">{r.payment_month}</td>
                    <td className="px-4 py-3 font-bold text-green-700">₹{Number(r.amount).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-gray-500 capitalize">{r.payment_method||'—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{r.reference_id||'—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{r.paid_at ? new Date(r.paid_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '—'}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
EOF
echo "  ✅ SalaryManager"

# ============================================================
# 8. ANNOUNCEMENTS MANAGER
# ============================================================
cat > src/pages/admin/Announcements.jsx << 'EOF'
import { useState, useEffect } from 'react'
import { Plus, X, Trash2, Eye, EyeOff, Bell } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const TYPES   = ['general','fee','announcement','homework','live_class']
const TARGETS = [{ value:'all', label:'All' },{ value:'student', label:'Students Only' },{ value:'teacher', label:'Teachers Only' }]
const TYPE_COLORS = { fee:'bg-amber-100 text-amber-800', live_class:'bg-red-100 text-red-800', announcement:'bg-blue-100 text-blue-800', homework:'bg-purple-100 text-purple-800', general:'bg-gray-100 text-gray-700' }
const EMPTY = { title:'', body:'', type:'general', target_role:'all', target_batch_id:'', scheduled_at:'', expires_at:'' }

export default function Announcements() {
  const { user } = useAuth()
  const [notifs,    setNotifs]    = useState([])
  const [batches,   setBatches]   = useState([])
  const [showForm,  setShowForm]  = useState(false)
  const [form,      setForm]      = useState(EMPTY)
  const [saving,    setSaving]    = useState(false)
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('notifications').select('*').order('created_at', { ascending:false }),
      supabase.from('batches').select('id, name').eq('is_active', true).order('name'),
    ]).then(([n, b]) => { setNotifs(n.data ?? []); setBatches(b.data ?? []); setLoading(false) })
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.title.trim() || !form.body.trim()) { toast.error('Title and body are required'); return }
    setSaving(true)
    const { data, error } = await supabase.from('notifications').insert({
      ...form,
      target_batch_id: form.target_batch_id || null,
      scheduled_at:   form.scheduled_at   || null,
      expires_at:     form.expires_at     || null,
      is_active: true,
      created_by: user.id,
    }).select().single()
    setSaving(false)
    if (error) { toast.error(error.message); return }
    setNotifs(n => [data, ...n])
    setShowForm(false)
    setForm(EMPTY)
    toast.success('Notification published!')
  }

  const toggleActive = async (n) => {
    const { data } = await supabase.from('notifications').update({ is_active: !n.is_active }).eq('id', n.id).select().single()
    if (data) setNotifs(list => list.map(x => x.id === n.id ? data : x))
  }

  const deleteNotif = async (id) => {
    await supabase.from('notifications').delete().eq('id', id)
    setNotifs(n => n.filter(x => x.id !== id))
    toast.success('Deleted')
  }

  if (loading) return <div className="py-12 text-center text-gray-400 text-sm">Loading…</div>

  return (
    <div className="space-y-5 pb-20 lg:pb-0">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-lg text-gray-900">Announcements</h2>
        <button onClick={() => { setForm(EMPTY); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-950 text-white text-sm font-semibold rounded-xl hover:bg-blue-900 transition-colors">
          <Plus className="h-4 w-4" /> New Announcement
        </button>
      </div>

      {notifs.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <Bell className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">No announcements yet. Create your first one!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifs.map(n => (
            <div key={n.id} className={`bg-white rounded-xl border border-gray-100 p-4 ${!n.is_active ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${TYPE_COLORS[n.type]}`}>{n.type.replace('_',' ')}</span>
                    <span className="text-xs text-gray-400 capitalize">{n.target_role === 'all' ? 'Everyone' : n.target_role + 's'}</span>
                    {n.scheduled_at && <span className="text-xs text-blue-600">⏰ Scheduled</span>}
                    {n.expires_at   && <span className="text-xs text-amber-600">⌛ Expires {new Date(n.expires_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</span>}
                  </div>
                  <h3 className="font-semibold text-gray-900">{n.title}</h3>
                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={() => toggleActive(n)} title={n.is_active ? 'Hide' : 'Show'}
                    className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors">
                    {n.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  <button onClick={() => deleteNotif(n.id)} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <h3 className="font-bold text-gray-900">New Announcement</h3>
              <button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Title <span className="text-red-500">*</span></label>
                <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Fee Due Reminder"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Body <span className="text-red-500">*</span></label>
                <textarea value={form.body} onChange={e => set('body', e.target.value)} rows={3} placeholder="Full announcement text…"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
                  <select value={form.type} onChange={e => set('type', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm">
                    {TYPES.map(t => <option key={t} value={t} className="capitalize">{t.replace('_',' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Target</label>
                  <select value={form.target_role} onChange={e => set('target_role', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm">
                    {TARGETS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Target Batch (optional)</label>
                <select value={form.target_batch_id} onChange={e => set('target_batch_id', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm">
                  <option value="">All Batches</option>
                  {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Schedule (optional)</label>
                  <input type="datetime-local" value={form.scheduled_at} onChange={e => set('scheduled_at', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Expires (optional)</label>
                  <input type="datetime-local" value={form.expires_at} onChange={e => set('expires_at', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl font-semibold text-sm">Cancel</button>
                <button onClick={save} disabled={saving} className="flex-1 py-2.5 bg-blue-950 text-white font-bold rounded-xl hover:bg-blue-900 disabled:opacity-50 text-sm">
                  {saving ? 'Publishing…' : 'Publish Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
EOF
echo "  ✅ Announcements"

# ============================================================
# 9. ADMIN MESSAGES (reuse same pattern)
# ============================================================
cat > src/pages/admin/AdminMessages.jsx << 'EOF'
import { useState, useEffect, useRef } from 'react'
import { Send, ArrowLeft, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

function initials(n) { return n?.split(' ').filter(Boolean).slice(0,2).map(x=>x[0].toUpperCase()).join('') ?? '?' }
function timeStr(d) {
  const date=new Date(d),now=new Date(),diff=now-date
  if(diff<86400000) return date.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})
  return date.toLocaleDateString('en-IN',{day:'numeric',month:'short'})
}

export default function AdminMessages() {
  const { user } = useAuth()
  const [contacts,setContacts]=useState([])
  const [selected,setSelected]=useState(null)
  const [messages,setMessages]=useState([])
  const [text,setText]=useState('')
  const [sending,setSending]=useState(false)
  const [showList,setShowList]=useState(true)
  const bottomRef=useRef(null)

  useEffect(()=>{
    supabase.from('profiles').select('id,full_name,role').in('role',['student','teacher']).order('role').order('full_name')
      .then(({data})=>setContacts(data??[]))
  },[])

  useEffect(()=>{
    if(!selected||!user)return
    supabase.from('messages').select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selected.id}),and(sender_id.eq.${selected.id},receiver_id.eq.${user.id})`)
      .order('created_at')
      .then(({data})=>{
        setMessages(data??[])
        supabase.from('messages').update({is_read:true}).eq('receiver_id',user.id).eq('sender_id',selected.id).eq('is_read',false).then(()=>{})
      })
  },[selected,user])

  useEffect(()=>{
    if(!user)return
    const ch=supabase.channel('admin_msgs')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:`receiver_id=eq.${user.id}`},
        p=>{if(p.new.sender_id===selected?.id)setMessages(m=>[...m,p.new])})
      .subscribe()
    return ()=>supabase.removeChannel(ch)
  },[user,selected])

  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:'smooth'})},[messages])

  const send=async()=>{
    if(!text.trim()||!selected)return
    setSending(true)
    const{data,error}=await supabase.from('messages').insert({sender_id:user.id,receiver_id:selected.id,content:text.trim()}).select().single()
    if(error)toast.error(error.message)
    else{setMessages(m=>[...m,data]);setText('')}
    setSending(false)
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] lg:h-[calc(100vh-5rem)] bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className={`${showList?'flex':'hidden'} lg:flex flex-col w-full lg:w-72 border-r border-gray-100`}>
        <div className="px-4 py-3 border-b border-gray-100"><h2 className="font-bold text-gray-900">All Messages</h2></div>
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {contacts.map(c=>(
            <button key={c.id} onClick={()=>{setSelected(c);setShowList(false)}}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left ${selected?.id===c.id?'bg-blue-50':''}`}>
              <div className="w-9 h-9 rounded-full bg-blue-950 text-white text-xs font-bold flex items-center justify-center">{initials(c.full_name)}</div>
              <div><p className="font-medium text-gray-900 text-sm">{c.full_name}</p><p className="text-xs text-gray-400 capitalize">{c.role}</p></div>
            </button>
          ))}
        </div>
      </div>
      <div className={`${!showList?'flex':'hidden'} lg:flex flex-col flex-1 min-w-0`}>
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <MessageCircle className="h-12 w-12 text-gray-200 mb-3" /><p className="text-gray-500">Select a user to start messaging</p>
          </div>
        ):(
          <>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
              <button onClick={()=>setShowList(true)} className="lg:hidden p-1 text-gray-400"><ArrowLeft className="h-5 w-5"/></button>
              <div className="w-9 h-9 rounded-full bg-blue-950 text-white text-sm font-bold flex items-center justify-center">{initials(selected.full_name)}</div>
              <div><p className="font-semibold text-gray-900 text-sm">{selected.full_name}</p><p className="text-xs text-gray-400 capitalize">{selected.role}</p></div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
              {messages.length===0&&<div className="text-center text-sm text-gray-400 mt-8">No messages yet.</div>}
              {messages.map(m=>{
                const mine=m.sender_id===user.id
                return(
                  <div key={m.id} className={`flex ${mine?'justify-end':'justify-start'}`}>
                    <div className={`max-w-xs px-3.5 py-2 rounded-2xl text-sm ${mine?'bg-blue-950 text-white rounded-br-sm':'bg-gray-100 text-gray-900 rounded-bl-sm'}`}>
                      <p>{m.content}</p><p className={`text-xs mt-1 ${mine?'text-blue-300':'text-gray-400'}`}>{timeStr(m.created_at)}</p>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef}/>
            </div>
            <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100">
              <input value={text} onChange={e=>setText(e.target.value)}
                onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}}
                placeholder="Type a message…" className="flex-1 px-4 py-2 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"/>
              <button onClick={send} disabled={sending||!text.trim()} className="w-9 h-9 bg-blue-950 text-white rounded-xl flex items-center justify-center disabled:opacity-40">
                <Send className="h-4 w-4"/>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
EOF
echo "  ✅ AdminMessages"

# ============================================================
# 10. ADMIN LAYOUT
# ============================================================
cat > src/pages/admin/AdminLayout.jsx << 'EOF'
import { LayoutDashboard, Users, BookUser, CreditCard, Layers, QrCode, DollarSign, Bell, MessageCircle, BookOpen, Video } from 'lucide-react'
import DashboardShell from '../../components/layout/DashboardShell'

const NAV = [
  { label:'Dashboard',   path:'/admin/dashboard',     icon:<LayoutDashboard className="h-4 w-4"/> },
  { label:'Students',    path:'/admin/students',      icon:<Users className="h-4 w-4"/>           },
  { label:'Teachers',    path:'/admin/teachers',      icon:<BookUser className="h-4 w-4"/>        },
  { label:'Fees',        path:'/admin/fees',          icon:<CreditCard className="h-4 w-4"/>      },
  { label:'Batches',     path:'/admin/batches',       icon:<Layers className="h-4 w-4"/>          },
  { label:'Study Cards', path:'/admin/study-cards',   icon:<BookOpen className="h-4 w-4"/>        },
  { label:'Live Class',  path:'/admin/live-class',    icon:<Video className="h-4 w-4"/>           },
  { label:'QR Code',     path:'/admin/qr',            icon:<QrCode className="h-4 w-4"/>          },
  { label:'Salary',      path:'/admin/salary',        icon:<DollarSign className="h-4 w-4"/>      },
  { label:'Announce',    path:'/admin/announcements', icon:<Bell className="h-4 w-4"/>             },
  { label:'Messages',    path:'/admin/messages',      icon:<MessageCircle className="h-4 w-4"/>   },
]

export default function AdminLayout() {
  return <DashboardShell navItems={NAV} pageTitle="Admin Panel" />
}
EOF
echo "  ✅ AdminLayout"

# ============================================================
# 11. UPDATE App.jsx — full admin routes
# ============================================================
cat > src/App.jsx << 'EOF'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider }   from './context/AuthContext'
import { ProtectedRoute } from './utils/roleGuard'
import { Toaster }        from 'react-hot-toast'

import Home     from './pages/Home'
import Login    from './pages/Login'
import Register from './pages/Register'
import { NotFound, Unauthorized, AccountSuspended } from './pages/ErrorPages'

// Student
import StudentLayout        from './pages/student/StudentLayout'
import StudentDashboard     from './pages/student/StudentDashboard'
import Attendance           from './pages/student/Attendance'
import StudySection         from './pages/student/StudySection'
import StudentMessages      from './pages/student/Messages'
import PayFee               from './pages/student/PayFee'
import StudentNotifications from './pages/student/Notifications'

// Teacher
import TeacherLayout     from './pages/teacher/TeacherLayout'
import TeacherHome       from './pages/teacher/TeacherHome'
import TeacherStudyCards from './pages/teacher/StudyCards'
import TeacherLiveClass  from './pages/teacher/LiveClass'
import TeacherMessages   from './pages/teacher/Messages'
import SalaryStatus      from './pages/teacher/SalaryStatus'

// Admin
import AdminLayout       from './pages/admin/AdminLayout'
import AdminHome         from './pages/admin/AdminHome'
import StudentTracker    from './pages/admin/StudentTracker'
import TeacherManager    from './pages/admin/TeacherManager'
import FeeManager        from './pages/admin/FeeManager'
import BatchManager      from './pages/admin/BatchManager'
import QRManager         from './pages/admin/QRManager'
import SalaryManager     from './pages/admin/SalaryManager'
import Announcements     from './pages/admin/Announcements'
import AdminMessages     from './pages/admin/AdminMessages'
import AdminStudyCards   from './pages/teacher/StudyCards'
import AdminLiveClass    from './pages/teacher/LiveClass'

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" toastOptions={{
        duration:4000,
        style:{fontFamily:'Inter,system-ui,sans-serif',fontSize:'14px',borderRadius:'10px',border:'1px solid #e5e7eb'},
        success:{iconTheme:{primary:'#16a34a',secondary:'#fff'}},
        error:  {iconTheme:{primary:'#dc2626',secondary:'#fff'}},
      }}/>
      <Routes>
        {/* Public */}
        <Route path="/"                  element={<Home />}             />
        <Route path="/login"             element={<Login />}            />
        <Route path="/register"          element={<Register />}         />
        <Route path="/unauthorized"      element={<Unauthorized />}     />
        <Route path="/account-suspended" element={<AccountSuspended />} />

        {/* Student */}
        <Route element={<ProtectedRoute allowedRoles={['student']} />}>
          <Route path="/student" element={<StudentLayout />}>
            <Route path="dashboard"     element={<StudentDashboard />}     />
            <Route path="attendance"    element={<Attendance />}           />
            <Route path="study"         element={<StudySection />}         />
            <Route path="messages"      element={<StudentMessages />}      />
            <Route path="pay-fee"       element={<PayFee />}               />
            <Route path="notifications" element={<StudentNotifications />} />
          </Route>
        </Route>

        {/* Teacher */}
        <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
          <Route path="/teacher" element={<TeacherLayout />}>
            <Route path="dashboard"   element={<TeacherHome />}       />
            <Route path="study-cards" element={<TeacherStudyCards />} />
            <Route path="live-class"  element={<TeacherLiveClass />}  />
            <Route path="messages"    element={<TeacherMessages />}   />
            <Route path="salary"      element={<SalaryStatus />}      />
          </Route>
        </Route>

        {/* Admin */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="dashboard"     element={<AdminHome />}                        />
            <Route path="students"      element={<StudentTracker />}                   />
            <Route path="teachers"      element={<TeacherManager />}                   />
            <Route path="fees"          element={<FeeManager />}                       />
            <Route path="batches"       element={<BatchManager />}                     />
            <Route path="study-cards"   element={<AdminStudyCards isAdmin={true} />}  />
            <Route path="live-class"    element={<AdminLiveClass  isAdmin={true} />}  />
            <Route path="qr"            element={<QRManager />}                        />
            <Route path="salary"        element={<SalaryManager />}                    />
            <Route path="announcements" element={<Announcements />}                    />
            <Route path="messages"      element={<AdminMessages />}                    />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  )
}
EOF
echo "  ✅ App.jsx — all routes wired"

echo ""
echo "✅ Phase 5 complete! Full Admin Dashboard built."
echo ""
echo "Run:  npm run dev"
echo "Then log in as an admin to access all controls."
echo ""
echo "⚠️  For QR upload to work: create a Supabase Storage bucket"
echo "   named 'qr-codes' and set it to Public in your Supabase dashboard."
