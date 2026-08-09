import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useSearchParams, useNavigate, useLocation, Link } from 'react-router-dom'
import {
  ArrowLeft, BookOpen, Heart, Maximize2, Minimize2,
  ListVideo, Sparkles, PlayCircle, ExternalLink,
  ChevronRight, ChevronLeft, ChevronDown, Layers, Clock, Search, Radio,
  Share2
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { normalizeUrl } from '../../utils/formatters'

// ─── Helper Functions ─────────────────────────────────────────────────────────

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

function getCardTypeTag(type) {
  if (type === 'youtube_playlist') return { label: 'Playlist Course', color: 'text-sky-700 bg-sky-50 border-sky-200' }
  if (type === 'drive') return { label: 'Study Notes', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' }
  if (type === 'external_link') return { label: 'External Resource', color: 'text-purple-700 bg-purple-50 border-purple-200' }
  return { label: 'Video Lecture', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' }
}

// Fetch YouTube Playlist RSS Feed to parse playlist items natively
async function fetchYouTubePlaylistVideos(listId) {
  if (!listId) return []
  const rssUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${listId}`
  
  const proxies = [
    `https://corsproxy.io/?${encodeURIComponent(rssUrl)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(rssUrl)}`
  ]

  for (const proxyUrl of proxies) {
    try {
      const res = await fetch(proxyUrl, { cache: 'force-cache' })
      if (!res.ok) continue
      const text = await res.text()
      const xml = new DOMParser().parseFromString(text, 'text/xml')
      const entries = Array.from(xml.querySelectorAll('entry'))
      
      if (entries.length > 0) {
        return entries.map((entry, idx) => {
          const videoId = entry.querySelector('videoId')?.textContent || 
                          entry.getElementsByTagName('yt:videoId')[0]?.textContent || 
                          ''
          const title = entry.querySelector('title')?.textContent || `Lecture ${idx + 1}`
          const thumb = entry.querySelector('thumbnail')?.getAttribute('url') || 
                        (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '')
          return { index: idx, videoId, title, thumb }
        })
      }
    } catch {
      // Continue to next proxy fallback
    }
  }
  return []
}

export default function WatchLecture() {
  const { cardId: paramCardId } = useParams()
  const [searchParams] = useSearchParams()
  const cardId = paramCardId || searchParams.get('cardId') || searchParams.get('id')
  
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  const playerContainerRef = useRef(null)

  const [card, setCard] = useState(location.state?.card || null)
  const [loading, setLoading] = useState(!location.state?.card)
  const [relatedCards, setRelatedCards] = useState([])
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [bookmarkLoading, setBookmarkLoading] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Playlist State
  const [playlistItems, setPlaylistItems] = useState([])
  const [playlistLoading, setPlaylistLoading] = useState(false)
  const [activeVideoIndex, setActiveVideoIndex] = useState(0)
  const [playlistSearch, setPlaylistSearch] = useState('')
  const [isPlaylistExpanded, setIsPlaylistExpanded] = useState(true)

  // Fetch card details if not passed in state
  useEffect(() => {
    if (!cardId) return
    let active = true

    setLoading(true)
    supabase
      .from('study_cards')
      .select('*')
      .eq('id', cardId)
      .maybeSingle()
      .then(({ data }) => {
        if (active) {
          setCard(data ?? null)
          setLoading(false)
        }
      })

    return () => { active = false }
  }, [cardId])

  // Fetch playlist videos if card is a youtube_playlist
  useEffect(() => {
    if (!card) return
    const listId = getYTPlaylistId(card.url)

    if (card.type === 'youtube_playlist' || listId) {
      setPlaylistLoading(true)
      fetchYouTubePlaylistVideos(listId).then(items => {
        setPlaylistItems(items)
        setPlaylistLoading(false)
        setActiveVideoIndex(0)
      })
    } else {
      setPlaylistItems([])
      setPlaylistLoading(false)
    }
  }, [card])

  // Fetch bookmark status for current user
  useEffect(() => {
    if (!user || !cardId) return
    supabase
      .from('student_bookmarks')
      .select('id')
      .eq('student_id', user.id)
      .eq('study_card_id', cardId)
      .maybeSingle()
      .then(({ data }) => setIsBookmarked(!!data))
  }, [user, cardId])

  // Fetch related video lectures from same subject/batch
  useEffect(() => {
    if (!card?.subject) return
    supabase
      .from('study_cards')
      .select('*')
      .eq('is_active', true)
      .eq('subject', card.subject)
      .neq('id', card.id)
      .or('type.eq.youtube_video,type.eq.youtube_playlist,type.like.youtube%')
      .limit(6)
      .then(({ data }) => setRelatedCards(data ?? []))
  }, [card?.subject, card?.id])

  // Toggle Bookmark
  const toggleBookmark = async () => {
    if (!user || bookmarkLoading || !card) return
    setBookmarkLoading(true)

    if (isBookmarked) {
      const { error } = await supabase
        .from('student_bookmarks')
        .delete()
        .eq('student_id', user.id)
        .eq('study_card_id', card.id)

      if (!error) {
        setIsBookmarked(false)
        toast.success('Removed from bookmarks')
      } else {
        toast.error(error.message)
      }
    } else {
      const { error } = await supabase
        .from('student_bookmarks')
        .upsert(
          { student_id: user.id, study_card_id: card.id },
          { onConflict: 'student_id,study_card_id', ignoreDuplicates: true }
        )

      if (!error) {
        setIsBookmarked(true)
        toast.success('Saved to bookmarks!')
      } else {
        toast.error(error.message)
      }
    }
    setBookmarkLoading(false)
  }

  // Landscape Cinema Fullscreen Toggle
  const handleFullscreen = useCallback(async () => {
    const el = playerContainerRef.current
    if (!el) return

    if (!document.fullscreenElement) {
      try {
        await el.requestFullscreen()
        try {
          await screen.orientation?.lock?.('landscape')
        } catch (err) { void err }
      } catch (err) { void err }
    } else {
      try { screen.orientation?.unlock?.() } catch (err) { void err }
      document.exitFullscreen?.().catch(() => {})
    }
  }, [])

  // Sync fullscreen state
  useEffect(() => {
    const handler = () => {
      const isFull = !!document.fullscreenElement
      setIsFullscreen(isFull)
      if (!isFull) {
        try { screen.orientation?.unlock?.() } catch (err) { void err }
      }
    }
    document.addEventListener('fullscreenchange', handler)
    return () => {
      document.removeEventListener('fullscreenchange', handler)
      try { screen.orientation?.unlock?.() } catch (err) { void err }
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3 shadow-md" />
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Loading Classroom…</p>
      </div>
    )
  }

  if (!card) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-center p-6 text-center">
        <div className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm mb-3">
          <BookOpen className="h-10 w-10 text-slate-400" />
        </div>
        <h2 className="text-lg font-black text-slate-900">Lecture Not Found</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mb-5">
          The requested video lecture could not be loaded or is no longer available.
        </p>
        <button
          onClick={() => navigate('/student/study')}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Return to Study Portal
        </button>
      </div>
    )
  }

  const isPlaylist = card.type === 'youtube_playlist' || !!getYTPlaylistId(card.url)
  const listId = getYTPlaylistId(card.url)
  const lockParams = 'autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&playsinline=1&enablejsapi=1'

  // Construct active embed URL
  let embedUrl = ''
  if (isPlaylist) {
    if (playlistItems.length > 0 && playlistItems[activeVideoIndex]?.videoId) {
      embedUrl = `https://www.youtube.com/embed/${playlistItems[activeVideoIndex].videoId}?${lockParams}`
    } else if (listId) {
      embedUrl = `https://www.youtube.com/embed/videoseries?list=${listId}&index=${activeVideoIndex}&${lockParams}`
    }
  } else {
    const videoId = getYTVideoId(card.url)
    if (videoId) {
      embedUrl = `https://www.youtube.com/embed/${videoId}?${lockParams}`
    } else if (card.type === 'drive' || card.url?.includes('drive.google.com')) {
      embedUrl = card.url.replace(/\/view(\?.*)?$/, '/preview').replace(/\/edit(\?.*)?$/, '/preview')
    } else {
      embedUrl = card.url
    }
  }

  const returnSubject = location.state?.returnSubject || searchParams.get('returnSubject') || card?.subject || ''

  const handleGoBack = () => {
    if (document.fullscreenElement) {
      try { screen.orientation?.unlock?.() } catch (err) { void err }
      document.exitFullscreen?.().catch(() => {})
    }
    if (window.history.length > 1 && window.history.state?.idx > 0) {
      navigate(-1)
    } else if (returnSubject) {
      navigate(`/student/study?subject=${encodeURIComponent(returnSubject)}&category=video`, { replace: true })
    } else {
      navigate('/student/study', { replace: true })
    }
  }

  const handleShare = async () => {
    const shareData = {
      title: card?.title || 'Study Card',
      text: `Watch ${card?.title} on Thoughtful's Academy`,
      url: window.location.href,
    }
    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch { /* User cancelled share */ }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href)
        toast.success('Lecture link copied to clipboard!')
      } catch {
        toast.error('Could not copy link')
      }
    }
  }

  const activePlaylistItem = playlistItems[activeVideoIndex]
  const currentTitle = activePlaylistItem?.title || card.title

  const filteredPlaylistItems = playlistItems.filter(item =>
    item.title.toLowerCase().includes(playlistSearch.toLowerCase())
  )

  return (
    // ─── STANDALONE APPLICATION CLASSROOM WITH DISTINCT PLAYLIST CONSOLE ───────
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans select-none overflow-x-hidden">

      {/* ─── 1. MINIMAL SLEEK LIGHT HEADER ──────────────────────────────────── */}
      <header className="flex-shrink-0 h-12 sm:h-14 bg-white/95 backdrop-blur-md border-b border-slate-200 px-2.5 sm:px-5 flex items-center justify-between gap-2 z-30 sticky top-0 shadow-xs">
        
        {/* Left Section: Back Arrow + Subject Pill + Truncated Title */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={handleGoBack}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all flex items-center shrink-0 cursor-pointer border border-slate-200"
            title={returnSubject ? `Back to ${returnSubject}` : 'Back to Study Portal'}
          >
            <ArrowLeft className="h-4 w-4 text-indigo-600" />
          </button>

          {card.subject && (
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-md shrink-0">
              {card.subject}
            </span>
          )}

          <h1 className="text-xs sm:text-sm font-bold text-slate-900 truncate min-w-0 flex-1 tracking-tight">
            {card.title}
          </h1>
        </div>

        {/* Right Section: Minimal Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleShare}
            title="Share Lecture"
            className="p-1.5 sm:p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 transition-all cursor-pointer"
          >
            <Share2 className="h-4 w-4 text-indigo-600" />
          </button>

          <button
            onClick={toggleBookmark}
            disabled={bookmarkLoading}
            className={`p-1.5 sm:px-3 sm:py-1.5 rounded-xl font-bold text-xs transition-all border flex items-center gap-1 cursor-pointer ${
              isBookmarked
                ? 'bg-rose-500 border-rose-600 text-white shadow-xs'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
            title={isBookmarked ? 'Bookmarked' : 'Bookmark'}
          >
            <Heart className={`h-4 w-4 ${isBookmarked ? 'fill-current text-white' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">{isBookmarked ? 'Saved' : 'Save'}</span>
          </button>
        </div>
      </header>

      {/* ─── 2. RESPONSIVE FLEX & GRID MAIN CONTAINER ────────────────────────── */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-2 sm:p-3.5 lg:p-5 grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3.5 items-start">
        
        {/* Main Cinema Video Column (8 cols desktop if playlist, 12 if single video) */}
        <div className={`${isPlaylist ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-2.5 sm:space-y-3`}>
          
          {/* Cinema Frame Container (Crisp Black Stage for Pure Video Streaming) */}
          <div
            ref={playerContainerRef}
            className="w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-xl border border-slate-800 relative group"
          >
            {card.type === 'drive' ? (
              /* Google Drive Document Stage */
              <iframe
                src={embedUrl}
                title={card.title}
                className="w-full h-full border-0 relative z-10 block bg-slate-900"
              />
            ) : embedUrl ? (
              /* Video / Playlist Clean Player */
              <iframe
                src={embedUrl}
                title={currentTitle}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
                className="w-full h-full border-0 relative z-10 block bg-black"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-500 gap-2 p-6 text-center h-full relative z-10">
                <ExternalLink className="h-10 w-10 text-slate-600" />
                <p className="text-xs font-bold text-slate-400">Video lecture stream unavailable</p>
              </div>
            )}
          </div>

          {/* ─── PLAYLIST QUICK IN-APP CONTROLS (NEXT/PREV BAR) ──────────────── */}
          {isPlaylist && (
            <div className="bg-white rounded-2xl p-2.5 sm:p-3 border border-slate-200 shadow-xs flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 shrink-0">
                  <ListVideo className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] font-black uppercase tracking-wider text-sky-700 block">
                    Playlist Video #{activeVideoIndex + 1} of {playlistItems.length || 'Series'}
                  </span>
                  <h3 className="text-xs font-bold text-slate-900 truncate max-w-[200px] sm:max-w-md">
                    {currentTitle}
                  </h3>
                </div>
              </div>

              {/* Prev / Next Buttons */}
              <div className="flex items-center gap-1.5 ml-auto">
                <button
                  disabled={activeVideoIndex === 0}
                  onClick={() => setActiveVideoIndex(prev => Math.max(0, prev - 1))}
                  className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-slate-700 transition-all flex items-center gap-1 cursor-pointer border border-slate-200"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Previous</span>
                </button>

                <button
                  disabled={playlistItems.length > 0 && activeVideoIndex >= playlistItems.length - 1}
                  onClick={() => setActiveVideoIndex(prev => prev + 1)}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-700 hover:to-blue-800 text-white font-black text-xs transition-all shadow-md flex items-center gap-1 cursor-pointer"
                >
                  <span>Next Video</span> <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ─── WIDE FULL SCREEN BUTTON (Directly below video panel, above title card) ─── */}
          <button
            onClick={handleFullscreen}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-950 via-indigo-900 to-blue-950 hover:from-blue-900 hover:to-indigo-800 text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-md border border-indigo-900/50 transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer active:scale-[0.99]"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="h-5 w-5 text-amber-400 shrink-0" />
                <span>Exit Full Screen</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-5 w-5 text-amber-400 shrink-0" />
                <span>Full Screen</span>
              </>
            )}
          </button>

          {/* Lecture Info & Notes Box */}
          <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200 shadow-xs space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div>
                <h2 className="text-sm sm:text-lg font-black text-slate-900 tracking-tight">
                  {card.title}
                </h2>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 flex-wrap">
                  {card.created_at && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-400" />
                      {new Date(card.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-indigo-700 font-bold">
                    <Sparkles className="h-3 w-3" /> Thoughtful&apos;s Academy Lecture
                  </span>
                </div>
              </div>

              {card.type === 'external_link' && (
                <a
                  href={normalizeUrl(card.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-black rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-1.5 shrink-0 self-start sm:self-center"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Open Resource
                </a>
              )}
            </div>

            {/* Description / Lecture Notes */}
            {card.description && (
              <div className="space-y-1 pt-0.5">
                <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Overview &amp; Notes</h4>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                  {card.description}
                </p>
              </div>
            )}
          </div>

        </div>

        {/* Right Drawer Column (4 cols desktop if playlist, 12 if single video) */}
        <div className={`${isPlaylist ? 'lg:col-span-4' : 'lg:col-span-12'} space-y-2.5 sm:space-y-3`}>
          
          {/* ─── DISTINCT HIGH-CONTRAST PLAYLIST CONSOLE (COLLAPSIBLE ACCORDION) ─── */}
          {isPlaylist && (
            <div className={`bg-slate-950 rounded-2xl border border-slate-800/90 shadow-xl overflow-hidden flex flex-col transition-all duration-300 ${
              isPlaylistExpanded ? 'h-[480px] lg:h-[520px]' : 'h-auto'
            }`}>
              
              {/* Drawer Clickable Top Header */}
              <button
                type="button"
                onClick={() => setIsPlaylistExpanded(prev => !prev)}
                className={`w-full p-3.5 bg-slate-950 hover:bg-slate-900/90 text-left transition-colors ${isPlaylistExpanded ? 'border-b border-slate-800' : ''} space-y-2 cursor-pointer`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-400/15 text-amber-400 border border-amber-400/30">
                      <ListVideo className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                        Playlist Video Queue
                        <ChevronDown className={`h-3.5 w-3.5 text-amber-400 transition-transform duration-300 ${isPlaylistExpanded ? 'rotate-180' : ''}`} />
                      </h3>
                      <p className="text-[10px] text-slate-400 font-semibold">
                        {isPlaylistExpanded
                          ? (playlistItems.length > 0 ? `${playlistItems.length} Lectures in Playlist` : 'Course Console')
                          : 'Tap to expand playlist queue'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black bg-amber-400/15 text-amber-300 border border-amber-400/30 px-2.5 py-0.5 rounded-full">
                    {activeVideoIndex + 1} / {playlistItems.length || '—'}
                  </span>
                </div>

                {/* Filter Input */}
                {isPlaylistExpanded && playlistItems.length > 3 && (
                  <div className="relative pt-1" onClick={e => e.stopPropagation()}>
                    <Search className="h-3.5 w-3.5 absolute left-2.5 top-[calc(50%+2px)] -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={playlistSearch}
                      onChange={e => setPlaylistSearch(e.target.value)}
                      placeholder="Search playlist lectures..."
                      className="w-full bg-slate-900 text-xs text-white placeholder-slate-500 pl-7 pr-2.5 py-1.5 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30"
                    />
                  </div>
                )}
              </button>

              {/* Scrollable Video Queue List */}
              {isPlaylistExpanded && (
                <div className="flex-1 overflow-y-auto p-2.5 space-y-2 custom-scrollbar">
                  {playlistLoading ? (
                    <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                      <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-[11px] font-semibold">Loading Playlist Videos…</p>
                    </div>
                  ) : filteredPlaylistItems.length > 0 ? (
                    filteredPlaylistItems.map(item => {
                      const isActive = item.index === activeVideoIndex
                      return (
                        <button
                          key={item.index}
                          onClick={() => setActiveVideoIndex(item.index)}
                          className={`w-full p-2.5 rounded-xl text-left transition-all flex items-center gap-3 group cursor-pointer border ${
                            isActive
                              ? 'bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 border-amber-400 shadow-xl ring-2 ring-amber-400/30 scale-[1.01]'
                              : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 hover:border-slate-600 hover:scale-[1.01]'
                          }`}
                        >
                          {/* Thumbnail / Index Badge */}
                          <div className="relative w-18 h-11 rounded-lg overflow-hidden bg-slate-950 shrink-0 border border-slate-700 group-hover:scale-105 transition-transform">
                            {item.thumb ? (
                              <img src={item.thumb} alt={item.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-400 text-[10px] font-black">
                                #{item.index + 1}
                              </div>
                            )}
                            <span className={`absolute bottom-0.5 left-0.5 text-[8px] font-black px-1 rounded ${
                              isActive ? 'bg-amber-400 text-slate-950' : 'bg-slate-950/90 text-white'
                            }`}>
                              #{item.index + 1}
                            </span>
                            {isActive && (
                              <div className="absolute inset-0 bg-amber-400/20 backdrop-blur-xs flex items-center justify-center text-amber-300">
                                <Radio className="h-4 w-4 animate-pulse text-amber-400" />
                              </div>
                            )}
                          </div>

                          {/* Title & Playing Status */}
                          <div className="min-w-0 flex-1">
                            <h4 className={`text-xs font-bold line-clamp-2 transition-colors ${
                              isActive ? 'text-amber-300 font-extrabold' : 'text-slate-200 group-hover:text-amber-300'
                            }`}>
                              {item.title}
                            </h4>
                            {isActive ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-amber-400 mt-1 bg-amber-400/10 px-1.5 py-0.2 rounded border border-amber-400/20">
                                <Radio className="h-2 w-2 animate-spin" /> Playing Now
                              </span>
                            ) : (
                              <span className="text-[9px] text-slate-400 mt-0.5 block group-hover:text-slate-300">
                                Tap to stream video
                              </span>
                            )}
                          </div>
                        </button>
                      )
                    })
                  ) : (
                    <div className="p-4 text-center">
                      <p className="text-xs text-slate-400">
                        Use the <strong>Next Video</strong> and <strong>Previous</strong> buttons above to switch playlist videos.
                      </p>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* MORE LECTURES IN SAME SUBJECT */}
          {relatedCards.length > 0 && (
            <div className="bg-gradient-to-br from-slate-200/90 via-indigo-100/85 to-blue-100/90 rounded-2xl p-3.5 border border-indigo-300/70 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between border-b border-indigo-200/80 pb-2">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-indigo-700" /> More Lectures in {card.subject}
                </h3>
                <Link
                  to={`/student/study?subject=${encodeURIComponent(card.subject || '')}&category=video`}
                  className="text-[10px] text-indigo-700 hover:underline flex items-center gap-0.5 font-bold"
                >
                  View all <ChevronRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="space-y-1.5">
                {relatedCards.slice(0, 4).map(rc => (
                  <button
                    key={rc.id}
                    onClick={() => {
                      setCard(rc)
                      navigate(`/student/watch/${rc.id}`, { state: { card: rc }, replace: true })
                    }}
                    className="w-full p-2.5 bg-white hover:bg-indigo-100/70 border border-slate-200/90 hover:border-indigo-300 transition-all rounded-xl text-left flex items-center justify-between gap-2.5 group cursor-pointer shadow-2xs"
                  >
                    <div className="min-w-0">
                      {(() => {
                        const tag = getCardTypeTag(rc.type)
                        return (
                          <span className={`text-[8px] font-black uppercase border px-1.5 py-0.2 rounded ${tag.color}`}>
                            {tag.label}
                          </span>
                        )
                      })()}
                      <h4 className="text-xs font-bold text-slate-800 truncate mt-0.5 group-hover:text-indigo-600 transition-colors">
                        {rc.title}
                      </h4>
                    </div>
                    <PlayCircle className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 shrink-0 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

      </main>

    </div>
  )
}
