import { useEffect, useRef, useState, useCallback } from 'react'
import {
  ArrowLeft, X, Download, ShieldCheck, FileText, Maximize2,
  Minimize2, ExternalLink, Loader2, Sparkles, AlertCircle
} from 'lucide-react'
import {
  getMaterialEmbedUrl,
  getMaterialDownloadUrl,
  isGoogleDriveResource,
  parseGoogleResource
} from '../../utils/materialUrl'
import PremiumPdfViewer from './PremiumPdfViewer'

export default function MaterialViewerModal({ card, onClose }) {
  const containerRef = useRef(null)
  const iframeRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [forceEmbed, setForceEmbed] = useState(false)

  const isDrive = isGoogleDriveResource(card?.url, card?.type)
  const { id, kind } = parseGoogleResource(card?.url)
  const embedUrl = getMaterialEmbedUrl(card?.url, card?.type)
  const downloadUrl = getMaterialDownloadUrl(card?.url, card?.type)

  // Use the native high-performance canvas renderer for Google Drive files & direct PDFs
  const isPdfCandidate = !forceEmbed && (
    (isDrive && (!kind || kind === 'drive_file')) ||
    (card?.url && card.url.toLowerCase().includes('.pdf'))
  )

  // Native iframe error listener (React does not support synthetic onError on iframes)
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    const handleError = () => {
      setLoading(false)
      setHasError(true)
    }

    iframe.addEventListener('error', handleError)
    iframe.onerror = handleError

    return () => {
      iframe.removeEventListener('error', handleError)
      iframe.onerror = null
    }
  }, [hasError, embedUrl])

  // Lock body scroll and register Escape key listener
  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen?.().catch(() => {})
        } else {
          onClose?.()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  // Fullscreen state listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  // Fullscreen toggle handler
  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current
    if (!el) return

    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch {
      // Graceful fallback if fullscreen is denied or unavailable
    }
  }, [])

  // Direct manual download handler
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

    setTimeout(() => {
      setDownloading(false)
    }, 2000)
  }, [downloadUrl, card?.title])

  if (!card) return null

  // ─── 1. RENDER HIGH-PERFORMANCE NATIVE PDF VIEWER ────────────────────
  if (isPdfCandidate) {
    return (
      <PremiumPdfViewer
        card={card}
        downloadUrl={downloadUrl}
        fileId={id}
        onClose={onClose}
        onFallbackToEmbed={() => setForceEmbed(true)}
      />
    )
  }

  // ─── 2. RENDER PREMIUM EMBEDDED VIEWER FOR DOCS / SHEETS / WEB ───────
  let typeLabel = 'Study Material'
  if (kind === 'doc') typeLabel = 'Google Doc'
  else if (kind === 'sheet') typeLabel = 'Google Sheet'
  else if (kind === 'presentation') typeLabel = 'Presentation'
  else if (isDrive) typeLabel = 'Notes'
  else if (card?.type === 'external_link') typeLabel = 'Web Resource'

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={card.title || 'Study Material Viewer'}
      className="fixed inset-0 z-[9999] flex flex-col bg-slate-950 text-white w-screen h-screen overflow-hidden select-none"
      style={{ animation: 'materialModalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
    >
      <style>{`
        @keyframes materialModalFadeIn {
          from { opacity: 0; transform: scale(0.99); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* ─── TOP HEADER TOOLBAR (RESPONSIVE & MOBILE-OPTIMIZED) ───────── */}
      <header className="flex-shrink-0 h-14 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800/80 px-2.5 sm:px-5 flex items-center justify-between gap-2 z-30 shadow-md">
        
        {/* Left: Back Button & Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => {
              if (document.fullscreenElement) {
                document.exitFullscreen?.().catch(() => {})
              }
              onClose?.()
            }}
            className="p-2 rounded-xl bg-slate-800/90 hover:bg-red-600/90 text-slate-300 hover:text-white transition-all flex items-center gap-1 shrink-0 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-400"
            title="Close material (Esc)"
            aria-label="Close viewer"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-xs font-bold hidden md:inline">Back</span>
          </button>

          <div className="h-5 w-px bg-slate-800 hidden sm:block shrink-0" />

          {/* Badges & Title */}
          <div className="min-w-0 flex-1 flex flex-col justify-center">
            <div className="flex items-center gap-1.5 flex-wrap">
              {card.subject && (
                <span className="inline-flex items-center text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {card.subject}
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                <FileText className="h-2.5 w-2.5" />
                <span>{typeLabel}</span>
              </span>
            </div>
            <h3
              className="text-xs sm:text-sm font-black text-slate-100 truncate tracking-tight mt-0.5"
              title={card.title}
            >
              {card.title || 'Untitled Material'}
            </h3>
          </div>
        </div>

        {/* Right: Security Badge, Manual Download, Fullscreen & Close */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          
          {/* Protected View Status */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Protected View</span>
          </div>

          {/* Manual Download Button */}
          {downloadUrl && (
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-slate-950 font-black text-xs transition-all shadow-md cursor-pointer disabled:opacity-50"
              title="Download clean file directly to your device"
            >
              {downloading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span className="hidden sm:inline">Downloading...</span>
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Download</span>
                </>
              )}
            </button>
          )}

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer focus:outline-none"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            aria-label="Toggle fullscreen"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </button>

          {/* X Close Button */}
          <button
            type="button"
            onClick={() => {
              if (document.fullscreenElement) {
                document.exitFullscreen?.().catch(() => {})
              }
              onClose?.()
            }}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-red-600 text-slate-300 hover:text-white transition-all cursor-pointer focus:outline-none"
            title="Close (Esc)"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* ─── MAIN EMBED VIEWPORT ──────────────────────────────────────── */}
      <main className="flex-1 relative bg-slate-950 overflow-hidden flex items-center justify-center">
        
        {/* Loading Spinner */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 z-10 transition-opacity">
            <div className="relative">
              <div className="w-14 h-14 rounded-full border-4 border-amber-500/20 border-t-amber-400 animate-spin" />
              <FileText className="h-6 w-6 text-amber-400 absolute inset-0 m-auto" />
            </div>
            <p className="mt-4 text-xs sm:text-sm font-bold text-slate-300">
              Opening study material in protected view...
            </p>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" />
              Thoughtful&apos;s Academy Classroom
            </p>
          </div>
        )}

        {/* Fallback / Error State */}
        {hasError ? (
          <div className="max-w-md p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4 m-4 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 mx-auto flex items-center justify-center">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">Preview Unavailable</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                This document provider restricts in-frame embedding. You can download the file directly or open it securely.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
              {downloadUrl && (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Download className="h-4 w-4" /> Download File
                </button>
              )}
              <a
                href={card.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="h-4 w-4" /> Open External Link
              </a>
            </div>
          </div>
        ) : (
          <div className="w-full h-full relative bg-slate-900">
            {/* Embedded Material Iframe */}
            <iframe
              ref={iframeRef}
              src={embedUrl}
              title={`Preview: ${card.title || 'Study Material'}`}
              className="w-full h-full border-0 bg-white"
              allow="autoplay; encrypted-media; fullscreen"
              loading="eager"
              onLoad={() => setLoading(false)}
            />

            {/* 
              ─── PROTECTIVE CORNER SHIELD ───
              Conceals Google Drive's pop-out button with an elegant Thoughtful's Academy badge.
            */}
            {isDrive && (
              <div
                className="absolute top-0 right-0 w-28 h-12 z-20 pointer-events-auto cursor-default bg-slate-950/90 backdrop-blur-sm border-b border-l border-slate-800 rounded-bl-xl flex items-center justify-center gap-1 text-[11px] font-bold text-amber-400 select-none shadow-md"
                title="Protected View: Sharing and pop-outs restricted."
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                }}
              >
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Protected</span>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
