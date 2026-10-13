/**
 * Centralized YouTube Utilities & Streaming Resilience Engine
 * Parses, validates, and manages YouTube video & playlist URLs,
 * multi-tier playlist hydration, playback progress, and metadata.
 */

const PLAYLIST_ID_REGEX = /^[\w-]+$/

/**
 * Validates whether a string is a well-formed YouTube playlist ID.
 * @param {string} listId
 * @returns {boolean}
 */
export function isValidPlaylistId(listId) {
  if (!listId || typeof listId !== 'string') return false
  const trimmed = listId.trim()
  return trimmed.length >= 2 && PLAYLIST_ID_REGEX.test(trimmed)
}

/**
 * Extracts and strictly validates the YouTube playlist ID from any URL format.
 * Matches standard playlist URLs, video+playlist links, mobile URLs, embed URLs,
 * and direct raw playlist IDs.
 *
 * @param {string} url
 * @returns {string|null} Validated playlist ID or null if not valid
 */
export function getYTPlaylistId(url) {
  if (!url || typeof url !== 'string') return null
  const cleanUrl = url.trim()

  // 1. Direct raw playlist ID pasted
  if (/^(?:PL|UU|FL|RD|OLAK5uy_)[A-Za-z0-9_-]{2,}$/.test(cleanUrl)) {
    return cleanUrl
  }

  // 2. Extract entire list query parameter value (up to &, #, space, or end)
  const match = cleanUrl.match(/[?&]list=([^&#\s]+)/)
  const candidate = match?.[1] ?? null

  if (candidate && isValidPlaylistId(candidate)) {
    return candidate
  }

  return null
}

/**
 * Extracts YouTube video ID (11 characters) from any YouTube URL or thumbnail URL.
 * Handles standard watch, embed, shorts, live, youtu.be, and vi/ thumbnail URLs.
 * Also properly matches IDs that begin with hyphens or underscores (e.g. -sWDY2jc9nM).
 *
 * @param {string} url
 * @returns {string|null} Video ID or null
 */
export function getYTVideoId(url) {
  if (!url || typeof url !== 'string') return null
  const cleanUrl = url.trim()

  // Direct raw 11-char video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(cleanUrl)) return cleanUrl

  // Matches youtu.be/, ?v=, &v=, embed/, shorts/, live/, or vi/ followed by 11 chars
  const match = cleanUrl.match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/|live\/|vi\/)([a-zA-Z0-9_-]{11})/)
  return match?.[1] ?? null
}

/**
 * Derives YouTube HQ thumbnail URL from a video URL or a raw video ID.
 *
 * @param {string} urlOrId
 * @returns {string|null}
 */
export function getYTThumb(urlOrId) {
  if (!urlOrId) return null
  const videoId = getYTVideoId(urlOrId)
  return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null
}

/**
 * Synchronously resolves media details (playlist vs video) from a URL and optional fallback thumbnail/type.
 *
 * @param {string} url
 * @param {string} [fallbackThumb]
 * @param {string} [explicitType]
 * @returns {{ isPlaylist: boolean, playlistId: string|null, videoId: string|null }}
 */
export function resolveYouTubeMedia(url, fallbackThumb = '', explicitType = '') {
  const playlistId = getYTPlaylistId(url)
  let videoId = getYTVideoId(url)
  if (!videoId && fallbackThumb) {
    videoId = getYTVideoId(fallbackThumb)
  }
  const isPlaylist = !!playlistId || explicitType === 'youtube_playlist'
  return {
    isPlaylist,
    playlistId: playlistId || null,
    videoId: videoId || null,
  }
}

/**
 * Fetches official YouTube oEmbed metadata.
 * YouTube oEmbed is officially CORS-enabled (Access-Control-Allow-Origin: *).
 *
 * @param {string} url
 * @returns {Promise<any|null>}
 */
export async function fetchYouTubeOEmbed(url) {
  if (!url) return null
  try {
    const targetUrl = url.startsWith('http') ? url : `https://www.youtube.com/watch?v=${url}`
    const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(targetUrl)}&format=json`)
    if (res.ok) {
      return await res.json()
    }
  } catch {
    // Graceful fallback
  }
  return null
}

// ─── Local Storage Playlist Cache (24-Hour Expiration) ───────────────────────
const PLAYLIST_CACHE_PREFIX = 'yt_playlist_cache_'
const PLAYLIST_CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

function getCachedPlaylist(listId) {
  try {
    const raw = localStorage.getItem(`${PLAYLIST_CACHE_PREFIX}${listId}`)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Date.now() - parsed.timestamp < PLAYLIST_CACHE_TTL_MS && Array.isArray(parsed.items) && parsed.items.length > 0) {
      return parsed.items
    }
  } catch {
    // Ignore cache read errors
  }
  return null
}

function setCachedPlaylist(listId, items) {
  try {
    if (listId && Array.isArray(items) && items.length > 0) {
      localStorage.setItem(
        `${PLAYLIST_CACHE_PREFIX}${listId}`,
        JSON.stringify({ timestamp: Date.now(), items })
      )
    }
  } catch {
    // Ignore quota errors
  }
}

/**
 * Parses YouTube Atom/RSS XML into a normalized array of lecture items.
 * @param {string} xmlText
 * @returns {Array<{ index: number, videoId: string, title: string, thumb: string }>}
 */
export function parseYouTubePlaylistXml(xmlText) {
  if (!xmlText || typeof xmlText !== 'string') return []

  // 1. Try DOMParser (namespace-resilient using getElementsByTagName)
  try {
    if (typeof DOMParser !== 'undefined') {
      const xml = new DOMParser().parseFromString(xmlText, 'text/xml')
      let entries = Array.from(xml.getElementsByTagName('entry'))
      if (entries.length === 0) {
        entries = Array.from(xml.querySelectorAll('entry'))
      }
      if (entries.length > 0) {
        const items = entries.map((entry, idx) => {
          const videoId =
            entry.getElementsByTagName('yt:videoId')[0]?.textContent ||
            entry.getElementsByTagName('videoId')[0]?.textContent ||
            entry.querySelector('videoId')?.textContent ||
            entry.querySelector('id')?.textContent?.replace('yt:video:', '') ||
            ''
          const rawTitle =
            entry.getElementsByTagName('title')[0]?.textContent ||
            entry.querySelector('title')?.textContent ||
            `Lecture #${idx + 1}`
          const thumbEl =
            entry.getElementsByTagName('media:thumbnail')[0] ||
            entry.querySelector('thumbnail')
          const thumb =
            thumbEl?.getAttribute('url') ||
            (videoId ? `https://i.ytimg.com/vi/${videoId.trim()}/hqdefault.jpg` : '')
          return {
            index: idx,
            videoId: videoId.trim(),
            title: rawTitle.trim(),
            thumb,
          }
        }).filter(item => item.videoId)

        if (items.length > 0) return items
      }
    }
  } catch (err) {
    console.warn('DOMParser failed, falling back to regex:', err)
  }

  // 2. High-reliability Regex Parser (failsafe fallback)
  try {
    const entryBlocks = [...xmlText.matchAll(/<entry>([\s\S]*?)<\/entry>/g)]
    if (entryBlocks.length > 0) {
      return entryBlocks.map((match, idx) => {
        const content = match[1]
        const videoId =
          content.match(/<yt:videoId>(.*?)<\/yt:videoId>/)?.[1] ||
          content.match(/<id>yt:video:(.*?)<\/id>/)?.[1] ||
          ''
        const titleMatch =
          content.match(/<title>(.*?)<\/title>/)?.[1] ||
          content.match(/<media:title>(.*?)<\/media:title>/)?.[1] ||
          `Lecture #${idx + 1}`
        const thumbMatch = content.match(/<media:thumbnail[^>]+url="([^"]+)"/)?.[1]
        return {
          index: idx,
          videoId: videoId.trim(),
          title: titleMatch.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim(),
          thumb: thumbMatch || (videoId ? `https://i.ytimg.com/vi/${videoId.trim()}/hqdefault.jpg` : ''),
        }
      }).filter(item => item.videoId)
    }
  } catch (err) {
    console.warn('Regex XML parser error:', err)
  }

  return []
}

/**
 * Multi-Tier Zero-Failure Playlist Hydration Engine
 * Tier 1: LocalStorage Cache (0ms)
 * Tier 2: Server-Side `/api/youtube-playlist` endpoint (<200ms) by listId
 * Tier 3: Automatic Server-Side videoId playlist discovery (when listId is omitted from URL)
 * Tier 4: Official YouTube CORS oEmbed metadata & resilient baseline item
 *
 * @param {string|null} listId
 * @param {string|null} [firstVideoId]
 * @param {string|null} [fallbackTitle]
 * @returns {Promise<Array<{ index: number, videoId: string, title: string, thumb: string }> & { discoveredListId?: string }>}
 */
export async function fetchPlaylistItems(listId, firstVideoId = null, fallbackTitle = null) {
  // If listId provided, check Tier 1 cache
  if (listId && isValidPlaylistId(listId)) {
    const cached = getCachedPlaylist(listId)
    if (cached && cached.length > 0) {
      return cached
    }

    // Tier 2: Dedicated Server-Side Endpoint by listId
    try {
      const res = await fetch(`/api/youtube-playlist?listId=${encodeURIComponent(listId)}`)
      if (res.ok) {
        const xml = await res.text()
        const items = parseYouTubePlaylistXml(xml)
        if (items.length > 0) {
          setCachedPlaylist(listId, items)
          return items
        }
      }
    } catch {
      // Proceed to fallback
    }
  }

  // Tier 3: If listId was missing/invalid but firstVideoId exists, discover parent playlist
  if (firstVideoId) {
    try {
      const res = await fetch(`/api/youtube-playlist?videoId=${encodeURIComponent(firstVideoId)}`)
      if (res.ok) {
        let discoveredId = res.headers.get('X-Discovered-Playlist-Id')
        const xml = await res.text()
        if (!discoveredId) {
          discoveredId =
            xml.match(/<yt:playlistId>(.*?)<\/yt:playlistId>/)?.[1] ||
            xml.match(/playlist_id=([a-zA-Z0-9_-]+)/)?.[1] ||
            null
        }
        const items = parseYouTubePlaylistXml(xml)
        if (items.length > 0) {
          if (discoveredId) {
            setCachedPlaylist(discoveredId, items)
            items.discoveredListId = discoveredId
          }
          return items
        }
      }
    } catch {
      // Proceed to fallback
    }

    // Fallback single video representation
    return [{
      index: 0,
      videoId: firstVideoId,
      title: fallbackTitle || 'Lecture #1',
      thumb: `https://i.ytimg.com/vi/${firstVideoId}/hqdefault.jpg`,
    }]
  }

  // Tier 4: Fallback oEmbed exploration if listId existed
  if (listId) {
    try {
      const oembed = await fetchYouTubeOEmbed(`https://www.youtube.com/playlist?list=${listId}`)
      if (oembed?.thumbnail_url) {
        const discoveredVid = getYTVideoId(oembed.thumbnail_url)
        if (discoveredVid) {
          return [{
            index: 0,
            videoId: discoveredVid,
            title: oembed.title || fallbackTitle || 'Lecture #1',
            thumb: oembed.thumbnail_url,
          }]
        }
      }
    } catch {
      // Ignore
    }
  }

  return []
}

// ─── Playback Progress & Completion Tracking ────────────────────────────────
const PROGRESS_KEY_PREFIX = 'lecture_prog_'

/**
 * Saves playback timestamp and completion status for a video.
 * @param {string} videoId
 * @param {number} currentTime
 * @param {number} duration
 */
export function saveLectureProgress(videoId, currentTime, duration) {
  if (!videoId || duration <= 0) return
  try {
    const completed = currentTime / duration >= 0.9 // marked completed if >= 90% watched
    localStorage.setItem(
      `${PROGRESS_KEY_PREFIX}${videoId}`,
      JSON.stringify({
        time: Math.floor(currentTime),
        duration: Math.floor(duration),
        updatedAt: Date.now(),
        completed,
      })
    )
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Retrieves saved playback progress for a video.
 * @param {string} videoId
 * @returns {{ time: number, duration: number, completed: boolean }|null}
 */
export function getLectureProgress(videoId) {
  if (!videoId) return null
  try {
    const raw = localStorage.getItem(`${PROGRESS_KEY_PREFIX}${videoId}`)
    if (raw) return JSON.parse(raw)
  } catch {
    // Ignore error
  }
  return null
}
