import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen,
  ClipboardList,
  Bell,
  CreditCard,
  MessageCircle,
  CalendarCheck,
  CheckCircle,
  Clock,
  XCircle,
  X,
  Trash2,
  Video,
  ArrowRight,
  AlertCircle,
} from 'lucide-react'
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
  const [recentHomework, setRecentHomework] = useState([])
  const [recentStudyCards, setRecentStudyCards] = useState([])
  const [liveClassData, setLiveClassData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showPopup, setShowPopup]   = useState(false)
  const [confirm,   setConfirm]     = useState(null)
  const [marking,   setMarking]     = useState(null)
  const [clearing,  setClearing]    = useState(false)
  const [liveDismissed, setLiveDismissed] = useState(false)
  const [trialEndsAt, setTrialEndsAt] = useState(null)
  const [trialBannerDismissed, setTrialBannerDismissed] = useState(false)
  const batchIdRef = useRef(null)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const [attRes, feeRes, msgRes, todayRes, spRes] = await Promise.all([
        supabase.from('attendance').select('status').eq('student_id', user.id),
        supabase.from('fee_records').select('id, amount').eq('student_id', user.id).eq('status', 'pending'),
        supabase.from('messages').select('id').eq('receiver_id', user.id).eq('is_read', false),
        supabase.from('attendance').select('id').eq('student_id', user.id).eq('date', todayISO()).maybeSingle(),
        supabase.from('student_profiles').select('batch_id, trial_ends_at').eq('id', user.id).maybeSingle(),
      ])
      const batchId = spRes.data?.batch_id ?? null
      batchIdRef.current = batchId
      setTrialEndsAt(spRes.data?.trial_ends_at ?? null)

      let notifQ = supabase.from('notifications').select('id, title, body, type, created_at')
        .eq('is_active', true).or('target_role.eq.student,target_role.eq.all')
        .order('created_at', { ascending: false }).limit(5)
      if (batchId) notifQ = notifQ.or(`target_batch_id.is.null,target_batch_id.eq.${batchId}`)
      else         notifQ = notifQ.is('target_batch_id', null)

      let liveQ = supabase.from('live_classes').select('id, title').eq('is_active', true).order('created_at', { ascending: false }).limit(1)
      if (batchId) liveQ = liveQ.or(`batch_id.is.null,batch_id.eq.${batchId}`)
      else         liveQ = liveQ.is('batch_id', null)

      let hwQ = batchId
        ? supabase.from('homework').select('id, title, due_date, created_at').eq('batch_id', batchId).eq('is_active', true).order('created_at', { ascending: false }).limit(3)
        : Promise.resolve({ data: [] })

      let studyQ = batchId
        ? supabase.from('study_cards').select('id, title, subject, type, created_at').or(`batch_ids.cs.{${batchId}},batch_id.eq.${batchId}`).eq('is_active', true).order('created_at', { ascending: false }).limit(3)
        : Promise.resolve({ data: [] })

      const [notifRes, readRes, liveRes, hwRes, studyRes] = await Promise.all([
        notifQ,
        supabase.from('notification_reads').select('notification_id').eq('user_id', user.id),
        liveQ,
        hwQ,
        studyQ,
      ])

      const readSet = new Set((readRes.data ?? []).map(r => r.notification_id))
      const att = attRes.data ?? []
      const activeLive = liveRes.data?.[0] ?? null
      setLiveClassData(activeLive)

      setStats({
        present: att.filter(a => a.status === 'present').length,
        late:    att.filter(a => a.status === 'late').length,
        absent:  att.filter(a => a.status === 'absent').length,
        pending_fees: feeRes.data?.length ?? 0,
        unread:  msgRes.data?.length ?? 0,
        live:    !!activeLive,
      })

      setNotifications((notifRes.data ?? []).filter(n => !readSet.has(n.id)))
      setRecentHomework(hwRes.data ?? [])
      setRecentStudyCards(studyRes.data ?? [])

      if (!todayRes.data) setShowPopup(true)
      setLoading(false)
    }
    load()
  }, [user])

  // Realtime + Fast 4s Polling Fallback: keep dashboard 100% updated instantly without page refresh
  useEffect(() => {
    if (!user) return
    const uid = user.id

    const fetchAllDynamicData = async () => {
      let bId = batchIdRef.current
      if (!bId && uid) {
        const { data: spData } = await supabase.from('student_profiles').select('batch_id').eq('id', uid).maybeSingle()
        bId = spData?.batch_id ?? null
        batchIdRef.current = bId
      }
      let liveQ = supabase.from('live_classes').select('id, title').eq('is_active', true).order('created_at', { ascending: false }).limit(1)
      if (bId) liveQ = liveQ.or(`batch_id.is.null,batch_id.eq.${bId}`)
      else     liveQ = liveQ.is('batch_id', null)

      let hwQ = bId
        ? supabase.from('homework').select('id, title, due_date, created_at').eq('batch_id', bId).eq('is_active', true).order('created_at', { ascending: false }).limit(3)
        : Promise.resolve({ data: [] })

      let studyQ = bId
        ? supabase.from('study_cards').select('id, title, subject, type, created_at').or(`batch_ids.cs.{${bId}},batch_id.eq.${bId}`).eq('is_active', true).order('created_at', { ascending: false }).limit(3)
        : Promise.resolve({ data: [] })

      const [liveRes, hwRes, studyRes] = await Promise.all([liveQ, hwQ, studyQ])

      const curLive = liveRes.data?.[0] ?? null
      setLiveClassData(curLive)
      setStats(s => ({ ...s, live: !!curLive }))
      if (!curLive) setLiveDismissed(false)

      setRecentHomework(hwRes.data ?? [])
      setRecentStudyCards(studyRes.data ?? [])
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
      .channel(`student_dash_sync_${uid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_classes' }, fetchAllDynamicData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'homework' }, fetchAllDynamicData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'study_cards' }, fetchAllDynamicData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `receiver_id=eq.${uid}` }, refreshUnread)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fee_records', filter: `student_id=eq.${uid}` }, refreshFees)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, async () => {
        const bId = batchIdRef.current
        let notifQ = supabase.from('notifications').select('id, title, body, type, created_at')
          .eq('is_active', true).or('target_role.eq.student,target_role.eq.all')
          .order('created_at', { ascending: false }).limit(5)
        if (bId) notifQ = notifQ.or(`target_batch_id.is.null,target_batch_id.eq.${bId}`)
        else     notifQ = notifQ.is('target_batch_id', null)

        const [notifRes, readRes] = await Promise.all([
          notifQ,
          supabase.from('notification_reads').select('notification_id').eq('user_id', uid)
        ])
        const readSet = new Set((readRes.data ?? []).map(r => r.notification_id))
        setNotifications((notifRes.data ?? []).filter(n => !readSet.has(n.id)))
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          fetchAllDynamicData()
        }
      })

    // Background 4-second fast sync polling fallback
    const interval = setInterval(fetchAllDynamicData, 4000)

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
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
      setStats(s => ({
        ...s,
        present: s.present + (data.status === 'present' ? 1 : 0),
        late:    (s.late || 0) + (data.status === 'late' ? 1 : 0),
        absent:  s.absent + (data.status === 'absent' ? 1 : 0)
      }))
    }
    // Always close the popup, even on duplicate error
    setShowPopup(false)
    setConfirm(null)
    setMarking(null)
  }

  const clearNotifications = async () => {
    if (!notifications.length) return
    setClearing(true)
    const { error } = await supabase.from('notification_reads').upsert(
      notifications.map(n => ({ user_id: user.id, notification_id: n.id })),
      { onConflict: 'user_id,notification_id', ignoreDuplicates: true }
    )
    if (error) {
      toast.error(error.message)
      setClearing(false)
      return
    }
    setNotifications([])
    setClearing(false)
    toast.success('Notifications cleared')
  }

  const totalClasses = stats.present + (stats.late || 0) + stats.absent
  const pct = totalClasses > 0 ? Math.round(((stats.present + (stats.late || 0) * 0.5) / totalClasses) * 100) : 0

  const quickLinks = [
    { label: 'Attendance',    path: '/student/attendance',    icon: <CalendarCheck className="h-6 w-6" />, color: 'bg-green-50 text-green-700',  desc: loading ? '…' : totalClasses > 0 ? `${pct}% this year` : 'No records yet' },
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

      {/* ── Free Trial Banner ── */}
      {(() => {
        if (!trialEndsAt) return null
        const msLeft = new Date(trialEndsAt) - Date.now()
        const expired = msLeft <= 0

        if (expired) {
          return (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-red-800 text-sm">Your free trial has ended</p>
                <p className="text-xs text-red-700 mt-0.5">
                  Your 2-day access has expired. Please contact your admin to continue accessing batch content.
                </p>
              </div>
            </div>
          )
        }

        if (trialBannerDismissed) return null

        const hoursLeft = Math.floor(msLeft / 3600000)
        const timeLabel = hoursLeft < 24 ? `${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}` : `${Math.floor(hoursLeft / 24)} day${Math.floor(hoursLeft / 24) !== 1 ? 's' : ''}`

        return (
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-start gap-3">
            <Clock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-amber-900 text-sm">Free trial active — {timeLabel} remaining</p>
              <p className="text-xs text-amber-800 mt-0.5">
                Enjoy full access to your batch for now. Contact your admin to continue after your trial ends.
              </p>
            </div>
            <button onClick={() => setTrialBannerDismissed(true)} className="text-amber-500 hover:text-amber-700 flex-shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })()}

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
                <h2 className="text-lg font-bold text-gray-900">Mark Today&apos;s Attendance</h2>
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

      {/* ── Live Class Alert Bar (Responsive Flex Layout with Teacher Title) ── */}
      {liveClassData && !liveDismissed && (
        <div className="relative bg-gradient-to-r from-red-600 to-rose-600 rounded-2xl p-4 sm:p-5 text-white shadow-md border border-red-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 animate-pulse">
          {/* Top Right Dismiss Button */}
          <button
            onClick={() => setLiveDismissed(true)}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors z-10"
            title="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Content Box */}
          <div className="flex items-start sm:items-center gap-3 pr-8 sm:pr-0 min-w-0 flex-1">
            <div className="p-2.5 bg-white/20 rounded-xl text-white shrink-0 mt-0.5 sm:mt-0">
              <Video className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/25 text-white px-2 py-0.5 rounded-md whitespace-nowrap">
                  🔴 LIVE NOW
                </span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-white leading-tight break-words truncate">
                {liveClassData.title || 'Interactive Live Class'}
              </h3>
            </div>
          </div>

          {/* CTA Button */}
          <Link
            to="/student/live-class"
            className="w-full sm:w-auto text-center px-4 py-2.5 bg-white text-red-700 text-xs font-black rounded-xl hover:bg-red-50 transition-all shrink-0 shadow-sm flex items-center justify-center gap-1.5"
          >
            <span>Join Live Class</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* ── Pending Fee Alert Bar (if fee pending) ── */}
      {!loading && stats.pending_fees > 0 && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 text-amber-900 shadow-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-200/60 rounded-xl text-amber-800">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-amber-200/60 text-amber-900 px-2 py-0.5 rounded-md">
                PAYMENT ALERT
              </span>
              <p className="text-xs font-bold text-amber-900 mt-0.5">
                You have {stats.pending_fees} pending fee {stats.pending_fees === 1 ? 'record' : 'records'}. Please complete payment.
              </p>
            </div>
          </div>
          <Link
            to="/student/pay-fee"
            className="px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-xl hover:bg-amber-700 transition-colors shrink-0 shadow-sm"
          >
            Pay Fee →
          </Link>
        </div>
      )}

      {/* Welcome */}
      <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-32 h-32 rounded-full bg-amber-400/10 pointer-events-none" />
        <div className="relative">
          <p className="text-blue-300 text-sm mb-1">Welcome back 👋</p>
          <h2 className="font-display font-bold text-2xl">{profile?.full_name || 'Student'}</h2>
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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-4">
        {quickLinks.map(q => {
          const isLiveTile = q.label === 'Live Class' && stats.live
          return (
            <Link
              key={q.path}
              to={q.path}
              className={`rounded-2xl border p-4 transition-all duration-300 group flex flex-col justify-between h-full min-w-0 ${
                isLiveTile
                  ? 'bg-rose-50/90 border-rose-200 shadow-sm hover:bg-rose-100/90 hover:-translate-y-1'
                  : 'bg-white border-gray-100 hover:shadow-md hover:-translate-y-1'
              }`}
            >
              <div>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200 ${
                  isLiveTile ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/30' : q.color
                }`}>
                  {q.icon}
                </div>
                <p className={`font-bold text-xs sm:text-sm truncate ${isLiveTile ? 'text-rose-950' : 'text-gray-900'}`}>{q.label}</p>
                <p className={`text-[11px] sm:text-xs mt-0.5 leading-snug line-clamp-2 ${isLiveTile ? 'text-rose-700 font-semibold' : 'text-gray-500'}`}>{q.desc}</p>
              </div>
            </Link>
          )
        })}
      </div>

      {/* ── BENEFICIAL BACKEND WIDGETS SECTION ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* 📝 Active Homework & Assignments Widget */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg">
                <ClipboardList className="h-4 w-4" />
              </span>
              <h3 className="font-bold text-gray-900 text-sm">Active Assignments</h3>
            </div>
            <Link to="/student/homework" className="text-xs text-indigo-700 font-medium hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-2 py-2">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : recentHomework.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-xs">
              No active homework assigned currently.
            </div>
          ) : (
            <div className="space-y-2">
              {recentHomework.map(hw => {
                const isOverdue = hw.due_date ? new Date(hw.due_date) < new Date(todayISO()) : false
                return (
                  <Link
                    key={hw.id}
                    to={`/student/homework?id=${hw.id}`}
                    className="p-3 bg-gray-50/80 hover:bg-indigo-50/80 hover:border-indigo-200 transition-all rounded-xl border border-gray-100 flex items-center justify-between gap-3 group cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-indigo-700 uppercase bg-indigo-50 px-2 py-0.5 rounded-md group-hover:bg-indigo-100">
                          Assignment
                        </span>
                        {isOverdue && (
                          <span className="text-[9px] font-black uppercase tracking-wider text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200/60">
                            Overdue
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-gray-900 mt-1 truncate group-hover:text-indigo-950">{hw.title}</p>
                    </div>
                    {hw.due_date && (
                      <span className={`text-[10px] shrink-0 font-medium px-2 py-1 rounded-md border flex items-center gap-1 transition-colors ${
                        isOverdue
                          ? 'bg-red-50 text-red-700 border-red-200 group-hover:bg-red-600 group-hover:text-white group-hover:border-red-600'
                          : 'bg-white text-gray-500 border-gray-100 group-hover:bg-indigo-950 group-hover:text-amber-400 group-hover:border-indigo-950'
                      }`}>
                        Due {new Date(hw.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        <ArrowRight className="h-3 w-3" />
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* 📚 Recent Study Uploads Widget */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
                <BookOpen className="h-4 w-4" />
              </span>
              <h3 className="font-bold text-gray-900 text-sm">Recent Batch Materials</h3>
            </div>
            <Link to="/student/study" className="text-xs text-blue-700 font-medium hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-2 py-2">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : recentStudyCards.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-xs">
              No study cards uploaded for your batch yet.
            </div>
          ) : (
            <div className="space-y-2">
              {recentStudyCards.map(sc => (
                <Link
                  key={sc.id}
                  to={`/student/study?subject=${encodeURIComponent(sc.subject || '')}&cardId=${sc.id}`}
                  className="p-3 bg-gray-50/80 hover:bg-blue-50/80 hover:border-blue-200 transition-all rounded-xl border border-gray-100 flex items-center justify-between gap-3 group cursor-pointer"
                >
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-blue-700 uppercase bg-blue-50 px-2 py-0.5 rounded-md group-hover:bg-blue-100">
                      {sc.subject || 'General'}
                    </span>
                    <p className="text-xs font-semibold text-gray-900 mt-1 truncate group-hover:text-blue-950">{sc.title}</p>
                  </div>
                  <span className="text-[10px] text-gray-500 font-medium bg-white px-2 py-1 rounded-md border border-gray-100 shrink-0 flex items-center gap-1 group-hover:bg-blue-950 group-hover:text-amber-400 group-hover:border-blue-950 transition-colors">
                    {sc.type === 'youtube_video' || sc.type === 'youtube_playlist' ? '🎥 Video' : sc.type === 'google_drive' ? '📁 Notes' : '🔗 Link'}
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

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
                <p className="text-xs text-gray-600 mt-1 leading-relaxed whitespace-pre-line">{n.body}</p>
              </div>
            ))}

          </div>
        </div>
      )}
    </div>
  )
}
