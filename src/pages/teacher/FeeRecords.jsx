import { useState, useEffect } from 'react'
import { Search, Download, Lock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { normalizeUrl } from '../../utils/formatters'

const STATUS_COLORS = {
  pending:  'bg-amber-100 text-amber-800',
  verified: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
}

export default function FeeRecords() {
  const { user } = useAuth()
  const [perms,    setPerms]    = useState(null)
  const [records,  setRecords]  = useState([])
  const [search,   setSearch]   = useState('')
  const [statusF,  setStatusF]  = useState('')
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!user) return
    supabase
      .from('teacher_profiles')
      .select('can_view_fee_records')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setPerms(data)
        if (data?.can_view_fee_records) {
          supabase
            .from('fee_records')
            .select('*, profiles!student_id(full_name, email)')
            .order('paid_at', { ascending: false })
            .limit(200)
            .then(({ data: rows }) => {
              setRecords(rows ?? [])
              setLoading(false)
            })
        } else {
          setLoading(false)
        }
      })
  }, [user])

  const filtered = records.filter(r => {
    const matchS  = r.profiles?.full_name?.toLowerCase().includes(search.toLowerCase())
                 || r.profiles?.email?.toLowerCase().includes(search.toLowerCase())
    const matchSt = !statusF || r.status === statusF
    return matchS && matchSt
  })

  const exportCSV = () => {
    const rows = [['Student', 'Email', 'Month', 'Amount', 'Reference', 'Status', 'Date']]
    filtered.forEach(r => rows.push([
      r.profiles?.full_name ?? '',
      r.profiles?.email ?? '',
      r.payment_month,
      r.amount,
      r.reference_id || '',
      r.status,
      r.paid_at ? new Date(r.paid_at).toLocaleDateString('en-IN') : '',
    ]))
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
    a.download = 'fee-records.csv'
    a.click()
  }

  if (loading) return <div className="py-12 text-center text-gray-400 text-sm">Loading…</div>

  if (!perms?.can_view_fee_records) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <Lock className="h-7 w-7 text-gray-400" />
        </div>
        <h2 className="font-bold text-gray-700 text-lg mb-1">Access Restricted</h2>
        <p className="text-sm text-gray-400 max-w-xs">You don't have permission to view fee records. Contact your admin to enable this.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-20 lg:pb-0">
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search student…"
            className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
        <select
          value={statusF}
          onChange={e => setStatusF(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </select>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
        >
          <Download className="h-4 w-4" /> Export
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <p className="text-gray-400 text-sm">No records found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Student', 'Month', 'Amount', 'Reference', 'Status', 'Date', 'Proof'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium">{r.profiles?.full_name}</p>
                      <p className="text-xs text-gray-400">{r.profiles?.email}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.payment_month}</td>
                    <td className="px-4 py-3 font-semibold">₹{r.amount}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.reference_id || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[r.status]}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {r.paid_at ? new Date(r.paid_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {r.screenshot_url
                        ? <a href={normalizeUrl(r.screenshot_url)} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">View</a>
                        : <span className="text-xs text-gray-300">—</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 text-right">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</p>
    </div>
  )
}
