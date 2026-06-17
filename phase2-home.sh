#!/bin/bash
# ============================================================
# phase2-home.sh — Builds the full public homepage
# Run inside your coaching-institute folder:  bash phase2-home.sh
# ============================================================
set -e
echo "🏗️  Building Phase 2 — Public Homepage..."

# ============================================================
# src/pages/Home.jsx — Full public homepage
# ============================================================
cat > src/pages/Home.jsx << 'EOF'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { GraduationCap, PlayCircle, ExternalLink, BookOpen, Bell, ChevronLeft, ChevronRight, Mail, Phone, Youtube } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { INSTITUTE_NAME, INSTITUTE_TAGLINE, CONTACT_EMAIL, CONTACT_PHONE } from '../lib/constants'

// ---- Helpers ------------------------------------------------
function getYouTubeId(url) {
  if (!url) return null
  const match = url.match(/(?:youtu\.be\/|watch\?v=|embed\/)([^#&?]{11})/)
  return match ? match[1] : null
}

function getThumbnail(url) {
  const id = getYouTubeId(url)
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null
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

function truncate(str, n = 90) {
  if (!str) return ''
  return str.length > n ? str.slice(0, n) + '…' : str
}

const NOTIF_STYLES = {
  fee:          { border: 'border-l-amber-400',  dot: 'bg-amber-400',  label: 'Fee'          },
  live_class:   { border: 'border-l-red-500',    dot: 'bg-red-500',    label: 'Live Class'   },
  announcement: { border: 'border-l-blue-500',   dot: 'bg-blue-500',   label: 'Announcement' },
  homework:     { border: 'border-l-purple-500', dot: 'bg-purple-500', label: 'Homework'     },
  general:      { border: 'border-l-gray-400',   dot: 'bg-gray-400',   label: 'Notice'       },
}

// ---- Skeleton card -----------------------------------------
function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
      <div className="bg-gray-200 h-44 w-full" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
      </div>
    </div>
  )
}

// ---- Lecture card ------------------------------------------
function LectureCard({ card }) {
  const thumb = card.thumbnail_url || getThumbnail(card.url)
  const isYT  = card.type === 'youtube_video' || card.type === 'youtube_playlist'
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col">
      <div className="relative">
        {thumb
          ? <img src={thumb} alt={card.title} loading="lazy" className="w-full h-44 object-cover" />
          : <div className="w-full h-44 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
              <BookOpen className="h-10 w-10 text-blue-400" />
            </div>
        }
        {isYT && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 bg-black/60 rounded-full flex items-center justify-center">
              <PlayCircle className="h-7 w-7 text-white" />
            </div>
          </div>
        )}
        {card.is_featured && (
          <span className="absolute top-2 left-2 bg-amber-400 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            Featured
          </span>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">{card.title}</h3>
        {card.description && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{card.description}</p>
        )}
        <div className="mt-auto pt-3">
          <a href={card.url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 hover:text-amber-700">
            {isYT ? <><Youtube className="h-4 w-4" /> Watch</> : <><ExternalLink className="h-4 w-4" /> Open</>}
          </a>
        </div>
      </div>
    </div>
  )
}

// ---- Main Home page ----------------------------------------
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
  const [featScroll,    setFeatScroll]    = useState(0)

  // Fetch notifications
  useEffect(() => {
    supabase
      .from('notifications')
      .select('id, title, body, type, created_at')
      .eq('is_active', true)
      .or('scheduled_at.is.null,scheduled_at.lte.' + new Date().toISOString())
      .or('expires_at.is.null,expires_at.gte.' + new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => setNotifications(data ?? []))
  }, [])

  // Fetch featured cards
  useEffect(() => {
    supabase
      .from('study_cards')
      .select('id, title, description, type, url, thumbnail_url, is_featured')
      .eq('is_active', true)
      .eq('is_featured', true)
      .order('display_order')
      .limit(10)
      .then(({ data }) => setFeatured(data ?? []))
  }, [])

  // Fetch batches for filter tabs
  useEffect(() => {
    supabase
      .from('batches')
      .select('id, name')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => setBatches(data ?? []))
  }, [])

  // Fetch paginated cards
  useEffect(() => {
    setLoading(true)
    const from = (page - 1) * PAGE_SIZE
    const to   = from + PAGE_SIZE - 1
    let query = supabase
      .from('study_cards')
      .select('id, title, description, type, url, thumbnail_url, is_featured, batch_id', { count: 'exact' })
      .eq('is_active', true)
      .order('display_order')
      .range(from, to)

    if (activeBatch !== 'all') query = query.eq('batch_id', activeBatch)

    query.then(({ data, count }) => {
      setCards(data ?? [])
      setTotalCards(count ?? 0)
      setLoading(false)
    })
  }, [activeBatch, page])

  const totalPages = Math.ceil(totalCards / PAGE_SIZE)
  const now = Date.now()
  const isNew = (dateStr) => now - new Date(dateStr).getTime() < 86400000

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ---- HERO ----------------------------------------- */}
      <section className="relative bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-800 overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full bg-amber-400/10 pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 py-20 flex flex-col lg:flex-row items-center gap-10">
          {/* Left: text */}
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-white/10 text-amber-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              Admissions Open 2025–26
            </div>
            <h1 className="font-bold text-4xl md:text-5xl lg:text-6xl text-white leading-tight mb-4">
              {INSTITUTE_NAME}
            </h1>
            <p className="text-blue-200 text-xl mb-8">{INSTITUTE_TAGLINE}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Link to="/login"
                className="px-8 py-3.5 bg-amber-400 hover:bg-amber-500 text-white font-bold rounded-xl transition-colors shadow-lg text-center">
                Student Login
              </Link>
              <Link to="/register"
                className="px-8 py-3.5 border-2 border-white/60 text-white hover:bg-white hover:text-blue-900 font-bold rounded-xl transition-colors text-center">
                Register Now
              </Link>
            </div>
          </div>

          {/* Right: pulsing icon card */}
          <div className="flex-shrink-0">
            <div className="relative w-48 h-48 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-white/5 animate-ping" style={{animationDuration:'3s'}} />
              <div className="absolute inset-4 rounded-full bg-white/10" />
              <div className="w-28 h-28 bg-amber-400 rounded-3xl flex items-center justify-center shadow-2xl rotate-6">
                <GraduationCap className="h-14 w-14 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 60L60 50C120 40 240 20 360 15C480 10 600 20 720 25C840 30 960 30 1080 25C1200 20 1320 10 1380 5L1440 0V60H0Z" fill="#f9fafb"/>
          </svg>
        </div>
        <div className="h-10" />
      </section>

      {/* ---- MAIN CONTENT --------------------------------- */}
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Left: Lectures */}
          <div className="flex-1 min-w-0">

            {/* Featured lectures */}
            {featured.length > 0 && (
              <section className="mb-10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-xl text-gray-900 flex items-center gap-2">
                    <span className="w-1 h-6 bg-amber-400 rounded-full inline-block" />
                    Featured Lectures
                  </h2>
                  <div className="flex gap-2">
                    <button onClick={() => setFeatScroll(s => s - 1)} disabled={featScroll <= 0}
                      className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-30 transition-colors">
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button onClick={() => setFeatScroll(s => s + 1)} disabled={featScroll >= featured.length - 1}
                      className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-30 transition-colors">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto pb-2 -mx-1 px-1">
                  <div className="flex gap-4" style={{width: `${featured.length * 220}px`}}>
                    {featured.map(c => (
                      <div key={c.id} className="w-52 flex-shrink-0">
                        <LectureCard card={c} />
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* All lectures */}
            <section>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h2 className="font-bold text-xl text-gray-900 flex items-center gap-2">
                  <span className="w-1 h-6 bg-blue-600 rounded-full inline-block" />
                  All Lectures
                </h2>
                {/* Batch filter tabs */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => { setActiveBatch('all'); setPage(1) }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeBatch === 'all' ? 'bg-blue-950 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    All
                  </button>
                  {batches.map(b => (
                    <button key={b.id}
                      onClick={() => { setActiveBatch(b.id); setPage(1) }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeBatch === b.id ? 'bg-blue-950 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                      {b.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid */}
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : cards.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-gray-100">
                  <BookOpen className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No lectures here yet.</p>
                  <p className="text-gray-400 text-sm mt-1">Check back soon — content is being added.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {cards.map(c => <LectureCard key={c.id} card={c} />)}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-8">
                      <button onClick={() => setPage(p => p - 1)} disabled={page === 1}
                        className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-30 transition-colors">
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      {[...Array(totalPages)].map((_, i) => (
                        <button key={i} onClick={() => setPage(i + 1)}
                          className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${page === i + 1 ? 'bg-blue-950 text-white' : 'border border-gray-200 hover:bg-gray-100 text-gray-700'}`}>
                          {i + 1}
                        </button>
                      ))}
                      <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages}
                        className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-30 transition-colors">
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>

          {/* Right: What's On panel */}
          <aside className="w-full lg:w-80 flex-shrink-0">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm sticky top-4">
              <div className="flex items-center gap-2 px-4 py-4 border-b border-gray-100">
                <Bell className="h-5 w-5 text-blue-950" />
                <h2 className="font-bold text-gray-900">What's On</h2>
                {notifications.some(n => isNew(n.created_at)) && (
                  <span className="ml-auto flex items-center gap-1 text-xs text-red-500 font-medium">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" /> New
                  </span>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <p className="text-gray-400 text-sm">No announcements right now.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50 max-h-[520px] overflow-y-auto">
                  {notifications.map(n => {
                    const style = NOTIF_STYLES[n.type] || NOTIF_STYLES.general
                    return (
                      <div key={n.id} className={`px-4 py-3.5 border-l-4 ${style.border} hover:bg-gray-50 transition-colors`}>
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-opacity-10 ${style.dot === 'bg-amber-400' ? 'bg-amber-50 text-amber-700' : style.dot === 'bg-red-500' ? 'bg-red-50 text-red-700' : style.dot === 'bg-blue-500' ? 'bg-blue-50 text-blue-700' : style.dot === 'bg-purple-500' ? 'bg-purple-50 text-purple-700' : 'bg-gray-50 text-gray-600'}`}>
                            {style.label}
                          </span>
                          {isNew(n.created_at) && (
                            <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 mt-1 animate-pulse" />
                          )}
                        </div>
                        <p className="text-sm font-semibold text-gray-800 leading-snug">{n.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{truncate(n.body)}</p>
                        <p className="text-xs text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="px-4 py-3 border-t border-gray-100">
                <Link to="/login" className="block w-full text-center py-2 bg-blue-950 hover:bg-blue-900 text-white text-sm font-semibold rounded-lg transition-colors">
                  Login to see all updates →
                </Link>
              </div>
            </div>
          </aside>

        </div>
      </div>

      {/* ---- FOOTER --------------------------------------- */}
      <footer className="bg-blue-950 text-blue-200 mt-16">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center">
                  <GraduationCap className="h-4 w-4 text-white" />
                </div>
                <span className="font-bold text-white text-lg">{INSTITUTE_NAME}</span>
              </div>
              <p className="text-blue-300 text-sm">{INSTITUTE_TAGLINE}</p>
            </div>
            <div className="flex flex-col gap-2 text-sm">
              {CONTACT_EMAIL && (
                <a href={`mailto:${CONTACT_EMAIL}`} className="flex items-center gap-2 hover:text-white transition-colors">
                  <Mail className="h-4 w-4" /> {CONTACT_EMAIL}
                </a>
              )}
              {CONTACT_PHONE && (
                <a href={`tel:${CONTACT_PHONE}`} className="flex items-center gap-2 hover:text-white transition-colors">
                  <Phone className="h-4 w-4" /> {CONTACT_PHONE}
                </a>
              )}
            </div>
            <div className="flex gap-3">
              <Link to="/login"    className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-white text-sm font-semibold rounded-lg transition-colors">Login</Link>
              <Link to="/register" className="px-4 py-2 border border-white/30 text-white hover:bg-white/10 text-sm font-semibold rounded-lg transition-colors">Register</Link>
            </div>
          </div>
          <div className="border-t border-white/10 mt-8 pt-6 text-center text-xs text-blue-400">
            © {new Date().getFullYear()} {INSTITUTE_NAME}. All rights reserved.
          </div>
        </div>
      </footer>

    </div>
  )
}
EOF

echo "  ✅ Home.jsx written"
echo ""
echo "✅ Phase 2 complete!"
echo ""
echo "Run:  npm run dev"
echo "Then open:  http://localhost:5173"
