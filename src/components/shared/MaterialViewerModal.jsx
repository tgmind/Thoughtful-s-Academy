import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowLeft, X, Download, FileText,
  ExternalLink, Loader2, Sparkles, AlertCircle
} from 'lucide-react'
import {
  getMaterialEmbedUrl,
  getMaterialDownloadUrl,
  downloadMaterialFile,
  isGoogleDriveResource,
  parseGoogleResource
} from '../../utils/materialUrl'

export default function MaterialViewerModal({ card, onClose }) {
  const containerRef = useRef(null)
  const iframeRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const isDrive = isGoogleDriveResource(card?.url, card?.type)
  const { kind } = parseGoogleResource(card?.url)
  const embedUrl = getMaterialEmbedUrl(card?.url, card?.type)
  const downloadUrl = getMaterialDownloadUrl(card?.url, card?.type)

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

  // Lock body scroll and register Escape & shortcut listeners
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
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 's')) {
        // Prevent external browser print/save shortcuts inside protected viewer
        e.preventDefault()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  // Direct manual download handler (downloads directly to device without opening Google Drive tabs)
  const handleDownload = useCallback(async (e) => {
    e?.preventDefault?.()
    e?.stopPropagation?.()
    if (!downloadUrl) return
    setDownloading(true)

    try {
      await downloadMaterialFile(card?.url, card?.title, card?.type)
    } finally {
      setTimeout(() => {
        setDownloading(false)
      }, 1200)
    }
  }, [downloadUrl, card?.url, card?.title, card?.type])

  if (!card) return null

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
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
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
      <header className="flex-shrink-0 h-14 sm:h-16 bg-[#1f1f1f] border-b border-[#2d2d2d] px-3 sm:px-6 flex items-center justify-between gap-3 z-30 shadow-xs">
        
        {/* Left: Back Button & Text-Only Document Metadata */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => {
              if (document.fullscreenElement) {
                document.exitFullscreen?.().catch(() => {})
              }
              onClose?.()
            }}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-white/10 active:bg-white/20 text-neutral-300 hover:text-white transition-colors flex items-center justify-center shrink-0 cursor-pointer focus:outline-none"
            title="Close material (Esc)"
            aria-label="Close viewer"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="h-5 w-px bg-[#333333] hidden sm:block shrink-0" />

          {/* Text-Only Headline & Context Metadata Hierarchy (No Pills) */}
          <div className="min-w-0 flex-1 flex flex-col justify-center">
            <h2
              className="text-sm sm:text-base font-semibold text-white truncate tracking-normal"
              title={card.title}
            >
              {card.title || 'Untitled Material'}
            </h2>
            <p className="text-[11px] sm:text-xs text-neutral-400 font-normal flex items-center gap-1.5 truncate mt-0.5">
              {card.subject && <span className="font-medium text-neutral-300">{card.subject}</span>}
              {card.subject && <span>•</span>}
              <span>{typeLabel}</span>
            </p>
          </div>
        </div>

        {/* Right: Manual Download & Close */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          
          {/* Manual Download Button (Google M3 Icon Button) */}
          {downloadUrl && (
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-white/10 active:bg-white/20 text-neutral-300 hover:text-white transition-colors flex items-center justify-center cursor-pointer disabled:opacity-50 focus:outline-none"
              title="Download file"
              aria-label="Download"
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
              ) : (
                <Download className="h-4 w-4 sm:h-5 sm:w-5" />
              )}
            </button>
          )}

          {/* X Close Button */}
          <button
            type="button"
            onClick={() => {
              if (document.fullscreenElement) {
                document.exitFullscreen?.().catch(() => {})
              }
              onClose?.()
            }}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-white/10 active:bg-white/20 text-neutral-300 hover:text-white transition-colors flex items-center justify-center cursor-pointer focus:outline-none"
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
          <div
            className="w-full h-full relative bg-[#121212]"
            onContextMenu={(e) => e.preventDefault()}
          >
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
              ─── TRANSPARENT INTERACTION MASK & REDIRECT INTERCEPTOR ───
              1. Masking is completely invisible/transparent with 0 visual intrusion.
              2. Outer mask uses pointer-events-none so 100% of gestures, multi-touch
                 pinch-to-zoom, swiping, panning, and trackpad/mouse wheel scrolling
                 pass directly to the viewer with zero lag or delay.
              3. The top-right blocker region uses pointer-events-auto to intercept
                 and neutralize clicks/taps targeting the external popout/redirect button.
            */}
            {isDrive && (
              <div
                className="absolute inset-0 z-20 pointer-events-none select-none overflow-hidden"
                aria-hidden="true"
              >
                <div
                  data-testid="drive-redirect-blocker"
                  className="absolute top-0 right-0 w-16 h-14 sm:w-20 sm:h-16 pointer-events-auto bg-transparent cursor-default select-none"
                  style={{ touchAction: 'none' }}
                  title=""
                  aria-label="Protected View"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  onMouseUp={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  onPointerDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                />
              </div>
            )}
          </div>
        )}
      </main>
    </div>,
    document.body
  )
}
