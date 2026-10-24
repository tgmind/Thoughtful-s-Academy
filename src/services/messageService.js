import { supabase } from '../lib/supabase'

const CLEANUP_STORAGE_KEY = 'ta_messages_last_cleanup_timestamp'
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Toggle keep/starred status for a single message.
 * Kept messages are exempt from the 3-month automatic purge.
 */
export async function toggleKeepMessage(messageId, keep, userId = null) {
  if (!messageId) return { error: new Error('Missing messageId') }

  try {
    // Primary path: high-performance atomic SECURITY DEFINER RPC
    const { data, error } = await supabase.rpc('toggle_keep_messages', {
      p_message_ids: [messageId],
      p_keep: keep,
    })

    if (!error && data && data.length > 0) {
      return { data: data[0], error: null }
    }

    // Resilient fallback: direct update on public.messages
    const updatePayload = {
      is_starred: Boolean(keep),
      starred_at: keep ? new Date().toISOString() : null,
      starred_by: keep ? userId : null,
    }

    const res = await supabase
      .from('messages')
      .update(updatePayload)
      .eq('id', messageId)
      .select()
      .maybeSingle()

    return res
  } catch (err) {
    return { error: err }
  }
}

/**
 * Bulk toggle keep/starred status for multiple messages at once.
 */
export async function toggleBulkKeepMessages(messageIds, keep, userId = null) {
  if (!Array.isArray(messageIds) || messageIds.length === 0) {
    return { data: [], error: null }
  }

  try {
    // Primary path: atomic RPC
    const { data, error } = await supabase.rpc('toggle_keep_messages', {
      p_message_ids: messageIds,
      p_keep: keep,
    })

    if (!error && Array.isArray(data)) {
      return { data, error: null }
    }

    // Resilient fallback
    const updatePayload = {
      is_starred: Boolean(keep),
      starred_at: keep ? new Date().toISOString() : null,
      starred_by: keep ? userId : null,
    }

    const res = await supabase
      .from('messages')
      .update(updatePayload)
      .in('id', messageIds)
      .select()

    return res
  } catch (err) {
    return { error: err }
  }
}

/**
 * Opportunistic Automatic Database Retention Cleaner.
 * Ensures the database stays completely clean without requiring manual intervention,
 * serving as a seamless dual-defense alongside PostgreSQL pg_cron.
 */
export async function triggerOpportunisticCleanup() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return

    const lastRun = window.localStorage.getItem(CLEANUP_STORAGE_KEY)
    const now = Date.now()
    if (lastRun && now - Number(lastRun) < CLEANUP_INTERVAL_MS) {
      return // Throttled to once every 24h per client
    }

    // Record attempt timestamp to prevent redundant calls
    window.localStorage.setItem(CLEANUP_STORAGE_KEY, String(now))

    // Call background RPC
    supabase
      .rpc('clean_expired_messages')
      .then(({ data, error }) => {
        if (!error && typeof data === 'number' && data > 0) {
          console.info(`[Messages Retention] Cleaned ${data} expired messages older than 90 days.`)
        }
      })
      .catch(() => {
        // Silent catch: background cleanup should never disrupt active UI
      })
  } catch {
    // Ignored
  }
}

/**
 * Calculate remaining days before an unstarred message expires.
 */
export function getMessageExpirationInfo(createdAt, isStarred = false) {
  if (isStarred) {
    return { isExpired: false, isStarred: true, daysRemaining: Infinity }
  }

  const createdTime = new Date(createdAt).getTime()
  if (Number.isNaN(createdTime)) {
    return { isExpired: false, isStarred: false, daysRemaining: 90 }
  }

  const msElapsed = Date.now() - createdTime
  const daysElapsed = Math.floor(msElapsed / (1000 * 60 * 60 * 24))
  const daysRemaining = Math.max(0, 90 - daysElapsed)

  return {
    isExpired: daysElapsed >= 90,
    isStarred: false,
    daysElapsed,
    daysRemaining,
  }
}
