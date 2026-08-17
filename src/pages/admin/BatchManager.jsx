import { useState, useEffect, useRef } from 'react'
import { Plus, Edit2, Trash2, X, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import CustomSelect from '../../components/ui/CustomSelect'
import DriveImage from '../../components/shared/DriveImage'

const EMPTY = { name: '', description: '', subjects: [], teacher_ids: [], poster_url: '' }

// Tag input: lets admin type a subject name and press Enter or comma to add it
function SubjectTagInput({ value, onChange }) {
  const [input, setInput] = useState('')
  const inputRef = useRef(null)
  const list = Array.isArray(value) ? value : []

  const add = () => {
    const trimmed = input.trim().replace(/,+$/, '')
    if (!trimmed) return
    const parts = trimmed.split(',').map(s => s.trim()).filter(Boolean)
    const next = [...new Set([...list, ...parts])]
    onChange(next)
    setInput('')
  }

  const remove = (idx) => onChange(list.filter((_, i) => i !== idx))

  const onKey = (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() }
    if (e.key === 'Backspace' && !input && list.length) remove(list.length - 1)
  }

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className="min-h-[42px] w-full px-2 py-1.5 rounded-lg border border-gray-300 focus-within:ring-2 focus-within:ring-blue-600 flex flex-wrap gap-1.5 cursor-text"
    >
      {list.map((s, i) => (
        <span key={i} className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
          {s}
          <button type="button" onClick={() => remove(i)} className="hover:text-blue-600 leading-none">×</button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={onKey}
        onBlur={add}
        placeholder={list.length === 0 ? 'Type a subject and press Enter…' : ''}
        className="flex-1 min-w-[120px] text-sm outline-none bg-transparent py-0.5"
      />
    </div>
  )
}

export default function BatchManager() {
  const [batches, setBatches] = useState([])
  const [teachers, setTeachers] = useState([])
  const [counts, setCounts] = useState({})
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      supabase.from('batches').select('*, profiles!teacher_id(full_name)').order('name'),
      supabase.from('profiles').select('id, full_name').eq('role', 'teacher').order('full_name'),
      supabase.from('student_profiles').select('batch_id'),
    ]).then(([b, t, sp]) => {
      if (cancelled) return
      setBatches(b.data ?? [])
      setTeachers(t.data ?? [])
      const c = {}; (sp.data ?? []).forEach(s => { if (s.batch_id) c[s.batch_id] = (c[s.batch_id] || 0) + 1 })
      setCounts(c)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const openAdd = () => {
    setEditing(null)
    setForm(EMPTY)
    setShowForm(true)
  }

  const openEdit = (b) => {
    setEditing(b.id)
    const ids = Array.isArray(b.teacher_ids) && b.teacher_ids.length > 0
      ? b.teacher_ids
      : (b.teacher_id ? [b.teacher_id] : [])
    setForm({
      name: b.name,
      description: b.description || '',
      subjects: b.subjects || [],
      teacher_ids: ids,
      poster_url: b.poster_url || ''
    })
    setShowForm(true)
  }

  const save = async () => {
    if (!form.name.trim()) { toast.error('Batch name is required'); return }
    setSaving(true)
    const tIds = Array.isArray(form.teacher_ids) ? form.teacher_ids : []
    const payload = {
      name: form.name.trim(),
      description: form.description || null,
      subjects: Array.isArray(form.subjects) ? form.subjects : [],
      teacher_ids: tIds,
      teacher_id: tIds[0] || null,
      poster_url: (form.poster_url || '').trim() || null
    }

    const { data, error } = editing
      ? await supabase.from('batches').update(payload).eq('id', editing).select('*, profiles!teacher_id(full_name)').maybeSingle()
      : await supabase.from('batches').insert({ ...payload, is_active: true }).select('*, profiles!teacher_id(full_name)').maybeSingle()

    setSaving(false)
    if (error) { toast.error(error.message); return }
    if (editing) setBatches(b => b.map(x => x.id === editing ? data : x))
    else setBatches(b => [...b, data])
    setShowForm(false)
    toast.success(editing ? 'Batch updated!' : 'Batch created!')
  }

  const toggleActive = async (b) => {
    const { data, error } = await supabase.from('batches').update({ is_active: !b.is_active }).eq('id', b.id).select('*, profiles!teacher_id(full_name)').maybeSingle()
    if (error) { toast.error(error.message); return }
    if (data) setBatches(list => list.map(x => x.id === b.id ? data : x))
  }

  const deleteBatch = async (id) => {
    if ((counts[id] || 0) > 0) { toast.error('Cannot delete — students are enrolled in this batch'); return }
    setDeleting(id)
    const { error } = await supabase.from('batches').delete().eq('id', id)
    setDeleting(null)
    if (error) { toast.error(error.message); return }
    setBatches(b => b.filter(x => x.id !== id))
    toast.success('Batch deleted')
  }

  const getTeacherNames = (b) => {
    const tIds = Array.isArray(b.teacher_ids) && b.teacher_ids.length > 0
      ? b.teacher_ids
      : (b.teacher_id ? [b.teacher_id] : [])
    if (tIds.length === 0) return b.profiles?.full_name || null
    const names = teachers.filter(t => tIds.includes(t.id)).map(t => t.full_name)
    return names.length > 0 ? names.join(', ') : (b.profiles?.full_name || null)
  }

  if (loading) return <div className="py-12 text-center text-gray-400 text-sm">Loading…</div>

  return (
    <div className="space-y-5 pb-20 lg:pb-0">
      <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
        <h2 className="font-bold text-lg sm:text-xl text-gray-900 truncate">Batches</h2>
        <button onClick={openAdd} className="inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 bg-blue-950 text-white text-xs sm:text-sm font-bold rounded-xl hover:bg-blue-900 shadow-xs transition-all shrink-0 whitespace-nowrap active:scale-95">
          <Plus className="h-4 w-4 shrink-0" /> Add Batch
        </button>
      </div>

      {batches.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <p className="text-gray-400">No batches yet. Create your first batch!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {batches.map(b => {
            const teacherNames = getTeacherNames(b)
            return (
              <div key={b.id} className={`bg-white rounded-xl border ${b.is_active ? 'border-gray-100' : 'border-gray-200 opacity-60'} p-4`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900">{b.name}</h3>
                    {b.subjects?.length > 0 && (
                      <p className="text-sm text-gray-500">{b.subjects.join(', ')}</p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${b.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {b.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {b.description && <p className="text-xs text-gray-500 mb-3">{b.description}</p>}
                <div className="flex items-center gap-3 text-sm text-gray-500 mb-4 flex-wrap">
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {counts[b.id] || 0} students</span>
                  {teacherNames && <span>· {teacherNames}</span>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(b)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors">
                    <Edit2 className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button onClick={() => toggleActive(b)} className={`px-2.5 py-1.5 text-xs rounded-lg font-medium transition-colors ${b.is_active ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
                    {b.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => deleteBatch(b.id)} disabled={deleting === b.id}
                    className="p-1.5 text-gray-400 hover:text-red-600 transition-colors ml-auto">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90dvh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">{editing ? 'Edit Batch' : 'Create Batch'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Batch Name <span className="text-red-500">*</span></label>
                <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Class 10 Science"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Subjects</label>
                <SubjectTagInput value={form.subjects} onChange={v => set('subjects', v)} />
                <p className="mt-1 text-xs text-gray-400">Type each subject and press Enter. Students will choose from these when enrolling.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <input value={form.description} onChange={e => set('description', e.target.value)} placeholder="Brief description…"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Assign Teachers</label>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5 min-h-[42px] p-2 bg-slate-50 border border-gray-300 rounded-lg items-center">
                    {(form.teacher_ids || []).length === 0 ? (
                      <span className="text-xs text-gray-400">No teachers assigned</span>
                    ) : (
                      (form.teacher_ids || []).map(id => {
                        const t = teachers.find(x => x.id === id)
                        return (
                          <span key={id} className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-1 rounded-full">
                            {t?.full_name || 'Teacher'}
                            <button
                              type="button"
                              onClick={() => set('teacher_ids', form.teacher_ids.filter(tId => tId !== id))}
                              className="hover:text-blue-900 font-bold"
                            >
                              ×
                            </button>
                          </span>
                        )
                      })
                    )}
                  </div>
                  <CustomSelect
                    value=""
                    onChange={val => {
                      if (val && !(form.teacher_ids || []).includes(val)) {
                        set('teacher_ids', [...(form.teacher_ids || []), val])
                      }
                    }}
                    placeholder="+ Add teacher to batch…"
                    options={[
                      { value: '', label: '+ Add teacher to batch…' },
                      ...teachers
                        .filter(t => !(form.teacher_ids || []).includes(t.id))
                        .map(t => ({ value: t.id, label: t.full_name }))
                    ]}
                  />
                </div>
              </div>
              {/* ── Batch Poster ── */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Batch Poster <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  value={form.poster_url}
                  onChange={e => set('poster_url', e.target.value)}
                  placeholder="Paste Google Drive shareable link…"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Share the file in Google Drive → Copy link → paste here. File must be set to <strong>&quot;Anyone with the link can view&quot;</strong>.
                </p>
                {/* Live preview */}
                {form.poster_url.trim() && (
                  <div className="mt-2.5 relative w-36 rounded-xl overflow-hidden border border-gray-200 bg-slate-900/90 aspect-[9/16] p-0.5 flex items-center justify-center">
                    <DriveImage
                      src={form.poster_url.trim()}
                      alt="Poster preview"
                      className="w-full h-full object-contain rounded-lg"
                      fallback={
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 text-[11px] text-amber-600 bg-amber-50 rounded-lg">
                          <p className="font-bold leading-tight mb-1">⚠️ Private Link</p>
                          <p className="text-[10px] text-gray-500 leading-tight">In Google Drive, set access to <strong>&quot;Anyone with link&quot;</strong>.</p>
                        </div>
                      }
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200 rounded-xl transition-colors">
                Cancel
              </button>
              <button type="button" onClick={save} disabled={saving} className="px-5 py-2 text-xs font-bold text-white bg-blue-950 hover:bg-blue-900 rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50">
                {saving ? 'Saving…' : (editing ? 'Save Changes' : 'Create Batch')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
