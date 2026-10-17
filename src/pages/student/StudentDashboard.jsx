import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  ClipboardList,
  Bell,
  CreditCard,
  MessageCircle,
  CalendarCheck,
  CheckCircle,
  Clock,
  XCircle,
  X,
  Trash2,
  Video,
  ArrowRight,
  AlertCircle,
  Sparkles,
  GraduationCap,
  Flame,
  ChevronRight,
  ShieldCheck,
  HelpCircle,
  FileText,
  ExternalLink,
  Play,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { getYTThumb } from '../../utils/youtube'
import { checkBatchFeeStatus, BATCH_ACCESS_STATUS } from '../../utils/feeAccess'

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getTimeGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

const CACHE_KEY_PREFIX = 'student_dash_cache_v2_'

function getDashboardCache(userId) {
  if (!userId) return null
  try {
    const raw = localStorage.getItem(`${CACHE_KEY_PREFIX}${userId}`)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // Cache valid for 24 hours
    if (Date.now() - (parsed.timestamp || 0) < 1000 * 60 * 60 * 24) {
      return parsed.data
    }
    return null
  } catch (err) {
    console.debug('Dashboard cache read error:', err)
    return null
  }
}

function setDashboardCache(userId, data) {
  if (!userId) return
  try {
    localStorage.setItem(
      `${CACHE_KEY_PREFIX}${userId}`,
      JSON.stringify({ data, timestamp: Date.now() })
    )
  } catch (err) {
    console.debug('Dashboard cache write error:', err)
  }
}

function updateDashboardLiveCache(userId, liveClassData) {
  if (!userId) return
  try {
    const raw = localStorage.getItem(`${CACHE_KEY_PREFIX}${userId}`)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.data) {
        parsed.data.liveClassData = liveClassData
        if (parsed.data.stats) {
          parsed.data.stats.live = !!(liveClassData && liveClassData.is_active !== false)
        }
        parsed.timestamp = Date.now()
        localStorage.setItem(`${CACHE_KEY_PREFIX}${userId}`, JSON.stringify(parsed))
      }
    }
  } catch (err) {
    console.debug('Dashboard cache live update error:', err)
  }
}

function calculateStreak(attendanceRecords) {
  if (!attendanceRecords || attendanceRecords.length === 0) return 0
  const statusMap = {}
  attendanceRecords.forEach(r => {
    if (r.date && r.status) statusMap[r.date] = r.status
  })
  const today = todayISO()
  let streak = 0
  const [cy, cm, cd] = today.split('-').map(Number)
  const check = new Date(cy, cm - 1, cd)
  // If today isn't marked yet, test starting from yesterday so streak doesn't falsely reset before student marks today
  if (!statusMap[today]) {
    check.setDate(check.getDate() - 1)
  }
  while (true) {
    const ds = `${check.getFullYear()}-${String(check.getMonth() + 1).padStart(2, '0')}-${String(check.getDate()).padStart(2, '0')}`
    if (statusMap[ds] === 'present' || statusMap[ds] === 'late') {
      streak++
      check.setDate(check.getDate() - 1)
    } else {
      break
    }
  }
  return streak
}

// Circular SVG Attendance Progress Gauge
function AttendanceGauge({ percentage, size = 96, strokeWidth = 8 }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clampedPct = Math.min(100, Math.max(0, percentage || 0))
  const strokeDashoffset = circumference - (clampedPct / 100) * circumference

  let strokeColor = '#10b981' // emerald >= 75%
  if (clampedPct < 50) {
    strokeColor = '#f43f5e' // rose < 50%
  } else if (clampedPct < 75) {
    strokeColor = '#f59e0b' // amber < 75%
  }

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90 transform" viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="rgba(255, 255, 255, 0.12)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xl sm:text-2xl font-black font-display leading-none tracking-tight text-white">
          {clampedPct}<span className="text-xs font-semibold">%</span>
        </span>
        <span className="text-[10px] uppercase font-bold tracking-wider text-blue-200/80 mt-0.5">Rate</span>
      </div>
    </div>
  )
}

export default function StudentDashboard() {
  const { profile, user } = useAuth()

  // SWR: Synchronously read cached data if available for 0ms initial render
  const initialCache = useMemo(() => getDashboardCache(user?.id), [user?.id])

  const initialLiveActive = !!(initialCache?.liveClassData && initialCache.liveClassData.is_active !== false)

  const [stats, setStats] = useState(() => {
    const base = initialCache?.stats ?? {
      present: 0,
      absent: 0,
      late: 0,
      pending_fees: 0,
      unread: 0,
      live: false,
      streak: 0,
      pct: 0,
    }
    return {
      ...base,
      live: initialLiveActive,
    }
  })
  const [batchId, setBatchId] = useState(() => initialCache?.batchId ?? null)
  const [batchName, setBatchName] = useState(() => initialCache?.batchName ?? null)
  const [trialEndsAt, setTrialEndsAt] = useState(() => initialCache?.trialEndsAt ?? null)
  const [notifications, setNotifications] = useState(() => initialCache?.notifications ?? [])
  const [recentHomework, setRecentHomework] = useState(() => initialCache?.recentHomework ?? [])
  const [recentStudyCards, setRecentStudyCards] = useState(() => initialCache?.recentStudyCards ?? [])
  const [liveClassData, setLiveClassData] = useState(() => initialLiveActive ? initialCache.liveClassData : null)
  const [todayAttendance, setTodayAttendance] = useState(() => initialCache?.todayAttendance ?? null)
  const [batchFeeStatus, setBatchFeeStatus] = useState(null)

  // Only start in loading state if there is no cache
  const [loading, setLoading] = useState(() => !initialCache)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Interactive UI states
  const [showPopup, setShowPopup] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [marking, setMarking] = useState(null)
  const [clearing, setClearing] = useState(false)
  const [liveDismissed, setLiveDismissed] = useState(false)
  const [trialBannerDismissed, setTrialBannerDismissed] = useState(false)

  const requestIdRef = useRef(0)
  const batchIdRef = useRef(batchId)

  // Keep batchIdRef synchronized
  useEffect(() => {
    batchIdRef.current = batchId
  }, [batchId])

  // Dedicated, fast ~30ms direct live class query for instant synchronization
  const fetchLiveClassDirect = useCallback(async (explicitBatchId) => {
    if (!user?.id) return null
    const bId = explicitBatchId !== undefined ? explicitBatchId : batchIdRef.current
    try {
      let liveQ = supabase.from('live_classes')
        .select('id, title, platform, join_url, password, scheduled_at, is_active, batch_id, teacher_id, profiles!teacher_id(full_name)')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)

      if (bId) {
        liveQ = liveQ.or(`batch_id.is.null,batch_id.eq.${bId}`)
      } else {
        liveQ = liveQ.is('batch_id', null)
      }

      const { data, error } = await liveQ
      if (error) {
        console.warn('Error checking live class directly:', error)
        return null
      }

      const active = (data && data.length > 0 && data[0].is_active !== false) ? data[0] : null
      setLiveClassData(active)
      setStats(prev => (prev.live === !!active ? prev : { ...prev, live: !!active }))
      if (active) {
        setLiveDismissed(false)
      }
      updateDashboardLiveCache(user.id, active)
      return active
    } catch (err) {
      console.warn('Failed direct live class check:', err)
      return null
    }
  }, [user?.id])

  // ============================================================
  // Parallel Non-Blocking Data Loader with Cancellation Token
  // ============================================================
  const loadDashboardData = useCallback(async (isSilent = false) => {
    if (!user) return
    const uid = user.id
    const currentReqId = ++requestIdRef.current

    if (!isSilent && !initialCache) {
      setLoading(true)
    } else {
      setIsRefreshing(true)
    }

    try {
      const today = todayISO()

      // Primary phase: fetch student profile, fee records, and admin overrides in parallel
      const [attRes, feeRes, msgRes, spRes, overridesRes] = await Promise.allSettled([
        supabase.from('attendance').select('id, date, status').eq('student_id', uid).order('date', { ascending: false }).limit(60),
        supabase.from('fee_records').select('id, batch_id, amount, payment_month, fee_mode, valid_until, status, notes').eq('student_id', uid),
        supabase.from('messages').select('id', { count: 'exact', head: true }).eq('receiver_id', uid).eq('is_read', false),
        supabase.from('student_profiles').select('batch_id, trial_ends_at, batches(id, name, fee_mode, fee_amount, validity_days, validity_end_date)').eq('id', uid).maybeSingle(),
        supabase.from('admin_access_overrides').select('*').eq('student_id', uid),
      ])

      // Check if this request was superseded by another render or unmounted
      if (requestIdRef.current !== currentReqId) return

      let currentBatchId = batchIdRef.current
      let currentBatchName = batchName
      let currentTrialEnds = trialEndsAt
      let currentBatchObj = null

      if (spRes.status === 'fulfilled' && spRes.value?.data) {
        const spData = spRes.value.data
        currentBatchId = spData.batch_id ?? null
        currentBatchObj = spData.batches ?? null
        currentBatchName = spData.batches?.name ?? null
        currentTrialEnds = spData.trial_ends_at ?? null

        batchIdRef.current = currentBatchId
        setBatchId(currentBatchId)
        setBatchName(currentBatchName)
        setTrialEndsAt(currentTrialEnds)
      }

      // Calculate authoritative batch fee status
      const feeData = (feeRes.status === 'fulfilled' && feeRes.value?.data) ? feeRes.value.data : []
      const overrideData = (overridesRes.status === 'fulfilled' && overridesRes.value?.data) ? overridesRes.value.data : []
      const feeStatus = checkBatchFeeStatus({
        student: { id: uid, trial_ends_at: currentTrialEnds },
        batch: currentBatchObj,
        feeRecords: feeData,
        adminOverrides: overrideData,
      })
      setBatchFeeStatus(feeStatus)

      // Secondary phase: Batch-targeted notifications, live classes, homework & study materials
      const notifQ = supabase.from('notifications')
        .select('id, title, body, type, created_at, scheduled_at, expires_at, target_role, target_user_id, target_batch_id')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(20)

      let liveQ = supabase.from('live_classes')
        .select('id, title, platform, join_url, password, scheduled_at, teacher_id, profiles!teacher_id(full_name)')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
      if (currentBatchId) {
        liveQ = liveQ.or(`batch_id.is.null,batch_id.eq.${currentBatchId}`)
      } else {
        liveQ = liveQ.is('batch_id', null)
      }

      const hwQ = currentBatchId
        ? supabase.from('homework').select('id, title, due_date, created_at, description').eq('batch_id', currentBatchId).eq('is_active', true).order('created_at', { ascending: false }).limit(4)
        : Promise.resolve({ data: [] })

      const studyQ = currentBatchId
        ? supabase.from('study_cards').select('id, title, subject, type, created_at').or(`batch_ids.cs.{${currentBatchId}},batch_id.eq.${currentBatchId}`).eq('is_active', true).order('created_at', { ascending: false }).limit(4)
        : supabase.from('study_cards').select('id, title, subject, type, created_at').eq('is_public', true).eq('is_active', true).order('created_at', { ascending: false }).limit(4)

      const readsQ = supabase.from('notification_reads')
        .select('notification_id')
        .eq('user_id', uid)
        .order('read_at', { ascending: false })
        .limit(50)

      const [notifRes, readRes, liveRes, hwRes, studyRes] = await Promise.allSettled([
        notifQ,
        readsQ,
        liveQ,
        hwQ,
        studyQ,
      ])

      if (requestIdRef.current !== currentReqId) return

      // Extract & calculate attendance stats
      const attData = (attRes.status === 'fulfilled' && attRes.value?.data) ? attRes.value.data : []
      const presentCount = attData.filter(a => a.status === 'present').length
      const lateCount = attData.filter(a => a.status === 'late').length
      const absentCount = attData.filter(a => a.status === 'absent').length
      const totalCount = presentCount + lateCount + absentCount
      const attendancePct = totalCount > 0 ? Math.round(((presentCount + lateCount * 0.5) / totalCount) * 100) : 0
      const currentStreak = calculateStreak(attData)

      // Today's attendance status derived directly from attData (eliminating redundant HTTP query)
      const todayRow = attData.find(a => a.date === today) || null
      const todayStatus = todayRow ? todayRow.status : null
      setTodayAttendance(todayStatus)

      // Unread messages count
      const unreadCount = (msgRes.status === 'fulfilled' && typeof msgRes.value?.count === 'number') ? msgRes.value.count : 0

      // Active live class
      let activeLive = null
      if (liveRes.status === 'fulfilled' && liveRes.value?.data?.[0]) {
        activeLive = liveRes.value.data[0]
      }
      setLiveClassData(activeLive)
      if (activeLive) {
        setLiveDismissed(false)
      }

      // Notifications filtering
      const now = new Date()
      const readSet = new Set(
        (readRes.status === 'fulfilled' && readRes.value?.data) ? readRes.value.data.map(r => r.notification_id) : []
      )
      const rawNotifs = (notifRes.status === 'fulfilled' && notifRes.value?.data) ? notifRes.value.data : []
      const unreadNotifs = rawNotifs.filter(n => {
        if (readSet.has(n.id)) return false
        if (n.scheduled_at && new Date(n.scheduled_at) > now) return false
        if (n.expires_at && new Date(n.expires_at) < now) return false
        if (n.target_user_id && n.target_user_id !== uid) return false
        if (n.target_role !== 'all' && n.target_role !== 'student') return false
        if (n.target_batch_id && currentBatchId && n.target_batch_id !== currentBatchId) return false
        if (n.target_batch_id && !currentBatchId) return false
        return true
      }).slice(0, 5)
      setNotifications(unreadNotifs)

      // Homework & Study materials
      const hwData = (hwRes.status === 'fulfilled' && hwRes.value?.data) ? hwRes.value.data : []
      const studyData = (studyRes.status === 'fulfilled' && studyRes.value?.data) ? studyRes.value.data : []
      setRecentHomework(hwData)
      setRecentStudyCards(studyData)

      const updatedStats = {
        present: presentCount,
        late: lateCount,
        absent: absentCount,
        pending_fees: (feeStatus.isFrozen || feeStatus.inGracePeriod) ? 1 : 0,
        batchFeeStatus: feeStatus,
        unread: unreadCount,
        live: !!activeLive,
        streak: currentStreak,
        pct: attendancePct,
      }
      setStats(updatedStats)

      // Save to localStorage cache for 0ms paint on future visits
      setDashboardCache(uid, {
        stats: updatedStats,
        batchId: currentBatchId,
        batchName: currentBatchName,
        trialEndsAt: currentTrialEnds,
        notifications: unreadNotifs,
        recentHomework: hwData,
        recentStudyCards: studyData,
        liveClassData: activeLive,
        todayAttendance: todayStatus,
      })

      // If today's attendance has not been marked, trigger the attendance prompt modal
      if (!todayRow && !todayStatus) {
        setShowPopup(true)
      }
    } catch (err) {
      console.error('Failed to load student dashboard:', err)
    } finally {
      if (requestIdRef.current === currentReqId) {
        setLoading(false)
        setIsRefreshing(false)
      }
    }
  }, [user, initialCache, batchName, trialEndsAt])

  // Lifecycle effect: safely runs on mount/auth update with no persistent cancelledRef trap
  useEffect(() => {
    loadDashboardData()
  }, [user?.id, loadDashboardData])

  // ============================================================
  // Realtime synchronization via Supabase channels
  // ============================================================
  useEffect(() => {
    if (!user?.id) return
    const uid = user.id
    let isSubscribed = true

    // Targeted, isolated refetches to avoid 11-query thundering herd on every single table event
    const debounceTimers = {}
    const debounce = (key, fn, delay = 250) => {
      clearTimeout(debounceTimers[key])
      debounceTimers[key] = setTimeout(() => {
        if (isSubscribed) fn()
      }, delay)
    }

    const syncNotifications = () => debounce('notif', async () => {
      const curBatch = batchIdRef.current
      const now = new Date()
      const [{ data: rawNotifs }, { data: rawReads }] = await Promise.all([
        supabase.from('notifications')
          .select('id, title, body, type, created_at, scheduled_at, expires_at, target_role, target_user_id, target_batch_id')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase.from('notification_reads')
          .select('notification_id')
          .eq('user_id', uid)
          .order('read_at', { ascending: false })
          .limit(50),
      ])
      if (!isSubscribed) return
      const readSet = new Set((rawReads || []).map(r => r.notification_id))
      const unreadNotifs = (rawNotifs || []).filter(n => {
        if (readSet.has(n.id)) return false
        if (n.scheduled_at && new Date(n.scheduled_at) > now) return false
        if (n.expires_at && new Date(n.expires_at) < now) return false
        if (n.target_user_id && n.target_user_id !== uid) return false
        if (n.target_role !== 'all' && n.target_role !== 'student') return false
        if (n.target_batch_id && curBatch && n.target_batch_id !== curBatch) return false
        if (n.target_batch_id && !curBatch) return false
        return true
      }).slice(0, 5)
      setNotifications(unreadNotifs)
    })

    const syncHomework = () => debounce('hw', async () => {
      const curBatch = batchIdRef.current
      if (!curBatch) return
      const { data } = await supabase.from('homework')
        .select('id, title, due_date, created_at, description')
        .eq('batch_id', curBatch)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(4)
      if (isSubscribed && data) setRecentHomework(data)
    })

    const syncStudyCards = () => debounce('study', async () => {
      const curBatch = batchIdRef.current
      if (!curBatch) return
      const { data } = await supabase.from('study_cards')
        .select('id, title, subject, type, created_at')
        .or(`batch_ids.cs.{${curBatch}},batch_id.eq.${curBatch}`)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(4)
      if (isSubscribed && data) setRecentStudyCards(data)
    })

    const syncMessages = () => debounce('msg', async () => {
      const { count } = await supabase.from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('receiver_id', uid)
        .eq('is_read', false)
      if (isSubscribed && count !== null && count !== undefined) {
        setStats(s => ({ ...s, unread: count }))
      }
    })

    const syncFees = () => debounce('fees', async () => {
      const [feeR, spR, ovR] = await Promise.all([
        supabase.from('fee_records').select('id, batch_id, amount, payment_month, fee_mode, valid_until, status, notes').eq('student_id', uid),
        supabase.from('student_profiles').select('batch_id, trial_ends_at, batches(id, name, fee_mode, fee_amount, validity_days, validity_end_date)').eq('id', uid).maybeSingle(),
        supabase.from('admin_access_overrides').select('*').eq('student_id', uid),
      ])
      if (isSubscribed) {
        const fStatus = checkBatchFeeStatus({
          student: { id: uid, trial_ends_at: spR.data?.trial_ends_at },
          batch: spR.data?.batches || null,
          feeRecords: feeR.data ?? [],
          adminOverrides: ovR.data ?? [],
        })
        setBatchFeeStatus(fStatus)
        setStats(s => ({
          ...s,
          pending_fees: (fStatus.isFrozen || fStatus.inGracePeriod) ? 1 : 0,
          batchFeeStatus: fStatus,
        }))
      }
    })

    const syncAttendance = () => debounce('att', async () => {
      const today = todayISO()
      const { data } = await supabase.from('attendance')
        .select('id, date, status')
        .eq('student_id', uid)
        .order('date', { ascending: false })
        .limit(60)
      if (isSubscribed && data) {
        const todayRow = data.find(a => a.date === today)
        setTodayAttendance(todayRow?.status ?? null)
        const presentCount = data.filter(a => a.status === 'present').length
        const lateCount = data.filter(a => a.status === 'late').length
        const absentCount = data.filter(a => a.status === 'absent').length
        const total = presentCount + lateCount + absentCount
        const pct = total > 0 ? Math.round(((presentCount + lateCount * 0.5) / total) * 100) : 0
        const streak = calculateStreak(data)
        setStats(s => ({
          ...s,
          present: presentCount,
          late: lateCount,
          absent: absentCount,
          pct,
          streak,
        }))
      }
    })

    // Light 60s fallback heartbeat (WebSockets handle instant push updates)
    const liveHeartbeat = setInterval(() => {
      if (isSubscribed && document.visibilityState === 'visible') {
        fetchLiveClassDirect()
      }
    }, 60000)

    // Immediate sync on tab resume or window focus
    const onFocusSync = () => {
      if (document.visibilityState === 'visible' && isSubscribed) {
        fetchLiveClassDirect()
      }
    }
    document.addEventListener('visibilitychange', onFocusSync)
    window.addEventListener('focus', onFocusSync)

    const channel = supabase
      .channel(`student_dash_sync_${uid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_classes' }, (payload) => {
        if (!isSubscribed) return
        const { eventType, new: newRow } = payload || {}

        // Instant 0ms clear on class ended or deleted
        if (eventType === 'DELETE' || (newRow && newRow.is_active === false)) {
          setLiveClassData(null)
          setStats(s => ({ ...s, live: false }))
          updateDashboardLiveCache(uid, null)
          return
        }

        // Instant 0ms optimistic activate on class start
        if (newRow && newRow.is_active) {
          const curBatch = batchIdRef.current
          if (!newRow.batch_id || !curBatch || newRow.batch_id === curBatch) {
            setLiveDismissed(false)
            setStats(s => ({ ...s, live: true }))
            setLiveClassData(prev => ({ ...(prev || {}), ...newRow }))
            updateDashboardLiveCache(uid, newRow)
          }
        }

        // Follow up with direct lightweight query for complete relations (teacher full_name)
        fetchLiveClassDirect()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'homework' }, syncHomework)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'study_cards' }, syncStudyCards)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `receiver_id=eq.${uid}` }, syncMessages)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fee_records', filter: `student_id=eq.${uid}` }, syncFees)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_access_overrides', filter: `student_id=eq.${uid}` }, syncFees)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_profiles', filter: `id=eq.${uid}` }, syncFees)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance', filter: `student_id=eq.${uid}` }, syncAttendance)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, syncNotifications)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notification_reads', filter: `user_id=eq.${uid}` }, syncNotifications)
      .subscribe()

    return () => {
      isSubscribed = false
      Object.values(debounceTimers).forEach(clearTimeout)
      clearInterval(liveHeartbeat)
      document.removeEventListener('visibilitychange', onFocusSync)
      window.removeEventListener('focus', onFocusSync)
      supabase.removeChannel(channel)
    }
  }, [user?.id, loadDashboardData, fetchLiveClassDirect])

  // ============================================================
  // Attendance Marking Handler
  // ============================================================
  const markAttendance = async (status) => {
    setMarking(status)
    const today = todayISO()
    const { data, error } = await supabase.from('attendance').insert({
      student_id: user.id,
      date: today,
      status,
      marked_by: user.id,
    }).select().maybeSingle()

    if (error) {
      if (error.code === '23505') {
        toast.error('Attendance already marked for today.')
        setTodayAttendance(status)
      } else {
        toast.error(error.message)
      }
    } else {
      toast.success(`Marked as ${data.status}!`)
      setTodayAttendance(data.status)
      setStats(prev => {
        const newPresent = prev.present + (data.status === 'present' ? 1 : 0)
        const newLate = (prev.late || 0) + (data.status === 'late' ? 1 : 0)
        const newAbsent = prev.absent + (data.status === 'absent' ? 1 : 0)
        const total = newPresent + newLate + newAbsent
        const newPct = total > 0 ? Math.round(((newPresent + newLate * 0.5) / total) * 100) : 0
        const newStreak = (data.status === 'present' || data.status === 'late') ? (prev.streak || 0) + 1 : prev.streak

        const updated = {
          ...prev,
          present: newPresent,
          late: newLate,
          absent: newAbsent,
          pct: newPct,
          streak: newStreak,
        }
        setDashboardCache(user.id, {
          stats: updated,
          batchId,
          batchName,
          trialEndsAt,
          notifications,
          recentHomework,
          recentStudyCards,
          liveClassData,
          todayAttendance: data.status,
        })
        return updated
      })
    }

    setShowPopup(false)
    setConfirm(null)
    setMarking(null)
  }

  // ============================================================
  // Clear Notifications
  // ============================================================
  const clearNotifications = async () => {
    if (!notifications.length) return
    setClearing(true)
    const { error } = await supabase.from('notification_reads').upsert(
      notifications.map(n => ({ user_id: user.id, notification_id: n.id })),
      { onConflict: 'user_id,notification_id', ignoreDuplicates: true }
    )
    if (error) {
      toast.error(error.message)
      setClearing(false)
      return
    }
    setNotifications([])
    setClearing(false)
    toast.success('Announcements cleared')
  }

  const dateLabel = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  // 7 core quick navigation command hubs
  const quickLinks = [
    {
      label: 'Attendance',
      path: '/student/attendance',
      icon: <CalendarCheck className="h-5 w-5" />,
      accentBg: 'from-emerald-500/10 to-teal-500/10 border-emerald-500/20 text-emerald-600',
      iconBg: 'bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white',
      desc: loading ? 'Loading…' : `${stats.pct}% Attendance Rate`,
      badge: stats.streak > 0 ? `🔥 ${stats.streak}d Streak` : `${stats.present} Present`,
    },
    {
      label: 'Study Section',
      path: '/student/study',
      icon: <BookOpen className="h-5 w-5" />,
      accentBg: 'from-blue-500/10 to-cyan-500/10 border-blue-500/20 text-blue-600',
      iconBg: 'bg-blue-500/10 text-blue-600 group-hover:bg-blue-600 group-hover:text-white',
      desc: 'Lectures, Notes & Docs',
      badge: recentStudyCards.length > 0 ? `${recentStudyCards.length} New` : null,
    },
    {
      label: 'Homework',
      path: '/student/homework',
      icon: <ClipboardList className="h-5 w-5" />,
      accentBg: 'from-indigo-500/10 to-violet-500/10 border-indigo-500/20 text-indigo-600',
      iconBg: 'bg-indigo-500/10 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white',
      desc: 'Assignments & Tasks',
      badge: recentHomework.length > 0 ? `${recentHomework.length} Active` : 'Up to date',
    },
    {
      label: 'Live Class',
      path: '/student/live-class',
      icon: <Video className="h-5 w-5" />,
      accentBg: stats.live
        ? 'from-red-500/20 to-rose-500/20 border-red-500/40 text-red-600 ring-2 ring-red-500/20'
        : 'from-rose-500/10 to-pink-500/10 border-rose-500/20 text-rose-600',
      iconBg: stats.live
        ? 'bg-red-600 text-white shadow-lg shadow-red-500/30 animate-pulse'
        : 'bg-rose-500/10 text-rose-600 group-hover:bg-rose-600 group-hover:text-white',
      desc: loading ? 'Checking…' : stats.live ? 'Class in session' : 'Schedule & Link',
      badge: stats.live ? '🔴 LIVE NOW' : null,
      isLive: stats.live,
    },
    {
      label: 'Doubts Hub',
      path: '/student/doubts',
      icon: <HelpCircle className="h-5 w-5" />,
      accentBg: 'from-amber-500/10 to-orange-500/10 border-amber-500/20 text-amber-700',
      iconBg: 'bg-amber-500/10 text-amber-700 group-hover:bg-amber-600 group-hover:text-white',
      desc: 'Track & Manage Doubts',
      badge: null,
    },
    {
      label: 'Messages',
      path: '/student/messages',
      icon: <MessageCircle className="h-5 w-5" />,
      accentBg: 'from-purple-500/10 to-fuchsia-500/10 border-purple-500/20 text-purple-600',
      iconBg: 'bg-purple-500/10 text-purple-600 group-hover:bg-purple-600 group-hover:text-white',
      desc: 'Batch & Teacher Chat',
      badge: stats.unread > 0 ? `${stats.unread} Unread` : null,
    },
    {
      label: 'Pay Fee',
      path: `/student/pay-fee${batchId ? `?batch_id=${batchId}` : ''}`,
      icon: <CreditCard className="h-5 w-5" />,
      accentBg: batchFeeStatus?.isFrozen
        ? 'from-rose-500/20 to-red-500/20 border-rose-500/30 text-rose-700'
        : batchFeeStatus?.inGracePeriod
        ? 'from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-700'
        : 'from-emerald-500/10 to-teal-500/10 border-emerald-500/20 text-emerald-600',
      iconBg: batchFeeStatus?.isFrozen
        ? 'bg-rose-600 text-white shadow-sm'
        : batchFeeStatus?.inGracePeriod
        ? 'bg-amber-500 text-white shadow-sm'
        : 'bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white',
      desc: batchFeeStatus?.message || 'Tuition & Batch Fees',
      badge: batchFeeStatus?.isFrozen
        ? (batchFeeStatus.status === BATCH_ACCESS_STATUS.EXPIRED ? 'EXPIRED' : 'FROZEN')
        : batchFeeStatus?.inGracePeriod
        ? 'DUE'
        : batchFeeStatus?.status === BATCH_ACCESS_STATUS.TRIAL
        ? 'TRIAL'
        : 'Clear',
    },
    {
      label: 'Notifications',
      path: '/student/notifications',
      icon: <Bell className="h-5 w-5" />,
      accentBg: 'from-teal-500/10 to-emerald-500/10 border-teal-500/20 text-teal-600',
      iconBg: 'bg-teal-500/10 text-teal-600 group-hover:bg-teal-600 group-hover:text-white',
      desc: 'Notices & Circulars',
      badge: notifications.length > 0 ? `${notifications.length} New` : null,
    },
  ]

  return (
    <div className="space-y-5 sm:space-y-6 pb-24 lg:pb-8 max-w-7xl mx-auto w-full">

      {/* ── 1. Authoritative Batch Access & Fee Banner ── */}
      {(() => {
        if (loading || !batchFeeStatus) return null

        // 1. Pending Verification -> Provisional active access banner
        if (batchFeeStatus.isPendingVerification) {
          return (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-gradient-to-r from-sky-600 via-sky-700 to-blue-700 text-white p-3.5 sm:px-4 sm:py-3.5 shadow-md border border-sky-400/30"
            >
              {/* Mobile (< sm) */}
              <div className="sm:hidden space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                      <Clock className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-extrabold text-xs text-white truncate">
                      Payment Under Review
                    </span>
                  </div>
                  <span className="bg-white/20 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 border border-white/20">
                    Provisional Access
                  </span>
                </div>
                <p className="text-[11px] text-sky-100 leading-snug">
                  Your payment receipt is being verified by administration. All lectures, live classes, and homework remain fully unlocked.
                </p>
                <Link
                  to="/student/pay-fee"
                  className="inline-flex items-center justify-center gap-1.5 w-full py-1.5 bg-white/15 hover:bg-white/25 active:bg-white/30 text-white text-xs font-bold rounded-xl border border-white/20 transition-all shadow-xs"
                >
                  <span>View Status</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* Desktop / Tablet (>= sm) */}
              <div className="hidden sm:flex sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-white/20 shrink-0">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm leading-snug">Fee Payment Submitted · Under Review</p>
                      <span className="bg-sky-400/30 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border border-white/20">
                        Provisional Access
                      </span>
                    </div>
                    <p className="text-xs text-sky-100 mt-0.5 leading-tight">
                      Your payment receipt is being verified by administration. All lectures, live classes, and homework remain fully unlocked.
                    </p>
                  </div>
                </div>
                <Link
                  to="/student/pay-fee"
                  className="text-xs font-semibold bg-white/15 hover:bg-white/25 text-white px-3.5 py-2 rounded-xl border border-white/20 transition-colors shrink-0 shadow-xs"
                >
                  View Status
                </Link>
              </div>
            </motion.div>
          )
        }

        // 2. Rejected Payment -> Red alert with reason and resubmit CTA
        if (batchFeeStatus.status === BATCH_ACCESS_STATUS.REJECTED) {
          return (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 text-white p-4 shadow-lg border border-red-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-white/20 shrink-0">
                  <AlertCircle className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm leading-snug">Fee Payment Rejected</p>
                    <span className="bg-red-400/30 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">Action Required</span>
                  </div>
                  <p className="text-xs text-red-100 mt-0.5 leading-relaxed">
                    {batchFeeStatus.rejectedRecord?.notes
                      ? `Reason: ${batchFeeStatus.rejectedRecord.notes}. Please submit a corrected payment receipt to restore access.`
                      : 'Your fee payment submission was rejected by administration. Please submit a valid receipt or contact administration.'}
                  </p>
                </div>
              </div>
              <Link
                to={`/student/pay-fee?batch_id=${batchId || ''}&amount=${batchFeeStatus.feeAmount || ''}`}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white text-rose-700 hover:bg-rose-50 text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95 shrink-0"
              >
                <span>Resubmit Receipt</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </motion.div>
          )
        }

        // 3. Free Trial Active -> Amber trial countdown (dismissible)
        if (batchFeeStatus.status === BATCH_ACCESS_STATUS.TRIAL) {
          if (trialBannerDismissed) return null
          const timeLabel = batchFeeStatus.trialHoursLeft < 24
            ? `${batchFeeStatus.trialHoursLeft} hour${batchFeeStatus.trialHoursLeft !== 1 ? 's' : ''}`
            : `${Math.floor(batchFeeStatus.trialHoursLeft / 24)} day${Math.floor(batchFeeStatus.trialHoursLeft / 24) !== 1 ? 's' : ''}`

          return (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-gradient-to-r from-amber-500/95 to-orange-500/95 text-white px-4 py-3.5 shadow-md border border-amber-400/30 flex items-start sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-white/20 shrink-0">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm leading-snug">Free Trial Active — {timeLabel} remaining</p>
                  <p className="text-xs text-amber-100 mt-0.5 leading-tight">
                    Enjoy full access to your lectures, homework, and live batches.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTrialBannerDismissed(true)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-black/10 transition-colors shrink-0"
                title="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )
        }

        // 4. Free Trial Expired (Unpaid and frozen) -> Red banner with Pay CTA
        if (batchFeeStatus.status === BATCH_ACCESS_STATUS.TRIAL_EXPIRED) {
          return (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-gradient-to-r from-red-600/95 to-rose-700/95 text-white p-4 shadow-lg border border-red-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 backdrop-blur-md"
            >
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-white/20 shrink-0">
                  <AlertCircle className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm leading-snug">Your free trial has ended</p>
                  <p className="text-xs text-red-100 mt-0.5 leading-relaxed">
                    Your 2-day batch preview access has expired. Please complete your fee payment to unlock uninterrupted semester access.
                  </p>
                </div>
              </div>
              <Link
                to={`/student/pay-fee?batch_id=${batchId || ''}&amount=${batchFeeStatus.feeAmount || ''}`}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white text-rose-700 hover:bg-rose-50 text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95 shrink-0"
              >
                <span>Pay Batch Fee</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </motion.div>
          )
        }

        // 5. Monthly Grace Period Active (Days 1-10) -> Amber warning
        if (batchFeeStatus.inGracePeriod) {
          return (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50 border-amber-200/90 text-amber-950"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-xl shrink-0 bg-amber-200/70 text-amber-800">
                  <Clock className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-900">
                    MONTHLY TUITION FEE · GRACE PERIOD ACTIVE ({batchFeeStatus.daysRemainingInGrace}D REMAINING)
                  </span>
                  <p className="text-xs sm:text-sm font-bold mt-0.5 text-amber-950">
                    {batchFeeStatus.message}
                  </p>
                </div>
              </div>
              <Link
                to={`/student/pay-fee?batch_id=${batchId || ''}&amount=${batchFeeStatus.feeAmount || ''}`}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-white text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95 shrink-0 bg-amber-600 hover:bg-amber-700"
              >
                <span>Pay Monthly Fee</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </motion.div>
          )
        }

        // 6. Frozen (Day 11+ monthly or one-time expired)
        if (batchFeeStatus.isFrozen) {
          return (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-rose-50 border-rose-200/90 text-rose-950"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-xl shrink-0 bg-rose-200/70 text-rose-800">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-200/80 text-rose-900">
                    {batchFeeStatus.status === BATCH_ACCESS_STATUS.EXPIRED ? 'SUBSCRIPTION EXPIRED' : 'BATCH ACCESS FROZEN'}
                  </span>
                  <p className="text-xs sm:text-sm font-bold mt-0.5 text-rose-950">
                    {batchFeeStatus.message}
                  </p>
                </div>
              </div>
              <Link
                to={`/student/pay-fee?batch_id=${batchId || ''}&amount=${batchFeeStatus.feeAmount || ''}`}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-white text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95 shrink-0 bg-rose-600 hover:bg-rose-700"
              >
                <span>Pay Fee to Restore Access</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </motion.div>
          )
        }

        return null
      })()}

      {/* ── 2. Live Class High-Urgency Broadcast Alert Bar ── */}
      {liveClassData && !liveDismissed && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 p-4 sm:p-5 text-white shadow-xl shadow-red-500/15 border border-red-400/30"
        >
          <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
              <div className="relative p-2.5 sm:p-3 bg-white/20 rounded-2xl text-white shrink-0 shadow-inner">
                <Video className="h-6 w-6" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400" />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-white/25 text-white px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    LIVE BROADCAST NOW
                  </span>
                  {liveClassData.platform && (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-black/20 text-white/90 px-2 py-0.5 rounded-full">
                      {liveClassData.platform}
                    </span>
                  )}
                </div>
                <h3 className="text-base sm:text-lg font-extrabold text-white leading-tight truncate">
                  {liveClassData.title || 'Interactive Live Class'}
                </h3>
                {liveClassData.profiles?.full_name && (
                  <p className="text-xs text-red-100 font-medium mt-0.5">
                    Faculty: {liveClassData.profiles.full_name}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 sm:shrink-0 w-full sm:w-auto">
              <Link
                to="/student/live-class"
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-red-700 text-xs sm:text-sm font-extrabold rounded-xl hover:bg-red-50 hover:shadow-lg transition-all active:scale-95 shadow-md"
              >
                <span>Join Classroom Now</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                onClick={() => setLiveDismissed(true)}
                className="p-2.5 text-white/70 hover:text-white rounded-xl bg-black/10 hover:bg-black/20 transition-colors"
                title="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}


      {/* ── 4. High-Impact Student Command Hero Deck ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-6 sm:p-8 text-white shadow-xl shadow-blue-950/20 border border-white/10">
        {/* Subtle background ambient orbs */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-1/4 w-60 h-60 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 sm:gap-8">

          {/* Left Column: Greeting, Student identity, Batch tag, and streak */}
          <div className="space-y-3 sm:space-y-4 max-w-xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-blue-200 text-xs font-medium backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                {getTimeGreeting()},
              </span>

              {batchName ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-bold backdrop-blur-md">
                  <GraduationCap className="h-3.5 w-3.5 text-indigo-300" />
                  {batchName}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold backdrop-blur-md">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  Active Student
                </span>
              )}

              {stats.streak > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-400/40 text-amber-300 text-xs font-black backdrop-blur-md shadow-sm">
                  <Flame className="h-3.5 w-3.5 text-orange-400 fill-orange-400" />
                  {stats.streak}d Streak!
                </div>
              )}
            </div>

            <div className="space-y-1">
              <h1 className="font-display font-black text-2xl sm:text-3xl lg:text-4xl text-white tracking-tight leading-tight">
                {profile?.full_name || 'Enrolled Student'}
              </h1>
              <p className="text-xs sm:text-sm text-blue-200/80 leading-relaxed">
                {dateLabel} • Coaching Institute Academic Portal
              </p>
            </div>

            {/* Attendance Status & Inline 1-Click Action */}
            <div className="pt-1 flex items-center gap-3 flex-wrap">
              {todayAttendance ? (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-semibold backdrop-blur-md">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  <span>Today marked as <strong className="capitalize text-white">{todayAttendance}</strong></span>
                </div>
              ) : (
                <button
                  onClick={() => setShowPopup(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs sm:text-sm font-black shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 active:scale-95 transition-all"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-900 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-950" />
                  </span>
                  <span>Mark Today&apos;s Attendance</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}

              {isRefreshing && (
                <span className="text-[11px] text-blue-300/70 flex items-center gap-1.5 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  Syncing live records…
                </span>
              )}
            </div>
          </div>

          {/* Right Column: Attendance Radial Gauge & Stats Cluster */}
          <div className="flex items-center gap-5 sm:gap-6 bg-white/[0.07] backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-5 shrink-0 justify-between sm:justify-start">
            <AttendanceGauge percentage={stats.pct} size={92} strokeWidth={8} />

            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                <span className="text-blue-100 font-medium">Present:</span>
                <span className="font-bold text-white ml-auto">{stats.present}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50" />
                <span className="text-blue-100 font-medium">Late:</span>
                <span className="font-bold text-white ml-auto">{stats.late || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-sm shadow-rose-400/50" />
                <span className="text-blue-100 font-medium">Absent:</span>
                <span className="font-bold text-white ml-auto">{stats.absent}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── 5. Responsive Command Matrix (The 7 Core Hubs) ── */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <span>Navigation Hub</span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span className="text-xs font-normal text-slate-400 capitalize">Quick Actions</span>
          </h2>
        </div>

        {/* Device-optimized grid: 2 cols on mobile, 4 cols on tablet, 7 cols on desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-3.5">
          {quickLinks.map(q => {
            return (
              <Link
                key={q.path}
                to={q.path}
                className={`group relative rounded-2xl bg-white border border-slate-100 hover:border-slate-300/80 p-3.5 sm:p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/50 flex flex-col justify-between min-h-[120px] ${
                  q.isLive ? 'ring-2 ring-red-500/30 border-red-200 bg-red-50/20' : ''
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-2.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${q.iconBg}`}>
                      {q.icon}
                    </div>
                    {q.badge && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full leading-tight shrink-0 ${
                        q.isLive
                          ? 'bg-red-600 text-white animate-pulse font-black'
                          : q.badge.includes('Due') || q.badge.includes('DUE')
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {q.badge}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-blue-950 transition-colors truncate">
                    {q.label}
                  </h3>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-1 group-hover:text-slate-700 transition-colors">
                  {q.desc}
                </p>
              </Link>
            )
          })}
        </div>
      </div>

      {/* ── 6. Main Adaptive Multi-Column Learning & Activity Deck ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">

        {/* ── Left / Primary Column (7 cols on lg+) ── */}
        <div className="lg:col-span-7 space-y-5 sm:space-y-6">

          {/* 📝 Active Assignments & Homework Widget */}
          <div className="rounded-3xl bg-white border border-slate-100 p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                  <ClipboardList className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">Active Assignments</h3>
                  <p className="text-[11px] text-slate-400">Classwork, homework & submissions</p>
                </div>
              </div>
              <Link
                to="/student/homework"
                className="text-xs font-bold text-indigo-700 hover:text-indigo-900 hover:underline inline-flex items-center gap-1 group"
              >
                <span>View all</span>
                <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            <div className="mt-4">
              {loading && !initialCache ? (
                <div className="space-y-2.5">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-14 bg-slate-100 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : recentHomework.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-400 mx-auto flex items-center justify-center">
                    <ClipboardList className="h-6 w-6" />
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-slate-700">No active homework assigned currently</p>
                  <p className="text-xs text-slate-400">You are completely caught up with your batch coursework!</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {recentHomework.map(hw => {
                    const isOverdue = hw.due_date ? new Date(hw.due_date) < new Date(todayISO()) : false
                    return (
                      <Link
                        key={hw.id}
                        to={`/student/homework?id=${hw.id}`}
                        className="p-3.5 bg-slate-50/80 hover:bg-indigo-50/70 border border-slate-100 hover:border-indigo-200/80 rounded-2xl flex items-center justify-between gap-3 transition-all duration-150 group cursor-pointer"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-[10px] font-extrabold uppercase tracking-wide text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-md">
                              Coursework
                            </span>
                            {isOverdue && (
                              <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 border border-rose-200/60 px-1.5 py-0.5 rounded-md">
                                Overdue
                              </span>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-indigo-950 truncate">
                            {hw.title}
                          </p>
                        </div>

                        {hw.due_date && (
                          <div className="shrink-0 text-right">
                            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-xl border flex items-center gap-1 transition-all ${
                              isOverdue
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-white text-slate-600 border-slate-200/80 group-hover:border-indigo-300'
                            }`}>
                              <Clock className="h-3 w-3" />
                              <span>Due {new Date(hw.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                            </span>
                          </div>
                        )}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 📚 Recent Batch Materials Widget */}
          <div className="rounded-3xl bg-white border border-slate-100 p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-blue-50 text-blue-700 rounded-xl">
                  <BookOpen className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">Recent Batch Materials</h3>
                  <p className="text-[11px] text-slate-400">Class lectures, notes & downloadable resources</p>
                </div>
              </div>
              <Link
                to="/student/study"
                className="text-xs font-bold text-blue-700 hover:text-blue-900 hover:underline inline-flex items-center gap-1 group"
              >
                <span>View all</span>
                <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            <div className="mt-4">
              {loading && !initialCache ? (
                <div className="space-y-2.5">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-14 bg-slate-100 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : recentStudyCards.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-400 mx-auto flex items-center justify-center">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-slate-700">No study cards uploaded for your batch yet</p>
                  <p className="text-xs text-slate-400">Check back soon or explore the main Study section for public lectures.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {recentStudyCards.map(sc => {
                    const thumb = sc.thumbnail_url || getYTThumb(sc.url)
                    const isVideo = sc.type === 'youtube_video' || sc.type === 'youtube_playlist'
                    const isNotes = sc.type === 'google_drive'

                    return (
                      <Link
                        key={sc.id}
                        to={`/student/study?subject=${encodeURIComponent(sc.subject || '')}&cardId=${sc.id}`}
                        className="p-2.5 sm:p-3 bg-white hover:bg-slate-50/90 border border-slate-200/80 hover:border-blue-300 rounded-2xl flex items-center gap-3 transition-all duration-200 shadow-2xs hover:shadow-sm group cursor-pointer"
                      >
                        {/* 1. Left Media Visual Anchor */}
                        <div className="w-14 sm:w-16 h-11 sm:h-12 rounded-xl bg-slate-950 shrink-0 overflow-hidden relative flex items-center justify-center border border-slate-200/60 shadow-2xs">
                          {thumb ? (
                            <img src={thumb} alt={sc.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          ) : isNotes ? (
                            <div className="w-full h-full bg-gradient-to-br from-amber-100 to-yellow-200 flex items-center justify-center">
                              <FileText className="h-5 w-5 text-amber-700" />
                            </div>
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-blue-900 to-slate-900 flex items-center justify-center">
                              <Video className="h-5 w-5 text-blue-300" />
                            </div>
                          )}
                          {isVideo && (
                            <div className="absolute inset-0 bg-black/35 group-hover:bg-black/20 flex items-center justify-center transition-colors">
                              <div className="w-5 h-5 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-slate-900 group-hover:bg-red-600 group-hover:text-white transition-colors shadow-2xs">
                                <Play className="h-2.5 w-2.5 fill-current ml-0.5" />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 2. Title & Subject Meta */}
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[9.5px] font-bold text-blue-700 bg-blue-50 border border-blue-200/60 px-2 py-0.2 rounded-full inline-block">
                              {sc.subject || 'General'}
                            </span>
                            {sc.is_featured && (
                              <span className="text-[8.5px] font-extrabold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded-full border border-amber-200/60 uppercase">
                                Featured
                              </span>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-blue-600 truncate transition-colors">
                            {sc.title}
                          </p>
                        </div>

                        {/* 3. Action Indicator Badge */}
                        <div className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100/80 group-hover:bg-blue-50 group-hover:text-blue-700 border border-slate-200/70 group-hover:border-blue-200 px-2.5 py-1 rounded-xl transition-all">
                          {isVideo ? (
                            <>
                              <Video className="h-3 w-3 text-red-500" />
                              <span className="hidden xs:inline">Watch</span>
                            </>
                          ) : isNotes ? (
                            <>
                              <FileText className="h-3 w-3 text-amber-500" />
                              <span className="hidden xs:inline">Notes</span>
                            </>
                          ) : (
                            <>
                              <ExternalLink className="h-3 w-3 text-blue-500" />
                              <span className="hidden xs:inline">Link</span>
                            </>
                          )}
                          <ArrowRight className="h-3 w-3 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* ── Right / Secondary Column (5 cols on lg+) ── */}
        <div className="lg:col-span-5 space-y-5 sm:space-y-6">

          {/* 📅 Attendance Summary & Streak Card */}
          <div className="rounded-3xl bg-white border border-slate-100 p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                  <CalendarCheck className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">Attendance Record</h3>
                  <p className="text-[11px] text-slate-400">Streak, consistency & status</p>
                </div>
              </div>
              <Link
                to="/student/attendance"
                className="text-xs font-bold text-emerald-700 hover:text-emerald-900 hover:underline inline-flex items-center gap-1 group"
              >
                <span>Full log</span>
                <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            <div className="mt-4 space-y-4">
              {/* Streak callout */}
              <div className="rounded-2xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-yellow-500/10 border border-orange-200/60 p-4 flex items-center gap-3.5">
                <span className="text-3xl">🔥</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black uppercase tracking-wider text-orange-800">Study Streak</p>
                    <span className="text-base font-black text-orange-950 font-display">
                      {stats.streak} {stats.streak === 1 ? 'Day' : 'Days'}
                    </span>
                  </div>
                  <p className="text-[11px] text-orange-700/90 mt-0.5 leading-snug">
                    {stats.streak >= 5
                      ? 'Incredible momentum! Keep marking attendance.'
                      : stats.streak > 0
                      ? 'Great consistency. Light up your streak every day!'
                      : 'Mark attendance daily to build an unstoppable study habit.'}
                  </p>
                </div>
              </div>

              {/* Action trigger button */}
              {!todayAttendance ? (
                <button
                  onClick={() => setShowPopup(true)}
                  className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
                >
                  <CalendarCheck className="h-4 w-4 text-amber-400" />
                  <span>Mark Today&apos;s Attendance</span>
                </button>
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-medium">Today&apos;s Status:</span>
                  <span className="font-extrabold capitalize text-emerald-700 bg-emerald-100/60 px-2.5 py-0.5 rounded-lg">
                    ✓ {todayAttendance}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 📢 Announcements & Notice Board */}
          <div className="rounded-3xl bg-white border border-slate-100 p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-teal-50 text-teal-700 rounded-xl">
                  <Bell className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">Notice Board</h3>
                  <p className="text-[11px] text-slate-400">Official circulars & announcements</p>
                </div>
              </div>
              {notifications.length > 0 && (
                <button
                  onClick={clearNotifications}
                  disabled={clearing}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-800 inline-flex items-center gap-1 disabled:opacity-50"
                  title="Mark all as read"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>{clearing ? 'Clearing…' : 'Clear'}</span>
                </button>
              )}
            </div>

            <div className="mt-4">
              {notifications.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 mx-auto flex items-center justify-center">
                    <Bell className="h-5 w-5" />
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-slate-700">No unread announcements</p>
                  <p className="text-xs text-slate-400">All caught up! Check the notifications section for full history.</p>
                  <Link
                    to="/student/notifications"
                    className="inline-block mt-2 text-xs font-bold text-teal-700 hover:underline"
                  >
                    View notice history →
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map(n => (
                    <div
                      key={n.id}
                      className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100 space-y-1 hover:bg-slate-100/70 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">{n.title}</h4>
                        {n.created_at && (
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {new Date(n.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line line-clamp-3">
                        {n.body}
                      </p>
                    </div>
                  ))}
                  <div className="pt-2 text-center">
                    <Link
                      to="/student/notifications"
                      className="text-xs font-bold text-teal-700 hover:underline inline-flex items-center gap-1"
                    >
                      <span>Open full announcements archive</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* ── 7. Redesigned Framer Motion Attendance Marking Modal ── */}
      <AnimatePresence>
        {showPopup && !loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Glass Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPopup(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
            />

            {/* Modal Dialog Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 sm:p-8 z-10 border border-slate-100"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowPopup(false)}
                className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Modal Header */}
              <div className="flex items-center gap-3.5 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-950 shadow-inner">
                  <CalendarCheck className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 font-display">
                    Mark Today&apos;s Attendance
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500">{dateLabel}</p>
                </div>
              </div>

              {/* Modal Body: Selection vs Confirmation */}
              <div>
                {confirm ? (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-center space-y-4"
                  >
                    <p className="text-sm font-medium text-slate-800">
                      Confirm marking yourself as{' '}
                      <span className={`capitalize font-black px-2 py-0.5 rounded-lg text-white ${
                        confirm === 'present' ? 'bg-emerald-600' : confirm === 'late' ? 'bg-amber-500' : 'bg-rose-600'
                      }`}>
                        {confirm}
                      </span>{' '}
                      for today?
                    </p>
                    <div className="flex gap-3 justify-center pt-2">
                      <button
                        onClick={() => markAttendance(confirm)}
                        disabled={!!marking}
                        className="px-6 py-2.5 bg-blue-950 hover:bg-blue-900 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md disabled:opacity-50 active:scale-95"
                      >
                        {marking ? 'Saving Record…' : 'Yes, Confirm'}
                      </button>
                      <button
                        onClick={() => setConfirm(null)}
                        className="px-5 py-2.5 border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm rounded-xl transition-all"
                      >
                        Back
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <div className="grid grid-cols-3 gap-3 sm:gap-4">
                    <button
                      onClick={() => setConfirm('present')}
                      className="flex flex-col items-center justify-center gap-2 p-4 sm:p-5 bg-emerald-50 hover:bg-emerald-100/80 border-2 border-emerald-200 text-emerald-800 rounded-2xl font-bold text-xs sm:text-sm transition-all hover:-translate-y-1 hover:shadow-md"
                    >
                      <CheckCircle className="h-7 w-7 text-emerald-600" />
                      <span>Present</span>
                    </button>
                    <button
                      onClick={() => setConfirm('late')}
                      className="flex flex-col items-center justify-center gap-2 p-4 sm:p-5 bg-amber-50 hover:bg-amber-100/80 border-2 border-amber-200 text-amber-800 rounded-2xl font-bold text-xs sm:text-sm transition-all hover:-translate-y-1 hover:shadow-md"
                    >
                      <Clock className="h-7 w-7 text-amber-600" />
                      <span>Late</span>
                    </button>
                    <button
                      onClick={() => setConfirm('absent')}
                      className="flex flex-col items-center justify-center gap-2 p-4 sm:p-5 bg-rose-50 hover:bg-rose-100/80 border-2 border-rose-200 text-rose-800 rounded-2xl font-bold text-xs sm:text-sm transition-all hover:-translate-y-1 hover:shadow-md"
                    >
                      <XCircle className="h-7 w-7 text-rose-600" />
                      <span>Absent</span>
                    </button>
                  </div>
                )}
              </div>

              <p className="text-center text-[11px] text-slate-400 mt-6">
                You can review or view full monthly trends from the Attendance section anytime.
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
