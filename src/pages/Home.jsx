import { useState, useEffect, useRef, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  GraduationCap, PlayCircle, ExternalLink, BookOpen, Bell,
  ChevronLeft, ChevronRight, Mail, Youtube, ArrowRight,
  Video, MessageSquare, CheckCircle2, Sparkles,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import {
  INSTITUTE_NAME, INSTITUTE_TAGLINE, CONTACT_EMAIL,
} from '../lib/constants'
import { getYouTubeThumbnail } from '../utils/formatters'
import DriveImage from '../components/shared/DriveImage'
import InstallHeaderButton from '../components/InstallHeaderButton'

function getThumbnail(url) { return getYouTubeThumbnail(url) }

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



const NOTIF_STYLES = {
  fee:          { border: 'border-l-amber-400',  label: 'Fee',          bg: 'bg-amber-50',  text: 'text-amber-700'  },
  live_class:   { border: 'border-l-red-500',    label: 'Live class',   bg: 'bg-red-50',    text: 'text-red-700'    },
  announcement: { border: 'border-l-blue-500',   label: 'Announcement', bg: 'bg-blue-50',   text: 'text-blue-700'   },
  homework:     { border: 'border-l-purple-500', label: 'Homework',     bg: 'bg-purple-50', text: 'text-purple-700' },
  general:      { border: 'border-l-gray-400',   label: 'Notice',       bg: 'bg-gray-50',   text: 'text-gray-600'   },
}

// Shared container — wide cap removes the empty side gutters, responsive padding keeps mobile comfortable.
const CONTAINER = 'max-w-[1600px] mx-auto px-5 sm:px-8 lg:px-12 xl:px-20'

// ─── founder photo with graceful fallback ────────────────────────────────────

function FounderPhoto({ className, fallbackSize = 'text-7xl' }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <div className={`${className} flex items-center justify-center bg-gradient-to-br from-blue-900 to-[#0b0f3d]`}>
        <span className={`font-display font-bold text-amber-400/80 ${fallbackSize}`}>S</span>
      </div>
    )
  }
  return (
    <img
      src="/subodh.jpg"
      alt="Founder"
      className={`${className} object-cover object-top`}
      onError={() => setFailed(true)}
    />
  )
}

// ─── skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse flex flex-col w-full h-[320px] justify-between">
      <div className="bg-gray-200 aspect-video w-full" />
      <div className="p-3.5 sm:p-4 flex flex-col justify-between flex-1">
        <div className="space-y-2 mb-3">
          <div className="h-4 bg-gray-200 rounded-md w-5/6" />
          <div className="h-3 bg-gray-100 rounded-md w-2/3" />
        </div>
        <div className="pt-2.5 border-t border-gray-100 mt-auto flex items-center">
          <div className="h-4 bg-gray-200 rounded-md w-24" />
        </div>
      </div>
    </div>
  )
}

// ─── batch poster card ────────────────────────────────────────────────────────

function BatchPosterCard({ batch, index = 0 }) {
  const PALETTES = [
    'from-[#0f0c29] via-[#302b63] to-[#24243e]',
    'from-[#1a1a2e] via-[#16213e] to-[#0f3460]',
    'from-[#200122] via-[#6f0000] to-[#200122]',
    'from-[#0f2027] via-[#203a43] to-[#2c5364]',
    'from-[#1d2671] via-[#c33764] to-[#1d2671]',
    'from-[#11998e] via-[#38ef7d] to-[#11998e]',
  ]
  const palette = PALETTES[index % PALETTES.length]

  return (
    <Link
      to={`/batch-details?id=${batch.id}`}
      className="group block flex-shrink-0 w-40 sm:w-44 lg:w-48 max-w-[200px] snap-start"
    >
      <div className="relative rounded-2xl p-[1px] transition-all duration-300 group-hover:scale-[1.02]">
        {/* Poster image container */}
        <div
          className="relative rounded-2xl overflow-hidden aspect-[9/16] max-h-[320px] bg-slate-950 flex items-center justify-center border border-slate-200/80 group-hover:border-amber-400/80 shadow-md group-hover:shadow-xl group-hover:shadow-amber-500/15 transition-all duration-300"
          style={{ willChange: 'transform', transform: 'translateZ(0)' }}
        >
          {/* Hover shimmer effect */}
          <div
            className="absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{ background: 'linear-gradient(110deg, transparent 35%, rgba(255,255,255,0.12) 50%, transparent 65%)' }}
          />

          {batch.poster_url?.trim() ? (
            <DriveImage
              src={batch.poster_url.trim()}
              alt={batch.name}
              loading="lazy"
              className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
              fallback={
                <div className={`absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center bg-gradient-to-br ${palette}`}>
                  <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
                    <span className="text-2xl font-extrabold text-white">{batch.name?.charAt(0)?.toUpperCase()}</span>
                  </div>
                  <span className="text-white font-bold text-xs leading-tight px-2">{batch.name}</span>
                </div>
              }
            />
          ) : (
            <div className={`absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center bg-gradient-to-br ${palette}`}>
              <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
                <span className="text-2xl font-extrabold text-white">{batch.name?.charAt(0)?.toUpperCase()}</span>
              </div>
              <span className="text-white font-bold text-xs leading-tight px-2">{batch.name}</span>
            </div>
          )}

          {/* LIVE badge */}
          <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1 bg-red-600 text-white text-[9px] font-extrabold tracking-wider px-2 py-0.5 rounded-full shadow-md border border-white/20">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            LIVE
          </div>

          {/* Bottom hover overlay */}
          <div className="absolute inset-0 z-20 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-3 rounded-2xl">
            <p className="text-white text-[11px] font-bold leading-snug line-clamp-2 mb-1.5">{batch.name}</p>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400">
              View Details <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      </div>

      {/* Batch title below */}
      <p className="mt-2.5 text-center text-xs font-bold text-slate-800 leading-snug line-clamp-1 px-1 group-hover:text-amber-600 transition-colors">
        {batch.name}
      </p>
    </Link>
  )
}

// ─── batch posters section ────────────────────────────────────────────────────

function BatchPostersSection({ batches }) {
  if (!batches.length) return null

  return (
    <section className="relative bg-slate-50/70 border-b border-slate-200/60 overflow-hidden py-10">
      {/* Soft ambient background glows */}
      <div
        className="absolute top-0 left-1/4 w-96 h-96 rounded-full pointer-events-none opacity-40 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(254, 243, 199, 0.8) 0%, transparent 70%)' }}
      />
      <div
        className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full pointer-events-none opacity-30 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(219, 234, 254, 0.8) 0%, transparent 70%)' }}
      />

      <div className={`${CONTAINER} relative z-10`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-start gap-3.5">
            {/* Saffron accent indicator */}
            <div className="w-1.5 h-10 rounded-full bg-gradient-to-b from-amber-400 to-amber-500 mt-0.5 shadow-sm shadow-amber-400/40" />

            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
                  Running Batches
                </h2>

                {/* Batch count pill */}
                <span className="inline-flex items-center justify-center min-w-[1.6rem] h-6 px-2.5 rounded-full text-xs font-extrabold bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-sm shadow-amber-400/40">
                  {batches.length}
                </span>

                {/* Admissions open tag */}
                <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Admissions Open
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                🎓 Join a batch today &amp; start your learning journey
              </p>
            </div>
          </div>

          {/* Desktop action buttons */}
          <div className="hidden sm:flex items-center gap-3">
            <Link
              to="/batch-details"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:border-amber-400 hover:text-amber-600 hover:shadow-sm transition-all"
            >
              All Batches <ArrowRight className="h-3.5 w-3.5 text-amber-500" />
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-white font-bold text-xs shadow-md shadow-amber-400/30 hover:shadow-lg hover:from-amber-500 hover:to-amber-700 transition-all hover:-translate-y-0.5"
            >
              Enroll Now <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Mobile horizontal scroll layout - NO dark overlay mask on the right */}
        <div className="lg:hidden -mx-5 sm:-mx-8">
          <div className="flex gap-4 overflow-x-auto px-5 sm:px-8 pb-4 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:none]">
            {batches.map((b, i) => <BatchPosterCard key={b.id} batch={b} index={i} />)}
          </div>
        </div>

        {/* Desktop grid layout */}
        <div className="hidden lg:grid grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
          {batches.map((b, i) => <BatchPosterCard key={b.id} batch={b} index={i} />)}
        </div>

        {/* Mobile CTA below */}
        <div className="sm:hidden mt-6">
          <Link
            to="/register"
            className="flex items-center justify-center gap-2 py-3.5 w-full rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-white font-bold text-sm shadow-lg shadow-amber-400/30 hover:shadow-xl transition-all"
          >
            <GraduationCap className="h-5 w-5" />
            Enroll in a Batch <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}

// ─── lecture card ─────────────────────────────────────────────────────────────

function LectureCard({ card }) {
  const navigate = useNavigate()
  const thumb = card.thumbnail_url || getThumbnail(card.url)
  const isExternal = card.type === 'external_link'
  const desc  = card.description?.trim() || ''
  const isLong = desc.length > 65

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
    <div
      onClick={handleCardClick}
      className="group bg-white rounded-2xl border border-gray-200/80 hover:border-blue-300/80 overflow-hidden shadow-2xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col w-full h-full justify-between cursor-pointer"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-slate-950 shrink-0">
        {thumb
          ? <img src={thumb} alt={card.title} loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          : <div className="w-full h-full bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-950 flex items-center justify-center">
              <BookOpen className="h-10 w-10 text-blue-300/60" />
            </div>
        }
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300" />
        {!isExternal && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 sm:w-11 sm:h-11 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:bg-amber-500 group-hover:border-amber-400 group-hover:scale-110 transition-all duration-300 shadow-lg border border-white/20">
              <PlayCircle className="h-6 w-6 text-white ml-0.5" />
            </div>
          </div>
        )}
        {card.is_featured && (
          <span className="absolute top-2.5 left-2.5 bg-amber-400 text-blue-950 text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full shadow-xs">
            Featured
          </span>
        )}
      </div>

      {/* Symmetrical Flex Body */}
      <div className="p-3.5 sm:p-4 flex flex-col justify-between flex-1">
        <div>
          <h3 className="font-semibold text-gray-900 text-xs sm:text-sm leading-snug line-clamp-2 min-h-[2.5rem] flex items-start group-hover:text-blue-950 transition-colors">
            {card.title}
          </h3>
          <div className="text-xs text-gray-500 leading-relaxed min-h-[2.5rem] mt-1.5 flex items-start">
            {desc ? (
              <p className="line-clamp-2">
                {isLong ? (
                  <>
                    {desc.slice(0, 65)}…{' '}
                    <button
                      type="button"
                      onClick={handleOpen}
                      className="text-amber-600 hover:text-amber-700 font-bold text-[11px] inline-flex items-center hover:underline cursor-pointer"
                    >
                      Read More
                    </button>
                  </>
                ) : (
                  desc
                )}
              </p>
            ) : (
              <span className="text-gray-300 italic">No description</span>
            )}
          </div>
        </div>

        <div className="pt-2.5 border-t border-gray-100 shrink-0 flex items-center justify-between mt-3">
          <button
            type="button"
            onClick={handleOpen}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-amber-600 hover:text-amber-700 transition-colors cursor-pointer"
          >
            {!isExternal
              ? <><Youtube className="h-4 w-4 text-red-600" /> Watch now</>
              : <><ExternalLink className="h-4 w-4 text-blue-600" /> Open resource</>}
          </button>
        </div>
      </div>
    </div>
  )
}



// ─── notification row ─────────────────────────────────────────────────────────

function NotifRow({ n, isNew, compact = false }) {
  const style = NOTIF_STYLES[n.type] || NOTIF_STYLES.general
  return (
    <div className={`${compact ? 'px-4 py-3' : 'px-5 py-4'} border-l-4 ${style.border} bg-white/40 hover:bg-white/90 transition-colors`}>
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${style.bg} ${style.text}`}>
          {style.label}
        </span>
        {isNew(n.created_at)
          ? <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 mt-1 animate-pulse" />
          : <span className="text-xs text-gray-400">{timeAgo(n.created_at)}</span>}
      </div>
      <p className="text-sm font-semibold text-gray-800 leading-snug">{n.title}</p>
      {n.body && <p className="text-xs text-gray-600 mt-1 leading-relaxed whitespace-pre-line">{n.body}</p>}
      {!compact && <p className="text-xs text-gray-400 mt-1.5">{timeAgo(n.created_at)}</p>}

    </div>
  )
}

// ─── main ──────────────────────────────────────────────────────────────────────

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
  const featRef     = useRef(null)

  // Screen column detector for exact dynamic responsive layout
  useEffect(() => {
    const updateCols = () => {
      const w = window.innerWidth
      if (w < 500) setCols(1)
      else if (w < 1280) setCols(2)
      else setCols(3)
    }
    updateCols()
    window.addEventListener('resize', updateCols)
    return () => window.removeEventListener('resize', updateCols)
  }, [])

  // Featured scroll — robust: scroll by ~one card width
  const scrollFeatured = (dir) => {
    if (featRef.current) {
      const amount = Math.min(340, featRef.current.clientWidth * 0.9)
      featRef.current.scrollBy({ left: dir * amount, behavior: 'smooth' })
    }
  }

  // Trust / Info cards mobile snap scroll
  const trustScrollRef = useRef(null)
  const [activeTrustIndex, setActiveTrustIndex] = useState(0)

  const scrollToTrustCard = (index) => {
    if (!trustScrollRef.current) return
    const container = trustScrollRef.current
    const cards = container.querySelectorAll('[data-trust-card]')
    if (cards[index]) {
      const card = cards[index]
      const left = card.offsetLeft - container.offsetLeft - (container.clientWidth - card.clientWidth) / 2
      container.scrollTo({ left, behavior: 'smooth' })
      setActiveTrustIndex(index)
    }
  }

  const handleTrustScroll = (e) => {
    const container = e.currentTarget
    const scrollLeft = container.scrollLeft
    const card = container.querySelector('[data-trust-card]')
    if (!card) return
    const cardWidth = card.offsetWidth + 12
    const newIndex = Math.min(3, Math.max(0, Math.round(scrollLeft / cardWidth)))
    if (newIndex !== activeTrustIndex) {
      setActiveTrustIndex(newIndex)
    }
  }

  useEffect(() => {
    let cancelled = false
    supabase.from('notifications')
      .select('id, title, body, type, created_at, scheduled_at, expires_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (cancelled) return
        const nNow = new Date()
        const valid = (data ?? []).filter(n => {
          if (n.scheduled_at && new Date(n.scheduled_at) > nNow) return false
          if (n.expires_at   && new Date(n.expires_at)   < nNow) return false
          return true
        }).slice(0, 20)
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

  // Fetch batches that have a poster image set — for the homepage gallery
  // Wrapped in error check: silently no-ops if the migration hasn't been run yet
  useEffect(() => {
    let cancelled = false
    supabase.from('batches')
      .select('id, name, poster_url')
      .eq('is_active', true)
      .not('poster_url', 'is', null)
      .order('name')
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) return // column doesn't exist yet — migration pending
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
            // Fallback: fetch all public cards and filter in memory if OR syntax errors on DB schema
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

  // Dynamic page size calculation: computes an optimal page size (multiple of cols)
  // so that cards divide into equal, symmetrical pages without trailing partial rows
  const dynamicPageSize = useMemo(() => {
    const total = cards.length
    if (!total || total <= 0) return cols * 2

    // Check if total splits evenly into cols * rows
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
    <div className="min-h-screen bg-gray-50">

      {/* ════════════ HERO ════════════ */}
      <section className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #060b2e 0%, #0d1560 35%, #1a237e 65%, #0a0e3d 100%)' }}>
        {/* ambient blobs + grid */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="absolute top-1/2 -left-40 w-[480px] h-[480px] rounded-full bg-blue-600/15 blur-3xl" />
          <div className="absolute bottom-0 right-1/3 w-[360px] h-[360px] rounded-full bg-violet-700/10 blur-3xl" />
          {/* subtle dot grid */}
          <div className="absolute inset-0 opacity-[0.07]"
            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
          {/* top shimmer line */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent" />

          {/* ── faded study elements ── */}
          <div className="absolute inset-0 overflow-hidden select-none" aria-hidden="true">
            {/* top-left cluster */}
            <span className="absolute top-[8%]  left-[4%]  text-white/[0.18] font-mono text-5xl font-bold">E=mc²</span>
            <span className="absolute top-[22%] left-[2%]  text-white/[0.13] font-mono text-2xl">∫f(x)dx</span>
            <span className="absolute top-[38%] left-[6%]  text-white/[0.15] font-mono text-3xl font-semibold">F = ma</span>
            <span className="absolute top-[58%] left-[3%]  text-white/[0.12] font-mono text-xl">d/dx(sin x) = cos x</span>
            <span className="absolute top-[74%] left-[5%]  text-white/[0.13] font-mono text-2xl">PV = nRT</span>

            {/* mid-left */}
            <span className="absolute top-[12%] left-[18%] text-white/[0.11] font-mono text-xl">λ = h/mv</span>
            <span className="absolute top-[50%] left-[14%] text-white/[0.13] font-mono text-3xl">∑n²</span>
            <span className="absolute top-[82%] left-[16%] text-white/[0.10] font-mono text-lg">log(ab) = log a + log b</span>

            {/* top-center */}
            <span className="absolute top-[5%]  left-[38%] text-white/[0.12] font-mono text-2xl">a² + b² = c²</span>
            <span className="absolute top-[18%] left-[44%] text-white/[0.10] font-mono text-lg">Δv = aΔt</span>

            {/* centre fill */}
            <span className="absolute top-[25%] left-[32%] text-white/[0.11] font-mono text-xl">v² = u² + 2as</span>
            <span className="absolute top-[33%] left-[46%] text-white/[0.10] font-mono text-lg">T = 2π√(l/g)</span>
            <span className="absolute top-[40%] left-[33%] text-white/[0.12] font-mono text-2xl">∂²y/∂x² + k²y = 0</span>
            <span className="absolute top-[47%] left-[50%] text-white/[0.10] font-mono text-xl">W = Fd cosθ</span>
            <span className="absolute top-[54%] left-[36%] text-white/[0.11] font-mono text-lg">s = ut + ½at²</span>
            <span className="absolute top-[61%] left-[48%] text-white/[0.10] font-mono text-xl">n = c / v</span>
            <span className="absolute top-[68%] left-[34%] text-white/[0.12] font-mono text-2xl">E = hf</span>
            <span className="absolute top-[76%] left-[47%] text-white/[0.10] font-mono text-lg">KE = ½mv²</span>

            {/* right side — surrounding the photo */}
            {/* above photo */}
            <span className="absolute top-[3%]  right-[24%] text-white/[0.12] font-mono text-lg">∇²ψ = 0</span>
            <span className="absolute top-[5%]  right-[8%]  text-white/[0.13] font-mono text-2xl">F = qE</span>
            <span className="absolute top-[10%] right-[16%] text-white/[0.11] font-mono text-base">ΔS ≥ 0</span>
            {/* left of photo */}
            <span className="absolute top-[22%] right-[31%] text-white/[0.11] font-mono text-lg">μ = m/V</span>
            <span className="absolute top-[32%] right-[30%] text-white/[0.12] font-mono text-xl">τ = Iα</span>
            <span className="absolute top-[44%] right-[31%] text-white/[0.11] font-mono text-lg">p = h/λ</span>
            <span className="absolute top-[56%] right-[30%] text-white/[0.12] font-mono text-xl">Q = mcΔT</span>
            <span className="absolute top-[68%] right-[31%] text-white/[0.11] font-mono text-lg">∮B·dl = μ₀I</span>
            <span className="absolute top-[78%] right-[30%] text-white/[0.12] font-mono text-xl">ω = dθ/dt</span>
            {/* below photo */}
            <span className="absolute top-[84%] right-[18%] text-white/[0.13] font-mono text-xl">sin²θ + cos²θ = 1</span>
            <span className="absolute top-[90%] right-[6%]  text-white/[0.12] font-mono text-lg">n₁sinθ₁ = n₂sinθ₂</span>
            <span className="absolute top-[93%] right-[26%] text-white/[0.11] font-mono text-base">ε = −dΦ/dt</span>
            <span className="absolute top-[96%] right-[12%] text-white/[0.11] font-mono text-lg">C₆H₁₂O₆</span>

            {/* large ghost symbols */}
            <span className="absolute top-[30%] left-[28%]  text-white/[0.07] font-mono text-[8rem] font-bold leading-none">π</span>
            <span className="absolute top-[55%] right-[28%] text-white/[0.07] font-mono text-[7rem] font-bold leading-none">∞</span>
            <span className="absolute top-[10%] right-[28%] text-white/[0.07] font-mono text-[6rem] font-bold leading-none">Σ</span>
            <span className="absolute bottom-[8%] left-[30%] text-white/[0.07] font-mono text-[5rem] font-bold leading-none">Δ</span>

            {/* accents */}
            <span className="absolute top-[45%] left-[35%]  text-white/[0.12] text-2xl">⚛</span>
            <span className="absolute top-[28%] right-[18%] text-white/[0.12] text-2xl">🔬</span>
            <span className="absolute top-[65%] left-[22%]  text-white/[0.12] text-xl">📐</span>
            <span className="absolute bottom-[14%] left-[44%] text-white/[0.10] font-mono text-base">H₂O + CO₂ → C₆H₁₂O₆ + O₂</span>
          </div>
        </div>

        <div className={`relative ${CONTAINER} grid lg:grid-cols-[1.15fr_0.85fr] items-center gap-12 lg:gap-16 pt-14 pb-20 sm:pt-16 lg:pt-24 lg:pb-28`}>
          {/* LEFT */}
          <div className="text-center lg:text-left">
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mb-6">
              <div className="inline-flex items-center gap-2 bg-white/10 text-blue-200 text-xs font-semibold px-4 py-1.5 rounded-full border border-white/15 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                Batch 2025–26 · Admissions open
              </div>
              <InstallHeaderButton />
            </div>
            <h1 className="font-display font-extrabold text-white tracking-tight leading-[1.08] text-4xl sm:text-5xl lg:text-6xl xl:text-[4.25rem] mb-6">
              {INSTITUTE_NAME}
            </h1>
            <p className="text-blue-200/75 text-lg sm:text-xl leading-relaxed mb-10 max-w-xl mx-auto lg:mx-0">
              {INSTITUTE_TAGLINE}
            </p>
            <div className="grid grid-cols-2 sm:flex sm:flex-row gap-3 justify-center lg:justify-start">
              <Link to="/batch-details"
                className="inline-flex items-center justify-center gap-2 px-3 sm:px-6 py-3.5 bg-amber-400 hover:bg-amber-500 text-blue-950 font-bold rounded-xl shadow-lg shadow-amber-400/20 transition-all duration-200 text-sm">
                <BookOpen className="h-4 w-4 shrink-0" /> <span className="truncate">Batch Details</span>
              </Link>
              <Link to="/login"
                className="group inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-3.5 bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-400 hover:to-blue-400 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all duration-200 text-sm">
                <span className="truncate">Login</span>
                <ArrowRight className="h-4 w-4 shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link to="/register"
                className="col-span-2 sm:col-span-1 inline-flex items-center justify-center px-6 py-3.5 border border-white/25 text-white hover:bg-white/10 hover:border-white/40 font-semibold rounded-xl transition-all duration-200 backdrop-blur-sm text-sm">
                Register now
              </Link>
            </div>

          </div>

          {/* RIGHT — portrait */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative w-full max-w-[300px] sm:max-w-[340px]">
              <div className="absolute -inset-3 bg-amber-400/10 rounded-[2rem] blur-xl" />
              <div className="relative rounded-[1.75rem] overflow-hidden border border-white/10 ring-1 ring-amber-400/30 shadow-2xl">
                <FounderPhoto className="w-full aspect-[4/5]" />
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-5 pb-5 pt-14">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse flex-shrink-0" />
                    <p className="text-white font-bold text-base tracking-wide">Subodh Verma</p>
                  </div>
                  <span className="inline-block ml-4 mb-3 text-[10px] font-bold uppercase tracking-widest text-amber-400 bg-amber-400/15 border border-amber-400/30 px-2.5 py-0.5 rounded-full">
                    Lead Educator &amp; Founder
                  </span>
                  <div className="ml-4 border-l-2 border-amber-400/40 pl-3 space-y-0.5">
                    <p className="text-blue-100/90 text-xs font-semibold">MSc Physics</p>
                    <p className="text-blue-200/65 text-xs">Banaras Hindu University (BHU)</p>
                    <p className="text-blue-200/50 text-xs">Varanasi, Uttar Pradesh</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* curve divider */}
        <div className="relative h-10 sm:h-14 -mb-px">
          <svg viewBox="0 0 1440 64" preserveAspectRatio="none" className="absolute bottom-0 w-full h-full" fill="none">
            <path d="M0 64 L1440 64 L1440 24 C1080 60 360 60 0 24 Z" fill="#f8fafc" />
          </svg>
        </div>
      </section>

      {/* ════════════ BATCH POSTERS ════════════ */}
      <BatchPostersSection batches={batchPosters} />

      {/* ════════════ INFO & TRUST STRIP ════════════ */}
      <section className="bg-white border-b border-slate-100">
        <div className={`${CONTAINER} py-4 sm:py-8 lg:py-12`}>
          {/* Mobile: Horizontal Snap Carousel (compact ~130px height) | Tablet: 2-Col Grid | Desktop: 4-Col Grid */}
          <div
            ref={trustScrollRef}
            onScroll={handleTrustScroll}
            className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 overflow-x-auto sm:overflow-visible pb-1 sm:pb-0 snap-x snap-mandatory scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-5 px-5 sm:mx-0 sm:px-0"
          >
            <div
              data-trust-card
              className="w-[84vw] max-w-[320px] sm:w-auto shrink-0 snap-center p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-slate-50/70 border border-slate-200/70 hover:border-indigo-300 hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3 sm:block">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform sm:mb-3">
                      <Video className="h-4 w-4 sm:h-6 sm:w-6" />
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-100/60 px-2 py-0.5 rounded-md inline-block sm:mb-1.5">
                      HD STREAMING &amp; LIVE
                    </span>
                  </div>
                  <span className="sm:hidden text-[9.5px] font-extrabold text-slate-400 bg-slate-200/70 px-1.5 py-0.5 rounded">
                    1 / 4
                  </span>
                </div>
                <h3 className="font-extrabold text-slate-900 text-sm mb-1 leading-snug">Live &amp; Recorded Classes</h3>
                <p className="text-slate-500 text-xs leading-relaxed">Attend interactive sessions live, or catch up anytime with protected 1080p replay &amp; speed controls.</p>
              </div>
            </div>

            <div
              data-trust-card
              className="w-[84vw] max-w-[320px] sm:w-auto shrink-0 snap-center p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-slate-50/70 border border-slate-200/70 hover:border-amber-300 hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3 sm:block">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform sm:mb-3">
                      <MessageSquare className="h-4 w-4 sm:h-6 sm:w-6" />
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded-md inline-block sm:mb-1.5">
                      1-ON-1 MENTORSHIP
                    </span>
                  </div>
                  <span className="sm:hidden text-[9.5px] font-extrabold text-slate-400 bg-slate-200/70 px-1.5 py-0.5 rounded">
                    2 / 4
                  </span>
                </div>
                <h3 className="font-extrabold text-slate-900 text-sm mb-1 leading-snug">Personal Doubt Support</h3>
                <p className="text-slate-500 text-xs leading-relaxed">Message Subodh Sir directly or ask timestamped doubts during video playback. No question is left behind.</p>
              </div>
            </div>

            <div
              data-trust-card
              className="w-[84vw] max-w-[320px] sm:w-auto shrink-0 snap-center p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-slate-50/70 border border-slate-200/70 hover:border-emerald-300 hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3 sm:block">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform sm:mb-3">
                      <BookOpen className="h-4 w-4 sm:h-6 sm:w-6" />
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-md inline-block sm:mb-1.5">
                      SMART STUDY CARDS
                    </span>
                  </div>
                  <span className="sm:hidden text-[9.5px] font-extrabold text-slate-400 bg-slate-200/70 px-1.5 py-0.5 rounded">
                    3 / 4
                  </span>
                </div>
                <h3 className="font-extrabold text-slate-900 text-sm mb-1 leading-snug">Handwritten Notes &amp; DPPs</h3>
                <p className="text-slate-500 text-xs leading-relaxed">Organized chapter formula sheets, practice problems, and downloadable PDFs tailored to your batch syllabus.</p>
              </div>
            </div>

            <div
              data-trust-card
              className="w-[84vw] max-w-[320px] sm:w-auto shrink-0 snap-center p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-slate-50/70 border border-slate-200/70 hover:border-rose-300 hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3 sm:block">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform sm:mb-3">
                      <CheckCircle2 className="h-4 w-4 sm:h-6 sm:w-6" />
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-rose-700 bg-rose-100/60 px-2 py-0.5 rounded-md inline-block sm:mb-1.5">
                      HABIT &amp; TRACKING
                    </span>
                  </div>
                  <span className="sm:hidden text-[9.5px] font-extrabold text-slate-400 bg-slate-200/70 px-1.5 py-0.5 rounded">
                    4 / 4
                  </span>
                </div>
                <h3 className="font-extrabold text-slate-900 text-sm mb-1 leading-snug">Streak &amp; Attendance Gauge</h3>
                <p className="text-slate-500 text-xs leading-relaxed">Daily check-in streak flames, interactive attendance gauges, and homework deadlines to foster peak consistency.</p>
              </div>
            </div>

            {/* Spacer for smooth end snap on mobile */}
            <div className="w-2 shrink-0 sm:hidden" aria-hidden="true" />
          </div>

          {/* Interactive Carousel Indicator Dots (Mobile Only) */}
          <div className="flex sm:hidden items-center justify-center gap-1.5 mt-2.5">
            {[0, 1, 2, 3].map((idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => scrollToTrustCard(idx)}
                aria-label={`Go to feature slide ${idx + 1}`}
                className={`transition-all duration-300 rounded-full h-1.5 ${
                  activeTrustIndex === idx
                    ? 'w-5 bg-indigo-600'
                    : 'w-1.5 bg-slate-300 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ════════════ MOBILE "What's On" (above lectures) ════════════ */}
      {notifications.length > 0 && (
        <div className={`lg:hidden ${CONTAINER} pt-6`}>
          <div className="bg-slate-100/90 border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200/80 bg-slate-200/50">
              <Bell className="h-4 w-4 text-blue-950" />
              <h2 className="font-bold text-gray-900 text-sm">What&apos;s on</h2>
              {hasNew && (
                <span className="ml-auto flex items-center gap-1 text-xs text-red-500 font-medium">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" /> New
                </span>
              )}
            </div>
            {/* hidden native scrollbars for modern mobile feel */}
            <div className="divide-y divide-slate-200/60 max-h-56 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:none]">
              {notifications.slice(0, 3).map(n => <NotifRow key={n.id} n={n} isNew={isNew} compact />)}
            </div>
            <div className="px-4 py-3 bg-slate-200/50 border-t border-slate-200/80">
              <Link to="/login" className="block w-full text-center py-2 bg-blue-950 hover:bg-blue-900 text-white text-sm font-semibold rounded-xl transition-colors">
                Login to see all updates →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ LECTURES + SIDEBAR ════════════ */}
      <div className={`${CONTAINER} py-10 lg:py-12`}>
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-10">

          {/* LEFT: Feed */}
          <div className="flex-1 min-w-0">

            {/* Featured */}
            {featured.length > 0 && (
              <section className="mb-12 bg-gradient-to-br from-[#0c1938] via-[#11234f] to-[#0a122c] rounded-3xl p-3.5 sm:p-6 border border-blue-800/50 shadow-xl relative overflow-hidden">
                {/* Background decorative glow */}
                <div className="absolute -top-24 -right-24 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-center justify-between mb-3.5 sm:mb-5 relative z-10 px-1">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <span className="w-1.5 h-8 bg-amber-400 rounded-full shadow-sm shadow-amber-400/40" />
                    <div>
                      <h2 className="font-display font-extrabold text-lg sm:text-2xl text-white leading-tight">Featured lectures</h2>
                      <p className="text-[11px] sm:text-xs text-blue-200/80 font-medium mt-0.5">Handpicked by your teacher</p>
                    </div>
                  </div>
                  {/* Desktop scroll buttons */}
                  <div className="hidden sm:flex gap-2">
                    <button onClick={() => scrollFeatured(-1)} aria-label="Scroll left"
                      className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white transition-colors cursor-pointer">
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button onClick={() => scrollFeatured(1)} aria-label="Scroll right"
                      className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white transition-colors cursor-pointer">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  {/* Mobile swipe hint text */}
                  <span className="sm:hidden text-[10px] font-semibold text-amber-300/90 bg-amber-400/10 border border-amber-400/20 px-2.5 py-1 rounded-full flex items-center gap-1">
                    Swipe <ArrowRight className="h-2.5 w-2.5 animate-pulse" />
                  </span>
                </div>

                {/* Horizontal swipe with prominent 2nd card glimpse on mobile */}
                <div ref={featRef} className="overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:none] relative z-10">
                  <div className="flex gap-3 sm:gap-5" style={{ width: 'max-content' }}>
                    {featured.map(c => (
                      <div key={c.id} className="w-[65vw] max-w-[225px] sm:w-[310px] flex-shrink-0 snap-start">
                        <LectureCard card={c} />
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* All lectures */}
            <section>
              <div className="mb-5 space-y-3.5">
                {/* Header Title + Nav Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-1.5 h-8 bg-gradient-to-b from-blue-600 to-indigo-600 rounded-full" />
                    <div>
                      <h2 className="font-display font-extrabold text-xl sm:text-2xl text-gray-900 leading-tight">All lectures</h2>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {totalCards > 0 ? `${totalCards} resource${totalCards > 1 ? 's' : ''} available` : 'Browse all study material'}
                      </p>
                    </div>
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white border border-gray-200 hover:bg-blue-50 hover:border-blue-300 text-gray-700 hover:text-blue-600 disabled:opacity-30 flex items-center justify-center transition-all shadow-2xs active:scale-95 cursor-pointer"
                        title="Previous Page"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="text-xs font-semibold text-gray-500 px-1">
                        {page}/{totalPages}
                      </span>
                      <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white border border-gray-200 hover:bg-blue-50 hover:border-blue-300 text-gray-700 hover:text-blue-600 disabled:opacity-30 flex items-center justify-center transition-all shadow-2xs active:scale-95 cursor-pointer"
                        title="Next Page"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Category filter pills - full width scrollable bar */}
                <div className="w-full overflow-x-auto pb-1 -mb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:none]">
                  <div className="flex gap-2 w-max items-center">
                    <button onClick={() => { setActiveBatch('all'); setPage(1) }}
                      className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer ${
                        activeBatch === 'all'
                          ? 'bg-blue-950 text-white shadow-md shadow-blue-950/20'
                          : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                      All
                    </button>
                    {batches.map(b => (
                      <button key={b.id} onClick={() => { setActiveBatch(b.id); setPage(1) }}
                        className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer ${
                          activeBatch === b.id
                            ? 'bg-blue-950 text-white shadow-md shadow-blue-950/20'
                            : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        {b.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {loading ? (
                <div
                  className="grid gap-3.5 sm:gap-5 items-stretch"
                  style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
                >
                  {[...Array(dynamicPageSize)].map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              ) : cards.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="h-8 w-8 text-gray-300" />
                  </div>
                  <p className="text-gray-600 font-semibold">No lectures here yet.</p>
                  <p className="text-gray-400 text-sm mt-1">Content is being added — check back soon.</p>
                </div>
              ) : (
                <>
                  <div
                    className="grid gap-3.5 sm:gap-5 items-stretch"
                    style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
                  >
                    {visibleCards.map(card => (
                      <LectureCard key={card.id} card={card} />
                    ))}
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-8">
                      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                        className="p-2 sm:p-2.5 rounded-xl border border-gray-200 hover:bg-gray-100 disabled:opacity-30 transition-colors cursor-pointer"
                        title="Previous page">
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      {[...Array(totalPages)].map((_, i) => (
                        <button key={i} onClick={() => setPage(i + 1)}
                          className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer ${
                            page === i + 1 ? 'bg-blue-950 text-white shadow-sm' : 'border border-gray-200 hover:bg-gray-100 text-gray-700'}`}>
                          {i + 1}
                        </button>
                      ))}
                      <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                        className="p-2 sm:p-2.5 rounded-xl border border-gray-200 hover:bg-gray-100 disabled:opacity-30 transition-colors cursor-pointer"
                        title="Next page">
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>

          {/* RIGHT: True Sticky Sidebar */}
          <aside className="hidden lg:block w-80 flex-shrink-0">
            {/* sticky top-6 natively works here as long as no parent hides the overflow */}
            <div className="bg-slate-100/90 border border-slate-200/90 rounded-2xl shadow-xs sticky top-6 overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-200/80 bg-slate-200/50">
                <Bell className="h-5 w-5 text-blue-950" />
                <h2 className="font-bold text-gray-900">What&apos;s on</h2>
                {hasNew && (
                  <span className="ml-auto flex items-center gap-1.5 text-xs text-red-500 font-semibold">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" /> New
                  </span>
                )}
              </div>
              {notifications.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <Sparkles className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No announcements right now.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200/60 max-h-[500px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:none]">
                  {notifications.map(n => <NotifRow key={n.id} n={n} isNew={isNew} />)}
                </div>
              )}
              <div className="px-5 py-4 border-t border-slate-200/80 bg-slate-200/50">
                <Link to="/login" className="block w-full text-center py-2.5 bg-blue-950 hover:bg-blue-900 text-white text-sm font-semibold rounded-xl transition-colors">
                  Login to see all updates →
                </Link>
              </div>
            </div>
          </aside>

        </div>
      </div>

      {/* ════════════ FOUNDER / PHILOSOPHY ════════════ */}
      <section className="bg-white border-t border-gray-100">
        <div className={`${CONTAINER} py-14 sm:py-16 text-center max-w-3xl mx-auto`}>
          <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-2">Our Philosophy</p>
          <h3 className="font-display font-bold text-2xl sm:text-3xl text-gray-900 mb-4">Honest Effort, Real Results</h3>
          <p className="text-gray-500 text-base leading-relaxed">
            Thoughtful&apos;s Academy started from one idea — that students learn best when the teaching is
            unhurried and the door to asking questions is always open. No noise, no pressure tactics.
            Just clear explanations, steady practice, and an educator who actually picks up when you&apos;re stuck.
          </p>
          <div className="flex flex-wrap gap-2 mt-6 justify-center">
            {['Expert Faculty', 'Interactive Learning', 'Comprehensive Materials'].map(tag => (
              <span key={tag} className="text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1.5 rounded-full cursor-default">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════ FOOTER ════════════ */}
      <footer className="bg-[#080d38] text-indigo-200 border-t border-indigo-900/60 relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className={`${CONTAINER} py-10 sm:py-12 relative z-10`}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-8">
            {/* Branding */}
            <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-9 h-9 bg-amber-400 rounded-xl flex items-center justify-center shadow-md shadow-amber-400/20 shrink-0">
                  <GraduationCap className="h-5 w-5 text-slate-950 font-black" />
                </div>
                <span className="font-display font-extrabold text-white text-lg sm:text-xl tracking-tight">
                  {INSTITUTE_NAME}
                </span>
              </div>
              <p className="text-indigo-200/70 text-xs sm:text-sm font-medium">
                {INSTITUTE_TAGLINE}
              </p>
            </div>

            {/* Email Contact Badge */}
            {CONTACT_EMAIL && (
              <div className="w-full sm:w-auto flex justify-center">
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="inline-flex items-center gap-2 max-w-full px-3.5 py-2 bg-indigo-950/60 border border-indigo-800/60 rounded-xl text-indigo-200 hover:text-white text-xs sm:text-sm font-medium transition-colors shadow-sm overflow-hidden"
                >
                  <Mail className="h-4 w-4 text-amber-400 shrink-0" />
                  <span className="truncate">{CONTACT_EMAIL}</span>
                </a>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-center">
              <Link
                to="/login"
                className="flex-1 sm:flex-initial px-5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-amber-400/20 transition-all text-center"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="flex-1 sm:flex-initial px-5 py-2 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 text-white font-semibold text-xs sm:text-sm rounded-xl transition-all text-center"
              >
                Apply Now
              </Link>
            </div>
          </div>

          {/* Copyright Divider */}
          <div className="border-t border-indigo-900/50 mt-8 pt-5 text-center text-xs text-indigo-300/60 font-medium">
            © {new Date().getFullYear()} {INSTITUTE_NAME}. Designed for excellence.
          </div>
        </div>

        {/* Mobile bottom spacing inside footer so background covers all the way to the end of the page */}
        <div className="h-16 lg:hidden bg-inherit" />
      </footer>
    </div>
  )
}