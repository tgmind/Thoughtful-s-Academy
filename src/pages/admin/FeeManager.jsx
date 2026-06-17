import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Download, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { normalizeUrl } from '../../utils/formatters'

const TABS = ['Pending', 'All Records']
const STATUS_COLORS = { pending:'bg-amber-100 text-amber-800', verified:'bg-green-100 text-green-800', rejected:'bg-red-100 text-red-800' }

export default function FeeManager() {
  const { user } = useAuth()
  const [tab,       setTab]       = useState('Pending')
  const [pending,   setPending]   = useState([])
  const [all,       setAll]       = useState([])
  const [search,    setSearch]    = useState('')
  const [statusF,   setStatusF]   = useState('')
  const [loading,   setLoading]   = useState(true)
  const [acting,    setActing]    = useState(null)
  const [rejectId,  setRejectId]  = useState(null)
  const [reason,    setReason]    = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('fee_records').select('*, profiles!student_id(full_name, email)').eq('status','pending').order('paid_at'),
      supabase.from('fee_records').select('*, profiles!student_id(full_name, email)').order('paid_at', { ascending:false }).limit(100),
    ]).then(([p, a]) => {
      setPending(p.data ?? [])
      setAll(a.data ?? [])
      setLoading(false)
    })
  }, [])

  const verify = async (id) => {
    setActing(id)
    await supabase.from('fee_records').update({ status:'verified', verified_by:user.id, verified_at:new Date().toISOString() }).eq('id', id)
    setPending(f => f.filter(x => x.id !== id))
    setAll(f => f.map(x => x.id === id ? { ...x, status:'verified' } : x))
    toast.success('Fee verified ✓')
    setActing(null)
  }

  const reject = async () => {
    if (!rejectId) return
    setActing(rejectId)
    await supabase.from('fee_records').update({ status:'rejected', notes:reason, verified_by:user.id, verified_at:new Date().toISOString() }).eq('id', rejectId)
    setPending(f => f.filter(x => x.id !== rejectId))
    setAll(f => f.map(x => x.id === rejectId ? { ...x, status:'rejected' } : x))
    toast.success('Fee rejected')
    setActing(null); setRejectId(null); setReason('')
  }

  const exportCSV = () => {
    const rows = [['Student','Email','Month','Amount','Reference','Status','Date']]
    filteredAll.forEach(r => rows.push([r.profiles?.full_name??'', r.profiles?.email??'', r.payment_month, r.amount, r.reference_id||'', r.status, r.paid_at ? new Date(r.paid_at).toLocaleDateString('en-IN') : '']))
    const csv = rows.map(r => r.map(v=>`"${v}"`).join(',')).join('\n')
    const a = document.createElement('a'); a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv); a.download='fees.csv'; a.click()
  }

  const filteredAll = all.filter(r => {
    const matchS = r.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) || r.profiles?.email?.toLowerCase().includes(search.toLowerCase())
    const matchSt = !statusF || r.status === statusF
    return matchS && matchSt
  })

  if (loading) return <div className="py-12 text-center text-gray-400 text-sm">Loading…</div>

  return (
    <div className="space-y-4 pb-20 lg:pb-0">
      <div className="flex gap-2">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab===t?'bg-blue-950 text-white':'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {t} {t==='Pending' && pending.length > 0 && <span className="ml-1 bg-amber-400 text-white text-xs rounded-full px-1.5">{pending.length}</span>}
          </button>
        ))}
      </div>

      {tab === 'Pending' && (
        pending.length === 0
          ? <div className="text-center py-16 bg-white rounded-xl border border-gray-100"><p className="text-gray-400">No pending verifications 🎉</p></div>
          : <div className="space-y-3">
              {pending.map(f => (
                <div key={f.id} className="bg-white rounded-xl border border-amber-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-gray-900">{f.profiles?.full_name}</p>
                      <p className="text-sm text-gray-500">{f.profiles?.email}</p>
                      <div className="flex gap-3 mt-2 text-sm">
                        <span className="font-semibold text-green-700">₹{f.amount}</span>
                        <span className="text-gray-500">{f.payment_month}</span>
                        <span className="font-mono text-xs text-gray-400">{f.reference_id}</span>
                      </div>
                      {f.screenshot_url && (
                        <a href={normalizeUrl(f.screenshot_url)} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-1 inline-block">View Screenshot</a>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => verify(f.id)} disabled={acting===f.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors">
                        <CheckCircle className="h-4 w-4" /> Verify
                      </button>
                      <button onClick={() => { setRejectId(f.id); setReason('') }} disabled={acting===f.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold rounded-lg transition-colors">
                        <XCircle className="h-4 w-4" /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
      )}

      {tab === 'All Records' && (
        <>
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student…"
                className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
            </div>
            <select value={statusF} onChange={e => setStatusF(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none">
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
            </select>
            <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
              <Download className="h-4 w-4" /> Export
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>{['Student','Month','Amount','Reference','Status','Date'].map(h=>(
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredAll.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3"><p className="font-medium">{r.profiles?.full_name}</p><p className="text-xs text-gray-400">{r.profiles?.email}</p></td>
                      <td className="px-4 py-3 text-gray-600">{r.payment_month}</td>
                      <td className="px-4 py-3 font-semibold">₹{r.amount}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.reference_id||'—'}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[r.status]}`}>{r.status}</span></td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{r.paid_at ? new Date(r.paid_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'}) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Reject modal */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-gray-900 mb-3">Reject Fee Payment</h3>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
              placeholder="Reason for rejection (optional)…"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setRejectId(null)} className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl font-semibold text-sm">Cancel</button>
              <button onClick={reject} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700">Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
