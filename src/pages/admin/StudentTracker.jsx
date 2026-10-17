import { useState, useEffect } from 'react'
import { Search, Download, X, Edit2, Clock, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import CustomSelect from '../../components/ui/CustomSelect'
import {
  checkBatchFeeStatus,
  formatAccessStatusBadge,
  getCurrentPaymentMonth
} from '../../utils/feeAccess'

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
  const { user } = useAuth()
  const [students,      setStudents]      = useState([])
  const [batches,       setBatches]       = useState([])
  const [search,        setSearch]        = useState('')
  const [batchF,        setBatchF]        = useState('')
  const [attF,          setAttF]          = useState('all')
  const [loading,       setLoading]       = useState(true)
  const [selected,      setSelected]      = useState(null)
  const [deacting,      setDeacting]      = useState(null)
  const [actingAction,  setActingAction]  = useState(false)
  
  const [editEnroll,    setEditEnroll]    = useState(false)
  const [enrollBatch,   setEnrollBatch]   = useState('')
  const [enrollSubjects, setEnrollSubjects] = useState([])
  const [batchSubjects, setBatchSubjects] = useState([])
  const [savingEnroll,  setSavingEnroll]  = useState(false)

  const loadData = async () => {
    try {
      const [p, sp, att, fees, b, overrides] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email, phone, is_active, created_at')
          .eq('role','student').order('created_at', { ascending: false }),
        supabase.from('student_profiles').select('id, batch_id, roll_number, parent_phone, date_of_birth, trial_ends_at, batches(id, name, fee_mode, fee_amount, validity_days, validity_end_date)'),
        supabase.from('attendance').select('student_id, status'),
        supabase.from('fee_records').select('*').order('created_at', { ascending: false }),
        supabase.from('batches').select('*').order('name'),
        supabase.from('admin_access_overrides').select('*'),
      ])

      const spMap  = {}; (sp.data ?? []).forEach(s => { spMap[s.id] = s })
      const batchesList = b.data ?? []
      const batchMap = {}; batchesList.forEach(item => { batchMap[item.id] = item })
      
      const studentFeesMap = {}
      ;(fees.data ?? []).forEach(f => {
        if (!studentFeesMap[f.student_id]) studentFeesMap[f.student_id] = []
        studentFeesMap[f.student_id].push(f)
      })

      const studentOverridesMap = {}
      ;(overrides.data ?? []).forEach(o => {
        if (!studentOverridesMap[o.student_id]) studentOverridesMap[o.student_id] = []
        studentOverridesMap[o.student_id].push(o)
      })

      const attMap = {}
      ;(att.data ?? []).forEach(a => {
        if (!attMap[a.student_id]) attMap[a.student_id] = { present:0, late:0, total:0 }
        attMap[a.student_id].total++
        if (a.status === 'present') attMap[a.student_id].present++
        else if (a.status === 'late') attMap[a.student_id].late++
      })

      const enriched = (p.data ?? []).map(s => {
        const studentProfile = spMap[s.id]
        const studentBatch = studentProfile?.batch_id ? batchMap[studentProfile.batch_id] : null
        const studentFees = studentFeesMap[s.id] || []
        const studentOverrides = studentOverridesMap[s.id] || []

        const feeStatus = checkBatchFeeStatus({
          student: { id: s.id, is_active: s.is_active, trial_ends_at: studentProfile?.trial_ends_at },
          batch: studentBatch,
          feeRecords: studentFees,
          adminOverrides: studentOverrides,
        })
        const accessBadge = formatAccessStatusBadge(feeStatus)

        return {
          ...s,
          batch_name:    studentProfile?.batches?.name ?? studentBatch?.name ?? '—',
          batch_id:      studentProfile?.batch_id ?? null,
          roll_number:   studentProfile?.roll_number ?? '—',
          parent_phone:  studentProfile?.parent_phone ?? '—',
          date_of_birth: studentProfile?.date_of_birth ?? '—',
          trial_ends_at: studentProfile?.trial_ends_at ?? null,
          att_pct:       attMap[s.id]
            ? Math.round(((attMap[s.id].present + attMap[s.id].late * 0.5) / attMap[s.id].total) * 100) : 0,
          fee_status:    feeStatus.status,
          feeStatus,
          accessBadge,
          feeRecords:    studentFees,
          adminOverrides: studentOverrides,
        }
      })
      setStudents(enriched)
      setBatches(batchesList)
      setLoading(false)

      if (selected) {
        const updatedSelected = enriched.find(x => x.id === selected.id)
        if (updatedSelected) setSelected(updatedSelected)
      }
    } catch (err) {
      console.error('Error loading student tracker data:', err)
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      .upsert({ id: selected.id, batch_id: enrollBatch || null, subjects: enrollSubjects }, { onConflict: 'id' })
    setSavingEnroll(false)
    if (error) { toast.error(error.message); return }
    const batchName = batches.find(b => b.id === enrollBatch)?.name ?? '—'
    setStudents(list => list.map(x => x.id === selected.id ? { ...x, batch_id: enrollBatch || null, batch_name: batchName } : x))
    setSelected(s => ({ ...s, batch_id: enrollBatch || null, batch_name: batchName }))
    setEditEnroll(false)
    toast.success('Enrollment updated')
    loadData()
  }

  const toggleActive = async (s) => {
    setDeacting(s.id)
    const { error } = await supabase.from('profiles').update({ is_active: !s.is_active }).eq('id', s.id)
    setDeacting(null)
    if (error) { toast.error(error.message); return }
    setStudents(list => list.map(x => x.id === s.id ? { ...x, is_active: !x.is_active } : x))
    if (selected?.id === s.id) setSelected(prev => ({ ...prev, is_active: !prev.is_active }))
    toast.success(s.is_active ? 'Account suspended' : 'Account restored')
    loadData()
  }

  const exportCSV = () => {
    const rows = [['Name','Email','Phone','Parent Phone','Batch','Roll','Attendance%','Access Status','Active']]
    filtered.forEach(s => rows.push([s.full_name, s.email, s.phone||'', s.parent_phone||'', s.batch_name, s.roll_number, s.att_pct+'%', s.accessBadge?.label || s.fee_status, s.is_active?'Yes':'No']))
    const csv = rows.map(r => r.map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(',')).join('\n')
    const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
    a.download = 'students.csv'; a.click()
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const isTrialExpired = (trialEndsAt) => {
    if (!trialEndsAt) return false
    return new Date(trialEndsAt) < new Date()
  }

  const isTrialActive = (trialEndsAt) => {
    if (!trialEndsAt) return false
    return new Date(trialEndsAt) > new Date()
  }

  const trialLabel = (trialEndsAt) => {
    if (!trialEndsAt) return null
    const diff = new Date(trialEndsAt) - Date.now()
    if (diff <= 0) return null
    const h = Math.floor(diff / 3600000)
    if (h < 24) return `${h}h left`
    return `${Math.floor(h / 24)}d left`
  }

  // ── Authoritative Admin Actions ─────────────────────────────────────────────

  // 1. Approve & Grant Full Access (Audited administrative override / monthly fee waiver)
  const grantFullAccess = async (studentId) => {
    const st = students.find(x => x.id === studentId) || selected
    if (!st || !st.batch_id) {
      toast.error('Student must be enrolled in a batch to grant access.')
      return
    }
    const currentBatch = batches.find(b => b.id === st.batch_id)
    const currentMonth = getCurrentPaymentMonth()
    setActingAction(true)

    const isOneTime = currentBatch?.fee_mode === 'one_time'
    const grantType = isOneTime ? 'full_access_override' : 'monthly_fee_waiver'
    let validUntil = null
    if (isOneTime) {
      if (currentBatch?.validity_end_date) {
        validUntil = new Date(`${currentBatch.validity_end_date}T23:59:59+05:30`).toISOString()
      } else if (currentBatch?.validity_days) {
        validUntil = new Date(Date.now() + currentBatch.validity_days * 86400000).toISOString()
      }
    }

    const payload = {
      student_id: studentId,
      batch_id: st.batch_id,
      grant_type: grantType,
      billing_month: isOneTime ? null : currentMonth,
      valid_until: validUntil,
      granted_by: user.id,
      reason: 'Approve & Grant Full Access by Administrator',
    }

    const { error } = await supabase.from('admin_access_overrides').insert(payload)
    if (error) {
      setActingAction(false)
      toast.error(error.message)
      return
    }

    // Activity log
    try {
      await supabase.from('activity_logs').insert({
        user_id: user.id,
        user_name: 'Admin',
        user_role: 'admin',
        action_type: 'admin_access_granted',
        entity_type: 'batch_access',
        entity_title: `Full Access Granted - ${st.full_name}`,
        batch_id: st.batch_id || null,
        details: JSON.stringify({ grant_type: grantType, student_id: studentId, billing_month: payload.billing_month }),
      })
    } catch (aErr) {
      console.warn(aErr)
    }

    // Notify student
    try {
      await supabase.from('notifications').insert({
        title: 'Batch Access Approved',
        body: `The administrator has approved and granted full access to ${currentBatch?.name || 'your batch'}.`,
        type: 'fee',
        target_role: 'individual',
        target_user_id: studentId,
        target_batch_id: st.batch_id || null,
        created_by: user.id,
        is_active: true,
      })
      await supabase.from('messages').insert({
        sender_id: user.id,
        receiver_id: studentId,
        content: `The administrator has approved and granted full access to your batch (${currentBatch?.name || 'Batch'}).`,
        batch_id: st.batch_id || null,
        is_broadcast: false,
      })
    } catch (mErr) {
      console.warn(mErr)
    }

    setActingAction(false)
    toast.success('Full access granted & student notified!')
    loadData()
  }

  // 2. Extend Trial by N days
  const extendTrial = async (studentId, days = 2) => {
    const st = students.find(x => x.id === studentId) || selected
    if (!st) return
    setActingAction(true)

    const base = (st.trial_ends_at && new Date(st.trial_ends_at) > new Date()) ? new Date(st.trial_ends_at) : new Date()
    const newExpiry = new Date(base.getTime() + days * 86400000).toISOString()

    const { error } = await supabase.from('student_profiles').update({ trial_ends_at: newExpiry }).eq('id', studentId)
    if (error) {
      setActingAction(false)
      toast.error(error.message)
      return
    }

    // Activity log & notification
    try {
      await supabase.from('activity_logs').insert({
        user_id: user.id,
        user_name: 'Admin',
        user_role: 'admin',
        action_type: 'trial_extended',
        entity_type: 'student_trial',
        entity_title: `Trial Extended (${days} days) - ${st.full_name}`,
        batch_id: st.batch_id || null,
        details: JSON.stringify({ days, new_expiry: newExpiry }),
      })
      await supabase.from('notifications').insert({
        title: 'Free Trial Extended',
        body: `Your free batch trial has been extended by ${days} day(s).`,
        type: 'announcement',
        target_role: 'individual',
        target_user_id: studentId,
        target_batch_id: st.batch_id || null,
        created_by: user.id,
        is_active: true,
      })
    } catch (err) {
      console.warn(err)
    }

    setActingAction(false)
    toast.success(`Trial extended by ${days} days!`)
    loadData()
  }

  // Identify new students that registered in last 3 days
  const isNew = (dateString) => {
    const diff = new Date() - new Date(dateString)
    return diff < 3 * 24 * 60 * 60 * 1000
  }

  const filtered = students.filter(s => {
    const q = search.toLowerCase().trim()
    const matchSearch = !q || (s.full_name?.toLowerCase() ?? '').includes(q) || (s.email?.toLowerCase() ?? '').includes(q)
    const matchBatch  = !batchF || s.batch_id === batchF
    const matchAtt    = attF === 'all'
      || (attF==='good'         && s.att_pct>=75)
      || (attF==='warning'      && s.att_pct>=50 && s.att_pct<75)
      || (attF==='poor'         && s.att_pct<50)
      || (attF==='trial_expired' && isTrialExpired(s.trial_ends_at))
    return matchSearch && matchBatch && matchAtt
  })

  return (
    <div className="space-y-4 pb-20 lg:pb-0">
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students…"
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white shadow-2xs" />
        </div>
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <div className="flex-1 sm:flex-initial min-w-[125px]">
            <CustomSelect
              value={batchF}
              onChange={setBatchF}
              options={[
                { value: '', label: 'All Batches' },
                ...batches.map(b => ({ value: b.id, label: b.name }))
              ]}
            />
          </div>
          <div className="flex-1 sm:flex-initial min-w-[135px]">
            <CustomSelect
              value={attF}
              onChange={setAttF}
              options={[
                { value: 'all', label: 'All Attendance' },
                { value: 'good', label: 'Good (≥75%)' },
                { value: 'warning', label: 'Warning (50–75%)' },
                { value: 'poor', label: 'Poor (<50%)' },
                { value: 'trial_expired', label: '🔴 Trial Expired' },
              ]}
            />
          </div>
          <button onClick={exportCSV} className="inline-flex items-center justify-center gap-2 px-3 py-2 border border-gray-200 bg-white rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all shrink-0 whitespace-nowrap active:scale-95 shadow-2xs h-[36px]">
            <Download className="h-3.5 w-3.5 shrink-0 text-gray-500" /> Export CSV
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-500">{filtered.length} students</p>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Student','Batch','Phone','Attendance','Access & Fee','Account','Actions'].map(h => (
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
                            {isTrialExpired(s.trial_ends_at) && (
                              <span className="bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">Trial Over</span>
                            )}
                            {isTrialActive(s.trial_ends_at) && (
                              <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase flex items-center gap-0.5">
                                <Clock className="h-2.5 w-2.5" />{trialLabel(s.trial_ends_at)}
                              </span>
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
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${s.accessBadge?.color || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                        {s.accessBadge?.label || s.fee_status}
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
                     {isTrialExpired(selected.trial_ends_at) && (
                        <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wide">Trial Over</span>
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
                  <p className="text-xs text-gray-500">Parent&apos;s Phone</p>
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
                  <p className="text-xs text-gray-500">Access Status</p>
                  <p className="mt-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${selected.accessBadge?.color || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                      {selected.accessBadge?.label || selected.fee_status}
                    </span>
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1">Joined</p>
                <p className="font-medium text-gray-900 text-sm">
                  {new Date(selected.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}
                </p>
              </div>

              {/* Access & Trial Controls */}
              <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Access & Trial Controls</h4>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${selected.accessBadge?.color || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                    {selected.accessBadge?.label || selected.fee_status}
                  </span>
                </div>

                {selected.trial_ends_at && (
                  <div className={`rounded-lg p-3 text-xs border ${
                    isTrialExpired(selected.trial_ends_at)
                      ? 'bg-red-50 border-red-200 text-red-800'
                      : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}>
                    <div className="font-semibold mb-0.5 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {isTrialExpired(selected.trial_ends_at) ? 'Free Trial Expired' : 'Free Trial Active'}
                    </div>
                    <p className="text-gray-600">
                      {isTrialExpired(selected.trial_ends_at)
                        ? `Expired on ${new Date(selected.trial_ends_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}`
                        : `Valid until ${new Date(selected.trial_ends_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })} (${trialLabel(selected.trial_ends_at)})`
                      }
                    </p>
                  </div>
                )}

                {selected.feeStatus?.message && (
                  <p className="text-xs text-gray-500 italic">
                    Status info: {selected.feeStatus.message}
                  </p>
                )}

                <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
                  <button
                    onClick={() => grantFullAccess(selected.id)}
                    disabled={actingAction}
                    className="w-full py-2 px-3 text-xs font-semibold bg-blue-950 text-white hover:bg-blue-900 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-2xs disabled:opacity-50"
                  >
                    <CheckCircle className="h-4 w-4" />
                    {actingAction ? 'Processing...' : 'Approve & Grant Full Access'}
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => extendTrial(selected.id, 2)}
                      disabled={actingAction}
                      className="flex-1 py-1.5 px-2 text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50 text-center"
                    >
                      +2 Days Trial
                    </button>
                    <button
                      onClick={() => extendTrial(selected.id, 7)}
                      disabled={actingAction}
                      className="flex-1 py-1.5 px-2 text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50 text-center"
                    >
                      +7 Days Trial
                    </button>
                  </div>
                </div>
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
                      <CustomSelect
                        value={enrollBatch}
                        onChange={val => onEnrollBatchChange(val)}
                        options={[
                          { value: '', label: 'No batch' },
                          ...batches.map(b => ({ value: b.id, label: b.name }))
                        ]}
                      />
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
