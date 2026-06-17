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

// ---- URL helpers --------------------------------------------

// Ensures an external link has a protocol. Without one, an
// <a href="meet.google.com/abc"> is treated as a *relative*
// path and React Router resolves it to a 404 / error page.
export function normalizeUrl(url) {
  if (!url) return ''
  const trimmed = String(url).trim()
  if (!trimmed) return ''
  // Already has a scheme (http, https, mailto, tel, etc.)
  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed)) return trimmed
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
  return new Date().toISOString().split('T')[0]  // "YYYY-MM-DD"
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
