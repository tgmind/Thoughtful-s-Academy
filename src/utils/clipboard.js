// ============================================================
// src/utils/clipboard.js
// Robust clipboard copy that works even when the async
// navigator.clipboard API is unavailable (insecure / http
// contexts, older browsers, embedded webviews). Falls back to
// a hidden <textarea> + execCommand, and toasts the result.
// ============================================================
import toast from 'react-hot-toast'

export async function copyToClipboard(text, successMsg = 'Copied!') {
  const value = text == null ? '' : String(text)
  if (!value) return false

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
      toast.success(successMsg)
      return true
    }
  } catch (_) {
    // fall through to legacy path
  }

  // Legacy fallback
  try {
    const ta = document.createElement('textarea')
    ta.value = value
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    if (ok) { toast.success(successMsg); return true }
  } catch (_) { /* ignore */ }

  toast.error('Could not copy automatically — please copy manually.')
  return false
}
