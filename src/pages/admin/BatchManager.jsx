import { useState, useEffect, useRef } from 'react'
import { Plus, Edit2, Trash2, X, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'

const EMPTY = { name:'', description:'', subjects:[], teacher_id:'' }

// Tag input: lets admin type a subject name and press Enter or comma to add it
function SubjectTagInput({ value, onChange }) {
  const [input, setInput] = useState('')
  const inputRef = useRef(null)

  const add = () => {
    const trimmed = input.trim().replace(/,+$/, '')
    if (!trimmed) return
    const parts = trimmed.split(',').map(s => s.trim()).filter(Boolean)
    const next = [...new Set([...value, ...parts])]
    onChange(next)
    setInput('')
  }

  const remove = (idx) => onChange(value.filter((_, i) => i !== idx))

  const onKey = (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() }
    if (e.key === 'Backspace' && !input && value.length) remove(value.length - 1)
  }

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className="min-h-[42px] w-full px-2 py-1.5 rounded-lg border border-gray-300 focus-within:ring-2 focus-within:ring-blue-600 flex flex-wrap gap-1.5 cursor-text"
    >
      {value.map((s, i) => (
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
        placeholder={value.length === 0 ? 'Type a subject and press Enter…' : ''}
        className="flex-1 min-w-[120px] text-sm outline-none bg-transparent py-0.5"
      />
    </div>
  )
}

export default function BatchManager() {
  const [batches,   setBatches]   = useState([])
  const [teachers,  setTeachers]  = useState([])
  const [counts,    setCounts]    = useState({})
  const [showForm,  setShowForm]  = useState(false)
  const [editing,   setEditing]   = useState(null)
  const [form,      setForm]      = useState(EMPTY)
  const [saving,    setSaving]    = useState(false)
  const [deleting,  setDeleting]  = useState(null)
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('batches').select('*, profiles!teacher_id(full_name)').order('name'),
      supabase.from('profiles').select('id, full_name').eq('role','teacher').order('full_name'),
      supabase.from('student_profiles').select('batch_id'),
    ]).then(([b, t, sp]) => {
      setBatches(b.data ?? [])
      setTeachers(t.data ?? [])
      const c = {}; (sp.data ?? []).forEach(s => { if (s.batch_id) c[s.batch_id] = (c[s.batch_id]||0)+1 })
      setCounts(c)
      setLoading(false)
    })
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const openAdd  = () => { setEditing(null); setForm(EMPTY); setShowForm(true) }
  const openEdit = (b) => { setEditing(b.id); setForm({ name:b.name, description:b.description||'', subjects:b.subjects||[], teacher_id:b.teacher_id||'' }); setShowForm(true) }

  const save = async () => {
    if (!form.name.trim()) { toast.error('Batch name is required'); return }
    setSaving(true)
    const payload = { name: form.name, description: form.description, subjects: form.subjects, teacher_id: form.teacher_id || null }
    const { data, error } = editing
      ? await supabase.from('batches').update(payload).eq('id', editing).select('*, profiles!teacher_id(full_name)').single()
      : await supabase.from('batches').insert({ ...payload, is_active:true }).select('*, profiles!teacher_id(full_name)').single()
    setSaving(false)
    if (error) { toast.error(error.message); return }
    if (editing) setBatches(b => b.map(x => x.id === editing ? data : x))
    else         setBatches(b => [...b, data])
    setShowForm(false)
    toast.success(editing ? 'Batch updated!' : 'Batch created!')
  }

  const toggleActive = async (b) => {
    const { data } = await supabase.from('batches').update({ is_active: !b.is_active }).eq('id', b.id).select('*, profiles!teacher_id(full_name)').single()
    if (data) setBatches(list => list.map(x => x.id === b.id ? data : x))
  }

  const deleteBatch = async (id) => {
    if ((counts[id]||0) > 0) { toast.error('Cannot delete — students are enrolled in this batch'); return }
    setDeleting(id)
    await supabase.from('batches').delete().eq('id', id)
    setBatches(b => b.filter(x => x.id !== id))
    setDeleting(null)
    toast.success('Batch deleted')
  }

  if (loading) return <div className="py-12 text-center text-gray-400 text-sm">Loading…</div>

  return (
    <div className="space-y-5 pb-20 lg:pb-0">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-lg text-gray-900">Batches</h2>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-950 text-white text-sm font-semibold rounded-xl hover:bg-blue-900 transition-colors">
          <Plus className="h-4 w-4" /> Add Batch
        </button>
      </div>

      {batches.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <p className="text-gray-400">No batches yet. Create your first batch!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {batches.map(b => (
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
              <div className="flex items-center gap-3 text-sm text-gray-500 mb-4">
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {counts[b.id]||0} students</span>
                {b.profiles?.full_name && <span>· {b.profiles.full_name}</span>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(b)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors">
                  <Edit2 className="h-3.5 w-3.5" /> Edit
                </button>
                <button onClick={() => toggleActive(b)} className={`px-2.5 py-1.5 text-xs rounded-lg font-medium transition-colors ${b.is_active ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
                  {b.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={() => deleteBatch(b.id)} disabled={deleting===b.id}
                  className="p-1.5 text-gray-400 hover:text-red-600 transition-colors ml-auto">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">{editing ? 'Edit Batch' : 'Create Batch'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5 space-y-4">
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
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Assign Teacher</label>
                <select value={form.teacher_id} onChange={e => set('teacher_id', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm">
                  <option value="">No teacher assigned</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl font-semibold text-sm">Cancel</button>
                <button onClick={save} disabled={saving} className="flex-1 py-2.5 bg-blue-950 text-white font-bold rounded-xl hover:bg-blue-900 disabled:opacity-50 text-sm">
                  {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
