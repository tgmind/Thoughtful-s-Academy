import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, ClipboardList, Bell, CreditCard, MessageCircle, CalendarCheck, CheckCircle, Clock, XCircle, X, Trash2, Video } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function StudentDashboard() {
  const { profile, user } = useAuth()
  const [stats, setStats] = useState({ present: 0, absent: 0, pending_fees: 0, unread: 0, live: false })
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPopup, setShowPopup]   = useState(false)
  const [confirm,   setConfirm]     = useState(null)
  const [marking,   setMarking]     = useState(null)
  const [clearing,  setClearing]    = useState(false)
  const batchIdRef = useRef(null)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const [attRes, feeRes, msgRes, todayRes, spRes] = await Promise.all([
        supabase.from('attendance').select('status').eq('student_id', user.id),
        supabase.from('fee_records').select('id').eq('student_id', user.id).eq('status', 'pending'),
        supabase.from('messages').select('id').eq('receiver_id', user.id).eq('is_read', false),
        supabase.from('attendance').select('id').eq('student_id', user.id).eq('date', todayISO()).maybeSingle(),
        supabase.from('student_profiles').select('batch_id').eq('id', user.id).maybeSingle(),
      ])
      const batchId = spRes.data?.batch_id ?? null
      batchIdRef.current = batchId
      let notifQ = supabase.from('notifications').select('id, title, body, type, created_at')
        .eq('is_active', true).or('target_role.eq.student,target_role.eq.all')
        .order('created_at', { ascending: false }).limit(5)
      if (batchId) notifQ = notifQ.or(`target_batch_id.is.null,target_batch_id.eq.${batchId}`)
      else         notifQ = notifQ.is('target_batch_id', null)
      let liveQ = supabase.from('live_classes').select('id').eq('is_active', true).limit(1)
      if (batchId) liveQ = liveQ.or(`batch_id.is.null,batch_id.eq.${batchId}`)
      const [notifRes, readRes, liveRes] = await Promise.all([
        notifQ,
        supabase.from('notification_reads').select('notification_id').eq('user_id', user.id),
        liveQ,
      ])
      const readSet = new Set((readRes.data ?? []).map(r => r.notification_id))
      const att = attRes.data ?? []
      setStats({
        present: att.filter(a => a.status === 'present').length,
        absent:  att.filter(a => a.status === 'absent').length,
        pending_fees: feeRes.data?.length ?? 0,
        unread:  msgRes.data?.length ?? 0,
        live:    (liveRes.data?.length ?? 0) > 0,
      })
      setNotifications((notifRes.data ?? []).filter(n => !readSet.has(n.id)))
      if (!todayRes.data) setShowPopup(true)
      setLoading(false)
    }
    load()
  }, [user])

  // Realtime: keep dashboard live without refresh (live class, messages, fees, announcements)
  useEffect(() => {
    if (!user) return
    const uid = user.id

    const refreshLive = async () => {
      let q = supabase.from('live_classes').select('id').eq('is_active', true).limit(1)
      if (batchIdRef.current) q = q.or(`batch_id.is.null,batch_id.eq.${batchIdRef.current}`)
      const { data } = await q
      setStats(s => ({ ...s, live: (data?.length ?? 0) > 0 }))
    }
    const refreshUnread = async () => {
      const { count } = await supabase.from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('receiver_id', uid).eq('is_read', false)
      setStats(s => ({ ...s, unread: count ?? 0 }))
    }
    const refreshFees = async () => {
      const { count } = await supabase.from('fee_records')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', uid).eq('status', 'pending')
      setStats(s => ({ ...s, pending_fees: count ?? 0 }))
    }

    const channel = supabase
      .channel(`student_dash_${uid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_classes' }, refreshLive)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `receiver_id=eq.${uid}` }, refreshUnread)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fee_records', filter: `student_id=eq.${uid}` }, refreshFees)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        const n = payload.new
        if (!n.is_active) return
        const now = new Date()
        if (n.scheduled_at && new Date(n.scheduled_at) > now) return
        if (n.expires_at   && new Date(n.expires_at)   < now) return
        if (n.target_role !== 'all' && n.target_role !== 'student') return
        if (n.target_batch_id && batchIdRef.current !== n.target_batch_id) return
        setNotifications(prev => prev.some(x => x.id === n.id) ? prev : [n, ...prev].slice(0, 5))
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user])

  const markAttendance = async (status) => {
    setMarking(status)
    const { data, error } = await supabase.from('attendance').insert({
      student_id: user.id, date: todayISO(), status, marked_by: user.id,
    }).select().single()
    if (error) {
      if (error.code === '23505') {
        toast.error('Attendance already marked for today.')
      } else {
        toast.error(error.message)
      }
    } else {
      toast.success(`Marked as ${data.status}!`)
      setStats(s => ({ ...s, present: s.present + (data.status === 'present' ? 1 : 0), absent: s.absent + (data.status === 'absent' ? 1 : 0) }))
      setShowPopup(false)
    }
    setConfirm(null)
    setMarking(null)
  }

  const clearNotifications = async () => {
    if (!notifications.length) return
    setClearing(true)
    await supabase.from('notification_reads').upsert(
      notifications.map(n => ({ user_id: user.id, notification_id: n.id })),
      { onConflict: 'user_id,notification_id', ignoreDuplicates: true }
    )
    setNotifications([])
    setClearing(false)
    toast.success('Notifications cleared')
  }

  const pct = stats.present + stats.absent > 0
    ? Math.round((stats.present / (stats.present + stats.absent)) * 100) : 0

  const quickLinks = [
    { label: 'Attendance',    path: '/student/attendance',    icon: <CalendarCheck className="h-6 w-6" />, color: 'bg-green-50 text-green-700',  desc: loading ? '…' : `${pct}% this year` },
    { label: 'Study',         path: '/student/study',         icon: <BookOpen className="h-6 w-6" />,      color: 'bg-blue-50 text-blue-700',    desc: 'Lectures & notes' },
    { label: 'Homework',      path: '/student/homework',      icon: <ClipboardList className="h-6 w-6" />,  color: 'bg-indigo-50 text-indigo-700', desc: 'Assignments & grades' },
    { label: 'Live Class',    path: '/student/live-class',    icon: <Video className="h-6 w-6" />,          color: 'bg-red-50 text-red-700',      desc: loading ? '…' : stats.live ? '🔴 Class in progress' : 'No class right now' },
    { label: 'Messages',      path: '/student/messages',      icon: <MessageCircle className="h-6 w-6" />, color: 'bg-purple-50 text-purple-700', desc: loading ? '…' : stats.unread > 0 ? `${stats.unread} unread` : 'All caught up' },
    { label: 'Pay Fee',       path: '/student/pay-fee',       icon: <CreditCard className="h-6 w-6" />,    color: 'bg-amber-50 text-amber-700',  desc: loading ? '…' : stats.pending_fees > 0 ? `${stats.pending_fees} pending` : 'All clear' },
    { label: 'Notifications', path: '/student/notifications', icon: <Bell className="h-6 w-6" />,          color: 'bg-red-50 text-red-700',      desc: 'Announcements' },
  ]

  const dateLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6 pb-20 lg:pb-0">

      {/* ── Attendance popup ── */}
      {showPopup && !loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[50%] min-w-[320px] p-8">

            {/* close */}
            <button
              onClick={() => setShowPopup(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {/* header */}
            <div className="flex items-center gap-3 mb-1">
              <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
                <CalendarCheck className="h-6 w-6 text-blue-950" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Mark Today's Attendance</h2>
                <p className="text-sm text-gray-500">{dateLabel}</p>
              </div>
            </div>

            <div className="mt-6">
              {confirm ? (
                <div className="bg-gray-50 rounded-xl p-5 text-center">
                  <p className="font-medium text-gray-900 mb-4">
                    Mark yourself as <span className="capitalize font-bold">{confirm}</span> today?
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => markAttendance(confirm)}
                      disabled={!!marking}
                      className="px-8 py-2.5 bg-blue-950 text-white font-semibold rounded-lg hover:bg-blue-900 disabled:opacity-50 transition-colors"
                    >
                      {marking ? 'Saving…' : 'Confirm'}
                    </button>
                    <button
                      onClick={() => setConfirm(null)}
                      className="px-8 py-2.5 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      Back
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  <button
                    onClick={() => setConfirm('present')}
                    className="flex flex-col items-center gap-2 p-5 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl font-semibold transition-colors border-2 border-transparent hover:border-green-300"
                  >
                    <CheckCircle className="h-8 w-8" />
                    <span>Present</span>
                  </button>
                  <button
                    onClick={() => setConfirm('late')}
                    className="flex flex-col items-center gap-2 p-5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl font-semibold transition-colors border-2 border-transparent hover:border-amber-300"
                  >
                    <Clock className="h-8 w-8" />
                    <span>Late</span>
                  </button>
                  <button
                    onClick={() => setConfirm('absent')}
                    className="flex flex-col items-center gap-2 p-5 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl font-semibold transition-colors border-2 border-transparent hover:border-red-300"
                  >
                    <XCircle className="h-8 w-8" />
                    <span>Absent</span>
                  </button>
                </div>
              )}
            </div>

            <p className="text-center text-xs text-gray-400 mt-5">You can always update this from the Attendance section</p>
          </div>
        </div>
      )}
      {/* Welcome */}
      <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-32 h-32 rounded-full bg-amber-400/10 pointer-events-none" />
        <div className="relative">
          <p className="text-blue-300 text-sm mb-1">Welcome back 👋</p>
          <h2 className="font-display font-bold text-2xl">{profile?.full_name}</h2>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
              {loading
                ? <div className="h-7 w-12 bg-white/20 rounded mx-auto animate-pulse" />
                : <p className={`text-2xl font-bold ${pct >= 75 ? 'text-green-300' : pct >= 50 ? 'text-amber-300' : 'text-red-300'}`}>{pct}%</p>
              }
              <p className="text-xs text-blue-200 mt-0.5">Attendance</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
              {loading
                ? <div className="h-7 w-8 bg-white/20 rounded mx-auto animate-pulse" />
                : <p className="text-2xl font-bold text-green-300">{stats.present}</p>
              }
              <p className="text-xs text-blue-200 mt-0.5">Present</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
              {loading
                ? <div className="h-7 w-8 bg-white/20 rounded mx-auto animate-pulse" />
                : <p className="text-2xl font-bold text-red-300">{stats.absent}</p>
              }
              <p className="text-xs text-blue-200 mt-0.5">Absent</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {quickLinks.map(q => (
          <Link key={q.path} to={q.path}
            className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md hover:-translate-y-1 transition-all duration-200 group">
            <div className={`w-11 h-11 rounded-xl ${q.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200`}>
              {q.icon}
            </div>
            <p className="font-semibold text-gray-900 text-sm">{q.label}</p>
            <p className="text-xs text-gray-400 mt-0.5 leading-snug">{q.desc}</p>
          </Link>
        ))}
      </div>

      {/* Recent notifications */}
      {notifications.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Recent Announcements</h3>
            <div className="flex items-center gap-3">
              <button onClick={clearNotifications} disabled={clearing}
                className="flex items-center gap-1 text-xs text-red-500 font-medium hover:text-red-700 disabled:opacity-40 transition-colors">
                <Trash2 className="h-3.5 w-3.5" />{clearing ? 'Clearing…' : 'Clear all'}
              </button>
              <Link to="/student/notifications" className="text-xs text-blue-700 font-medium hover:underline">View all</Link>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {notifications.map(n => (
              <div key={n.id} className="px-4 py-3">
                <p className="text-sm font-medium text-gray-900">{n.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{n.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
