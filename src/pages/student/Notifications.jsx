import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Bell, CheckCheck, ChevronDown, ChevronUp, Search, ExternalLink, ArrowRight, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const TYPE_STYLES = {
  fee:          { color: 'border-l-amber-400',  bg: 'bg-amber-50/60',  label: 'Fee',          icon: '💰', actionPath: '/student/pay-fee',       actionText: 'Pay Fee' },
  live_class:   { color: 'border-l-red-500',    bg: 'bg-red-50/60',    label: 'Live Class',   icon: '🔴', actionPath: '/student/live-class',    actionText: 'Join Live Class' },
  announcement: { color: 'border-l-blue-500',   bg: 'bg-blue-50/60',   label: 'Announcement', icon: '📢' },
  homework:     { color: 'border-l-purple-500', bg: 'bg-purple-50/60', label: 'Homework',     icon: '📝', actionPath: '/student/homework',      actionText: 'View Homework' },
  general:      { color: 'border-l-gray-400',   bg: 'bg-white',        label: 'Notice',       icon: '📌' },
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
  const [expandedIds,   setExpandedIds]   = useState(new Set())
  const [loading,       setLoading]       = useState(true)
  const [filter,        setFilter]        = useState('all')
  const [searchQuery,   setSearchQuery]   = useState('')
  const [hideRead,      setHideRead]      = useState(false)
  const batchIdRef = useRef(null)

  useEffect(() => {
    if (!user) return
    const now = new Date().toISOString()

    supabase.from('student_profiles').select('batch_id').eq('id', user.id).maybeSingle()
      .then(async ({ data: profile }) => {
        const batchId = profile?.batch_id ?? null
        batchIdRef.current = batchId

        const batchFilter = batchId
          ? `target_batch_id.is.null,target_batch_id.eq.${batchId}`
          : 'target_batch_id.is.null'

        const { data: notifs } = await supabase.from('notifications').select('*')
          .eq('is_active', true)
          .or('target_role.eq.student,target_role.eq.all')
          .or(`target_user_id.is.null,target_user_id.eq.${user.id}`)
          .or(batchFilter)
          .order('created_at', { ascending: false })

        // Client-side filtering for schedule/expiry (avoids extra .or() overwrite)
        const filtered = (notifs ?? []).filter(n => {
          if (n.scheduled_at && new Date(n.scheduled_at) > new Date(now)) return false
          if (n.expires_at && new Date(n.expires_at) < new Date(now)) return false
          return true
        })

        const [{ data: reads }] = await Promise.all([
          supabase.from('notification_reads').select('notification_id').eq('user_id', user.id),
        ])
        setNotifications(filtered)
        setReadIds(new Set((reads ?? []).map(r => r.notification_id)))
        setLoading(false)
      })
  }, [user])

  // Realtime updates
  useEffect(() => {
    if (!user) return
    const matches = (n) => {
      if (!n || !n.is_active) return false
      const now = new Date()
      if (n.scheduled_at && new Date(n.scheduled_at) > now) return false
      if (n.expires_at   && new Date(n.expires_at)   < now) return false
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
          setNotifications(prev => {
            const next = [n, ...prev.filter(x => x.id !== n.id)]
            next.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
            return next
          })
        } else {
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

  const toggleExpand = (id) => {
    markRead(id)
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleExpandAll = () => {
    if (expandedIds.size === filtered.length) {
      setExpandedIds(new Set())
    } else {
      setExpandedIds(new Set(filtered.map(n => n.id)))
      // Bulk-mark as read in a single API call instead of N individual calls
      const unread = filtered.filter(n => !readIds.has(n.id))
      if (unread.length) {
        supabase.from('notification_reads').upsert(
          unread.map(n => ({ user_id: user.id, notification_id: n.id })),
          { onConflict: 'user_id,notification_id', ignoreDuplicates: true }
        )
        setReadIds(prev => {
          const next = new Set(prev)
          unread.forEach(n => next.add(n.id))
          return next
        })
      }
    }
  }

  // Filter & Search Logic
  const filtered = notifications.filter(n => {
    if (filter !== 'all' && n.type !== filter) return false
    if (hideRead && readIds.has(n.id)) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchTitle = n.title?.toLowerCase().includes(q)
      const matchBody = n.body?.toLowerCase().includes(q)
      if (!matchTitle && !matchBody) return false
    }
    return true
  })

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length
  const groups = groupByDate(filtered)
  const isAllExpanded = filtered.length > 0 && expandedIds.size === filtered.length

  if (loading) return <div className="py-12 text-center text-gray-400 text-sm">Loading notifications…</div>

  return (
    <div className="space-y-5 pb-20 lg:pb-0 max-w-2xl">
      {/* Header section */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-extrabold text-xl text-gray-900 tracking-tight flex items-center gap-2">
              <Bell className="h-5 w-5 text-blue-950" /> Notifications
            </h2>
            {unreadCount > 0
              ? <p className="text-xs text-blue-900 font-semibold mt-0.5">{unreadCount} unread announcements</p>
              : notifications.length > 0 && <p className="text-xs text-gray-400 font-medium mt-0.5">All caught up!</p>
            }
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {filtered.length > 0 && (
              <button
                onClick={toggleExpandAll}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1"
              >
                {isAllExpanded ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5" /> Collapse All
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" /> Expand All
                  </>
                )}
              </button>
            )}

            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 border border-blue-100"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark All Read
              </button>
            )}
          </div>
        </div>

        {/* Search bar & Hide read toggle */}
        {notifications.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-gray-100">
            <div className="relative w-full flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search announcements…"
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-950 focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={() => setHideRead(h => !h)}
              className={`w-full sm:w-auto px-3 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap flex items-center justify-center gap-1 border ${
                hideRead
                  ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <span>{hideRead ? 'Showing Unread Only' : 'Hide Read'}</span>
            </button>
          </div>
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
            const unreadInType = t === 'all' ? unreadCount : notifications.filter(n => n.type === t && !readIds.has(n.id)).length

            return (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                  active
                    ? 'bg-blue-950 text-white border-blue-950 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {t !== 'all' && <span>{style.icon}</span>}
                <span>{t === 'all' ? 'All Notices' : style.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {count}
                </span>
                {unreadInType > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title={`${unreadInType} unread`} />
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Notifications Grouped List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
          <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-bold text-gray-800 text-base">No Notifications</h3>
          <p className="text-xs text-gray-400 max-w-xs mx-auto mt-1">
            {searchQuery.trim()
              ? `No notifications found matching "${searchQuery}".`
              : filter === 'all'
              ? 'You are all caught up! Check back later for institute notices.'
              : `No ${TYPE_STYLES[filter]?.label ?? filter} notifications found.`}
          </p>
        </div>
      ) : (
        Object.entries(groups).map(([group, items]) => (
          <div key={group} className="space-y-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1 pt-1">{group}</p>
            <div className="space-y-2.5">
              {items.map(n => {
                const style = TYPE_STYLES[n.type] || TYPE_STYLES.general
                const isRead = readIds.has(n.id)
                const isExpanded = expandedIds.has(n.id)
                const expiresSoon = n.expires_at && (new Date(n.expires_at) - Date.now()) < 48 * 3600 * 1000
                const urlMatch = n.body?.match(/https?:\/\/[^\s]+/)
                const targetUrl = urlMatch ? urlMatch[0] : null

                return (
                  <div
                    key={n.id}
                    onClick={() => toggleExpand(n.id)}
                    className={`border-l-4 ${style.color} ${style.bg} rounded-r-2xl p-4 cursor-pointer hover:shadow-md transition-all duration-200 select-none ${
                      !isRead
                        ? 'shadow-sm bg-white ring-1 ring-blue-900/10'
                        : 'opacity-85 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl flex-shrink-0 mt-0.5">{style.icon}</span>

                      <div className="flex-1 min-w-0">
                        {/* Header metadata line */}
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-black text-gray-700 uppercase tracking-wider bg-white/80 px-2 py-0.5 rounded-md border border-gray-200/60">
                              {style.label}
                            </span>
                            {!isRead && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black bg-blue-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                                New
                              </span>
                            )}
                            {expiresSoon && (
                              <span className="text-[10px] text-orange-600 font-bold bg-orange-100/80 px-2 py-0.5 rounded-md">
                                ⌛ Expires soon
                              </span>
                            )}
                          </div>

                          <span className="text-xs text-gray-400 font-medium shrink-0">
                            {new Date(n.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Title & Chevron Indicator */}
                        <div className="flex items-center justify-between gap-2">
                          <h4 className={`text-sm tracking-tight text-gray-900 ${!isRead ? 'font-black' : 'font-bold'}`}>
                            {n.title}
                          </h4>

                          <div className="text-gray-400 hover:text-gray-700 transition-colors p-1 shrink-0">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-blue-950" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                        </div>

                        {/* Compressed Body Preview vs Expanded Full Body */}
                        {isExpanded ? (
                          <div className="mt-2.5 pt-2.5 border-t border-gray-200/60 space-y-3">
                            <div className="text-sm text-gray-700 font-medium whitespace-pre-line leading-relaxed bg-white/80 p-3 rounded-xl border border-gray-100">
                              {n.body}
                            </div>

                            {/* Direct Action Link / Navigation Button */}
                            {style.actionPath ? (
                              <Link
                                to={style.actionPath}
                                onClick={e => e.stopPropagation()}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-950 text-white text-xs font-bold rounded-xl hover:bg-blue-900 transition-colors shadow-xs"
                              >
                                <span>{style.actionText}</span>
                                <ArrowRight className="h-3.5 w-3.5 text-amber-400" />
                              </Link>
                            ) : targetUrl ? (
                              <a
                                href={targetUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-xs"
                              >
                                <span>Open Link</span>
                                <ExternalLink className="h-3.5 w-3.5 text-amber-400" />
                              </a>
                            ) : null}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1 flex items-center justify-between gap-2">
                            <span className="truncate">{n.body}</span>
                            <span className="text-[10px] font-bold text-blue-900 hover:underline shrink-0">
                              Tap to read full →
                            </span>
                          </p>
                        )}
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