/**
 * Client-Side Instant Version & PWA Update Manager
 *
 * Ensures users always run the latest deployed version without disruption or logout.
 * - Compares running version (__APP_BUILD_TIME__) against live /version.json
 * - Checks automatically on visibilitychange (tab switch/wake) and window focus
 * - Throttles network checks to avoid overhead
 * - Never clears localStorage/session tokens so user auth is 100% preserved
 */

export function getCurrentAppVersion() {
  if (typeof __APP_BUILD_TIME__ !== 'undefined' && __APP_BUILD_TIME__) {
    return __APP_BUILD_TIME__
  }
  return 'dev'
}

let lastCheckTime = 0
const THROTTLE_MS = 25 * 1000 // At most once every 25 seconds

export async function checkRemoteVersion() {
  const current = getCurrentAppVersion()
  if (current === 'dev') {
    return { updateAvailable: false, currentVersion: 'dev', remoteVersion: 'dev' }
  }

  const now = Date.now()
  if (now - lastCheckTime < THROTTLE_MS) {
    return { updateAvailable: false, throttled: true }
  }
  lastCheckTime = now

  try {
    const res = await fetch(`/version.json?_t=${now}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
    })

    if (!res.ok) {
      return { updateAvailable: false, error: `HTTP ${res.status}` }
    }

    const data = await res.json()
    if (data && data.version && data.version !== current) {
      // Trigger Service Worker update check in parallel
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then(reg => {
          if (reg) reg.update().catch(() => {})
        }).catch(() => {})
      }

      return {
        updateAvailable: true,
        currentVersion: current,
        remoteVersion: data.version,
        builtAt: data.builtAt || null,
      }
    }

    return { updateAvailable: false, currentVersion: current, remoteVersion: data?.version }
  } catch (err) {
    return { updateAvailable: false, error: err.message }
  }
}

export function notifyUpdateAvailable(info) {
  if (typeof window === 'undefined') return
  const event = new CustomEvent('app-new-version-available', { detail: info })
  window.dispatchEvent(event)
}

export function initVersionWatcher() {
  if (typeof window === 'undefined') return () => {}

  // Initial check after page stabilizes
  const initialTimer = setTimeout(async () => {
    const result = await checkRemoteVersion()
    if (result.updateAvailable) {
      notifyUpdateAvailable(result)
    }
  }, 4000)

  // Check on tab focus / wake
  const handleVisibilityOrFocus = async () => {
    if (document.visibilityState === 'visible') {
      const result = await checkRemoteVersion()
      if (result.updateAvailable) {
        notifyUpdateAvailable(result)
      }
    }
  }

  // Periodic interval (every 3 minutes)
  const intervalId = setInterval(async () => {
    const result = await checkRemoteVersion()
    if (result.updateAvailable) {
      notifyUpdateAvailable(result)
    }
  }, 3 * 60 * 1000)

  document.addEventListener('visibilitychange', handleVisibilityOrFocus)
  window.addEventListener('focus', handleVisibilityOrFocus)

  return () => {
    clearTimeout(initialTimer)
    clearInterval(intervalId)
    document.removeEventListener('visibilitychange', handleVisibilityOrFocus)
    window.removeEventListener('focus', handleVisibilityOrFocus)
  }
}
