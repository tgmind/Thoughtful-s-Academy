import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Plus, Edit2, Trash2, X, Eye, EyeOff, ClipboardList, CheckCircle, Lock, FileText, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { normalizeUrl } from '../../utils/formatters'
import CustomSelect from '../../components/ui/CustomSelect'
import MaterialViewerModal from '../../components/shared/MaterialViewerModal'

const EMPTY = { title: '', description: '', drive_link: '', batch_id: '', due_date: '' }

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function Homework({ isAdmin = false }) {
  const { user } = useAuth()
  const [allowed, setAllowed] = useState(isAdmin)
  const [items, setItems] = useState([])
  const [batches, setBatches] = useState([])
  const [counts, setCounts] = useState({}) // homework_id -> done count
  const [batchStudentCounts, setBatchStudentCounts] = useState({}) // batch_id -> total active students count
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [loading, setLoading] = useState(true)
  const [viewingMaterial, setViewingMaterial] = useState(null)

  // Filters & Search
  const [selectedBatch, setSelectedBatch] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'active' | 'hidden'
  const [drawerSearch, setDrawerSearch] = useState('')

  // Completion Drawer state
  const [subFor, setSubFor] = useState(null)
  const [completionRoster, setCompletionRoster] = useState([])
  const [drawerLoading, setDrawerLoading] = useState(false)
  const [drawerTab, setDrawerTab] = useState('All')

  const subForRef = useRef(subFor)
  subForRef.current = subFor
  const itemsRef = useRef(items)
  itemsRef.current = items

  const loadData = useCallback(async () => {
    let hwQuery = supabase.from('homework').select('*, batches(name)').order('created_at', { ascending: false })
    if (!isAdmin) {
      const { data: bList } = await supabase.from('batches').select('id').or(`teacher_id.eq.${user.id},teacher_ids.cs.{${user.id}}`)
      const assignedBatchIds = (bList ?? []).map(b => b.id)
      if (assignedBatchIds.length > 0) {
        hwQuery = hwQuery.or(`teacher_id.eq.${user.id},batch_id.in.(${assignedBatchIds.join(',')})`)
      } else {
        hwQuery = hwQuery.eq('teacher_id', user.id)
      }
    }

    const [hw, b, sp] = await Promise.all([
      hwQuery,
      supabase.from('batches').select('id, name').eq('is_active', true).order('name'),
      supabase.from('student_profiles').select('id, batch_id, profiles!id(is_active)'),
    ])

    if (hw.error) {
      console.error('[TeacherHomework] Error loading homework:', hw.error)
      toast.error('Failed to load homework: ' + hw.error.message)
      setLoading(false)
      return
    }

    const list = hw.data ?? []
    setItems(list)
    setBatches(b.data ?? [])

    // Calculate active enrolled students per batch
    const bCounts = {}
    ;(sp.data ?? []).forEach(s => {
      if (s.batch_id && s.profiles?.is_active !== false) {
        bCounts[s.batch_id] = (bCounts[s.batch_id] || 0) + 1
      }
    })
    setBatchStudentCounts(bCounts)
    setLoading(false)

    // Load completed counts per assignment
    const ids = list.map(h => h.id)
    if (ids.length) {
      const { data: subRows } = await supabase.from('homework_submissions').select('homework_id').in('homework_id', ids)
      const c = {}
      ;(subRows ?? []).forEach(s => { c[s.homework_id] = (c[s.homework_id] || 0) + 1 })
      setCounts(c)
    } else {
      setCounts({})
    }
  }, [user, isAdmin])

  const refreshCounts = useCallback(async (currentItems = itemsRef.current) => {
    const ids = currentItems.map(h => h.id)
    if (ids.length) {
      const { data: subRows } = await supabase.from('homework_submissions').select('homework_id').in('homework_id', ids)
      const c = {}
      ;(subRows ?? []).forEach(s => { c[s.homework_id] = (c[s.homework_id] || 0) + 1 })
      setCounts(c)
    } else {
      setCounts({})
    }
  }, [])

  useEffect(() => {
    if (!user) return
    let cancelled = false

    const permCheck = isAdmin
      ? Promise.resolve(true)
      : Promise.all([
          supabase.from('teacher_profiles').select('can_manage_homework').eq('id', user.id).maybeSingle(),
          supabase.from('batches').select('id').or(`teacher_id.eq.${user.id},teacher_ids.cs.{${user.id}}`).eq('is_active', true)
        ]).then(([{ data: p }, { data: b }]) => (p?.can_manage_homework ?? false) || (b && b.length > 0))
          .catch(() => false)

    permCheck.then(ok => {
      if (cancelled) return
      setAllowed(ok)
      if (!ok) { setLoading(false); return }
      loadData()
    })

    return () => { cancelled = true }
  }, [user, isAdmin, loadData])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowForm(true) }
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
      ? await supabase.from('homework').update(payload).eq('id', editing).select('*, batches(name)').maybeSingle()
      : await supabase.from('homework').insert({ ...payload, teacher_id: user.id, is_active: true }).select('*, batches(name)').maybeSingle()
    setSaving(false)
    if (error) { toast.error(error.message); return }
    if (editing) setItems(l => l.map(x => x.id === editing ? data : x))
    else         setItems(l => [data, ...l])
    setShowForm(false)
    toast.success(editing ? 'Homework updated!' : 'Homework assigned!')
  }

  const toggleActive = async (h) => {
    const nextActive = !h.is_active
    const { data, error } = await supabase
      .from('homework')
      .update({ is_active: nextActive })
      .eq('id', h.id)
      .select('*, batches(name)')
      .maybeSingle()
    if (error) { toast.error(error.message); return }
    setItems(l => l.map(x => x.id === h.id ? (data || { ...x, is_active: nextActive }) : x))
    toast.success(nextActive ? 'Homework visible to students' : 'Homework hidden from students')
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

  // Fetch roster (both enrolled students and any students who have submitted)
  const fetchDrawerRoster = useCallback(async (h) => {
    try {
      const [subRes, stuRes] = await Promise.all([
        supabase.from('homework_submissions')
          .select('student_id, submitted_at')
          .eq('homework_id', h.id),
        h.batch_id
          ? supabase.from('student_profiles')
              .select('id, profiles!id(full_name, email, is_active)')
              .eq('batch_id', h.batch_id)
          : Promise.resolve({ data: [] }),
      ])

      const completionsMap = {}
      const subStudentIds = []
      ;(subRes.data ?? []).forEach(s => {
        completionsMap[s.student_id] = s.submitted_at
        subStudentIds.push(s.student_id)
      })

      const enrolledStudents = (stuRes.data ?? [])
        .filter(s => s.profiles?.is_active !== false)
        .map(s => ({
          id: s.id,
          full_name: s.profiles?.full_name || 'Student',
          email: s.profiles?.email || '',
          done: Boolean(completionsMap[s.id]),
          submitted_at: completionsMap[s.id] || null,
        }))

      const enrolledIds = new Set(enrolledStudents.map(s => s.id))
      const missingIds = subStudentIds.filter(id => !enrolledIds.has(id))

      let extraStudents = []
      if (missingIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, email, is_active')
          .in('id', missingIds)
        extraStudents = (profilesData ?? []).map(p => ({
          id: p.id,
          full_name: p.full_name || 'Student',
          email: p.email || '',
          done: true,
          submitted_at: completionsMap[p.id] || null,
        }))
      }

      const fullRoster = [...enrolledStudents, ...extraStudents]
        .sort((a, b) => a.full_name.localeCompare(b.full_name))

      setCompletionRoster(fullRoster)
    } catch {
      toast.error('Failed to load completion roster')
    }
  }, [])

  // Open the Completion Drawer for an assignment
  const openCompletionDrawer = async (h) => {
    setSubFor(h)
    setDrawerLoading(true)
    setDrawerTab('All')
    setDrawerSearch('')
    await fetchDrawerRoster(h)
    setDrawerLoading(false)
  }

  // Realtime subscription for cross-working sync
  useEffect(() => {
    if (!user || !allowed) return
    const channel = supabase.channel(`teacher_homework_rt_${isAdmin ? 'admin' : user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'homework' }, () => {
        loadData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'homework_submissions' }, () => {
        refreshCounts()
        if (subForRef.current) {
          fetchDrawerRoster(subForRef.current)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, allowed, isAdmin, loadData, refreshCounts, fetchDrawerRoster])

  const doneInDrawer = useMemo(() => completionRoster.filter(s => s.done), [completionRoster])
  const pendingInDrawer = useMemo(() => completionRoster.filter(s => !s.done), [completionRoster])

  const displayedRoster = useMemo(() => {
    let list = completionRoster
    if (drawerTab === 'Done') list = doneInDrawer
    else if (drawerTab === 'Pending') list = pendingInDrawer

    if (drawerSearch.trim()) {
      const q = drawerSearch.toLowerCase()
      list = list.filter(s =>
        s.full_name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q)
      )
    }
    return list
  }, [drawerTab, doneInDrawer, pendingInDrawer, completionRoster, drawerSearch])

  const filteredItems = useMemo(() => {
    return items.filter(h => {
      if (selectedBatch !== 'all' && h.batch_id !== selectedBatch) return false
      if (statusFilter === 'active' && !h.is_active) return false
      if (statusFilter === 'hidden' && h.is_active) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchTitle = h.title?.toLowerCase().includes(q)
        const matchDesc = h.description?.toLowerCase().includes(q)
        const matchBatch = h.batches?.name?.toLowerCase().includes(q)
        if (!matchTitle && !matchDesc && !matchBatch) return false
      }
      return true
    })
  }, [items, selectedBatch, statusFilter, searchQuery])

  const countsByStatus = useMemo(() => {
    let active = 0, hidden = 0
    items.forEach(h => {
      if (selectedBatch === 'all' || h.batch_id === selectedBatch) {
        if (h.is_active) active++
        else hidden++
      }
    })
    return { all: active + hidden, active, hidden }
  }, [items, selectedBatch])

  if (loading) return <div className="py-12 text-center text-gray-400 text-sm">Loading…</div>

  if (!allowed) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
        <Lock className="h-8 w-8 text-gray-400" />
      </div>
      <h2 className="font-bold text-xl text-gray-700">Permission Required</h2>
      <p className="text-gray-500 mt-2 max-w-xs">Ask your admin to enable homework management.</p>
    </div>
  )

  return (
    <div className="space-y-5 pb-20 lg:pb-0">
      <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
        <h2 className="font-bold text-lg sm:text-xl text-gray-900 truncate">Homework</h2>
        <button
          onClick={openAdd}
          className="inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 bg-blue-950 text-white text-xs sm:text-sm font-bold rounded-xl hover:bg-blue-900 shadow-xs transition-all shrink-0 whitespace-nowrap active:scale-95 cursor-pointer"
        >
          <Plus className="h-4 w-4 shrink-0" /> Assign Homework
        </button>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between flex-wrap">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl shrink-0">
          {[
            { id: 'all', label: 'All', count: countsByStatus.all },
            { id: 'active', label: 'Active', count: countsByStatus.active },
            { id: 'hidden', label: 'Hidden', count: countsByStatus.hidden }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === tab.id
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                statusFilter === tab.id ? 'bg-gray-100 text-gray-700' : 'bg-gray-200/70 text-gray-500'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Batch filter & Search input */}
        <div className="flex items-center gap-2 flex-1 sm:max-w-md">
          {batches.length > 0 && (
            <div className="w-36 shrink-0">
              <CustomSelect
                value={selectedBatch}
                onChange={val => setSelectedBatch(val)}
                options={[
                  { value: 'all', label: 'All Batches' },
                  ...batches.map(b => ({ value: b.id, label: b.name }))
                ]}
              />
            </div>
          )}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search homework…"
              className="w-full pl-8 pr-7 py-2 bg-white rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-950 placeholder:text-gray-400 shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 rounded-sm cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <ClipboardList className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">No homework assigned yet. Create your first one!</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <ClipboardList className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium text-sm">No homework matches the selected filters.</p>
          <button
            onClick={() => { setSelectedBatch('all'); setStatusFilter('all'); setSearchQuery('') }}
            className="mt-3 text-xs text-blue-600 hover:underline font-semibold cursor-pointer"
          >
            Reset all filters
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map(h => {
            const overdue = h.due_date && new Date(h.due_date) < new Date(todayISO())
            const total = h.batch_id ? (batchStudentCounts[h.batch_id] || 0) : 0
            const done = counts[h.id] || 0
            const pending = Math.max(0, total - done)

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
                    <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setViewingMaterial({ title: `${h.title} - Assignment`, url: h.drive_link, type: 'google_drive' })}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline cursor-pointer"
                      >
                        <FileText className="h-3.5 w-3.5" /> Assignment link
                      </button>

                      {/* Unified Completion Status Button */}
                      <button
                        type="button"
                        onClick={() => openCompletionDrawer(h)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                        title="View completion roster"
                      >
                        <span className="text-emerald-700 font-bold">✓ {done} Done</span>
                        <span className="text-slate-400">·</span>
                        <span className="text-amber-700 font-bold">⏳ {pending} Pending</span>
                        <span className="text-slate-400 text-[11px] font-normal">({total} total)</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => toggleActive(h)}
                      title={h.is_active ? 'Hide from students' : 'Show to students'}
                      className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                    >
                      {h.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => openEdit(h)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => remove(h.id)}
                      disabled={deleting === h.id}
                      className="p-1.5 text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                    >
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
              <button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Title <span className="text-red-500">*</span></label>
                <input
                  value={form.title}
                  onChange={e => set('title', e.target.value)}
                  placeholder="e.g. Chapter 7 — Problem Set"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  rows={2}
                  placeholder="Instructions for students…"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Assignment Link <span className="text-red-500">*</span></label>
                <input
                  value={form.drive_link}
                  onChange={e => set('drive_link', e.target.value)}
                  placeholder="Google Drive / document link"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Batch <span className="text-red-500">*</span></label>
                  <CustomSelect
                    value={form.batch_id}
                    onChange={val => set('batch_id', val)}
                    options={[
                      { value: '', label: 'Select batch…' },
                      ...batches.map(b => ({ value: b.id, label: b.name }))
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Due Date (optional)</label>
                  <input
                    type="date"
                    value={form.due_date}
                    min={todayISO()}
                    onChange={e => set('due_date', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                  />
                </div>
              </div>
              {batches.length === 0 && (
                <p className="text-xs text-amber-600">No active batches yet — create a batch first so students can be targeted.</p>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl font-semibold text-sm cursor-pointer hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="flex-1 py-2.5 bg-blue-950 text-white font-bold rounded-xl hover:bg-blue-900 disabled:opacity-50 text-sm cursor-pointer transition-colors"
                >
                  {saving ? 'Saving…' : editing ? 'Update' : 'Assign'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Completion Drawer */}
      {subFor && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity" onClick={() => setSubFor(null)} />
          <div className="relative w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
            {/* Drawer Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div className="min-w-0 pr-3">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                    {subFor.batches?.name || 'Batch'}
                  </span>
                  <span className="text-xs text-gray-400">Completion Status</span>
                </div>
                <h3 className="font-bold text-gray-900 text-base truncate">{subFor.title}</h3>
              </div>
              <button
                onClick={() => setSubFor(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Metrics Banner */}
            <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-100 grid grid-cols-3 gap-2 text-center">
              <div className="bg-white p-2.5 rounded-xl border border-gray-200/60 shadow-xs">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Enrolled</p>
                <p className="text-lg font-black text-gray-900">{completionRoster.length}</p>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-xs">
                <p className="text-[11px] font-medium text-emerald-700 uppercase tracking-wider">Done</p>
                <p className="text-lg font-black text-emerald-700">{doneInDrawer.length}</p>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-amber-100 shadow-xs">
                <p className="text-[11px] font-medium text-amber-700 uppercase tracking-wider">Pending</p>
                <p className="text-lg font-black text-amber-700">{pendingInDrawer.length}</p>
              </div>
            </div>

            {/* Completion Progress Bar */}
            {completionRoster.length > 0 && (
              <div className="px-5 py-2.5 bg-white border-b border-gray-100">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-gray-600">Completion Progress</span>
                  <span className="font-bold text-emerald-700">
                    {Math.round((doneInDrawer.length / completionRoster.length) * 100)}% ({doneInDrawer.length}/{completionRoster.length})
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.round((doneInDrawer.length / completionRoster.length) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Drawer Student Search */}
            {completionRoster.length > 0 && (
              <div className="px-5 py-2.5 border-b border-gray-100 bg-white">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={drawerSearch}
                    onChange={e => setDrawerSearch(e.target.value)}
                    placeholder="Search student by name or email…"
                    className="w-full pl-8 pr-7 py-1.5 bg-gray-50 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-950 placeholder:text-gray-400 shadow-xs"
                  />
                  {drawerSearch && (
                    <button
                      onClick={() => setDrawerSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 rounded-sm cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Drawer Filter Tabs */}
            <div className="px-5 pt-3 pb-2 border-b border-gray-100 flex gap-2">
              {['All', 'Done', 'Pending'].map(tab => {
                const tabCount = tab === 'All'
                  ? completionRoster.length
                  : tab === 'Done'
                  ? doneInDrawer.length
                  : pendingInDrawer.length
                const isActive = drawerTab === tab
                return (
                  <button
                    key={tab}
                    onClick={() => setDrawerTab(tab)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-blue-950 text-white shadow-xs'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200/80'
                    }`}
                  >
                    <span>{tab}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      isActive ? 'bg-blue-800 text-blue-100' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {tabCount}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Drawer Roster Body */}
            <div className="p-5 flex-1 space-y-2.5">
              {drawerLoading ? (
                <div className="py-16 text-center">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-950 border-t-transparent mb-2" />
                  <p className="text-gray-400 text-xs">Loading completion roster…</p>
                </div>
              ) : displayedRoster.length === 0 ? (
                <div className="text-center py-16">
                  <ClipboardList className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 font-medium text-sm">
                    {drawerSearch
                      ? 'No students match your search.'
                      : drawerTab === 'Done'
                      ? 'No students have marked this done yet.'
                      : drawerTab === 'Pending'
                      ? 'Great news! No students are pending.'
                      : 'No active students enrolled in this batch.'}
                  </p>
                  {drawerSearch && (
                    <button
                      onClick={() => setDrawerSearch('')}
                      className="mt-2 text-xs text-blue-600 hover:underline font-semibold cursor-pointer"
                    >
                      Clear student search
                    </button>
                  )}
                </div>
              ) : (
                displayedRoster.map(s => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors bg-white shadow-xs"
                  >
                    <div className="min-w-0 flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase shrink-0 ${
                        s.done ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {s.full_name.charAt(0) || 'S'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{s.full_name}</p>
                        <p className="text-xs text-gray-400 truncate">{s.email}</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      {s.done ? (
                        <div className="inline-flex flex-col items-end">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            <CheckCircle className="h-3 w-3" /> Done
                          </span>
                          {s.submitted_at && (
                            <span className="text-[10px] text-gray-400 mt-0.5">
                              {new Date(s.submitted_at).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                          ⏳ Pending
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* In-App Material Viewer Modal for Assignment Preview */}
      {viewingMaterial && (
        <MaterialViewerModal
          card={viewingMaterial}
          onClose={() => setViewingMaterial(null)}
        />
      )}
    </div>
  )
}
