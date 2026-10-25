import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Edit2, Trash2, X, Users, Layers, Calendar, Zap, BookOpen, Shield, GraduationCap, ArrowRight, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import CustomSelect from '../../components/ui/CustomSelect'
import DriveImage from '../../components/shared/DriveImage'
import { formatBatchFeeBadge } from '../../utils/feeAccess'
import BatchSubjectSyncModal from '../../components/admin/BatchSubjectSyncModal'

const EMPTY = {
  name: '',
  description: '',
  subjects: [],
  teacher_ids: [],
  poster_url: '',
  fee_mode: 'monthly',
  fee_amount: '',
  validity_type: 'days',
  validity_days: '',
  validity_end_date: '',
}

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
      className="min-h-[46px] w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-blue-600 focus-within:border-transparent flex flex-wrap items-center gap-1.5 cursor-text transition-all shadow-2xs"
    >
      {list.map((s, i) => (
        <span key={i} className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-lg border border-indigo-200/80 shadow-2xs">
          <span>{s}</span>
          <button type="button" onClick={() => remove(i)} className="hover:text-indigo-950 font-black text-sm leading-none cursor-pointer">×</button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={onKey}
        onBlur={add}
        placeholder={list.length === 0 ? 'Type a subject and press Enter…' : ''}
        className="flex-1 min-w-[130px] text-xs font-medium text-slate-800 placeholder-slate-400 outline-none bg-transparent py-1"
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
  const [syncModal, setSyncModal] = useState({ isOpen: false, batch: null, addedSubjects: [] })

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
      poster_url: b.poster_url || '',
      fee_mode: b.fee_mode || 'monthly',
      fee_amount: b.fee_amount != null && b.fee_amount !== 0 ? String(b.fee_amount) : '',
      validity_type: b.validity_end_date ? 'date' : 'days',
      validity_days: b.validity_days != null ? String(b.validity_days) : '',
      validity_end_date: b.validity_end_date || '',
    })
    setShowForm(true)
  }

  const save = async () => {
    if (!form.name.trim()) { toast.error('Batch name is required'); return }
    setSaving(true)

    // Detect newly added subjects if editing an existing batch
    const oldBatch = editing ? batches.find(b => b.id === editing) : null
    const oldSubjects = Array.isArray(oldBatch?.subjects) ? oldBatch.subjects : []
    const newSubjects = Array.isArray(form.subjects) ? form.subjects : []
    const addedSubjects = newSubjects.filter(s => !oldSubjects.includes(s))
    const studentCount = editing ? (counts[editing] || 0) : 0

    const tIds = Array.isArray(form.teacher_ids) ? form.teacher_ids : []
    const feeAmountNum = form.fee_amount ? parseFloat(form.fee_amount) : 0
    const payload = {
      name: form.name.trim(),
      description: form.description || null,
      subjects: Array.isArray(form.subjects) ? form.subjects : [],
      teacher_ids: tIds,
      teacher_id: tIds[0] || null,
      poster_url: (form.poster_url || '').trim() || null,
      fee_mode: form.fee_mode || 'monthly',
      fee_amount: isNaN(feeAmountNum) ? 0 : feeAmountNum,
      validity_days: form.fee_mode === 'one_time' && form.validity_type === 'days' && form.validity_days ? parseInt(form.validity_days, 10) : null,
      validity_end_date: form.fee_mode === 'one_time' && form.validity_type === 'date' && form.validity_end_date ? form.validity_end_date : null,
    }

    const { data, error } = editing
      ? await supabase.from('batches').update(payload).eq('id', editing).select('*, profiles!teacher_id(full_name)').maybeSingle()
      : await supabase.from('batches').insert({ ...payload, is_active: true }).select('*, profiles!teacher_id(full_name)').maybeSingle()

    setSaving(false)
    if (error) { toast.error(error.message); return }
    if (editing) setBatches(b => b.map(x => x.id === editing ? data : x))
    else setBatches(b => [...b, data])
    setShowForm(false)

    // If new subjects were added to an existing batch that has enrolled students, prompt sync
    if (editing && addedSubjects.length > 0 && studentCount > 0) {
      setSyncModal({
        isOpen: true,
        batch: data,
        addedSubjects,
      })
    } else {
      toast.success(editing ? 'Batch updated!' : 'Batch created!')
    }
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

  if (loading) {
    return (
      <div className="space-y-5 pb-28 sm:pb-32 lg:pb-12 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-6 w-32 bg-slate-200 rounded-lg" />
          <div className="h-9 w-28 bg-slate-200 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 h-40" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-28 sm:pb-32 lg:pb-12">
      {/* Executive Header Banner */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200/80">
              <Layers className="h-3 w-3 text-indigo-600" /> Academic Cohorts
            </span>
            <span className="text-xs font-bold text-slate-400">•</span>
            <span className="text-xs font-bold text-slate-500">{batches.length} Active Streams</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Batches & Course Management</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Configure cohorts, curriculum modules, faculty assignments and fee schedules</p>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Link
            to="/admin/batch-details"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-bold rounded-xl border border-slate-300 shadow-2xs transition-all shrink-0 cursor-pointer"
            title="Edit batch curriculum, faculty profiles, and manage landing page featured lectures"
          >
            <BookOpen className="h-4 w-4 text-blue-900" />
            <span>Batch Details & Featured</span>
          </Link>
          <button
            onClick={openAdd}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-950 to-indigo-950 hover:from-blue-900 hover:to-indigo-900 text-white text-xs sm:text-sm font-extrabold rounded-xl shadow-xs transition-all shrink-0 whitespace-nowrap active:scale-95 cursor-pointer"
          >
            <Plus className="h-4 w-4 shrink-0" /> Add New Batch
          </button>
        </div>
      </div>

      {batches.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/80 p-8 shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
            <Layers className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">No Batches Configured Yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">Start by creating your first student cohort to enable curriculum access and fee tracking.</p>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-950 text-white text-xs font-bold rounded-xl hover:bg-blue-900 cursor-pointer shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" /> Create Batch Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {batches.map(b => {
            const teacherNames = getTeacherNames(b)
            const feeBadge = formatBatchFeeBadge(b)
            return (
              <div
                key={b.id}
                className={`bg-white rounded-2xl border transition-all duration-200 p-4 sm:p-5 flex flex-col justify-between shadow-2xs hover:shadow-md ${
                  b.is_active ? 'border-slate-200/90' : 'border-slate-200 opacity-65 bg-slate-50/50'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase border ${
                          b.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {b.is_active ? 'Active' : 'Inactive'}
                        </span>
                        {feeBadge && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${feeBadge.color}`}>
                            {feeBadge.text}
                          </span>
                        )}
                      </div>
                      <h3 className="font-extrabold text-slate-900 text-base tracking-tight truncate">{b.name}</h3>
                    </div>
                  </div>

                  {b.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 mb-3 font-medium">{b.description}</p>
                  )}

                  {/* Subject Pills */}
                  {b.subjects?.length > 0 && (
                    <div className="mb-3.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Curriculum Modules</span>
                      <div className="flex flex-wrap gap-1.5">
                        {b.subjects.slice(0, 4).map((sub, sIdx) => (
                          <span key={sIdx} className="inline-flex items-center text-[10.5px] font-bold bg-indigo-50/80 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-100">
                            {sub}
                          </span>
                        ))}
                        {b.subjects.length > 4 && (
                          <span className="inline-flex items-center text-[10.5px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md">
                            +{b.subjects.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Telemetry row */}
                  <div className="flex items-center gap-3 text-xs text-slate-500 mb-4 pt-2 border-t border-slate-100 flex-wrap">
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                      <Users className="h-3.5 w-3.5 text-indigo-600" />
                      {counts[b.id] || 0} Students
                    </span>
                    {teacherNames && (
                      <span className="inline-flex items-center gap-1 text-slate-600 truncate max-w-[180px]">
                        <GraduationCap className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{teacherNames}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => openEdit(b)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
                  >
                    <Edit2 className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => toggleActive(b)}
                    className={`flex-1 inline-flex items-center justify-center px-3 py-2 text-xs rounded-xl font-bold transition-all active:scale-95 cursor-pointer shadow-2xs ${
                      b.is_active ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/80' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/80'
                    }`}
                  >
                    {b.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <Link
                    to={`/admin/batch-details?id=${b.id}`}
                    title="Open rich details & study cards for this batch"
                    className="p-2 text-slate-400 hover:text-blue-900 hover:bg-blue-50 rounded-xl transition-all cursor-pointer"
                  >
                    <BookOpen className="h-4 w-4" />
                  </Link>
                  {b.subjects?.length > 0 && (counts[b.id] || 0) > 0 && (
                    <button
                      onClick={() => setSyncModal({ isOpen: true, batch: b, addedSubjects: b.subjects })}
                      title="Sync subjects to enrolled students"
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer"
                    >
                      <Layers className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteBatch(b.id)}
                    disabled={deleting === b.id}
                    title="Delete batch"
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit Modal (Never Clipped, Beautiful Text Hierarchy & Pills) */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[88vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-white/95 backdrop-blur-md sticky top-0 z-10 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-slate-900 text-sm tracking-tight">{editing ? 'Edit Batch' : 'Create Batch'}</h3>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                      {editing ? 'Update' : 'New'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">Class hierarchy, subjects & fee structure</p>
                </div>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body: Generous bottom clearance, smooth scrolling */}
            <div className="p-5 space-y-5 overflow-y-auto flex-1 overscroll-contain pb-10">
              {/* Batch Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Batch Name <span className="text-rose-500">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="e.g. Class 10 Science Marathon"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs font-semibold text-slate-900 shadow-2xs"
                />
              </div>

              {/* Subjects */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Curriculum Subjects
                  </label>
                  <span className="text-[11px] font-semibold text-indigo-600">
                    {(form.subjects || []).length} Included
                  </span>
                </div>
                <SubjectTagInput value={form.subjects} onChange={v => set('subjects', v)} />
                <p className="mt-1 text-[11px] text-slate-400 font-medium">Type subject and press Enter. Enrolling students choose from these modules.</p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <input
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  placeholder="Brief curriculum description or target exam…"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs font-medium text-slate-800 shadow-2xs"
                />
              </div>

              {/* Assign Teachers */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Faculty Assignments
                </label>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5 min-h-[44px] p-2 bg-slate-50/80 border border-slate-200 rounded-xl items-center">
                    {(form.teacher_ids || []).length === 0 ? (
                      <span className="text-xs text-slate-400 font-medium px-1">No faculty assigned to this cohort</span>
                    ) : (
                      (form.teacher_ids || []).map(id => {
                        const t = teachers.find(x => x.id === id)
                        return (
                          <span key={id} className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-lg border border-blue-200/80 shadow-2xs">
                            <GraduationCap className="h-3 w-3 text-blue-600" />
                            {t?.full_name || 'Teacher'}
                            <button
                              type="button"
                              onClick={() => set('teacher_ids', form.teacher_ids.filter(tId => tId !== id))}
                              className="hover:text-rose-600 font-black text-sm ml-0.5 cursor-pointer leading-none"
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

              {/* ── Fee & Billing Settings ── */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/60 border border-slate-200 space-y-3.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-indigo-600" />
                    <label className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      Fee & Billing Mode
                    </label>
                  </div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                    Dual Architecture
                  </span>
                </div>

                {/* Fee Mode Segmented Pill */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-200/70 rounded-xl">
                  <button
                    type="button"
                    onClick={() => set('fee_mode', 'monthly')}
                    className={`py-2 px-3 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      form.fee_mode === 'monthly'
                        ? 'bg-white text-blue-950 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Calendar className="h-3.5 w-3.5" /> Monthly Fee
                  </button>
                  <button
                    type="button"
                    onClick={() => set('fee_mode', 'one_time')}
                    className={`py-2 px-3 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      form.fee_mode === 'one_time'
                        ? 'bg-white text-purple-950 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Zap className="h-3.5 w-3.5" /> One-Time Fee
                  </button>
                </div>

                {/* Fee Amount */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {form.fee_mode === 'monthly' ? 'Monthly Tuition Fee (₹)' : 'One-Time Course Fee (₹)'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form.fee_amount}
                      onChange={e => set('fee_amount', e.target.value)}
                      placeholder="e.g. 1500 (Enter 0 for complimentary batch)"
                      className="w-full pl-7 pr-3.5 py-2.5 bg-white rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs font-bold text-slate-900 shadow-2xs"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 font-medium">
                    {form.fee_mode === 'monthly'
                      ? 'Due every calendar month. Days 1–10 grace window; Day 11+ locks unpaid access.'
                      : 'Single upfront payment granting access for the defined course validity.'}
                  </p>
                </div>

                {/* One-Time Validity Options */}
                {form.fee_mode === 'one_time' && (
                  <div className="pt-3 border-t border-slate-200 space-y-2.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Course Subscription Validity
                    </label>
                    <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-700">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="validity_type"
                          checked={form.validity_type === 'days'}
                          onChange={() => set('validity_type', 'days')}
                          className="text-purple-600 focus:ring-purple-500"
                        />
                        <span>Duration (Days from payment)</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="validity_type"
                          checked={form.validity_type === 'date'}
                          onChange={() => set('validity_type', 'date')}
                          className="text-purple-600 focus:ring-purple-500"
                        />
                        <span>Fixed Cutoff Date</span>
                      </label>
                    </div>

                    {form.validity_type === 'days' ? (
                      <div>
                        <input
                          type="number"
                          min="1"
                          value={form.validity_days}
                          onChange={e => set('validity_days', e.target.value)}
                          placeholder="e.g. 90, 180, 365"
                          className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-600 text-xs font-bold shadow-2xs"
                        />
                        <p className="mt-1 text-[11px] text-slate-500 font-medium">
                          Student retains access for this many days after payment is verified.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="date"
                          value={form.validity_end_date}
                          onChange={e => set('validity_end_date', e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-600 text-xs font-bold shadow-2xs"
                        />
                        <p className="mt-1 text-[11px] text-slate-500 font-medium">
                          Fixed cutoff date (e.g. Exam date). Access expires at 11:59 PM on this date.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── Batch Poster ── */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Batch Poster <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <input
                  value={form.poster_url}
                  onChange={e => set('poster_url', e.target.value)}
                  placeholder="Paste Google Drive shareable link…"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs font-medium text-slate-800 shadow-2xs"
                />
                <p className="mt-1 text-[11px] text-slate-400 font-medium">
                  Google Drive file must be set to <strong>&quot;Anyone with the link can view&quot;</strong>.
                </p>
                {/* Live preview */}
                {form.poster_url.trim() && (
                  <div className="mt-2.5 relative w-36 rounded-xl overflow-hidden border border-slate-200 bg-slate-900/90 aspect-[9/16] p-0.5 flex items-center justify-center shadow-xs">
                    <DriveImage
                      src={form.poster_url.trim()}
                      alt="Poster preview"
                      className="w-full h-full object-contain rounded-lg"
                      fallback={
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 text-[11px] text-amber-600 bg-amber-50 rounded-lg">
                          <p className="font-bold leading-tight mb-1">⚠️ Private Link</p>
                          <p className="text-[10px] text-slate-500 leading-tight">In Google Drive, set access to <strong>&quot;Anyone with link&quot;</strong>.</p>
                        </div>
                      }
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Sticky Elevated Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-100 bg-white/95 backdrop-blur-md sticky bottom-0 z-10 shadow-[0_-4px_16px_rgba(0,0,0,0.03)] shrink-0">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="px-6 py-2.5 text-xs font-extrabold text-white bg-gradient-to-r from-blue-950 to-indigo-950 hover:from-blue-900 hover:to-indigo-900 rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {saving ? 'Saving…' : (editing ? 'Save Changes' : 'Create Batch')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Subject Sync Modal */}
      <BatchSubjectSyncModal
        isOpen={syncModal.isOpen}
        onClose={() => setSyncModal({ isOpen: false, batch: null, addedSubjects: [] })}
        batch={syncModal.batch}
        addedSubjects={syncModal.addedSubjects}
        onSyncComplete={() => {
          // Keep state refreshed
        }}
      />
    </div>
  )
}
