import { useState, useEffect, useMemo } from 'react'
import { Plus, X, Trash2, Eye, EyeOff, Bell, Search, Pencil, Users, CheckCheck, Megaphone, Inbox } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

// ─── shared constants ────────────────────────────────────────────────────────
const TYPES   = ['general', 'announcement', 'homework', 'live_class', 'fee']
const TARGETS = [
  { value: 'student', label: 'Students Only' },
  { value: 'all',     label: 'All (Students + Teachers)' },
  { value: 'teacher', label: 'Teachers Only' },
]

const TYPE_COLORS = {
  fee:          'bg-amber-100 text-amber-800',
  live_class:   'bg-red-100 text-red-800',
  announcement: 'bg-blue-100 text-blue-800',
  homework:     'bg-purple-100 text-purple-800',
  general:      'bg-gray-100 text-gray-700',
}
const TYPE_ICONS = {
  fee: '💰', live_class: '🔴', announcement: '📢', homework: '📝', general: '📌',
}
const TYPE_STYLES = {
  fee:          { color: 'border-l-amber-400',  bg: 'bg-amber-50',  label: 'Fee',          icon: '💰' },
  live_class:   { color: 'border-l-red-500',    bg: 'bg-red-50',    label: 'Live Class',   icon: '🔴' },
  announcement: { color: 'border-l-blue-500',   bg: 'bg-blue-50',   label: 'Announcement', icon: '📢' },
  homework:     { color: 'border-l-purple-500', bg: 'bg-purple-50', label: 'Homework',     icon: '📝' },
  general:      { color: 'border-l-gray-400',   bg: 'bg-white',     label: 'Notice',       icon: '📌' },
}

const EMPTY = { title: '', body: '', type: 'general', target_role: 'student', target_batch_id: '', scheduled_at: '', expires_at: '' }
const STATUS_TABS = ['all', 'active', 'scheduled', 'inactive']
const FILTER_ORDER = ['all', 'announcement', 'homework', 'live_class', 'fee', 'general']

function getStatus(n) {
  const now = new Date()
  if (!n.is_active) return 'inactive'
  if (n.scheduled_at && new Date(n.scheduled_at) > now) return 'scheduled'
  return 'active'
}

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

// ─── Manage tab ──────────────────────────────────────────────────────────────
function ManageTab({ user, batches }) {
  const [notifs,     setNotifs]     = useState([])
  const [readCounts, setReadCounts] = useState({})
  const [showForm,   setShowForm]   = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form,       setForm]       = useState(EMPTY)
  const [saving,     setSaving]     = useState(false)
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [statusTab,  setStatusTab]  = useState('all')

  useEffect(() => {
    Promise.all([
      supabase.from('notifications').select('*').eq('created_by', user.id).order('created_at', { ascending: false }),
      supabase.from('notification_reads').select('notification_id'),
    ]).then(([n, r]) => {
      setNotifs(n.data ?? [])
      const counts = {}
      ;(r.data ?? []).forEach(row => {
        counts[row.notification_id] = (counts[row.notification_id] ?? 0) + 1
      })
      setReadCounts(counts)
      setLoading(false)
    })
  }, [user.id])

  // Realtime: reflect my own creates/edits/deletes instantly (e.g. another tab)
  useEffect(() => {
    const channel = supabase
      .channel(`notif_manage_${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const id = payload.old?.id
          if (id) setNotifs(prev => prev.filter(x => x.id !== id))
          return
        }
        const n = payload.new
        if (n.created_by !== user.id) return
        setNotifs(prev => {
          const next = [n, ...prev.filter(x => x.id !== n.id)]
          next.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
          return next
        })
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user.id])

  const batchMap = useMemo(() => {
    const m = {}
    batches.forEach(b => { m[b.id] = b.name })
    return m
  }, [batches])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const openNew  = () => { setEditTarget(null); setForm(EMPTY); setShowForm(true) }
  const openEdit = (n) => {
    setEditTarget(n)
    setForm({
      title:           n.title,
      body:            n.body,
      type:            n.type,
      target_role:     n.target_role,
      target_batch_id: n.target_batch_id ?? '',
      scheduled_at:    n.scheduled_at ? n.scheduled_at.slice(0, 16) : '',
      expires_at:      n.expires_at   ? n.expires_at.slice(0, 16)   : '',
    })
    setShowForm(true)
  }
  const closeForm = () => { setShowForm(false); setEditTarget(null); setForm(EMPTY) }

  const save = async () => {
    if (!form.title.trim() || !form.body.trim()) { toast.error('Title and body are required'); return }
    setSaving(true)
    const payload = {
      ...form,
      target_batch_id: form.target_batch_id || null,
      scheduled_at:    form.scheduled_at    || null,
      expires_at:      form.expires_at      || null,
    }

    if (editTarget) {
      const { data, error } = await supabase
        .from('notifications').update(payload).eq('id', editTarget.id).select().single()
      setSaving(false)
      if (error) { toast.error(error.message); return }
      setNotifs(list => list.map(x => x.id === editTarget.id ? data : x))
      toast.success('Notification updated!')
    } else {
      const { data, error } = await supabase
        .from('notifications').insert({ ...payload, is_active: true, created_by: user.id }).select().single()
      setSaving(false)
      if (error) { toast.error(error.message); return }
      setNotifs(n => [data, ...n])
      toast.success('Notification published!')
    }
    closeForm()
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

  const displayed = useMemo(() => {
    let list = notifs
    if (statusTab !== 'all') list = list.filter(n => getStatus(n) === statusTab)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(n => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q))
    }
    return list
  }, [notifs, statusTab, search])

  const stats = useMemo(() => {
    const now = new Date()
    return {
      total:     notifs.length,
      active:    notifs.filter(n => n.is_active && !(n.scheduled_at && new Date(n.scheduled_at) > now)).length,
      scheduled: notifs.filter(n => n.is_active && n.scheduled_at && new Date(n.scheduled_at) > now).length,
      inactive:  notifs.filter(n => !n.is_active).length,
    }
  }, [notifs])

  if (loading) return <div className="py-12 text-center text-gray-400 text-sm">Loading…</div>

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Notifications you've created for students</p>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-blue-950 text-white text-sm font-semibold rounded-xl hover:bg-blue-900 transition-colors">
          <Plus className="h-4 w-4" /> New Notification
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total',     value: stats.total,     color: 'text-gray-900' },
          { label: 'Active',    value: stats.active,    color: 'text-green-700' },
          { label: 'Scheduled', value: stats.scheduled, color: 'text-blue-700' },
          { label: 'Inactive',  value: stats.inactive,  color: 'text-gray-400' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-3 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search + status filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by title or body…"
            className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
        </div>
        <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl">
          {STATUS_TABS.map(tab => (
            <button key={tab} onClick={() => setStatusTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors
                ${statusTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {displayed.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <Bell className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">
            {notifs.length === 0 ? "No notifications yet. Create your first one!" : 'No results match your search.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(n => {
            const reads     = readCounts[n.id] ?? 0
            const batchName = n.target_batch_id ? batchMap[n.target_batch_id] : null
            const status    = getStatus(n)
            return (
              <div key={n.id} className={`bg-white rounded-xl border border-gray-100 p-4 ${!n.is_active ? 'opacity-60' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className="text-lg">{TYPE_ICONS[n.type] ?? '📌'}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${TYPE_COLORS[n.type]}`}>
                        {n.type.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-gray-500 capitalize">
                        {n.target_role === 'all' ? 'All roles' : n.target_role + 's'}
                        {batchName && ` · ${batchName}`}
                      </span>
                      {status === 'scheduled' && (
                        <span className="text-xs text-blue-600 font-medium">
                          ⏰ Scheduled {new Date(n.scheduled_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      {n.expires_at && (
                        <span className="text-xs text-amber-600 font-medium">
                          ⌛ Expires {new Date(n.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900">{n.title}</h3>
                    <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <p className="text-xs text-gray-400">
                        {new Date(n.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {reads > 0 && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Users className="h-3 w-3" /> {reads} read
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(n)} title="Edit"
                      className="p-1.5 text-gray-400 hover:text-blue-700 transition-colors">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => toggleActive(n)} title={n.is_active ? 'Deactivate' : 'Activate'}
                      className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors">
                      {n.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                    <button onClick={() => deleteNotif(n.id)} title="Delete"
                      className="p-1.5 text-gray-400 hover:text-red-600 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create / Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <h3 className="font-bold text-gray-900">{editTarget ? 'Edit Notification' : 'New Notification'}</h3>
              <button onClick={closeForm} className="p-1 text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Title <span className="text-red-500">*</span></label>
                <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Homework Due Tomorrow"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Body <span className="text-red-500">*</span></label>
                <textarea value={form.body} onChange={e => set('body', e.target.value)} rows={3} placeholder="Full notification text…"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
                  <select value={form.type} onChange={e => set('type', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm">
                    {TYPES.map(t => <option key={t} value={t} className="capitalize">{t.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Target Role</label>
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
                <button onClick={closeForm} className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl font-semibold text-sm">Cancel</button>
                <button onClick={save} disabled={saving}
                  className="flex-1 py-2.5 bg-blue-950 text-white font-bold rounded-xl hover:bg-blue-900 disabled:opacity-50 text-sm">
                  {saving ? 'Saving…' : editTarget ? 'Save Changes' : 'Publish Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Inbox tab ───────────────────────────────────────────────────────────────
function InboxTab({ user }) {
  const [notifications, setNotifications] = useState([])
  const [readIds,       setReadIds]       = useState(new Set())
  const [loading,       setLoading]       = useState(true)
  const [filter,        setFilter]        = useState('all')

  useEffect(() => {
    if (!user) return
    const now = new Date().toISOString()
    const load = async () => {
      const [{ data: notifs }, { data: reads }] = await Promise.all([
        supabase.from('notifications').select('*')
          .eq('is_active', true)
          .or('target_role.eq.teacher,target_role.eq.all')
          .is('target_batch_id', null)
          .or('scheduled_at.is.null,scheduled_at.lte.' + now)
          .or('expires_at.is.null,expires_at.gte.' + now)
          .order('created_at', { ascending: false }),
        supabase.from('notification_reads').select('notification_id').eq('user_id', user.id),
      ])
      setNotifications(notifs ?? [])
      setReadIds(new Set((reads ?? []).map(r => r.notification_id)))
      setLoading(false)
    }
    load()
  }, [user])

  useEffect(() => {
    if (!user) return
    const matches = (n) => {
      if (!n || !n.is_active) return false
      const now = new Date()
      if (n.scheduled_at && new Date(n.scheduled_at) > now) return false
      if (n.expires_at   && new Date(n.expires_at)   < now) return false
      if (n.target_role !== 'all' && n.target_role !== 'teacher') return false
      if (n.target_batch_id) return false
      return true
    }
    const channel = supabase
      .channel(`notif_teacher_inbox_${user.id}`)
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

  const filtered    = filter === 'all' ? notifications : notifications.filter(n => n.type === filter)
  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length
  const groups      = groupByDate(filtered)

  if (loading) return <div className="py-12 text-center text-gray-400 text-sm">Loading…</div>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {unreadCount > 0 ? `${unreadCount} unread` : notifications.length > 0 ? 'All caught up' : ''}
        </p>
        {unreadCount > 0 && (
          <button onClick={markAllRead}
            className="flex items-center gap-1.5 text-sm text-blue-700 font-medium hover:underline">
            <CheckCheck className="h-4 w-4" /> Mark all read
          </button>
        )}
      </div>

      {notifications.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {FILTER_ORDER.map(t => {
            const count  = t === 'all' ? notifications.length : notifications.filter(n => n.type === t).length
            if (t !== 'all' && count === 0) return null
            const style  = TYPE_STYLES[t] || TYPE_STYLES.general
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
            {filter === 'all' ? 'No notifications yet.' : `No ${TYPE_STYLES[filter]?.label ?? filter} notifications.`}
          </p>
        </div>
      ) : (
        Object.entries(groups).map(([group, items]) => (
          <div key={group}>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{group}</p>
            <div className="space-y-2">
              {items.map(n => {
                const style       = TYPE_STYLES[n.type] || TYPE_STYLES.general
                const isRead      = readIds.has(n.id)
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
                          {expiresSoon && <span className="text-xs text-orange-600 font-medium">⌛ Expires soon</span>}
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

// ─── Root component ───────────────────────────────────────────────────────────
export default function TeacherNotifications() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('manage')
  const [batches,   setBatches]   = useState([])

  useEffect(() => {
    supabase.from('batches').select('id, name').eq('is_active', true).order('name')
      .then(({ data }) => setBatches(data ?? []))
  }, [])

  const tabs = [
    { id: 'manage', label: 'Manage',       icon: <Megaphone className="h-4 w-4" /> },
    { id: 'inbox',  label: 'My Inbox',     icon: <Inbox     className="h-4 w-4" /> },
  ]

  return (
    <div className="space-y-5 pb-20 lg:pb-0">

      {/* Page header */}
      <div>
        <h2 className="font-bold text-lg text-gray-900">Notifications</h2>
        <p className="text-sm text-gray-400 mt-0.5">Create announcements for students or view your inbox</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors
              ${activeTab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'manage'
        ? <ManageTab user={user} batches={batches} />
        : <InboxTab  user={user} />
      }
    </div>
  )
}
