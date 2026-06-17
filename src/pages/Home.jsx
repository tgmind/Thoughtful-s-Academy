import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  GraduationCap, PlayCircle, ExternalLink, BookOpen, Bell,
  ChevronLeft, ChevronRight, Mail, Phone, Youtube, ArrowRight,
  Video, MessageSquare, CheckCircle2, Sparkles,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import {
  INSTITUTE_NAME, INSTITUTE_TAGLINE, CONTACT_EMAIL, CONTACT_PHONE,
} from '../lib/constants'
import { getYouTubeThumbnail, normalizeUrl } from '../utils/formatters'

// ─── helpers ─────────────────────────────────────────────────────────────────

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
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
      <div className="bg-gray-200 aspect-video w-full" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
      </div>
    </div>
  )
}

// ─── lecture card ─────────────────────────────────────────────────────────────

function LectureCard({ card }) {
  const thumb = card.thumbnail_url || getThumbnail(card.url)
  const isYT  = card.type === 'youtube_video' || card.type === 'youtube_playlist'
  return (
    <div className="group bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
      <div className="relative overflow-hidden">
        {thumb
          ? <img src={thumb} alt={card.title} loading="lazy"
              className="w-full aspect-video object-cover transition-transform duration-500 group-hover:scale-105" />
          : <div className="w-full aspect-video bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
              <BookOpen className="h-10 w-10 text-blue-400" />
            </div>
        }
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        {isYT && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:bg-amber-500 transition-colors duration-300 shadow-lg">
              <PlayCircle className="h-7 w-7 text-white" />
            </div>
          </div>
        )}
        {card.is_featured && (
          <span className="absolute top-3 left-3 bg-amber-400 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
            Featured
          </span>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 mb-1">{card.title}</h3>
        {card.description && (
          <p className="text-xs text-gray-400 line-clamp-2 flex-1">{card.description}</p>
        )}
        <div className="mt-3 pt-3 border-t border-gray-50">
          <a href={normalizeUrl(card.url)} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 hover:text-amber-700 transition-colors">
            {isYT
              ? <><Youtube className="h-4 w-4" /> Watch now</>
              : <><ExternalLink className="h-4 w-4" /> Open</>}
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
    <div className={`${compact ? 'px-4 py-3' : 'px-5 py-4'} border-l-4 ${style.border} hover:bg-gray-50/80 transition-colors`}>
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${style.bg} ${style.text}`}>
          {style.label}
        </span>
        {isNew(n.created_at)
          ? <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 mt-1 animate-pulse" />
          : <span className="text-xs text-gray-400">{timeAgo(n.created_at)}</span>}
      </div>
      <p className="text-sm font-semibold text-gray-800 leading-snug">{n.title}</p>
      {n.body && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{truncate(n.body)}</p>}
      {!compact && <p className="text-xs text-gray-400 mt-1.5">{timeAgo(n.created_at)}</p>}
    </div>
  )
}

// ─── main ──────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 9

export default function Home() {
  const [notifications, setNotifications] = useState([])
  const [featured,      setFeatured]      = useState([])
  const [cards,         setCards]         = useState([])
  const [batches,       setBatches]       = useState([])
  const [activeBatch,   setActiveBatch]   = useState('all')
  const [page,          setPage]          = useState(1)
  const [totalCards,    setTotalCards]    = useState(0)
  const [loading,       setLoading]       = useState(true)
  const featRef = useRef(null)

  // Featured scroll — robust: scroll by ~one card width
  const scrollFeatured = (dir) => {
    if (featRef.current) {
      const amount = Math.min(340, featRef.current.clientWidth * 0.9)
      featRef.current.scrollBy({ left: dir * amount, behavior: 'smooth' })
    }
  }

  useEffect(() => {
    supabase.from('notifications')
      .select('id, title, body, type, created_at')
      .eq('is_active', true)
      .or('scheduled_at.is.null,scheduled_at.lte.' + new Date().toISOString())
      .or('expires_at.is.null,expires_at.gte.' + new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => setNotifications(data ?? []))
  }, [])

  useEffect(() => {
    supabase.from('study_cards')
      .select('id, title, description, type, url, thumbnail_url, is_featured')
      .eq('is_active', true)
      .eq('is_featured', true)
      .order('display_order')
      .limit(10)
      .then(({ data }) => setFeatured(data ?? []))
  }, [])

  useEffect(() => {
    supabase.from('batches')
      .select('id, name')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => setBatches(data ?? []))
  }, [])

  useEffect(() => {
    setLoading(true)
    const from = (page - 1) * PAGE_SIZE
    const to   = from + PAGE_SIZE - 1
    let query = supabase
      .from('study_cards')
      .select('id, title, description, type, url, thumbnail_url, is_featured, is_public, batch_ids', { count: 'exact' })
      .eq('is_active', true)
      .eq('is_public', true)
      .order('display_order')
      .range(from, to)
    if (activeBatch !== 'all') query = query.contains('batch_ids', [activeBatch])
    query.then(({ data, count }) => {
      setCards(data ?? [])
      setTotalCards(count ?? 0)
      setLoading(false)
    })
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
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Link to="/login"
                className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-400 hover:to-blue-400 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all duration-200">
                Student login
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link to="/register"
                className="inline-flex items-center justify-center px-7 py-3.5 border border-white/25 text-white hover:bg-white/10 hover:border-white/40 font-semibold rounded-xl transition-all duration-200 backdrop-blur-sm">
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
                <p className="text-gray-500 text-sm leading-relaxed">Material organised by batch, so you always know what's next.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════ MOBILE "What's On" (above lectures) ════════════ */}
      {notifications.length > 0 && (
        <div className={`lg:hidden ${CONTAINER} pt-6`}>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/50">
              <Bell className="h-4 w-4 text-blue-950" />
              <h2 className="font-bold text-gray-900 text-sm">What's on</h2>
              {hasNew && (
                <span className="ml-auto flex items-center gap-1 text-xs text-red-500 font-medium">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" /> New
                </span>
              )}
            </div>
            {/* hidden native scrollbars for modern mobile feel */}
            <div className="divide-y divide-gray-50 max-h-56 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:none]">
              {notifications.slice(0, 3).map(n => <NotifRow key={n.id} n={n} isNew={isNew} compact />)}
            </div>
            <div className="px-4 py-3 bg-gray-50/50">
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
              <section className="mb-12">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <span className="w-1 h-8 bg-amber-400 rounded-full" />
                    <div>
                      <h2 className="font-display font-bold text-xl text-gray-900 leading-tight">Featured lectures</h2>
                      <p className="text-xs text-gray-400 mt-0.5">Handpicked by your teacher</p>
                    </div>
                  </div>
                  <div className="hidden sm:flex gap-2">
                    <button onClick={() => scrollFeatured(-1)} aria-label="Scroll left"
                      className="p-2 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors">
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button onClick={() => scrollFeatured(1)} aria-label="Scroll right"
                      className="p-2 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {/* native hidden scrollbar classes apply here */}
                <div ref={featRef} className="overflow-x-auto pb-3 -mx-1 px-1 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:none]">
                  <div className="flex gap-5" style={{ width: 'max-content' }}>
                    {featured.map(c => (
                      <div key={c.id} className="w-72 sm:w-80 flex-shrink-0 snap-start">
                        <LectureCard card={c} />
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* All lectures */}
            <section>
              <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-1 h-8 bg-blue-600 rounded-full" />
                  <div>
                    <h2 className="font-display font-bold text-xl text-gray-900 leading-tight">All lectures</h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {totalCards > 0 ? `${totalCards} resource${totalCards > 1 ? 's' : ''} available` : 'Browse all study material'}
                    </p>
                  </div>
                </div>
                {/* Scrollable category pills on mobile */}
                <div className="w-full sm:w-auto overflow-x-auto pb-1 -mb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:none]">
                  <div className="flex gap-2 w-max">
                    <button onClick={() => { setActiveBatch('all'); setPage(1) }}
                      className={`px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                        activeBatch === 'all' ? 'bg-blue-950 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                      All
                    </button>
                    {batches.map(b => (
                      <button key={b.id} onClick={() => { setActiveBatch(b.id); setPage(1) }}
                        className={`px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                          activeBatch === b.id ? 'bg-blue-950 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        {b.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {cards.map(c => <LectureCard key={c.id} card={c} />)}
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-10">
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
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm sticky top-6 overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
                <Bell className="h-5 w-5 text-blue-950" />
                <h2 className="font-bold text-gray-900">What's on</h2>
                {hasNew && (
                  <span className="ml-auto flex items-center gap-1.5 text-xs text-red-500 font-semibold">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" /> New
                  </span>
                )}
              </div>
              {notifications.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <Sparkles className="h-8 w-8 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">No announcements right now.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:none]">
                  {notifications.map(n => <NotifRow key={n.id} n={n} isNew={isNew} />)}
                </div>
              )}
              <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50">
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
            Thoughtful's Academy started from one idea — that students learn best when the teaching is
            unhurried and the door to asking questions is always open. No noise, no pressure tactics.
            Just clear explanations, steady practice, and an educator who actually picks up when you're stuck.
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

      {/* spacing for mobile bottom tab bar, if present */}
      <div className="h-16 lg:hidden" />
    </div>
  )
}