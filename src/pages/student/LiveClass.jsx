import { useState, useEffect, useRef } from 'react'
import { Video } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import LiveClassBanner from '../../components/shared/LiveClassBanner'

export default function StudentLiveClass() {
  const { user } = useAuth()
  const [liveClass, setLiveClass] = useState(null)
  const [loading,   setLoading]   = useState(true)
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
        const { data: sp } = await supabase
          .from('student_profiles').select('batch_id').eq('id', user.id).maybeSingle()
        batchIdRef.current = sp?.batch_id ?? null
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
        <LiveClassBanner liveClass={liveClass} />
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
