// src/components/analytics/FeeChart.jsx
import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Link } from 'react-router-dom'
import { CreditCard, AlertCircle, MessageCircle } from 'lucide-react'
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
        supabase.from('profiles').select('id, full_name').eq('role', 'student').eq('is_active', true),
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

  if (loading) return <div className="py-16 text-center text-slate-400 text-xs font-bold">Loading financial telemetry…</div>

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5 pb-3 border-b border-slate-100">
          <div>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider border border-emerald-200/70">
              <CreditCard className="h-3 w-3 text-emerald-600" /> Financial Telemetry
            </span>
            <h3 className="font-display font-black text-slate-900 text-base sm:text-lg tracking-tight mt-1">
              Fee Collection Trajectory — Last 6 Months
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Verified collections vs. pending invoicing across all institute batches.
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-slate-100 rounded-xl text-slate-700 border border-slate-200/70 shrink-0 self-start sm:self-auto">
            6-Month Aggregate
          </span>
        </div>

        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={monthData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => `₹${v/1000}k`} />
            <Tooltip
              formatter={(v, n) => [`₹${v.toLocaleString('en-IN')}`, n === 'verified' ? 'Verified' : 'Pending']}
              contentStyle={{ backgroundColor: '#0f172a', borderRadius: '16px', color: '#fff', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.15)' }}
            />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
            <Bar dataKey="verified" fill="#16a34a" radius={[6, 6, 0, 0]} name="Verified" stackId="a" />
            <Bar dataKey="pending"  fill="#d97706" radius={[6, 6, 0, 0]} name="Pending"  stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {unpaid.length > 0 && (
        <div className="bg-white rounded-3xl border border-amber-200/80 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-amber-100">
            <div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-black uppercase tracking-wider border border-amber-200/70">
                <AlertCircle className="h-3 w-3 text-amber-600" /> Pending Invoices
              </span>
              <h3 className="font-display font-black text-slate-900 text-base sm:text-lg tracking-tight mt-1">
                Outstanding Dues This Month
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Students requiring fee reminders or payment link dispatch.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 shrink-0 self-start sm:self-auto">
              {unpaid.length} Pending
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {unpaid.map(s => (
              <div
                key={s.id}
                className="p-3.5 rounded-2xl bg-amber-50/40 border border-amber-200/70 flex items-center justify-between gap-3 hover:bg-amber-50/70 transition-colors shadow-2xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white text-xs font-black flex items-center justify-center shrink-0 shadow-2xs">
                    {s.full_name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 text-xs sm:text-sm truncate">{s.full_name}</p>
                    <span className="text-[10px] font-semibold text-amber-700">Fee Pending</span>
                  </div>
                </div>

                <Link
                  to={`/admin/messages?contact=${s.id}`}
                  className="p-2 rounded-xl bg-white text-amber-800 hover:bg-amber-600 hover:text-white border border-amber-200 shadow-2xs transition-all active:scale-95 shrink-0"
                  title="Message Student"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
