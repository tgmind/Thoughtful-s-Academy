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
    } else {
      // No batch → only all-batch classes (never batch-restricted ones).
      query = query.is('batch_id', null)
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
