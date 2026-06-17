// src/components/analytics/FeeChart.jsx
import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { supabase } from '../../lib/supabase'

function last6Months() {
  const months = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i)
    months.push(d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }))
  }
  return months
}

export default function FeeChart() {
  const [monthData, setMonthData] = useState([])
  const [unpaid,    setUnpaid]    = useState([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    const load = async () => {
      const months = last6Months()
      const [{ data: fees }, { data: students }] = await Promise.all([
        supabase.from('fee_records').select('amount, status, payment_month, student_id'),
        supabase.from('profiles').select('id, full_name').eq('role', 'student'),
      ])

      // Monthly breakdown
      const monthly = months.map(m => {
        const mFees    = (fees ?? []).filter(f => f.payment_month === m)
        const verified = mFees.filter(f => f.status === 'verified').reduce((s, f) => s + Number(f.amount), 0)
        const pending  = mFees.filter(f => f.status === 'pending').reduce((s, f) => s + Number(f.amount), 0)
        return { month: m.split(' ')[0], verified, pending }
      })
      setMonthData(monthly)

      // Unpaid this month
      const thisMonth   = months[months.length - 1]
      const paidIds     = new Set((fees ?? []).filter(f => f.payment_month === thisMonth && f.status === 'verified').map(f => f.student_id))
      const unpaidStudents = (students ?? []).filter(s => !paidIds.has(s.id)).slice(0, 10)
      setUnpaid(unpaidStudents)

      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="py-8 text-center text-gray-400 text-sm">Loading fee data…</div>

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="font-bold text-gray-900 mb-4">Fee Collection — Last 6 Months</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthData} margin={{ top:5, right:10, left:0, bottom:5 }}>
            <XAxis dataKey="month" tick={{ fontSize:11 }} />
            <YAxis tick={{ fontSize:11 }} tickFormatter={v => `₹${v/1000}k`} />
            <Tooltip formatter={(v, n) => [`₹${v.toLocaleString('en-IN')}`, n === 'verified' ? 'Verified' : 'Pending']} />
            <Legend />
            <Bar dataKey="verified" fill="#16a34a" radius={[4,4,0,0]} name="Verified" stackId="a" />
            <Bar dataKey="pending"  fill="#d97706" radius={[4,4,0,0]} name="Pending"  stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {unpaid.length > 0 && (
        <div className="bg-white rounded-2xl border border-amber-100 p-5">
          <h3 className="font-bold text-amber-700 mb-3">Not Paid This Month ({unpaid.length}+)</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {unpaid.map(s => (
              <div key={s.id} className="flex items-center gap-2 py-1.5">
                <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {s.full_name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <span className="text-sm text-gray-700 truncate">{s.full_name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
