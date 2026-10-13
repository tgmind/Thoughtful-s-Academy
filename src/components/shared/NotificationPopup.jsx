import { useState, useEffect, useRef, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { normalizeUrl } from '../../utils/formatters'

const TYPE_CONFIG = {
  fee:          { icon: '💰', label: 'Fee Notice'   },
  live_class:   { icon: '🔴', label: 'Live Class'   },
  announcement: { icon: '📢', label: 'Announcement' },
  homework:     { icon: '📝', label: 'Homework'     },
  general:      { icon: '📌', label: 'Notice'       },
}

const AUTO_DISMISS_MS = 7000
const MAX_VISIBLE     = 5

function NotifCard({ n, onDismiss }) {
  const isMsg  = n.itemType === 'message'
  const isLive = n.itemType === 'live_class'
  const cfg    = (!isMsg && !isLive) ? (TYPE_CONFIG[n.type] || TYPE_CONFIG.general) : null

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -24, scale: 0.94 }}
      animate={{ opacity: 1, y: 0,   scale: 1    }}
      exit={{    opacity: 0, x: 80,  scale: 0.94 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`rounded-2xl shadow-2xl overflow-hidden pointer-events-auto border
        ${isMsg
          ? 'bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 border-green-300'
          : 'bg-gradient-to-br from-red-50 via-rose-50 to-red-100 border-red-300'
        }`}
    >
      <div className="flex items-start gap-4 px-4 py-4">
        <span className="text-2xl flex-shrink-0 mt-0.5">
          {isMsg ? '💬' : isLive ? '🔴' : cfg.icon}
        </span>

        <div className="flex-1 min-w-0">
          <p className={`text-[10px] font-black uppercase tracking-[0.12em] mb-0.5
            ${isMsg ? 'text-emerald-700' : 'text-red-600'}`}>
            {isMsg ? 'New Message' : isLive ? 'Live Class Started' : cfg.label}
          </p>
          <p className="text-sm font-bold text-gray-900 leading-snug">
            {isMsg ? n.senderName : n.title}
          </p>
          {!isLive && (isMsg ? n.content : n.body) && (
            <p className="text-sm text-gray-700 mt-1 leading-relaxed whitespace-pre-line">
              {isMsg
                ? (n.count > 1 ? `${n.count} unread messages — "${n.content}"` : n.content)
                : n.body}
            </p>
          )}

          {isLive && (
            <a
              href={normalizeUrl(n.join_url)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs transition-colors"
            >
              Join Now →
            </a>
          )}
        </div>

        <button
          onClick={() => onDismiss(n.id)}
          className={`flex-shrink-0 p-1.5 rounded-lg transition-colors -mr-1 -mt-1
            ${isMsg
              ? 'text-emerald-500 hover:text-emerald-800 hover:bg-emerald-200/60'
              : 'text-red-400 hover:text-red-700 hover:bg-red-200/60'
            }`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Shrinking progress bar */}
      <motion.div
        className={`h-1 ${isMsg ? 'bg-emerald-400' : 'bg-red-400'}`}
        initial={{ scaleX: 1, originX: '0%' }}
        animate={{ scaleX: 0, originX: '0%' }}
        transition={{ duration: AUTO_DISMISS_MS / 1000, ease: 'linear' }}
        style={{ transformOrigin: 'left' }}
      />
    </motion.div>
  )
}

export default function NotificationPopup() {
  const { user, profile } = useAuth()
  const [queue, setQueue] = useState([])
  const timers     = useRef({})
  const seenIds    = useRef(new Set())
  const batchIdRef = useRef(null)

  // ── Helpers ──────────────────────────────────────────────────────────────

  const markNotifRead = useCallback(async (notifIds) => {
    if (!notifIds.length || !user) return
    await supabase.from('notification_reads').upsert(
      notifIds.map(id => ({ user_id: user.id, notification_id: id })),
      { onConflict: 'user_id,notification_id', ignoreDuplicates: true }
    )
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id])
    delete timers.current[id]
    seenIds.current.delete(id)
    // Extract the item before updating state so the side-effect stays outside the updater
    let notifId = null
    setQueue(q => {
      const item = q.find(n => n.id === id)
      if (item?.itemType === 'notification') notifId = item.notifId
      return q.filter(n => n.id !== id)
    })
    // Defer the DB call to after the state updater returns
    if (notifId) setTimeout(() => markNotifRead([notifId]), 0)
  }, [markNotifRead])

  const dismissAll = useCallback(() => {
    Object.values(timers.current).forEach(clearTimeout)
    timers.current = {}
    seenIds.current.clear()
    // Extract notif IDs before clearing state, then fire the DB call outside the updater
    let notifIds = []
    setQueue(q => {
      notifIds = q.filter(n => n.itemType === 'notification').map(n => n.notifId)
      return []
    })
    if (notifIds.length) setTimeout(() => markNotifRead(notifIds), 0)
  }, [markNotifRead])

  const enqueue = useCallback((items) => {
    const fresh = items.filter(n => !seenIds.current.has(n.id))
    if (!fresh.length) return
    fresh.forEach(n => seenIds.current.add(n.id))
    setQueue(q => [...fresh, ...q])
  }, [])

  // ── Notifications on login (students + teachers only) ────────────────────

  useEffect(() => {
    if (!user || !profile || profile.role === 'admin') return
    const role = profile.role
    const now  = new Date().toISOString()

    const load = async () => {
      let batchId = null
      if (role === 'student') {
        const { data: sp } = await supabase
          .from('student_profiles').select('batch_id').eq('id', user.id).maybeSingle()
        batchId = sp?.batch_id ?? null
        batchIdRef.current = batchId
      }

      const { data: reads } = await supabase
        .from('notification_reads')
        .select('notification_id')
        .eq('user_id', user.id)
        .order('read_at', { ascending: false })
        .limit(50)
      const readSet = new Set((reads ?? []).map(r => r.notification_id))

      let q = supabase.from('notifications')
        .select('id, title, body, type, created_at')
        .eq('is_active', true)
        .or('scheduled_at.is.null,scheduled_at.lte.' + now)
        .or('expires_at.is.null,expires_at.gte.' + now)
        .order('created_at', { ascending: false })
        .limit(20)

      if (role === 'student') {
        q = q.or('target_role.eq.student,target_role.eq.all')
        if (batchId) q = q.or(`target_batch_id.is.null,target_batch_id.eq.${batchId}`)
        else         q = q.is('target_batch_id', null)
      } else {
        q = q.or('target_role.eq.teacher,target_role.eq.all').is('target_batch_id', null)
      }

      const { data: notifs } = await q
      const unread = (notifs ?? []).filter(n => !readSet.has(n.id))
      enqueue(unread.map(n => ({ ...n, id: `notif_${n.id}`, notifId: n.id, itemType: 'notification' })))
    }

    load()
  }, [user?.id, profile?.role]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Consolidated Realtime Popup Channel (1 multiplexed channel per user) ──

  useEffect(() => {
    if (!user || !profile) return
    const role = profile.role

    const senderNameCache = new Map()
    let channel = supabase.channel(`popup_channel_${user.id}`)

    // 1. Incoming messages (all roles)
    channel = channel.on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'messages',
      filter: `receiver_id=eq.${user.id}`,
    }, async (payload) => {
      const msg = payload.new
      let senderName = senderNameCache.get(msg.sender_id)
      if (!senderName) {
        const { data: sender } = await supabase
          .from('profiles').select('full_name').eq('id', msg.sender_id).maybeSingle()
        senderName = sender?.full_name || 'Someone'
        senderNameCache.set(msg.sender_id, senderName)
      }
      enqueue([{
        id:         `msg_rt_${msg.id}`,
        itemType:   'message',
        senderId:   msg.sender_id,
        senderName,
        content:    msg.content,
        count:      1,
      }])
    })

    // 2. New published notifications (students + teachers)
    if (role !== 'admin') {
      channel = channel.on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications'
      }, async (payload) => {
        const n = payload.new
        if (!n.is_active) return
        const now = new Date()
        if (n.scheduled_at && new Date(n.scheduled_at) > now) return
        if (n.expires_at   && new Date(n.expires_at)   < now) return
        const roleOk = n.target_role === 'all' || n.target_role === role
        if (!roleOk) return
        if (role === 'student' && n.target_batch_id) {
          const { data: sp } = await supabase
            .from('student_profiles').select('batch_id').eq('id', user.id).maybeSingle()
          if (sp?.batch_id !== n.target_batch_id) return
        }
        if (role === 'teacher' && n.target_batch_id) return
        enqueue([{ ...n, id: `notif_${n.id}`, notifId: n.id, itemType: 'notification' }])
      })
    }

    // 3. Live classes (students only)
    if (role === 'student') {
      channel = channel.on('postgres_changes', {
        event: '*', schema: 'public', table: 'live_classes'
      }, (payload) => {
        if (payload.eventType !== 'INSERT' && payload.eventType !== 'UPDATE') return
        const lc = payload.new
        if (!lc || !lc.is_active) return
        // Skip batch-restricted classes that aren't for this student's batch.
        if (lc.batch_id && lc.batch_id !== batchIdRef.current) return
        enqueue([{
          id:       `lc_${lc.id}`,
          itemType: 'live_class',
          title:    lc.title,
          join_url: lc.join_url,
          password: lc.password || null,
          platform: lc.platform,
        }])
      })
    }

    channel.subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, profile?.role, enqueue]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-dismiss timers ───────────────────────────────────────────────────

  useEffect(() => {
    queue.slice(0, MAX_VISIBLE).forEach(n => {
      if (!timers.current[n.id]) {
        timers.current[n.id] = setTimeout(() => dismiss(n.id), AUTO_DISMISS_MS)
      }
    })
  }, [queue, dismiss])

  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), [])

  // ── Render ────────────────────────────────────────────────────────────────

  const visible = queue.slice(0, MAX_VISIBLE)
  if (!visible.length) return null

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 w-96 max-w-[calc(100vw-2rem)] pointer-events-none">
      {visible.length > 1 && (
        <div className="flex justify-end pointer-events-auto">
          <button
            onClick={dismissAll}
            className="text-xs text-white bg-gray-800/80 hover:bg-gray-900/90 px-4 py-1.5 rounded-full backdrop-blur-sm transition-colors shadow-lg font-semibold">
            Clear all ({visible.length})
          </button>
        </div>
      )}
      <AnimatePresence initial={false} mode="popLayout">
        {visible.map(n => <NotifCard key={n.id} n={n} onDismiss={dismiss} />)}
      </AnimatePresence>
    </div>
  )
}
