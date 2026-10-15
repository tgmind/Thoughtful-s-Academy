import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import {
  GraduationCap, PlayCircle, ArrowRight, BookOpen, Video,
  Users, ChevronLeft, ChevronRight, X, Sparkles, UserCheck, Maximize2, Download, Share2, Home as HomeIcon, ChevronDown, Check, Search, LogIn, FileText
} from 'lucide-react'

import toast from 'react-hot-toast'


import { supabase } from '../lib/supabase'
import { INSTITUTE_NAME } from '../lib/constants'
import { getYouTubeThumbnail, convertDriveUrl } from '../utils/formatters'
import DriveImage from '../components/shared/DriveImage'
import DOMPurify from 'dompurify'


export default function BatchDetails() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const initialBatchId = searchParams.get('id') || searchParams.get('batch')

  const [batches, setBatches] = useState([])
  const [activeBatch, setActiveBatch] = useState(null)
  const [publicStudyCards, setPublicStudyCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPosterModal, setShowPosterModal] = useState(false)
  const [showBatchDropdown, setShowBatchDropdown] = useState(false)
  const [searchBatchQuery, setSearchBatchQuery] = useState('')

  const carouselRef = useRef(null)
  const dropdownRef = useRef(null)

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowBatchDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])


  useEffect(() => {
    let cancelled = false
    supabase.from('batches').select('*, profiles!teacher_id(full_name)').order('name')
      .then(({ data, error }) => {
        if (cancelled) return
        if (!error && data) {
          setBatches(data)
          let defaultB = data[0] || null
          if (initialBatchId) {
            const found = data.find(b => b.id === initialBatchId)
            if (found) defaultB = found
          }
          setActiveBatch(defaultB)
          if (defaultB) fetchPublicStudyCards(defaultB.id)
        } else if (error) {
          toast.error('Failed to load batch details: ' + error.message)
        }
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [initialBatchId])

  const fetchPublicStudyCards = async (batchId) => {
    const { data, error } = await supabase.from('study_cards')
      .select('*')
      .eq('is_active', true)
      .eq('is_public', true)
      .order('display_order')

    if (error) {
      toast.error('Failed to load study cards: ' + error.message)
    } else if (data) {
      // Filter cards specifically assigned to this batch
      const matched = data.filter(c => 
        (Array.isArray(c.batch_ids) && c.batch_ids.includes(batchId)) || 
        c.batch_id === batchId
      )
      setPublicStudyCards(matched)
    }
  }

  const selectBatch = (batch) => {
    setActiveBatch(batch)
    setSearchParams({ id: batch.id })
    fetchPublicStudyCards(batch.id)
  }

  const copyToClipboard = async (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text)
        return true
      } catch {
        // Fallback to execCommand if writeText fails
      }
    }
    try {
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      const successful = document.execCommand('copy')
      document.body.removeChild(textArea)
      return successful
    } catch {
      return false
    }
  }

  const handleShareBatch = async () => {
    if (!activeBatch) return
    const shareUrl = `${window.location.origin}/batch-details?id=${activeBatch.id}`
    const shareTitle = activeBatch.name
    const shareText = `🎓 Join ${activeBatch.name} at ${INSTITUTE_NAME}! Check out the course details, syllabus & demo lectures:`

    const shareData = {
      title: shareTitle,
      text: shareText,
      url: shareUrl,
    }

    // Triggers native Android/iOS share sheet (WhatsApp, Telegram, Messages, etc.)
    if (navigator.share) {
      try {
        if (navigator.canShare && !navigator.canShare(shareData)) {
          // If canShare fails with url property on some browsers, share text + url combined
          await navigator.share({
            title: shareTitle,
            text: `${shareText}\n${shareUrl}`,
          })
        } else {
          await navigator.share(shareData)
        }
        return
      } catch (err) {
        // User closed/cancelled the native share sheet - exit gracefully
        if (err.name === 'AbortError') return
      }
    }

    // Fallback if native Web Share is unavailable (e.g. desktop browsers)
    const copied = await copyToClipboard(`${shareText}\n${shareUrl}`)
    if (copied) {
      toast.success('Batch link copied! You can paste & share it on WhatsApp.')
    } else {
      toast.error('Failed to copy link')
    }
  }

  const scrollCarousel = (direction) => {
    if (carouselRef.current) {
      const scrollAmount = direction === 'left' ? -340 : 340
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }



  const filteredBatches = batches.filter(b => 
    b.name.toLowerCase().includes(searchBatchQuery.toLowerCase()) ||
    (b.subjects && b.subjects.some(s => s.toLowerCase().includes(searchBatchQuery.toLowerCase()))) ||
    (b.profiles?.full_name && b.profiles.full_name.toLowerCase().includes(searchBatchQuery.toLowerCase()))
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-gray-500">Loading batch details…</p>
        </div>
      </div>
    )
  }

  const facultyList = activeBatch && Array.isArray(activeBatch.faculty_images) ? activeBatch.faculty_images : []

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* ─── PUBLIC NAVBAR ─── */}
      <header className="sticky top-0 z-40 bg-[#090d2a]/95 backdrop-blur-xl border-b border-white/10 text-white transition-all shadow-md">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-8 h-14 sm:h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-400 via-amber-400 to-amber-500 text-blue-950 flex items-center justify-center shadow-md font-bold group-hover:scale-105 transition-transform">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <span className="font-display font-extrabold text-white text-base tracking-tight block leading-tight group-hover:text-amber-300 transition-colors">
                  {INSTITUTE_NAME}
                </span>
                <span className="text-[10px] text-amber-400/90 font-bold tracking-wider uppercase block">
                  Batch Portal
                </span>
              </div>
            </Link>

            {/* Breadcrumb indicator (hidden on small mobile) */}
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 pl-4 border-l border-white/10 font-medium">
              <Link to="/" className="hover:text-white transition-colors">Home</Link>
              <span>/</span>
              <span className="text-blue-200">Batches</span>
              {activeBatch && (
                <>
                  <span>/</span>
                  <span className="text-amber-400 font-bold max-w-[160px] truncate">{activeBatch.name}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3.5">
            <Link to="/" className="text-xs font-semibold text-slate-300 hover:text-white transition-colors hidden sm:block">
              Home
            </Link>
            <Link
              to="/login"
              className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full border border-white/15 bg-white/10 hover:bg-white/20 text-white font-bold text-xs backdrop-blur-md transition-all shadow-xs hover:border-white/30 active:scale-95 flex items-center gap-1.5"
            >
              <LogIn className="h-3.5 w-3.5 text-amber-400" />
              <span>Login</span>
            </Link>
            <Link
              to={activeBatch ? `/register?batch=${activeBatch.id}` : '/register'}
              className="px-4 py-1.5 sm:px-5 sm:py-2 rounded-full bg-gradient-to-r from-amber-400 via-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs tracking-wide shadow-[0_0_18px_rgba(251,191,36,0.35)] hover:shadow-[0_0_24px_rgba(251,191,36,0.55)] border border-amber-200/50 transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <span>Enroll Now</span>
              <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
            </Link>
          </div>
        </div>
      </header>

      {/* ─── BATCH SELECTOR BAR (Scrolls naturally to save screen space) ─── */}
      {batches.length > 0 && (
        <div className="bg-white border-b border-slate-200/90 relative z-30 shadow-xs transition-all duration-300">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-8 py-1.5 sm:py-2.5 flex items-center justify-between gap-4">
            
            {/* Smart Batch Dropdown Selector */}
            <div className="relative flex-1 sm:flex-initial" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setShowBatchDropdown(!showBatchDropdown)}
                className={`w-full sm:w-auto min-w-[220px] sm:min-w-[280px] inline-flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl border transition-all duration-200 shadow-sm cursor-pointer ${
                  showBatchDropdown
                    ? 'bg-blue-50/90 border-blue-500 text-blue-950 ring-2 ring-blue-500/20 shadow-md'
                    : 'bg-slate-100/90 hover:bg-slate-200/80 border-slate-200/90 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 text-white flex items-center justify-center font-extrabold text-xs shadow-xs">
                    <BookOpen className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex flex-col text-left leading-none">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] sm:text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Select Batch</span>
                      <span className="text-[10px] font-extrabold px-1.5 py-0.2 bg-blue-100 text-blue-700 rounded-full">
                        {batches.length} Batches
                      </span>
                    </div>
                    <span className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1 mt-0.5 max-w-[140px] xs:max-w-[180px] sm:max-w-[260px] truncate">
                      {activeBatch?.name || 'Choose Batch'}
                    </span>
                  </div>
                </div>
                <ChevronDown className={`h-4.5 w-4.5 text-slate-500 transition-transform duration-200 ml-2 ${showBatchDropdown ? 'rotate-180 text-blue-600' : ''}`} />
              </button>

              {/* Clean Dropdown — width matches header, name + batch symbol, active highlighted */}
              {showBatchDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 w-full min-w-full bg-white rounded-2xl border border-slate-200/80 shadow-2xl z-50 py-2 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
                  {batches.length > 5 && (
                    <div className="px-3 pb-2 pt-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search..."
                          value={searchBatchQuery}
                          onChange={(e) => setSearchBatchQuery(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  )}
                  <div className="max-h-72 overflow-y-auto">
                    {filteredBatches.length > 0 ? (
                      filteredBatches.map((b) => {
                        const isActive = activeBatch?.id === b.id
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => {
                              selectBatch(b)
                              setShowBatchDropdown(false)
                              setSearchBatchQuery('')
                            }}
                            className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-all duration-150 ${
                              isActive
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-800 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-xs ${
                                isActive ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'
                              }`}>
                                <BookOpen className="h-3.5 w-3.5" />
                              </div>
                              <span className={`text-xs sm:text-sm font-bold truncate ${isActive ? 'text-white' : 'text-slate-800'}`}>
                                {b.name}
                              </span>
                            </div>
                            {isActive && <Check className="h-4 w-4 text-white flex-shrink-0 stroke-[2.5]" />}
                          </button>
                        )
                      })
                    ) : (
                      <div className="py-4 text-center text-xs text-slate-400">No batches found</div>
                    )}
                  </div>
                </div>
              )}
            </div>



          </div>
        </div>
      )}

      {/* Main Content Body */}
      {activeBatch ? (
        <main className="flex-1 pb-20">
          {/* ─── HERO SECTION ─── */}
          <section className="relative bg-gradient-to-br from-[#090d2a] via-[#101750] to-[#18206b] text-white py-12 lg:py-16 overflow-hidden">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
            <div className="absolute top-0 right-0 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 relative z-10 grid lg:grid-cols-12 gap-8 items-center">
              {/* Left Details */}
              <div className="lg:col-span-7 space-y-5 text-center lg:text-left">

                {/* Admissions Badge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-emerald-300 text-xs font-bold backdrop-blur-md">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Admissions Open · 2-Day Free Trial</span>
                </div>

                {/* Batch Title */}
                <div className="relative">
                  <div className="absolute -inset-4 bg-gradient-to-r from-amber-400/15 via-blue-500/10 to-amber-300/15 rounded-3xl blur-2xl opacity-50 pointer-events-none" />
                  <h1 className="relative font-display font-black text-3xl sm:text-5xl lg:text-6xl tracking-tight leading-tight break-words bg-gradient-to-r from-white via-slate-100 to-amber-300 bg-clip-text text-transparent">
                    {activeBatch.name}
                  </h1>
                </div>

                {activeBatch.description && (
                  <p className="text-blue-200/80 text-sm leading-relaxed max-w-xl mx-auto lg:mx-0">
                    {activeBatch.description}
                  </p>
                )}

                {/* Single compact meta row: subjects + faculty + feature icons */}
                <div className="flex flex-col gap-3 items-center lg:items-start">
                  
                  {/* Subjects + Faculty on one line */}
                  <div className="flex items-center gap-2 flex-wrap justify-center lg:justify-start">
                    {Array.isArray(activeBatch.subjects) && activeBatch.subjects.length > 0 ? (
                      activeBatch.subjects.map((sub, idx) => (
                        <span key={idx} className="px-2.5 py-1 rounded-lg bg-blue-900/60 border border-blue-400/20 text-blue-200 text-xs font-semibold">
                          {sub}
                        </span>
                      ))
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-blue-900/60 border border-blue-400/20 text-blue-200 text-xs font-semibold">
                        Full Syllabus
                      </span>
                    )}
                    {activeBatch.profiles?.full_name && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-white/20" />
                        <span className="flex items-center gap-1 text-amber-300/90 text-xs font-semibold">
                          <UserCheck className="h-3.5 w-3.5" />
                          {activeBatch.profiles.full_name}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Feature icons — wrapping on small screens */}
                  <div className="flex items-center flex-wrap gap-x-1 gap-y-1.5 text-[11px] text-blue-300/70 font-medium justify-center lg:justify-start">
                    <span className="flex items-center gap-1">
                      <Video className="h-3 w-3 text-amber-400/80 flex-shrink-0" />
                      <span>Live & Recorded</span>
                    </span>
                    <span className="opacity-30 px-0.5">·</span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-amber-400/80 flex-shrink-0" />
                      <span>Doubt Support</span>
                    </span>
                    <span className="opacity-30 px-0.5">·</span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3 text-amber-400/80 flex-shrink-0" />
                      <span>Notes & PYQs</span>
                    </span>
                  </div>
                </div>

                {/* Hero CTAs */}
                <div className="flex flex-col sm:flex-row gap-3.5 justify-center lg:justify-start pt-3">
                  <Link
                    to={`/register?batch=${activeBatch.id}`}
                    className="px-7 py-3.5 rounded-full bg-gradient-to-r from-amber-400 via-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(251,191,36,0.4)] hover:shadow-[0_0_35px_rgba(251,191,36,0.6)] border border-amber-200/60 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 active:scale-95 cursor-pointer"
                  >
                    <span>Enroll in this Batch</span>
                    <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                  </Link>

                  {publicStudyCards.length > 0 && (
                    <a
                      href="#public-videos"
                      className="px-6 py-3.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/35 text-white font-bold text-sm flex items-center justify-center gap-2 backdrop-blur-md shadow-sm transition-all transform hover:-translate-y-0.5 active:scale-95 cursor-pointer"
                    >
                      <PlayCircle className="h-4.5 w-4.5 text-amber-400" />
                      <span>Watch Demo Lectures</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Right Poster Showcase Card */}
              {/* 
                Layout strategy:
                - Mobile: poster fills full column width (section has px-4 gutters → narrow margins naturally)
                - Desktop: capped at 320px max so it stays elegant in the 5-col grid slot
                - The share button lives INSIDE the same width-controlling wrapper → always pixel-perfect match
                - No max-h on the inner aspect-ratio frame → width drives height, never mismatch
              */}
              <div className="lg:col-span-5 flex justify-center lg:justify-end items-start pt-2 lg:pt-0">
                {/* Single width-controlling wrapper — poster + button both get w-full of this */}
                <div className="flex flex-col w-full sm:w-[340px] lg:w-[320px] xl:w-[340px]">

                  {/* Clickable Poster Card */}
                  <div
                    onClick={() => activeBatch.poster_url?.trim() && setShowPosterModal(true)}
                    className="group relative cursor-pointer transition-all duration-500 transform hover:-translate-y-1 w-full"
                  >
                    {/* Ambient Glow — positioned relative to poster frame */}
                    <div className="absolute -inset-3 bg-gradient-to-tr from-amber-400/25 via-indigo-500/25 to-blue-400/25 rounded-3xl blur-2xl opacity-70 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                    {/* Poster Frame — aspect ratio drives height from width, no max-h */}
                    <div className="relative rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-blue-950/90 aspect-[9/16] w-full flex items-center justify-center">
                      {activeBatch.poster_url?.trim() ? (
                        <DriveImage
                          src={activeBatch.poster_url.trim()}
                          alt={activeBatch.name}
                          className="w-full h-full object-contain rounded-xl"
                          fallback={
                            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-indigo-900 to-blue-950">
                              <GraduationCap className="h-14 w-14 text-amber-400 mb-2" />
                              <h3 className="font-extrabold text-xl text-white">{activeBatch.name}</h3>
                              <p className="text-xs text-blue-200 mt-1">Comprehensive Coaching &amp; Doubt Support</p>
                            </div>
                          }
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-indigo-900 to-blue-950">
                          <GraduationCap className="h-14 w-14 text-amber-400 mb-2" />
                          <h3 className="font-extrabold text-xl text-white">{activeBatch.name}</h3>
                          <p className="text-xs text-blue-200 mt-1">Comprehensive Coaching &amp; Doubt Support</p>
                        </div>
                      )}

                      {/* Hover Overlay — only shown when there is a poster */}
                      {activeBatch.poster_url?.trim() && (
                        <div className="absolute inset-0 bg-blue-950/70 opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-[2px] flex flex-col items-center justify-center text-white gap-2.5 p-4 rounded-xl text-center">

                          <div className="w-12 h-12 rounded-full bg-amber-400 text-blue-950 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                            <Maximize2 className="h-6 w-6" />
                          </div>
                          <span className="font-extrabold text-sm text-white">Tap to View Full Poster</span>
                          <span className="text-xs text-amber-300 font-medium px-3 py-1 rounded-full bg-white/10">High Resolution Brochure</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Share Button — sleek pill silhouette */}
                  <button
                    type="button"
                    onClick={handleShareBatch}
                    className="mt-3 flex items-center justify-center gap-2 w-full py-3 rounded-full bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider shadow-[0_0_18px_rgba(251,191,36,0.3)] hover:shadow-[0_0_24px_rgba(251,191,36,0.5)] border border-amber-200/50 transition-all cursor-pointer"
                  >
                    <Share2 className="h-4 w-4" /> Share Batch with Friends
                  </button>
                </div>
              </div>


            </div>
          </section>

          {/* ─── MAIN CONTENT CONTAINER ─── */}
          <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 py-12 space-y-16">
            
            {/* 1. DETAILED BATCH OVERVIEW (Rich HTML) */}
            <section className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-200 shadow-sm space-y-6">
              <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center font-bold">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-xl text-gray-900">Batch Features &amp; Overview</h2>
                  <p className="text-xs text-gray-500">Everything included in your batch enrollment</p>
                </div>
              </div>

              {activeBatch.detailed_info ? (
                <div
                  className="prose prose-blue max-w-none text-gray-800 text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(activeBatch.detailed_info) }}
                />
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
                  <div className="p-5 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-2">
                    <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                      <Video className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-base">Live &amp; Recorded Classes</h3>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Attend daily live interactive classes or catch up anytime with instant recordings.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-100 space-y-2">
                    <div className="w-9 h-9 rounded-lg bg-amber-500 text-white flex items-center justify-center">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-base">Curated Study Materials</h3>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Access structured chapter notes, formulas, PYQs, and daily practice problem cards.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-2">
                    <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                      <Users className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-base">1-on-1 Personal Doubt Support</h3>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Message teachers directly in your portal to resolve doubts quickly and stay ahead.
                    </p>
                  </div>
                </div>
              )}
            </section>

            {/* 2. FACULTY & TEACHERS */}
            {facultyList.length > 0 && (
              <section className="space-y-6">
                <div className="flex items-start gap-3">
                  <span className="w-1.5 self-stretch min-h-[2rem] bg-indigo-600 rounded-full shrink-0 mt-0.5" />
                  <div>
                    <h2 className="font-display font-bold text-lg sm:text-2xl text-gray-900 leading-tight">Faculty &amp; Educators</h2>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">Learn from experienced educators dedicated to your success</p>
                  </div>
                </div>

                {/* Horizontal Flex Layout for all screen sizes */}
                <div className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-none scroll-smooth">
                  {facultyList.map((fac, i) => (
                      <div
                        key={i}
                        className="flex-shrink-0 w-72 sm:w-80 snap-start bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 p-5 flex items-center gap-5"
                      >
                        {/* Large Teacher Photo */}
                        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-indigo-100 overflow-hidden border-2 border-indigo-200 flex-shrink-0 flex items-center justify-center shadow-sm">
                          {fac.image_url?.trim() ? (
                            <DriveImage
                              src={fac.image_url.trim()}
                              alt={fac.name}
                              className="w-full h-full object-cover"
                              fallback={<UserCheck className="h-10 w-10 text-indigo-500" />}
                            />
                          ) : (
                            <UserCheck className="h-10 w-10 text-indigo-500" />
                          )}
                        </div>


                        {/* Educator Metadata */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 text-base sm:text-lg leading-tight truncate">
                            {fac.name || 'Educator'}
                          </h3>
                          <p className="text-xs font-bold text-indigo-600 mt-1">
                            {fac.subject || 'Faculty'}
                          </p>
                          <span className="inline-block text-[11px] text-gray-400 mt-2 font-medium">
                            Thoughtful&apos;s Faculty
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </section>
            )}


            {/* 3. PUBLIC STUDY CARDS & VIDEOS (Horizontal Album Carousel Manner) */}
            {publicStudyCards.length > 0 && (
              <section id="public-videos" className="space-y-6 pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="w-1.5 self-stretch min-h-[2.25rem] bg-red-600 rounded-full shrink-0 mt-0.5" />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-display font-bold text-lg sm:text-2xl text-gray-900 leading-tight">
                          Public Video Lectures &amp; Demo Cards
                        </h2>
                        <span className="inline-flex items-center text-xs px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 font-bold shrink-0 whitespace-nowrap">
                          Free Access
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-500 mt-1">
                        Public study cards and video lectures for {activeBatch.name}
                      </p>
                    </div>
                  </div>

                  {/* Desktop Carousel Controls */}
                  <div className="hidden sm:flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => scrollCarousel('left')}
                      className="p-2 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-700 transition-colors"
                      title="Scroll Left"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => scrollCarousel('right')}
                      className="p-2 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-700 transition-colors"
                      title="Scroll Right"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Horizontal Album / Scrollable Carousel */}
                <div
                  ref={carouselRef}
                  className="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-none scroll-smooth"
                >
                  {publicStudyCards.map((card) => {
                    const thumb = card.thumbnail_url || getYouTubeThumbnail(card.url)
                    return (
                      <div
                        key={card.id}
                        onClick={() => navigate(`/watch/${card.id}`, { state: { card } })}
                        className="group flex-shrink-0 w-72 sm:w-80 snap-start bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col"
                      >
                        {/* Thumbnail Container */}
                        <div className="relative aspect-video bg-gray-900 overflow-hidden">
                          {thumb ? (
                            <img src={thumb} alt={card.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : card.type === 'google_drive' ? (
                            <div className="w-full h-full bg-gradient-to-br from-amber-100 via-amber-50 to-yellow-100 flex items-center justify-center p-3 select-none">
                              <div className="bg-white rounded-xl shadow-md p-2.5 border border-amber-200/90 w-[85%] h-[82%] flex flex-col justify-between">
                                <div className="flex items-start">
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500 text-white text-[9.5px] font-bold tracking-tight shadow-2xs max-w-full">
                                    <FileText className="h-2.5 w-2.5 shrink-0" />
                                    <span className="line-clamp-2 leading-tight">{card.title}</span>
                                  </span>
                                </div>
                                <div className="space-y-1.5">
                                  <div className="h-0.5 bg-amber-100 rounded-full w-full" />
                                  <div className="h-0.5 bg-amber-100 rounded-full w-4/5" />
                                  <div className="h-0.5 bg-amber-100 rounded-full w-3/5" />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-red-900 to-indigo-950 flex items-center justify-center">
                              <Video className="h-12 w-12 text-white/40" />
                            </div>
                          )}

                          {/* Play Button Overlay (Videos only) */}
                          {card.type !== 'google_drive' && (
                            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                              <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                <PlayCircle className="h-7 w-7" />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Card Info */}
                        <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                          <div>
                            {card.subject && (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded-full inline-block mb-1">
                                {card.subject}
                              </span>
                            )}
                            <h3 className="font-bold text-gray-900 text-sm line-clamp-2 leading-snug group-hover:text-red-600 transition-colors">
                              {card.title}
                            </h3>
                          </div>
                          <p className="text-xs font-semibold text-gray-500 flex items-center gap-1 pt-1">
                            {card.type === 'google_drive' ? 'Click to view material' : 'Click to play lecture'} <ArrowRight className="h-3 w-3" />
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* 4. ENROLLMENT CTA FOOTER BANNER */}
            <section className="rounded-3xl bg-gradient-to-r from-blue-950 via-indigo-900 to-blue-900 p-8 sm:p-12 text-white text-center space-y-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="max-w-2xl mx-auto space-y-3 relative z-10">
                <span className="inline-block px-3.5 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold uppercase tracking-wider border border-amber-400/30">
                  Instant Access
                </span>
                <h2 className="font-display font-extrabold text-2xl sm:text-3xl lg:text-4xl tracking-tight">
                  Ready to excel with {activeBatch.name}?
                </h2>
                <p className="text-blue-200 text-xs sm:text-sm leading-relaxed">
                  Register today and enjoy full batch access for 2 days free. No commitments required.
                </p>
              </div>

              <div className="pt-2 relative z-10">
                <Link
                  to={`/register?batch=${activeBatch.id}`}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-amber-400 hover:bg-amber-500 text-blue-950 font-bold text-base shadow-xl shadow-amber-400/20 transition-all transform hover:-translate-y-0.5"
                >
                  Start 2-Day Free Trial Now <ArrowRight className="h-5 w-5" />
                </Link>
              </div>
            </section>
          </div>
        </main>
      ) : (
        <div className="py-20 text-center text-gray-500 text-sm">No batches available.</div>
      )}



      {showPosterModal && activeBatch?.poster_url?.trim() && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative bg-blue-950 rounded-3xl overflow-hidden max-w-4xl w-full max-h-[92vh] border border-white/20 shadow-2xl flex flex-col">
            {/* Modal Top Header */}
            <div className="px-6 py-4 bg-blue-900/80 border-b border-white/10 flex items-center justify-between text-white flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-400 text-blue-950 flex items-center justify-center font-bold">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg leading-tight">{activeBatch.name} — Official Brochure</h3>
                  <p className="text-xs text-blue-200">High-Resolution Batch Poster &amp; Curriculum Details</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={convertDriveUrl(activeBatch.poster_url)}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  title="Open original link"
                >
                  <Download className="h-4 w-4 text-amber-400" /> <span className="hidden sm:inline">Open Original</span>
                </a>
                <button
                  onClick={() => setShowPosterModal(false)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-red-500/80 text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Full Image Display Container */}
            <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center bg-slate-950/80">
              <DriveImage
                src={activeBatch.poster_url.trim()}
                alt={activeBatch.name}
                className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-2xl"
                fallback={
                  <div className="p-12 text-center text-white">
                    <p className="text-amber-400 font-bold mb-2">Unable to render high-res view</p>
                    <a href={activeBatch.poster_url} target="_blank" rel="noreferrer" className="text-xs text-blue-300 underline">
                      Click here to open link directly
                    </a>
                  </div>
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── FLOATING BOTTOM-RIGHT BACK TO HOME BUTTON ─── */}
      <Link
        to="/"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 bg-blue-950 hover:bg-blue-900 text-white font-bold text-xs sm:text-sm rounded-full shadow-2xl border border-amber-400/40 hover:border-amber-400 backdrop-blur-md transition-all transform hover:scale-105 active:scale-95 group"
        title="Go to Home Page"
      >
        <HomeIcon className="h-4 w-4 text-amber-400 group-hover:scale-110 transition-transform" />
        <span>Back to Home</span>
      </Link>
    </div>
  )
}


