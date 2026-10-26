import { supabase } from '../lib/supabase'
import { getDriveImageUrls } from '../utils/formatters'

const CACHE_KEY = 'graviton_running_batches_cache_v1'

// Default active batch bootstrap seed ensuring instant 0ms initial render even on cold first-time visits
export const BOOTSTRAP_BATCHES = [
  {
    id: '7273c358-9f50-480f-b050-42c4d7df1fae',
    name: 'Class 9 Marathon',
    poster_url: 'https://drive.google.com/file/d/1H8JG5dBuFEcBezY2_R2Y6hPKRnqjRG6-/view?usp=sharing',
    is_active: true,
  },
]

/**
 * Synchronously retrieves cached running cohorts from localStorage.
 * Always returns an array (falls back to BOOTSTRAP_BATCHES so cards appear immediately).
 */
export function getCachedRunningBatches() {
  if (typeof window === 'undefined') return BOOTSTRAP_BATCHES
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch {
    // Ignore localStorage parsing errors
  }
  return BOOTSTRAP_BATCHES
}

/**
 * Preloads a batch poster into the browser's HTTP/memory cache in the background.
 */
export function preloadBatchPoster(posterUrl) {
  if (!posterUrl || typeof window === 'undefined') return
  try {
    const candidates = getDriveImageUrls(posterUrl, { width: 700 })
    if (candidates && candidates[0]) {
      const img = new Image()
      img.decoding = 'async'
      img.src = candidates[0]
    }
  } catch {
    // Ignore preload errors
  }
}

/**
 * Asynchronously fetches fresh running cohorts from Supabase, updates local cache,
 * and preloads images. Follows Stale-While-Revalidate (SWR).
 */
export async function fetchRunningBatches() {
  try {
    const { data, error } = await supabase
      .from('batches')
      .select('id, name, poster_url, is_active')
      .eq('is_active', true)
      .order('name')

    if (error || !data) {
      return getCachedRunningBatches()
    }

    const activeBatches = data.filter(b => b && b.is_active !== false)
    
    // Save to persistent storage for instant load on subsequent visits
    if (typeof window !== 'undefined' && activeBatches.length > 0) {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(activeBatches))
      } catch {
        // Storage quota / privacy protection safe
      }
    }

    // Preload poster images for all cohorts
    activeBatches.forEach(b => {
      if (b.poster_url?.trim()) {
        preloadBatchPoster(b.poster_url.trim())
      }
    })

    return activeBatches
  } catch {
    return getCachedRunningBatches()
  }
}

/**
 * Subscribes to Supabase Realtime changes on the 'batches' table.
 * Automatically revalidates and notifies callback when admin adds, edits, or removes cohorts.
 */
export function subscribeToBatchUpdates(onUpdate) {
  if (!supabase || typeof supabase.channel !== 'function') {
    return () => {}
  }

  try {
    const channel = supabase
      .channel('running_batches_realtime_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'batches' },
        async () => {
          const fresh = await fetchRunningBatches()
          if (onUpdate && typeof onUpdate === 'function') {
            onUpdate(fresh)
          }
        }
      )
      .subscribe()

    return () => {
      try {
        supabase.removeChannel(channel)
      } catch {
        // Safe cleanup
      }
    }
  } catch {
    return () => {}
  }
}
