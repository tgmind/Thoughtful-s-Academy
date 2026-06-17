import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, X, Eye, EyeOff, ClipboardList, ExternalLink, Users, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { normalizeUrl } from '../../utils/formatters'

const EMPTY = { title: '', description: '', drive_link: '', batch_id: '', due_date: '' }

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── One submission row with inline grade + feedback editing ──────────────────
function SubmissionRow({ sub, onSave }) {
  const [grade, setGrade]       = useState(sub.grade ?? '')
  const [feedback, setFeedback] = useState(sub.feedback ?? '')
  const [saving, setSaving]     = useState(false)
  const dirty = (grade !== (sub.grade ?? '')) || (feedback !== (sub.feedback ?? ''))

  const save = async () => {
    setSaving(true)
    await onSave(sub.id, grade.trim(), feedback.trim())
    setSaving(false)
  }

  return (
    <div className="border border-gray-100 rounded-xl p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{sub.profiles?.full_name ?? 'Student'}</p>
          <p className="text-xs text-gray-400 truncate">{sub.profiles?.email}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Submitted {new Date(sub.submitted_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <a href={normalizeUrl(sub.drive_link)} target="_blank" rel="noopener noreferrer"
          className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg hover:bg-blue-100 transition-colors">
          <ExternalLink className="h-3.5 w-3.5" /> Open
        </a>
      </div>
      <div className="flex items-end gap-2 mt-3">
        <div className="w-24">
          <label className="block text-[11px] font-medium text-gray-500 mb-1">Grade</label>
          <input value={grade} onChange={e => setGrade(e.target.value)} placeholder="e.g. A / 8"
            className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm" />
        </div>
        <div className="flex-1">
          <label className="block text-[11px] font-medium text-gray-500 mb-1">Feedback</label>
          <input value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="Optional note for the student"
            className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm" />
        </div>
        <button onClick={save} disabled={!dirty || saving}
          className="px-3 py-1.5 bg-blue-950 text-white text-sm font-semibold rounded-lg hover:bg-blue-900 disabled:opacity-40 transition-colors">
          {saving ? '…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

export default function Homework({ isAdmin = false }) {
  const { user } = useAuth()
  const [items,    setItems]    = useState([])
  const [batches,  setBatches]  = useState([])
  const [counts,   setCounts]   = useState({})   // homework_id -> submission count
  const [showForm, setShowForm] = useState(false)
  const [editing,  setEditing]  = useState(null)
  const [form,     setForm]     = useState(EMPTY)
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [loading,  setLoading]  = useState(true)

  // Submissions drawer
  const [subFor,      setSubFor]      = useState(null)
  const [subs,        setSubs]        = useState([])
  const [subsLoading, setSubsLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false

    const load = async () => {
      const hwQuery = isAdmin
        ? supabase.from('homework').select('*, batches(name)').order('created_at', { ascending: false })
        : supabase.from('homework').select('*, batches(name)').eq('teacher_id', user.id).order('created_at', { ascending: false })
      const [hw, b] = await Promise.all([
        hwQuery,
        supabase.from('batches').select('id, name').eq('is_active', true).order('name'),
      ])
      if (cancelled) return
      const list = hw.data ?? []
      setItems(list)
      setBatches(b.data ?? [])
      setLoading(false)

      const ids = list.map(h => h.id)
      if (ids.length) {
        const { data: subRows } = await supabase.from('homework_submissions').select('homework_id').in('homework_id', ids)
        if (cancelled) return
        const c = {}
        ;(subRows ?? []).forEach(s => { c[s.homework_id] = (c[s.homework_id] || 0) + 1 })
        setCounts(c)
      }
    }

    load()
    return () => { cancelled = true }
  }, [user, isAdmin])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const openAdd  = () => { setEditing(null); setForm(EMPTY); setShowForm(true) }
  const openEdit = (h) => {
    setEditing(h.id)
    setForm({
      title:       h.title,
      description: h.description || '',
      drive_link:  h.drive_link,
      batch_id:    h.batch_id || '',
      due_date:    h.due_date || '',
    })
    setShowForm(true)
  }

  const save = async () => {
    if (saving) return
    if (!form.title.trim() || !form.drive_link.trim()) { toast.error('Title and assignment link are required'); return }
    if (!form.batch_id) { toast.error('Please choose a batch'); return }
    setSaving(true)
    const payload = {
      title:       form.title.trim(),
      description: form.description.trim() || null,
      drive_link:  normalizeUrl(form.drive_link),
      batch_id:    form.batch_id,
      due_date:    form.due_date || null,
    }
    const { data, error } = editing
      ? await supabase.from('homework').update(payload).eq('id', editing).select('*, batches(name)').single()
      : await supabase.from('homework').insert({ ...payload, teacher_id: user.id, is_active: true }).select('*, batches(name)').single()
    setSaving(false)
    if (error) { toast.error(error.message); return }
    if (editing) setItems(l => l.map(x => x.id === editing ? data : x))
    else         setItems(l => [data, ...l])
    setShowForm(false)
    toast.success(editing ? 'Homework updated!' : 'Homework assigned!')
  }

  const toggleActive = async (h) => {
    const { data, error } = await supabase.from('homework').update({ is_active: !h.is_active }).eq('id', h.id).select('*, batches(name)').single()
    if (error) { toast.error(error.message); return }
    if (data) setItems(l => l.map(x => x.id === h.id ? data : x))
  }

  const remove = async (id) => {
    setDeleting(id)
    const { error } = await supabase.from('homework').delete().eq('id', id)
    setDeleting(null)
    if (error) { toast.error(error.message); return }
    setItems(l => l.filter(x => x.id !== id))
    if (subFor?.id === id) setSubFor(null)
    toast.success('Deleted')
  }

  const openSubs = async (h) => {
    setSubFor(h)
    setSubsLoading(true)
    setSubs([])
    const { data, error } = await supabase.from('homework_submissions')
      .select('*, profiles!student_id(full_name, email)')
      .eq('homework_id', h.id)
      .order('submitted_at', { ascending: false })
    if (error) toast.error(error.message)
    setSubs(data ?? [])
    setSubsLoading(false)
  }

  const grade = async (subId, gradeVal, feedbackVal) => {
    const { data, error } = await supabase.from('homework_submissions')
      .update({ grade: gradeVal || null, feedback: feedbackVal || null })
      .eq('id', subId)
      .select('*, profiles!student_id(full_name, email)')
      .single()
    if (error) { toast.error(error.message); return }
    if (data) setSubs(s => s.map(x => x.id === subId ? data : x))
    toast.success('Saved')
  }

  if (loading) return <div className="py-12 text-center text-gray-400 text-sm">Loading…</div>

  return (
    <div className="space-y-5 pb-20 lg:pb-0">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-lg text-gray-900">Homework</h2>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-950 text-white text-sm font-semibold rounded-xl hover:bg-blue-900 transition-colors">
          <Plus className="h-4 w-4" /> Assign Homework
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <ClipboardList className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">No homework assigned yet. Create your first one!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(h => {
            const overdue = h.due_date && new Date(h.due_date) < new Date(todayISO())
            return (
              <div key={h.id} className={`bg-white rounded-xl border border-gray-100 p-4 ${!h.is_active ? 'opacity-60' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">{h.batches?.name || 'Batch'}</span>
                      {h.due_date && (
                        <span className={`text-xs font-medium ${overdue ? 'text-red-600' : 'text-amber-600'}`}>
                          {overdue ? '⚠ Due' : '📅 Due'} {new Date(h.due_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                      {!h.is_active && <span className="text-xs text-gray-400 font-medium">Hidden</span>}
                    </div>
                    <h3 className="font-semibold text-gray-900">{h.title}</h3>
                    {h.description && <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{h.description}</p>}
                    <div className="flex items-center gap-3 mt-2">
                      <a href={normalizeUrl(h.drive_link)} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                        <ExternalLink className="h-3.5 w-3.5" /> Assignment link
                      </a>
                      <button onClick={() => openSubs(h)}
                        className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 font-medium">
                        <Users className="h-3.5 w-3.5" /> {counts[h.id] || 0} submission{(counts[h.id] || 0) !== 1 ? 's' : ''}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => toggleActive(h)} title={h.is_active ? 'Hide from students' : 'Show to students'}
                      className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors">
                      {h.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                    <button onClick={() => openEdit(h)} className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => remove(h.id)} disabled={deleting === h.id}
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

      {/* Add / Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <h3 className="font-bold text-gray-900">{editing ? 'Edit Homework' : 'Assign Homework'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Title <span className="text-red-500">*</span></label>
                <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Chapter 7 — Problem Set"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} placeholder="Instructions for students…"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Assignment Link <span className="text-red-500">*</span></label>
                <input value={form.drive_link} onChange={e => set('drive_link', e.target.value)} placeholder="Google Drive / document link"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Batch <span className="text-red-500">*</span></label>
                  <select value={form.batch_id} onChange={e => set('batch_id', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm">
                    <option value="">Select batch…</option>
                    {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Due Date (optional)</label>
                  <input type="date" value={form.due_date} min={todayISO()} onChange={e => set('due_date', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm" />
                </div>
              </div>
              {batches.length === 0 && (
                <p className="text-xs text-amber-600">No active batches yet — create a batch first so students can be targeted.</p>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl font-semibold text-sm">Cancel</button>
                <button onClick={save} disabled={saving} className="flex-1 py-2.5 bg-blue-950 text-white font-bold rounded-xl hover:bg-blue-900 disabled:opacity-50 text-sm">
                  {saving ? 'Saving…' : editing ? 'Update' : 'Assign'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submissions drawer */}
      {subFor && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/30" onClick={() => setSubFor(null)} />
          <div className="relative w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="font-bold text-gray-900 truncate">Submissions</h3>
                <p className="text-xs text-gray-400 truncate">{subFor.title}</p>
              </div>
              <button onClick={() => setSubFor(null)} className="p-1 text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              {subsLoading ? (
                <p className="text-center text-gray-400 text-sm py-8">Loading…</p>
              ) : subs.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-9 w-9 text-gray-200 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No submissions yet.</p>
                </div>
              ) : (
                subs.map(s => <SubmissionRow key={s.id} sub={s} onSave={grade} />)
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
