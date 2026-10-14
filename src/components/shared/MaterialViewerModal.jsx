import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
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

  return createPortal(
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={card.title || 'Study Material Viewer'}
      className="fixed inset-0 z-[99999] flex flex-col bg-[#121212] text-slate-100 w-screen h-[100dvh] max-h-[100dvh] m-0 p-0 overflow-hidden select-none"
      style={{ animation: 'materialModalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
    >
      <style>{`
        @keyframes materialModalFadeIn {
          from { opacity: 0; transform: scale(0.99); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* ─── TOP HEADER TOOLBAR (GOOGLE MATERIAL DESIGN 3) ─────────────── */}
      <header className="flex-shrink-0 h-14 sm:h-16 bg-[#1f1f1f] border-b border-[#2d2d2d] px-3 sm:px-6 flex items-center justify-between gap-2.5 z-30 shadow-xs">
        
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
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-white/10 active:bg-white/20 text-slate-300 hover:text-white transition-all flex items-center justify-center shrink-0 cursor-pointer focus:outline-none"
            title="Close material (Esc)"
            aria-label="Close viewer"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="h-5 w-px bg-slate-800 hidden sm:block shrink-0" />

          {/* Badges & Title */}
          <div className="min-w-0 flex-1 flex flex-col justify-center">
            <div className="flex items-center gap-1.5 flex-wrap">
              {card.subject && (
                <span className="inline-flex items-center text-[10px] font-semibold tracking-wide px-2.5 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30">
                  {card.subject}
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-[10px] font-medium tracking-wide px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/80">
                <FileText className="h-3 w-3" />
                <span>{typeLabel}</span>
              </span>
            </div>
            <h3
              className="text-xs sm:text-sm font-semibold text-slate-100 truncate tracking-normal mt-0.5"
              title={card.title}
            >
              {card.title || 'Untitled Material'}
            </h3>
          </div>
        </div>

        {/* Right: Security Badge, Manual Download, Fullscreen & Close */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          
          {/* Protected View Status */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Protected View</span>
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
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-all flex items-center justify-center cursor-pointer focus:outline-none"
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
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-all flex items-center justify-center cursor-pointer focus:outline-none"
            title="Close (Esc)"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* ─── MAIN EMBED VIEWPORT ──────────────────────────────────────── */}
      <main className="flex-1 relative bg-[#121212] overflow-hidden flex items-center justify-center">
        
        {/* Loading Spinner */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#121212] z-10 transition-opacity">
            <div className="relative">
              <div className="w-14 h-14 rounded-full border-4 border-amber-500/20 border-t-amber-400 animate-spin" />
              <FileText className="h-6 w-6 text-amber-400 absolute inset-0 m-auto" />
            </div>
            <p className="mt-4 text-xs sm:text-sm font-semibold text-slate-200">
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
          <div className="max-w-md p-6 bg-[#1e1e1e] border border-[#2d2d2d] rounded-3xl text-center space-y-4 m-4 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 mx-auto flex items-center justify-center">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-white">Preview Unavailable</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                This document provider restricts in-frame embedding. You can download the file directly or open it securely.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
              {downloadUrl && (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-full transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Download className="h-4 w-4" /> Download File
                </button>
              )}
              <a
                href={card.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-full transition-all flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="h-4 w-4" /> Open External Link
              </a>
            </div>
          </div>
        ) : (
          <div className="w-full h-full relative bg-[#121212]">
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
              Seamlessly matches Google Drive dark toolbar (#323639) to cap pop-out cleanly.
            */}
            {isDrive && (
              <div
                className="absolute top-0 right-0 w-14 h-12 z-20 pointer-events-auto cursor-default bg-[#323639] border-b border-l border-[#4a4d50] rounded-bl-lg flex items-center justify-center gap-1 text-[10px] font-medium text-slate-300 select-none shadow-xs"
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
    </div>,
    document.body
  )
}
