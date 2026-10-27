import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { LANDING_SLOTS } from '../utils/imageOptimizer'

/**
 * useLandingMedia Hook
 * Provides reactive media assets for the public landing page with zero-delay
 * local defaults and Supabase realtime synchronization.
 */
export function useLandingMedia() {
  const [mediaMap, setMediaMap] = useState(() => {
    // Synchronous initial fallback state ensures zero flash of missing images
    const initial = {}
    Object.keys(LANDING_SLOTS).forEach((slotId) => {
      const def = LANDING_SLOTS[slotId]
      initial[slotId] = {
        slot_id: slotId,
        title: def.title,
        desktop_url: def.defaultUrls.desktop,
        tablet_url: def.defaultUrls.tablet,
        mobile_url: def.defaultUrls.mobile,
        object_position: def.defaultObjectPosition,
        alt_text: def.defaultAlt,
        aspect_ratio: def.aspectRatio,
        is_custom: false,
      }
    })
    return initial
  })

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const fetchMedia = async () => {
      try {
        const { data, error } = await supabase
          .from('landing_media')
          .select('*')

        if (error) {
          console.warn('Could not fetch custom landing media, using local defaults:', error.message)
          if (!cancelled) setLoading(false)
          return
        }

        if (data && data.length > 0 && !cancelled) {
          setMediaMap((prev) => {
            const next = { ...prev }
            data.forEach((row) => {
              if (row && row.slot_id) {
                next[row.slot_id] = {
                  ...prev[row.slot_id],
                  ...row,
                  // Ensure fallbacks if specific fields are empty
                  desktop_url: row.desktop_url || prev[row.slot_id]?.desktop_url,
                  tablet_url: row.tablet_url || row.desktop_url || prev[row.slot_id]?.tablet_url,
                  mobile_url: row.mobile_url || row.desktop_url || prev[row.slot_id]?.mobile_url,
                  object_position: row.object_position || prev[row.slot_id]?.object_position,
                }
              }
            })
            return next
          })
        }
      } catch (err) {
        console.warn('Landing media query failed:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchMedia()

    // Realtime channel updates when Admin publishes new images or resets
    const channelId = `landing_media_${Math.random().toString(36).slice(2, 9)}`
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'landing_media' },
        (payload) => {
          if (payload.eventType === 'DELETE' && payload.old?.slot_id) {
            const slotId = payload.old.slot_id
            const def = LANDING_SLOTS[slotId]
            if (def) {
              setMediaMap((prev) => ({
                ...prev,
                [slotId]: {
                  slot_id: slotId,
                  title: def.title,
                  desktop_url: def.defaultUrls.desktop,
                  tablet_url: def.defaultUrls.tablet,
                  mobile_url: def.defaultUrls.mobile,
                  object_position: def.defaultObjectPosition,
                  alt_text: def.defaultAlt,
                  aspect_ratio: def.aspectRatio,
                  is_custom: false,
                },
              }))
            }
            return
          }

          if (payload.new && payload.new.slot_id) {
            const slotId = payload.new.slot_id
            const def = LANDING_SLOTS[slotId]
            const isCustom = payload.new.is_custom

            setMediaMap((prev) => ({
              ...prev,
              [slotId]: {
                ...prev[slotId],
                ...payload.new,
                desktop_url: isCustom
                  ? (payload.new.desktop_url || prev[slotId]?.desktop_url)
                  : (def?.defaultUrls.desktop || payload.new.desktop_url),
                tablet_url: isCustom
                  ? (payload.new.tablet_url || payload.new.desktop_url || prev[slotId]?.tablet_url)
                  : (def?.defaultUrls.tablet || payload.new.tablet_url),
                mobile_url: isCustom
                  ? (payload.new.mobile_url || payload.new.desktop_url || prev[slotId]?.mobile_url)
                  : (def?.defaultUrls.mobile || payload.new.mobile_url),
                object_position: payload.new.object_position || prev[slotId]?.object_position || def?.defaultObjectPosition,
              },
            }))
          }
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [])

  const getSlot = (slotId) => {
    if (mediaMap[slotId]) return mediaMap[slotId]
    const def = LANDING_SLOTS[slotId]
    if (def) {
      return {
        slot_id: slotId,
        title: def.title,
        desktop_url: def.defaultUrls.desktop,
        tablet_url: def.defaultUrls.tablet,
        mobile_url: def.defaultUrls.mobile,
        object_position: def.defaultObjectPosition,
        alt_text: def.defaultAlt,
        aspect_ratio: def.aspectRatio,
        is_custom: false,
      }
    }
    return null
  }

  return {
    mediaMap,
    getSlot,
    loading,
  }
}
