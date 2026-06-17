import { useState, useEffect, useCallback } from 'react'
import { DollarSign, Search, QrCode, Copy, CheckCircle, Clock, ChevronRight, X, AlertTriangle, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { copyToClipboard } from '../../utils/clipboard'
import { normalizeUrl } from '../../utils/formatters'

function getMonths() {
  const months = []
  const now = new Date()
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }))
  }
  return months
}

const MONTHS   = getMonths()
const METHODS  = ['UPI', 'Cash', 'Bank Transfer', 'Cheque']

export default function SalaryManager() {
  const { user } = useAuth()

  const [teachers,         setTeachers]         = useState([])
  const [selectedMonth,    setSelectedMonth]    = useState(MONTHS[0])
  const [monthRecords,     setMonthRecords]     = useState({})   // { teacher_id → record }
  const [allRecords,       setAllRecords]       = useState([])
  const [selectedTeacher,  setSelectedTeacher]  = useState(null)
  const [form,             setForm]             = useState({ amount: '', method: 'UPI', reference_id: '', screenshot_url: '', notes: '' })
  const [saving,           setSaving]           = useState(false)
  const [search,           setSearch]           = useState('')
  const [historyMonth,     setHistoryMonth]     = useState('')
  const [loading,          setLoading]          = useState(true)

  // Load teachers once (merge profiles + teacher_profiles for QR/UPI data)
  useEffect(() => {
    Promise.all([
      supabase.from('profiles').select('id, full_name').eq('role', 'teacher').eq('is_active', true).order('full_name'),
      supabase.from('teacher_profiles').select('id, salary_amount, upi_qr_url, upi_id'),
    ]).then(([p, tp]) => {
      const tpMap = {}
      ;(tp.data ?? []).forEach(t => { tpMap[t.id] = t })
      setTeachers(
        (p.data ?? []).map(t => ({
          id:            t.id,
          full_name:     t.full_name,
          salary_amount: tpMap[t.id]?.salary_amount ?? 0,
          upi_qr_url:    tpMap[t.id]?.upi_qr_url ?? null,
          upi_id:        tpMap[t.id]?.upi_id ?? null,
        }))
      )
      setLoading(false)
    })
  }, [])

  // Reload salary records for the selected month
  const loadMonthRecords = useCallback(async () => {
    const { data } = await supabase.from('salary_records')
      .select('*')
      .eq('payment_month', selectedMonth)
    const map = {}
    ;(data ?? []).forEach(r => { map[r.teacher_id] = r })
    setMonthRecords(map)
  }, [selectedMonth])

  // Load full history
  const loadHistory = useCallback(async () => {
    const { data } = await supabase.from('salary_records')
      .select('*, profiles!teacher_id(full_name)')
      .order('paid_at', { ascending: false })
      .limit(150)
    setAllRecords(data ?? [])
  }, [])

  useEffect(() => { loadMonthRecords() }, [loadMonthRecords])
  useEffect(() => { loadHistory()      }, [loadHistory])

  const selectTeacher = (t) => {
    setSelectedTeacher(t)
    setForm({ amount: t.salary_amount?.toString() ?? '', method: 'UPI', reference_id: '', screenshot_url: '', notes: '' })
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const pay = async () => {
    if (!selectedTeacher || !form.amount || parseFloat(form.amount) <= 0) { toast.error('Enter a valid amount'); return }
    if (!form.reference_id && form.method === 'UPI') { toast.error('Transaction ID is required for UPI payments'); return }
    if (monthRecords[selectedTeacher.id]) {
      toast.error(`${selectedTeacher.full_name} is already marked paid for ${selectedMonth}`)
      return
    }

    setSaving(true)
    const { data, error } = await supabase.from('salary_records').insert({
      teacher_id:      selectedTeacher.id,
      amount:          parseFloat(form.amount),
      payment_month:   selectedMonth,
      payment_method:  form.method,
      reference_id:    form.reference_id   || null,
      screenshot_url:  form.screenshot_url || null,
      notes:           form.notes          || null,
      status:          'paid',
      paid_at:         new Date().toISOString(),
      paid_by:         user.id,
    }).select('*, profiles!teacher_id(full_name)').single()
    setSaving(false)

    if (error) { toast.error(error.message); return }

    setMonthRecords(prev => ({ ...prev, [selectedTeacher.id]: data }))
    setAllRecords(prev => [data, ...prev])
    setSelectedTeacher(null)
    toast.success(`Salary paid to ${selectedTeacher.full_name} ✓`)
  }

  // Summary for selected month
  const paid       = teachers.filter(t => monthRecords[t.id]?.status === 'paid')
  const unpaid     = teachers.filter(t => !monthRecords[t.id])
  const totalDue   = teachers.reduce((s, t) => s + (t.salary_amount ?? 0), 0)
  const totalPaid  = paid.reduce((s, t) => s + (monthRecords[t.id]?.amount ?? 0), 0)

  const filteredHistory = allRecords.filter(r => {
    const nameOk  = !search || r.profiles?.full_name?.toLowerCase().includes(search.toLowerCase())
    const monthOk = !historyMonth || r.payment_month === historyMonth
    return nameOk && monthOk
  })

  const existingRecord = selectedTeacher ? monthRecords[selectedTeacher.id] : null

  if (loading) return <div className="py-12 text-center text-gray-400 text-sm">Loading…</div>

  return (
    <div className="space-y-6 pb-20 lg:pb-0">

      {/* ── Month selector + summary bar ─────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 shrink-0">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Month:</label>
            <select
              value={selectedMonth}
              onChange={e => { setSelectedMonth(e.target.value); setSelectedTeacher(null) }}
              className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div className="flex gap-5 flex-wrap">
            <div>
              <p className="text-xs text-gray-400">Total Due</p>
              <p className="font-bold text-gray-900 text-sm">₹{totalDue.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Paid</p>
              <p className="font-bold text-green-700 text-sm">
                ₹{totalPaid.toLocaleString('en-IN')}
                <span className="text-gray-400 font-normal ml-1">({paid.length}/{teachers.length})</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Remaining</p>
              <p className={`font-bold text-sm ${unpaid.length > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                ₹{(totalDue - totalPaid).toLocaleString('en-IN')}
                <span className="font-normal ml-1">({unpaid.length} left)</span>
              </p>
            </div>
            {unpaid.length === 0 && teachers.length > 0 && (
              <span className="self-center inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                <CheckCircle className="h-3.5 w-3.5" /> All Paid
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Main grid: teacher list + payment panel ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

        {/* Teacher list */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-sm">{selectedMonth}</h2>
            <span className="text-xs text-gray-400">{teachers.length} teachers</span>
          </div>
          {teachers.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-10">No teachers found</p>
          )}
          <div className="divide-y divide-gray-50">
            {teachers.map(t => {
              const record     = monthRecords[t.id]
              const isPaid     = record?.status === 'paid'
              const isSelected = selectedTeacher?.id === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => selectTeacher(t)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors
                    ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                >
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                    ${isPaid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {t.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{t.full_name}</p>
                    <p className="text-xs text-gray-400">₹{Number(t.salary_amount).toLocaleString('en-IN')}/mo</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-1.5">
                    {isPaid
                      ? <span className="flex items-center gap-1 text-xs font-semibold text-green-700">
                          <CheckCircle className="h-3.5 w-3.5" /> Paid
                        </span>
                      : <span className="flex items-center gap-1 text-xs font-semibold text-amber-600">
                          <Clock className="h-3.5 w-3.5" /> Due
                        </span>
                    }
                    <ChevronRight className="h-4 w-4 text-gray-300" />
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Payment panel */}
        <div className="lg:col-span-3">
          {!selectedTeacher ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 flex items-center justify-center py-20">
              <div className="text-center">
                <QrCode className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">Select a teacher from the list</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">

              {/* Panel header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
                <div>
                  <p className="font-semibold text-gray-900">{selectedTeacher.full_name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Salary ₹{Number(selectedTeacher.salary_amount).toLocaleString('en-IN')} · {selectedMonth}
                  </p>
                </div>
                <button onClick={() => setSelectedTeacher(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {existingRecord ? (
                /* ── Already paid – show proof ─────────────────── */
                <div className="p-5 space-y-4">
                  <div className="flex items-center gap-3 bg-green-50 text-green-700 rounded-xl p-4">
                    <CheckCircle className="h-5 w-5 shrink-0" />
                    <div>
                      <p className="font-semibold text-sm">Salary Paid</p>
                      {existingRecord.paid_at && (
                        <p className="text-xs text-green-600 mt-0.5">
                          {new Date(existingRecord.paid_at).toLocaleString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <InfoBox label="Amount" value={`₹${Number(existingRecord.amount).toLocaleString('en-IN')}`} bold green />
                    <InfoBox label="Method" value={existingRecord.payment_method || '—'} />
                    <div className="col-span-2 bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 mb-1">Transaction / Reference ID</p>
                      <p className="font-mono text-sm font-medium text-gray-800">{existingRecord.reference_id || '—'}</p>
                    </div>
                    {existingRecord.screenshot_url && (
                      <div className="col-span-2 bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-400 mb-1.5">Payment Screenshot</p>
                        <a href={normalizeUrl(existingRecord.screenshot_url)} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 underline">
                          <ExternalLink className="h-3.5 w-3.5" /> View Screenshot
                        </a>
                      </div>
                    )}
                    {existingRecord.notes && (
                      <div className="col-span-2 bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-400 mb-1">Notes</p>
                        <p className="text-sm text-gray-700">{existingRecord.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* ── Not yet paid – QR + payment form ─────────── */
                <div className="p-5 space-y-4">

                  {/* QR / UPI section */}
                  {(selectedTeacher.upi_qr_url || selectedTeacher.upi_id) ? (
                    <div className="bg-gradient-to-b from-blue-50 to-indigo-50 rounded-xl p-4 text-center space-y-3 border border-blue-100">
                      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Scan to Pay</p>
                      {selectedTeacher.upi_qr_url && (
                        <img
                          src={selectedTeacher.upi_qr_url}
                          alt="Teacher payment QR"
                          className="w-48 h-48 mx-auto rounded-xl border-4 border-white shadow-md object-contain"
                        />
                      )}
                      {selectedTeacher.upi_id && (
                        <button
                          onClick={() => copyToClipboard(selectedTeacher.upi_id, 'UPI ID copied!')}
                          className="inline-flex items-center gap-2 mx-auto px-4 py-2 bg-white rounded-lg shadow-sm font-mono text-sm font-medium text-gray-800 hover:shadow transition-shadow"
                        >
                          <Copy className="h-3.5 w-3.5 text-blue-600" />
                          {selectedTeacher.upi_id}
                        </button>
                      )}
                      <p className="text-xs text-blue-500">Pay ₹{Number(form.amount || 0).toLocaleString('en-IN')} then enter the transaction ID below</p>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-amber-700">
                        <span className="font-semibold">{selectedTeacher.full_name}</span> hasn't uploaded a payment QR or UPI ID yet.
                        Ask them to set it up in their Salary page.
                      </p>
                    </div>
                  )}

                  {/* Form */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Amount (₹)</label>
                      <input
                        type="number"
                        value={form.amount}
                        onChange={e => set('amount', e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Payment Method</label>
                      <select
                        value={form.method}
                        onChange={e => set('method', e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                      >
                        {METHODS.map(m => <option key={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Transaction ID / Reference
                      {form.method === 'UPI' && <span className="text-red-500 ml-0.5">*</span>}
                      {form.method !== 'UPI' && <span className="text-gray-400 font-normal ml-1">(optional)</span>}
                    </label>
                    <input
                      value={form.reference_id}
                      onChange={e => set('reference_id', e.target.value)}
                      placeholder={form.method === 'UPI' ? 'e.g. 421800123456 (required)' : 'e.g. cheque no., bank ref…'}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Screenshot URL
                      <span className="text-gray-400 font-normal ml-1">(optional – paste Google Drive / Photos link)</span>
                    </label>
                    <input
                      value={form.screenshot_url}
                      onChange={e => set('screenshot_url', e.target.value)}
                      placeholder="https://drive.google.com/…"
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Notes <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input
                      value={form.notes}
                      onChange={e => set('notes', e.target.value)}
                      placeholder="e.g. includes bonus, advance deducted…"
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                    />
                  </div>

                  <button
                    onClick={pay}
                    disabled={saving || !form.amount}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    {saving ? 'Recording payment…' : `Mark ₹${Number(form.amount || 0).toLocaleString('en-IN')} as Paid`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Salary History ────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-gray-400" /> Salary History
          </h3>
          <div className="flex gap-2 ml-auto flex-wrap">
            <select
              value={historyMonth}
              onChange={e => setHistoryMonth(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none"
            >
              <option value="">All Months</option>
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Filter teacher…"
                className="pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none w-36"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Teacher', 'Month', 'Amount', 'Method', 'Transaction ID', 'Screenshot', 'Notes', 'Paid On'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredHistory.length === 0
                ? <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400 text-sm">No salary records found</td></tr>
                : filteredHistory.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{r.profiles?.full_name}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.payment_month}</td>
                    <td className="px-4 py-3 font-bold text-green-700 whitespace-nowrap">₹{Number(r.amount).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-gray-500 capitalize whitespace-nowrap">{r.payment_method || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.reference_id || '—'}</td>
                    <td className="px-4 py-3">
                      {r.screenshot_url
                        ? <a href={normalizeUrl(r.screenshot_url)} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 underline">
                            <ExternalLink className="h-3 w-3" /> View
                          </a>
                        : <span className="text-gray-300 text-xs">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 max-w-[140px] truncate">{r.notes || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {r.paid_at ? new Date(r.paid_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function InfoBox({ label, value, bold, green }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-sm ${bold ? 'font-bold' : 'font-medium'} ${green ? 'text-green-700' : 'text-gray-800'}`}>{value}</p>
    </div>
  )
}
