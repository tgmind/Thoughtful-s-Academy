import { useState, useEffect, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  GraduationCap, PlayCircle, ExternalLink, BookOpen, Bell,
  ChevronLeft, ChevronRight, Mail, Phone, Youtube, ArrowRight,
  Video, MessageSquare, CheckCircle2, Sparkles, X,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import {
  INSTITUTE_NAME, INSTITUTE_TAGLINE, CONTACT_EMAIL, CONTACT_PHONE,
} from '../lib/constants'
import { getYouTubeThumbnail, normalizeUrl, convertDriveUrl } from '../utils/formatters'
import DriveImage from '../components/shared/DriveImage'

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

function truncate(str, n = 90) {
  if (!str) return ''
  return str.length > n ? str.slice(0, n) + '…' : str
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
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse flex flex-col w-full h-[320px] justify-between shrink-0">
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

function BatchPosterCard({ batch }) {
  const [imgFailed, setImgFailed] = useState(false)
  const src = convertDriveUrl(batch.poster_url)

  // Gradient colours cycle through a curated palette
  const GRADIENTS = [
    'from-indigo-700 to-blue-900',
    'from-violet-700 to-purple-900',
    'from-amber-600 to-orange-900',
    'from-teal-600 to-cyan-900',
    'from-rose-600 to-pink-900',
    'from-emerald-600 to-green-900',
  ]
  // Stable colour per batch name
  const grad = GRADIENTS[(batch.name?.charCodeAt(0) ?? 0) % GRADIENTS.length]

  return (
    <Link
      to={`/batch-details?id=${batch.id}`}
      className="group block flex-shrink-0 w-40 sm:w-44 lg:w-48 max-w-[200px] snap-start"
    >
      {/* Poster image — portrait aspect 9:16 + object-contain so NO cropping happens */}
      <div className={`relative rounded-2xl overflow-hidden aspect-[9/16] max-h-[320px] shadow-md group-hover:shadow-2xl group-hover:-translate-y-1.5 transition-all duration-300 bg-slate-900/90 flex items-center justify-center p-0.5 border border-gray-100`}>

        {batch.poster_url?.trim() ? (
          <DriveImage
            src={batch.poster_url.trim()}
            alt={batch.name}
            loading="lazy"
            className="w-full h-full object-contain rounded-xl"
            fallback={
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 text-center bg-gradient-to-br from-indigo-900 to-blue-950">
                <span className="text-4xl font-extrabold text-white/30">{batch.name?.charAt(0)?.toUpperCase()}</span>
                <span className="text-white font-bold text-sm leading-tight">{batch.name}</span>
              </div>
            }
          />
        ) : (
          /* Fallback: gradient + initials */
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 text-center bg-gradient-to-br from-indigo-900 to-blue-950">
            <span className="text-4xl font-extrabold text-white/30">{batch.name?.charAt(0)?.toUpperCase()}</span>
            <span className="text-white font-bold text-sm leading-tight">{batch.name}</span>
          </div>
        )}

        {/* Hover overlay with name */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3 rounded-2xl">
          <span className="text-white text-xs font-bold leading-snug line-clamp-2">{batch.name}</span>
        </div>
      </div>
    </Link>

  )
}

// ─── batch posters section ────────────────────────────────────────────────────

function BatchPostersSection({ batches }) {
  if (!batches.length) return null

  return (
    <section className="bg-white border-b border-gray-100">
      <div className={`${CONTAINER} py-10`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="w-1 h-8 bg-amber-400 rounded-full" />
            <div>
              <h2 className="font-display font-bold text-xl text-gray-900 leading-tight">Running Batches</h2>
              <p className="text-xs text-gray-400 mt-0.5">Join a batch and start learning today</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <Link
              to="/batch-details"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Batch Details <ArrowRight className="h-3.5 w-3.5 text-amber-500" />
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 hover:text-amber-700 transition-colors"
            >
              Enroll Now <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Mobile: horizontal snap scroll | Desktop: grid */}
        <div className="lg:hidden -mx-5 sm:-mx-8">
          <div
            className="flex gap-4 overflow-x-auto px-5 sm:px-8 pb-3 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:none]"
          >
            {batches.map(b => <BatchPosterCard key={b.id} batch={b} />)}
          </div>
        </div>

        <div className="hidden lg:grid grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5">
          {batches.map(b => <BatchPosterCard key={b.id} batch={b} />)}
        </div>

        {/* Mobile CTA below */}
        <div className="sm:hidden mt-5">
          <Link
            to="/register"
            className="flex items-center justify-center gap-2 py-3 w-full rounded-xl bg-amber-400 hover:bg-amber-500 text-white font-bold text-sm transition-colors shadow-md shadow-amber-400/30"
          >
            Enroll in a Batch <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}

// ─── lecture card ─────────────────────────────────────────────────────────────

function LectureCard({ card, onSelectCard }) {
  const thumb = card.thumbnail_url || getThumbnail(card.url)
  const isYT  = card.type === 'youtube_video' || card.type === 'youtube_playlist'
  const desc  = card.description?.trim() || ''
  const isLong = desc.length > 65

  return (
    <div className="group bg-white rounded-2xl border border-gray-100/90 overflow-hidden shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col w-full h-full justify-between shrink-0">
      <div className="relative overflow-hidden shrink-0">
        {thumb
          ? <img src={thumb} alt={card.title} loading="lazy"
              className="w-full aspect-video object-cover transition-transform duration-500 group-hover:scale-105" />
          : <div className="w-full aspect-video bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
              <BookOpen className="h-10 w-10 text-blue-400/80" />
            </div>
        }
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        {isYT && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 sm:w-11 sm:h-11 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:bg-amber-500 transition-colors duration-300 shadow-lg">
              <PlayCircle className="h-6 w-6 sm:h-6 sm:w-6 text-white ml-0.5" />
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
        <div className="space-y-1.5 mb-3">
          <h3 className="font-semibold text-gray-900 text-xs sm:text-sm leading-snug line-clamp-2 min-h-[2.5rem] flex items-center">
            {card.title}
          </h3>
          <div className="text-xs text-gray-500 leading-relaxed min-h-[2.5rem] flex items-start">
            {desc ? (
              <p className="line-clamp-2">
                {isLong ? (
                  <>
                    {desc.slice(0, 65)}…{' '}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onSelectCard?.(card) }}
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
              <span>&nbsp;</span>
            )}
          </div>
        </div>

        <div className="pt-2.5 border-t border-gray-100 shrink-0 flex items-center justify-between mt-auto">
          <a href={normalizeUrl(card.url)} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-amber-600 hover:text-amber-700 transition-colors">
            {isYT
              ? <><Youtube className="h-4 w-4 text-red-600" /> Watch now</>
              : <><ExternalLink className="h-4 w-4" /> Open resource</>}
          </a>
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

const PAGE_SIZE = 60

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
  const [activeCardModal, setActiveCardModal] = useState(null)
  const featRef     = useRef(null)
  const lecturesRef = useRef(null)

  // Featured scroll — robust: scroll by ~one card width
  const scrollFeatured = (dir) => {
    if (featRef.current) {
      const amount = Math.min(340, featRef.current.clientWidth * 0.9)
      featRef.current.scrollBy({ left: dir * amount, behavior: 'smooth' })
    }
  }

  // All lectures swipe scroll
  const scrollLectures = (dir) => {
    if (lecturesRef.current) {
      const amount = Math.min(340, lecturesRef.current.clientWidth * 0.85)
      lecturesRef.current.scrollBy({ left: dir * amount, behavior: 'smooth' })
    }
  }

  // Group cards into vertical columns of 3 cards each
  const cardColumns = useMemo(() => {
    const cols = []
    for (let i = 0; i < cards.length; i += 3) {
      cols.push(cards.slice(i, i + 3))
    }
    return cols
  }, [cards])

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
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    supabase.from('study_cards')
      .select('id, title, description, type, url, thumbnail_url, is_featured')
      .eq('is_active', true)
      .eq('is_featured', true)
      .order('display_order')
      .limit(10)
      .then(({ data }) => {
        if (cancelled) return
        setFeatured(data ?? [])
      })
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
    const from = (page - 1) * PAGE_SIZE
    const to   = from + PAGE_SIZE - 1

    if (activeBatch === 'all') {
      supabase
        .from('study_cards')
        .select('id, title, description, type, url, thumbnail_url, is_featured, is_public, batch_ids', { count: 'exact' })
        .eq('is_active', true)
        .eq('is_public', true)
        .order('display_order')
        .range(from, to)
        .then(({ data, count }) => {
          if (cancelled) return
          setCards(data ?? [])
          setTotalCards(count ?? 0)
          setLoading(false)
        })
    } else {
      supabase
        .from('study_cards')
        .select('id, title, description, type, url, thumbnail_url, is_featured, is_public, batch_ids', { count: 'exact' })
        .eq('is_active', true)
        .eq('is_public', true)
        .or(`batch_ids.cs.{${activeBatch}},batch_id.eq.${activeBatch}`)
        .order('display_order')
        .range(from, to)
        .then(({ data, count, error }) => {
          if (cancelled) return
          if (error || !data) {
            // Fallback: fetch all public cards and filter in memory if OR syntax errors on DB schema
            supabase
              .from('study_cards')
              .select('id, title, description, type, url, thumbnail_url, is_featured, is_public, batch_ids')
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
          } else {
            setCards(data ?? [])
            setTotalCards(count ?? 0)
            setLoading(false)
          }
        })
    }
    return () => { cancelled = true }
  }, [activeBatch, page])

  const totalPages = Math.ceil(totalCards / PAGE_SIZE)
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
            <div className="inline-flex items-center gap-2 bg-white/10 text-blue-200 text-xs font-semibold px-4 py-1.5 rounded-full border border-white/15 mb-6 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              Batch 2025–26 · Admissions open
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
            <path d="M0 64 L1440 64 L1440 24 C1080 60 360 60 0 24 Z" fill="#f9fafb" />
          </svg>
        </div>
      </section>

      {/* ════════════ BATCH POSTERS ════════════ */}
      <BatchPostersSection batches={batchPosters} />

      {/* ════════════ INFO STRIP ════════════ */}
      <section className="bg-white border-b border-gray-100">
        <div className={`${CONTAINER} py-10`}>
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-900 flex items-center justify-center flex-shrink-0">
                <Video className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1">Live &amp; recorded classes</h3>
                <p className="text-gray-500 text-sm leading-relaxed">Attend live, or catch up later. Every lecture stays available.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1">Personal doubt support</h3>
                <p className="text-gray-500 text-sm leading-relaxed">Message your teacher directly. No question is too small.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-green-50 text-green-700 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1">Structured batches</h3>
                <p className="text-gray-500 text-sm leading-relaxed">Material organised by batch, so you always know what&apos;s next.</p>
              </div>
            </div>
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
                      className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white transition-colors">
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button onClick={() => scrollFeatured(1)} aria-label="Scroll right"
                      className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white transition-colors">
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
                        <LectureCard card={c} onSelectCard={setActiveCardModal} />
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
                  {cards.length > 3 && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => scrollLectures(-1)}
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white border border-gray-200 hover:bg-blue-50 hover:border-blue-300 text-gray-700 hover:text-blue-600 flex items-center justify-center transition-all shadow-2xs active:scale-95"
                        title="Scroll Left"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => scrollLectures(1)}
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white border border-gray-200 hover:bg-blue-50 hover:border-blue-300 text-gray-700 hover:text-blue-600 flex items-center justify-center transition-all shadow-2xs active:scale-95"
                        title="Scroll Right"
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
                      className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 ${
                        activeBatch === 'all'
                          ? 'bg-blue-950 text-white shadow-md shadow-blue-950/20'
                          : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                      All
                    </button>
                    {batches.map(b => (
                      <button key={b.id} onClick={() => { setActiveBatch(b.id); setPage(1) }}
                        className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 ${
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
                <div className="overflow-x-auto pb-3 -mx-1 px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:none]">
                  <div className="flex gap-4 sm:gap-5 w-max">
                    {[...Array(2)].map((_, colIdx) => (
                      <div key={colIdx} className="w-[285px] sm:w-[320px] flex-shrink-0 flex flex-col gap-4 justify-start">
                        {[...Array(3)].map((_, i) => (
                          <SkeletonCard key={i} />
                        ))}
                      </div>
                    ))}
                  </div>
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
                    ref={lecturesRef}
                    className="overflow-x-auto pb-4 -mx-1 px-1 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:none]"
                  >
                    <div className="flex gap-4 sm:gap-5 w-max items-start">
                      {cardColumns.map((column, colIdx) => (
                        <div
                          key={colIdx}
                          className="w-[285px] sm:w-[320px] lg:w-[340px] flex-shrink-0 snap-start flex flex-col gap-4 justify-start"
                        >
                          {column.map(card => (
                            <LectureCard key={card.id} card={card} onSelectCard={setActiveCardModal} />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-6">
                      <button onClick={() => setPage(p => p - 1)} disabled={page === 1}
                        className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-100 disabled:opacity-30 transition-colors">
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      {[...Array(totalPages)].map((_, i) => (
                        <button key={i} onClick={() => setPage(i + 1)}
                          className={`w-10 h-10 rounded-xl text-sm font-semibold transition-all duration-150 ${
                            page === i + 1 ? 'bg-blue-950 text-white shadow-sm' : 'border border-gray-200 hover:bg-gray-100 text-gray-700'}`}>
                          {i + 1}
                        </button>
                      ))}
                      <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages}
                        className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-100 disabled:opacity-30 transition-colors">
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
      <footer className="bg-[#0b0f3d] text-blue-200">
        <div className={`${CONTAINER} py-12`}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-9 h-9 bg-amber-400 rounded-xl flex items-center justify-center shadow-lg shadow-amber-400/30">
                  <GraduationCap className="h-5 w-5 text-white" />
                </div>
                <span className="font-display font-bold text-white text-lg">{INSTITUTE_NAME}</span>
              </div>
              <p className="text-blue-300/60 text-sm max-w-sm">{INSTITUTE_TAGLINE}</p>
            </div>
            <div className="flex flex-col gap-2.5 text-sm">
              {CONTACT_EMAIL && (
                <a href={`mailto:${CONTACT_EMAIL}`} className="flex items-center gap-2 hover:text-white transition-colors">
                  <Mail className="h-4 w-4 text-blue-400" /> {CONTACT_EMAIL}
                </a>
              )}
              {CONTACT_PHONE && (
                <a href={`tel:${CONTACT_PHONE}`} className="flex items-center gap-2 hover:text-white transition-colors">
                  <Phone className="h-4 w-4 text-blue-400" /> {CONTACT_PHONE}
                </a>
              )}
            </div>
            <div className="flex gap-3">
              <Link to="/login" className="px-5 py-2.5 bg-amber-400 hover:bg-amber-500 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-amber-400/20">
                Login
              </Link>
              <Link to="/register" className="px-5 py-2.5 border border-white/20 text-white hover:bg-white/10 text-sm font-semibold rounded-xl transition-colors">
                Apply Now
              </Link>
            </div>
          </div>
          <div className="border-t border-white/10 mt-10 pt-6 text-center text-xs text-blue-400/50">
            © {new Date().getFullYear()} {INSTITUTE_NAME}. Designed for excellence.
          </div>
        </div>
      </footer>

      {/* ─── CARD DETAIL / READ MORE MODAL ─── */}
      {activeCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl overflow-hidden w-full max-w-lg shadow-2xl border border-gray-100 flex flex-col">
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-blue-950 to-indigo-900 border-b border-white/10 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-amber-400" />
                <h3 className="font-bold text-sm sm:text-base leading-tight">
                  Lecture Details
                </h3>
              </div>
              <button
                onClick={() => setActiveCardModal(null)}
                className="p-1.5 rounded-full hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {(activeCardModal.thumbnail_url || getThumbnail(activeCardModal.url)) && (
                <div className="rounded-xl overflow-hidden aspect-video bg-gray-900">
                  <img
                    src={activeCardModal.thumbnail_url || getThumbnail(activeCardModal.url)}
                    alt={activeCardModal.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div>
                <h4 className="font-bold text-gray-900 text-base sm:text-lg leading-snug">
                  {activeCardModal.title}
                </h4>
              </div>

              {activeCardModal.description && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Description</p>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                    {activeCardModal.description}
                  </p>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  onClick={() => setActiveCardModal(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Close
                </button>
                <a
                  href={normalizeUrl(activeCardModal.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-colors shadow-md shadow-amber-500/20"
                >
                  {activeCardModal.type === 'youtube_video' || activeCardModal.type === 'youtube_playlist' ? (
                    <><Youtube className="h-4 w-4" /> Watch Now</>
                  ) : (
                    <><ExternalLink className="h-4 w-4" /> Open Resource</>
                  )}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* spacing for mobile bottom tab bar, if present */}
      <div className="h-16 lg:hidden" />
    </div>
  )
}