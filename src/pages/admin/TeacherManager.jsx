import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  X, Search, BookOpen, FileText, Video,
  MessageSquare, Users, CreditCard, ShieldCheck, DollarSign, Layers, Filter
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import CustomSelect from '../../components/ui/CustomSelect'

const PERMS = [
  { key: 'can_manage_study_cards', label: 'Study Cards', icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50 text-blue-600' },
  { key: 'can_manage_homework', label: 'Homework', icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50 text-purple-600' },
  { key: 'can_drop_live_class', label: 'Live Class Links', icon: Video, color: 'text-red-600', bg: 'bg-red-600 text-white' },
  { key: 'can_message_students', label: 'Message Students', icon: MessageSquare, color: 'text-emerald-600', bg: 'bg-emerald-50 text-emerald-600' },
  { key: 'can_view_attendance', label: 'View Attendance', icon: Users, color: 'text-amber-600', bg: 'bg-amber-50 text-amber-600' },
  { key: 'can_view_fee_records', label: 'View Fee Records', icon: CreditCard, color: 'text-indigo-600', bg: 'bg-indigo-50 text-indigo-600' },
]

function Toggle({ on, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!on)}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
        on ? 'bg-blue-600' : 'bg-slate-200'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
          on ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

export default function TeacherManager() {
  const [teachers, setTeachers] = useState([])
  const [adminCount, setAdminCount] = useState(0)
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [allBatchNames, setAllBatchNames] = useState([])
  const [selectedBatchFilter, setSelectedBatchFilter] = useState('all')

  useEffect(() => {
    fetchTeachers()
  }, [])

  const fetchTeachers = async () => {
    setLoading(true)
    try {
      const [p, tp, admins, b] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email, phone, is_active, created_at').eq('role', 'teacher').order('full_name'),
        supabase.from('teacher_profiles').select('*'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin'),
        supabase.from('batches').select('id, name, teacher_id, teacher_ids').eq('is_active', true)
      ])

      const tpMap = {}
      ;(tp.data ?? []).forEach(t => { tpMap[t.id] = t })

      const teacherBatchesMap = {}
      const batchNamesList = []

      ;(b.data ?? []).forEach(batch => {
        if (batch.name && !batchNamesList.includes(batch.name)) {
          batchNamesList.push(batch.name)
        }

        const tIds = (Array.isArray(batch.teacher_ids) && batch.teacher_ids.length > 0)
          ? batch.teacher_ids
          : (batch.teacher_id ? [batch.teacher_id] : [])

        tIds.forEach(tId => {
          if (!teacherBatchesMap[tId]) teacherBatchesMap[tId] = []
          if (!teacherBatchesMap[tId].includes(batch.name)) {
            teacherBatchesMap[tId].push(batch.name)
          }
        })
      })

      setAllBatchNames(batchNamesList)

      setTeachers((p.data ?? []).map(t => {
        const profileInfo = tpMap[t.id] || {}
        return {
          ...t,
          ...profileInfo,
          can_manage_study_cards: profileInfo.can_manage_study_cards ?? false,
          can_manage_homework: profileInfo.can_manage_homework ?? false,
          can_drop_live_class: profileInfo.can_drop_live_class ?? false,
          can_message_students: profileInfo.can_message_students ?? false,
          can_view_attendance: profileInfo.can_view_attendance ?? false,
          can_view_fee_records: profileInfo.can_view_fee_records ?? false,
          assigned_batches: teacherBatchesMap[t.id] || []
        }
      }))
      setAdminCount(admins.count || 0)
    } catch (err) {
      console.error(err)
      toast.error('Failed to load teachers')
    } finally {
      setLoading(false)
    }
  }

  const updatePerm = async (teacherId, key, val) => {
    setSaving(true)
    const { error } = await supabase.from('teacher_profiles').upsert({ id: teacherId, [key]: val }, { onConflict: 'id' })
    if (error) {
      toast.error(error.message)
      setSaving(false)
      return
    }
    setTeachers(list => list.map(t => t.id === teacherId ? { ...t, [key]: val } : t))
    if (selected?.id === teacherId) setSelected(s => ({ ...s, [key]: val }))
    toast.success('Permission updated')
    setSaving(false)
  }

  const toggleActive = async (t) => {
    const { error } = await supabase.from('profiles').update({ is_active: !t.is_active }).eq('id', t.id)
    if (error) {
      toast.error(error.message)
      return
    }
    setTeachers(list => list.map(x => x.id === t.id ? { ...x, is_active: !x.is_active } : x))
    if (selected?.id === t.id) setSelected(s => ({ ...s, is_active: !s.is_active }))
    toast.success(t.is_active ? 'Account suspended' : 'Account restored')
  }

  const updateSalary = async (teacherId, amount) => {
    const val = parseFloat(amount) || 0
    const { error } = await supabase.from('teacher_profiles').upsert({ id: teacherId, salary_amount: val }, { onConflict: 'id' })
    if (error) {
      toast.error(error.message)
      return
    }
    setTeachers(list => list.map(t => t.id === teacherId ? { ...t, salary_amount: val } : t))
    if (selected?.id === teacherId) setSelected(s => ({ ...s, salary_amount: val }))
    toast.success('Salary updated')
  }

  const isNewTeacher = (dateString) => {
    if (!dateString) return false
    const created = new Date(dateString)
    const now = new Date()
    const diffHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60)
    return diffHours <= 48
  }

  const filteredTeachers = useMemo(() => {
    let result = teachers

    // 1. Filter by Batch Dropdown
    if (selectedBatchFilter !== 'all') {
      if (selectedBatchFilter === 'unassigned') {
        result = result.filter(t => !t.assigned_batches || t.assigned_batches.length === 0)
      } else {
        result = result.filter(t => t.assigned_batches && t.assigned_batches.includes(selectedBatchFilter))
      }
    }

    // 2. Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(t =>
        (t.full_name?.toLowerCase() || '').includes(q) ||
        (t.email?.toLowerCase() || '').includes(q) ||
        (t.subject?.toLowerCase() || '').includes(q) ||
        (Array.isArray(t.assigned_batches) && t.assigned_batches.some(b => (b?.toLowerCase() || '').includes(q)))
      )
    }

    return result
  }, [teachers, searchQuery, selectedBatchFilter])

  // Overview Decision-Making Stats
  const stats = useMemo(() => {
    const total = teachers.length
    const active = teachers.filter(t => t.is_active).length
    const suspended = total - active
    const newCount = teachers.filter(t => isNewTeacher(t.created_at)).length
    const totalPayroll = teachers.reduce((acc, t) => acc + Number(t.salary_amount || 0), 0)

    return { total, active, suspended, newCount, totalPayroll }
  }, [teachers])

  if (loading) {
    return (
      <div className="py-12 text-center text-slate-400 text-xs font-bold">
        Loading Teachers...
      </div>
    )
  }

  return (
    <div className="w-full space-y-3 pb-16 lg:pb-6 text-slate-900 min-w-0">
      
      {/* Decision-Making Stats Overview Cards */}
      <div className="flex flex-wrap sm:flex-nowrap gap-2 min-w-0">
        
        {/* Faculty Stat Card */}
        <div className="flex-1 min-w-[105px] bg-white rounded-xl border border-slate-200 p-2 sm:p-2.5 shadow-2xs flex items-center gap-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none truncate">Faculty</p>
            <p className="text-xs sm:text-sm font-black text-slate-900 leading-tight mt-0.5 truncate">{stats.total} Teachers</p>
            <p className="text-[8px] sm:text-[9px] font-bold text-emerald-600 truncate leading-none mt-0.5">
              {stats.active} Active {stats.newCount > 0 && `• ${stats.newCount} New`}
            </p>
          </div>
        </div>

        {/* Monthly Payroll Stat Card */}
        <div className="flex-1 min-w-[105px] bg-white rounded-xl border border-slate-200 p-2 sm:p-2.5 shadow-2xs flex items-center gap-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none truncate">Payroll</p>
            <p className="text-xs sm:text-sm font-black text-slate-900 leading-tight mt-0.5 truncate">₹{stats.totalPayroll.toLocaleString('en-IN')}</p>
            <p className="text-[8px] sm:text-[9px] font-medium text-slate-400 truncate leading-none mt-0.5">Monthly total</p>
          </div>
        </div>

        {/* Admins Count Stat Card */}
        <div className="flex-1 min-w-[105px] bg-white rounded-xl border border-slate-200 p-2 sm:p-2.5 shadow-2xs flex items-center gap-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none truncate">Admins</p>
            <p className="text-xs sm:text-sm font-black text-slate-900 leading-tight mt-0.5 truncate">{adminCount} Admins</p>
            <p className="text-[8px] sm:text-[9px] font-bold text-blue-600 truncate leading-none mt-0.5">System access</p>
          </div>
        </div>

      </div>

      {/* Search & In-App Batch Filter Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 min-w-0">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search teacher by name, email, or subject..."
            className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Batch Filter Dropdown */}
        <div className="w-full sm:w-56 shrink-0">
          <CustomSelect
            value={selectedBatchFilter}
            onChange={val => setSelectedBatchFilter(val)}
            icon={Filter}
            options={[
              { value: 'all', label: 'All Batches' },
              { value: 'unassigned', label: '⚠️ Unassigned Teachers' },
              ...allBatchNames.map(bName => ({
                value: bName,
                label: bName
              }))
            ]}
          />
        </div>

        <span className="text-xs font-bold text-slate-500 shrink-0 self-end sm:self-center px-1">
          {filteredTeachers.length} / {teachers.length} Teachers
        </span>
      </div>

      {/* Teachers Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-3.5 py-2.5">Teacher</th>
                <th className="px-3.5 py-2.5">Assigned Batches</th>
                <th className="px-3.5 py-2.5">Subject</th>
                <th className="px-3.5 py-2.5">Salary</th>
                <th className="px-3.5 py-2.5">Status</th>
                <th className="px-3.5 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-xs">
                    No teachers match the current search or batch filter
                  </td>
                </tr>
              ) : (
                filteredTeachers.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-3.5 py-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-purple-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                          {t.full_name?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <p className="font-bold text-slate-900 truncate text-xs">{t.full_name}</p>
                            {isNewTeacher(t.created_at) && (
                              <span className="px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider text-purple-700 bg-purple-100 rounded-md border border-purple-200 shrink-0 shadow-2xs">
                                NEW
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 truncate">{t.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Dedicated Assigned Batches Column */}
                    <td className="px-3.5 py-2.5">
                      {t.assigned_batches?.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-[220px]">
                          {t.assigned_batches.map(bName => (
                            <span key={bName} className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-900 bg-blue-50 border border-blue-200/90 px-2 py-0.5 rounded-full">
                              <Layers className="h-2.5 w-2.5 text-blue-600 shrink-0" />
                              <span className="truncate max-w-[120px]">{bName}</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="inline-flex items-center text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/60">
                          Unassigned
                        </span>
                      )}
                    </td>

                    <td className="px-3.5 py-2.5 text-slate-700 font-bold text-xs">
                      {t.subject || '—'}
                    </td>

                    <td className="px-3.5 py-2.5 font-bold text-slate-900 text-xs">
                      ₹{Number(t.salary_amount || 0).toLocaleString('en-IN')}
                    </td>

                    <td className="px-3.5 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        t.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {t.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>

                    <td className="px-3.5 py-2.5 text-right">
                      <button
                        onClick={() => setSelected(t)}
                        className="px-2.5 py-1 text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg font-bold transition-all cursor-pointer"
                      >
                        Edit Permissions
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PORTAL MODAL */}
      {selected && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 bg-slate-950/50 backdrop-blur-xs animate-fade-in">
          <div className="fixed inset-0" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] z-10">
            
            {/* Modal Header */}
            <div className="bg-slate-50 border-b border-slate-200 px-3.5 py-2.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  {selected.full_name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-xs text-slate-900 truncate leading-tight">{selected.full_name}</h3>
                  <div className="flex items-center gap-1 flex-wrap text-[10px] text-slate-500">
                    <span>{selected.subject || 'No Subject'}</span>
                    {selected.assigned_batches?.length > 0 && (
                      <span className="text-blue-700 font-bold">
                        • Batches: {selected.assigned_batches.join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-3.5 space-y-3 overflow-y-auto">
              
              {/* Feature Permissions List */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  FEATURE PERMISSIONS
                </p>
                
                <div className="space-y-1">
                  {PERMS.map(p => {
                    const Icon = p.icon
                    const isChecked = !!selected[p.key]

                    return (
                      <div
                        key={p.key}
                        className="flex items-center justify-between py-1.5 px-2.5 bg-slate-50/70 rounded-lg border border-slate-100"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`p-1 rounded-md shrink-0 ${p.bg}`}>
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          <span className="text-xs font-semibold text-slate-800 truncate">
                            {p.label}
                          </span>
                        </div>

                        <Toggle
                          on={isChecked}
                          onChange={(val) => updatePerm(selected.id, p.key, val)}
                          disabled={saving}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Monthly Salary Input */}
              <div className="pt-2 border-t border-slate-100 space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  MONTHLY SALARY (PAYROLL)
                </p>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                    <input
                      key={selected.id}
                      type="number"
                      defaultValue={selected.salary_amount || 0}
                      onBlur={(e) => updateSalary(selected.id, e.target.value)}
                      placeholder="e.g. 25000"
                      className="w-full pl-6 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Account Status Actions */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-slate-900">Account Status</p>
                  <p className="text-[10px] text-slate-400">Suspend or restore teacher login</p>
                </div>

                <button
                  onClick={() => toggleActive(selected)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selected.is_active
                      ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  {selected.is_active ? 'Suspend Account' : 'Restore Account'}
                </button>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-3.5 py-2 flex justify-end shrink-0">
              <button
                onClick={() => setSelected(null)}
                className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  )
}
