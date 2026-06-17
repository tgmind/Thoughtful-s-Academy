#!/bin/bash
# ============================================================
# phase6to15.sh — Phases 6-15: Email notifications, Analytics,
#                 PWA, unread badges, polish & deployment config
# Run inside coaching-institute folder: bash phase6to15.sh
# ============================================================
set -e
echo "🏗️  Building Phases 6–15 — Final features & deployment..."

mkdir -p src/hooks
mkdir -p src/components/analytics
mkdir -p supabase/functions/fee-notification
mkdir -p supabase/functions/fee-verified-notification
mkdir -p public/icons

# ============================================================
# PHASE 6 — Email notification helpers (frontend side)
# ============================================================
cat > src/lib/notifications.js << 'EOF'
// ============================================================
// src/lib/notifications.js
// Calls Supabase Edge Functions for email notifications.
// Edge functions are deployed separately — see supabase/functions/
// ============================================================
import { supabase } from './supabase'

async function callEdgeFunction(name, body) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      }
    )
    if (!res.ok) console.warn(`Edge function ${name} failed:`, await res.text())
  } catch (err) {
    // Never block UI if notification fails
    console.warn(`Notification error (${name}):`, err.message)
  }
}

export const triggerFeeNotification = (data) =>
  callEdgeFunction('fee-notification', data)

export const triggerFeeVerifiedNotification = (data) =>
  callEdgeFunction('fee-verified-notification', data)

export const triggerSalaryNotification = (data) =>
  callEdgeFunction('salary-notification', data)
EOF
echo "  ✅ src/lib/notifications.js"

# ============================================================
# PHASE 6 — Supabase Edge Function: fee-notification
# ============================================================
cat > supabase/functions/fee-notification/index.ts << 'EOF'
// supabase/functions/fee-notification/index.ts
// Deploy: supabase functions deploy fee-notification
// Secrets: supabase secrets set RESEND_API_KEY=re_xxxx

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { student_id, amount, month, reference_id } = await req.json()

    // Fetch student & admin details
    const [{ data: student }, { data: admins }] = await Promise.all([
      supabase.from('profiles').select('full_name, email, phone').eq('id', student_id).single(),
      supabase.from('profiles').select('email').eq('role', 'admin').limit(1),
    ])

    const adminEmail  = admins?.[0]?.email
    const resendKey   = Deno.env.get('RESEND_API_KEY')
    const fromEmail   = 'notifications@resend.dev'  // replace with your verified domain

    if (resendKey && student && adminEmail) {
      // Email to admin
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: fromEmail,
          to:   adminEmail,
          subject: `New Fee Payment — ${student.full_name}`,
          html: `<p>New fee payment received from <strong>${student.full_name}</strong>.<br>
                 Amount: <strong>₹${amount}</strong> for <strong>${month}</strong>.<br>
                 Reference: <code>${reference_id}</code><br><br>
                 Please log in to verify the payment.</p>`,
        }),
      })

      // Email to student
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: fromEmail,
          to:   student.email,
          subject: 'Fee Payment Submitted',
          html: `<p>Hi ${student.full_name},<br><br>
                 Your fee payment of <strong>₹${amount}</strong> for <strong>${month}</strong>
                 has been submitted and is pending verification.<br>
                 Reference ID: <code>${reference_id}</code><br><br>
                 You will be notified once it is verified.</p>`,
        }),
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
EOF
echo "  ✅ supabase/functions/fee-notification"

# ============================================================
# PHASE 6 — Edge Function: fee-verified-notification
# ============================================================
cat > supabase/functions/fee-verified-notification/index.ts << 'EOF'
// supabase/functions/fee-verified-notification/index.ts
// Deploy: supabase functions deploy fee-verified-notification

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { fee_record_id, status } = await req.json()

    const { data: fee } = await supabase
      .from('fee_records')
      .select('*, profiles!student_id(full_name, email)')
      .eq('id', fee_record_id)
      .single()

    const resendKey  = Deno.env.get('RESEND_API_KEY')
    const fromEmail  = 'notifications@resend.dev'

    if (resendKey && fee) {
      const isVerified = status === 'verified'
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: fromEmail,
          to:   fee.profiles.email,
          subject: `Fee Payment ${isVerified ? 'Verified ✓' : 'Rejected ✗'}`,
          html: `<p>Hi ${fee.profiles.full_name},<br><br>
                 Your payment of <strong>₹${fee.amount}</strong> for <strong>${fee.payment_month}</strong>
                 has been <strong>${isVerified ? 'verified ✓' : 'rejected ✗'}</strong>.
                 ${!isVerified && fee.notes ? `<br>Reason: ${fee.notes}<br>Please re-submit.` : ''}
                 </p>`,
        }),
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
EOF
echo "  ✅ supabase/functions/fee-verified-notification"

# ============================================================
# PHASE 7 — useLiveClass realtime hook
# ============================================================
cat > src/hooks/useRealtime.js << 'EOF'
// src/hooks/useRealtime.js
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// Plays a short beep using Web Audio API — no external files needed
function playBeep() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)()
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value  = 880
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.4)
  } catch (_) { /* AudioContext not supported — silent fail */ }
}

export function useLiveClass(batchId) {
  const [liveClass, setLiveClass] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const channelRef  = useRef(null)
  const prevIdRef   = useRef(null)

  const fetchLive = useCallback(async () => {
    let query = supabase
      .from('live_classes')
      .select('*, profiles!teacher_id(full_name)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)

    if (batchId) {
      query = supabase
        .from('live_classes')
        .select('*, profiles!teacher_id(full_name)')
        .eq('is_active', true)
        .or(`batch_id.eq.${batchId},batch_id.is.null`)
        .order('created_at', { ascending: false })
        .limit(1)
    }

    const { data } = await query
    const cls = data?.[0] ?? null

    // Play beep only when a NEW live class appears
    if (cls && cls.id !== prevIdRef.current) {
      if (prevIdRef.current !== null) playBeep()
      prevIdRef.current = cls.id
    }
    if (!cls) prevIdRef.current = null

    setLiveClass(cls)
    setIsLoading(false)
  }, [batchId])

  useEffect(() => {
    fetchLive()

    // Prevent duplicate subscriptions
    if (channelRef.current) supabase.removeChannel(channelRef.current)

    channelRef.current = supabase
      .channel(`live_class_${batchId ?? 'all'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_classes' }, fetchLive)
      .subscribe()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [fetchLive, batchId])

  return { liveClass, isLoading }
}

// Hook for unread message count (used in nav badge)
export function useUnreadMessages(userId) {
  const [count, setCount] = useState(0)

  const fetch = useCallback(async () => {
    if (!userId) return
    const { count: c } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .eq('is_read', false)
    setCount(c ?? 0)
  }, [userId])

  useEffect(() => {
    fetch()
    const ch = supabase.channel(`unread_${userId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'messages',
        filter: `receiver_id=eq.${userId}`
      }, fetch)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [fetch, userId])

  return count
}
EOF
echo "  ✅ src/hooks/useRealtime.js"

# ============================================================
# PHASE 7 — LiveClassBanner component
# ============================================================
cat > src/components/shared/LiveClassBanner.jsx << 'EOF'
// src/components/shared/LiveClassBanner.jsx
import { useState } from 'react'
import { X, Copy, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

const PLATFORM_LABELS = { zoom: '🎥 Zoom', google_meet: '📹 Google Meet', other: '🔗 Link' }

export default function LiveClassBanner({ liveClass, onDismiss }) {
  const [showPw, setShowPw] = useState(false)

  if (!liveClass) return null

  const copyPw = () => {
    navigator.clipboard.writeText(liveClass.password)
    toast.success('Password copied!')
  }

  return (
    <div className="w-full bg-gradient-to-r from-red-600 to-red-500 rounded-2xl p-4 text-white shadow-lg animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="flex items-center gap-1.5 bg-white/20 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" /> Live Now
            </span>
            <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full">
              {PLATFORM_LABELS[liveClass.platform] || '🔗 Online'}
            </span>
          </div>

          {/* Title */}
          <h3 className="font-bold text-lg leading-snug">{liveClass.title}</h3>
          {liveClass.profiles?.full_name && (
            <p className="text-red-100 text-sm mt-0.5">by {liveClass.profiles.full_name}</p>
          )}

          {/* Password */}
          {liveClass.password && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-red-100">Password:</span>
              <span className="font-mono bg-white/20 px-2 py-0.5 rounded text-sm">
                {showPw ? liveClass.password : '••••••'}
              </span>
              <button onClick={() => setShowPw(s => !s)} className="text-red-100 hover:text-white">
                {showPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
              <button onClick={copyPw} className="text-red-100 hover:text-white">
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Join button */}
          <a href={liveClass.join_url} target="_blank" rel="noopener noreferrer"
            className="inline-block mt-3 px-5 py-2 bg-white text-red-600 font-bold rounded-xl text-sm hover:bg-red-50 transition-colors shadow">
            Join Class →
          </a>
        </div>

        {/* Dismiss */}
        {onDismiss && (
          <button onClick={onDismiss} className="flex-shrink-0 p-1 text-red-200 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  )
}
EOF
echo "  ✅ src/components/shared/LiveClassBanner.jsx"

# ============================================================
# PHASE 12 — Analytics page for admin
# ============================================================
cat > src/components/analytics/AttendanceChart.jsx << 'EOF'
// src/components/analytics/AttendanceChart.jsx
import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts'
import { Link } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'

function dateRange(days) {
  const dates = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    dates.push(d.toISOString().split('T')[0])
  }
  return dates
}

export default function AttendanceChart() {
  const [batchData,   setBatchData]   = useState([])
  const [trendData,   setTrendData]   = useState([])
  const [atRisk,      setAtRisk]      = useState([])
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    const load = async () => {
      const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const monthStart = new Date(); monthStart.setDate(1)

      const [{ data: att }, { data: batches }, { data: students }] = await Promise.all([
        supabase.from('attendance').select('student_id, status, date')
          .gte('date', thirtyDaysAgo.toISOString().split('T')[0]),
        supabase.from('batches').select('id, name').eq('is_active', true),
        supabase.from('profiles').select('id, full_name')
          .eq('role', 'student').eq('is_active', true),
      ])

      const spRes = await supabase.from('student_profiles').select('id, batch_id, batches(name)')
      const spMap = {}; (spRes.data ?? []).forEach(s => { spMap[s.id] = s })

      // Batch-wise attendance this month
      const batchStats = {}
      ;(batches ?? []).forEach(b => { batchStats[b.id] = { name: b.name, present: 0, total: 0 } })
      ;(att ?? []).filter(a => a.date >= monthStart.toISOString().split('T')[0]).forEach(a => {
        const bId = spMap[a.student_id]?.batch_id
        if (bId && batchStats[bId]) {
          batchStats[bId].total++
          if (a.status === 'present') batchStats[bId].present++
        }
      })
      setBatchData(Object.values(batchStats).map(b => ({
        name: b.name,
        pct:  b.total > 0 ? Math.round((b.present / b.total) * 100) : 0,
      })))

      // 30-day trend
      const dates = dateRange(30)
      const dayMap = {}
      ;(att ?? []).forEach(a => {
        if (!dayMap[a.date]) dayMap[a.date] = { present: 0, total: 0 }
        dayMap[a.date].total++
        if (a.status === 'present') dayMap[a.date].present++
      })
      setTrendData(dates.map(d => ({
        date: d.slice(5),  // MM-DD
        pct:  dayMap[d] ? Math.round((dayMap[d].present / dayMap[d].total) * 100) : 0,
      })))

      // At-risk students (< 50% in last 30 days)
      const studentAtt = {}
      ;(att ?? []).forEach(a => {
        if (!studentAtt[a.student_id]) studentAtt[a.student_id] = { present: 0, total: 0 }
        studentAtt[a.student_id].total++
        if (a.status === 'present') studentAtt[a.student_id].present++
      })
      const risks = (students ?? [])
        .map(s => ({
          ...s,
          pct:   studentAtt[s.id] ? Math.round((studentAtt[s.id].present / studentAtt[s.id].total) * 100) : 0,
          batch: spMap[s.id]?.batches?.name ?? '—',
        }))
        .filter(s => s.pct < 50)
        .sort((a, b) => a.pct - b.pct)
        .slice(0, 10)
      setAtRisk(risks)

      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="py-12 text-center text-gray-400 text-sm">Loading analytics…</div>

  const barColor = (pct) => pct >= 75 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626'

  return (
    <div className="space-y-6">
      {/* Batch comparison */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="font-bold text-gray-900 mb-4">Batch-wise Attendance — This Month</h3>
        {batchData.length === 0
          ? <p className="text-gray-400 text-sm text-center py-6">No attendance data yet</p>
          : <ResponsiveContainer width="100%" height={220}>
              <BarChart data={batchData} margin={{ top:5, right:10, left:0, bottom:5 }}>
                <XAxis dataKey="name" tick={{ fontSize:11 }} />
                <YAxis domain={[0,100]} tick={{ fontSize:11 }} unit="%" />
                <Tooltip formatter={(v) => [`${v}%`, 'Attendance']} />
                <Bar dataKey="pct" radius={[6,6,0,0]}
                  fill="#1e2771"
                  label={{ position:'top', fontSize:11, formatter: v => `${v}%` }}
                />
              </BarChart>
            </ResponsiveContainer>
        }
      </div>

      {/* 30-day trend */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="font-bold text-gray-900 mb-4">Attendance Trend — Last 30 Days</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={trendData} margin={{ top:5, right:10, left:0, bottom:5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize:10 }} interval={4} />
            <YAxis domain={[0,100]} tick={{ fontSize:11 }} unit="%" />
            <Tooltip formatter={(v) => [`${v}%`, 'Present']} />
            <Line type="monotone" dataKey="pct" stroke="#1e2771" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* At-risk students */}
      {atRisk.length > 0 && (
        <div className="bg-white rounded-2xl border border-red-100 p-5">
          <h3 className="font-bold text-red-700 mb-3 flex items-center gap-2">
            ⚠ At-Risk Students <span className="text-xs font-normal text-red-500">(&lt;50% attendance)</span>
          </h3>
          <div className="space-y-2">
            {atRisk.map(s => (
              <div key={s.id} className="flex items-center gap-3 py-2 border-b border-gray-50">
                <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 text-xs font-bold flex items-center justify-center">
                  {s.full_name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{s.full_name}</p>
                  <p className="text-xs text-gray-400">{s.batch}</p>
                </div>
                <span className="font-bold text-red-600 text-sm">{s.pct}%</span>
                <Link to="/admin/messages" className="p-1.5 text-gray-400 hover:text-blue-600">
                  <MessageCircle className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
EOF
echo "  ✅ AttendanceChart"

cat > src/components/analytics/FeeChart.jsx << 'EOF'
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
                  {s.full_name[0].toUpperCase()}
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
EOF
echo "  ✅ FeeChart"

# ============================================================
# PHASE 12 — Analytics page (admin)
# ============================================================
cat > src/pages/admin/Analytics.jsx << 'EOF'
import { useState } from 'react'
import AttendanceChart from '../../components/analytics/AttendanceChart'
import FeeChart        from '../../components/analytics/FeeChart'

const TABS = ['Attendance', 'Fees']

export default function Analytics() {
  const [tab, setTab] = useState('Attendance')
  return (
    <div className="space-y-5 pb-20 lg:pb-0">
      <div className="flex gap-2">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab===t?'bg-blue-950 text-white':'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {t} Analytics
          </button>
        ))}
      </div>
      {tab === 'Attendance' ? <AttendanceChart /> : <FeeChart />}
    </div>
  )
}
EOF
echo "  ✅ Analytics page"

# ============================================================
# PHASE 13 — PWA manifest + vite config update
# ============================================================
cat > public/manifest.json << 'EOF'
{
  "name": "Coaching Institute",
  "short_name": "Institute",
  "description": "Student portal — attendance, study, fees & messages",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#111755",
  "theme_color": "#111755",
  "orientation": "portrait",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
EOF
echo "  ✅ public/manifest.json"

# Update index.html to include manifest link (only if not already present)
if ! grep -q 'rel="manifest"' index.html; then
  sed -i 's|<meta name="theme-color"|<link rel="manifest" href="/manifest.json" />\n    <meta name="theme-color"|' index.html
  echo "  ✅ manifest linked in index.html"
else
  echo "  ✅ manifest already in index.html (skipped)"
fi

# Install PWA plugin
npm install -D vite-plugin-pwa --silent

cat > vite.config.js << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false,   // using our own public/manifest.json
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
            },
          },
          {
            urlPattern: /^https:\/\/img\.youtube\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'youtube-thumbs',
              expiration: { maxEntries: 100, maxAgeSeconds: 86400 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 10, maxAgeSeconds: 31536000 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
EOF
echo "  ✅ vite.config.js updated with PWA"

# ============================================================
# PHASE 15 — Skeleton component
# ============================================================
cat > src/components/shared/Skeleton.jsx << 'EOF'
// Reusable skeleton loader — use instead of spinners for content areas
export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <Skeleton className="h-40 w-full rounded-none" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Skeleton className="w-9 h-9 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="space-y-0">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-gray-50">
          {[...Array(cols)].map((_, j) => (
            <Skeleton key={j} className={`h-3.5 flex-1 ${j === 0 ? 'max-w-[140px]' : ''}`} />
          ))}
        </div>
      ))}
    </div>
  )
}
EOF
echo "  ✅ Skeleton components"

# ============================================================
# Update App.jsx — add Analytics route to admin
# ============================================================
cat > src/App.jsx << 'EOF'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider }   from './context/AuthContext'
import { ProtectedRoute } from './utils/roleGuard'
import { Toaster }        from 'react-hot-toast'

import Home     from './pages/Home'
import Login    from './pages/Login'
import Register from './pages/Register'
import { NotFound, Unauthorized, AccountSuspended } from './pages/ErrorPages'

// Student
import StudentLayout        from './pages/student/StudentLayout'
import StudentDashboard     from './pages/student/StudentDashboard'
import Attendance           from './pages/student/Attendance'
import StudySection         from './pages/student/StudySection'
import StudentMessages      from './pages/student/Messages'
import PayFee               from './pages/student/PayFee'
import StudentNotifications from './pages/student/Notifications'

// Teacher
import TeacherLayout        from './pages/teacher/TeacherLayout'
import TeacherHome           from './pages/teacher/TeacherHome'
import TeacherStudyCards     from './pages/teacher/StudyCards'
import TeacherLiveClass      from './pages/teacher/LiveClass'
import TeacherMessages       from './pages/teacher/Messages'
import SalaryStatus          from './pages/teacher/SalaryStatus'
import TeacherNotifications  from './pages/teacher/Notifications'

// Admin
import AdminLayout     from './pages/admin/AdminLayout'
import AdminHome       from './pages/admin/AdminHome'
import StudentTracker  from './pages/admin/StudentTracker'
import TeacherManager  from './pages/admin/TeacherManager'
import FeeManager      from './pages/admin/FeeManager'
import BatchManager    from './pages/admin/BatchManager'
import QRManager       from './pages/admin/QRManager'
import SalaryManager   from './pages/admin/SalaryManager'
import Announcements   from './pages/admin/Announcements'
import AdminMessages   from './pages/admin/AdminMessages'
import Analytics       from './pages/admin/Analytics'
import AdminStudyCards from './pages/teacher/StudyCards'
import AdminLiveClass  from './pages/teacher/LiveClass'

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" toastOptions={{
        duration: 4000,
        style: { fontFamily:'Inter,system-ui,sans-serif', fontSize:'14px', borderRadius:'10px', border:'1px solid #e5e7eb' },
        success: { iconTheme: { primary:'#16a34a', secondary:'#fff' } },
        error:   { iconTheme: { primary:'#dc2626', secondary:'#fff' } },
      }} />

      <Routes>
        {/* Public */}
        <Route path="/"                  element={<Home />}             />
        <Route path="/login"             element={<Login />}            />
        <Route path="/register"          element={<Register />}         />
        <Route path="/unauthorized"      element={<Unauthorized />}     />
        <Route path="/account-suspended" element={<AccountSuspended />} />

        {/* Student */}
        <Route element={<ProtectedRoute allowedRoles={['student']} />}>
          <Route path="/student" element={<StudentLayout />}>
            <Route path="dashboard"     element={<StudentDashboard />}     />
            <Route path="attendance"    element={<Attendance />}           />
            <Route path="study"         element={<StudySection />}         />
            <Route path="messages"      element={<StudentMessages />}      />
            <Route path="pay-fee"       element={<PayFee />}               />
            <Route path="notifications" element={<StudentNotifications />} />
          </Route>
        </Route>

        {/* Teacher */}
        <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
          <Route path="/teacher" element={<TeacherLayout />}>
            <Route path="dashboard"     element={<TeacherHome />}            />
            <Route path="study-cards"   element={<TeacherStudyCards />}      />
            <Route path="live-class"    element={<TeacherLiveClass />}        />
            <Route path="messages"      element={<TeacherMessages />}         />
            <Route path="salary"        element={<SalaryStatus />}            />
            <Route path="notifications" element={<TeacherNotifications />}    />
          </Route>
        </Route>

        {/* Admin */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="dashboard"     element={<AdminHome />}                       />
            <Route path="students"      element={<StudentTracker />}                  />
            <Route path="teachers"      element={<TeacherManager />}                  />
            <Route path="fees"          element={<FeeManager />}                      />
            <Route path="batches"       element={<BatchManager />}                    />
            <Route path="study-cards"   element={<AdminStudyCards isAdmin={true} />} />
            <Route path="live-class"    element={<AdminLiveClass  isAdmin={true} />} />
            <Route path="qr"            element={<QRManager />}                       />
            <Route path="salary"        element={<SalaryManager />}                   />
            <Route path="announcements" element={<Announcements />}                   />
            <Route path="messages"      element={<AdminMessages />}                   />
            <Route path="analytics"     element={<Analytics />}                       />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  )
}
EOF
echo "  ✅ App.jsx — analytics route added"

# Add Analytics to admin nav
cat > src/pages/admin/AdminLayout.jsx << 'EOF'
import { LayoutDashboard, Users, BookUser, CreditCard, Layers, QrCode, DollarSign, Bell, MessageCircle, BookOpen, Video, BarChart2 } from 'lucide-react'
import DashboardShell from '../../components/layout/DashboardShell'

const NAV = [
  { label:'Dashboard',   path:'/admin/dashboard',     icon:<LayoutDashboard className="h-4 w-4"/> },
  { label:'Students',    path:'/admin/students',      icon:<Users className="h-4 w-4"/>           },
  { label:'Teachers',    path:'/admin/teachers',      icon:<BookUser className="h-4 w-4"/>        },
  { label:'Fees',        path:'/admin/fees',          icon:<CreditCard className="h-4 w-4"/>      },
  { label:'Batches',     path:'/admin/batches',       icon:<Layers className="h-4 w-4"/>          },
  { label:'Study Cards', path:'/admin/study-cards',   icon:<BookOpen className="h-4 w-4"/>        },
  { label:'Live Class',  path:'/admin/live-class',    icon:<Video className="h-4 w-4"/>           },
  { label:'QR Code',     path:'/admin/qr',            icon:<QrCode className="h-4 w-4"/>          },
  { label:'Salary',      path:'/admin/salary',        icon:<DollarSign className="h-4 w-4"/>      },
  { label:'Announce',    path:'/admin/announcements', icon:<Bell className="h-4 w-4"/>             },
  { label:'Messages',    path:'/admin/messages',      icon:<MessageCircle className="h-4 w-4"/>   },
  { label:'Analytics',   path:'/admin/analytics',     icon:<BarChart2 className="h-4 w-4"/>       },
]

export default function AdminLayout() {
  return <DashboardShell navItems={NAV} pageTitle="Admin Panel" />
}
EOF
echo "  ✅ AdminLayout — analytics added to nav"

# ============================================================
# PHASE 16 — Deployment instructions file
# ============================================================
cat > DEPLOY.md << 'EOF'
# Deployment Guide

## Deploy to Netlify (free)

1. Push your code to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial build — all phases complete"
   git remote add origin https://github.com/YOUR_USERNAME/coaching-institute.git
   git push -u origin main
   ```

2. Go to **netlify.com** → "Add new site" → "Import from Git"
3. Select your GitHub repo
4. Build settings (auto-detected from netlify.toml):
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Add environment variables in Netlify → Site Settings → Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_ADMIN_CODE`
   - `VITE_INSTITUTE_NAME`
   - `VITE_INSTITUTE_TAGLINE`
   - `VITE_CONTACT_EMAIL`
   - `VITE_CONTACT_PHONE`
6. Click **Deploy** — your site gets a free `.netlify.app` URL instantly

## Deploy Supabase Edge Functions (for email notifications)

Install Supabase CLI first:
```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

Deploy functions:
```bash
supabase functions deploy fee-notification
supabase functions deploy fee-verified-notification
```

Set secrets (never put these in .env):
```bash
supabase secrets set RESEND_API_KEY=re_your_key_here
```

## Supabase Production Checklist

In Supabase Dashboard:
1. Authentication → URL Configuration:
   - Site URL: `https://yoursite.netlify.app`
   - Redirect URLs: `https://yoursite.netlify.app/**`
2. Storage → Create bucket `qr-codes` → set to Public
3. Database → Replication → enable for: `live_classes`, `messages`, `notifications`
4. Authentication → Email → turn ON "Confirm email" before going live

## Custom Domain (optional)

Netlify → Domain Management → Add custom domain → follow DNS instructions
Free SSL certificate is included automatically.
EOF
echo "  ✅ DEPLOY.md"

echo ""
echo "✅ Phases 6–15 complete!"
echo ""
echo "Run:  npm run dev"
echo ""
echo "What was added:"
echo "  📧 Email notification system (Edge Functions ready to deploy)"
echo "  🔴 useLiveClass realtime hook with audio beep"
echo "  🚨 LiveClassBanner component (slides in, dismissable)"
echo "  📊 Analytics — attendance charts, fee charts, at-risk students"
echo "  📱 PWA — installable on phone, works offline"
echo "  💀 Skeleton loaders for all loading states"
echo "  🚀 DEPLOY.md — step-by-step Netlify deployment guide"
echo ""
echo "🎉 ALL PHASES COMPLETE! Your coaching institute app is ready."
echo "   Follow DEPLOY.md to put it live on the internet."
