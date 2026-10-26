// ============================================================
// src/utils/formatters.js
// ============================================================

// ---- YouTube helpers ----------------------------------------

export function getYouTubeVideoId(url) {
  if (!url) return null
  const match = url.match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/|live\/)([^#&?/]{11})/)
  return match?.[1] ?? null
}

export function getYouTubeThumbnail(url) {
  const videoId = getYouTubeVideoId(url)
  if (videoId) return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
  return null  // caller should show a placeholder
}

// ---- Google Drive Image Helpers -----------------------------

export function getDriveFileId(url) {
  if (!url) return ''
  const trimmed = String(url).trim()
  if (!trimmed) return ''

  // Match /file/d/FILE_ID/
  const m1 = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (m1) return m1[1]

  // Match id=FILE_ID
  const m2 = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (m2) return m2[1]

  // Match googleusercontent.com/.../d/FILE_ID
  const m3 = trimmed.match(/googleusercontent\.com\/(?:[a-z0-9_-]+\/)*d\/([a-zA-Z0-9_-]+)/)
  if (m3) return m3[1]

  // Match drive.google.com/thumbnail?id=FILE_ID
  const m4 = trimmed.match(/drive\.google\.com\/thumbnail\?id=([a-zA-Z0-9_-]+)/)
  if (m4) return m4[1]

  // Match partial paste like "FILE_ID/view..." or "FILE_ID?usp=sharing"
  const m5 = trimmed.match(/^([a-zA-Z0-9_-]{20,})(?:\/|\?|$)/)
  if (m5) return m5[1]

  // Match any 25+ character token in string
  const m6 = trimmed.match(/([a-zA-Z0-9_-]{25,})/)
  if (m6) return m6[1]

  return ''
}


export function convertDriveUrl(url, options = {}) {
  if (!url) return ''
  const fileId = getDriveFileId(url)
  if (fileId) {
    const width = options.width || 800
    return `https://lh3.googleusercontent.com/d/${fileId}=w${width}-rw`
  }
  return url
}

export function getDriveImageUrls(url, options = {}) {
  if (!url) return []
  const fileId = getDriveFileId(url)
  if (!fileId) return url.startsWith('http') ? [url] : []

  const width = options.width || 700
  const urls = [
    // 1. High-Performance Google CDN WebP format with optimal card dimensions
    `https://lh3.googleusercontent.com/d/${fileId}=w${width}-rw`,
    // 2. High-Performance Google CDN standard dimensions
    `https://lh3.googleusercontent.com/d/${fileId}=w${width}`,
    // 3. Crisp High-Res Fallback
    `https://lh3.googleusercontent.com/d/${fileId}=s1200`,
    `https://lh3.googleusercontent.com/d/${fileId}`,
    // 4. Drive Thumbnail CDN
    `https://drive.google.com/thumbnail?id=${fileId}&sz=w${width}`,
    // 5. Classic Drive Export Fallbacks
    `https://drive.google.com/uc?export=view&id=${fileId}`,
    `https://drive.google.com/uc?id=${fileId}`,
  ]

  if (url.startsWith('http')) {
    urls.push(url)
  }

  return urls
}



// ---- URL helpers --------------------------------------------

// Ensures an external link has a protocol and is safe against script execution (XSS).
// Rejects dangerous protocols like javascript:, data:, vbscript:, blob:, etc.
// Whitelists strictly: http, https, mailto, tel.
export function normalizeUrl(url) {
  if (!url) return ''
  const trimmed = String(url).trim()
  if (!trimmed) return ''

  // Filter out whitespace and non-printable control characters when testing dangerous schemes
  let sanitizedForScheme = ''
  for (let i = 0; i < trimmed.length; i++) {
    const code = trimmed.charCodeAt(i)
    if (code > 32 && code !== 127) {
      sanitizedForScheme += trimmed[i]
    }
  }
  sanitizedForScheme = sanitizedForScheme.toLowerCase()

  if (
    sanitizedForScheme.startsWith('javascript:') ||
    sanitizedForScheme.startsWith('data:') ||
    sanitizedForScheme.startsWith('vbscript:') ||
    sanitizedForScheme.startsWith('blob:') ||
    sanitizedForScheme.startsWith('file:')
  ) {
    return ''
  }

  // Check for explicit scheme (e.g. "https://...", "mailto:...")
  const schemeMatch = trimmed.match(/^([a-zA-Z][a-zA-Z\d+.-]*):/)
  if (schemeMatch) {
    const scheme = schemeMatch[1].toLowerCase()
    if (['http', 'https', 'mailto', 'tel'].includes(scheme)) {
      return trimmed
    }
    // Disallowed scheme
    return ''
  }

  // Protocol-relative URL ("//meet.google.com/…")
  if (trimmed.startsWith('//')) return `https:${trimmed}`
  return `https://${trimmed}`
}

// ---- Date / time helpers ------------------------------------

export function formatRelativeTime(dateString) {
  if (!dateString) return ''
  const date     = new Date(dateString)
  const now      = new Date()
  const diffMs   = now - date
  const diffMins = Math.floor(diffMs / 60_000)

  if (diffMins <  1)  return 'Just now'
  if (diffMins < 60)  return `${diffMins}m ago`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays <  7)  return `${diffDays}d ago`

  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export function formatDate(dateString, options = {}) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-IN', {
    day:   'numeric',
    month: 'short',
    year:  'numeric',
    ...options,
  })
}

export function formatDateTime(dateString) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleString('en-IN', {
    day:    'numeric',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  })
}

export function formatTime(dateString) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleTimeString('en-IN', {
    hour:   '2-digit',
    minute: '2-digit',
  })
}

export function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ---- Currency helpers ---------------------------------------

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style:    'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount ?? 0)
}

// ---- Text helpers -------------------------------------------

export function truncate(str, maxLen = 80) {
  if (!str) return ''
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str
}

export function capitalize(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function initials(fullName) {
  if (!fullName) return '?'
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0].toUpperCase())
    .join('')
}

// ---- Attendance percentage ----------------------------------

export function calcAttendancePercent(records) {
  if (!records?.length) return 0
  const present = records.filter(r => r.status === 'present').length
  const late    = records.filter(r => r.status === 'late').length
  // Late counts as 0.5 present
  return Math.round(((present + late * 0.5) / records.length) * 100)
}

// ---- cn (className merge) -----------------------------------
import { clsx }        from 'clsx'
import { twMerge }     from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
