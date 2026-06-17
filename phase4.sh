#!/bin/bash
# ============================================================
# phase4.sh — Teacher Dashboard (Phase 4)
# Run inside coaching-institute folder: bash phase4.sh
# ============================================================
set -e
echo "🏗️  Building Phase 4 — Teacher Dashboard..."

mkdir -p src/pages/teacher

# ============================================================
# 1. TEACHER HOME
# ============================================================
cat > src/pages/teacher/TeacherHome.jsx << 'EOF'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Video, MessageCircle, DollarSign, Lock, CheckCircle } from 'lucide-react'
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
      supabase.from('teacher_profiles').select('*').eq('id', user.id).single(),
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

  const features = [
    { key: 'study_cards',   label: 'Study Cards',    perm: perms?.can_manage_study_cards, path: '/teacher/study-cards', icon: <BookOpen className="h-5 w-5" />,    color: 'bg-blue-50 text-blue-700'   },
    { key: 'live_class',    label: 'Live Class',     perm: perms?.can_drop_live_class,    path: '/teacher/live-class',  icon: <Video className="h-5 w-5" />,        color: 'bg-red-50 text-red-700'     },
    { key: 'message',       label: 'Messages',       perm: perms?.can_message_students,   path: '/teacher/messages',    icon: <MessageCircle className="h-5 w-5" />, color: 'bg-purple-50 text-purple-700'},
    { key: 'salary',        label: 'My Salary',      perm: true,                          path: '/teacher/salary',      icon: <DollarSign className="h-5 w-5" />,   color: 'bg-green-50 text-green-700' },
  ]

  if (loading) return <div className="py-12 text-center text-gray-400 text-sm">Loading…</div>

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-blue-950 to-indigo-800 rounded-2xl p-6 text-white">
        <p className="text-blue-200 text-sm mb-1">Welcome back 👋</p>
        <h2 className="font-bold text-2xl">{profile?.full_name}</h2>
        {perms?.subject && <p className="text-blue-200 mt-1">{perms.subject}</p>}
        <p className="text-blue-300 text-sm mt-1">{new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })}</p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="font-bold text-xl">{stats.cards}</p>
            <p className="text-xs text-blue-200 mt-0.5">Study Cards</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="font-bold text-xl">{stats.unread}</p>
            <p className="text-xs text-blue-200 mt-0.5">Unread Msgs</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className={`font-bold text-xl ${stats.live ? 'text-red-300' : ''}`}>{stats.live ? '🔴' : '—'}</p>
            <p className="text-xs text-blue-200 mt-0.5">Live Class</p>
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
EOF
echo "  ✅ TeacherHome"

# ============================================================
# 2. STUDY CARDS MANAGEMENT
# ============================================================
cat > src/pages/teacher/StudyCards.jsx << 'EOF'
import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Lock, X, Eye, EyeOff, Youtube, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

function getYTThumb(url) {
  const match = url?.match(/(?:youtu\.be\/|watch\?v=|embed\/)([^#&?]{11})/)
  return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null
}

const TYPES = [
  { value: 'youtube_video',    label: 'YouTube Video'    },
  { value: 'youtube_playlist', label: 'YouTube Playlist' },
  { value: 'google_drive',     label: 'Google Drive'     },
  { value: 'external_link',    label: 'External Link'    },
]

const EMPTY = { title:'', description:'', type:'youtube_video', url:'', batch_id:'', display_order:0, is_featured:false }

export default function StudyCards({ isAdmin = false }) {
  const { user } = useAuth()
  const [allowed,  setAllowed]  = useState(isAdmin)
  const [cards,    setCards]    = useState([])
  const [batches,  setBatches]  = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editing,  setEditing]  = useState(null)
  const [form,     setForm]     = useState(EMPTY)
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!user) return
    const checks = isAdmin
      ? Promise.resolve(true)
      : supabase.from('teacher_profiles').select('can_manage_study_cards').eq('id', user.id).single()
          .then(({ data }) => data?.can_manage_study_cards ?? false)

    checks.then(ok => {
      setAllowed(ok)
      if (!ok) { setLoading(false); return }
      Promise.all([
        supabase.from('study_cards').select('*')
          .eq(isAdmin ? 'is_active' : 'added_by', isAdmin ? true : user.id)
          .order('display_order'),
        supabase.from('batches').select('id, name').eq('is_active', true).order('name'),
      ]).then(([c, b]) => { setCards(c.data ?? []); setBatches(b.data ?? []); setLoading(false) })
    })
  }, [user, isAdmin])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const openAdd  = () => { setEditing(null); setForm(EMPTY); setShowForm(true) }
  const openEdit = (c) => { setEditing(c.id); setForm({ title:c.title, description:c.description||'', type:c.type, url:c.url, batch_id:c.batch_id||'', display_order:c.display_order, is_featured:c.is_featured }); setShowForm(true) }

  const save = async () => {
    if (!form.title.trim() || !form.url.trim()) { toast.error('Title and URL are required'); return }
    setSaving(true)
    const payload = { ...form, batch_id: form.batch_id || null, added_by: user.id, is_active: true }
    const { data, error } = editing
      ? await supabase.from('study_cards').update(payload).eq('id', editing).select().single()
      : await supabase.from('study_cards').insert(payload).select().single()
    setSaving(false)
    if (error) { toast.error(error.message); return }
    if (editing) setCards(c => c.map(x => x.id === editing ? data : x))
    else         setCards(c => [...c, data])
    setShowForm(false)
    toast.success(editing ? 'Card updated!' : 'Card added!')
  }

  const toggleActive = async (card) => {
    const { data } = await supabase.from('study_cards').update({ is_active: !card.is_active }).eq('id', card.id).select().single()
    if (data) setCards(c => c.map(x => x.id === card.id ? data : x))
  }

  const deleteCard = async (id) => {
    setDeleting(id)
    await supabase.from('study_cards').delete().eq('id', id)
    setCards(c => c.filter(x => x.id !== id))
    setDeleting(null)
    toast.success('Deleted')
  }

  const thumb = (form.type === 'youtube_video' || form.type === 'youtube_playlist') ? getYTThumb(form.url) : null

  if (loading) return <div className="py-12 text-center text-gray-400 text-sm">Loading…</div>

  if (!allowed) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
        <Lock className="h-8 w-8 text-gray-400" />
      </div>
      <h2 className="font-bold text-xl text-gray-700">Permission Required</h2>
      <p className="text-gray-500 mt-2">Ask your admin to enable study card management.</p>
    </div>
  )

  return (
    <div className="space-y-5 pb-20 lg:pb-0">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-lg text-gray-900">Study Cards</h2>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-950 text-white text-sm font-semibold rounded-xl hover:bg-blue-900 transition-colors">
          <Plus className="h-4 w-4" /> Add Card
        </button>
      </div>

      {/* Card list */}
      {cards.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <p className="text-gray-400">No study cards yet. Add your first one!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cards.map(c => {
            const thumb = c.thumbnail_url || getYTThumb(c.url)
            return (
              <div key={c.id} className={`bg-white rounded-xl border border-gray-100 flex items-center gap-3 p-3 ${!c.is_active ? 'opacity-50' : ''}`}>
                {thumb
                  ? <img src={thumb} alt="" className="w-16 h-12 rounded-lg object-cover flex-shrink-0" />
                  : <div className="w-16 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Youtube className="h-5 w-5 text-gray-300" />
                    </div>
                }
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{c.title}</p>
                  <p className="text-xs text-gray-400">{c.type.replace('_', ' ')} {c.is_featured ? '· ⭐ Featured' : ''}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => toggleActive(c)} title={c.is_active ? 'Hide' : 'Show'}
                    className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors">
                    {c.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => deleteCard(c.id)} disabled={deleting === c.id}
                    className="p-1.5 text-gray-400 hover:text-red-600 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <h3 className="font-bold text-gray-900">{editing ? 'Edit Card' : 'Add Study Card'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Live preview */}
              {(form.title || thumb) && (
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                  <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">Preview</p>
                  <div className="flex items-center gap-3">
                    {thumb
                      ? <img src={thumb} alt="" className="w-20 h-14 object-cover rounded-lg flex-shrink-0" />
                      : <div className="w-20 h-14 bg-gray-200 rounded-lg flex-shrink-0" />
                    }
                    <div>
                      <p className="font-semibold text-sm text-gray-900 line-clamp-1">{form.title || 'Title…'}</p>
                      <p className="text-xs text-gray-500 line-clamp-1">{form.description || 'Description…'}</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Title <span className="text-red-500">*</span></label>
                <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Chapter 5 — Trigonometry"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} placeholder="Brief description…"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
                <select value={form.type} onChange={e => set('type', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm">
                  {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">URL <span className="text-red-500">*</span></label>
                <input value={form.url} onChange={e => set('url', e.target.value)} placeholder="https://…"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Target Batch</label>
                <select value={form.batch_id} onChange={e => set('batch_id', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm">
                  <option value="">All Students</option>
                  {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Display Order</label>
                  <input type="number" value={form.display_order} onChange={e => set('display_order', parseInt(e.target.value)||0)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm" />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.is_featured} onChange={e => set('is_featured', e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">Featured</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 text-sm">
                  Cancel
                </button>
                <button onClick={save} disabled={saving} className="flex-1 py-2.5 bg-blue-950 text-white font-bold rounded-xl hover:bg-blue-900 disabled:opacity-50 text-sm transition-colors">
                  {saving ? 'Saving…' : editing ? 'Update Card' : 'Add Card'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
EOF
echo "  ✅ StudyCards"

# ============================================================
# 3. LIVE CLASS PAGE
# ============================================================
cat > src/pages/teacher/LiveClass.jsx << 'EOF'
import { useState, useEffect } from 'react'
import { Video, Lock, Square, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const PLATFORMS = [
  { value: 'zoom',        label: '🎥 Zoom'         },
  { value: 'google_meet', label: '📹 Google Meet'  },
  { value: 'other',       label: '🔗 Other'        },
]

const EMPTY = { title:'', platform:'zoom', join_url:'', password:'', batch_id:'', scheduled_at:'' }

export default function LiveClass({ isAdmin = false }) {
  const { user, profile } = useAuth()
  const [allowed,     setAllowed]     = useState(isAdmin)
  const [active,      setActive]      = useState(null)
  const [past,        setPast]        = useState([])
  const [batches,     setBatches]     = useState([])
  const [form,        setForm]        = useState(EMPTY)
  const [saving,      setSaving]      = useState(false)
  const [ending,      setEnding]      = useState(false)
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    if (!user) return
    const permCheck = isAdmin
      ? Promise.resolve(true)
      : supabase.from('teacher_profiles').select('can_drop_live_class').eq('id', user.id).single()
          .then(({ data }) => data?.can_drop_live_class ?? false)

    permCheck.then(ok => {
      setAllowed(ok)
      if (!ok) { setLoading(false); return }
      Promise.all([
        supabase.from('live_classes').select('*, batches(name)').eq('teacher_id', user.id).eq('is_active', true).limit(1),
        supabase.from('live_classes').select('*, batches(name)').eq('teacher_id', user.id).eq('is_active', false).order('created_at', { ascending: false }).limit(10),
        supabase.from('batches').select('id, name').eq('is_active', true).order('name'),
      ]).then(([a, p, b]) => {
        setActive(a.data?.[0] ?? null)
        setPast(p.data ?? [])
        setBatches(b.data ?? [])
        setLoading(false)
      })
    })
  }, [user, isAdmin])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const goLive = async () => {
    if (!form.title.trim() || !form.join_url.trim()) { toast.error('Title and join URL are required'); return }
    setSaving(true)
    const { data, error } = await supabase.from('live_classes').insert({
      ...form,
      batch_id: form.batch_id || null,
      scheduled_at: form.scheduled_at || null,
      teacher_id: user.id,
      is_active: true,
    }).select('*, batches(name)').single()
    setSaving(false)
    if (error) { toast.error(error.message); return }
    setActive(data)
    setForm(EMPTY)
    toast.success('🔴 Live class is now active! Students can see it.')
  }

  const endClass = async () => {
    if (!active) return
    setEnding(true)
    await supabase.from('live_classes').update({ is_active: false }).eq('id', active.id)
    setPast(p => [{ ...active, is_active: false }, ...p])
    setActive(null)
    setEnding(false)
    toast.success('Class ended.')
  }

  if (loading) return <div className="py-12 text-center text-gray-400 text-sm">Loading…</div>

  if (!allowed) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
        <Lock className="h-8 w-8 text-gray-400" />
      </div>
      <h2 className="font-bold text-xl text-gray-700">Permission Required</h2>
      <p className="text-gray-500 mt-2">Ask your admin to enable live class management.</p>
    </div>
  )

  return (
    <div className="space-y-6 pb-20 lg:pb-0 max-w-2xl">

      {/* Active class */}
      {active && (
        <div className="bg-gradient-to-r from-red-600 to-red-500 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-3 h-3 bg-white rounded-full animate-pulse" />
            <span className="font-bold uppercase tracking-wide text-sm">Live Now</span>
          </div>
          <h2 className="font-bold text-xl">{active.title}</h2>
          <p className="text-red-100 text-sm mt-1">{active.batches?.name || 'All Students'}</p>
          {active.password && (
            <p className="text-sm mt-1">Password: <span className="font-mono bg-white/20 px-2 py-0.5 rounded">{active.password}</span></p>
          )}
          <div className="flex gap-3 mt-4">
            <a href={active.join_url} target="_blank" rel="noopener noreferrer"
              className="px-5 py-2 bg-white text-red-600 font-bold rounded-xl text-sm hover:bg-red-50">
              Join Class →
            </a>
            <button onClick={endClass} disabled={ending}
              className="flex items-center gap-2 px-5 py-2 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-xl text-sm transition-colors">
              <Square className="h-4 w-4 fill-current" /> {ending ? 'Ending…' : 'End Class'}
            </button>
          </div>
        </div>
      )}

      {/* Drop link form */}
      {!active && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <Video className="h-5 w-5 text-red-500" /> Drop a Live Class Link
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Class Title <span className="text-red-500">*</span></label>
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Physics — Chapter 9 Live Revision"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Platform</label>
            <div className="grid grid-cols-3 gap-2">
              {PLATFORMS.map(p => (
                <button key={p.value} type="button" onClick={() => set('platform', p.value)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium border-2 transition-colors
                    ${form.platform === p.value ? 'border-blue-950 bg-blue-50 text-blue-950' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Join URL <span className="text-red-500">*</span></label>
            <input value={form.join_url} onChange={e => set('join_url', e.target.value)} placeholder="https://zoom.us/j/… or meet.google.com/…"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password (optional)</label>
              <input value={form.password} onChange={e => set('password', e.target.value)} placeholder="Meeting password"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Target Batch</label>
              <select value={form.batch_id} onChange={e => set('batch_id', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm">
                <option value="">All Batches</option>
                {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Schedule (optional — leave blank for Now)</label>
            <input type="datetime-local" value={form.scheduled_at} onChange={e => set('scheduled_at', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm" />
          </div>
          <button onClick={goLive} disabled={saving}
            className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-base flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
            {saving ? 'Going Live…' : <><span className="w-3 h-3 bg-white rounded-full animate-pulse" /> GO LIVE 🔴</>}
          </button>
        </div>
      )}

      {/* Past classes */}
      {past.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <h3 className="font-semibold text-gray-900 text-sm">Past Classes</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {past.map(c => (
              <div key={c.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{c.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {c.batches?.name || 'All'} · {new Date(c.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                  </p>
                </div>
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full font-medium capitalize">{c.platform.replace('_',' ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
EOF
echo "  ✅ LiveClass"

# ============================================================
# 4. TEACHER MESSAGES (reuse student Messages with flipped roles)
# ============================================================
cat > src/pages/teacher/Messages.jsx << 'EOF'
import { useState, useEffect, useRef } from 'react'
import { Send, ArrowLeft, MessageCircle, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

function initials(n) { return n?.split(' ').filter(Boolean).slice(0,2).map(x=>x[0].toUpperCase()).join('') ?? '?' }
function timeStr(d) {
  const date = new Date(d), now = new Date(), diff = now - date
  if (diff < 86400000) return date.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })
  return date.toLocaleDateString('en-IN', { day:'numeric', month:'short' })
}

export default function TeacherMessages() {
  const { user } = useAuth()
  const [allowed,   setAllowed]   = useState(false)
  const [contacts,  setContacts]  = useState([])
  const [selected,  setSelected]  = useState(null)
  const [messages,  setMessages]  = useState([])
  const [text,      setText]      = useState('')
  const [sending,   setSending]   = useState(false)
  const [showList,  setShowList]  = useState(true)
  const [loading,   setLoading]   = useState(true)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (!user) return
    supabase.from('teacher_profiles').select('can_message_students').eq('id', user.id).single()
      .then(({ data }) => {
        const ok = data?.can_message_students ?? false
        setAllowed(ok)
        if (!ok) { setLoading(false); return }
        supabase.from('profiles').select('id, full_name, role').eq('role', 'student').order('full_name')
          .then(({ data: students }) => { setContacts(students ?? []); setLoading(false) })
      })
  }, [user])

  useEffect(() => {
    if (!selected || !user) return
    supabase.from('messages').select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selected.id}),and(sender_id.eq.${selected.id},receiver_id.eq.${user.id})`)
      .order('created_at')
      .then(({ data }) => {
        setMessages(data ?? [])
        supabase.from('messages').update({ is_read: true }).eq('receiver_id', user.id).eq('sender_id', selected.id).eq('is_read', false).then(()=>{})
      })
  }, [selected, user])

  useEffect(() => {
    if (!user) return
    const ch = supabase.channel('teacher_msgs')
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'messages', filter:`receiver_id=eq.${user.id}` },
        p => { if (p.new.sender_id === selected?.id) setMessages(m => [...m, p.new]) })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [user, selected])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages])

  const send = async () => {
    if (!text.trim() || !selected) return
    setSending(true)
    const { data, error } = await supabase.from('messages').insert({ sender_id:user.id, receiver_id:selected.id, content:text.trim() }).select().single()
    if (error) toast.error(error.message)
    else { setMessages(m => [...m, data]); setText('') }
    setSending(false)
  }

  if (loading) return <div className="py-12 text-center text-gray-400 text-sm">Loading…</div>

  if (!allowed) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
        <Lock className="h-8 w-8 text-gray-400" />
      </div>
      <h2 className="font-bold text-xl text-gray-700">Permission Required</h2>
      <p className="text-gray-500 mt-2">Ask your admin to enable student messaging.</p>
    </div>
  )

  return (
    <div className="flex h-[calc(100vh-8rem)] lg:h-[calc(100vh-5rem)] bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className={`${showList?'flex':'hidden'} lg:flex flex-col w-full lg:w-72 border-r border-gray-100 flex-shrink-0`}>
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Students</h2>
          <p className="text-xs text-gray-500">{contacts.length} students</p>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {contacts.map(c => (
            <button key={c.id} onClick={() => { setSelected(c); setShowList(false) }}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left transition-colors ${selected?.id===c.id?'bg-blue-50':''}`}>
              <div className="w-9 h-9 rounded-full bg-blue-950 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                {initials(c.full_name)}
              </div>
              <p className="font-medium text-gray-900 text-sm">{c.full_name}</p>
            </button>
          ))}
        </div>
      </div>

      <div className={`${!showList?'flex':'hidden'} lg:flex flex-col flex-1 min-w-0`}>
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <MessageCircle className="h-12 w-12 text-gray-200 mb-3" />
            <p className="text-gray-500">Select a student to start messaging</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
              <button onClick={() => setShowList(true)} className="lg:hidden p-1 text-gray-400"><ArrowLeft className="h-5 w-5" /></button>
              <div className="w-9 h-9 rounded-full bg-blue-950 text-white text-sm font-bold flex items-center justify-center">{initials(selected.full_name)}</div>
              <p className="font-semibold text-gray-900 text-sm">{selected.full_name}</p>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
              {messages.length === 0 && <div className="text-center text-sm text-gray-400 mt-8">No messages yet.</div>}
              {messages.map(m => {
                const mine = m.sender_id === user.id
                return (
                  <div key={m.id} className={`flex ${mine?'justify-end':'justify-start'}`}>
                    <div className={`max-w-xs px-3.5 py-2 rounded-2xl text-sm ${mine?'bg-blue-950 text-white rounded-br-sm':'bg-gray-100 text-gray-900 rounded-bl-sm'}`}>
                      <p>{m.content}</p>
                      <p className={`text-xs mt-1 ${mine?'text-blue-300':'text-gray-400'}`}>{timeStr(m.created_at)}</p>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>
            <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100">
              <input value={text} onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder="Type a message…"
                className="flex-1 px-4 py-2 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white" />
              <button onClick={send} disabled={sending || !text.trim()}
                className="w-9 h-9 bg-blue-950 text-white rounded-xl flex items-center justify-center disabled:opacity-40">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
EOF
echo "  ✅ TeacherMessages"

# ============================================================
# 5. SALARY STATUS
# ============================================================
cat > src/pages/teacher/SalaryStatus.jsx << 'EOF'
import { useState, useEffect } from 'react'
import { DollarSign, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

function getMonthLabel() {
  return new Date().toLocaleDateString('en-IN', { month:'long', year:'numeric' })
}

export default function SalaryStatus() {
  const { user } = useAuth()
  const [profile,  setProfile]  = useState(null)
  const [records,  setRecords]  = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!user) return
    Promise.all([
      supabase.from('teacher_profiles').select('salary_amount, subject, qualification').eq('id', user.id).single(),
      supabase.from('salary_records').select('*').eq('teacher_id', user.id).order('created_at', { ascending: false }),
    ]).then(([p, r]) => {
      setProfile(p.data)
      setRecords(r.data ?? [])
      setLoading(false)
    })
  }, [user])

  const thisMonth = records.find(r => r.payment_month === getMonthLabel())
  const isPending = !thisMonth || thisMonth.status === 'pending'

  if (loading) return <div className="py-12 text-center text-gray-400 text-sm">Loading…</div>

  return (
    <div className="space-y-6 pb-20 lg:pb-0 max-w-2xl">

      {/* Current month status */}
      <div className="bg-gradient-to-r from-green-700 to-green-600 rounded-2xl p-6 text-white">
        <p className="text-green-100 text-sm mb-1">Current Month</p>
        <h2 className="font-bold text-3xl">₹{profile?.salary_amount?.toLocaleString('en-IN') ?? '—'}</h2>
        <p className="text-green-100 mt-1">{getMonthLabel()}</p>
        <div className="mt-4">
          {thisMonth?.status === 'paid' ? (
            <span className="inline-flex items-center gap-2 bg-white/20 px-4 py-1.5 rounded-full text-sm font-semibold">
              ✓ Paid on {new Date(thisMonth.paid_at).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 bg-yellow-400/20 px-4 py-1.5 rounded-full text-sm font-semibold text-yellow-100">
              ⏳ Pending
            </span>
          )}
        </div>
      </div>

      {/* Pending reminder */}
      {isPending && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 text-sm">Salary Pending</p>
            <p className="text-amber-700 text-xs mt-0.5">Your salary for {getMonthLabel()} hasn't been paid yet. Contact admin if needed.</p>
          </div>
        </div>
      )}

      {/* Salary history */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-gray-400" />
          <h3 className="font-semibold text-gray-900">Salary History</h3>
        </div>
        {records.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">No salary records yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Month', 'Amount', 'Method', 'Reference', 'Status', 'Paid On'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {records.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{r.payment_month}</td>
                    <td className="px-4 py-3 font-semibold text-green-700">₹{Number(r.amount).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-gray-500 capitalize">{r.payment_method || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{r.reference_id || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${r.status==='paid' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                        {r.status === 'paid' ? 'Paid' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {r.paid_at ? new Date(r.paid_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
EOF
echo "  ✅ SalaryStatus"

# ============================================================
# 6. TEACHER LAYOUT
# ============================================================
cat > src/pages/teacher/TeacherLayout.jsx << 'EOF'
import { LayoutDashboard, BookOpen, Video, MessageCircle, DollarSign } from 'lucide-react'
import DashboardShell from '../../components/layout/DashboardShell'

const NAV = [
  { label: 'Home',        path: '/teacher/dashboard',   icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Study Cards', path: '/teacher/study-cards', icon: <BookOpen className="h-4 w-4" />        },
  { label: 'Live Class',  path: '/teacher/live-class',  icon: <Video className="h-4 w-4" />           },
  { label: 'Messages',    path: '/teacher/messages',    icon: <MessageCircle className="h-4 w-4" />   },
  { label: 'Salary',      path: '/teacher/salary',      icon: <DollarSign className="h-4 w-4" />      },
]

export default function TeacherLayout() {
  return <DashboardShell navItems={NAV} pageTitle="Teacher Portal" />
}
EOF
echo "  ✅ TeacherLayout"

# ============================================================
# 7. UPDATE App.jsx with teacher routes
# ============================================================
cat > src/App.jsx << 'EOF'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider }   from './context/AuthContext'
import { ProtectedRoute } from './utils/roleGuard'
import { Toaster }        from 'react-hot-toast'

import Home     from './pages/Home'
import Login    from './pages/Login'
import Register from './pages/Register'
import { NotFound, Unauthorized, AccountSuspended } from './pages/ErrorPages'

// Student
import StudentLayout        from './pages/student/StudentLayout'
import StudentDashboard     from './pages/student/StudentDashboard'
import Attendance           from './pages/student/Attendance'
import StudySection         from './pages/student/StudySection'
import StudentMessages      from './pages/student/Messages'
import PayFee               from './pages/student/PayFee'
import StudentNotifications from './pages/student/Notifications'

// Teacher
import TeacherLayout   from './pages/teacher/TeacherLayout'
import TeacherHome     from './pages/teacher/TeacherHome'
import TeacherStudyCards from './pages/teacher/StudyCards'
import TeacherLiveClass  from './pages/teacher/LiveClass'
import TeacherMessages   from './pages/teacher/Messages'
import SalaryStatus      from './pages/teacher/SalaryStatus'

// Admin placeholder (Phase 5)
import { AdminDashboard } from './pages/Dashboards'

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" toastOptions={{
        duration: 4000,
        style: { fontFamily:'Inter,system-ui,sans-serif', fontSize:'14px', borderRadius:'10px', border:'1px solid #e5e7eb' },
        success: { iconTheme: { primary:'#16a34a', secondary:'#fff' } },
        error:   { iconTheme: { primary:'#dc2626', secondary:'#fff' } },
      }} />

      <Routes>
        {/* Public */}
        <Route path="/"                  element={<Home />}             />
        <Route path="/login"             element={<Login />}            />
        <Route path="/register"          element={<Register />}         />
        <Route path="/unauthorized"      element={<Unauthorized />}     />
        <Route path="/account-suspended" element={<AccountSuspended />} />

        {/* Student */}
        <Route element={<ProtectedRoute allowedRoles={['student']} />}>
          <Route path="/student" element={<StudentLayout />}>
            <Route path="dashboard"     element={<StudentDashboard />}     />
            <Route path="attendance"    element={<Attendance />}           />
            <Route path="study"         element={<StudySection />}         />
            <Route path="messages"      element={<StudentMessages />}      />
            <Route path="pay-fee"       element={<PayFee />}               />
            <Route path="notifications" element={<StudentNotifications />} />
          </Route>
        </Route>

        {/* Teacher */}
        <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
          <Route path="/teacher" element={<TeacherLayout />}>
            <Route path="dashboard"   element={<TeacherHome />}       />
            <Route path="study-cards" element={<TeacherStudyCards />} />
            <Route path="live-class"  element={<TeacherLiveClass />}  />
            <Route path="messages"    element={<TeacherMessages />}   />
            <Route path="salary"      element={<SalaryStatus />}      />
          </Route>
        </Route>

        {/* Admin (Phase 5) */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  )
}
EOF
echo "  ✅ App.jsx updated with teacher routes"

echo ""
echo "✅ Phase 4 complete!"
echo ""
echo "Run:  npm run dev"
echo "Then log in as a teacher to see:"
echo "  • Home with permission status cards"
echo "  • Study card management (add/edit/delete)"
echo "  • Go Live — drop a class link instantly"
echo "  • Messages with students"
echo "  • Salary history"
