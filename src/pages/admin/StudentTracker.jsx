import { useState, useEffect } from 'react'
import { Search, Download, X, Edit2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

function todayISO() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
function monthLabel() { return new Date().toLocaleDateString('en-IN', { month:'long', year:'numeric' }) }

function AttBar({ pct }) {
  const color = pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width:`${pct}%` }} />
      </div>
      <span className={`text-xs font-semibold ${pct>=75?'text-green-700':pct>=50?'text-amber-700':'text-red-600'}`}>{pct}%</span>
    </div>
  )
}

export default function StudentTracker() {
  const [students,      setStudents]      = useState([])
  const [batches,       setBatches]       = useState([])
  const [search,        setSearch]        = useState('')
  const [batchF,        setBatchF]        = useState('')
  const [attF,          setAttF]          = useState('all')
  const [loading,       setLoading]       = useState(true)
  const [selected,      setSelected]      = useState(null)
  const [deacting,      setDeacting]      = useState(null)
  
  const [editEnroll,    setEditEnroll]    = useState(false)
  const [enrollBatch,   setEnrollBatch]   = useState('')
  const [enrollSubjects, setEnrollSubjects] = useState([])
  const [batchSubjects, setBatchSubjects] = useState([])
  const [savingEnroll,  setSavingEnroll]  = useState(false)

  useEffect(() => {
    Promise.all([
      // Ordered by newest first to act as a notification list for admins
      supabase.from('profiles').select('id, full_name, email, phone, is_active, created_at')
        .eq('role','student').order('created_at', { ascending: false }),
      // Extracting the new extra data properly
      supabase.from('student_profiles').select('id, batch_id, roll_number, parent_phone, date_of_birth, batches(name)'),
      supabase.from('attendance').select('student_id, status'),
      supabase.from('fee_records').select('student_id, status, payment_month').eq('payment_month', monthLabel()),
      supabase.from('batches').select('id, name').eq('is_active', true).order('name'),
    ]).then(([p, sp, att, fees, b]) => {
      const spMap  = {}; (sp.data ?? []).forEach(s => { spMap[s.id] = s })
      const feeMap = {}; (fees.data ?? []).forEach(f => { feeMap[f.student_id] = f.status })
      const attMap = {}
      ;(att.data ?? []).forEach(a => {
        if (!attMap[a.student_id]) attMap[a.student_id] = { present:0, late:0, total:0 }
        attMap[a.student_id].total++
        if (a.status === 'present') attMap[a.student_id].present++
        else if (a.status === 'late') attMap[a.student_id].late++
      })
      const enriched = (p.data ?? []).map(s => ({
        ...s,
        batch_name:    spMap[s.id]?.batches?.name ?? '—',
        batch_id:      spMap[s.id]?.batch_id ?? null,
        roll_number:   spMap[s.id]?.roll_number ?? '—',
        parent_phone:  spMap[s.id]?.parent_phone ?? '—',
        date_of_birth: spMap[s.id]?.date_of_birth ?? '—',
        att_pct:       attMap[s.id]
          ? Math.round(((attMap[s.id].present + attMap[s.id].late * 0.5) / attMap[s.id].total) * 100) : 0,
        fee_status:    feeMap[s.id] ?? 'not_paid',
      }))
      setStudents(enriched)
      setBatches(b.data ?? [])
      setLoading(false)
    })
  }, [])

  const openStudent = async (s) => {
    setSelected(s)
    setEditEnroll(false)
    const { data } = await supabase.from('student_profiles').select('batch_id, subjects').eq('id', s.id).maybeSingle()
    const currentBatch = data?.batch_id ?? ''
    const currentSubjects = data?.subjects ?? []
    setEnrollBatch(currentBatch)
    setEnrollSubjects(currentSubjects)
    if (currentBatch) {
      const { data: bd } = await supabase.from('batches').select('subjects').eq('id', currentBatch).maybeSingle()
      setBatchSubjects(bd?.subjects ?? [])
    } else {
      setBatchSubjects([])
    }
  }

  const onEnrollBatchChange = async (batchId) => {
    setEnrollBatch(batchId)
    setEnrollSubjects([])
    if (!batchId) { setBatchSubjects([]); return }
    const { data } = await supabase.from('batches').select('subjects').eq('id', batchId).maybeSingle()
    setBatchSubjects(data?.subjects ?? [])
  }

  const toggleEnrollSubject = (sub) => {
    setEnrollSubjects(prev => prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub])
  }

  const saveEnrollment = async () => {
    setSavingEnroll(true)
    const { error } = await supabase.from('student_profiles')
      .update({ batch_id: enrollBatch || null, subjects: enrollSubjects })
      .eq('id', selected.id)
    setSavingEnroll(false)
    if (error) { toast.error(error.message); return }
    const batchName = batches.find(b => b.id === enrollBatch)?.name ?? '—'
    setStudents(list => list.map(x => x.id === selected.id ? { ...x, batch_id: enrollBatch || null, batch_name: batchName } : x))
    setSelected(s => ({ ...s, batch_id: enrollBatch || null, batch_name: batchName }))
    setEditEnroll(false)
    toast.success('Enrollment updated')
  }

  const toggleActive = async (s) => {
    setDeacting(s.id)
    await supabase.from('profiles').update({ is_active: !s.is_active }).eq('id', s.id)
    setStudents(list => list.map(x => x.id === s.id ? { ...x, is_active: !x.is_active } : x))
    toast.success(s.is_active ? 'Account deactivated' : 'Account reactivated')
    setDeacting(null)
  }

  const exportCSV = () => {
    const rows = [['Name','Email','Phone','Parent Phone','Batch','Roll','Attendance%','Fee Status','Active']]
    filtered.forEach(s => rows.push([s.full_name, s.email, s.phone||'', s.parent_phone||'', s.batch_name, s.roll_number, s.att_pct+'%', s.fee_status, s.is_active?'Yes':'No']))
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
    a.download = 'students.csv'; a.click()
  }

  const filtered = students.filter(s => {
    const matchSearch = s.full_name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase())
    const matchBatch  = !batchF || s.batch_id === batchF
    const matchAtt    = attF === 'all' || (attF==='good'&&s.att_pct>=75) || (attF==='warning'&&s.att_pct>=50&&s.att_pct<75) || (attF==='poor'&&s.att_pct<50)
    return matchSearch && matchBatch && matchAtt
  })

  const FEE_COLORS = { verified:'bg-green-100 text-green-800', pending:'bg-amber-100 text-amber-800', rejected:'bg-red-100 text-red-800', not_paid:'bg-gray-100 text-gray-600' }
  const FEE_LABELS = { verified:'Verified', pending:'Pending', rejected:'Rejected', not_paid:'Not Paid' }
  
  // Identify new students that registered in last 3 days
  const isNew = (dateString) => {
    const diff = new Date() - new Date(dateString);
    return diff < 3 * 24 * 60 * 60 * 1000;
  }

  return (
    <div className="space-y-4 pb-20 lg:pb-0">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students…"
            className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
        </div>
        <select value={batchF} onChange={e => setBatchF(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600">
          <option value="">All Batches</option>
          {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={attF} onChange={e => setAttF(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600">
          <option value="all">All Attendance</option>
          <option value="good">Good (≥75%)</option>
          <option value="warning">Warning (50–75%)</option>
          <option value="poor">Poor (&lt;50%)</option>
        </select>
        <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <p className="text-sm text-gray-500">{filtered.length} students</p>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Student','Batch','Phone','Attendance','Fee Status','Status','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(5)].map((_,i) => (
                  <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No students found</td></tr>
              ) : (
                filtered.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-950 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {s.full_name?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900">{s.full_name}</p>
                            {isNew(s.created_at) && (
                              <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">New</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{s.batch_name}</td>
                    <td className="px-4 py-3 text-gray-500">{s.phone || '—'}</td>
                    <td className="px-4 py-3 w-32"><AttBar pct={s.att_pct} /></td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${FEE_COLORS[s.fee_status]}`}>
                        {FEE_LABELS[s.fee_status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${s.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {s.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openStudent(s)} className="px-2.5 py-1 text-xs bg-blue-50 text-blue-700 rounded-lg font-medium hover:bg-blue-100">View</button>
                        <button onClick={() => toggleActive(s)} disabled={deacting===s.id}
                          className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${s.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
                          {s.is_active ? 'Suspend' : 'Restore'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/30" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <h3 className="font-bold text-gray-900">Student Profile</h3>
              <button onClick={() => setSelected(null)} className="p-1 text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5 space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-blue-950 text-white text-xl font-bold flex items-center justify-center">
                  {selected.full_name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                     <p className="font-bold text-lg text-gray-900">{selected.full_name}</p>
                     {isNew(selected.created_at) && (
                        <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wide">New</span>
                     )}
                  </div>
                  <p className="text-sm text-gray-500">{selected.email}</p>
                  {selected.phone && <p className="text-sm text-gray-500">{selected.phone}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Batch</p>
                  <p className="font-semibold text-gray-900 mt-0.5">{selected.batch_name}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Roll Number</p>
                  <p className="font-semibold text-gray-900 mt-0.5">{selected.roll_number}</p>
                </div>
                {/* Exposed Registration details that were previously hidden! */}
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Parent's Phone</p>
                  <p className="font-semibold text-gray-900 mt-0.5">{selected.parent_phone}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Date of Birth</p>
                  <p className="font-semibold text-gray-900 mt-0.5">
                    {selected.date_of_birth !== '—' && selected.date_of_birth 
                      ? new Date(selected.date_of_birth).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) 
                      : '—'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Attendance</p>
                  <p className="font-bold text-xl mt-0.5" style={{color: selected.att_pct>=75?'#16a34a':selected.att_pct>=50?'#d97706':'#dc2626'}}>
                    {selected.att_pct}%
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">This Month Fee</p>
                  <p className={`font-semibold mt-0.5 capitalize ${selected.fee_status==='verified'?'text-green-700':selected.fee_status==='pending'?'text-amber-700':'text-red-600'}`}>
                    {selected.fee_status.replace('_',' ')}
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1">Joined</p>
                <p className="font-medium text-gray-900 text-sm">
                  {new Date(selected.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-gray-800 text-sm">Enrollment</p>
                  {!editEnroll && (
                    <button onClick={() => setEditEnroll(true)} className="flex items-center gap-1 text-xs text-blue-700 hover:underline">
                      <Edit2 className="h-3.5 w-3.5" /> Edit
                    </button>
                  )}
                </div>
                {editEnroll ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Batch</label>
                      <select value={enrollBatch} onChange={e => onEnrollBatchChange(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600">
                        <option value="">No batch</option>
                        {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                    {batchSubjects.length > 0 && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Subjects</label>
                        <div className="flex flex-wrap gap-2">
                          {batchSubjects.map(sub => {
                            const chosen = enrollSubjects.includes(sub)
                            return (
                              <button key={sub} type="button" onClick={() => toggleEnrollSubject(sub)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-colors
                                  ${chosen ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}>
                                {chosen ? '✓ ' : ''}{sub}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => setEditEnroll(false)} className="flex-1 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50">
                        Cancel
                      </button>
                      <button onClick={saveEnrollment} disabled={savingEnroll} className="flex-1 py-2 bg-blue-950 text-white text-sm font-semibold rounded-lg hover:bg-blue-900 disabled:opacity-50">
                        {savingEnroll ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-700 space-y-1">
                    <p><span className="text-gray-400 text-xs">Batch: </span>{selected.batch_name}</p>
                    <p><span className="text-gray-400 text-xs">Subjects: </span>
                      {enrollSubjects.length > 0 ? enrollSubjects.join(', ') : <span className="text-gray-400">None set</span>}
                    </p>
                  </div>
                )}
              </div>

              <button onClick={() => toggleActive(selected)}
                className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-colors ${selected.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
                {selected.is_active ? 'Suspend Account' : 'Restore Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
