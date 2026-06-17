import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Users, BookUser, CreditCard, MessageCircle, Activity, Video, CheckCircle, XCircle, Bell, QrCode, Layers, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

function todayISO() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }

export default function AdminHome() {
  const { user } = useAuth()
  const [stats,    setStats]    = useState({ students:0, teachers:0, pending_fees:0, unread:0, attendance_pct:0, live:0 })
  const [fees,     setFees]     = useState([])
  const [msgs,     setMsgs]     = useState([])
  const [loading,  setLoading]  = useState(true)
  const [verifying,setVerifying]= useState(null)

  const load = useCallback(async () => {
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
    const late    = attData.filter(a => a.status === 'late').length
    const total   = attData.length
    setStats({
      students:      s.count   ?? 0,
      teachers:      t.count   ?? 0,
      pending_fees:  pf.count  ?? 0,
      unread:        um.count  ?? 0,
      attendance_pct: total > 0 ? Math.round(((present + late * 0.5) / total) * 100) : 0,
      live:          lc.count  ?? 0,
    })
    setFees(recentFees.data ?? [])
    setMsgs(recentMsgs.data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])
  // Refresh every 30 seconds
  useEffect(() => { const id = setInterval(load, 30000); return () => clearInterval(id) }, [load])

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
            className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md hover:-translate-y-1 transition-all duration-200 group">
            <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200`}>{s.icon}</div>
            <p className="font-display font-bold text-2xl text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {quickActions.map(a => (
          <Link key={a.label} to={a.path}
            className={`${a.color} rounded-xl p-3.5 flex items-center gap-2.5 font-semibold text-sm hover:opacity-90 hover:-translate-y-0.5 transition-all shadow-sm`}>
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
