import { useState, useEffect, useCallback } from 'react'
import {
  Search, Download, X, Edit2, Clock, CheckCircle, AlertTriangle, RefreshCw,
  Shield, AlertCircle, Mail, Phone, Calendar, GraduationCap, UserCheck, UserX,
  Layers, Tag, Sparkles, Check, CreditCard, BookOpen
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import CustomSelect from '../../components/ui/CustomSelect'
import {
  checkBatchFeeStatus,
  formatStudentAccessBadge,
  getCurrentPaymentMonth,
  FEE_MODES
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
  const [statusF,       setStatusF]       = useState('all')
  const [loading,       setLoading]       = useState(true)
  const [dataError,     setDataError]     = useState(null)
  const [selected,      setSelected]      = useState(null)
  const [deacting,      setDeacting]      = useState(null)
  const [actingAction,  setActingAction]  = useState(false)
  
  const [editEnroll,    setEditEnroll]    = useState(false)
  const [enrollBatch,   setEnrollBatch]   = useState('')
  const [enrollSubjects, setEnrollSubjects] = useState([])
  const [batchSubjects, setBatchSubjects] = useState([])
  const [savingEnroll,  setSavingEnroll]  = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [p, sp, att, fees, b, overrides] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email, phone, is_active, created_at')
          .eq('role','student').order('created_at', { ascending: false }),
        supabase.from('student_profiles').select('id, batch_id, subjects, roll_number, parent_phone, date_of_birth, trial_ends_at, batches(id, name, fee_mode, fee_amount, validity_days, validity_end_date)'),
        supabase.from('attendance').select('student_id, status'),
        supabase.from('fee_records').select('*').order('paid_at', { ascending: false }),
        supabase.from('batches').select('*').order('name'),
        supabase.from('admin_access_overrides').select('*'),
      ])

      const queryErrors = [p.error, sp.error, att.error, fees.error, b.error, overrides.error].filter(Boolean)
      if (queryErrors.length > 0) {
        const errorMsg = queryErrors.map(e => e.message).join(' | ')
        console.error('Data error in StudentTracker query:', errorMsg)
        setDataError(errorMsg)
      } else {
        setDataError(null)
      }

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

        const hasFeeQueryError = Boolean(fees.error)
        const feeStatus = checkBatchFeeStatus({
          student: { 
            id: s.id, 
            is_active: s.is_active, 
            trial_ends_at: studentProfile?.trial_ends_at,
            _dataError: hasFeeQueryError 
          },
          batch: studentBatch,
          feeRecords: studentFees,
          adminOverrides: studentOverrides,
        })
        const accessBadge = formatStudentAccessBadge(feeStatus)

        return {
          ...s,
          batch_name:    studentProfile?.batches?.name ?? studentBatch?.name ?? '—',
          batch_id:      studentProfile?.batch_id ?? null,
          subjects:      studentProfile?.subjects ?? [],
          batch_fee_mode: studentBatch?.fee_mode || FEE_MODES.MONTHLY,
          batch_fee_amount: studentBatch?.fee_amount || 0,
          batch_validity_days: studentBatch?.validity_days || null,
          batch_validity_end_date: studentBatch?.validity_end_date || null,
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

      setSelected(prev => {
        if (!prev) return null
        return enriched.find(x => x.id === prev.id) || prev
      })
    } catch (err) {
      console.error('Error loading student tracker data:', err)
      setDataError(err.message || 'Network error loading student data')
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()

    // ── Realtime Synchronization across Fee Records, Profiles, and Overrides ──
    const channel = supabase.channel('admin_student_tracker_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fee_records' }, () => {
        loadData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_profiles' }, () => {
        loadData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        loadData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_access_overrides' }, () => {
        loadData()
      })
      .subscribe()

    // Revalidate on window focus
    const onFocus = () => loadData()
    window.addEventListener('focus', onFocus)

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('focus', onFocus)
    }
  }, [loadData])

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
    // First try direct update on existing student profile record
    const { data, error: updateError } = await supabase
      .from('student_profiles')
      .update({ batch_id: enrollBatch || null, subjects: enrollSubjects })
      .eq('id', selected.id)
      .select('id')

    let error = updateError
    // If no row existed to update, perform upsert (permitted by migration 048)
    if (!updateError && (!data || data.length === 0)) {
      const { error: upsertError } = await supabase
        .from('student_profiles')
        .upsert({ id: selected.id, batch_id: enrollBatch || null, subjects: enrollSubjects }, { onConflict: 'id' })
      error = upsertError
    }

    setSavingEnroll(false)
    if (error) { toast.error(error.message); return }
    const batchName = batches.find(b => b.id === enrollBatch)?.name ?? '—'
    setStudents(list => list.map(x => x.id === selected.id ? { ...x, batch_id: enrollBatch || null, batch_name: batchName, subjects: enrollSubjects } : x))
    setSelected(s => ({ ...s, batch_id: enrollBatch || null, batch_name: batchName, subjects: enrollSubjects }))
    setEditEnroll(false)
    toast.success('Enrollment updated successfully')
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
    const matchStatus = statusF === 'all'
      || (statusF === 'fee_paid' && s.accessBadge?.label === 'Fee Paid / Verified')
      || (statusF === 'provisional' && s.accessBadge?.label === 'Provisional Access')
      || (statusF === 'pending_verification' && s.accessBadge?.label === 'Pending Verification / Access Frozen')
      || (statusF === 'trial_active' && (s.accessBadge?.label?.startsWith('Trial Active') || s.accessBadge?.label?.startsWith('Trial Expiring')))
      || (statusF === 'trial_expired' && s.accessBadge?.label === 'Trial Expired / Access Frozen')
      || (statusF === 'fee_due' && s.accessBadge?.label === 'Fee Due / Grace Period')
      || (statusF === 'fee_overdue' && s.accessBadge?.label === 'Fee Overdue / Access Frozen')
      || (statusF === 'payment_rejected' && s.accessBadge?.label === 'Payment Rejected / Access Frozen')
      || (statusF === 'validity_expired' && s.accessBadge?.label === 'Course Validity Expired / Access Frozen')
      || (statusF === 'override_active' && s.accessBadge?.label === 'Access Granted / Fee Waived')
      || (statusF === 'account_suspended' && s.accessBadge?.label === 'Account Suspended')
      || (statusF === 'data_error' && s.accessBadge?.label === 'Data Error / Unable to Determine')
    return matchSearch && matchBatch && matchAtt && matchStatus
  })

  return (
    <div className="space-y-5 pb-28 sm:pb-32 lg:pb-12">
      {/* Executive Header Banner */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200/80">
              <UserCheck className="h-3 w-3 text-blue-600" /> Student Telemetry
            </span>
            <span className="text-xs font-bold text-slate-400">•</span>
            <span className="text-xs font-bold text-slate-500">{filtered.length} Enrolled</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Student Directory & Academic Tracking</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Active rosters, access authorization, attentiveness analytics & billing oversight</p>
        </div>
        <button
          onClick={exportCSV}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-2xs transition-all active:scale-95 cursor-pointer shrink-0"
        >
          <Download className="h-4 w-4 text-slate-500" /> Export CSV
        </button>
      </div>

      {dataError && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-amber-800 text-xs shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span><strong>Data Warning:</strong> Live database query encountered an issue ({dataError}). Impacted records are flagged with &quot;Data Error / Unable to Determine&quot;.</span>
          </div>
          <button onClick={loadData} className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow-2xs shrink-0 cursor-pointer">
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      )}

      {/* Filter Command Bar */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative w-full sm:flex-1 sm:min-w-[220px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search students…"
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50/50 shadow-2xs"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <div className="flex-1 sm:flex-initial min-w-[130px]">
              <CustomSelect
                value={batchF}
                onChange={setBatchF}
                options={[
                  { value: '', label: 'All Batches' },
                  ...batches.map(b => ({ value: b.id, label: b.name }))
                ]}
              />
            </div>
            <div className="flex-1 sm:flex-initial min-w-[160px]">
              <CustomSelect
                value={statusF}
                onChange={setStatusF}
                options={[
                  { value: 'all', label: 'All Access & Fee Statuses' },
                  { value: 'fee_paid', label: 'Fee Paid / Verified' },
                  { value: 'provisional', label: 'Provisional Access' },
                  { value: 'pending_verification', label: 'Pending Verification / Access Frozen' },
                  { value: 'trial_active', label: 'Trial Active' },
                  { value: 'trial_expired', label: 'Trial Expired / Access Frozen' },
                  { value: 'fee_due', label: 'Fee Due / Grace Period' },
                  { value: 'fee_overdue', label: 'Fee Overdue / Access Frozen' },
                  { value: 'payment_rejected', label: 'Payment Rejected / Access Frozen' },
                  { value: 'validity_expired', label: 'Course Validity Expired / Access Frozen' },
                  { value: 'override_active', label: 'Access Granted / Fee Waived' },
                  { value: 'account_suspended', label: 'Account Suspended' },
                  { value: 'data_error', label: 'Data Error / Unable to Determine' },
                ]}
              />
            </div>
            <div className="flex-1 sm:flex-initial min-w-[130px]">
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
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <p className="text-sm text-gray-500">{filtered.length} students</p>
          {(search || batchF || statusF !== 'all' || attF !== 'all') && (
            <button
              onClick={() => { setSearch(''); setBatchF(''); setStatusF('all'); setAttF('all') }}
              className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
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
                            {s.feeStatus?.isTrialActive && (
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
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-lg bg-slate-50 h-full overflow-y-auto shadow-2xl flex flex-col z-10">
            {/* Sticky Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-gray-200/80 px-6 py-4 flex items-center justify-between z-20 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-900">
                  <Shield className="w-4 h-4 text-blue-900" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900 text-base leading-tight">Student Profile</h3>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-blue-100/70 text-blue-900">
                      Roster & Audit
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">Comprehensive enrollment and fee governance</p>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                title="Close drawer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content Body with generous bottom padding so it never clips on mobile docks or browsers */}
            <div className="p-5 sm:p-6 space-y-5 pb-32 sm:pb-36 flex-1">
              {/* Identity Hero Card */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200/80 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-950 via-indigo-900 to-blue-900 text-white text-xl font-bold flex items-center justify-center ring-4 ring-blue-500/10 shadow-sm shrink-0">
                    {selected.full_name?.[0]?.toUpperCase() ?? '?'}
                    <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${selected.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h4 className="font-bold text-lg text-gray-950 tracking-tight leading-snug truncate">
                        {selected.full_name}
                      </h4>
                      {isNew(selected.created_at) && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
                          New
                        </span>
                      )}
                      {selected.feeStatus?.isTrialActive && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-amber-50 text-amber-800 border border-amber-200/80 shadow-2xs">
                          <Clock className="h-3 w-3 text-amber-600" />
                          {trialLabel(selected.trial_ends_at)}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-gray-600">
                      <span className="inline-flex items-center gap-1 text-gray-600">
                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                        <span className="truncate max-w-[220px]">{selected.email}</span>
                      </span>
                      {selected.phone && (
                        <span className="inline-flex items-center gap-1 text-gray-600 font-mono">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          {selected.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Telemetry Metric Capsules */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-white rounded-xl p-3 border border-gray-200/70 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Batch</span>
                  <div className="mt-1 flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="font-semibold text-gray-900 text-sm truncate">{selected.batch_name}</span>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-3 border border-gray-200/70 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Roll Number</span>
                  <div className="mt-1 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="font-mono font-bold text-gray-900 text-sm">{selected.roll_number || '—'}</span>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-3 border border-gray-200/70 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Parent&apos;s Phone</span>
                  <div className="mt-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="font-mono font-semibold text-gray-900 text-xs sm:text-sm truncate">
                      {selected.parent_phone || '—'}
                    </span>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-3 border border-gray-200/70 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Date of Birth</span>
                  <div className="mt-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="font-semibold text-gray-900 text-xs sm:text-sm truncate">
                      {selected.date_of_birth !== '—' && selected.date_of_birth 
                        ? new Date(selected.date_of_birth).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) 
                        : '—'}
                    </span>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-3 border border-gray-200/70 shadow-2xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Attendance</span>
                    <span className={`text-xs font-bold ${selected.att_pct>=75?'text-emerald-700':selected.att_pct>=50?'text-amber-700':'text-rose-600'}`}>
                      {selected.att_pct}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${selected.att_pct>=75?'bg-emerald-500':selected.att_pct>=50?'bg-amber-500':'bg-rose-500'}`}
                      style={{ width: `${selected.att_pct}%` }}
                    />
                  </div>
                </div>

                <div className="bg-white rounded-xl p-3 border border-gray-200/70 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Access Status</span>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border truncate max-w-full ${selected.accessBadge?.color || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                      {selected.accessBadge?.label || selected.fee_status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Member Since Strip */}
              <div className="bg-white/80 rounded-xl px-4 py-2.5 border border-gray-200/60 text-xs flex items-center justify-between text-gray-500">
                <span className="flex items-center gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5 text-gray-400" /> Registered Enrollee
                </span>
                <span className="font-semibold text-gray-800">
                  {new Date(selected.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                </span>
              </div>

              {/* Authoritative Access & Fee Details Breakdown */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200/80 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                    <Shield className="h-4 w-4 text-blue-900" /> Access & Fee Status
                  </h4>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${selected.accessBadge?.color || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                    {selected.accessBadge?.label || selected.fee_status}
                  </span>
                </div>

                {selected.feeStatus?.message && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-gray-700 font-medium leading-relaxed">
                    {selected.feeStatus.message}
                  </div>
                )}

                {/* Batch Fee Architecture Breakdown */}
                <div className="rounded-xl bg-gradient-to-br from-blue-50/70 to-indigo-50/40 border border-blue-100/90 p-3.5 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-blue-950 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-blue-700" />
                      Fee Architecture Details
                    </p>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-blue-100/80 text-blue-900 rounded-md">
                      {selected.batch_fee_mode === 'one_time' ? 'One-Time' : 'Monthly'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-gray-600 pt-1 border-t border-blue-100/60">
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">Fee Mode</span>
                      <span className="font-bold text-gray-900 capitalize text-xs">
                        {selected.batch_fee_mode === 'one_time' ? 'One-Time Course' : 'Monthly Fee'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">Scheduled Amount</span>
                      <span className="font-bold text-gray-900 text-xs">
                        ₹{(selected.batch_fee_amount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    {selected.batch_fee_mode === 'one_time' ? (
                      <div className="col-span-2 pt-1 border-t border-blue-100/40">
                        <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">Validity Policy</span>
                        <span className="font-semibold text-gray-800 text-xs">
                          {selected.batch_validity_days 
                            ? `${selected.batch_validity_days} Days from Payment`
                            : selected.batch_validity_end_date 
                            ? `Fixed Cutoff: ${selected.batch_validity_end_date}` 
                            : 'Full Lifetime Access'}
                        </span>
                      </div>
                    ) : (
                      <div className="col-span-2 pt-1 border-t border-blue-100/40">
                        <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">Current Billing Cycle</span>
                        <span className="font-semibold text-gray-800 text-xs">
                          {getCurrentPaymentMonth()} (Grace period: 1st–10th)
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Record Evidence */}
                {selected.feeStatus?.verifiedRecord && (
                  <div className="rounded-xl bg-emerald-50/90 border border-emerald-200 p-3 text-xs space-y-1">
                    <p className="font-bold text-emerald-950 flex items-center gap-1.5">
                      <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" /> Verified Payment Record
                    </p>
                    <p className="text-emerald-900 text-[11px] font-medium">
                      Paid on: {new Date(selected.feeStatus.verifiedRecord.paid_at || selected.feeStatus.verifiedRecord.created_at).toLocaleString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                    </p>
                    {selected.feeStatus.verifiedRecord.reference_id && (
                      <p className="text-emerald-800 text-[11px] font-mono bg-emerald-100/60 px-2 py-0.5 rounded inline-block mt-0.5">
                        UTR / Ref: {selected.feeStatus.verifiedRecord.reference_id}
                      </p>
                    )}
                  </div>
                )}

                {selected.feeStatus?.pendingRecord && (
                  <div className="rounded-xl bg-sky-50/90 border border-sky-200 p-3 text-xs space-y-1">
                    <p className="font-bold text-sky-950 flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-sky-600 shrink-0" /> Provisional Access Active (Under Review)
                    </p>
                    <p className="text-sky-900 text-[11px] font-medium">
                      Submitted on: {new Date(selected.feeStatus.pendingRecord.paid_at || selected.feeStatus.pendingRecord.created_at).toLocaleString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                    </p>
                    {selected.feeStatus.pendingRecord.reference_id && (
                      <p className="text-sky-800 text-[11px] font-mono bg-sky-100/60 px-2 py-0.5 rounded inline-block mt-0.5">
                        UTR / Ref: {selected.feeStatus.pendingRecord.reference_id}
                      </p>
                    )}
                  </div>
                )}

                {selected.feeStatus?.rejectedRecord && (
                  <div className="rounded-xl bg-rose-50/90 border border-rose-200 p-3 text-xs space-y-1">
                    <p className="font-bold text-rose-950 flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" /> Payment Submission Rejected
                    </p>
                    <p className="text-rose-900 text-[11px]">
                      Reason: {selected.feeStatus.rejectedRecord.notes || 'Payment could not be verified in bank ledger.'}
                    </p>
                  </div>
                )}

                {selected.feeStatus?.override && (
                  <div className="rounded-xl bg-teal-50/90 border border-teal-200 p-3 text-xs space-y-1">
                    <p className="font-bold text-teal-950 flex items-center gap-1.5">
                      <Shield className="h-4 w-4 text-teal-600 shrink-0" /> Administrative Access Waiver
                    </p>
                    <p className="text-teal-900 text-[11px]">
                      Reason: {selected.feeStatus.override.reason || 'Approved by Admin'}
                    </p>
                  </div>
                )}

                {/* Free Trial Countdown */}
                {selected.trial_ends_at && (
                  <div className={`rounded-xl p-3 text-xs border ${
                    isTrialExpired(selected.trial_ends_at)
                      ? 'bg-rose-50 border-rose-200 text-rose-900'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}>
                    <div className="font-bold mb-0.5 flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      {isTrialExpired(selected.trial_ends_at) ? 'Free Trial Expired' : 'Free Trial Active'}
                    </div>
                    <p className="text-gray-600 text-[11px] leading-relaxed">
                      {isTrialExpired(selected.trial_ends_at)
                        ? `Expired on ${new Date(selected.trial_ends_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}`
                        : `Valid until ${new Date(selected.trial_ends_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })} (${trialLabel(selected.trial_ends_at)})`
                      }
                    </p>
                  </div>
                )}

                {/* Administrative Controls */}
                <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
                  <button
                    onClick={() => grantFullAccess(selected.id)}
                    disabled={actingAction}
                    className="w-full py-2.5 px-3 text-xs font-bold bg-blue-950 text-white hover:bg-blue-900 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                  >
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                    {actingAction ? 'Processing...' : 'Approve & Grant Full Access'}
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => extendTrial(selected.id, 2)}
                      disabled={actingAction}
                      className="flex-1 py-2 px-2 text-xs font-semibold border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 rounded-xl transition-colors shadow-2xs disabled:opacity-50 text-center cursor-pointer"
                    >
                      +2 Days Trial
                    </button>
                    <button
                      onClick={() => extendTrial(selected.id, 7)}
                      disabled={actingAction}
                      className="flex-1 py-2 px-2 text-xs font-semibold border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 rounded-xl transition-colors shadow-2xs disabled:opacity-50 text-center cursor-pointer"
                    >
                      +7 Days Trial
                    </button>
                  </div>
                </div>
              </div>

              {/* Enrollment & Curriculum Card */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200/80 shadow-2xs space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-blue-900" />
                    <p className="font-bold text-gray-900 text-sm">Enrollment</p>
                  </div>
                  {!editEnroll && (
                    <button
                      onClick={() => setEditEnroll(true)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-900 hover:text-blue-950 bg-blue-50 hover:bg-blue-100/70 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit2 className="h-3 w-3" /> Edit
                    </button>
                  )}
                </div>

                {editEnroll ? (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                        Target Batch
                      </label>
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
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                          Elective Subjects
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {batchSubjects.map(sub => {
                            const chosen = enrollSubjects.includes(sub)
                            return (
                              <button
                                key={sub}
                                type="button"
                                onClick={() => toggleEnrollSubject(sub)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer
                                  ${chosen 
                                    ? 'border-blue-950 bg-blue-950 text-white shadow-xs' 
                                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'}`}
                              >
                                {chosen && <Check className="w-3.5 h-3.5 text-emerald-300" />}
                                {sub}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => setEditEnroll(false)}
                        className="flex-1 py-2 border border-gray-200 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveEnrollment}
                        disabled={savingEnroll}
                        className="flex-1 py-2 bg-blue-950 text-white text-xs font-bold rounded-xl hover:bg-blue-900 transition-colors disabled:opacity-50 shadow-2xs cursor-pointer"
                      >
                        {savingEnroll ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between py-1 border-b border-gray-100">
                      <span className="text-gray-400 font-medium">Assigned Cohort</span>
                      <span className="font-bold text-gray-900">{selected.batch_name}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-medium block mb-1.5">Enrolled Subjects</span>
                      {enrollSubjects.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {enrollSubjects.map(s => (
                            <span
                              key={s}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">None set</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Danger Zone / Account Status Toggle */}
              <div className="pt-2">
                <button
                  onClick={() => toggleActive(selected)}
                  disabled={deacting === selected.id}
                  className={`w-full py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs ${
                    selected.is_active 
                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80' 
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80'
                  }`}
                >
                  {selected.is_active ? (
                    <>
                      <UserX className="w-4 h-4 text-rose-600" />
                      {deacting === selected.id ? 'Suspending...' : 'Suspend Account'}
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4 text-emerald-600" />
                      {deacting === selected.id ? 'Restoring...' : 'Restore Account'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
