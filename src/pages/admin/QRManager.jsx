import { useState, useEffect } from 'react'
import { QrCode, Copy, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { copyToClipboard } from '../../utils/clipboard'

export default function QRManager() {
  const { user } = useAuth()
  const [current,  setCurrent]  = useState(null)
  const [history,  setHistory]  = useState([])
  const [form,     setForm]     = useState({ upi_id:'', payee_name:'', description:'' })
  const [file,     setFile]     = useState(null)
  const [preview,  setPreview]  = useState(null)
  const [saving,   setSaving]   = useState(false)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    supabase.from('qr_settings').select('*').order('updated_at', { ascending:false })
      .then(({ data }) => {
        const active = data?.find(d => d.is_active)
        setCurrent(active ?? null)
        setHistory(data ?? [])
        setLoading(false)
      })
  }, [])

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const save = async () => {
    if (!file && !form.upi_id) { toast.error('Upload a QR image or enter a UPI ID'); return }
    setSaving(true)
    try {
      let qr_image_url = current?.qr_image_url ?? ''
      if (file) {
        const path = `qr-codes/${Date.now()}-${file.name}`
        const { error: upErr } = await supabase.storage.from('qr-codes').upload(path, file, { upsert:true })
        if (upErr) throw upErr
        const { data: { publicUrl } } = supabase.storage.from('qr-codes').getPublicUrl(path)
        qr_image_url = publicUrl
      }
      // Deactivate all existing
      await supabase.from('qr_settings').update({ is_active:false }).eq('is_active', true)
      // Insert new
      const { data, error } = await supabase.from('qr_settings').insert({
        qr_image_url, upi_id:form.upi_id, payee_name:form.payee_name,
        description:form.description, is_active:true, updated_by:user.id,
      }).select().single()
      if (error) throw error
      setCurrent(data)
      setHistory(h => [data, ...h.map(x => ({ ...x, is_active:false }))])
      setFile(null); setPreview(null); setForm({ upi_id:'', payee_name:'', description:'' })
      toast.success('QR code updated!')
    } catch (err) {
      toast.error(err.message)
    }
    setSaving(false)
  }

  if (loading) return <div className="py-12 text-center text-gray-400 text-sm">Loading…</div>

  return (
    <div className="space-y-6 pb-20 lg:pb-0 max-w-2xl">

      {/* Current QR */}
      {current && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
          <h2 className="font-bold text-gray-900 mb-4 flex items-center justify-center gap-2">
            <QrCode className="h-5 w-5" /> Current Payment QR
          </h2>
          <img src={current.qr_image_url} alt="QR Code" className="w-52 h-52 mx-auto rounded-xl border-2 border-gray-200 object-contain mb-4" />
          {current.payee_name && <p className="font-bold text-gray-900">{current.payee_name}</p>}
          {current.upi_id && (
            <button onClick={() => copyToClipboard(current.upi_id, 'Copied!')}
              className="flex items-center gap-2 mx-auto mt-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors">
              <Copy className="h-4 w-4" /> {current.upi_id}
            </button>
          )}
          {current.description && <p className="text-sm text-gray-500 mt-2">{current.description}</p>}
          <p className="text-xs text-gray-400 mt-3">Last updated: {new Date(current.updated_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</p>
        </div>
      )}

      {/* Update form */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <h3 className="font-bold text-gray-900">{current ? 'Update QR Code' : 'Set Up Payment QR'}</h3>

        {/* File upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">QR Image</label>
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
            {preview
              ? <img src={preview} alt="preview" className="h-full object-contain rounded-xl p-1" />
              : <div className="flex flex-col items-center gap-2 text-gray-400">
                  <Upload className="h-6 w-6" />
                  <span className="text-sm">Click to upload QR image</span>
                </div>
            }
            <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </label>
        </div>

        {[{k:'upi_id',l:'UPI ID',p:'yourname@upi'},{k:'payee_name',l:'Payee Name',p:'Institute Name'},{k:'description',l:'Note (optional)',p:'e.g. Monthly fee payment'}].map(f => (
          <div key={f.k}>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{f.l}</label>
            <input value={form[f.k]} onChange={e => setForm(x => ({...x,[f.k]:e.target.value}))} placeholder={f.p}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm" />
          </div>
        ))}

        <button onClick={save} disabled={saving}
          className="w-full py-3 bg-blue-950 hover:bg-blue-900 text-white font-bold rounded-xl disabled:opacity-50 transition-colors">
          {saving ? 'Saving…' : current ? 'Update QR Code' : 'Set QR Code'}
        </button>
      </div>

      {/* History */}
      {history.length > 1 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100"><h3 className="font-semibold text-gray-900 text-sm">QR History</h3></div>
          <div className="divide-y divide-gray-50">
            {history.filter(h => !h.is_active).map(h => (
              <div key={h.id} className="px-4 py-3 flex items-center gap-3 opacity-60">
                <img src={h.qr_image_url} alt="" className="w-10 h-10 rounded object-contain border border-gray-200" />
                <div>
                  <p className="text-sm font-medium text-gray-700">{h.payee_name || h.upi_id || 'QR Code'}</p>
                  <p className="text-xs text-gray-400">{new Date(h.updated_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
