import { normalizeUrl } from './formatters'

/**
 * Parses Google Drive / Docs / Sheets / Slides URLs to extract the canonical file/document ID and type.
 *
 * @param {string} rawUrl
 * @returns {{ id: string|null, kind: 'drive_file'|'doc'|'sheet'|'presentation'|null }}
 */
export function parseGoogleResource(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { id: null, kind: null }
  }

  const url = rawUrl.trim()

  // 1. Google Docs
  const docMatch = url.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/i)
  if (docMatch) {
    return { id: docMatch[1], kind: 'doc' }
  }

  // 2. Google Sheets
  const sheetMatch = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/i)
  if (sheetMatch) {
    return { id: sheetMatch[1], kind: 'sheet' }
  }

  // 3. Google Presentations / Slides
  const presMatch = url.match(/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/i)
  if (presMatch) {
    return { id: presMatch[1], kind: 'presentation' }
  }

  // 4. Standard Drive file paths: /file/d/{id}
  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i)
  if (fileMatch) {
    return { id: fileMatch[1], kind: 'drive_file' }
  }

  // 5. Query parameter ID format: ?id={id} or &id={id} on drive.google.com
  if (url.includes('drive.google.com')) {
    const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/i)
    if (idMatch) {
      return { id: idMatch[1], kind: 'drive_file' }
    }
  }

  return { id: null, kind: null }
}

/**
 * Determines whether a URL is a Google Drive or Google Docs resource.
 *
 * @param {string} url
 * @param {string} [type]
 * @returns {boolean}
 */
export function isGoogleDriveResource(url, type) {
  if (type === 'google_drive' || type === 'drive') return true
  if (!url) return false
  return /drive\.google\.com|docs\.google\.com/i.test(url)
}

/**
 * Returns a secure, isolated in-app embed URL for documents and materials.
 * For Google Drive files, enforces the stripped-down '/preview' view.
 *
 * @param {string} rawUrl
 * @param {string} [type]
 * @returns {string}
 */
export function getMaterialEmbedUrl(rawUrl, _type) {
  if (!rawUrl) return ''

  const { id, kind } = parseGoogleResource(rawUrl)

  if (id) {
    if (kind === 'doc') {
      return `https://docs.google.com/document/d/${id}/preview`
    }
    if (kind === 'sheet') {
      return `https://docs.google.com/spreadsheets/d/${id}/preview`
    }
    if (kind === 'presentation') {
      return `https://docs.google.com/presentation/d/${id}/preview`
    }
    // drive_file default
    return `https://drive.google.com/file/d/${id}/preview`
  }

  // Fallback for direct URLs
  return normalizeUrl(rawUrl)
}

/**
 * Returns a direct download URL that downloads the material without opening interactive sharing interfaces.
 * Uses Google Drive's CORS-enabled usercontent attachment endpoint with auto-confirmation.
 *
 * @param {string} rawUrl
 * @param {string} [_type]
 * @returns {string}
 */
export function getMaterialDownloadUrl(rawUrl, _type) {
  if (!rawUrl) return ''

  const { id, kind } = parseGoogleResource(rawUrl)

  if (id) {
    if (kind === 'doc') {
      return `https://docs.google.com/document/d/${id}/export?format=pdf`
    }
    if (kind === 'sheet') {
      return `https://docs.google.com/spreadsheets/d/${id}/export?format=pdf`
    }
    if (kind === 'presentation') {
      return `https://docs.google.com/presentation/d/${id}/export/pdf`
    }
    // Direct Google Drive download stream (serves Content-Disposition: attachment directly)
    return `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`
  }

  return normalizeUrl(rawUrl)
}

/**
 * Convenient alias for getMaterialDownloadUrl
 */
export const getDirectDownloadUrl = getMaterialDownloadUrl

/**
 * Triggers a direct background file download onto the user's device
 * strictly WITHOUT opening Google Drive or launching new browser tabs.
 *
 * @param {string} rawUrl - Source document URL or Google Drive link
 * @param {string} [title] - Suggested filename
 * @param {string} [type] - Optional resource type hint
 * @returns {Promise<boolean>}
 */
export async function downloadMaterialFile(rawUrl, title = 'study_material', type) {
  if (!rawUrl) return false

  const downloadUrl = getMaterialDownloadUrl(rawUrl, type)
  if (!downloadUrl) return false

  const cleanTitle = (title || 'study_material').replace(/[/\\?%*:|"<>]/g, '-').trim()
  const filename = cleanTitle.toLowerCase().endsWith('.pdf') ? cleanTitle : `${cleanTitle}.pdf`

  // 1. Fetch as Blob for seamless native download (supported by CORS-enabled direct stream)
  try {
    const res = await fetch(downloadUrl, { method: 'GET', mode: 'cors' })
    if (res && res.ok) {
      const blob = await res.blob()
      if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
        const blobUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = blobUrl
        a.download = filename
        // Strictly avoid target="_blank"
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(blobUrl), 20000)
        return true
      }
    }
  } catch {
    // Cross-origin restriction fallback
  }

  // 2. Direct Anchor trigger strictly WITHOUT target="_blank"
  // When the server sends Content-Disposition: attachment, clicking <a href="..." download="..."> triggers download directly.
  try {
    const a = document.createElement('a')
    a.href = downloadUrl
    a.setAttribute('download', filename)
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    return true
  } catch {
    return false
  }
}
