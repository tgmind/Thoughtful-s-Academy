import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Users, BookUser, CreditCard, MessageCircle, Activity, Video,
  CheckCircle, XCircle, Bell, QrCode, Layers, DollarSign,
  UserPlus, AlertTriangle, Clock, HelpCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

function timeUntil(dateStr) {
  if (!dateStr) return ''
  const diff = new Date(dateStr).getTime() - Date.now()
  if (diff <= 0) return null          // expired
  const h = Math.floor(diff / 3600000)
  if (h < 24) return `${h}h left`
  return `${Math.floor(h / 24)}d left`
}

export default function AdminHome() {
  const { user } = useAuth()
  const [stats,      setStats]      = useState({ students:0, teachers:0, pending_fees:0, unread:0, attendance_pct:0, live:0 })
  const [fees,       setFees]       = useState([])
  const [msgs,       setMsgs]       = useState([])
  const [newStudents,setNewStudents] = useState([])   // registered in last 48 h
  const [newTeachers,setNewTeachers] = useState([])   // registered in last 48 h
  const [trialExpired,setTrialExpired] = useState([]) // trial_ends_at < NOW
  const [loading,    setLoading]    = useState(true)
  const [verifying,  setVerifying]  = useState(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!user) return
      const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
      const now = new Date().toISOString()

      const [s, t, att, lc, recentFees, recentMsgs, newSt, expiredSt, newTch] = await Promise.all([
        supabase.from('profiles').select('id', { count:'exact' }).eq('role','student'),
        supabase.from('profiles').select('id', { count:'exact' }).eq('role','teacher').eq('is_active',true),
        supabase.from('attendance').select('status').eq('date', todayISO()),
        supabase.from('live_classes').select('id', { count:'exact' }).eq('is_active', true),
        supabase.from('fee_records').select('*, profiles!student_id(full_name)', { count:'exact' }).eq('status','pending').order('paid_at').limit(5),
        supabase.from('messages').select('*, profiles!sender_id(full_name, role)', { count:'exact' }).eq('receiver_id', user.id).eq('is_read', false).order('created_at', { ascending:false }).limit(5),
        supabase.from('profiles')
          .select('id, full_name, email, created_at, student_profiles(batch_id, trial_ends_at, batches(name))')
          .eq('role','student')
          .gte('created_at', fortyEightHoursAgo)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase.from('student_profiles')
          .select('id, trial_ends_at, batch_id, batches(name), profiles!id(full_name, email, is_active)')
          .not('trial_ends_at', 'is', null)
          .lt('trial_ends_at', now)
          .order('trial_ends_at', { ascending: false })
          .limit(10),
        supabase.from('profiles')
          .select('id, full_name, email, created_at, teacher_profiles(subject)')
          .eq('role','teacher')
          .gte('created_at', fortyEightHoursAgo)
          .order('created_at', { ascending: false })
          .limit(10),
      ])

      if (cancelled) return

      const attData = att.data ?? []
      const present = attData.filter(a => a.status === 'present').length
      const late    = attData.filter(a => a.status === 'late').length
      const total   = attData.length
      setStats({
        students:       s.count  ?? 0,
        teachers:       t.count  ?? 0,
        pending_fees:   recentFees.count ?? 0,
        unread:         recentMsgs.count ?? 0,
        attendance_pct: total > 0 ? Math.round(((present + late * 0.5) / total) * 100) : 0,
        live:           lc.count ?? 0,
      })
      setFees(recentFees.data ?? [])
      setMsgs(recentMsgs.data ?? [])
      setNewStudents(newSt.data ?? [])
      setTrialExpired(expiredSt.data ?? [])
      setNewTeachers(newTch.data ?? [])
      setLoading(false)
    }

    run()
    // Poll only when browser tab is visible to eliminate background query storm
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') {
        run()
      }
    }, 30000)

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !cancelled) {
        run()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      cancelled = true
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [user])

  const verifyFee = async (id, status) => {
    setVerifying(id)
    await supabase.from('fee_records').update({ status, verified_by: user.id, verified_at: new Date().toISOString() }).eq('id', id)
    setFees(f => f.filter(x => x.id !== id))
    setStats(s => ({ ...s, pending_fees: Math.max(0, s.pending_fees - 1) }))
    toast.success(status === 'verified' ? 'Fee verified ✓' : 'Fee rejected')
    setVerifying(null)
  }

  const statCards = [
    { label:'Total Students',    value: stats.students,       icon: <Users className="h-5 w-5" />,         color:'bg-blue-50 text-blue-700',    link:'/admin/students'   },
    { label:'Active Teachers',   value: stats.teachers,       icon: <BookUser className="h-5 w-5" />,      color:'bg-purple-50 text-purple-700', link:'/admin/teachers'   },
    { label:'Pending Fees',      value: stats.pending_fees,   icon: <CreditCard className="h-5 w-5" />,    color:'bg-amber-50 text-amber-700',   link:'/admin/fees'       },
    { label:'Unread Messages',   value: stats.unread,         icon: <MessageCircle className="h-5 w-5" />, color:'bg-green-50 text-green-700',   link:'/admin/messages'   },
    { label:"Today's Attendance",value:`${stats.attendance_pct}%`,icon:<Activity className="h-5 w-5" />,  color:'bg-teal-50 text-teal-700',     link:'/admin/students'   },
    { label:'Live Classes',      value: stats.live,           icon: <Video className="h-5 w-5" />,         color:'bg-red-50 text-red-700',       link:'/admin/live-class' },
  ]

  const quickActions = [
    { label:'Doubt Hub',        icon:<HelpCircle className="h-4 w-4" />,  path:'/admin/doubts',        color:'bg-amber-600 text-white'  },
    { label:'Add Notification', icon:<Bell className="h-4 w-4" />,       path:'/admin/announcements', color:'bg-blue-950 text-white'   },
    { label:'Update QR',        icon:<QrCode className="h-4 w-4" />,     path:'/admin/qr',            color:'bg-amber-500 text-white'  },
    { label:'Add Batch',        icon:<Layers className="h-4 w-4" />,     path:'/admin/batches',       color:'bg-green-600 text-white'  },
    { label:'Pay Salary',       icon:<DollarSign className="h-4 w-4" />, path:'/admin/salary',        color:'bg-purple-600 text-white' },
  ]

  if (loading) {
    return (
      <div className="space-y-6 pb-20 lg:pb-0 animate-pulse">
        <div className="bg-slate-200/80 rounded-3xl h-36 w-full" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 h-24" />
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4 h-20" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 h-64" />
          <div className="bg-white rounded-2xl border border-slate-100 p-6 h-64" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0">

      {/* ── Stats grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {statCards.map(s => (
          <Link key={s.label} to={s.link}
            className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md hover:-translate-y-1 transition-all duration-200 group">
            <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200`}>{s.icon}</div>
            <p className="font-display font-bold text-2xl text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </Link>
        ))}
      </div>

      {/* ── Quick actions ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {quickActions.map(a => (
          <Link key={a.label} to={a.path}
            className={`${a.color} rounded-xl p-3.5 flex items-center gap-2.5 font-semibold text-sm hover:opacity-90 hover:-translate-y-0.5 transition-all shadow-sm`}>
            {a.icon} {a.label}
          </Link>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════
          NEW STUDENTS ALERT — last 48 hours
      ══════════════════════════════════════════════════════ */}
      {newStudents.length > 0 && (
        <div className="bg-white rounded-xl border border-emerald-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-emerald-100 bg-emerald-50/60">
            <div className="flex items-center gap-2">
              <div className="relative">
                <UserPlus className="h-4 w-4 text-emerald-700" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              </div>
              <h3 className="font-semibold text-emerald-900 text-sm">
                New Students ({newStudents.length})
                <span className="ml-1.5 font-normal text-emerald-600 text-xs">last 48 hrs</span>
              </h3>
            </div>
            <Link to="/admin/students" className="text-xs text-emerald-700 font-medium hover:underline">View all →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {newStudents.slice(0, 5).map(s => {
              const sp = (Array.isArray(s.student_profiles) ? s.student_profiles[0] : s.student_profiles) ?? {}
              const batchName = sp.batches?.name ?? '—'
              const trialLeft = timeUntil(sp.trial_ends_at)
              return (
                <div key={s.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {s.full_name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{s.full_name}</p>
                    <p className="text-xs text-gray-500 truncate">{batchName} · {timeAgo(s.created_at)}</p>
                  </div>
                  {trialLeft && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex-shrink-0">
                      <Clock className="h-3 w-3" />{trialLeft}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          NEW TEACHERS ALERT — last 48 hours
      ══════════════════════════════════════════════════════ */}
      {newTeachers.length > 0 && (
        <div className="bg-white rounded-xl border border-purple-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-purple-100 bg-purple-50/60">
            <div className="flex items-center gap-2">
              <div className="relative">
                <UserPlus className="h-4 w-4 text-purple-700" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
              </div>
              <h3 className="font-semibold text-purple-900 text-sm">
                New Teachers ({newTeachers.length})
                <span className="ml-1.5 font-normal text-purple-600 text-xs">last 48 hrs</span>
              </h3>
            </div>
            <Link to="/admin/teachers" className="text-xs text-purple-700 font-medium hover:underline">View all →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {newTeachers.slice(0, 5).map(t => {
              const tp = (Array.isArray(t.teacher_profiles) ? t.teacher_profiles[0] : t.teacher_profiles) ?? {}
              const subjectName = tp.subject || '—'
              return (
                <div key={t.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {t.full_name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{t.full_name}</p>
                    <p className="text-xs text-gray-500 truncate">{subjectName} · {timeAgo(t.created_at)}</p>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-black text-purple-700 bg-purple-100 rounded-full border border-purple-200 uppercase tracking-wider shrink-0 shadow-2xs">
                    NEW TEACHER
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
      {trialExpired.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-amber-100 bg-amber-50/60">
            <div className="flex items-center gap-2">
              <div className="relative">
                <AlertTriangle className="h-4 w-4 text-amber-700" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              </div>
              <h3 className="font-semibold text-amber-900 text-sm">
                Free Trial Expired ({trialExpired.length})
                <span className="ml-1.5 font-normal text-amber-600 text-xs">action needed</span>
              </h3>
            </div>
            <Link to="/admin/students" className="text-xs text-amber-700 font-medium hover:underline">Manage →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {trialExpired.slice(0, 5).map(sp => {
              const p = sp.profiles ?? {}
              const batchName = sp.batches?.name ?? '—'
              return (
                <div key={sp.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {p.full_name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{p.full_name}</p>
                    <p className="text-xs text-gray-500 truncate">{batchName} · expired {timeAgo(sp.trial_ends_at)}</p>
                  </div>
                  <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap">
                    Trial Over
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Pending fees + Recent messages ── */}
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
                  <Link to={`/admin/messages?contact=${m.sender_id}`} className="text-xs text-blue-700 font-medium flex-shrink-0 hover:underline">Reply</Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
