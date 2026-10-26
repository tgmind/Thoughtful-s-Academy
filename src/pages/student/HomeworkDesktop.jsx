import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, CheckCircle2, Clock, FileText, ShieldAlert, CreditCard, RotateCcw, Search, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { checkBatchFeeStatus } from '../../utils/feeAccess'
import MaterialViewerModal from '../../components/shared/MaterialViewerModal'

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function dueLabel(due) {
  const today = todayISO()
  const d = new Date(due + 'T00:00:00')
  const nice = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  if (due < today)   return { text: `Overdue · ${nice}`, cls: 'text-red-600' }
  if (due === today) return { text: 'Due today', cls: 'text-red-600' }
  return { text: `Due ${nice}`, cls: 'text-amber-600' }
}

const TABS = ['To Do', 'Done']

export default function StudentHomework() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [batchId, setBatchId] = useState(null)
  const [batchReady, setBatchReady] = useState(false)
  const [batchFeeStatus, setBatchFeeStatus] = useState(null)
  const [homework, setHomework] = useState([])
  const [subs, setSubs] = useState({}) // homework_id -> submission row
  const [actionInProgress, setActionInProgress] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('To Do')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewingMaterial, setViewingMaterial] = useState(null)

  // Resolve the student's batch and fee access status first (with realtime updates).
  useEffect(() => {
    if (!user) return
    let cancelled = false

    const loadBatchAndFees = () => {
      Promise.all([
        supabase
          .from('student_profiles')
          .select('batch_id, trial_ends_at, batches(id, name, fee_mode, fee_amount, validity_days, validity_end_date)')
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('fee_records')
          .select('id, batch_id, amount, payment_month, fee_mode, valid_until, status')
          .eq('student_id', user.id),
        supabase
          .from('admin_access_overrides')
          .select('*')
          .eq('student_id', user.id)
      ]).then(([spRes, feeRes, ovRes]) => {
        if (cancelled) return
        const sp = spRes.data
        setBatchId(sp?.batch_id ?? null)
        if (sp?.batches) {
          const status = checkBatchFeeStatus({
            student: { id: user.id, trial_ends_at: sp.trial_ends_at },
            batch: sp.batches,
            feeRecords: feeRes.data ?? [],
            adminOverrides: ovRes.data ?? []
          })
          setBatchFeeStatus(status)
        }
        setBatchReady(true)
      })
    }

    loadBatchAndFees()

    const channel = supabase.channel(`homework_fee_sync_${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fee_records', filter: `student_id=eq.${user.id}` }, () => {
        if (!cancelled) loadBatchAndFees()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_access_overrides', filter: `student_id=eq.${user.id}` }, () => {
        if (!cancelled) loadBatchAndFees()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_profiles', filter: `id=eq.${user.id}` }, () => {
        if (!cancelled) loadBatchAndFees()
      })
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [user])

  // Load homework + completions and keep them live.
  useEffect(() => {
    if (!user || !batchReady) return
    if (!batchId) { setHomework([]); setSubs({}); setLoading(false); return }
    let cancelled = false

    const loadHomework = () => {
      let q = supabase.from('homework').select('*').eq('is_active', true).order('created_at', { ascending: false })
      if (batchId) {
        q = q.or(`batch_id.is.null,batch_id.eq.${batchId}`)
      } else {
        q = q.is('batch_id', null)
      }
      q.then(({ data }) => { if (!cancelled) setHomework(data ?? []) })
    }
    const loadSubs = () => {
      supabase.from('homework_submissions').select('homework_id, submitted_at')
        .eq('student_id', user.id)
        .then(({ data }) => {
          if (cancelled) return
          const map = {}
          ;(data ?? []).forEach(s => { map[s.homework_id] = s })
          setSubs(map)
        })
    }

    setLoading(true)
    let initialHwQ = supabase.from('homework').select('*').eq('is_active', true).order('created_at', { ascending: false })
    if (batchId) {
      initialHwQ = initialHwQ.or(`batch_id.is.null,batch_id.eq.${batchId}`)
    } else {
      initialHwQ = initialHwQ.is('batch_id', null)
    }

    Promise.all([
      initialHwQ,
      supabase.from('homework_submissions').select('homework_id, submitted_at').eq('student_id', user.id),
    ]).then(([hw, sb]) => {
      if (cancelled) return
      setHomework(hw.data ?? [])
      const map = {}
      ;(sb.data ?? []).forEach(s => { map[s.homework_id] = s })
      setSubs(map)
      setLoading(false)
    })

    const channel = supabase.channel(`student_homework_${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'homework' }, loadHomework)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'homework_submissions', filter: `student_id=eq.${user.id}` }, loadSubs)
      .subscribe()

    return () => { cancelled = true; supabase.removeChannel(channel) }
  }, [user, batchId, batchReady])

  const markAsDone = async (hwId) => {
    if (actionInProgress) return
    setActionInProgress(hwId)
    const { data, error } = await supabase.from('homework_submissions')
      .insert({ homework_id: hwId, student_id: user.id })
      .select('homework_id, submitted_at')
      .maybeSingle()
    setActionInProgress(null)
    if (error) {
      if (error.code === '23505') {
        toast.success('Marked as done!')
        const { data: existing } = await supabase.from('homework_submissions')
          .select('homework_id, submitted_at')
          .eq('homework_id', hwId).eq('student_id', user.id).maybeSingle()
        if (existing) setSubs(s => ({ ...s, [hwId]: existing }))
        else setSubs(s => ({ ...s, [hwId]: { homework_id: hwId, submitted_at: new Date().toISOString() } }))
      } else {
        toast.error(error.message)
      }
      return
    }
    setSubs(s => ({ ...s, [hwId]: data || { homework_id: hwId, submitted_at: new Date().toISOString() } }))
    toast.success('Marked as done!')
  }

  const undoDone = async (hwId) => {
    if (actionInProgress) return
    setActionInProgress(hwId)
    const { error } = await supabase.from('homework_submissions')
      .delete()
      .eq('homework_id', hwId)
      .eq('student_id', user.id)
    setActionInProgress(null)
    if (error) {
      toast.error(error.message)
      return
    }
    setSubs(s => {
      const next = { ...s }
      delete next[hwId]
      return next
    })
    toast.success('Moved back to To Do')
  }

  const { todo, done } = useMemo(() => {
    const td = [], dn = []
    homework.forEach(h => (subs[h.id] ? dn : td).push(h))
    // To Do: soonest due first (no due date last). Done: most recent completion first.
    td.sort((a, b) => {
      if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date)
      if (a.due_date) return -1
      if (b.due_date) return 1
      return (b.created_at || '').localeCompare(a.created_at || '')
    })
    dn.sort((a, b) => (subs[b.id]?.submitted_at || '').localeCompare(subs[a.id]?.submitted_at || ''))
    return { todo: td, done: dn }
  }, [homework, subs])

  const list = tab === 'To Do' ? todo : done

  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return list
    const q = searchQuery.toLowerCase()
    return list.filter(hw =>
      hw.title?.toLowerCase().includes(q) ||
      hw.description?.toLowerCase().includes(q)
    )
  }, [list, searchQuery])

  if (loading) {
    return (
      <div className="space-y-6 pb-20 lg:pb-0 max-w-2xl animate-pulse">
        <div className="h-6 w-36 bg-slate-200 rounded-lg" />
        <div className="flex gap-2">
          <div className="h-9 w-24 bg-slate-200 rounded-xl" />
          <div className="h-9 w-24 bg-slate-200 rounded-xl" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 h-28" />
          ))}
        </div>
      </div>
    )
  }

  // No batch assigned → nothing to show.
  if (!batchId) return (
    <div className="space-y-6 pb-20 lg:pb-0 max-w-2xl">
      <h2 className="font-bold text-lg text-gray-900">Homework</h2>
      <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-gray-100">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <ClipboardList className="h-7 w-7 text-gray-300" />
        </div>
        <h3 className="font-bold text-gray-600 text-lg mb-1">No Batch Assigned</h3>
        <p className="text-sm text-gray-400 max-w-xs">You&apos;ll see homework here once an admin enrolls you in a batch.</p>
      </div>
    </div>
  )

  // Batch access frozen due to pending fees or expired validity
  if (batchFeeStatus?.isFrozen) return (
    <div className="space-y-6 pb-20 lg:pb-0 max-w-2xl">
      <h2 className="font-bold text-lg text-gray-900">Homework</h2>
      <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-3xl border border-rose-100 p-8 shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mb-4 text-rose-600 shadow-sm">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-200 mb-2">
          Batch Access Paused
        </span>
        <h3 className="font-extrabold text-slate-900 text-lg mb-2">
          {batchFeeStatus.status === 'expired' || batchFeeStatus.reason === 'expired'
            ? 'Course Subscription Expired'
            : batchFeeStatus.feeMode === 'one_time'
            ? 'Course Fee Required'
            : 'Monthly Fee Payment Pending'}
        </h3>
        <p className="text-xs text-slate-500 max-w-sm mb-6 leading-relaxed">
          {batchFeeStatus.message || 'Homework assignments and submissions for your batch are currently paused. Clear your dues to resume your coursework.'}
        </p>
        <button
          onClick={() => navigate('/student/pay-fee')}
          className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
        >
          <CreditCard className="h-4 w-4" /> Pay Fee to Unlock Homework
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-5 pb-20 lg:pb-0 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-lg text-gray-900">Homework</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {TABS.map(t => {
          const count = t === 'To Do' ? todo.length : done.length
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${tab === t ? 'bg-blue-950 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              {t === 'To Do' ? <Clock className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              {t}
              <span className={tab === t ? 'text-blue-300' : 'text-gray-400'}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Search Input */}
      {(todo.length > 0 || done.length > 0) && (
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search assignments by title or keyword…"
            className="w-full pl-10 pr-9 py-2 bg-white rounded-xl border border-gray-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-950 placeholder:text-gray-400 shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-md cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {filteredList.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <ClipboardList className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium text-sm">
            {searchQuery
              ? 'No assignments match your search.'
              : tab === 'To Do'
              ? 'Nothing due right now. You\'re all caught up! 🎉'
              : 'No completed homework yet.'}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="mt-3 text-xs text-blue-600 hover:underline font-semibold cursor-pointer"
            >
              Clear search filter
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredList.map(hw => {
            const sub = subs[hw.id]
            const due = (!sub && hw.due_date) ? dueLabel(hw.due_date) : null
            return (
              <div key={hw.id} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900">{hw.title}</h3>
                    {hw.description && <p className="text-sm text-gray-500 mt-0.5">{hw.description}</p>}
                    {due && <p className={`text-xs mt-1 font-medium ${due.cls}`}>{due.text}</p>}
                  </div>
                  {hw.drive_link && (
                    <button
                      type="button"
                      onClick={() => setViewingMaterial({ title: `${hw.title} - Assignment`, url: hw.drive_link, type: 'google_drive' })}
                      className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
                    >
                      <FileText className="h-3.5 w-3.5" /> Assignment
                    </button>
                  )}
                </div>

                {sub ? (
                  <div className="mt-3 bg-emerald-50/70 border border-emerald-100 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 text-emerald-800">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span className="font-semibold text-xs sm:text-sm">Completed</span>
                      {sub.submitted_at && (
                        <span className="text-xs text-emerald-600 font-medium">
                          · {new Date(sub.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => undoDone(hw.id)}
                      disabled={actionInProgress === hw.id}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-rose-600 transition-colors cursor-pointer px-2.5 py-1 rounded-lg hover:bg-white/80 active:scale-95 disabled:opacity-50"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      {actionInProgress === hw.id ? 'Undoing…' : 'Undo'}
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-400 font-medium">Self-study assignment</span>
                    <button
                      type="button"
                      onClick={() => markAsDone(hw.id)}
                      disabled={actionInProgress === hw.id}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {actionInProgress === hw.id ? 'Marking Done…' : 'Mark as Done'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* In-App Material Viewer Modal for Homework Assignment */}
      {viewingMaterial && (
        <MaterialViewerModal
          card={viewingMaterial}
          onClose={() => setViewingMaterial(null)}
        />
      )}
    </div>
  )
}
