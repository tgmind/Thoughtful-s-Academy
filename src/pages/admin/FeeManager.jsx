import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle,
  XCircle,
  Download,
  Search,
  MessageSquare,
  Users,
  Calendar,
  Filter,
  Phone,
  ShieldAlert,
  Sparkles,
  UserX,
  Clock,
  TrendingUp,
  ExternalLink
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { normalizeUrl } from '../../utils/formatters'
import CustomSelect from '../../components/ui/CustomSelect'

function getMonths() {
  const months = []
  const now = new Date()
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }))
  }
  return months
}

const MONTHS = getMonths()
const TABS = ['Fee Defaulters', 'Pending Verifications', 'All Records']
const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  verified: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  rejected: 'bg-rose-100 text-rose-800 border-rose-200'
}

export default function FeeManager() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [tab, setTab] = useState('Fee Defaulters')
  const [pending, setPending] = useState([])
  const [all, setAll] = useState([])
  const [batches, setBatches] = useState([])
  const [students, setStudents] = useState([])
  const [allFeeRecords, setAllFeeRecords] = useState([])

  // Filters for Defaulters section
  const [defaulterMonth, setDefaulterMonth] = useState(MONTHS[0])
  const [defaulterBatch, setDefaulterBatch] = useState('all')
  const [defaulterSearch, setDefaulterSearch] = useState('')
  const [defaulterStatusFilter, setDefaulterStatusFilter] = useState('unpaid') // 'all' | 'unpaid' | 'pending' | 'verified' | 'repeat'

  // Search & Status filters for All Records tab
  const [search, setSearch] = useState('')
  const [statusF, setStatusF] = useState('')

  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(null)
  const [rejectId, setRejectId] = useState(null)
  const [reason, setReason] = useState('')

  const loadAllData = async () => {
    try {
      const [pendingRes, allRes, batchesRes, profilesRes, studentProfilesRes, allFeesRes] = await Promise.all([
        supabase.from('fee_records').select('*, profiles!student_id(full_name, email)').eq('status', 'pending').order('paid_at'),
        supabase.from('fee_records').select('*, profiles!student_id(full_name, email)').order('paid_at', { ascending: false }).limit(200),
        supabase.from('batches').select('id, name').eq('is_active', true).order('name'),
        supabase.from('profiles').select('id, full_name, email, phone, is_active').eq('role', 'student').eq('is_active', true).order('full_name'),
        supabase.from('student_profiles').select('id, batch_id, roll_number, parent_phone, batches(id, name)'),
        supabase.from('fee_records').select('id, student_id, amount, payment_month, status, reference_id, paid_at')
      ])

      setPending(pendingRes.data ?? [])
      setAll(allRes.data ?? [])
      setBatches(batchesRes.data ?? [])
      setAllFeeRecords(allFeesRes.data ?? [])

      const spMap = {}
      ;(studentProfilesRes.data ?? []).forEach(sp => { spMap[sp.id] = sp })

      const enrichedStudents = (profilesRes.data ?? []).map(p => {
        const sp = spMap[p.id] || {}
        return {
          ...p,
          batch_id: sp.batch_id || null,
          batch_name: sp.batches?.name || 'Unassigned',
          roll_number: sp.roll_number || '—',
          parent_phone: sp.parent_phone || '—',
        }
      })

      setStudents(enrichedStudents)
    } catch (err) {
      console.error(err)
      toast.error('Failed to load fee data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAllData()

    const channel = supabase.channel('admin_fee_manager_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fee_records' }, () => {
        loadAllData()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const verify = async (id) => {
    setActing(id)
    const { error } = await supabase.from('fee_records').update({
      status: 'verified',
      verified_by: user.id,
      verified_at: new Date().toISOString()
    }).eq('id', id)
    setActing(null)
    if (error) { toast.error(error.message); return }
    toast.success('Fee payment verified ✓')
    loadAllData()
  }

  const reject = async () => {
    if (!rejectId) return
    setActing(rejectId)
    const { error } = await supabase.from('fee_records').update({
      status: 'rejected',
      notes: reason,
      verified_by: user.id,
      verified_at: new Date().toISOString()
    }).eq('id', rejectId)
    setActing(null)
    if (error) { toast.error(error.message); return }
    toast.success('Fee payment rejected')
    setRejectId(null)
    setReason('')
    loadAllData()
  }

  const exportCSV = () => {
    const rows = [['Student', 'Email', 'Month', 'Amount', 'Reference', 'Status', 'Date']]
    filteredAll.forEach(r => rows.push([
      r.profiles?.full_name ?? '',
      r.profiles?.email ?? '',
      r.payment_month,
      r.amount,
      r.reference_id || '',
      r.status,
      r.paid_at ? new Date(r.paid_at).toLocaleDateString('en-IN') : ''
    ]))
    const csv = rows.map(r => r.map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(',')).join('\n')
    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
    a.download = 'fees.csv'
    a.click()
  }

  // ─── DEFAULTERS ANALYSIS COMPUTATION ──────────────────────────────────────────
  const defaulterAnalysis = useMemo(() => {
    const feeLookup = {}
    allFeeRecords.forEach(r => {
      const key = `${r.student_id}__${r.payment_month}`
      if (!feeLookup[key] || r.status === 'verified') {
        feeLookup[key] = r
      }
    })

    const studentAnalysis = students.map(st => {
      const history = MONTHS.map(m => {
        const rec = feeLookup[`${st.id}__${m}`]
        return {
          month: m,
          status: rec ? rec.status : 'not_submitted',
          record: rec || null,
        }
      })

      const currentMonthInfo = history.find(h => h.month === defaulterMonth) || { status: 'not_submitted', record: null }

      let consecutiveUnpaid = 0
      for (const h of history) {
        if (h.status === 'not_submitted' || h.status === 'rejected') {
          consecutiveUnpaid++
        } else {
          break
        }
      }

      const totalUnpaid6M = history.filter(h => h.status === 'not_submitted' || h.status === 'rejected').length
      const totalVerified6M = history.filter(h => h.status === 'verified').length

      const isRepeatDefaulter = consecutiveUnpaid >= 2 || (totalUnpaid6M >= 3 && currentMonthInfo.status !== 'verified')
      const isTimelyPayer = totalVerified6M >= 4 && consecutiveUnpaid === 0

      return {
        ...st,
        currentStatus: currentMonthInfo.status,
        currentRecord: currentMonthInfo.record,
        history,
        consecutiveUnpaid,
        totalUnpaid6M,
        totalVerified6M,
        isRepeatDefaulter,
        isTimelyPayer,
      }
    })

    return studentAnalysis
  }, [students, allFeeRecords, defaulterMonth])

  // Filtered defaulter students list
  const filteredDefaulterStudents = useMemo(() => {
    let result = defaulterAnalysis

    if (defaulterBatch !== 'all') {
      result = result.filter(s => s.batch_id === defaulterBatch)
    }

    if (defaulterStatusFilter === 'unpaid') {
      result = result.filter(s => s.currentStatus === 'not_submitted' || s.currentStatus === 'rejected')
    } else if (defaulterStatusFilter === 'pending') {
      result = result.filter(s => s.currentStatus === 'pending')
    } else if (defaulterStatusFilter === 'verified') {
      result = result.filter(s => s.currentStatus === 'verified')
    } else if (defaulterStatusFilter === 'repeat') {
      result = result.filter(s => s.isRepeatDefaulter)
    }

    if (defaulterSearch.trim()) {
      const q = defaulterSearch.toLowerCase().trim()
      result = result.filter(s =>
        s.full_name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.roll_number?.toLowerCase().includes(q) ||
        s.phone?.includes(q) ||
        s.parent_phone?.includes(q) ||
        s.batch_name?.toLowerCase().includes(q)
      )
    }

    return result
  }, [defaulterAnalysis, defaulterBatch, defaulterStatusFilter, defaulterSearch])

  // Summary Metrics for Defaulters Tab
  const defaulterMetrics = useMemo(() => {
    const pool = defaulterBatch === 'all'
      ? defaulterAnalysis
      : defaulterAnalysis.filter(s => s.batch_id === defaulterBatch)

    const total = pool.length
    const unpaid = pool.filter(s => s.currentStatus === 'not_submitted' || s.currentStatus === 'rejected').length
    const pendingCount = pool.filter(s => s.currentStatus === 'pending').length
    const verifiedCount = pool.filter(s => s.currentStatus === 'verified').length
    const repeatCount = pool.filter(s => s.isRepeatDefaulter).length

    const complianceRate = total > 0 ? Math.round((verifiedCount / total) * 100) : 0

    const totalCollected = pool.reduce((acc, s) => {
      if (s.currentStatus === 'verified' && s.currentRecord?.amount) {
        return acc + Number(s.currentRecord.amount)
      }
      return acc
    }, 0)

    return { total, unpaid, pendingCount, verifiedCount, repeatCount, complianceRate, totalCollected }
  }, [defaulterAnalysis, defaulterBatch])

  const filteredAll = useMemo(() => {
    return all.filter(r => {
      const q = search.toLowerCase().trim()
      const matchS = !q || (r.profiles?.full_name?.toLowerCase() || '').includes(q) || (r.profiles?.email?.toLowerCase() || '').includes(q)
      const matchSt = !statusF || r.status === statusF
      return matchS && matchSt
    })
  }, [all, search, statusF])

  if (loading) return <div className="py-12 text-center text-slate-400 text-xs sm:text-sm font-semibold">Loading fee records…</div>

  return (
    <div className="space-y-4 sm:space-y-5 pb-20 lg:pb-0 min-w-0 w-full">
      {/* STATIC TOP HEADER NAVIGATION TABS (No horizontal scrolling / no slider) */}
      <div className="bg-white p-2 sm:p-3 rounded-2xl border border-slate-200/80 shadow-sm w-full">
        <div className="grid grid-cols-3 gap-1 sm:gap-2 w-full">
          {TABS.map(t => {
            const isActive = tab === t
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`w-full py-2 sm:py-2.5 px-1 sm:px-3 rounded-xl text-[11px] sm:text-xs md:text-sm font-extrabold transition-all flex items-center justify-center gap-1 sm:gap-2 text-center cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-slate-50 border border-slate-200/80 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {t === 'Fee Defaulters' && <UserX className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-rose-500 shrink-0" />}
                {t === 'Pending Verifications' && <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500 shrink-0" />}
                {t === 'All Records' && <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500 shrink-0" />}
                <span className="truncate">
                  {t === 'Fee Defaulters' ? (
                    <>
                      <span className="hidden sm:inline">Fee Defaulters</span>
                      <span className="sm:hidden">Defaulters</span>
                    </>
                  ) : t === 'Pending Verifications' ? (
                    <>
                      <span className="hidden sm:inline">Pending Verifications</span>
                      <span className="sm:hidden">Pending</span>
                    </>
                  ) : (
                    <>
                      <span className="hidden sm:inline">All Records</span>
                      <span className="sm:hidden">All Records</span>
                    </>
                  )}
                </span>
                {t === 'Pending Verifications' && pending.length > 0 && (
                  <span className="bg-amber-500 text-white text-[10px] font-extrabold rounded-full px-1.5 py-0.2 shrink-0 animate-pulse">
                    {pending.length}
                  </span>
                )}
                {t === 'Fee Defaulters' && defaulterMetrics.unpaid > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] font-extrabold rounded-full px-1.5 py-0.2 shrink-0">
                    {defaulterMetrics.unpaid}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ─── TAB 1: FEE DEFAULTERS (UNPAID SECTION) ────────────────────────────── */}
      {tab === 'Fee Defaulters' && (
        <div className="space-y-4 sm:space-y-5 min-w-0 w-full">
          {/* Controls Bar: Month, Batch & Search Filters */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3 sm:space-y-4 w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 w-full">
              {/* Month Selector */}
              <div>
                <label className="block text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-blue-600" /> Target Month
                </label>
                <CustomSelect
                  value={defaulterMonth}
                  onChange={setDefaulterMonth}
                  options={MONTHS.map(m => ({ value: m, label: m }))}
                />
              </div>

              {/* Batch Selector */}
              <div>
                <label className="block text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-purple-600" /> Batch Filter
                </label>
                <CustomSelect
                  value={defaulterBatch}
                  onChange={setDefaulterBatch}
                  options={[
                    { value: 'all', label: 'All Active Batches' },
                    ...batches.map(b => ({ value: b.id, label: b.name }))
                  ]}
                />
              </div>

              {/* Status Categorization Filter */}
              <div>
                <label className="block text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Filter className="h-3.5 w-3.5 text-emerald-600" /> Status Filter
                </label>
                <CustomSelect
                  value={defaulterStatusFilter}
                  onChange={setDefaulterStatusFilter}
                  options={[
                    { value: 'unpaid', label: '🔴 Not Paid (Defaulters Only)' },
                    { value: 'repeat', label: '🚨 Repeat Defaulters (2+ Months)' },
                    { value: 'pending', label: '🟡 Pending Verification' },
                    { value: 'verified', label: '🟢 Paid & Verified' },
                    { value: 'all', label: '👥 All Enrolled Students' },
                  ]}
                />
              </div>

              {/* Search Box */}
              <div>
                <label className="block text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Search className="h-3.5 w-3.5 text-amber-600" /> Search Student
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={defaulterSearch}
                    onChange={e => setDefaulterSearch(e.target.value)}
                    placeholder="Search name, phone, roll..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Analytics Overview Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3 w-full">
            <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[10px] sm:text-[11px] font-bold">Total Students</span>
                <Users className="h-4 w-4 text-blue-500" />
              </div>
              <p className="text-lg sm:text-2xl font-black text-slate-900">{defaulterMetrics.total}</p>
              <span className="text-[10px] font-semibold text-slate-400 mt-0.5 truncate">Enrolled in batch</span>
            </div>

            <div className="bg-rose-50/60 p-3 sm:p-3.5 rounded-2xl border border-rose-200/80 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-rose-700 mb-1">
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wide">Unpaid Defaulters</span>
                <ShieldAlert className="h-4 w-4 text-rose-600" />
              </div>
              <p className="text-lg sm:text-2xl font-black text-rose-900">{defaulterMetrics.unpaid}</p>
              <span className="text-[10px] font-bold text-rose-600 mt-0.5 truncate">
                {defaulterMetrics.repeatCount > 0 ? `🚨 ${defaulterMetrics.repeatCount} Repeat Defaulters` : 'Needs Followup'}
              </span>
            </div>

            <div className="bg-amber-50/60 p-3 sm:p-3.5 rounded-2xl border border-amber-200/80 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-amber-800 mb-1">
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wide">Pending Proofs</span>
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
              <p className="text-lg sm:text-2xl font-black text-amber-900">{defaulterMetrics.pendingCount}</p>
              <span className="text-[10px] font-bold text-amber-700 mt-0.5 truncate">Awaiting Verification</span>
            </div>

            <div className="bg-emerald-50/60 p-3 sm:p-3.5 rounded-2xl border border-emerald-200/80 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-emerald-800 mb-1">
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wide">Verified Paid</span>
                <CheckCircle className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="text-lg sm:text-2xl font-black text-emerald-900">{defaulterMetrics.verifiedCount}</p>
              <span className="text-[10px] font-bold text-emerald-700 mt-0.5 truncate">
                ₹{defaulterMetrics.totalCollected.toLocaleString('en-IN')} Collected
              </span>
            </div>

            <div className="col-span-2 sm:col-span-2 lg:col-span-1 bg-gradient-to-br from-slate-900 to-slate-800 text-white p-3 sm:p-3.5 rounded-2xl shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-300 mb-1">
                <span className="text-[10px] sm:text-[11px] font-bold">Compliance Rate</span>
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="text-lg sm:text-2xl font-black text-white">{defaulterMetrics.complianceRate}%</p>
              <div className="w-full bg-slate-700/80 h-1.5 rounded-full overflow-hidden mt-1">
                <div
                  className="bg-emerald-400 h-full transition-all duration-500"
                  style={{ width: `${defaulterMetrics.complianceRate}%` }}
                />
              </div>
            </div>
          </div>

          {/* Student Defaulters List */}
          <div className="space-y-3 min-w-0 w-full">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                <UserX className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-rose-500 shrink-0" />
                <span>Student Fee Status ({defaulterMonth})</span>
              </h3>
              <span className="text-[11px] sm:text-xs font-bold text-slate-500 bg-slate-100 px-2 sm:px-2.5 py-0.5 rounded-lg">
                {filteredDefaulterStudents.length} Students
              </span>
            </div>

            {filteredDefaulterStudents.length === 0 ? (
              <div className="text-center py-12 sm:py-16 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4">
                <Sparkles className="h-9 w-9 text-emerald-400 mx-auto mb-2" />
                <h4 className="font-bold text-slate-800 text-sm sm:text-base">No Students Found</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                  No fee defaulters or students match your selected filters for {defaulterMonth}.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5 sm:gap-3 w-full">
                {filteredDefaulterStudents.map(student => {
                  const isUnpaid = student.currentStatus === 'not_submitted' || student.currentStatus === 'rejected'
                  const isPending = student.currentStatus === 'pending'
                  const isVerified = student.currentStatus === 'verified'

                  return (
                    <div
                      key={student.id}
                      className={`bg-white rounded-2xl border p-3.5 sm:p-4 transition-all hover:shadow-md min-w-0 w-full ${
                        student.isRepeatDefaulter
                          ? 'border-rose-300 bg-rose-50/20'
                          : isUnpaid
                          ? 'border-slate-200 hover:border-slate-300'
                          : 'border-slate-200/80'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 min-w-0 w-full">
                        {/* Student Details */}
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center font-black text-xs sm:text-sm text-white shrink-0 shadow-sm ${
                            student.isRepeatDefaulter ? 'bg-rose-600' : isUnpaid ? 'bg-slate-800' : isPending ? 'bg-amber-500' : 'bg-emerald-600'
                          }`}>
                            {student.full_name?.slice(0, 2).toUpperCase() || 'ST'}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                              <h4 className="font-extrabold text-xs sm:text-sm md:text-base text-slate-900 truncate">
                                {student.full_name}
                              </h4>

                              {/* Batch Tag */}
                              <span className="text-[10px] sm:text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 shrink-0">
                                {student.batch_name}
                              </span>

                              {/* Roll Number */}
                              {student.roll_number !== '—' && (
                                <span className="text-[10px] sm:text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md shrink-0">
                                  Roll: {student.roll_number}
                                </span>
                              )}
                            </div>

                            {/* Contact Numbers */}
                            <div className="flex items-center gap-3 sm:gap-4 mt-1 text-[11px] sm:text-xs text-slate-500 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3 text-slate-400" />
                                <span className="font-semibold text-slate-700">{student.phone || 'No phone'}</span>
                              </span>
                              {student.parent_phone !== '—' && (
                                <span className="flex items-center gap-1 text-slate-400">
                                  <span>Parent:</span>
                                  <span className="font-semibold text-slate-700">{student.parent_phone}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Status Badge & 6-Month Timeline */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 lg:gap-5 border-t lg:border-t-0 pt-2.5 lg:pt-0 border-slate-100 shrink-0">
                          {/* Current Month Payment Badge */}
                          <div className="flex flex-col">
                            <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                              {defaulterMonth} Status
                            </span>

                            {isVerified && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-[11px] sm:text-xs font-extrabold">
                                <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                                Paid {student.currentRecord?.amount ? `(₹${student.currentRecord.amount})` : ''}
                              </span>
                            )}

                            {isPending && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-[11px] sm:text-xs font-extrabold">
                                <Clock className="h-3.5 w-3.5 text-amber-600" />
                                Pending Proof
                              </span>
                            )}

                            {isUnpaid && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-[11px] sm:text-xs font-extrabold">
                                <XCircle className="h-3.5 w-3.5 text-rose-600" />
                                Fee Not Paid
                              </span>
                            )}
                          </div>

                          {/* 6-Month History Visual Pill Bar */}
                          <div className="flex flex-col">
                            <div className="flex items-center justify-between mb-1 gap-2">
                              <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                6-Month Behavior
                              </span>
                              {student.isRepeatDefaulter ? (
                                <span className="text-[9px] sm:text-[10px] font-extrabold text-rose-600 bg-rose-100 px-1.5 py-0.2 rounded">
                                  🚨 {student.consecutiveUnpaid}M Unpaid
                                </span>
                              ) : student.isTimelyPayer ? (
                                <span className="text-[9px] sm:text-[10px] font-extrabold text-emerald-600 bg-emerald-100 px-1.5 py-0.2 rounded">
                                  ⭐ Timely
                                </span>
                              ) : null}
                            </div>

                            <div className="flex items-center gap-1">
                              {student.history.map((h, i) => (
                                <div
                                  key={i}
                                  title={`${h.month}: ${
                                    h.status === 'verified' ? 'Paid' : h.status === 'pending' ? 'Pending' : 'Unpaid'
                                  }`}
                                  className={`w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-md flex items-center justify-center text-[9px] font-black cursor-help transition-transform hover:scale-110 ${
                                    h.status === 'verified'
                                      ? 'bg-emerald-500 text-white'
                                      : h.status === 'pending'
                                      ? 'bg-amber-400 text-slate-900'
                                      : 'bg-rose-200 text-rose-800'
                                  }`}
                                >
                                  {h.month.slice(0, 1)}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Direct Message Action Button */}
                          <div className="flex items-center gap-2 pt-1 sm:pt-0 w-full sm:w-auto">
                            <button
                              onClick={() => navigate(`/admin/messages?student=${student.id}`)}
                              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl shadow-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                              title={`Open direct chat with ${student.full_name}`}
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              <span>Message</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 2: PENDING VERIFICATIONS ──────────────────────────────────────── */}
      {tab === 'Pending Verifications' && (
        pending.length === 0 ? (
          <div className="text-center py-12 sm:py-16 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4">
            <Sparkles className="h-9 w-9 text-emerald-400 mx-auto mb-2" />
            <h4 className="font-bold text-slate-800 text-sm sm:text-base">No Pending Verifications 🎉</h4>
            <p className="text-xs text-slate-400 mt-1">All submitted student fee payments have been verified.</p>
          </div>
        ) : (
          <div className="space-y-3 w-full">
            {pending.map(f => (
              <div key={f.id} className="bg-white rounded-2xl border border-amber-200 p-3.5 sm:p-4 shadow-sm w-full">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-extrabold text-sm sm:text-base text-slate-900">{f.profiles?.full_name}</p>
                      <span className="text-[10px] sm:text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        {f.payment_month}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{f.profiles?.email}</p>
                    <div className="flex gap-3 mt-2 text-xs flex-wrap items-center">
                      <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                        ₹{f.amount}
                      </span>
                      <span className="font-mono text-slate-400 text-[11px]">Ref: {f.reference_id || '—'}</span>
                      {f.screenshot_url && (
                        <a
                          href={normalizeUrl(f.screenshot_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <span>View Screenshot</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => verify(f.id)}
                      disabled={acting === f.id}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
                    >
                      <CheckCircle className="h-4 w-4" /> Verify
                    </button>
                    <button
                      onClick={() => { setRejectId(f.id); setReason('') }}
                      disabled={acting === f.id}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-extrabold rounded-xl transition-colors border border-rose-200 cursor-pointer"
                    >
                      <XCircle className="h-4 w-4" /> Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ─── TAB 3: ALL RECORDS ─────────────────────────────────────────────────── */}
      {tab === 'All Records' && (
        <div className="space-y-3 sm:space-y-4 w-full">
          <div className="flex gap-2.5 sm:gap-3 flex-wrap bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 shadow-sm w-full">
            <div className="relative flex-1 min-w-44">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search student or email…"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div className="w-auto min-w-[130px]">
              <CustomSelect
                value={statusF}
                onChange={setStatusF}
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'verified', label: 'Verified' },
                  { value: 'rejected', label: 'Rejected' },
                ]}
              />
            </div>
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Download className="h-4 w-4 text-slate-600" /> Export CSV
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden w-full">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {['Student', 'Month', 'Amount', 'Reference', 'Status', 'Date', 'Action'].map(h => (
                      <th key={h} className="px-3.5 py-2.5 sm:py-3 text-left text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAll.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3.5 py-2.5 sm:py-3">
                        <p className="font-extrabold text-slate-900">{r.profiles?.full_name}</p>
                        <p className="text-[10px] sm:text-[11px] text-slate-400">{r.profiles?.email}</p>
                      </td>
                      <td className="px-3.5 py-2.5 sm:py-3 font-semibold text-slate-700">{r.payment_month}</td>
                      <td className="px-3.5 py-2.5 sm:py-3 font-black text-slate-900">₹{r.amount}</td>
                      <td className="px-3.5 py-2.5 sm:py-3 font-mono text-slate-500">{r.reference_id || '—'}</td>
                      <td className="px-3.5 py-2.5 sm:py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-extrabold border ${STATUS_COLORS[r.status]}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 sm:py-3 text-slate-500">
                        {r.paid_at ? new Date(r.paid_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-3.5 py-2.5 sm:py-3">
                        <button
                          onClick={() => navigate(`/admin/messages?student=${r.student_id}`)}
                          className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                          title="Message Student"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 sm:p-6 w-full max-w-sm shadow-2xl space-y-4 animate-scale-up">
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900">Reject Fee Payment</h3>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              placeholder="Reason for rejection (optional)…"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setRejectId(null)}
                className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={reject}
                className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl font-bold text-xs hover:bg-rose-700 transition-colors cursor-pointer shadow-sm"
              >
                Reject Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
