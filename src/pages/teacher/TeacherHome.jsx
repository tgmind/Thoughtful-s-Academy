import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Video, MessageCircle, DollarSign, Lock, CheckCircle, Receipt } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

export default function TeacherHome() {
  const { user, profile } = useAuth()
  const [perms,   setPerms]   = useState(null)
  const [stats,   setStats]   = useState({ cards: 0, unread: 0, live: false })
  const [msgs,    setMsgs]    = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    Promise.all([
      supabase.from('teacher_profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('study_cards').select('id', { count: 'exact' }).eq('added_by', user.id).eq('is_active', true),
      supabase.from('messages').select('id', { count: 'exact' }).eq('receiver_id', user.id).eq('is_read', false),
      supabase.from('live_classes').select('id').eq('teacher_id', user.id).eq('is_active', true).limit(1),
      supabase.from('messages').select('*, profiles!sender_id(full_name)').eq('receiver_id', user.id).eq('is_read', false).order('created_at', { ascending: false }).limit(3),
    ]).then(([p, c, m, lc, recentMsgs]) => {
      setPerms(p.data)
      setStats({ cards: c.count ?? 0, unread: m.count ?? 0, live: (lc.data?.length ?? 0) > 0 })
      setMsgs(recentMsgs.data ?? [])
      setLoading(false)
    })
  }, [user])

  // Realtime: keep the dashboard live (unread messages + live-class status)
  useEffect(() => {
    if (!user) return
    const uid = user.id

    const refreshMessages = async () => {
      const { count } = await supabase.from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('receiver_id', uid).eq('is_read', false)
      const { data } = await supabase.from('messages')
        .select('*, profiles!sender_id(full_name)')
        .eq('receiver_id', uid).eq('is_read', false)
        .order('created_at', { ascending: false }).limit(3)
      setStats(s => ({ ...s, unread: count ?? 0 }))
      setMsgs(data ?? [])
    }
    const refreshLive = async () => {
      const { data } = await supabase.from('live_classes')
        .select('id').eq('teacher_id', uid).eq('is_active', true).limit(1)
      setStats(s => ({ ...s, live: (data?.length ?? 0) > 0 }))
    }

    const channel = supabase
      .channel(`teacher_dash_${uid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `receiver_id=eq.${uid}` }, refreshMessages)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_classes', filter: `teacher_id=eq.${uid}` }, refreshLive)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user])

  const features = [
    { key: 'study_cards',   label: 'Study Cards',    perm: perms?.can_manage_study_cards, path: '/teacher/study-cards', icon: <BookOpen className="h-5 w-5" />,    color: 'bg-blue-50 text-blue-700'   },
    { key: 'live_class',    label: 'Live Class',     perm: perms?.can_drop_live_class,    path: '/teacher/live-class',  icon: <Video className="h-5 w-5" />,        color: 'bg-red-50 text-red-700'     },
    { key: 'message',       label: 'Messages',       perm: perms?.can_message_students,   path: '/teacher/messages',    icon: <MessageCircle className="h-5 w-5" />, color: 'bg-purple-50 text-purple-700'},
    { key: 'salary',        label: 'My Salary',      perm: true,                          path: '/teacher/salary',      icon: <DollarSign className="h-5 w-5" />,   color: 'bg-green-50 text-green-700'  },
    { key: 'fee_records',   label: 'Fee Records',    perm: perms?.can_view_fee_records,   path: '/teacher/fee-records', icon: <Receipt className="h-5 w-5" />,      color: 'bg-amber-50 text-amber-700'  },
  ]

  if (loading) return <div className="py-12 text-center text-gray-400 text-sm">Loading…</div>

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Welcome */}
      <div className="bg-gradient-to-br from-blue-950 via-indigo-900 to-purple-900 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-24 h-24 rounded-full bg-amber-400/10 pointer-events-none" />
        <div className="relative">
          <p className="text-blue-300 text-sm mb-1">Welcome back 👋</p>
          <h2 className="font-display font-bold text-2xl">{profile?.full_name}</h2>
          {perms?.subject && <p className="text-blue-200 mt-0.5 text-sm">{perms.subject}</p>}
          <p className="text-blue-300/70 text-xs mt-1">{new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })}</p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
              <p className="font-bold text-xl text-blue-100">{stats.cards}</p>
              <p className="text-xs text-blue-300 mt-0.5">Study Cards</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
              <p className="font-bold text-xl text-amber-300">{stats.unread}</p>
              <p className="text-xs text-blue-300 mt-0.5">Unread Msgs</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
              <p className={`font-bold text-xl ${stats.live ? 'text-red-300 animate-pulse' : 'text-blue-300'}`}>{stats.live ? '🔴' : '—'}</p>
              <p className="text-xs text-blue-300 mt-0.5">Live Class</p>
            </div>
          </div>
        </div>
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-2 gap-3">
        {features.map(f => (
          f.perm ? (
            <Link key={f.key} to={f.path}
              className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className={`w-10 h-10 rounded-lg ${f.color} flex items-center justify-center mb-3`}>{f.icon}</div>
              <p className="font-semibold text-gray-900 text-sm">{f.label}</p>
              <div className="flex items-center gap-1 mt-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span className="text-xs text-green-600 font-medium">Enabled</span>
              </div>
            </Link>
          ) : (
            <div key={f.key} className="bg-gray-50 rounded-xl border border-gray-200 p-4 opacity-60 cursor-not-allowed">
              <div className="w-10 h-10 rounded-lg bg-gray-200 text-gray-400 flex items-center justify-center mb-3">{f.icon}</div>
              <p className="font-semibold text-gray-500 text-sm">{f.label}</p>
              <div className="flex items-center gap-1 mt-1">
                <Lock className="h-3 w-3 text-gray-400" />
                <span className="text-xs text-gray-400">Contact admin</span>
              </div>
            </div>
          )
        ))}
      </div>

      {/* Recent messages */}
      {msgs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Recent Messages</h3>
            <Link to="/teacher/messages" className="text-xs text-blue-700 font-medium hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {msgs.map(m => (
              <div key={m.id} className="px-4 py-3 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-950 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {m.profiles?.full_name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900">{m.profiles?.full_name}</p>
                  <p className="text-xs text-gray-500 truncate">{m.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Permissions summary */}
      {perms && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <h3 className="font-semibold text-gray-900 text-sm mb-3">Your Permissions</h3>
          <div className="space-y-2">
            {[
              { label: 'Manage Study Cards',   val: perms.can_manage_study_cards  },
              { label: 'Drop Live Class Links', val: perms.can_drop_live_class     },
              { label: 'Message Students',      val: perms.can_message_students    },
              { label: 'View Attendance',       val: perms.can_view_attendance     },
              { label: 'View Fee Records',      val: perms.can_view_fee_records    },
            ].map(p => (
              <div key={p.label} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{p.label}</span>
                {p.val
                  ? <span className="flex items-center gap-1 text-xs text-green-600 font-semibold"><CheckCircle className="h-3.5 w-3.5" /> Enabled</span>
                  : <span className="flex items-center gap-1 text-xs text-gray-400"><Lock className="h-3.5 w-3.5" /> Locked</span>
                }
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
