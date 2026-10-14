import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowLeft, X, Download, ShieldCheck, Maximize2, Minimize2,
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Sun, Moon,
  BookOpen, RotateCcw, Loader2, Sparkles, AlertCircle
} from 'lucide-react'
import { fetchPdfBinary, pdfjsLib } from '../../utils/pdfLoader'

const THEMES = {
  day: {
    id: 'day',
    label: 'Day',
    icon: Sun,
    canvasFilter: 'none',
    bg: 'bg-slate-900',
    pageBg: 'bg-white'
  },
  sepia: {
    id: 'sepia',
    label: 'Sepia',
    icon: BookOpen,
    canvasFilter: 'sepia(45%) contrast(95%) brightness(95%)',
    bg: 'bg-[#1f1b18]',
    pageBg: 'bg-[#fbf0d9]'
  },
  night: {
    id: 'night',
    label: 'Night',
    icon: Moon,
    canvasFilter: 'invert(90%) hue-rotate(180deg) contrast(110%)',
    bg: 'bg-black',
    pageBg: 'bg-slate-900'
  }
}

/**
 * Single Virtualized PDF Page Canvas
 */
function PdfPageItem({ pageNumber, pdfDoc, scale, theme, onPageVisible }) {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const [rendered, setRendered] = useState(false)
  const [aspectRatio, setAspectRatio] = useState(1.414) // Standard A4 ratio initial estimate
  const renderTaskRef = useRef(null)

  useEffect(() => {
    let isCancelled = false

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting) {
          onPageVisible?.(pageNumber)
          if (!rendered && pdfDoc) {
            renderPage()
          }
        }
      },
      { rootMargin: '400px 0px' }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    async function renderPage() {
      if (!pdfDoc || !canvasRef.current) return
      try {
        const page = await pdfDoc.getPage(pageNumber)
        if (isCancelled) return

        const unscaledViewport = page.getViewport({ scale: 1.0 })
        const computedRatio = unscaledViewport.height / unscaledViewport.width
        setAspectRatio(computedRatio)

        // Calculate high-DPI scaling
        const pixelRatio = window.devicePixelRatio || 1.5
        const viewport = page.getViewport({ scale: scale * pixelRatio })

        const canvas = canvasRef.current
        if (!canvas) return
        const context = canvas.getContext('2d', { alpha: false })

        canvas.width = viewport.width
        canvas.height = viewport.height
        canvas.style.width = '100%'
        canvas.style.height = 'auto'

        // Cancel any pending render task on this canvas
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel()
        }

        const renderContext = {
          canvasContext: context,
          viewport
        }

        renderTaskRef.current = page.render(renderContext)
        await renderTaskRef.current.promise
        if (!isCancelled) {
          setRendered(true)
        }
      } catch (err) {
        if (err?.name !== 'RenderingCancelledException') {
          console.warn(`Error rendering page ${pageNumber}:`, err)
        }
      }
    }

    return () => {
      isCancelled = true
      observer.disconnect()
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel()
      }
    }
  }, [pdfDoc, pageNumber, scale, rendered, onPageVisible])

  return (
    <div
      ref={containerRef}
      id={`page-${pageNumber}`}
      className={`relative mx-auto rounded-xl shadow-2xl transition-all duration-200 overflow-hidden ${theme.pageBg}`}
      style={{
        width: '100%',
        maxWidth: `${Math.round(820 * scale)}px`,
        aspectRatio: `${1 / aspectRatio}`,
        minHeight: '260px'
      }}
    >
      <canvas
        ref={canvasRef}
        className="block w-full h-auto transition-filter duration-200 select-none"
        style={{ filter: theme.canvasFilter }}
      />

      {/* Page number subtle watermark in corner */}
      <div className="absolute bottom-2 right-3 text-[10px] font-bold text-slate-400/60 pointer-events-none select-none">
        {pageNumber}
      </div>
    </div>
  )
}

/**
 * Premium, High-Performance Native PDF Viewer Component
 */
export default function PremiumPdfViewer({
  card,
  downloadUrl,
  fileId,
  onClose,
  onFallbackToEmbed
}) {
  const containerRef = useRef(null)
  const scrollContainerRef = useRef(null)

  const [pdfDoc, setPdfDoc] = useState(null)
  const [numPages, setNumPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [themeKey, setThemeKey] = useState('day')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [downloadPercent, setDownloadPercent] = useState(0)
  const [loadError, setLoadError] = useState(null)
  const [downloading, setDownloading] = useState(false)

  const theme = THEMES[themeKey] || THEMES.day

  // Responsive scale initialization for mobile vs desktop
  useEffect(() => {
    const isMobile = window.innerWidth < 640
    setScale(isMobile ? 0.95 : 1.15)
  }, [])

  // Load PDF Document
  useEffect(() => {
    let isCancelled = false
    setLoading(true)
    setLoadError(null)

    async function loadPdf() {
      try {
        const binary = await fetchPdfBinary(card?.url, fileId, (percent) => {
          if (!isCancelled) setDownloadPercent(percent)
        })

        if (isCancelled) return

        const loadingTask = pdfjsLib.getDocument({
          data: binary,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
          cMapPacked: true
        })

        const doc = await loadingTask.promise
        if (isCancelled) return

        setPdfDoc(doc)
        setNumPages(doc.numPages)
        setLoading(false)
      } catch (err) {
        console.warn('PDF native load failed, auto-falling back to embedded preview:', err)
        if (!isCancelled) {
          if (onFallbackToEmbed) {
            onFallbackToEmbed()
          } else {
            setLoadError(err.message || 'Unable to render PDF natively.')
            setLoading(false)
          }
        }
      }
    }

    loadPdf()

    return () => {
      isCancelled = true
    }
  }, [card?.url, fileId, onFallbackToEmbed])

  // Fullscreen listener
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  // Page Navigation Helper
  const goToPage = useCallback((pageNum) => {
    const target = Math.max(1, Math.min(pageNum, numPages))
    setCurrentPage(target)
    const el = document.getElementById(`page-${target}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [numPages])

  // Keyboard navigation & Esc listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen?.().catch(() => {})
        } else {
          onClose?.()
        }
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        goToPage(currentPage + 1)
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        goToPage(currentPage - 1)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentPage, goToPage, onClose])

  // Fullscreen toggle
  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current
    if (!el) return
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch { /* fallback */ }
  }, [])

  // Manual download
  const handleDownload = useCallback(() => {
    if (!downloadUrl) return
    setDownloading(true)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    link.setAttribute('download', card?.title ? `${card.title.replace(/[/\\?%*:|"<>]/g, '-')}.pdf` : 'study_material.pdf')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => setDownloading(false), 2000)
  }, [downloadUrl, card?.title])

  // Zoom controls
  const handleZoomIn = () => setScale(s => Math.min(+(s + 0.15).toFixed(2), 2.2))
  const handleZoomOut = () => setScale(s => Math.max(+(s - 0.15).toFixed(2), 0.6))
  const handleResetZoom = () => setScale(window.innerWidth < 640 ? 0.95 : 1.15)

  return createPortal(
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={card?.title || 'Study Material Viewer'}
      className={`fixed inset-0 z-[99999] flex flex-col ${theme.bg} text-white w-screen h-[100dvh] max-h-[100dvh] m-0 p-0 overflow-hidden select-none transition-colors duration-200`}
    >
      {/* ─── 1. TOP HEADER TOOLBAR (GOOGLE MATERIAL DESIGN 3) ─────────────── */}
      <header className="flex-shrink-0 h-14 sm:h-16 bg-[#1f1f1f] border-b border-[#2d2d2d] px-3 sm:px-6 flex items-center justify-between gap-2.5 z-30 shadow-xs">
        
        {/* Left: Back & Document Metadata */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => {
              if (document.fullscreenElement) {
                document.exitFullscreen?.().catch(() => {})
              }
              onClose?.()
            }}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-white/10 active:bg-white/20 text-slate-300 hover:text-white transition-all flex items-center justify-center shrink-0 cursor-pointer focus:outline-none"
            title="Close material (Esc)"
            aria-label="Close viewer"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="h-5 w-px bg-slate-800 hidden sm:block shrink-0" />

          {/* Title & Subject */}
          <div className="min-w-0 flex-1 flex flex-col justify-center">
            <div className="flex items-center gap-1.5 flex-wrap">
              {card?.subject && (
                <span className="inline-flex items-center text-[10px] font-semibold tracking-wide px-2.5 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30">
                  {card.subject}
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-[10px] font-medium tracking-wide px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/80">
                <ShieldCheck className="h-3 w-3 text-emerald-400" />
                <span>Protected Reader</span>
              </span>
            </div>
            <h3
              className="text-xs sm:text-sm font-semibold text-slate-100 truncate tracking-normal mt-0.5"
              title={card?.title}
            >
              {card?.title || 'Practice Sheet / Study Material'}
            </h3>
          </div>
        </div>

        {/* Center: Desktop Page Jump & Zoom Controls (M3 Pill) */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-[#282828] rounded-full border border-[#383838]">
          <button
            type="button"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="w-7 h-7 rounded-full text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30 flex items-center justify-center cursor-pointer transition-colors"
            title="Previous Page (Left Arrow)"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          
          <span className="text-xs font-mono font-medium text-slate-200 px-1.5 min-w-[50px] text-center">
            {currentPage} / {numPages || '…'}
          </span>

          <button
            type="button"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= numPages}
            className="w-7 h-7 rounded-full text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30 flex items-center justify-center cursor-pointer transition-colors"
            title="Next Page (Right Arrow)"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <div className="h-3.5 w-px bg-slate-700 mx-1" />

          {/* Zoom */}
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-7 h-7 rounded-full text-slate-300 hover:text-white hover:bg-white/10 flex items-center justify-center cursor-pointer transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="text-[11px] font-mono text-slate-300 w-9 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-7 h-7 rounded-full text-slate-300 hover:text-white hover:bg-white/10 flex items-center justify-center cursor-pointer transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            className="w-7 h-7 rounded-full text-slate-300 hover:text-white hover:bg-white/10 flex items-center justify-center cursor-pointer transition-colors"
            title="Reset Zoom"
          >
            <RotateCcw className="h-3 w-3" />
          </button>
        </div>

        {/* Right: Theme Selector, Manual Download, Fullscreen & Close */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          
          {/* Eye-Care Theme Switcher */}
          <div className="flex items-center bg-[#282828] rounded-full p-0.5 border border-[#383838]">
            {Object.values(THEMES).map(t => {
              const Icon = t.icon
              const active = themeKey === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setThemeKey(t.id)}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    active ? 'bg-amber-500 text-slate-950 font-bold shadow-xs' : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                  title={`${t.label} reading mode`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              )
            })}
          </div>

          {/* Manual Download Button */}
          {downloadUrl && (
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-bold text-xs transition-all shadow-xs cursor-pointer disabled:opacity-50"
              title="Download clean file directly to your device"
            >
              {downloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">Download</span>
            </button>
          )}

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-all flex items-center justify-center cursor-pointer focus:outline-none"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            aria-label="Toggle fullscreen"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>

          {/* Close Button */}
          <button
            type="button"
            onClick={() => {
              if (document.fullscreenElement) {
                document.exitFullscreen?.().catch(() => {})
              }
              onClose?.()
            }}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-all flex items-center justify-center cursor-pointer focus:outline-none"
            title="Close (Esc)"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* ─── 2. MAIN DOCUMENT CANVAS SCROLL VIEWPORT ──────────────────── */}
      <main
        ref={scrollContainerRef}
        className="flex-1 relative overflow-y-auto overflow-x-hidden p-3 sm:p-6"
      >
        {/* Loading State with Progress Bar */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 z-20 backdrop-blur-sm">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-amber-500/20 border-t-amber-400 animate-spin" />
              <BookOpen className="h-7 w-7 text-amber-400 absolute inset-0 m-auto" />
            </div>
            <p className="mt-4 text-sm font-bold text-slate-200">
              Loading high-resolution study material...
            </p>
            <div className="w-48 h-1.5 bg-slate-800 rounded-full mt-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-200 rounded-full"
                style={{ width: `${downloadPercent}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-2 font-mono">
              {downloadPercent > 0 ? `${downloadPercent}% downloaded` : 'Preparing document…'}
            </p>
          </div>
        )}

        {/* Load Error with Seamless Fallback */}
        {loadError && (
          <div className="max-w-md mx-auto my-12 p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 mx-auto flex items-center justify-center">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">Interactive Render Fallback</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                This document provider requires standard embedded preview. You can switch to embedded mode or download the file directly.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
              <button
                type="button"
                onClick={onFallbackToEmbed}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Sparkles className="h-4 w-4" /> Open in Standard Mode
              </button>
              {downloadUrl && (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Download className="h-4 w-4" /> Download File
                </button>
              )}
            </div>
          </div>
        )}

        {/* Rendered Pages List (Virtualized Lazy Loading) */}
        {!loading && !loadError && numPages > 0 && (
          <div className="flex flex-col items-center gap-4 sm:gap-6 pb-20">
            {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
              <PdfPageItem
                key={pageNum}
                pageNumber={pageNum}
                pdfDoc={pdfDoc}
                scale={scale}
                theme={theme}
                onPageVisible={(visiblePage) => setCurrentPage(visiblePage)}
              />
            ))}
          </div>
        )}
      </main>

      {/* ─── 3. FLOATING MOBILE HUD CONTROLS PILL ─────────────────────── */}
      {!loading && !loadError && numPages > 0 && (
        <div className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-2 bg-slate-950/85 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-2xl text-white">
          <button
            type="button"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 active:scale-95 disabled:opacity-30 cursor-pointer"
            aria-label="Previous Page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <span className="text-xs font-mono font-extrabold px-1 text-slate-200">
            {currentPage} / {numPages}
          </span>

          <button
            type="button"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= numPages}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 active:scale-95 disabled:opacity-30 cursor-pointer"
            aria-label="Next Page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <div className="h-4 w-px bg-slate-700 mx-0.5" />

          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 active:scale-95 cursor-pointer"
            aria-label="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={handleZoomIn}
            className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 active:scale-95 flex items-center justify-center cursor-pointer"
            aria-label="Zoom In"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>,
    document.body
  )
}
