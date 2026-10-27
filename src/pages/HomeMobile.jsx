import { useState, useEffect, useRef, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap, PlayCircle, ExternalLink, BookOpen, Bell,
  ChevronLeft, ChevronRight, Mail, Youtube, ArrowRight,
  Video, MessageSquare, CheckCircle2, Sparkles, Clock,
  Flame, ShieldCheck, Check, Compass, LogIn, Award, Zap
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import {
  INSTITUTE_NAME, INSTITUTE_TAGLINE, CONTACT_EMAIL,
} from '../lib/constants'
import { getYouTubeThumbnail } from '../utils/formatters'
import DriveImage from '../components/shared/DriveImage'
import { getCachedRunningBatches, fetchRunningBatches, subscribeToBatchUpdates } from '../services/batchCache'
import InstallHeaderButton from '../components/InstallHeaderButton'
import StudentReviewsDesktop from '../components/home/StudentReviewsDesktop'
import StudentReviewsMobile from '../components/home/StudentReviewsMobile'
import LectureCard from '../components/home/LectureCard'
import AllLecturesSection from '../components/home/AllLecturesSection'
import HeroCarouselMobile from '../components/home/HeroCarouselMobile'
import BannerMethodologySection from '../components/home/BannerMethodologySection'
import GravitonBrandText from '../components/shared/GravitonBrandText'
import SocialMediaButtons from '../components/home/SocialMediaButtons'

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
    <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#eceae4] overflow-hidden animate-pulse flex flex-col w-full h-[360px] justify-between shadow-2xs p-3 sm:p-3.5">
      <div className="bg-[#eceae4]/70 aspect-video w-full rounded-xl sm:rounded-2xl" />
      <div className="p-3 sm:p-3.5 flex flex-col justify-between flex-1">
        <div className="space-y-2 mb-3">
          <div className="h-5 bg-[#eceae4] rounded-lg w-5/6" />
          <div className="h-3.5 bg-[#eceae4]/60 rounded-md w-2/3" />
        </div>
        <div className="pt-3 border-t border-[#eceae4] mt-auto flex items-center justify-between">
          <div className="h-4 bg-[#eceae4] rounded-md w-24" />
          <div className="h-7 bg-[#eceae4] rounded-full w-24" />
        </div>
      </div>
    </div>
  )
}

// ─── BATCH POSTER CARD (Richard Feynman White Border Reference Style) ─────────

function BatchPosterCard({ batch, index = 0, isDraggingRef }) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const PALETTES = [
    'from-[#1c1c1c] via-[#2d2d2d] to-[#1c1c1c]',
    'from-[#1e293b] via-[#334155] to-[#0f172a]',
    'from-[#1e1b4b] via-[#312e81] to-[#1e1b4b]',
    'from-[#064e3b] via-[#065f46] to-[#022c22]',
  ]
  const palette = PALETTES[index % PALETTES.length]

  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 350, damping: 22 }}
      className="group block flex-shrink-0 w-[215px] xs:w-[230px] sm:w-[245px] lg:w-[255px] max-w-[270px] snap-start select-none"
    >
      {/* Outer Card with Crisp White Border of Medium Thickness (Matching Richard Card Reference) */}
      <Link
        to={`/batch-details?id=${batch.id}`}
        onClick={(e) => {
          if (isDraggingRef?.current) {
            e.preventDefault()
          }
        }}
        className="block rounded-3xl p-2.5 sm:p-3 bg-gradient-to-b from-white via-[#faf8f3] to-white border border-[#dfdbcf] group-hover:border-white shadow-[0_16px_40px_rgba(0,0,0,0.35),0_2px_8px_rgba(0,0,0,0.1)] group-hover:shadow-[0_24px_55px_rgba(99,102,241,0.35),0_0_0_1px_rgba(255,255,255,0.4)] transition-all duration-300"
      >
        {/* Inner Media Canvas (Optimized for 9:16 & all image dimensions with zero black voids & zero cropping) */}
        <div className="relative rounded-2xl overflow-hidden aspect-[9/16] bg-slate-950 border border-black/10 flex items-center justify-center">
          {batch.poster_url?.trim() ? (
            <>
              {!imageLoaded && (
                <div className="absolute inset-0 bg-[#0c0c0e] animate-pulse flex flex-col items-center justify-center gap-2.5 z-10">
                  <div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-indigo-400 animate-spin" />
                  <span className="text-[10px] font-medium text-white/50 tracking-wider uppercase">Loading Poster...</span>
                </div>
              )}

              {/* Ambient Blurred Backdrop: Fills any aspect ratio void with hardware-accelerated ambient glow */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
                <DriveImage
                  src={batch.poster_url.trim()}
                  alt=""
                  aria-hidden="true"
                  priority={index < 2}
                  className="w-full h-full object-cover blur-md transform-gpu will-change-transform opacity-50 brightness-95 filter pointer-events-none"
                />
                {/* Soft gradient wash */}
                <div className="absolute inset-0 bg-black/20 pointer-events-none" />
              </div>

              {/* Foreground Crisp Poster Image: object-contain guarantees 100% full view without cropping */}
              <DriveImage
                src={batch.poster_url.trim()}
                alt={batch.name}
                priority={index < 2}
                onLoad={() => setImageLoaded(true)}
                className={`relative z-10 w-full h-full object-contain transition-all duration-300 group-hover:scale-[1.02] pointer-events-none ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                fallback={
                  <div className={`absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center bg-gradient-to-br ${palette}`}>
                    <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/20">
                      <span className="text-xl font-bold text-white">{batch.name?.charAt(0)?.toUpperCase()}</span>
                    </div>
                    <span className="text-white font-semibold text-xs leading-tight px-2">{batch.name}</span>
                  </div>
                }
              />
            </>
          ) : (
            <div className={`absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center bg-gradient-to-br ${palette}`}>
              <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/20">
                <span className="text-xl font-bold text-white">{batch.name?.charAt(0)?.toUpperCase()}</span>
              </div>
              <span className="text-white font-semibold text-xs leading-tight px-2">{batch.name}</span>
            </div>
          )}

        </div>

        {/* Respective Batch Name beautifully displayed below the poster */}
        <div className="pt-2.5 sm:pt-3 pb-0.5 px-1 text-center">
          <p className="font-bold text-xs sm:text-sm text-[#1c1c1c] tracking-tight leading-snug truncate group-hover:text-indigo-600 transition-colors">
            {batch.name}
          </p>
        </div>
      </Link>
    </motion.div>
  )
}

// ─── BATCH POSTER SKELETON CARD ──────────────────────────────────────────────

function BatchPosterSkeletonCard() {
  return (
    <div className="flex-shrink-0 w-[215px] xs:w-[230px] sm:w-[245px] lg:w-[255px] max-w-[270px] snap-start select-none">
      <div className="rounded-3xl p-2.5 sm:p-3 bg-gradient-to-b from-white via-[#faf8f3] to-white border border-[#dfdbcf] shadow-[0_16px_40px_rgba(0,0,0,0.35)] animate-pulse">
        {/* Poster Skeleton Frame (aspect-[9/16]) */}
        <div className="relative rounded-2xl overflow-hidden aspect-[9/16] bg-slate-950 border border-black/10 flex flex-col items-center justify-center p-4">
          <div className="w-12 h-12 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center mb-3">
            <GraduationCap className="w-6 h-6 text-white/20" />
          </div>
          <div className="h-2 w-16 bg-white/5 rounded-md" />

          {/* Shimmer overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent -translate-x-full animate-[shimmer_2s_infinite] pointer-events-none" />
        </div>

        {/* Below Poster: Skeleton Batch Name */}
        <div className="pt-2.5 sm:pt-3 pb-0.5 px-1 flex justify-center">
          <div className="h-4 w-3/4 bg-neutral-200 rounded-md" />
        </div>
      </div>
    </div>
  )
}

// ─── RUNNING BATCHES SECTION (Gradient Black Aesthetic & Swipe Carousel) ──

function BatchPostersSection({ batches = [], loading = false }) {
  const isEmpty = !loading && (!batches || batches.length === 0)

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
    const canLeft = scrollLeft > 10
    const canRight = scrollLeft < scrollWidth - clientWidth - 10
    const cardStep = 240
    const newIdx = Math.min(Math.max(Math.round(scrollLeft / cardStep), 0), (batches?.length || 1) - 1)

    setCanScrollLeft(prev => (prev !== canLeft ? canLeft : prev))
    setCanScrollRight(prev => (prev !== canRight ? canRight : prev))
    setActiveIndex(prev => (prev !== newIdx ? newIdx : prev))
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
  }, [batches, loading])

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
                  {loading ? 'Active Cohorts' : `Active Cohorts (${batches.length})`}
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
            {!loading && batches.length > 1 && (
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
            className="flex gap-4 sm:gap-6 overflow-x-auto pt-3 pb-4 -mt-2 px-4 sm:px-6 -mx-4 sm:-mx-6 snap-x snap-mandatory touch-manipulation overscroll-x-auto cursor-grab active:cursor-grabbing [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:none] [-webkit-overflow-scrolling:touch]"
          >
            {loading ? (
              <>
                <BatchPosterSkeletonCard />
                <BatchPosterSkeletonCard />
                <BatchPosterSkeletonCard />
              </>
            ) : isEmpty ? (
              <div className="w-full py-10 px-6 rounded-2xl bg-white/[0.03] border border-white/10 text-center flex flex-col items-center justify-center">
                <GraduationCap className="w-10 h-10 text-indigo-400/60 mb-2" />
                <h3 className="text-base font-bold text-white mb-1">New Batches Announcing Soon</h3>
                <p className="text-xs text-white/60 max-w-md mb-4">
                  Upcoming cohorts for the academic session are being finalized. Explore all course curriculums or contact the admissions desk.
                </p>
                <Link
                  to="/batch-details"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-[#1c1c1c] text-xs font-semibold hover:bg-white/90 transition-all shadow-sm"
                >
                  <span>View All Batches</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              batches.map((b, i) => (
                <BatchPosterCard
                  key={b.id}
                  batch={b}
                  index={i}
                  isDraggingRef={isDraggingRef}
                />
              ))
            )}
          </div>
        </div>

        {/* Swipe Indicators / Dots for other posters */}
        {!loading && batches.length > 1 && (
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

// ─── LECTURE CARD is imported from ../components/home/LectureCard ─────────────

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

// ─── PANORAMIC BANNER & OVERLAPPING METHODOLOGY CARDS ─────────────────────────

function TrustMethodologyStrip() {
  return <BannerMethodologySection />
}

// ─── MAIN HOME COMPONENT ──────────────────────────────────────────────────────

const HERO_DECK_ITEMS = [
  { id: 'einstein', index: 0, isInitial: false },
  { id: 'graviton', index: 1, isInitial: true },
  { id: 'feynman',  index: 2, isInitial: false },
]
const INITIAL_HERO_CARD = 'graviton'
const INACTIVITY_DELAY_MS = 2800

// Dynamic symmetrical card sizing helper for balanced grid distribution
function getCardWidthClass(count) {
  if (count === 1) {
    return 'w-full max-w-xl mx-auto'
  }
  if (count === 2 || count === 4) {
    return 'w-full sm:w-[calc(50%-12px)] max-w-[460px]'
  }
  return 'w-full sm:w-[calc(50%-12px)] lg:w-[calc(50%-12px)] 2xl:w-[calc(33.333%-16px)] max-w-[430px]'
}

export default function Home() {
  const [notifications, setNotifications] = useState([])
  const [featured,      setFeatured]      = useState([])
  const [cards,         setCards]         = useState([])
  const [batches,       setBatches]       = useState(() => getCachedRunningBatches())
  const [batchPosters,  setBatchPosters]  = useState(() => {
    const cached = getCachedRunningBatches()
    return cached.filter(b => b.poster_url?.trim())
  })
  const [postersLoading, setPostersLoading] = useState(false)
  const [activeBatch,   setActiveBatch]   = useState('all')
  const [page,          setPage]          = useState(1)
  const [totalCards,    setTotalCards]    = useState(0)
  const [loading,       setLoading]       = useState(true)
  const [cols,          setCols]          = useState(2)

  // 3-Card Interactive Hero Deck State with Auto-Reset on Inactivity & Scroll
  const [heroActiveCard, setHeroActiveCard] = useState(INITIAL_HERO_CARD)
  const activeDesktopCard = heroActiveCard
  const mobileHeroCard = heroActiveCard

  const inactivityTimerRef = useRef(null)
  const lastScrollYRef = useRef(0)

  const clearInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
      inactivityTimerRef.current = null
    }
  }

  const resetToInitialDeck = () => {
    clearInactivityTimer()
    setHeroActiveCard(INITIAL_HERO_CARD)
  }

  const handleSelectHeroCard = (cardId) => {
    // If clicking the active non-initial card, toggle it back immediately
    if (cardId === heroActiveCard && cardId !== INITIAL_HERO_CARD) {
      resetToInitialDeck()
      return
    }

    setHeroActiveCard(cardId)
    clearInactivityTimer()

    if (cardId !== INITIAL_HERO_CARD) {
      lastScrollYRef.current = typeof window !== 'undefined' ? (window.scrollY || document.documentElement.scrollTop || 0) : 0
      inactivityTimerRef.current = setTimeout(() => {
        setHeroActiveCard(INITIAL_HERO_CARD)
      }, INACTIVITY_DELAY_MS)
    }
  }

  const handleDeckActivity = () => {
    if (heroActiveCard !== INITIAL_HERO_CARD) {
      clearInactivityTimer()
      inactivityTimerRef.current = setTimeout(() => {
        setHeroActiveCard(INITIAL_HERO_CARD)
      }, INACTIVITY_DELAY_MS)
    }
  }

  const handleDeckMouseLeave = () => {
    if (heroActiveCard !== INITIAL_HERO_CARD) {
      clearInactivityTimer()
      // Responsive, elegant return upon cursor exiting the deck stage
      inactivityTimerRef.current = setTimeout(() => {
        setHeroActiveCard(INITIAL_HERO_CARD)
      }, 1200)
    }
  }

  // Automatic reset to initial state on page scroll, touch swipe, or wheel movement
  useEffect(() => {
    if (heroActiveCard === INITIAL_HERO_CARD) return

    const triggerReset = () => {
      clearInactivityTimer()
      setHeroActiveCard(INITIAL_HERO_CARD)
    }

    const handleScroll = () => {
      const currentScrollY = window.scrollY || document.documentElement.scrollTop || 0
      // Any genuine scroll movement (> 3px) restores the original tilted fanned deck
      if (Math.abs(currentScrollY - lastScrollYRef.current) >= 3) {
        triggerReset()
      }
    }

    const handleWheel = (e) => {
      if (Math.abs(e.deltaY) > 2 || Math.abs(e.deltaX) > 2) {
        triggerReset()
      }
    }

    const handleTouchMove = () => {
      triggerReset()
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    document.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('wheel', handleWheel, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      document.removeEventListener('scroll', handleScroll)
      window.removeEventListener('wheel', handleWheel)
      window.removeEventListener('touchmove', handleTouchMove)
    }
  }, [heroActiveCard])

  useEffect(() => {
    return () => clearInactivityTimer()
  }, [])

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

    // Fetch fresh cohorts in background (Stale-While-Revalidate)
    fetchRunningBatches().then((activeBatches) => {
      if (cancelled) return
      setBatches(activeBatches)
      setBatchPosters(activeBatches.filter(b => b.poster_url?.trim()))
      setPostersLoading(false)
    })

    // Future-Proof Realtime Sync: automatically updates whenever admin adds/edits/removes cohorts
    const unsubscribe = subscribeToBatchUpdates((freshBatches) => {
      if (cancelled) return
      setBatches(freshBatches)
      setBatchPosters(freshBatches.filter(b => b.poster_url?.trim()))
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
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
    if (!total || total <= 0) return 6
    // If small batch (<= 12 cards), show all on one page without awkward splits
    if (total <= 12) return total
    // For larger collections, paginate by balanced multiples (12, 9, 6)
    for (const size of [12, 9, 6]) {
      if (total % size === 0) return size
    }
    return 12
  }, [cards.length])

  const totalPages = Math.max(1, Math.ceil(cards.length / dynamicPageSize))

  useEffect(() => {
    if (page > totalPages) setPage(1)
  }, [totalPages, page])

  const visibleCards = useMemo(() => {
    const from = (page - 1) * dynamicPageSize
    return cards.slice(from, from + dynamicPageSize)
  }, [cards, page, dynamicPageSize])

  // Dynamic height synchronization between desktop reviews and all lectures section
  const allLecturesRef = useRef(null)
  const whatsOnRef = useRef(null)
  const feedContainerRef = useRef(null)
  const [reviewsHeight, setReviewsHeight] = useState(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const updateReviewsHeight = () => {
      // Desktop sticky sidebar is hidden on mobile (< 1024px).
      // Skip height calculation on mobile to preserve 60/120fps scrolling.
      if (typeof window !== 'undefined' && window.innerWidth < 1024) return
      if (!allLecturesRef.current) return

      const allLecturesEl = allLecturesRef.current
      const allLecturesH = allLecturesEl.offsetHeight || 0
      const whatsOnH = whatsOnRef.current?.offsetHeight || 260
      const gap = 20 // space-y-5

      if (allLecturesH > 0) {
        // Space available in the sidebar alongside AllLecturesSection
        // so total sidebar height (WhatsOnCard + gap + reviews) matches AllLecturesSection
        const availableInSidebar = allLecturesH - whatsOnH - gap

        // Maximum of 6 cards height: 6 * 152px + 5 * 12px + 132px (header/footer/padding) = 1000px
        const MAX_6_CARDS_HEIGHT = 1000
        // Minimum height for 1 card + header + footer
        const MIN_REVIEWS_HEIGHT = 260

        // Strict clamping:
        // 1. NEVER taller than AllLecturesSection (availableInSidebar < allLecturesH)
        // 2. Maximum of 6 cards displayed (capped at 1000px)
        // 3. Minimum 1 card displayed (260px)
        // 4. Adjusts dynamically as AllLecturesSection height changes
        const target = Math.min(
          MAX_6_CARDS_HEIGHT,
          Math.max(MIN_REVIEWS_HEIGHT, Math.floor(availableInSidebar))
        )

        setReviewsHeight(prev => (prev !== target && Math.abs((prev || 0) - target) > 6 ? target : prev))
      }
    }

    updateReviewsHeight()
    const rafId = requestAnimationFrame(updateReviewsHeight)
    const timeoutId = setTimeout(updateReviewsHeight, 200)

    let ro
    let roRafId
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        if (roRafId) cancelAnimationFrame(roRafId)
        roRafId = requestAnimationFrame(updateReviewsHeight)
      })
      if (allLecturesRef.current) ro.observe(allLecturesRef.current)
      if (whatsOnRef.current) ro.observe(whatsOnRef.current)
    }

    window.addEventListener('resize', updateReviewsHeight)
    return () => {
      cancelAnimationFrame(rafId)
      if (roRafId) cancelAnimationFrame(roRafId)
      clearTimeout(timeoutId)
      if (ro) ro.disconnect()
      window.removeEventListener('resize', updateReviewsHeight)
    }
  }, [cards, activeBatch, loading, featured.length])

  const now = Date.now()
  const isNew = (d) => now - new Date(d).getTime() < 86400000
  const hasNew = notifications.some(n => isNew(n.created_at))

  return (
    <div
      className="min-h-screen bg-[#f7f4ed] text-[#1c1c1c] font-sans antialiased selection:bg-[#1c1c1c] selection:text-[#fcfbf8] overflow-x-hidden"
    >

      {/* ════════════ TOP NAVIGATION BAR ════════════ */}
      <header className="sticky top-0 z-40 bg-[#f7f4ed]/95 backdrop-blur-md border-b border-[#e7e4dc]">
        <div className={`${CONTAINER} h-16 flex items-center justify-between gap-2 sm:gap-4`}>
          
          {/* Left: Brand Identity */}
          <Link to="/" className="flex items-center gap-2 sm:gap-2.5 min-w-0 group">
            <div className="w-8 h-8 rounded-lg bg-[#1c1c1c] text-[#fcfbf8] flex items-center justify-center font-bold shadow-xs shrink-0">
              <GraduationCap className="w-4.5 h-4.5" />
            </div>
            <GravitonBrandText variant="nav" className="text-sm sm:text-base group-hover:opacity-85 transition-opacity" />
          </Link>

          {/* Right Actions */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <InstallHeaderButton />
            <Link
              to="/login"
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg border border-[#1c1c1c]/25 hover:border-[#1c1c1c] text-[#1c1c1c] text-xs font-medium transition-colors bg-white/60"
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

      {/* ════════════ DUAL-HERO CAROUSEL SECTION ════════════ */}
      <HeroCarouselMobile
        instituteName={INSTITUTE_NAME}
        heroActiveCard={heroActiveCard}
        mobileHeroCard={mobileHeroCard}
        heroDeckItems={HERO_DECK_ITEMS}
        handleSelectHeroCard={handleSelectHeroCard}
        handleDeckActivity={handleDeckActivity}
      />

      {/* ════════════ RUNNING BATCHES SECTION ════════════ */}
      <BatchPostersSection batches={batchPosters} loading={postersLoading} />

      {/* ════════════ TRUST & METHODOLOGY STRIP (Color-Accented Cards) ════════════ */}
      <TrustMethodologyStrip />

      {/* ════════════ LECTURES FEED + STICKY DESKTOP SIDEBAR ════════════ */}
      <div className={`${CONTAINER} py-10 sm:py-16`}>
        <div ref={feedContainerRef} className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">

          {/* MAIN LEFT FEED (8 columns on lg) */}
          <div className="lg:col-span-8 min-w-0 w-full">

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
                className="mb-12 sm:mb-16 p-4 sm:p-6 lg:p-7 rounded-3xl bg-black border border-white/10 shadow-[0_4px_20px_rgba(28,28,28,0.06),0_1px_2px_rgba(28,28,28,0.04)] relative overflow-hidden transition-colors"
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
                  className="relative z-10 overflow-x-auto pt-3.5 pb-3 -mt-2 -mx-1 px-1 sm:-mx-2 sm:px-2 snap-x snap-mandatory touch-manipulation overscroll-x-auto cursor-grab active:cursor-grabbing [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:none] [-webkit-overflow-scrolling:touch]"
                >
                  <div className="flex gap-3.5 sm:gap-5 py-1" style={{ width: 'max-content' }}>
                    {featured.map(c => (
                      <div key={c.id} className="w-[70vw] max-w-[250px] sm:max-w-none sm:w-[310px] lg:w-[320px] flex-shrink-0 snap-start">
                        <LectureCard card={c} isFeaturedCard />
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* ── ALL LECTURES (Curated Landmark Academic Section) ── */}
            <AllLecturesSection
              sectionRef={allLecturesRef}
              cards={cards}
              visibleCards={visibleCards}
              loading={loading}
              batches={batches}
              activeBatch={activeBatch}
              setActiveBatch={setActiveBatch}
              totalCards={totalCards}
              totalPages={totalPages}
              page={page}
              setPage={setPage}
              dynamicPageSize={dynamicPageSize}
              getCardWidthClass={getCardWidthClass}
            />

            {/* ── MOBILE STUDENT REVIEWS (Horizontal Rolling Cards - Shown at Last on Mobile) ── */}
            <div className="lg:hidden mt-10 sm:mt-14">
              <StudentReviewsMobile />
            </div>
          </div>

          {/* RIGHT: DESKTOP STICKY SIDEBAR (4 columns on lg) */}
          <aside className="hidden lg:block lg:col-span-4 min-w-0 w-full">
            <div className="sticky top-24 space-y-5">
              <div ref={whatsOnRef}>
                <WhatsOnCard
                  notifications={notifications}
                  isNew={isNew}
                  hasNew={hasNew}
                />
              </div>
              <StudentReviewsDesktop targetHeight={reviewsHeight} />
            </div>
          </aside>

        </div>
      </div>

      {/* ════════════ EDITORIAL PHILOSOPHY (Stone Linen Background #efebe1) ════════════ */}
      <section className="py-14 sm:py-20 border-t border-[#e5dfd2] bg-[#efebe1]">
        <div className={`${CONTAINER} text-center max-w-3xl mx-auto`}>
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

          {/* Modern Social Media Buttons (Manageable from Admin Settings) */}
          <SocialMediaButtons className="mt-4" />
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
