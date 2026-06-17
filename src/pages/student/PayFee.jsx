import { useState, useEffect } from 'react'
import { CreditCard, CheckCircle, Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { copyToClipboard } from '../../utils/clipboard'

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
  const [step,     setStep]     = useState(1)
  const [qr,       setQr]       = useState(null)
  const [history,  setHistory]  = useState([])
  const [loading,  setLoading]  = useState(false)
  const [success,  setSuccess]  = useState(null)
  const [form, setForm] = useState({ amount: '', month: getMonths()[0], reference_id: '', screenshot_url: '' })

  useEffect(() => {
    supabase.from('qr_settings').select('*').eq('is_active', true).limit(1).maybeSingle()
      .then(({ data }) => setQr(data))
    if (user) {
      supabase.from('fee_records').select('*').eq('student_id', user.id)
        .order('paid_at', { ascending: false })
        .then(({ data }) => setHistory(data ?? []))
    }
  }, [user])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.error('Enter a valid fee amount'); return }
    if (!form.reference_id.trim()) { toast.error('Enter your UPI transaction ID'); return }
    setLoading(true)
    const { data, error } = await supabase.from('fee_records').insert({
      student_id: user.id, amount: parseFloat(form.amount),
      payment_month: form.month, reference_id: form.reference_id,
      screenshot_url: form.screenshot_url || null, status: 'pending',
    }).select().single()
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
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-blue-950" /> Fee Payment
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount (₹)</label>
            <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)}
              placeholder="Enter amount" className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Month</label>
            <select value={form.month} onChange={e => set('month', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600">
              {getMonths().map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <button onClick={() => setStep(2)} disabled={!form.amount || parseFloat(form.amount) <= 0}
            className="w-full py-3 bg-blue-950 hover:bg-blue-900 text-white font-bold rounded-xl disabled:opacity-50 transition-colors">
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
          <p className="text-sm font-semibold text-blue-950">Amount: ₹{form.amount} · {form.month}</p>
          <div className="text-left">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">UPI Transaction ID <span className="text-red-500">*</span></label>
            <input type="text" value={form.reference_id} onChange={e => set('reference_id', e.target.value)}
              placeholder="e.g. 123456789012" className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600" />
            <p className="text-xs text-gray-400 mt-1">Enter the 12-digit transaction ID from your UPI app after paying</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50">
              ← Back
            </button>
            <button onClick={submit} disabled={loading || !form.reference_id.trim()}
              className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl disabled:opacity-50 transition-colors">
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
          <p className="text-gray-500 text-sm mt-2 mb-4">Your payment is pending verification by the admin.</p>
          <div className="bg-gray-50 rounded-xl p-4 text-left space-y-1 text-sm mb-6">
            <p><span className="text-gray-500">Amount:</span> <span className="font-semibold">₹{success.amount}</span></p>
            <p><span className="text-gray-500">Month:</span> <span className="font-semibold">{success.payment_month}</span></p>
            <p><span className="text-gray-500">Reference:</span> <span className="font-mono text-xs">{success.reference_id}</span></p>
          </div>
          <button onClick={() => { setStep(1); setForm({ amount:'', month: getMonths()[0], reference_id:'', screenshot_url:'' }) }}
            className="w-full py-3 bg-blue-950 text-white font-bold rounded-xl hover:bg-blue-900">
            Pay Another Month
          </button>
        </div>
      )}

      {/* Fee history */}
      {history.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Payment History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Month', 'Amount', 'Reference', 'Status', 'Date'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {history.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{r.payment_month}</td>
                    <td className="px-4 py-3 font-semibold">₹{r.amount}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{r.reference_id || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${FEE_STATUS[r.status]?.color}`}>
                        {FEE_STATUS[r.status]?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
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
