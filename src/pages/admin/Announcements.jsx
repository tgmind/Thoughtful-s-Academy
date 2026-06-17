import { useState, useEffect, useMemo } from 'react'
import { Plus, X, Trash2, Eye, EyeOff, Bell, Search, Pencil, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const TYPES   = ['general', 'fee', 'announcement', 'homework', 'live_class']
const TARGETS = [{ value: 'all', label: 'All' }, { value: 'student', label: 'Students Only' }, { value: 'teacher', label: 'Teachers Only' }]

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

const EMPTY = { title: '', body: '', type: 'general', target_role: 'all', target_batch_id: '', scheduled_at: '', expires_at: '' }

const STATUS_TABS = ['all', 'active', 'scheduled', 'inactive']

function getStatus(n) {
  const now = new Date()
  if (!n.is_active) return 'inactive'
  if (n.scheduled_at && new Date(n.scheduled_at) > now) return 'scheduled'
  return 'active'
}

export default function Announcements() {
  const { user } = useAuth()
  const [notifs,     setNotifs]     = useState([])
  const [batches,    setBatches]    = useState([])
  const [readCounts, setReadCounts] = useState({})   // { [notification_id]: number }
  const [showForm,   setShowForm]   = useState(false)
  const [editTarget, setEditTarget] = useState(null) // notification being edited
  const [form,       setForm]       = useState(EMPTY)
  const [saving,     setSaving]     = useState(false)
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [statusTab,  setStatusTab]  = useState('all')

  useEffect(() => {
    Promise.all([
      supabase.from('notifications').select('*').order('created_at', { ascending: false }),
      supabase.from('batches').select('id, name').eq('is_active', true).order('name'),
      supabase.from('notification_reads').select('notification_id'),
    ]).then(([n, b, r]) => {
      setNotifs(n.data ?? [])
      setBatches(b.data ?? [])
      // Count reads per notification
      const counts = {}
      ;(r.data ?? []).forEach(row => {
        counts[row.notification_id] = (counts[row.notification_id] ?? 0) + 1
      })
      setReadCounts(counts)
      setLoading(false)
    })
  }, [])

  // Realtime: reflect creates/edits/deletes (incl. from other admins) instantly
  useEffect(() => {
    const channel = supabase
      .channel('announcements_admin_list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const id = payload.old?.id
          if (id) setNotifs(prev => prev.filter(x => x.id !== id))
          return
        }
        const n = payload.new
        setNotifs(prev => {
          const next = [n, ...prev.filter(x => x.id !== n.id)]
          next.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
          return next
        })
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const batchMap = useMemo(() => {
    const m = {}
    batches.forEach(b => { m[b.id] = b.name })
    return m
  }, [batches])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const openNew = () => { setEditTarget(null); setForm(EMPTY); setShowForm(true) }
  const openEdit = (n) => {
    setEditTarget(n)
    setForm({
      title:           n.title,
      body:            n.body,
      type:            n.type,
      target_role:     n.target_role,
      target_batch_id: n.target_batch_id ?? '',
      scheduled_at:    n.scheduled_at ? n.scheduled_at.slice(0, 16) : '',
      expires_at:      n.expires_at    ? n.expires_at.slice(0, 16)  : '',
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

  // Filtered list
  const displayed = useMemo(() => {
    let list = notifs
    if (statusTab !== 'all') list = list.filter(n => getStatus(n) === statusTab)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(n => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q))
    }
    return list
  }, [notifs, statusTab, search])

  // Stats
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
    <div className="space-y-5 pb-20 lg:pb-0">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-lg text-gray-900">Announcements</h2>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-blue-950 text-white text-sm font-semibold rounded-xl hover:bg-blue-900 transition-colors">
          <Plus className="h-4 w-4" /> New Announcement
        </button>
      </div>

      {/* Stats row */}
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

      {displayed.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <Bell className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">
            {notifs.length === 0 ? 'No announcements yet. Create your first one!' : 'No results match your search.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(n => {
            const reads = readCounts[n.id] ?? 0
            const batchName = n.target_batch_id ? batchMap[n.target_batch_id] : null
            const isPublic = n.target_role === 'all' && !n.target_batch_id
            const status = getStatus(n)
            return (
              <div key={n.id} className={`bg-white rounded-xl border border-gray-100 p-4 ${!n.is_active ? 'opacity-60' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Badges row */}
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className="text-lg">{TYPE_ICONS[n.type] ?? '📌'}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${TYPE_COLORS[n.type]}`}>
                        {n.type.replace('_', ' ')}
                      </span>
                      {isPublic
                        ? <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">🌐 Public</span>
                        : <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">🔒 Login required</span>
                      }
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

                    {/* Footer: date + read count */}
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

                  {/* Actions */}
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
              <h3 className="font-bold text-gray-900">{editTarget ? 'Edit Announcement' : 'New Announcement'}</h3>
              <button onClick={closeForm} className="p-1 text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
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
                {form.target_role === 'all' && !form.target_batch_id
                  ? <p className="mt-1.5 text-xs text-green-700">This will appear on the public homepage (no login needed).</p>
                  : <p className="mt-1.5 text-xs text-blue-700">Only logged-in users matching the role/batch above will see this.</p>
                }
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
