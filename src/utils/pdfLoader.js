import * as pdfjsLib from 'pdfjs-dist'

// Configure PDF.js worker
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  // Use cloudflare cdnjs matching the exact pdfjs-dist version as a reliable, zero-bundle-overhead worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
}

// In-memory document binary cache for instant 0ms subsequent loads
const pdfBlobCache = new Map()

/**
 * Downloads a PDF from a direct stream or Google Drive usercontent endpoint
 * and caches the ArrayBuffer for lightning-fast re-rendering.
 *
 * @param {string} url
 * @param {string} fileId
 * @param {((progress: number) => void)} [onProgress]
 * @returns {Promise<Uint8Array>}
 */
export async function fetchPdfBinary(url, fileId, onProgress) {
  const cacheKey = fileId || url
  if (pdfBlobCache.has(cacheKey)) {
    onProgress?.(100)
    return pdfBlobCache.get(cacheKey)
  }

  // Construct optimized direct fetch URL
  let fetchUrl = url
  if (fileId) {
    fetchUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download`
  }

  const response = await fetch(fetchUrl, {
    method: 'GET',
    headers: {
      'Accept': 'application/pdf,application/octet-stream,*/*'
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to download PDF: HTTP ${response.status}`)
  }

  const contentLength = response.headers.get('content-length')
  const total = contentLength ? parseInt(contentLength, 10) : 0

  if (!response.body || total === 0) {
    const arrayBuffer = await response.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    pdfBlobCache.set(cacheKey, uint8Array)
    onProgress?.(100)
    return uint8Array
  }

  const reader = response.body.getReader()
  let receivedLength = 0
  const chunks = []

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    chunks.push(value)
    receivedLength += value.length
    if (total > 0 && onProgress) {
      const percent = Math.min(Math.round((receivedLength / total) * 100), 99)
      onProgress(percent)
    }
  }

  const uint8Array = new Uint8Array(receivedLength)
  let position = 0
  for (const chunk of chunks) {
    uint8Array.set(chunk, position)
    position += chunk.length
  }

  pdfBlobCache.set(cacheKey, uint8Array)
  onProgress?.(100)
  return uint8Array
}

export { pdfjsLib }
