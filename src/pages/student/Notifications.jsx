import { useState, useEffect, useRef } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const TYPE_STYLES = {
  fee:          { color: 'border-l-amber-400',  bg: 'bg-amber-50',  label: 'Fee',          icon: '💰' },
  live_class:   { color: 'border-l-red-500',    bg: 'bg-red-50',    label: 'Live Class',   icon: '🔴' },
  announcement: { color: 'border-l-blue-500',   bg: 'bg-blue-50',   label: 'Announcement', icon: '📢' },
  homework:     { color: 'border-l-purple-500', bg: 'bg-purple-50', label: 'Homework',     icon: '📝' },
  general:      { color: 'border-l-gray-400',   bg: 'bg-white',     label: 'Notice',       icon: '📌' },
}

const FILTER_ORDER = ['all', 'announcement', 'homework', 'fee', 'live_class', 'general']

function groupByDate(items) {
  const groups = {}
  const now = new Date()
  items.forEach(n => {
    const d = new Date(n.created_at)
    const diffDays = Math.floor((now - d) / 86400000)
    const key = diffDays === 0 ? 'Today' : diffDays === 1 ? 'Yesterday' : diffDays < 7 ? 'This Week' : 'Earlier'
    if (!groups[key]) groups[key] = []
    groups[key].push(n)
  })
  return groups
}

export default function Notifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [readIds,       setReadIds]       = useState(new Set())
  const [loading,       setLoading]       = useState(true)
  const [filter,        setFilter]        = useState('all')
  const batchIdRef = useRef(null)

  useEffect(() => {
    if (!user) return
    const now = new Date().toISOString()

    supabase.from('student_profiles').select('batch_id').eq('id', user.id).maybeSingle()
      .then(async ({ data: profile }) => {
        const batchId = profile?.batch_id ?? null
        batchIdRef.current = batchId

        let q = supabase.from('notifications').select('*')
          .eq('is_active', true)
          .or('target_role.eq.student,target_role.eq.all')
          .or('scheduled_at.is.null,scheduled_at.lte.' + now)
          .or('expires_at.is.null,expires_at.gte.' + now)
          // 👇 Include notifications targeted directly at this specific student
          .or(`target_user_id.is.null,target_user_id.eq.${user.id}`)
          .order('created_at', { ascending: false })

        if (batchId) {
          q = q.or(`target_batch_id.is.null,target_batch_id.eq.${batchId}`)
        } else {
          q = q.is('target_batch_id', null)
        }

        const [{ data: notifs }, { data: reads }] = await Promise.all([
          q,
          supabase.from('notification_reads').select('notification_id').eq('user_id', user.id),
        ])
        setNotifications(notifs ?? [])
        setReadIds(new Set((reads ?? []).map(r => r.notification_id)))
        setLoading(false)
      })
  }, [user])

  // Realtime: new / edited / removed notifications reflect instantly
  useEffect(() => {
    if (!user) return
    const matches = (n) => {
      if (!n || !n.is_active) return false
      const now = new Date()
      if (n.scheduled_at && new Date(n.scheduled_at) > now) return false
      if (n.expires_at   && new Date(n.expires_at)   < now) return false
      
      // 👇 Ensure realtime events are filtered properly for the target user
      if (n.target_user_id && n.target_user_id !== user.id) return false
      
      if (n.target_role !== 'all' && n.target_role !== 'student') return false
      if (n.target_batch_id && batchIdRef.current !== n.target_batch_id) return false
      return true
    }
    const channel = supabase
      .channel(`notif_page_${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const id = payload.old?.id
          if (id) setNotifications(prev => prev.filter(x => x.id !== id))
          return
        }
        const n = payload.new
        if (matches(n)) {
          // insert or update in place, keeping newest-first order
          setNotifications(prev => {
            const next = [n, ...prev.filter(x => x.id !== n.id)]
            next.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
            return next
          })
        } else {
          // deactivated / expired / retargeted → drop it
          setNotifications(prev => prev.filter(x => x.id !== n.id))
        }
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user])

  const markRead = async (id) => {
    if (readIds.has(id)) return
    await supabase.from('notification_reads').upsert(
      { user_id: user.id, notification_id: id },
      { onConflict: 'user_id,notification_id', ignoreDuplicates: true }
    )
    setReadIds(s => new Set(s).add(id))
  }

  const markAllRead = async () => {
    const unread = notifications.filter(n => !readIds.has(n.id))
    if (!unread.length) return
    await supabase.from('notification_reads').upsert(
      unread.map(n => ({ user_id: user.id, notification_id: n.id })),
      { onConflict: 'user_id,notification_id', ignoreDuplicates: true }
    )
    setReadIds(new Set(notifications.map(n => n.id)))
    toast.success('All marked as read')
  }

  const filtered = filter === 'all' ? notifications : notifications.filter(n => n.type === filter)
  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length
  const groups = groupByDate(filtered)

  if (loading) return <div className="py-12 text-center text-gray-400 text-sm">Loading…</div>

  return (
    <div className="space-y-5 pb-20 lg:pb-0 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-lg text-gray-900">Notifications</h2>
          {unreadCount > 0
            ? <p className="text-sm text-gray-500">{unreadCount} unread</p>
            : notifications.length > 0 && <p className="text-sm text-gray-400">All caught up</p>
          }
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead}
            className="flex items-center gap-1.5 text-sm text-blue-700 font-medium hover:underline">
            <CheckCheck className="h-4 w-4" /> Mark all read
          </button>
        )}
      </div>

      {/* Type filter tabs */}
      {notifications.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {FILTER_ORDER.map(t => {
            const count = t === 'all' ? notifications.length : notifications.filter(n => n.type === t).length
            if (t !== 'all' && count === 0) return null
            const style = TYPE_STYLES[t] || TYPE_STYLES.general
            const active = filter === t
            return (
              <button key={t} onClick={() => setFilter(t)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors
                  ${active ? 'bg-blue-950 text-white border-blue-950' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
                {t !== 'all' && <span>{style.icon}</span>}
                <span>{t === 'all' ? 'All' : style.label}</span>
                <span className={active ? 'text-blue-300' : 'text-gray-400'}>{count}</span>
              </button>
            )
          })}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Bell className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">
            {filter === 'all'
              ? 'No notifications yet.'
              : `No ${TYPE_STYLES[filter]?.label ?? filter} notifications.`}
          </p>
        </div>
      ) : (
        Object.entries(groups).map(([group, items]) => (
          <div key={group}>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{group}</p>
            <div className="space-y-2">
              {items.map(n => {
                const style = TYPE_STYLES[n.type] || TYPE_STYLES.general
                const isRead = readIds.has(n.id)
                const expiresSoon = n.expires_at && (new Date(n.expires_at) - Date.now()) < 48 * 3600 * 1000
                return (
                  <div key={n.id} onClick={() => markRead(n.id)}
                    className={`border-l-4 ${style.color} ${style.bg} rounded-r-xl p-4 cursor-pointer hover:brightness-95 transition-all
                      ${!isRead ? 'shadow-sm ring-1 ring-gray-100' : 'opacity-75'}`}>
                    <div className="flex items-start gap-3">
                      <span className="text-xl flex-shrink-0">{style.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{style.label}</span>
                          {!isRead && <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />}
                          {expiresSoon && (
                            <span className="text-xs text-orange-600 font-medium">⌛ Expires soon</span>
                          )}
                        </div>
                        <p className="font-semibold text-gray-900 text-sm">{n.title}</p>
                        <p className="text-sm text-gray-600 mt-1">{n.body}</p>
                        <p className="text-xs text-gray-400 mt-1.5">
                          {new Date(n.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}