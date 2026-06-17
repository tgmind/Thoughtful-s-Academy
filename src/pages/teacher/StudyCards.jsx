import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Lock, X, Eye, EyeOff, Youtube, Globe } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

function getYTVideoId(url) {
  const match = url?.match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/|live\/)([^#&?/]{11})/)
  return match?.[1] ?? null
}

function getYTThumb(url) {
  const id = getYTVideoId(url)
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null
}

const TYPES = [
  { value: 'youtube_video',    label: 'YouTube Video'    },
  { value: 'youtube_playlist', label: 'YouTube Playlist' },
  { value: 'google_drive',     label: 'Google Drive'     },
  { value: 'external_link',    label: 'External Link'    },
]

const EMPTY = {
  title: '', description: '', type: 'youtube_video', url: '',
  is_public: false, batch_ids: [], subject: '', display_order: 0, is_featured: false,
}

// Returns unique union of subjects across all given batch objects
function unionSubjects(batches, selectedIds) {
  const set = new Set()
  batches.filter(b => selectedIds.includes(b.id)).forEach(b => (b.subjects ?? []).forEach(s => set.add(s)))
  return [...set].sort()
}

export default function StudyCards({ isAdmin = false }) {
  const { user } = useAuth()
  const [allowed,  setAllowed]  = useState(isAdmin)
  const [cards,    setCards]    = useState([])
  const [batches,  setBatches]  = useState([])   // includes subjects[] per batch
  const [showForm, setShowForm] = useState(false)
  const [editing,  setEditing]  = useState(null)
  const [form,     setForm]     = useState(EMPTY)
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [playlistThumb, setPlaylistThumb] = useState(null)

  useEffect(() => {
    if (form.type !== 'youtube_playlist' || !form.url.trim()) {
      setPlaylistThumb(null)
      return
    }
    // If the URL contains a video ID (e.g. watch?v=...&list=...) getYTThumb handles it
    if (getYTVideoId(form.url)) {
      setPlaylistThumb(null)
      return
    }
    const controller = new AbortController()
    fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(form.url.trim())}&format=json`,
      { signal: controller.signal }
    )
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.thumbnail_url) setPlaylistThumb(d.thumbnail_url) })
      .catch(() => {})
    return () => controller.abort()
  }, [form.url, form.type])

  useEffect(() => {
    if (!user) return
    const checks = isAdmin
      ? Promise.resolve(true)
      : supabase.from('teacher_profiles').select('can_manage_study_cards').eq('id', user.id).maybeSingle()
          .then(({ data }) => data?.can_manage_study_cards ?? false)

    checks.then(ok => {
      setAllowed(ok)
      if (!ok) { setLoading(false); return }
      Promise.all([
        isAdmin
          ? supabase.from('study_cards').select('*').order('display_order')
          : supabase.from('study_cards').select('*').eq('added_by', user.id).order('display_order'),
        supabase.from('batches').select('id, name, subjects').eq('is_active', true).order('name'),
      ]).then(([c, b]) => { setCards(c.data ?? []); setBatches(b.data ?? []); setLoading(false) })
    })
  }, [user, isAdmin])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const toggleBatch = (batchId) => {
    setForm(f => {
      const already = f.batch_ids.includes(batchId)
      const next = already ? f.batch_ids.filter(id => id !== batchId) : [...f.batch_ids, batchId]
      // clear subject if no batches selected and subject no longer in union
      const available = unionSubjects(batches, next)
      return { ...f, batch_ids: next, subject: available.includes(f.subject) ? f.subject : '' }
    })
  }

  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowForm(true) }
  const openEdit = (c) => {
    setEditing(c.id)
    setForm({
      title:         c.title,
      description:   c.description || '',
      type:          c.type,
      url:           c.url,
      is_public:     c.is_public ?? (c.batch_id == null),   // fallback for old rows
      batch_ids:     c.batch_ids?.length > 0 ? c.batch_ids : (c.batch_id ? [c.batch_id] : []),
      subject:       c.subject || '',
      display_order: c.display_order,
      is_featured:   c.is_featured,
    })
    setShowForm(true)
  }

  const save = async () => {
    if (!form.title.trim() || !form.url.trim()) { toast.error('Title and URL are required'); return }
    if (!form.is_public && form.batch_ids.length === 0) { toast.error('Select at least one visibility option'); return }
    if (form.batch_ids.length > 0 && !form.subject.trim()) { toast.error('Subject is required when a batch is selected'); return }
    setSaving(true)
    const payload = {
      title:         form.title.trim(),
      description:   form.description.trim() || null,
      type:          form.type,
      url:           form.url.trim(),
      thumbnail_url: thumb || null,
      is_public:     form.is_public,
      batch_ids:     form.batch_ids,
      subject:       form.batch_ids.length > 0 ? (form.subject || null) : null,
      display_order: form.display_order,
      is_featured:   form.is_featured,
    }
    // Only set ownership/active on create — never reassign added_by when an
    // admin edits a card a teacher made (that would revoke the teacher's
    // RLS rights to manage their own card).
    const { data, error } = editing
      ? await supabase.from('study_cards').update(payload).eq('id', editing).select().single()
      : await supabase.from('study_cards').insert({ ...payload, added_by: user.id, is_active: true }).select().single()
    setSaving(false)
    if (error) { toast.error(error.message); return }
    if (editing) setCards(c => c.map(x => x.id === editing ? data : x))
    else         setCards(c => [...c, data])
    setShowForm(false)
    toast.success(editing ? 'Card updated!' : 'Card added!')
  }

  const toggleActive = async (card) => {
    const { data, error } = await supabase.from('study_cards').update({ is_active: !card.is_active }).eq('id', card.id).select().single()
    if (error) { toast.error(error.message); return }
    if (data) setCards(c => c.map(x => x.id === card.id ? data : x))
  }

  const deleteCard = async (id) => {
    setDeleting(id)
    const { error } = await supabase.from('study_cards').delete().eq('id', id)
    setDeleting(null)
    if (error) { toast.error(error.message); return }
    setCards(c => c.filter(x => x.id !== id))
    toast.success('Deleted')
  }

  const thumb = (form.type === 'youtube_video' || form.type === 'youtube_playlist')
    ? (getYTThumb(form.url) ?? playlistThumb)
    : null
  const availableSubjects = unionSubjects(batches, form.batch_ids)

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
            const cardThumb = c.thumbnail_url || getYTThumb(c.url)
            // resolve batch names for this card
            const cardBatches = (c.batch_ids ?? (c.batch_id ? [c.batch_id] : []))
              .map(id => batches.find(b => b.id === id)?.name ?? 'Batch')
            const isPublic = c.is_public ?? (c.batch_id == null)
            return (
              <div key={c.id} className={`bg-white rounded-xl border border-gray-100 flex items-center gap-3 p-3 ${!c.is_active ? 'opacity-50' : ''}`}>
                {cardThumb
                  ? <img src={cardThumb} alt="" className="w-16 h-12 rounded-lg object-cover flex-shrink-0" />
                  : <div className="w-16 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Youtube className="h-5 w-5 text-gray-300" />
                    </div>
                }
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{c.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-gray-400">{c.type.replace('_', ' ')}</span>
                    {c.is_featured && <span className="text-xs text-amber-600">⭐ Featured</span>}
                    {isPublic && (
                      <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                        <Globe className="h-3 w-3" /> Public
                      </span>
                    )}
                    {cardBatches.map(name => (
                      <span key={name} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
                        {name}
                      </span>
                    ))}
                    {c.subject && (
                      <span className="text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded-full font-medium">
                        {c.subject}
                      </span>
                    )}
                  </div>
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

              {/* Visibility — multi-select checklist */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Visibility <span className="text-red-500">*</span>
                </label>
                <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
                  {/* Public option */}
                  <label className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${form.is_public ? 'bg-green-50' : 'bg-white hover:bg-gray-50'}`}>
                    <input type="checkbox" checked={form.is_public} onChange={e => set('is_public', e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500" />
                    <Globe className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">Public</p>
                      <p className="text-xs text-gray-400">Visible on homepage — no login needed</p>
                    </div>
                  </label>
                  {/* Per-batch options */}
                  {batches.map(b => {
                    const checked = form.batch_ids.includes(b.id)
                    return (
                      <label key={b.id} className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${checked ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'}`}>
                        <input type="checkbox" checked={checked} onChange={() => toggleBatch(b.id)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{b.name}</p>
                          <p className="text-xs text-gray-400">Enrolled students only</p>
                        </div>
                      </label>
                    )
                  })}
                </div>
                {!form.is_public && form.batch_ids.length === 0 && (
                  <p className="mt-1.5 text-xs text-red-500">Select at least one option.</p>
                )}
              </div>

              {/* Subject — shown only when at least one batch is selected */}
              {form.batch_ids.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  {availableSubjects.length > 0 ? (
                    <select value={form.subject} onChange={e => set('subject', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm">
                      <option value="">— Select subject —</option>
                      {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <input value={form.subject} onChange={e => set('subject', e.target.value)} placeholder="e.g. Physics"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm" />
                  )}
                  <p className="mt-1 text-xs text-gray-400">Students find this card under this subject in My Batch.</p>
                </div>
              )}

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
