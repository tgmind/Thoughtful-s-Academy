/**
 * youtubeApiLoader.js
 *
 * Singleton loader for the YouTube IFrame Player API.
 * Ensures https://www.youtube.com/iframe_api is requested only once across
 * the application, avoids duplicate script tags, prevents conflicting global
 * callbacks, and safely handles timeouts and errors.
 */

let apiPromise = null
const SCRIPT_ID = 'youtube-iframe-api-singleton'
const TIMEOUT_MS = 12000

export function loadYouTubeApi() {
  // If API is already fully available on window
  if (typeof window !== 'undefined' && window.YT && window.YT.Player) {
    return Promise.resolve(window.YT)
  }

  // If already loading or previously resolved, return cached promise
  if (apiPromise) {
    return apiPromise
  }

  apiPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('YouTube API cannot be loaded in non-browser environment'))
    }

    let timeoutId = null
    let pollIntervalId = null

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId)
      if (pollIntervalId) clearInterval(pollIntervalId)
    }

    // Set timeout to prevent indefinitely hanging state
    timeoutId = setTimeout(() => {
      cleanup()
      apiPromise = null // Allow retry on subsequent calls
      reject(new Error('Timed out waiting for YouTube IFrame API to load'))
    }, TIMEOUT_MS)

    const checkReady = () => {
      if (typeof window === 'undefined') {
        cleanup()
        return false
      }
      if (window.YT && window.YT.Player) {
        cleanup()
        resolve(window.YT)
        return true
      }
      return false
    }

    if (checkReady()) return

    // Poll every 100ms as a fallback for browser edge-cases where the global callback doesn't fire
    pollIntervalId = setInterval(() => {
      if (typeof window === 'undefined') {
        cleanup()
        return
      }
      checkReady()
    }, 100)

    // Chain existing window.onYouTubeIframeAPIReady callback if another script defined it
    const prevCallback = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prevCallback === 'function') {
        try { prevCallback() } catch (err) { console.warn('Previous YT callback error:', err) }
      }
      checkReady()
    }

    // Inject the script tag if not already in document
    let scriptTag = document.getElementById(SCRIPT_ID)
    if (!scriptTag) {
      scriptTag = document.createElement('script')
      scriptTag.id = SCRIPT_ID
      scriptTag.src = 'https://www.youtube.com/iframe_api'
      scriptTag.async = true
      scriptTag.onerror = () => {
        cleanup()
        apiPromise = null
        reject(new Error('Network error loading YouTube IFrame API script'))
      }

      const firstScript = document.getElementsByTagName('script')[0]
      if (firstScript && firstScript.parentNode) {
        firstScript.parentNode.insertBefore(scriptTag, firstScript)
      } else {
        document.head.appendChild(scriptTag)
      }
    }
  })

  return apiPromise
}
