import { useState, useEffect, useMemo } from 'react'
import { CreditCard, CheckCircle, Copy, Calendar, Sparkles, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { copyToClipboard } from '../../utils/clipboard'
import CustomSelect from '../../components/ui/CustomSelect'
import { useSearchParams } from 'react-router-dom'
import { formatBatchFeeBadge } from '../../utils/feeAccess'

function getMonths() {
  const months = []
  const now = new Date()
  for (let i = 0; i < 4; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    months.push(d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }))
  }
  return months
}

const FEE_STATUS = {
  pending:  { label: 'Pending',  color: 'bg-amber-100 text-amber-800' },
  verified: { label: 'Verified', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
}

export default function PayFee() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [step,     setStep]     = useState(1)
  const [qr,       setQr]       = useState(null)
  const [history,  setHistory]  = useState([])
  const [batches,  setBatches]  = useState([])
  const [selectedBatchId, setSelectedBatchId] = useState(searchParams.get('batch_id') || '')
  const [loading,  setLoading]  = useState(false)
  const [success,  setSuccess]  = useState(null)

  const [form, setForm] = useState({
    amount: searchParams.get('amount') || '',
    month: searchParams.get('month') || getMonths()[0],
    reference_id: '',
    screenshot_url: ''
  })

  // Load student profile, batches, QR code, and fee history
  useEffect(() => {
    let cancelled = false
    const loadData = async () => {
      try {
        const [qrRes, feeRes, spRes, batchesRes] = await Promise.all([
          supabase.from('qr_settings').select('*').eq('is_active', true).limit(1).maybeSingle(),
          user?.id
            ? supabase.from('fee_records').select('*, batches(id, name, fee_mode, fee_amount, validity_days, validity_end_date)').eq('student_id', user.id).order('paid_at', { ascending: false })
            : Promise.resolve({ data: [] }),
          user?.id
            ? supabase.from('student_profiles').select('batch_id').eq('id', user.id).maybeSingle()
            : Promise.resolve({ data: null }),
          supabase.from('batches').select('id, name, fee_mode, fee_amount, validity_days, validity_end_date').eq('is_active', true).order('name')
        ])

        if (cancelled) return
        setQr(qrRes.data ?? null)
        setHistory(feeRes.data ?? [])
        setBatches(batchesRes.data ?? [])

        // If batch_id not passed in URL, default to student's enrolled batch
        const studentBatchId = searchParams.get('batch_id') || spRes.data?.batch_id || (batchesRes.data?.[0]?.id ?? '')
        if (studentBatchId) {
          setSelectedBatchId(studentBatchId)
          const matchedBatch = (batchesRes.data ?? []).find(b => b.id === studentBatchId)
          if (matchedBatch && !searchParams.get('amount') && matchedBatch.fee_amount) {
            setForm(f => ({ ...f, amount: String(matchedBatch.fee_amount) }))
          }
        }
      } catch (err) {
        console.error('Error loading fee payment data:', err)
      }
    }

    loadData()
    return () => { cancelled = true }
  }, [user, searchParams])

  // Current active batch configuration
  const activeBatch = useMemo(() => {
    return batches.find(b => b.id === selectedBatchId) || null
  }, [batches, selectedBatchId])

  const isOneTime = activeBatch?.fee_mode === 'one_time'

  // Update amount when student selects a different batch (if amount wasn't explicitly provided)
  const handleBatchChange = (batchId) => {
    setSelectedBatchId(batchId)
    const target = batches.find(b => b.id === batchId)
    if (target && target.fee_amount) {
      setForm(f => ({ ...f, amount: String(target.fee_amount) }))
    }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.error('Enter a valid fee amount'); return }
    if (!form.reference_id.trim()) { toast.error('Enter your UPI transaction ID'); return }
    setLoading(true)

    const payload = {
      student_id: user.id,
      batch_id: selectedBatchId || null,
      fee_mode: isOneTime ? 'one_time' : 'monthly',
      amount: parseFloat(form.amount),
      payment_month: isOneTime ? 'One-Time Payment' : form.month,
      reference_id: form.reference_id.trim(),
      screenshot_url: form.screenshot_url || null,
      status: 'pending',
    }

    const { data, error } = await supabase.from('fee_records').insert(payload).select('*, batches(id, name, fee_mode, fee_amount, validity_days, validity_end_date)').maybeSingle()
    setLoading(false)
    if (error) { toast.error(error.message); return }
    setSuccess(data)
    setHistory(h => [data, ...h])
    setStep(3)
    toast.success('Payment submitted for verification!')
  }

  const copyUPI = () => {
    if (qr?.upi_id) copyToClipboard(qr.upi_id, 'UPI ID copied!')
  }

  return (
    <div className="space-y-6 pb-24 lg:pb-8 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-indigo-600 shrink-0" />
            <span>Fee Payment Portal</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Pay your monthly tuition or one-time batch fee securely via UPI QR code
          </p>
        </div>
        {activeBatch && (
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl self-start sm:self-auto">
            <span className="text-[11px] font-semibold text-slate-500">Selected Batch:</span>
            <span className="text-xs font-extrabold text-slate-800">
              {activeBatch.name}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Payment Steps / QR / Success (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-4 sm:space-y-5">
          {/* Step indicator */}
          {step < 3 && (
            <div className="flex items-center justify-between sm:justify-start gap-1.5 sm:gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
              {['Fill Details', 'Pay via QR', 'Done'].map((label, i) => (
                <div key={label} className="flex items-center gap-1.5 sm:gap-2">
                  <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold shrink-0
                    ${step === i+1 ? 'bg-indigo-600 text-white' : step > i+1 ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {step > i+1 ? '✓' : i+1}
                  </div>
                  <span className={`text-[11px] sm:text-xs font-bold ${step === i+1 ? 'text-slate-900' : 'text-slate-400'}`}>
                    {label}
                  </span>
                  {i < 2 && <div className="hidden sm:block h-px bg-slate-200 w-4 lg:w-8" />}
                </div>
              ))}
            </div>
          )}

          {/* Step 1 */}
          {step === 1 && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-indigo-600" />
                  <span>Enter Fee Details</span>
                </h2>
                {activeBatch && (
                  <span className="text-xs">
                    {(() => {
                      const b = formatBatchFeeBadge(activeBatch)
                      return b ? (
                        <span className={`px-2 py-0.5 rounded-full font-bold border text-[10px] sm:text-[11px] ${b.color}`}>
                          {b.text}
                        </span>
                      ) : null
                    })()}
                  </span>
                )}
              </div>

              {/* Batch Selector */}
              {batches.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Select Course / Batch</label>
                  <CustomSelect
                    value={selectedBatchId}
                    onChange={handleBatchChange}
                    options={batches.map(b => ({
                      value: b.id,
                      label: `${b.name} (${b.fee_mode === 'one_time' ? 'One-Time' : 'Monthly'} · ₹${b.fee_amount || 0})`
                    }))}
                  />
                </div>
              )}

              {/* One-Time Details Banner */}
              {isOneTime && (
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200/80 text-purple-950 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    <span>One-Time Course Fee</span>
                  </div>
                  <p className="text-purple-800 text-[11px] leading-relaxed">
                    {activeBatch.validity_days
                      ? `Includes full course access for ${activeBatch.validity_days} days upon payment verification.`
                      : activeBatch.validity_end_date
                      ? `Includes full course access until ${activeBatch.validity_end_date}.`
                      : 'Includes full unrestricted access for this course.'}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Amount (₹)</label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={e => set('amount', e.target.value)}
                  placeholder="Enter amount"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-extrabold text-sm text-slate-900 bg-white"
                />
              </div>

              {!isOneTime && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-500" />
                    <span>Payment Month</span>
                  </label>
                  <CustomSelect
                    value={form.month}
                    onChange={val => set('month', val)}
                    options={getMonths().map(m => ({ value: m, label: m }))}
                  />
                </div>
              )}

              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!form.amount || parseFloat(form.amount) <= 0}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm rounded-xl disabled:opacity-50 transition-all shadow-sm active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Proceed to Pay</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 text-center space-y-4 shadow-sm">
              <div className="border-b border-slate-100 pb-3 text-left">
                <h2 className="font-extrabold text-sm sm:text-base text-slate-900">Scan & Pay via UPI</h2>
                <p className="text-xs text-slate-500 mt-0.5">Scan the QR code with any UPI app (GPay, PhonePe, Paytm, etc.)</p>
              </div>

              {qr ? (
                <div className="space-y-3">
                  <div className="inline-block p-2 bg-white rounded-2xl border-2 border-slate-200 shadow-sm">
                    <img src={qr.qr_image_url} alt="Payment QR" className="w-48 h-48 sm:w-52 sm:h-52 mx-auto rounded-xl object-contain" />
                  </div>
                  {qr.payee_name && <p className="font-extrabold text-slate-900 text-sm">{qr.payee_name}</p>}
                  {qr.upi_id && (
                    <button
                      type="button"
                      onClick={copyUPI}
                      className="inline-flex items-center gap-2 mx-auto px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                    >
                      <Copy className="h-3.5 w-3.5 text-slate-500" />
                      <span>{qr.upi_id}</span>
                    </button>
                  )}
                  {qr.description && <p className="text-xs text-slate-400 max-w-xs mx-auto">{qr.description}</p>}
                </div>
              ) : (
                <div className="py-8 text-slate-400 text-xs sm:text-sm">QR code not configured yet. Contact institute administration.</div>
              )}

              <div className="bg-indigo-50/70 rounded-xl p-3 border border-indigo-100 text-xs text-left">
                <p className="font-black text-indigo-950 text-sm">
                  Amount to Pay: ₹{form.amount}
                </p>
                <p className="text-indigo-700 font-semibold mt-0.5">
                  {isOneTime ? '⚡ One-Time Course Enrollment' : `📅 Monthly Fee for ${form.month}`}
                  {activeBatch?.name ? ` · ${activeBatch.name}` : ''}
                </p>
              </div>

              <div className="text-left space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  UPI Transaction / UTR ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.reference_id}
                  onChange={e => set('reference_id', e.target.value)}
                  placeholder="e.g. 328492817291"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-mono text-xs sm:text-sm text-slate-900"
                />
                <p className="text-[11px] text-slate-400">
                  Enter the 12-digit transaction ID or UTR reference from your UPI app receipt.
                </p>
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-2.5 border border-slate-300 text-slate-700 font-bold text-xs sm:text-sm rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={loading || !form.reference_id.trim()}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm rounded-xl disabled:opacity-50 transition-all shadow-sm cursor-pointer"
                >
                  {loading ? 'Submitting…' : 'I Have Paid ✓'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Success */}
          {step === 3 && success && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 text-center shadow-sm space-y-4">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
                <CheckCircle className="h-8 w-8 stroke-[2.5]" />
              </div>
              <div>
                <h2 className="font-black text-lg sm:text-xl text-slate-900">Payment Submitted!</h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Your payment receipt has been submitted for administrative verification.
                </p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 text-left space-y-1">
                <p className="font-extrabold text-emerald-800">✓ Provisional Access Active</p>
                <p className="text-[11px] leading-relaxed text-emerald-700">
                  You have full active access to all batch lectures, live classes, and homework while administration verifies your receipt.
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3.5 text-left space-y-1.5 text-xs border border-slate-100">
                <div className="flex justify-between py-0.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Batch:</span>
                  <span className="font-bold text-slate-900">{activeBatch?.name || 'Assigned Batch'}</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Amount:</span>
                  <span className="font-black text-slate-900">₹{success.amount}</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Billing Period:</span>
                  <span className="font-bold text-slate-900">{success.payment_month}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500 font-medium">Reference ID:</span>
                  <span className="font-mono text-slate-900 font-bold">{success.reference_id}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStep(1)
                  setForm({ amount: activeBatch?.fee_amount ? String(activeBatch.fee_amount) : '', month: getMonths()[0], reference_id: '', screenshot_url: '' })
                }}
                className="w-full py-2.5 sm:py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs sm:text-sm rounded-xl transition-all shadow-sm cursor-pointer"
              >
                Pay Another Fee
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Payment History (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900">Payment History</h3>
                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {history.length} {history.length === 1 ? 'record' : 'records'}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                Receipts & Verification Proofs
              </span>
            </div>

            {history.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-2">
                  <CreditCard className="h-6 w-6 text-slate-300" />
                </div>
                <h4 className="font-bold text-slate-700 text-sm">No Payment Records Yet</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  When you submit a fee payment, your receipts, transaction IDs, and verification statuses will appear here.
                </p>
              </div>
            ) : (
              <>
                {/* Mobile Cards (< sm) */}
                <div className="sm:hidden p-3 space-y-2.5 divide-y divide-slate-100">
                  {history.map(r => (
                    <div key={r.id} className="pt-2.5 first:pt-0 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-xs text-slate-900 truncate">
                            {r.batches?.name || 'General Batch'}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full ${
                              r.fee_mode === 'one_time' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {r.fee_mode === 'one_time' ? '⚡ One-Time' : '📅 Monthly'}
                            </span>
                            <span className="text-[10px] text-slate-600 font-semibold">
                              {r.fee_mode === 'one_time' ? (
                                r.valid_until ? `Till ${new Date(r.valid_until).toLocaleDateString('en-IN')}` : 'Course Fee'
                              ) : (
                                r.payment_month
                              )}
                            </span>
                          </div>
                        </div>
                        <span className="text-sm font-black text-slate-900 shrink-0">
                          ₹{r.amount}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-400 font-mono">
                            Ref: {r.reference_id || '—'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {r.paid_at ? new Date(r.paid_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold ${FEE_STATUS[r.status]?.color}`}>
                            {FEE_STATUS[r.status]?.label}
                          </span>
                          {r.status === 'pending' && (
                            <p className="text-[9px] text-sky-600 font-bold mt-0.5">
                              Provisional Active
                            </p>
                          )}
                          {r.status === 'rejected' && r.notes && (
                            <p className="text-[9px] text-rose-600 font-medium mt-0.5 max-w-[130px] truncate" title={r.notes}>
                              Reason: {r.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop / Tablet Table (>= sm) */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100 text-sm">
                    <thead className="bg-slate-50/80">
                      <tr>
                        <th className="px-4 py-3 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider">Batch</th>
                        <th className="px-3 py-3 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider">Type</th>
                        <th className="px-3 py-3 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider">Period / Validity</th>
                        <th className="px-3 py-3 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider">Amount</th>
                        <th className="px-3 py-3 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider">Reference</th>
                        <th className="px-3 py-3 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {history.map(r => (
                        <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3.5 font-bold text-slate-900 whitespace-nowrap">
                            {r.batches?.name || 'General Batch'}
                          </td>
                          <td className="px-3 py-3.5 whitespace-nowrap">
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              r.fee_mode === 'one_time' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {r.fee_mode === 'one_time' ? 'One-Time' : 'Monthly'}
                            </span>
                          </td>
                          <td className="px-3 py-3.5 font-medium text-xs text-slate-700 whitespace-nowrap">
                            {r.fee_mode === 'one_time' ? (
                              r.valid_until ? (
                                <span className="text-purple-700 font-semibold">Till {new Date(r.valid_until).toLocaleDateString('en-IN')}</span>
                              ) : (
                                'Course Fee'
                              )
                            ) : (
                              r.payment_month
                            )}
                          </td>
                          <td className="px-3 py-3.5 font-black text-slate-900 whitespace-nowrap">
                            ₹{r.amount}
                          </td>
                          <td className="px-3 py-3.5 text-slate-500 font-mono text-xs whitespace-nowrap">
                            {r.reference_id || '—'}
                          </td>
                          <td className="px-3 py-3.5 whitespace-nowrap">
                            <div>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${FEE_STATUS[r.status]?.color}`}>
                                {FEE_STATUS[r.status]?.label}
                              </span>
                              {r.status === 'rejected' && r.notes && (
                                <p className="text-[11px] text-rose-600 mt-0.5 max-w-[160px] truncate" title={r.notes}>
                                  Reason: {r.notes}
                                </p>
                              )}
                              {r.status === 'pending' && (
                                <p className="text-[10px] text-sky-600 font-bold mt-0.5">
                                  Provisional Active
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-slate-500 text-xs whitespace-nowrap">
                            {r.paid_at ? new Date(r.paid_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
