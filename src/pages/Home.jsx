import { useState, useEffect, useRef, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap, PlayCircle, ExternalLink, BookOpen, Bell,
  ChevronLeft, ChevronRight, Mail, Youtube, ArrowRight,
  Video, MessageSquare, CheckCircle2, Sparkles, Clock,
  Flame, ShieldCheck, Check, Compass, LogIn
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import {
  INSTITUTE_NAME, INSTITUTE_TAGLINE, CONTACT_EMAIL,
} from '../lib/constants'
import { getYouTubeThumbnail } from '../utils/formatters'
import DriveImage from '../components/shared/DriveImage'
import InstallHeaderButton from '../components/InstallHeaderButton'

function getThumbnail(url) {
  return getYouTubeThumbnail(url)
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7)  return `${d}d ago`
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

// Opacity-driven notification category styles inspired by Lovable
const NOTIF_STYLES = {
  fee:          { border: 'border-l-indigo-500', label: 'Fee',          bg: 'bg-indigo-100 text-indigo-900 border border-indigo-200' },
  live_class:   { border: 'border-l-red-500',    label: 'Live Class',   bg: 'bg-red-100 text-red-900 border border-red-200' },
  announcement: { border: 'border-l-blue-500',   label: 'Announcement', bg: 'bg-blue-100 text-blue-900 border border-blue-200' },
  homework:     { border: 'border-l-purple-500', label: 'Homework',     bg: 'bg-purple-100 text-purple-900 border border-purple-200' },
  general:      { border: 'border-l-[#1c1c1c]',  label: 'Notice',       bg: 'bg-[#1c1c1c]/10 text-[#1c1c1c] border border-[#1c1c1c]/15' },
}

const CONTAINER = 'max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8'

// Signature Lovable button classes
const BTN_PRIMARY = 'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#1c1c1c] hover:bg-[#2c2c2c] text-[#fcfbf8] font-medium text-sm transition-all duration-150 shadow-[inset_0px_0.5px_0px_rgba(255,255,255,0.2),inset_0px_0px_0px_0.5px_rgba(0,0,0,0.2),0px_1px_2px_rgba(0,0,0,0.05)] active:opacity-85'
const BTN_OUTLINE = 'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-white hover:bg-[#1c1c1c]/5 text-[#1c1c1c] font-medium text-sm border border-[#1c1c1c]/30 hover:border-[#1c1c1c] transition-all duration-150 active:opacity-85 shadow-2xs'

// ─── SKELETON CARD ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-[#eceae4] overflow-hidden animate-pulse flex flex-col w-full h-[320px] justify-between shadow-xs">
      <div className="bg-[#eceae4]/70 aspect-video w-full" />
      <div className="p-4 flex flex-col justify-between flex-1">
        <div className="space-y-2 mb-3">
          <div className="h-4 bg-[#eceae4] rounded-md w-5/6" />
          <div className="h-3 bg-[#eceae4]/60 rounded-md w-2/3" />
        </div>
        <div className="pt-3 border-t border-[#eceae4] mt-auto flex items-center justify-between">
          <div className="h-4 bg-[#eceae4] rounded-md w-24" />
          <div className="h-4 bg-[#eceae4] rounded-md w-16" />
        </div>
      </div>
    </div>
  )
}

// ─── BATCH POSTER CARD (Lovable Style) ────────────────────────────────────────

function BatchPosterCard({ batch, index = 0, isDraggingRef }) {
  const PALETTES = [
    'from-[#1c1c1c] via-[#2d2d2d] to-[#1c1c1c]',
    'from-[#1e293b] via-[#334155] to-[#0f172a]',
    'from-[#1e1b4b] via-[#312e81] to-[#1e1b4b]',
    'from-[#064e3b] via-[#065f46] to-[#022c22]',
  ]
  const palette = PALETTES[index % PALETTES.length]

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.18 }}
      className="group block flex-shrink-0 w-[214px] sm:w-[235px] lg:w-[255px] max-w-[265px] snap-start select-none"
    >
      {/* Unified Grouped Card with Visible Border wrapping Poster + Button (10% larger) */}
      <Link
        to={`/batch-details?id=${batch.id}`}
        onClick={(e) => {
          if (isDraggingRef?.current) {
            e.preventDefault()
          }
        }}
        className="block rounded-2xl p-2.5 bg-gradient-to-b from-[#18181d] via-[#131317] to-[#0d0d10] border border-white/20 group-hover:border-indigo-400/80 ring-1 ring-white/10 group-hover:ring-indigo-500/30 shadow-[0_12px_28px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.14)] group-hover:shadow-[0_16px_36px_rgba(99,102,241,0.25),inset_0_1px_0_rgba(255,255,255,0.22)] transition-all duration-300"
      >
        {/* Poster Media Box (10% larger aspect-3/4 frame) */}
        <div className="relative rounded-xl overflow-hidden aspect-[3/4] bg-[#0c0c0e] flex items-center justify-center border border-white/10 group-hover:border-white/20 transition-colors">
          {batch.poster_url?.trim() ? (
            <DriveImage
              src={batch.poster_url.trim()}
              alt={batch.name}
              loading="lazy"
              className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-[1.03] pointer-events-none"
              fallback={
                <div className={`absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center bg-gradient-to-br ${palette}`}>
                  <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/20">
                    <span className="text-xl font-bold text-white">{batch.name?.charAt(0)?.toUpperCase()}</span>
                  </div>
                  <span className="text-white font-semibold text-xs leading-tight px-2">{batch.name}</span>
                </div>
              }
            />
          ) : (
            <div className={`absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center bg-gradient-to-br ${palette}`}>
              <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/20">
                <span className="text-xl font-bold text-white">{batch.name?.charAt(0)?.toUpperCase()}</span>
              </div>
              <span className="text-white font-semibold text-xs leading-tight px-2">{batch.name}</span>
            </div>
          )}

          {/* Clean Pill Badge */}
          <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5 bg-black/80 backdrop-blur-md text-[#fcfbf8] text-[10.5px] font-semibold tracking-wider px-2.5 py-0.5 rounded-full border border-white/20 shadow-md">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE
          </div>

          {/* Hover Overlay */}
          <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-300">
              View Syllabus <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>

        {/* Grouped Button Below - Unified within the Card Border */}
        <div className="mt-2.5 px-3 py-2.5 rounded-xl bg-white/[0.05] group-hover:bg-indigo-500/20 border border-white/10 group-hover:border-indigo-400/40 backdrop-blur-sm transition-all duration-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-xs sm:text-sm font-bold text-white tracking-tight truncate group-hover:text-indigo-200 transition-colors">
              {batch.name}
            </span>
          </div>
          <div className="w-5 h-5 rounded-full bg-white/10 group-hover:bg-indigo-500/30 flex items-center justify-center transition-colors shrink-0">
            <ArrowRight className="w-3 h-3 text-white/70 group-hover:text-indigo-200 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

// ─── RUNNING BATCHES SECTION (Gradient Black Aesthetic & Swipe Carousel) ──

function BatchPostersSection({ batches }) {
  if (!batches.length) return null

  const scrollRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const isMouseDownRef = useRef(false)
  const isDraggingRef = useRef(false)
  const startXRef = useRef(0)
  const scrollStartRef = useRef(0)

  const updateScrollState = () => {
    const el = scrollRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    setCanScrollLeft(scrollLeft > 10)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)

    // Calculate approximate active index
    const cardStep = 240
    const idx = Math.round(scrollLeft / cardStep)
    setActiveIndex(Math.min(Math.max(idx, 0), batches.length - 1))
  }

  useEffect(() => {
    updateScrollState()
    const el = scrollRef.current
    if (!el) return

    el.addEventListener('scroll', updateScrollState, { passive: true })
    window.addEventListener('resize', updateScrollState)
    return () => {
      el.removeEventListener('scroll', updateScrollState)
      window.removeEventListener('resize', updateScrollState)
    }
  }, [batches])

  const scroll = (direction) => {
    if (!scrollRef.current) return
    const distance = direction === 'left' ? -260 : 260
    scrollRef.current.scrollBy({ left: distance, behavior: 'smooth' })
  }

  const scrollToSlide = (idx) => {
    if (!scrollRef.current) return
    const cardStep = 250
    scrollRef.current.scrollTo({ left: idx * cardStep, behavior: 'smooth' })
  }

  // Mouse Drag to Scroll handlers (for desktop horizontal swipe)
  const onMouseDown = (e) => {
    if (!scrollRef.current) return
    isMouseDownRef.current = true
    isDraggingRef.current = false
    startXRef.current = e.pageX - scrollRef.current.offsetLeft
    scrollStartRef.current = scrollRef.current.scrollLeft
  }

  const onMouseMove = (e) => {
    if (!isMouseDownRef.current || !scrollRef.current) return
    const currentX = e.pageX - scrollRef.current.offsetLeft
    const diff = currentX - startXRef.current
    if (Math.abs(diff) > 6) {
      isDraggingRef.current = true
    }
    scrollRef.current.scrollLeft = scrollStartRef.current - diff
  }

  const onMouseUp = () => {
    isMouseDownRef.current = false
    setTimeout(() => {
      isDraggingRef.current = false
    }, 50)
  }

  const onMouseLeave = () => {
    isMouseDownRef.current = false
    isDraggingRef.current = false
  }

  return (
    <section
      id="batches"
      className="relative overflow-hidden py-14 sm:py-20 border-y border-white/10 bg-[#09090b] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-1px_0_rgba(255,255,255,0.04)]"
      style={{
        background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(99, 102, 241, 0.15) 0%, rgba(30, 27, 75, 0.12) 35%, transparent 70%), linear-gradient(180deg, #09090b 0%, #121215 50%, #09090b 100%)',
      }}
    >
      {/* Architectural Dot Matrix Texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.045]"
        style={{
          backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Atmospheric Ambient Spotlights */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-indigo-600/15 via-blue-600/5 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-80 h-80 bg-gradient-to-tl from-purple-600/10 via-indigo-600/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className={`${CONTAINER} relative z-10`}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-10">
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-10 rounded-full bg-gradient-to-b from-indigo-400 to-indigo-600 mt-1 shrink-0 shadow-[0_0_12px_rgba(99,102,241,0.5)]" />
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-white/10 border border-white/15 text-white shadow-2xs backdrop-blur-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  Active Cohorts ({batches.length})
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium text-emerald-300 bg-emerald-950/70 border border-emerald-500/30 shadow-2xs backdrop-blur-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Admissions Open
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Running Batches
              </h2>
              <p className="text-xs sm:text-sm text-[#a1a1aa] mt-1 max-w-xl leading-relaxed">
                Current ongoing cohorts with live classes, structured timetable, and personal mentorship.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            {/* Horizontal Swipe Controls for Multiple Posters */}
            {batches.length > 1 && (
              <div className="flex items-center gap-1 bg-white/[0.06] p-1 rounded-xl border border-white/15 backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => scroll('left')}
                  disabled={!canScrollLeft}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all"
                  aria-label="Swipe left"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scroll('right')}
                  disabled={!canScrollRight}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all"
                  aria-label="Swipe right"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <Link
              to="/batch-details"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/20 bg-white/10 hover:bg-white hover:text-[#1c1c1c] text-xs font-semibold text-white transition-all shadow-xs backdrop-blur-md group"
            >
              <span>Explore All Batches</span>
              <ArrowRight className="h-3.5 w-3.5 text-white/70 group-hover:text-[#1c1c1c] group-hover:translate-x-0.5 transition-all" />
            </Link>
          </div>
        </div>

        {/* Horizontal Swipe Carousel Track */}
        <div className="relative">
          <div
            ref={scrollRef}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseLeave}
            className="flex gap-4 sm:gap-6 overflow-x-auto pt-3 pb-4 -mt-2 px-4 sm:px-6 -mx-4 sm:-mx-6 snap-x snap-mandatory scroll-smooth overscroll-x-contain touch-pan-x cursor-grab active:cursor-grabbing [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:none]"
          >
            {batches.map((b, i) => (
              <BatchPosterCard
                key={b.id}
                batch={b}
                index={i}
                isDraggingRef={isDraggingRef}
              />
            ))}
          </div>
        </div>

        {/* Swipe Indicators / Dots for other posters */}
        {batches.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-3">
            {batches.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => scrollToSlide(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  activeIndex === idx ? 'w-6 bg-indigo-400' : 'w-1.5 bg-white/25 hover:bg-white/50'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

// ─── LECTURE CARD (Framer Spring & Bezel Design) ─────────────────────────────

function LectureCard({ card, isFeaturedCard = false }) {
  const navigate = useNavigate()
  const thumb = card.thumbnail_url || getThumbnail(card.url)
  const isExternal = card.type === 'external_link'
  const desc = card.description?.trim() || ''

  const handleOpen = (e) => {
    if (e) e.stopPropagation()
    if (!isExternal) {
      navigate(`/watch/${card.id}`, { state: { card } })
    } else {
      window.open(card.url, '_blank', 'noopener,noreferrer')
    }
  }

  const handleCardClick = (e) => {
    if (e.target.closest('a') || e.target.closest('button')) return
    handleOpen()
  }

  return (
    <motion.div
      whileHover={{ y: -5, transition: { type: 'spring', stiffness: 350, damping: 25 } }}
      whileTap={{ scale: 0.98 }}
      onClick={handleCardClick}
      className={`group relative bg-white rounded-2xl border ${
        isFeaturedCard
          ? 'border-white/20 hover:border-indigo-400/80 shadow-[0_10px_30px_rgba(0,0,0,0.5)] hover:shadow-[0_18px_40px_rgba(99,102,241,0.25)]'
          : 'border-[#e2ddd1] hover:border-[#1c1c1c]'
      } overflow-hidden transition-all duration-300 flex flex-col w-full h-full justify-between cursor-pointer shadow-[0_4px_20px_rgba(28,28,28,0.04)] hover:shadow-[0_16px_36px_rgba(28,28,28,0.09)] p-2 sm:p-2.5`}
    >
      {/* Thumbnail Frame */}
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-[#141414] shrink-0">
        {thumb ? (
          <img
            src={thumb}
            alt={card.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-[#f7f4ed] flex items-center justify-center">
            <BookOpen className="h-8 w-8 text-[#5f5f5d]/60" />
          </div>
        )}

        {/* Ambient dark vignette on hover */}
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/35 transition-colors duration-300 pointer-events-none" />

        {/* Centered Play Trigger */}
        {!isExternal ? (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-11 h-11 rounded-full bg-white text-[#1c1c1c] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 border border-white/50">
              <PlayCircle className="h-5 w-5 ml-0.5 text-[#1c1c1c]" />
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <ExternalLink className="h-4 w-4" />
            </div>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 pointer-events-none">
          {card.is_featured && (
            <span className="inline-flex items-center gap-1 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs border border-white/20">
              <Sparkles className="w-2.5 h-2.5 fill-white" />
              <span>Featured</span>
            </span>
          )}
          {card.subject && (
            <span className="bg-black/60 backdrop-blur-md text-white text-[10px] font-medium px-2 py-0.5 rounded-md border border-white/20">
              {card.subject}
            </span>
          )}
        </div>

        {/* Top Right: HD indicator */}
        <div className="absolute top-2 right-2 pointer-events-none">
          <span className="bg-black/60 backdrop-blur-md text-white/90 text-[9px] font-semibold px-1.5 py-0.5 rounded border border-white/10 uppercase tracking-wider">
            {!isExternal ? '1080p' : 'PDF'}
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-3 sm:p-3.5 flex flex-col justify-between flex-1 pt-3">
        <div>
          <h3 className="font-bold text-[#1c1c1c] text-sm leading-snug line-clamp-2 min-h-[2.5rem] tracking-tight group-hover:text-indigo-600 transition-colors">
            {card.title}
          </h3>
          <p className="text-xs text-[#5f5f5d] leading-relaxed line-clamp-2 mt-1 min-h-[2rem]">
            {desc || 'Structured video lecture for thorough conceptual clarity.'}
          </p>
        </div>

        {/* Card Footer Bar */}
        <div className="pt-3 border-t border-[#f0ede6] shrink-0 flex items-center justify-between mt-3">
          <span className="text-[11px] font-medium text-[#5f5f5d]">
            {!isExternal ? 'Free Video' : 'Reference Notes'}
          </span>

          <button
            type="button"
            onClick={handleOpen}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1c1c1c] group-hover:bg-[#2c2c2c] text-[#fcfbf8] text-[11px] font-semibold transition-all duration-200 shadow-2xs group-hover:shadow-xs active:scale-95 cursor-pointer"
          >
            {!isExternal ? (
              <>
                <Youtube className="h-3.5 w-3.5 text-red-400" />
                <span>Watch lecture</span>
              </>
            ) : (
              <>
                <ExternalLink className="h-3.5 w-3.5 text-blue-400" />
                <span>Open material</span>
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ─── NOTIFICATION ROW ─────────────────────────────────────────────────────────

function NotifRow({ n, isNew, compact = false }) {
  const style = NOTIF_STYLES[n.type] || NOTIF_STYLES.general
  return (
    <motion.div
      whileHover={{ backgroundColor: '#faf8f3' }}
      className={`${compact ? 'p-3.5' : 'p-4'} border-l-4 ${style.border} bg-white transition-colors`}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${style.bg}`}>
          {style.label}
        </span>
        {isNew(n.created_at) ? (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-red-600">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" /> New
          </span>
        ) : (
          <span className="text-[11px] text-[#5f5f5d]">{timeAgo(n.created_at)}</span>
        )}
      </div>
      <p className="text-xs sm:text-sm font-semibold text-[#1c1c1c] leading-snug">{n.title}</p>
      {n.body && <p className="text-xs text-[#5f5f5d] mt-1 leading-relaxed whitespace-pre-line">{n.body}</p>}
    </motion.div>
  )
}

// ─── WHAT'S ON CARD (Unified for Desktop Sidebar & Mobile Flow) ───────────────

function WhatsOnCard({ notifications, isNew, hasNew, isMobile = false }) {
  return (
    <div className="bg-white border border-[#e2ddd1] rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-shadow">
      {/* Framer Dark Header */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 bg-gradient-to-r from-[#141414] via-[#1c1c1c] to-[#262626] text-white">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-white/10 text-indigo-400 border border-white/10">
            <Bell className="h-4 w-4" />
            {hasNew && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500" />
              </span>
            )}
          </div>
          <div>
            <h2 className="font-bold text-sm sm:text-base text-white tracking-tight">
              What&apos;s on
            </h2>
            <p className="text-[10px] text-white/60 leading-none mt-0.5">Live Notice &amp; Alert Desk</p>
          </div>
        </div>

        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/90 border border-white/15">
          {notifications.length} {notifications.length === 1 ? 'Notice' : 'Notices'}
        </span>
      </div>

      {/* Content */}
      {notifications.length === 0 ? (
        <div className="px-5 py-8 sm:py-10 text-center bg-white">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200/60 text-indigo-600 flex items-center justify-center mx-auto mb-2.5 shadow-2xs">
            <Sparkles className="h-5 w-5 animate-pulse" />
          </div>
          <p className="text-xs sm:text-sm font-semibold text-[#1c1c1c]">No announcements right now.</p>
          <p className="text-[11px] text-[#5f5f5d] mt-1 max-w-xs mx-auto leading-relaxed">
            All upcoming test schedules, holiday updates, and live lecture links will appear here.
          </p>
        </div>
      ) : (
        <div
          className={`divide-y divide-[#eceae4] ${
            isMobile ? 'max-h-72' : 'max-h-[440px]'
          } overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:none]`}
        >
          {notifications.map(n => (
            <NotifRow key={n.id} n={n} isNew={isNew} compact={isMobile} />
          ))}
        </div>
      )}

      {/* Footer Link */}
      <div className="p-3 sm:p-3.5 bg-[#fbf9f4] border-t border-[#eceae4]">
        <Link
          to="/login"
          className="flex items-center justify-center gap-1.5 w-full py-2.5 px-4 rounded-xl bg-[#1c1c1c] hover:bg-[#2c2c2c] text-[#fcfbf8] text-xs font-semibold shadow-xs transition-colors group"
        >
          <span>Login to view all updates</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  )
}

// ─── MAIN HOME COMPONENT ──────────────────────────────────────────────────────

export default function Home() {
  const [notifications, setNotifications] = useState([])
  const [featured,      setFeatured]      = useState([])
  const [cards,         setCards]         = useState([])
  const [batches,       setBatches]       = useState([])
  const [batchPosters,  setBatchPosters]  = useState([])
  const [activeBatch,   setActiveBatch]   = useState('all')
  const [page,          setPage]          = useState(1)
  const [totalCards,    setTotalCards]    = useState(0)
  const [loading,       setLoading]       = useState(true)
  const [cols,          setCols]          = useState(2)
  const featRef = useRef(null)

  useEffect(() => {
    const updateCols = () => {
      const w = window.innerWidth
      if (w < 600) setCols(1)
      else if (w < 1200) setCols(2)
      else setCols(3)
    }
    updateCols()
    window.addEventListener('resize', updateCols)
    return () => window.removeEventListener('resize', updateCols)
  }, [])

  const scrollFeatured = (dir) => {
    if (featRef.current) {
      const amount = Math.min(320, featRef.current.clientWidth * 0.9)
      featRef.current.scrollBy({ left: dir * amount, behavior: 'smooth' })
    }
  }

  useEffect(() => {
    let cancelled = false
    supabase.from('notifications')
      .select('id, title, body, type, created_at, scheduled_at, expires_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (cancelled) return
        const nNow = new Date()
        const valid = (data ?? []).filter(n => {
          if (n.scheduled_at && new Date(n.scheduled_at) > nNow) return false
          if (n.expires_at   && new Date(n.expires_at)   < nNow) return false
          return true
        }).slice(0, 15)
        setNotifications(valid)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    supabase.from('study_cards')
      .select('*')
      .eq('is_active', true)
      .eq('is_featured', true)
      .order('display_order')
      .limit(10)
      .then(({ data }) => {
        if (cancelled) return
        setFeatured(data ?? [])
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    supabase.from('batches')
      .select('id, name')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        if (cancelled) return
        setBatches(data ?? [])
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    supabase.from('batches')
      .select('id, name, poster_url')
      .eq('is_active', true)
      .not('poster_url', 'is', null)
      .order('name')
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) return
        setBatchPosters((data ?? []).filter(b => b.poster_url?.trim()))
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    if (activeBatch === 'all') {
      supabase
        .from('study_cards')
        .select('*')
        .eq('is_active', true)
        .eq('is_public', true)
        .order('display_order')
        .then(({ data }) => {
          if (cancelled) return
          setCards(data ?? [])
          setTotalCards((data ?? []).length)
          setLoading(false)
        })
        .catch(() => {
          if (!cancelled) setLoading(false)
        })
    } else {
      supabase
        .from('study_cards')
        .select('*')
        .eq('is_active', true)
        .eq('is_public', true)
        .or(`batch_ids.cs.{${activeBatch}},batch_id.eq.${activeBatch}`)
        .order('display_order')
        .then(({ data, error }) => {
          if (cancelled) return
          if (error || !data) {
            supabase
              .from('study_cards')
              .select('*')
              .eq('is_active', true)
              .eq('is_public', true)
              .order('display_order')
              .then(({ data: fallbackData }) => {
                if (cancelled) return
                const matched = (fallbackData ?? []).filter(c =>
                  (Array.isArray(c.batch_ids) && c.batch_ids.includes(activeBatch)) ||
                  c.batch_id === activeBatch
                )
                setCards(matched)
                setTotalCards(matched.length)
                setLoading(false)
              })
              .catch(() => {
                if (!cancelled) setLoading(false)
              })
          } else {
            setCards(data ?? [])
            setTotalCards(data.length)
            setLoading(false)
          }
        })
        .catch(() => {
          if (!cancelled) setLoading(false)
        })
    }
    return () => { cancelled = true }
  }, [activeBatch])

  const dynamicPageSize = useMemo(() => {
    const total = cards.length
    if (!total || total <= 0) return cols * 2
    for (let r = 2; r <= 4; r++) {
      const size = r * cols
      if (total % size === 0) return size
    }
    if (cols === 1 && total % 5 === 0 && total >= 5) return 5
    return cols * 2
  }, [cards.length, cols])

  const totalPages = Math.max(1, Math.ceil(cards.length / dynamicPageSize))

  useEffect(() => {
    if (page > totalPages) setPage(1)
  }, [totalPages, page])

  const visibleCards = useMemo(() => {
    const from = (page - 1) * dynamicPageSize
    return cards.slice(from, from + dynamicPageSize)
  }, [cards, page, dynamicPageSize])

  const now = Date.now()
  const isNew = (d) => now - new Date(d).getTime() < 86400000
  const hasNew = notifications.some(n => isNew(n.created_at))

  return (
    <div
      className="min-h-screen bg-[#f7f4ed] text-[#1c1c1c] font-sans antialiased selection:bg-[#1c1c1c] selection:text-[#fcfbf8] overflow-x-hidden"
      style={{ zoom: 1.2 }}
    >

      {/* ════════════ TOP NAVIGATION BAR ════════════ */}
      <header className="sticky top-0 z-40 bg-[#f7f4ed]/95 backdrop-blur-md border-b border-[#e7e4dc]">
        <div className={`${CONTAINER} h-16 flex items-center justify-between gap-4`}>
          
          {/* Left: Brand Identity */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-[#1c1c1c] text-[#fcfbf8] flex items-center justify-center font-bold shadow-xs">
              <GraduationCap className="w-4.5 h-4.5" />
            </div>
            <span className="font-semibold text-base text-[#1c1c1c] tracking-tight group-hover:opacity-80 transition-opacity">
              {INSTITUTE_NAME}
            </span>
          </Link>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <InstallHeaderButton />
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[#1c1c1c]/25 hover:border-[#1c1c1c] text-[#1c1c1c] text-xs font-medium transition-colors bg-white/60"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Login</span>
            </Link>
            <Link
              to="/register"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#1c1c1c] hover:bg-[#2c2c2c] text-[#fcfbf8] text-xs font-medium shadow-[inset_0px_0.5px_0px_rgba(255,255,255,0.2),inset_0px_0px_0px_0.5px_rgba(0,0,0,0.2),0px_1px_2px_rgba(0,0,0,0.05)] transition-all"
            >
              <span>Register</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ════════════ HERO SECTION (Warm Glowing Aura Canvas) ════════════ */}
      <section
        className="relative overflow-hidden pt-8 pb-12 sm:pt-16 sm:pb-20 border-b border-[#e7e4dc]"
        style={{
          background: 'radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.05) 0%, rgba(245, 242, 235, 0.4) 40%, rgba(247, 244, 237, 0) 70%), linear-gradient(180deg, #fbfaf6 0%, #f7f4ed 55%, #f3eee3 100%)',
        }}
      >
        {/* Subtle architectural tactile dot grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.035]"
          style={{
            backgroundImage: 'radial-gradient(#1c1c1c 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Soft, warm atmospheric multi-color wash */}
        <div
          className="absolute inset-0 pointer-events-none select-none opacity-60"
          style={{
            background: 'radial-gradient(circle at 75% 25%, rgba(99, 102, 241, 0.07) 0%, rgba(186, 230, 253, 0.12) 35%, rgba(241, 245, 249, 0) 70%)',
          }}
        />

        <div className={`${CONTAINER} relative z-10 grid lg:grid-cols-12 gap-8 lg:gap-14 items-center`}>
          
          {/* LEFT: Editorial Headline & Actions */}
          <div className="lg:col-span-7 text-center lg:text-left space-y-4 sm:space-y-6">
            
            {/* Top Pill Tag - Refined, single-line responsive pill */}
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full border border-[#dcd7cb] bg-gradient-to-r from-white via-[#fcfbf9] to-white backdrop-blur-sm text-[11px] sm:text-xs text-[#1c1c1c] shadow-xs max-w-full">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="font-semibold tracking-tight">Center for Science &amp; Mathematics</span>
              <span className="text-[#5f5f5d]/50">·</span>
              <span className="text-indigo-950 font-semibold whitespace-nowrap">Batch 2025–26</span>
            </div>

            {/* Display Headline */}
            <div className="space-y-2 sm:space-y-3">
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-[#1c1c1c] tracking-[-0.03em] leading-[1.1]">
                <span className="block">{INSTITUTE_NAME}</span>
                <span className="block text-xl sm:text-3xl lg:text-4xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[#1c1c1c] via-[#2d2d2d] to-[#454545] mt-1 sm:mt-2 font-serif italic">
                  Empowering Concepts. Building Toppers.
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-sm sm:text-base lg:text-lg text-[#5f5f5d] font-normal leading-relaxed max-w-xl mx-auto lg:mx-0">
                Premier mentorship for Classes 9, 10, 11 &amp; 12 in Physics, Chemistry &amp; Mathematics. Experience daily live interactive lectures, curated practice modules, and dedicated 1-on-1 doubt resolution.
              </p>
            </div>

            {/* CTAs - Equal proportion and size row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 pt-1 max-w-lg lg:max-w-xl mx-auto lg:mx-0 w-full">
              <Link
                to="/batch-details"
                className="w-full h-11 sm:h-12 inline-flex items-center justify-center gap-2 px-3 sm:px-4 rounded-xl bg-[#1c1c1c] hover:bg-[#2c2c2c] text-[#fcfbf8] font-semibold text-xs sm:text-sm whitespace-nowrap transition-all duration-150 border border-[#1c1c1c] shadow-[inset_0px_0.5px_0px_rgba(255,255,255,0.25),inset_0px_0px_0px_0.5px_rgba(0,0,0,0.2),0px_4px_12px_rgba(0,0,0,0.12)] active:scale-[0.98] group"
              >
                <BookOpen className="w-4 h-4 text-white shrink-0 group-hover:scale-105 transition-transform" />
                <span>Explore All Batches</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#fcfbf8]/60 shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                to="/login"
                className="w-full h-11 sm:h-12 inline-flex items-center justify-center gap-2 px-3 sm:px-4 rounded-xl bg-white hover:bg-[#f7f4ed] text-[#1c1c1c] font-semibold text-xs sm:text-sm whitespace-nowrap border border-[#d8d3c5] hover:border-[#1c1c1c] transition-all duration-150 shadow-2xs active:scale-[0.98] group"
              >
                <LogIn className="w-4 h-4 text-[#5f5f5d] shrink-0 group-hover:translate-x-0.5 transition-transform" />
                <span>Login</span>
              </Link>

              <Link
                to="/register"
                className="w-full h-11 sm:h-12 inline-flex items-center justify-center gap-2 px-3 sm:px-4 rounded-xl bg-indigo-50 hover:bg-indigo-100/80 text-indigo-950 font-semibold text-xs sm:text-sm whitespace-nowrap border border-indigo-200/80 hover:border-indigo-300 transition-all duration-150 shadow-2xs active:scale-[0.98] group"
              >
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 group-hover:scale-110 transition-transform" />
                <span>Register Free</span>
              </Link>
            </div>

            {/* Micro-Trust Highlights - Tactile Bento Tiles */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-2 max-w-lg mx-auto lg:mx-0">
              <div className="flex flex-col sm:flex-row items-center sm:items-center text-center sm:text-left gap-1 sm:gap-2.5 p-2 sm:px-3 sm:py-2.5 rounded-xl bg-white/80 border border-[#e2ddd1] backdrop-blur-2xs shadow-2xs hover:border-[#1c1c1c]/30 transition-colors">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center justify-center shrink-0">
                  <Video className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-[11px] sm:text-xs font-semibold text-[#1c1c1c] leading-tight">Daily Live</p>
                  <p className="text-[10px] text-[#5f5f5d] leading-none hidden sm:block mt-0.5">Classes &amp; Recs</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center sm:items-center text-center sm:text-left gap-1 sm:gap-2.5 p-2 sm:px-3 sm:py-2.5 rounded-xl bg-white/80 border border-[#e2ddd1] backdrop-blur-2xs shadow-2xs hover:border-[#1c1c1c]/30 transition-colors">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/60 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-[11px] sm:text-xs font-semibold text-[#1c1c1c] leading-tight">1-on-1 Doubt</p>
                  <p className="text-[10px] text-[#5f5f5d] leading-none hidden sm:block mt-0.5">Personal Desk</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center sm:items-center text-center sm:text-left gap-1 sm:gap-2.5 p-2 sm:px-3 sm:py-2.5 rounded-xl bg-white/80 border border-[#e2ddd1] backdrop-blur-2xs shadow-2xs hover:border-[#1c1c1c]/30 transition-colors">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 border border-blue-200/60 flex items-center justify-center shrink-0">
                  <BookOpen className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-[11px] sm:text-xs font-semibold text-[#1c1c1c] leading-tight">DPPs &amp; Notes</p>
                  <p className="text-[10px] text-[#5f5f5d] leading-none hidden sm:block mt-0.5">Curated Sheets</p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: High-Craft Showcase Frame (subodh.jpg) */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="relative w-full max-w-[310px] sm:max-w-[360px]">
              
              {/* Ambient soft glow aura behind card */}
              <div className="absolute -inset-2 bg-gradient-to-tr from-indigo-500/15 via-sky-400/10 to-indigo-300/10 rounded-3xl blur-xl opacity-75 pointer-events-none" />

              {/* Outer frame with subtle warm halo & double border */}
              <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-[#dfdbcf] bg-gradient-to-b from-white via-[#faf8f3] to-white p-2.5 sm:p-3.5 shadow-[0_20px_50px_rgba(28,28,28,0.08),0_2px_8px_rgba(0,0,0,0.04)]">
                
                {/* Hero Image Container: subodh.jpg */}
                <div className="relative rounded-xl sm:rounded-2xl overflow-hidden aspect-[4/5] bg-[#1c1c1c] shadow-xs group">
                  <img
                    src="/subodh.jpg"
                    alt="Institute Showcase"
                    className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                  
                  {/* Soft bottom vignette overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent pointer-events-none" />

                  {/* Top Floating Badge: Mode */}
                  <div className="absolute top-2.5 left-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-white text-[10px] sm:text-[11px] font-semibold shadow-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Offline + Online</span>
                  </div>

                  {/* Top Floating Badge: Academic Excellence */}
                  <div className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-md border border-[#e2ddd1] text-[#1c1c1c] text-[10px] sm:text-[11px] font-bold shadow-md">
                    <Sparkles className="w-3 h-3 text-indigo-600 fill-indigo-500" />
                    <span>Top Mentors</span>
                  </div>

                  {/* Bottom Floating Glass Card */}
                  <div className="absolute inset-x-2.5 bottom-2.5 p-2.5 sm:p-3 rounded-xl bg-black/65 backdrop-blur-md border border-white/20 text-white flex items-center justify-between shadow-lg">
                    <div>
                      <p className="text-xs font-bold leading-tight">Senior Faculty &amp; Mentors</p>
                      <p className="text-[10px] text-white/80 leading-none mt-0.5">Classes 9th, 10th, 11th &amp; 12th</p>
                    </div>
                    <Link
                      to="/batch-details"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-[#f7f4ed] text-[#1c1c1c] border border-white/40 font-bold text-[10px] sm:text-[11px] transition-colors shrink-0 shadow-xs"
                    >
                      <span>Batches</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>

                {/* Mini Stat Ticker below frame */}
                <div className="mt-2.5 sm:mt-3 grid grid-cols-3 gap-1.5 sm:gap-2 px-0.5">
                  <div className="text-center p-2 rounded-xl bg-[#f7f4ed] border border-[#e2ddd1] shadow-2xs">
                    <p className="text-xs sm:text-sm font-extrabold text-[#1c1c1c] leading-none">500+</p>
                    <p className="text-[9px] sm:text-[10px] text-[#5f5f5d] mt-1 font-medium leading-tight">Students</p>
                  </div>
                  <div className="text-center p-2 rounded-xl bg-[#f7f4ed] border border-[#e2ddd1] shadow-2xs">
                    <p className="text-xs sm:text-sm font-extrabold text-[#1c1c1c] leading-none">100%</p>
                    <p className="text-[9px] sm:text-[10px] text-[#5f5f5d] mt-1 font-medium leading-tight">Concept Focus</p>
                  </div>
                  <div className="text-center p-2 rounded-xl bg-[#f7f4ed] border border-[#e2ddd1] shadow-2xs">
                    <p className="text-xs sm:text-sm font-extrabold text-[#1c1c1c] leading-none">24/7</p>
                    <p className="text-[9px] sm:text-[10px] text-[#5f5f5d] mt-1 font-medium leading-tight">Doubt Desk</p>
                  </div>
                </div>

              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ════════════ RUNNING BATCHES SECTION ════════════ */}
      <BatchPostersSection batches={batchPosters} />

      {/* ════════════ TRUST & METHODOLOGY STRIP (Color-Accented Cards) ════════════ */}
      <section className="py-12 sm:py-16 border-b border-[#e7e4dc] bg-white">
        <div className={CONTAINER}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Card 1: Live & Recorded (Sky Blue Tint) */}
            <div className="p-5 rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50/80 to-white hover:border-sky-300 transition-all shadow-2xs hover:shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-3 shadow-xs">
                  <Video className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-sm text-[#1c1c1c] mb-1">Live &amp; Recorded Classes</h3>
                <p className="text-xs text-[#5f5f5d] leading-relaxed">
                  Attend daily interactive lectures live or stream unlimited 1080p replays at your own pace.
                </p>
              </div>
            </div>

            {/* Card 2: Doubt Mentorship (Indigo Tint) */}
            <div className="p-5 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white hover:border-indigo-300 transition-all shadow-2xs hover:shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center mb-3 shadow-xs">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-sm text-[#1c1c1c] mb-1">Personal Doubt Support</h3>
                <p className="text-xs text-[#5f5f5d] leading-relaxed">
                  Message your educator directly or ask doubts during video playback for prompt resolution.
                </p>
              </div>
            </div>

            {/* Card 3: Notes & DPPs (Emerald Tint) */}
            <div className="p-5 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white hover:border-emerald-300 transition-all shadow-2xs hover:shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-3 shadow-xs">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-sm text-[#1c1c1c] mb-1">Handwritten Notes &amp; DPPs</h3>
                <p className="text-xs text-[#5f5f5d] leading-relaxed">
                  Concise formula sheets, chapter notes, and daily practice problem cards for exam readiness.
                </p>
              </div>
            </div>

            {/* Card 4: Consistency & Streak (Rose Tint) */}
            <div className="p-5 rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50/80 to-white hover:border-rose-300 transition-all shadow-2xs hover:shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center mb-3 shadow-xs">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-sm text-[#1c1c1c] mb-1">Consistency &amp; Attendance</h3>
                <p className="text-xs text-[#5f5f5d] leading-relaxed">
                  Daily streak tracking, attendance gauges, and homework deadlines to foster peak consistency.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ════════════ LECTURES FEED + STICKY DESKTOP SIDEBAR ════════════ */}
      <div className={`${CONTAINER} py-10 sm:py-16`}>
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-10 items-start">

          {/* MAIN LEFT FEED */}
          <div className="flex-1 min-w-0 w-full">

            {/* ── PROMINENT "WHAT'S ON" NOTIFICATION CARD (MOBILE VIEW - ALWAYS PRESENT) ── */}
            <div className="lg:hidden mb-8 sm:mb-10">
              <WhatsOnCard
                notifications={notifications}
                isNew={isNew}
                hasNew={hasNew}
                isMobile
              />
            </div>

            {/* ── Featured Lectures (Framer Atmospheric Spotlight Showcase) ── */}
            {featured.length > 0 && (
              <section
                className="mb-12 sm:mb-16 p-5 sm:p-7 rounded-3xl bg-black border border-white/10 shadow-[0_4px_20px_rgba(28,28,28,0.06),0_1px_2px_rgba(28,28,28,0.04)] relative overflow-hidden transition-colors"
                style={{
                  background: '#000000',
                }}
              >
                {/* Architectural dot grid texture on dark canvas */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-[0.05]"
                  style={{
                    backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                  }}
                />

                {/* Atmospheric Ambient Dark Glows */}
                <div className="absolute -top-20 -right-20 w-80 h-80 bg-gradient-to-br from-indigo-500/15 via-blue-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-gradient-to-tr from-sky-500/10 via-indigo-600/5 to-transparent rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 sm:mb-6">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-white text-[10px] font-bold tracking-wide uppercase shadow-2xs backdrop-blur-md">
                      <Sparkles className="w-3 h-3 text-indigo-400 fill-indigo-400" />
                      <span>Curated Spotlight</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                      Featured lectures
                    </h2>
                    <p className="text-xs text-[#a1a1aa] leading-relaxed">
                      High-yield lessons recommended by faculty for conceptual mastery.
                    </p>
                  </div>

                  {/* Framer-styled circular carousel arrows */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <motion.button
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => scrollFeatured(-1)}
                      aria-label="Scroll left"
                      className="w-9 h-9 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shadow-xs backdrop-blur-sm"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => scrollFeatured(1)}
                      aria-label="Scroll right"
                      className="w-9 h-9 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shadow-xs backdrop-blur-sm"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </motion.button>
                  </div>
                </div>

                <div
                  ref={featRef}
                  className="relative z-10 overflow-x-auto pt-3.5 pb-3 -mt-2 -mx-2 px-2 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:none]"
                >
                  <div className="flex gap-4 sm:gap-5 py-1" style={{ width: 'max-content' }}>
                    {featured.map(c => (
                      <div key={c.id} className="w-[78vw] max-w-[280px] sm:w-[320px] flex-shrink-0 snap-start">
                        <LectureCard card={c} isFeaturedCard />
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* ── All Lectures (Framer Grid with Spring Layout) ── */}
            <section>
              <div className="mb-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#1c1c1c] text-[#fcfbf8] flex items-center justify-center shadow-xs">
                      <BookOpen className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl sm:text-2xl font-bold text-[#1c1c1c] tracking-tight">
                          All lectures
                        </h2>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#f3eee3] text-[#1c1c1c] border border-[#e2ddd1]">
                          {totalCards} {totalCards === 1 ? 'Lesson' : 'Lessons'}
                        </span>
                      </div>
                      <p className="text-xs text-[#5f5f5d] mt-0.5">
                        {totalCards > 0 ? `${totalCards} public study cards available` : 'Browse all study material'}
                      </p>
                    </div>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center gap-1.5 self-end sm:self-auto bg-white p-1 rounded-xl border border-[#e2ddd1] shadow-2xs">
                      <motion.button
                        whileTap={{ scale: 0.92 }}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="w-7 h-7 rounded-lg text-[#1c1c1c] hover:bg-[#f7f4ed] disabled:opacity-30 flex items-center justify-center transition-colors cursor-pointer"
                        title="Previous"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </motion.button>
                      <span className="text-xs font-bold text-[#1c1c1c] px-2 tabular-nums">
                        {page} <span className="text-[#5f5f5d] font-normal">/</span> {totalPages}
                      </span>
                      <motion.button
                        whileTap={{ scale: 0.92 }}
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="w-7 h-7 rounded-lg text-[#1c1c1c] hover:bg-[#f7f4ed] disabled:opacity-30 flex items-center justify-center transition-colors cursor-pointer"
                        title="Next"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </motion.button>
                    </div>
                  )}
                </div>

                {/* Batch Category Filters with Framer sliding layoutId */}
                <div className="w-full overflow-x-auto pb-1 -mx-1 px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:none]">
                  <div className="flex gap-1.5 sm:gap-2 w-max items-center p-1 bg-white/70 backdrop-blur-xs rounded-full border border-[#e2ddd1]">
                    <button
                      onClick={() => { setActiveBatch('all'); setPage(1) }}
                      className="relative px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer"
                    >
                      {activeBatch === 'all' && (
                        <motion.div
                          layoutId="activeBatchPill"
                          className="absolute inset-0 bg-[#1c1c1c] rounded-full shadow-[inset_0px_0.5px_0px_rgba(255,255,255,0.25),0_2px_6px_rgba(0,0,0,0.12)]"
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                      )}
                      <span className={`relative z-10 transition-colors ${activeBatch === 'all' ? 'text-[#fcfbf8]' : 'text-[#5f5f5d] hover:text-[#1c1c1c]'}`}>
                        All
                      </span>
                    </button>
                    {batches.map(b => (
                      <button
                        key={b.id}
                        onClick={() => { setActiveBatch(b.id); setPage(1) }}
                        className="relative px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer"
                      >
                        {activeBatch === b.id && (
                          <motion.div
                            layoutId="activeBatchPill"
                            className="absolute inset-0 bg-[#1c1c1c] rounded-full shadow-[inset_0px_0.5px_0px_rgba(255,255,255,0.25),0_2px_6px_rgba(0,0,0,0.12)]"
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                          />
                        )}
                        <span className={`relative z-10 transition-colors ${activeBatch === b.id ? 'text-[#fcfbf8]' : 'text-[#5f5f5d] hover:text-[#1c1c1c]'}`}>
                          {b.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {loading ? (
                <div
                  className="grid gap-4 sm:gap-5 items-stretch"
                  style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
                >
                  {[...Array(dynamicPageSize)].map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              ) : cards.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-[#e2ddd1] shadow-2xs">
                  <div className="w-12 h-12 rounded-2xl bg-[#f7f4ed] border border-[#e2ddd1] flex items-center justify-center mx-auto mb-3">
                    <BookOpen className="h-6 w-6 text-[#5f5f5d] opacity-60" />
                  </div>
                  <p className="text-sm font-semibold text-[#1c1c1c]">No lectures available in this filter.</p>
                  <p className="text-xs text-[#5f5f5d] mt-1">Please select another batch tab above.</p>
                </div>
              ) : (
                <>
                  <motion.div
                    layout
                    className="grid gap-4 sm:gap-5 items-stretch pt-2 pb-2"
                    style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
                  >
                    <AnimatePresence mode="popLayout">
                      {visibleCards.map((card, idx) => (
                        <motion.div
                          key={card.id}
                          layout
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{
                            type: 'spring',
                            stiffness: 300,
                            damping: 26,
                            delay: idx * 0.04,
                          }}
                          className="h-full"
                        >
                          <LectureCard card={card} />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-1.5 mt-10">
                      <motion.button
                        whileTap={{ scale: 0.92 }}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="p-2 rounded-xl border border-[#e2ddd1] bg-white hover:border-[#1c1c1c] text-[#1c1c1c] disabled:opacity-30 transition-colors cursor-pointer shadow-2xs"
                        title="Previous page"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </motion.button>
                      {[...Array(totalPages)].map((_, i) => (
                        <motion.button
                          key={i}
                          whileTap={{ scale: 0.92 }}
                          onClick={() => setPage(i + 1)}
                          className={`w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            page === i + 1
                              ? 'bg-[#1c1c1c] text-[#fcfbf8] shadow-xs'
                              : 'bg-white border border-[#e2ddd1] text-[#1c1c1c] hover:border-[#1c1c1c]'
                          }`}
                        >
                          {i + 1}
                        </motion.button>
                      ))}
                      <motion.button
                        whileTap={{ scale: 0.92 }}
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="p-2 rounded-xl border border-[#e2ddd1] bg-white hover:border-[#1c1c1c] text-[#1c1c1c] disabled:opacity-30 transition-colors cursor-pointer shadow-2xs"
                        title="Next page"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </motion.button>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>

          {/* RIGHT: DESKTOP STICKY SIDEBAR ("WHAT'S ON" CARD) */}
          <aside className="hidden lg:block w-80 xl:w-88 flex-shrink-0">
            <div className="sticky top-24">
              <WhatsOnCard
                notifications={notifications}
                isNew={isNew}
                hasNew={hasNew}
              />
            </div>
          </aside>

        </div>
      </div>

      {/* ════════════ EDITORIAL PHILOSOPHY (Stone Linen Background #efebe1) ════════════ */}
      <section className="py-14 sm:py-20 border-t border-[#e5dfd2] bg-[#efebe1]">
        <div className={`${CONTAINER} text-center max-w-2xl mx-auto`}>
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-950 bg-indigo-50 border border-indigo-200/80 px-3 py-1 rounded-full inline-block mb-3">
            Our Philosophy
          </span>
          <h3 className="text-2xl sm:text-3xl font-semibold text-[#1c1c1c] tracking-tight mb-4">
            Honest Effort, Real Results
          </h3>
          <p className="text-sm sm:text-base text-[#5f5f5d] leading-relaxed">
            Students thrive when instruction is methodical and the freedom to ask questions is always protected.
            Clear explanations, steady problem-solving practice, and direct teacher guidance.
          </p>
        </div>
      </section>

      {/* ════════════ FOOTER (Deep Charcoal #141414) ════════════ */}
      <footer className="border-t border-white/10 bg-[#141414] text-[#eceae4] py-12">
        <div className={CONTAINER}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-8">
            
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold shadow-xs shadow-indigo-600/20">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <span className="font-semibold text-sm text-white block">
                  {INSTITUTE_NAME}
                </span>
                <span className="text-[11px] text-[#9ca3af] block">
                  {INSTITUTE_TAGLINE}
                </span>
              </div>
            </div>

            {CONTACT_EMAIL && (
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-xs text-white transition-colors"
              >
                <Mail className="h-3.5 w-3.5 text-indigo-400" />
                <span>{CONTACT_EMAIL}</span>
              </a>
            )}

            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-3.5 py-1.5 rounded-lg border border-white/20 hover:border-white text-white text-xs font-medium transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all shadow-xs shadow-indigo-600/25"
              >
                Apply
              </Link>
            </div>
          </div>

          <div className="border-t border-white/10 mt-8 pt-6 text-center text-xs text-[#9ca3af]">
            © {new Date().getFullYear()} {INSTITUTE_NAME}. Designed with care.
          </div>
        </div>
      </footer>

    </div>
  )
}
