import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Video, ShieldAlert, CreditCard } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { checkBatchFeeStatus } from '../../utils/feeAccess'
import LiveClassBanner from '../../components/shared/LiveClassBanner'

export default function StudentLiveClass() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [liveClass, setLiveClass] = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [batchFeeStatus, setBatchFeeStatus] = useState(null)
  // Keep batchId in a ref so the realtime callback always has the latest value
  const batchIdRef = useRef(null)

  useEffect(() => {
    if (!user) return
    let unmounted = false
    let channel = null

    const fetchLive = async () => {
      let q = supabase
        .from('live_classes')
        .select('*, profiles!teacher_id(full_name)')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
      // Only show all-batch classes, plus the student's own batch. A student
      // with no batch must NOT see batch-restricted classes.
      if (batchIdRef.current) q = q.or(`batch_id.is.null,batch_id.eq.${batchIdRef.current}`)
      else                    q = q.is('batch_id', null)
      const { data } = await q
      if (!unmounted) {
        setLiveClass(data?.[0] ?? null)
        setLoading(false)
      }
    }

    const init = async () => {
      try {
        const [spRes, feeRes, ovRes] = await Promise.all([
          supabase
            .from('student_profiles')
            .select('batch_id, trial_ends_at, batches(id, name, fee_mode, fee_amount, validity_days, validity_end_date)')
            .eq('id', user.id)
            .maybeSingle(),
          supabase
            .from('fee_records')
            .select('id, batch_id, amount, payment_month, fee_mode, valid_until, status')
            .eq('student_id', user.id),
          supabase
            .from('admin_access_overrides')
            .select('*')
            .eq('student_id', user.id)
        ])

        const sp = spRes.data
        batchIdRef.current = sp?.batch_id ?? null

        if (sp?.batches) {
          const status = checkBatchFeeStatus({
            student: { id: user.id, trial_ends_at: sp.trial_ends_at },
            batch: sp.batches,
            feeRecords: feeRes.data ?? [],
            adminOverrides: ovRes.data ?? []
          })
          setBatchFeeStatus(status)
        }

        if (unmounted) return

        await fetchLive()
        if (unmounted) return

        channel = supabase
          .channel(`lc_student_page_${user.id}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'live_classes' },
            (payload) => {
              if (unmounted) return
              // Class ended or deleted: clear immediately — no DB round-trip needed
              if (
                payload.eventType === 'DELETE' ||
                (payload.eventType === 'UPDATE' && !payload.new?.is_active)
              ) {
                setLiveClass(null)
              } else if (payload.new && payload.new.is_active) {
                const bId = batchIdRef.current
                if (!payload.new.batch_id || !bId || payload.new.batch_id === bId) {
                  setLiveClass(prev => ({ ...(prev || {}), ...payload.new }))
                }
                fetchLive()
              } else {
                fetchLive()
              }
            }
          )
          .on('postgres_changes', { event: '*', schema: 'public', table: 'fee_records', filter: `student_id=eq.${user.id}` },
            () => {
              if (!unmounted) init()
            }
          )
          .subscribe()
      } catch {
        if (!unmounted) setLoading(false)
      }
    }

    // 60s fallback heartbeat (WebSockets handle instant push updates)
    const pollInterval = setInterval(() => {
      if (!unmounted && document.visibilityState === 'visible') fetchLive()
    }, 60000)

    const onVisible = () => {
      if (document.visibilityState === 'visible' && !unmounted) {
        fetchLive()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)

    init()
    return () => {
      unmounted = true
      clearInterval(pollInterval)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
      if (channel) supabase.removeChannel(channel)
    }
  }, [user])

  if (loading) {
    return (
      <div className="space-y-6 pb-20 lg:pb-0 max-w-2xl animate-pulse">
        <div className="h-6 w-32 bg-slate-200 rounded-lg" />
        <div className="h-44 bg-slate-200/80 rounded-3xl w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0 max-w-2xl">
      <h2 className="font-bold text-lg text-gray-900">Live Class</h2>

      {liveClass ? (
        liveClass.batch_id && batchFeeStatus?.isFrozen ? (
          <div className="bg-white rounded-2xl border border-rose-200 p-6 sm:p-8 shadow-sm text-center">
            <div className="inline-flex p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 mb-3 shadow-sm">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <h3 className="font-bold text-gray-900 text-base mb-1">
              Live Batch Class in Session
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mb-5 leading-relaxed">
              A live class for your batch is currently active, but your batch access is paused due to pending fees. Clear your dues to join immediately.
            </p>
            <button
              onClick={() => navigate('/student/pay-fee')}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-md inline-flex items-center gap-2 cursor-pointer"
            >
              <CreditCard className="h-4 w-4" /> Pay Fee to Join Live Class
            </button>
          </div>
        ) : (
          <LiveClassBanner liveClass={liveClass} />
        )
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-2xl border border-gray-100">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Video className="h-7 w-7 text-gray-300" />
          </div>
          <h3 className="font-bold text-gray-600 text-lg mb-1">No Live Class Right Now</h3>
          <p className="text-sm text-gray-400 max-w-xs">
            When your teacher starts a live class, the join link will appear here instantly.
          </p>
        </div>
      )}
    </div>
  )
}
