import { useState, useEffect } from 'react'
import { DollarSign, AlertCircle, QrCode, Upload, Copy, Check, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { copyToClipboard } from '../../utils/clipboard'

function getMonthLabel() {
  return new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

export default function SalaryStatus() {
  const { user } = useAuth()
  const [profile,       setProfile]       = useState(null)
  const [records,       setRecords]       = useState([])
  const [loading,       setLoading]       = useState(true)

  // Payment details editing
  const [editingPayment, setEditingPayment] = useState(false)
  const [upiId,          setUpiId]          = useState('')
  const [qrFile,         setQrFile]         = useState(null)
  const [qrPreview,      setQrPreview]      = useState(null)
  const [savingPayment,  setSavingPayment]  = useState(false)

  useEffect(() => {
    if (!user) return
    Promise.all([
      supabase.from('teacher_profiles')
        .select('salary_amount, subject, qualification, upi_qr_url, upi_id')
        .eq('id', user.id)
        .maybeSingle(),
      supabase.from('salary_records')
        .select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false }),
    ]).then(([p, r]) => {
      setProfile(p.data)
      setUpiId(p.data?.upi_id ?? '')
      setRecords(r.data ?? [])
      setLoading(false)
    })
  }, [user])

  const handleQrFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    if (!f.type.startsWith('image/')) { toast.error('Please select an image file'); return }
    setQrFile(f)
    setQrPreview(URL.createObjectURL(f))
  }

  const savePaymentDetails = async () => {
    setSavingPayment(true)
    try {
      let newQrUrl = profile?.upi_qr_url ?? null

      // Upload new QR image if selected
      if (qrFile) {
        const ext  = qrFile.name.split('.').pop().toLowerCase()
        const path = `${user.id}/qr.${ext}`
        const { error: upErr } = await supabase.storage
          .from('teacher-qr')
          .upload(path, qrFile, { upsert: true, contentType: qrFile.type })
        if (upErr) throw upErr
        const { data: { publicUrl } } = supabase.storage.from('teacher-qr').getPublicUrl(path)
        // Append cache-buster so browsers fetch the new image even if path is unchanged
        newQrUrl = `${publicUrl}?t=${Date.now()}`
      }

      const { error } = await supabase.from('teacher_profiles')
        .update({ upi_id: upiId.trim() || null, upi_qr_url: newQrUrl })
        .eq('id', user.id)
      if (error) throw error

      setProfile(prev => ({ ...prev, upi_id: upiId.trim() || null, upi_qr_url: newQrUrl }))
      setQrFile(null)
      setQrPreview(null)
      setEditingPayment(false)
      toast.success('Payment details saved!')
    } catch (err) {
      toast.error(err.message)
    }
    setSavingPayment(false)
  }

  const thisMonth = records.find(r => r.payment_month === getMonthLabel())
  const isPending = !thisMonth || thisMonth.status === 'pending'

  if (loading) return <div className="py-12 text-center text-gray-400 text-sm">Loading…</div>

  const hasPaymentInfo = profile?.upi_qr_url || profile?.upi_id

  return (
    <div className="space-y-6 pb-20 lg:pb-0 max-w-2xl">

      {/* Current month status */}
      <div className="bg-gradient-to-r from-green-700 to-green-600 rounded-2xl p-6 text-white">
        <p className="text-green-100 text-sm mb-1">Current Month</p>
        <h2 className="font-bold text-3xl">₹{profile?.salary_amount?.toLocaleString('en-IN') ?? '—'}</h2>
        <p className="text-green-100 mt-1">{getMonthLabel()}</p>
        <div className="mt-4">
          {thisMonth?.status === 'paid' ? (
            <span className="inline-flex items-center gap-2 bg-white/20 px-4 py-1.5 rounded-full text-sm font-semibold">
              ✓ {thisMonth.paid_at ? `Paid on ${new Date(thisMonth.paid_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : 'Paid'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 bg-yellow-400/20 px-4 py-1.5 rounded-full text-sm font-semibold text-yellow-100">
              ⏳ Pending
            </span>
          )}
        </div>
      </div>

      {/* Pending reminder */}
      {isPending && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 text-sm">Salary Pending</p>
            <p className="text-amber-700 text-xs mt-0.5">Your salary for {getMonthLabel()} hasn't been paid yet. Contact admin if needed.</p>
          </div>
        </div>
      )}

      {/* Payment Details card */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <QrCode className="h-4 w-4 text-gray-400" />
            <h3 className="font-semibold text-gray-900">My Payment Details</h3>
          </div>
          {!editingPayment && (
            <button
              onClick={() => { setEditingPayment(true); setUpiId(profile?.upi_id ?? '') }}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              <Pencil className="h-3.5 w-3.5" />
              {hasPaymentInfo ? 'Edit' : 'Set Up'}
            </button>
          )}
        </div>

        {editingPayment ? (
          <div className="p-5 space-y-4">
            <p className="text-xs text-gray-500">
              The admin will scan your QR code or use your UPI ID to pay your salary. Make sure it's correct.
            </p>

            {/* QR upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment QR Code</label>
              <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                {qrPreview || profile?.upi_qr_url
                  ? <img
                      src={qrPreview ?? profile?.upi_qr_url}
                      alt="QR preview"
                      className="h-full object-contain rounded-xl p-1"
                    />
                  : <div className="flex flex-col items-center gap-2 text-gray-400">
                      <Upload className="h-6 w-6" />
                      <span className="text-sm">Click to upload your UPI QR code</span>
                      <span className="text-xs text-gray-400">PNG, JPG, JPEG</span>
                    </div>
                }
                <input type="file" accept="image/*" className="hidden" onChange={handleQrFile} />
              </label>
              {(qrPreview || profile?.upi_qr_url) && (
                <p className="text-xs text-gray-400 mt-1.5 text-center">
                  {qrFile ? `New file selected: ${qrFile.name}` : 'Click to replace QR image'}
                </p>
              )}
            </div>

            {/* UPI ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">UPI ID</label>
              <input
                value={upiId}
                onChange={e => setUpiId(e.target.value)}
                placeholder="yourname@upi or phone@paytm"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm font-mono"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setEditingPayment(false); setQrFile(null); setQrPreview(null); setUpiId(profile?.upi_id ?? '') }}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={savePaymentDetails}
                disabled={savingPayment}
                className="flex-1 py-2.5 bg-blue-950 hover:bg-blue-900 text-white text-sm font-bold rounded-xl disabled:opacity-50 transition-colors"
              >
                {savingPayment ? 'Saving…' : 'Save Details'}
              </button>
            </div>
          </div>
        ) : hasPaymentInfo ? (
          <div className="p-5 flex flex-col sm:flex-row items-center gap-6">
            {profile.upi_qr_url && (
              <img
                src={profile.upi_qr_url}
                alt="My payment QR"
                className="w-36 h-36 rounded-xl border-2 border-gray-100 object-contain shadow-sm shrink-0"
              />
            )}
            <div className="space-y-2 text-center sm:text-left">
              {profile.upi_id && (
                <button
                  onClick={() => copyToClipboard(profile.upi_id, 'UPI ID copied!')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-mono font-medium transition-colors"
                >
                  <Copy className="h-4 w-4 text-gray-500" />
                  {profile.upi_id}
                </button>
              )}
              <p className="text-xs text-gray-400">This is what the admin sees when paying your salary.</p>
              <div className="inline-flex items-center gap-1.5 text-xs text-green-700 font-medium">
                <Check className="h-3.5 w-3.5" /> Payment details are set up
              </div>
            </div>
          </div>
        ) : (
          <div className="p-5 text-center">
            <QrCode className="h-10 w-10 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-500 mb-1">No payment details added yet</p>
            <p className="text-xs text-gray-400">Add your UPI QR code so the admin can pay your salary directly.</p>
            <button
              onClick={() => setEditingPayment(true)}
              className="mt-3 px-4 py-2 bg-blue-950 text-white text-sm font-medium rounded-xl hover:bg-blue-900 transition-colors"
            >
              Set Up Payment Details
            </button>
          </div>
        )}
      </div>

      {/* Salary history */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-gray-400" />
          <h3 className="font-semibold text-gray-900">Salary History</h3>
        </div>
        {records.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">No salary records yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Month', 'Amount', 'Method', 'Reference', 'Status', 'Paid On'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {records.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium whitespace-nowrap">{r.payment_month}</td>
                    <td className="px-4 py-3 font-semibold text-green-700 whitespace-nowrap">₹{Number(r.amount).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-gray-500 capitalize">{r.payment_method || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{r.reference_id || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${r.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                        {r.status === 'paid' ? 'Paid' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {r.paid_at ? new Date(r.paid_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
