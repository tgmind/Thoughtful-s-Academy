import { useState, useEffect, useMemo } from 'react'
import { CreditCard, CheckCircle, Copy, Calendar, Sparkles } from 'lucide-react'
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
    <div className="space-y-6 pb-20 lg:pb-0 max-w-lg">

      {/* Step indicator */}
      {step < 3 && (
        <div className="flex items-center gap-2">
          {['Fill Details', 'Pay via QR', 'Done'].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                ${step === i+1 ? 'bg-blue-950 text-white' : step > i+1 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {step > i+1 ? '✓' : i+1}
              </div>
              <span className={`text-xs font-medium ${step === i+1 ? 'text-gray-900' : 'text-gray-400'}`}>{label}</span>
              {i < 2 && <div className="flex-1 h-px bg-gray-200 w-8" />}
            </div>
          ))}
        </div>
      )}

      {/* Step 1 */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-950" /> Fee Payment
            </h2>
            {activeBatch && (
              <span className="text-xs">
                {(() => {
                  const b = formatBatchFeeBadge(activeBatch)
                  return b ? (
                    <span className={`px-2 py-0.5 rounded-full font-bold border ${b.color}`}>
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
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Course / Batch</label>
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
              <p className="text-purple-800">
                {activeBatch.validity_days
                  ? `Includes full course access for ${activeBatch.validity_days} days upon payment verification.`
                  : activeBatch.validity_end_date
                  ? `Includes full course access until ${activeBatch.validity_end_date}.`
                  : 'Includes full unrestricted access for this course.'}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount (₹)</label>
            <input
              type="number"
              value={form.amount}
              onChange={e => set('amount', e.target.value)}
              placeholder="Enter amount"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 font-semibold"
            />
          </div>

          {!isOneTime && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-slate-500" /> Payment Month
              </label>
              <CustomSelect
                value={form.month}
                onChange={val => set('month', val)}
                options={getMonths().map(m => ({ value: m, label: m }))}
              />
            </div>
          )}

          <button
            onClick={() => setStep(2)}
            disabled={!form.amount || parseFloat(form.amount) <= 0}
            className="w-full py-3 bg-blue-950 hover:bg-blue-900 text-white font-bold rounded-xl disabled:opacity-50 transition-colors cursor-pointer"
          >
            Proceed to Pay →
          </button>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center space-y-4">
          <h2 className="font-bold text-gray-900">Scan & Pay</h2>
          <p className="text-sm text-gray-500">Scan the QR code or use the UPI ID below</p>
          {qr ? (
            <>
              <img src={qr.qr_image_url} alt="Payment QR" className="w-52 h-52 mx-auto rounded-xl border-2 border-gray-200 object-contain" />
              {qr.payee_name && <p className="font-semibold text-gray-900">{qr.payee_name}</p>}
              {qr.upi_id && (
                <button onClick={copyUPI}
                  className="flex items-center gap-2 mx-auto px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors">
                  <Copy className="h-4 w-4" /> {qr.upi_id}
                </button>
              )}
              {qr.description && <p className="text-xs text-gray-500">{qr.description}</p>}
            </>
          ) : (
            <div className="py-8 text-gray-400 text-sm">QR code not set up yet. Contact admin.</div>
          )}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-sm">
            <p className="font-bold text-blue-950">
              Amount: ₹{form.amount} {isOneTime ? '· One-Time Course Fee' : `· ${form.month}`}
            </p>
            {activeBatch?.name && <p className="text-xs text-slate-500 mt-0.5">Batch: {activeBatch.name}</p>}
          </div>

          <div className="text-left">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">UPI Transaction ID <span className="text-red-500">*</span></label>
            <input type="text" value={form.reference_id} onChange={e => set('reference_id', e.target.value)}
              placeholder="e.g. 123456789012" className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600" />
            <p className="text-xs text-gray-400 mt-1">Enter the 12-digit transaction ID from your UPI app after paying</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 cursor-pointer">
              ← Back
            </button>
            <button onClick={submit} disabled={loading || !form.reference_id.trim()}
              className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl disabled:opacity-50 transition-colors cursor-pointer">
              {loading ? 'Submitting…' : 'I Have Paid ✓'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Success */}
      {step === 3 && success && (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="font-bold text-xl text-gray-900">Payment Submitted!</h2>
          <p className="text-gray-500 text-sm mt-1 mb-3">Your payment has been received and is pending administrative verification.</p>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4 text-xs text-emerald-800">
            <span className="font-bold">✓ Provisional Access Unlocked:</span> You have full active access to all batch lectures, live classes, and homework while administration verifies your receipt.
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-left space-y-1 text-sm mb-6">
            <p><span className="text-gray-500">Amount:</span> <span className="font-semibold">₹{success.amount}</span></p>
            <p><span className="text-gray-500">Mode:</span> <span className="font-semibold capitalize">{success.fee_mode || 'monthly'}</span></p>
            <p><span className="text-gray-500">Billing:</span> <span className="font-semibold">{success.payment_month}</span></p>
            <p><span className="text-gray-500">Reference:</span> <span className="font-mono text-xs">{success.reference_id}</span></p>
          </div>
          <button onClick={() => { setStep(1); setForm({ amount:'', month: getMonths()[0], reference_id:'', screenshot_url:'' }) }}
            className="w-full py-3 bg-blue-950 text-white font-bold rounded-xl hover:bg-blue-900 cursor-pointer">
            Pay Another Fee
          </button>
        </div>
      )}

      {/* Fee history */}
      {history.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Payment History</h3>
            <span className="text-xs text-gray-400 font-medium">{history.length} records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Batch', 'Type', 'Period / Validity', 'Amount', 'Reference', 'Status', 'Date'].map(h => (
                    <th key={h} className="px-3.5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {history.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-3.5 py-3 font-semibold text-gray-900">{r.batches?.name || 'General Batch'}</td>
                    <td className="px-3.5 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        r.fee_mode === 'one_time' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {r.fee_mode === 'one_time' ? 'One-Time' : 'Monthly'}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 font-medium text-xs">
                      {r.fee_mode === 'one_time' ? (
                        r.valid_until ? (
                          <span className="text-purple-700">Till {new Date(r.valid_until).toLocaleDateString('en-IN')}</span>
                        ) : (
                          'Course Fee'
                        )
                      ) : (
                        r.payment_month
                      )}
                    </td>
                    <td className="px-3.5 py-3 font-semibold">₹{r.amount}</td>
                    <td className="px-3.5 py-3 text-gray-500 font-mono text-xs">{r.reference_id || '—'}</td>
                    <td className="px-3.5 py-3">
                      <div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${FEE_STATUS[r.status]?.color}`}>
                          {FEE_STATUS[r.status]?.label}
                        </span>
                        {r.status === 'rejected' && r.notes && (
                          <p className="text-[11px] text-red-600 mt-0.5 max-w-[160px] truncate" title={r.notes}>
                            Reason: {r.notes}
                          </p>
                        )}
                        {r.status === 'pending' && (
                          <p className="text-[10px] text-sky-600 mt-0.5 font-medium">
                            Provisional Active
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-3.5 py-3 text-gray-500 text-xs">
                      {r.paid_at ? new Date(r.paid_at).toLocaleDateString('en-IN', { day:'numeric', month:'short' }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
