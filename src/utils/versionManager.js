/**
 * Client-Side Instant Version & PWA Update Manager
 *
 * Ensures users always run the latest deployed version without disruption or logout.
 * - Compares running version (__APP_BUILD_TIME__) against live /version.json
 * - Checks automatically on visibilitychange (tab switch/wake) and window focus
 * - Throttles network checks to avoid overhead, but supports forced immediate checks on page load
 * - Never clears localStorage/session tokens so user auth is 100% preserved
 */

export function getCurrentAppVersion() {
  if (typeof __APP_BUILD_TIME__ !== 'undefined' && __APP_BUILD_TIME__) {
    return __APP_BUILD_TIME__
  }
  return 'dev'
}

let lastCheckTime = 0
const THROTTLE_MS = 25 * 1000 // At most once every 25 seconds for background checks

let currentUpdateInfo = null
const updateListeners = new Set()

export function getUpdateInfo() {
  return currentUpdateInfo
}

export function subscribeToUpdates(listener) {
  updateListeners.add(listener)
  if (currentUpdateInfo) {
    listener(currentUpdateInfo)
  }
  return () => updateListeners.delete(listener)
}

export function resetUpdateStateForTesting() {
  currentUpdateInfo = null
  updateListeners.clear()
  lastCheckTime = 0
}

export function notifyUpdateAvailable(info = {}) {
  const payload = { updateAvailable: true, ...info }
  currentUpdateInfo = payload
  updateListeners.forEach((fn) => {
    try {
      fn(payload)
    } catch (e) {
      console.debug('Update listener error:', e)
    }
  })

  if (typeof window !== 'undefined') {
    const event = new CustomEvent('app-new-version-available', { detail: payload })
    window.dispatchEvent(event)
  }
}

export async function checkRemoteVersion(options = {}) {
  const { force = false } = options
  const current = getCurrentAppVersion()
  if (current === 'dev' && !force) {
    return { updateAvailable: false, currentVersion: 'dev', remoteVersion: 'dev' }
  }

  const now = Date.now()
  if (!force && now - lastCheckTime < THROTTLE_MS) {
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
    if (data && data.version && (current === 'dev' ? false : data.version !== current)) {
      // Trigger Service Worker update check in parallel
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then(reg => {
          if (reg) reg.update().catch(() => {})
        }).catch(() => {})
      }

      const info = {
        updateAvailable: true,
        currentVersion: current,
        remoteVersion: data.version,
        builtAt: data.builtAt || null,
      }
      notifyUpdateAvailable(info)
      return info
    }

    return { updateAvailable: false, currentVersion: current, remoteVersion: data?.version }
  } catch (err) {
    return { updateAvailable: false, error: err.message }
  }
}

export async function applyAppUpdate() {
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('pwa_update_snoozed')
      sessionStorage.removeItem('pwa_snoozed_version')
    }

    // Clear stale HTML cache in CacheStorage so fresh index.html is fetched
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter(k => k.includes('html') || k.includes('app-html') || k.includes('workbox-precache'))
          .map(k => caches.delete(k))
      )
    }

    // Tell waiting service worker to skipWaiting
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration()
      if (reg && reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' })
      }
    }
  } catch (e) {
    console.debug('Error cleaning caches during update:', e)
  }

  // Hard reload from network to pull fresh bundle
  if (typeof window !== 'undefined') {
    window.location.reload()
  }
}

export function initVersionWatcher() {
  if (typeof window === 'undefined') return () => {}

  // 1. INSTANT CHECK UPON PAGE LOAD (Zero delay so user never sees stale UI)
  checkRemoteVersion({ force: true }).catch(() => {})

  // 2. Hook into Service Worker registration for instant update detection
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration().then(reg => {
      if (!reg) return

      // If an updated worker is already waiting in background
      if (reg.waiting && navigator.serviceWorker.controller) {
        notifyUpdateAvailable({
          updateAvailable: true,
          source: 'serviceWorkerWaiting',
          remoteVersion: 'live',
        })
      }

      // Check for updates on page load
      reg.update().catch(() => {})

      // Listen for newly installed updates
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              notifyUpdateAvailable({
                updateAvailable: true,
                source: 'serviceWorkerInstalled',
                remoteVersion: 'live',
              })
            }
          })
        }
      })
    }).catch(() => {})
  }

  // 3. Check immediately when tab becomes visible or gains focus
  const handleVisibilityOrFocus = async () => {
    if (document.visibilityState === 'visible') {
      await checkRemoteVersion()
    }
  }

  // 4. Periodic check every 60 seconds
  const intervalId = setInterval(async () => {
    await checkRemoteVersion()
  }, 60 * 1000)

  document.addEventListener('visibilitychange', handleVisibilityOrFocus)
  window.addEventListener('focus', handleVisibilityOrFocus)

  return () => {
    clearInterval(intervalId)
    document.removeEventListener('visibilitychange', handleVisibilityOrFocus)
    window.removeEventListener('focus', handleVisibilityOrFocus)
  }
}
