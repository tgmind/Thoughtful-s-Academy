import { useEffect, useRef, useState, useCallback } from 'react'
import {
  X, Heart, BookOpen, ListVideo, Youtube, ExternalLink, Sparkles,
  Maximize2, Minimize2, ArrowLeft, ShieldCheck
} from 'lucide-react'

// ─── URL Helpers ──────────────────────────────────────────────────────────────

function getYTVideoId(url) {
  if (!url) return null
  const match = url.match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/|live\/)([^#&?/]{11})/)
  return match?.[1] ?? null
}

function getYTPlaylistId(url) {
  if (!url) return null
  const match = url.match(/[?&]list=([^&]+)/)
  return match?.[1] ?? null
}

function getEmbedUrl(url, type) {
  if (!url) return ''

  // Standard clean embed params
  const lockParams = 'autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&playsinline=1'

  // YouTube Playlist
  if (type === 'youtube_playlist') {
    const listId = getYTPlaylistId(url)
    if (listId) {
      return `https://www.youtube.com/embed/videoseries?list=${listId}&${lockParams}`
    }
  }

  // YouTube Video — detect all URL patterns
  const videoId = getYTVideoId(url)
  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}?${lockParams}`
  }

  // youtube.com/embed/... already
  if (url.includes('youtube.com/embed/') || url.includes('youtube-nocookie.com/embed/')) {
    const base = url.split('?')[0].replace('youtube-nocookie.com', 'youtube.com')
    return `${base}?${lockParams}`
  }

  // Google Drive
  if (url.includes('drive.google.com/file/d/')) {
    const m = url.match(/\/file\/d\/([^/?]+)/)
    if (m) return `https://drive.google.com/file/d/${m[1]}/preview`
  }

  return url
}

// ─── Main Dedicated Classroom Theater View Component ──────────────────────────

export default function VideoPlayerModal({ card, bookmarked, onBookmark, onClose }) {
  const containerRef = useRef(null)
  const [isBookmarked, setIsBookmarked] = useState(bookmarked)
  const [bookmarkLoading, setBookmarkLoading] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const embedUrl = getEmbedUrl(card?.url, card?.type)
  const isPlaylist = card?.type === 'youtube_playlist'
  const isYoutube = card?.type?.startsWith('youtube')

  // Sync external bookmark state
  useEffect(() => { setIsBookmarked(bookmarked) }, [bookmarked])

  // Lock body scroll & handle Escape key
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handler = (e) => {
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen?.().catch(() => {})
        } else {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', handler)
    }
  }, [onClose])

  const handleBookmark = async () => {
    if (bookmarkLoading) return
    setBookmarkLoading(true)
    try {
      await onBookmark(card.id, isBookmarked)
      setIsBookmarked(prev => !prev)
    } finally {
      setBookmarkLoading(false)
    }
  }

  // ─── Landscape Fullscreen Toggle ──────────────────────────────────────
  const handleFullscreen = useCallback(async () => {
    const el = containerRef.current
    if (!el) return

    if (!document.fullscreenElement) {
      try {
        await el.requestFullscreen()
        try {
          await screen.orientation?.lock?.('landscape')
        } catch {
          // Orientation lock fallback
        }
      } catch {
        // Fullscreen API fallback
      }
    } else {
      try { screen.orientation?.unlock?.() } catch {}
      document.exitFullscreen?.().catch(() => {})
    }
  }, [])

  // Sync fullscreen state
  useEffect(() => {
    const handler = () => {
      const isFull = !!document.fullscreenElement
      setIsFullscreen(isFull)
      if (!isFull) {
        try { screen.orientation?.unlock?.() } catch {}
      }
    }
    document.addEventListener('fullscreenchange', handler)
    return () => {
      document.removeEventListener('fullscreenchange', handler)
      try { screen.orientation?.unlock?.() } catch {}
    }
  }, [])

  if (!card) return null

  return (
    // Dedicated Classroom Theater Screen — 100vh Full Screen View
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] flex flex-col bg-slate-950 text-white w-screen h-screen overflow-hidden select-none"
      style={{ animation: 'cinemaFadeIn 0.2s ease-out' }}
    >

      {/* ─── 1. TOP CLASSROOM HEADER BAR ──────────────────────────────────────── */}
      <header className="flex-shrink-0 h-14 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800/80 px-3 sm:px-6 flex items-center justify-between gap-3 z-30 shadow-md">
        
        {/* Left: Back/Close & Title */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
          <button
            onClick={() => {
              if (document.fullscreenElement) {
                try { screen.orientation?.unlock?.() } catch {}
                document.exitFullscreen?.().catch(() => {})
              }
              onClose()
            }}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-red-600/90 text-slate-300 hover:text-white transition-all flex items-center gap-1 shrink-0 group cursor-pointer"
            title="Exit Classroom (Esc)"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-xs font-bold hidden sm:inline">Back</span>
          </button>

          <div className="h-5 w-px bg-slate-800 hidden sm:block" />

          <div className="min-w-0 flex-1">
            <h1 className="text-xs sm:text-sm font-black text-white leading-tight truncate tracking-tight">
              {card.title}
            </h1>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {card.subject && (
                <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-md">
                  <BookOpen className="h-2.5 w-2.5" /> {card.subject}
                </span>
              )}
              {isPlaylist && (
                <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-sky-400 bg-sky-400/10 border border-sky-400/20 px-2 py-0.5 rounded-md">
                  <ListVideo className="h-2.5 w-2.5" /> Playlist
                </span>
              )}
              {card.is_featured && (
                <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-purple-400 bg-purple-400/10 border border-purple-400/20 px-2 py-0.5 rounded-md">
                  <Sparkles className="h-2.5 w-2.5" /> Featured
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions (Save/Bookmark & Landscape Fullscreen) */}
        <div className="flex items-center gap-2 shrink-0">
          {onBookmark && (
            <button
              onClick={handleBookmark}
              disabled={bookmarkLoading}
              title={isBookmarked ? 'Remove Bookmark' : 'Bookmark this lecture'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all duration-200 border cursor-pointer ${
                isBookmarked
                  ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/30 scale-105'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
              } ${bookmarkLoading ? 'opacity-60 cursor-wait' : ''}`}
            >
              <Heart className={`h-3.5 w-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
              <span className="hidden md:inline">{isBookmarked ? 'Saved' : 'Save'}</span>
            </button>
          )}

          <button
            onClick={handleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Landscape Cinema Fullscreen'}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* ─── 2. MAIN THEATER CLASSROOM STAGE ───────────────────────────────────── */}
      <main className="flex-1 w-full bg-black relative flex items-center justify-center overflow-hidden">
        {embedUrl ? (
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            
            {/* The Video Iframe */}
            <iframe
              ref={containerRef}
              src={embedUrl}
              title={card.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              className="w-full h-full border-0 block object-contain"
              style={{ backgroundColor: '#000' }}
            />

            {/* ─── YOUTUBE BRANDING COVER & SHIELDS ─────────────────────────── */}
            {isYoutube && (
              <>
                {/* 🛡️ Sleek Brand Badge Covering YouTube Logo (Bottom-Right) */}
                <div
                  className="absolute bottom-2.5 right-2.5 sm:bottom-4 sm:right-4 z-20 pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950/95 border border-slate-700/80 text-white shadow-xl backdrop-blur-md select-none"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-[10px] sm:text-xs font-black tracking-wide text-slate-200">
                    Thoughtful&apos;s Academy
                  </span>
                </div>

                {/* Shield 1: Top-Left Title Click Absorber */}
                <div
                  aria-hidden="true"
                  className="absolute top-0 left-0 w-[70%] h-14 z-20 bg-transparent cursor-default"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
                  onPointerDown={(e) => e.stopPropagation()}
                />

                {/* Shield 2: Top-Right Share Click Absorber */}
                <div
                  aria-hidden="true"
                  className="absolute top-0 right-0 w-[240px] h-14 z-20 bg-transparent cursor-default"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
                  onPointerDown={(e) => e.stopPropagation()}
                />

                {/* Shield 3: Bottom-Right YouTube Logo Click Absorber */}
                <div
                  aria-hidden="true"
                  className="absolute bottom-0 right-0 w-[240px] h-16 z-10 bg-transparent cursor-default"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
                  onPointerDown={(e) => e.stopPropagation()}
                />
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-500 gap-3">
            <ExternalLink className="h-12 w-12 text-slate-700" />
            <p className="text-sm">Video lecture unavailable</p>
          </div>
        )}
      </main>

      {/* ─── 3. BOTTOM CLASSROOM FOOTER INFO ──────────────────────────────────── */}
      {card.description && (
        <footer className="flex-shrink-0 bg-slate-900/90 border-t border-slate-800 px-4 py-2 sm:px-6 flex items-center justify-between gap-4 text-xs text-slate-400">
          <p className="line-clamp-1 leading-snug">{card.description}</p>
          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold shrink-0 hidden sm:block">
            {isPlaylist ? 'PLAYLIST LECTURE' : 'VIDEO LECTURE'}
          </span>
        </footer>
      )}

      {/* ─── Animation Keyframes ────────────────────────────────────────────── */}
      <style>{`
        @keyframes cinemaFadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>

    </div>
  )
}
