import { useState, useEffect } from 'react'
import { X, Lock, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'

const PERMS = [
  { key:'can_manage_study_cards', label:'Study Cards'      },
  { key:'can_drop_live_class',    label:'Live Class Links' },
  { key:'can_message_students',   label:'Message Students' },
  { key:'can_view_attendance',    label:'View Attendance'  },
  { key:'can_view_fee_records',   label:'View Fee Records' },
]

function Toggle({ on, onChange }) {
  return (
    <button onClick={() => onChange(!on)}
      className={`relative w-10 rounded-full transition-colors flex-shrink-0 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1 ${on ? 'bg-blue-950' : 'bg-gray-300'}`}
      style={{ height: '22px' }}>
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${on ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  )
}

export default function TeacherManager() {
  const [teachers, setTeachers] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('profiles').select('id, full_name, email, phone, is_active, created_at').eq('role','teacher').order('full_name'),
      supabase.from('teacher_profiles').select('*'),
    ]).then(([p, tp]) => {
      const tpMap = {}; (tp.data ?? []).forEach(t => { tpMap[t.id] = t })
      setTeachers((p.data ?? []).map(t => ({ ...t, ...tpMap[t.id] })))
      setLoading(false)
    })
  }, [])

  const updatePerm = async (teacherId, key, val) => {
    setSaving(true)
    const { error } = await supabase.from('teacher_profiles').update({ [key]: val }).eq('id', teacherId)
    if (error) { toast.error(error.message); setSaving(false); return }
    setTeachers(list => list.map(t => t.id === teacherId ? { ...t, [key]: val } : t))
    if (selected?.id === teacherId) setSelected(s => ({ ...s, [key]: val }))
    toast.success('Permission updated')
    setSaving(false)
  }

  const toggleActive = async (t) => {
    await supabase.from('profiles').update({ is_active: !t.is_active }).eq('id', t.id)
    setTeachers(list => list.map(x => x.id === t.id ? { ...x, is_active: !x.is_active } : x))
    if (selected?.id === t.id) setSelected(s => ({ ...s, is_active: !s.is_active }))
    toast.success(t.is_active ? 'Account suspended' : 'Account restored')
  }

  if (loading) return <div className="py-12 text-center text-gray-400 text-sm">Loading…</div>

  return (
    <div className="space-y-4 pb-20 lg:pb-0">
      <p className="text-sm text-gray-500">{teachers.length} teachers</p>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>{['Teacher','Subject','Salary','Permissions','Status','Actions'].map(h=>(
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {teachers.length === 0
                ? <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No teachers yet</td></tr>
                : teachers.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-purple-700 text-white text-xs font-bold flex items-center justify-center">{t.full_name?.[0]?.toUpperCase() ?? '?'}</div>
                        <div><p className="font-semibold">{t.full_name}</p><p className="text-xs text-gray-400">{t.email}</p></div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{t.subject || '—'}</td>
                    <td className="px-4 py-3 font-semibold">₹{Number(t.salary_amount||0).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {PERMS.map(p => (
                          <span key={p.key} title={p.label}
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${t[p.key] ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                            {t[p.key] ? '✓' : '×'}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${t.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {t.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setSelected(t)} className="px-2.5 py-1 text-xs bg-purple-50 text-purple-700 rounded-lg font-medium hover:bg-purple-100">Edit Permissions</button>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* Permissions slide-over */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/30" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-sm bg-white h-full overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Edit Permissions</h3>
              <button onClick={() => setSelected(null)} className="p-1 text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-purple-700 text-white text-lg font-bold flex items-center justify-center">{selected.full_name?.[0]?.toUpperCase() ?? '?'}</div>
                <div>
                  <p className="font-bold text-gray-900">{selected.full_name}</p>
                  <p className="text-sm text-gray-500">{selected.subject || 'No subject set'}</p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Feature Permissions</p>
                {PERMS.map(p => (
                  <div key={p.key} className="flex items-center justify-between py-2 border-b border-gray-50">
                    <span className="text-sm font-medium text-gray-700">{p.label}</span>
                    <Toggle on={!!selected[p.key]} onChange={val => updatePerm(selected.id, p.key, val)} />
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Salary</p>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 text-sm">Monthly: ₹</span>
                  <input type="number" defaultValue={selected.salary_amount || 0}
                    onBlur={async e => {
                      const val = parseFloat(e.target.value) || 0
                      await supabase.from('teacher_profiles').update({ salary_amount: val }).eq('id', selected.id)
                      setTeachers(list => list.map(t => t.id === selected.id ? { ...t, salary_amount: val } : t))
                      toast.success('Salary updated')
                    }}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
                </div>
              </div>

              <button onClick={() => toggleActive(selected)}
                className={`w-full py-2.5 rounded-xl font-semibold text-sm ${selected.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
                {selected.is_active ? 'Suspend Account' : 'Restore Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
