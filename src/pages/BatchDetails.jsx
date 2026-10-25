import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap, PlayCircle, ArrowRight, BookOpen, Video,
  Users, ChevronLeft, ChevronRight, X, Sparkles, UserCheck,
  Maximize2, Download, Share2, Home as HomeIcon, ChevronDown,
  Check, Search, LogIn, FileText, CheckCircle2, ShieldCheck,
  ExternalLink
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { INSTITUTE_NAME, CONTACT_EMAIL } from '../lib/constants'
import { getYouTubeThumbnail, convertDriveUrl } from '../utils/formatters'
import DriveImage from '../components/shared/DriveImage'
import DOMPurify from 'dompurify'

const CONTAINER = 'max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8'

// Signature Lovable button classes
const BTN_PRIMARY = 'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#1c1c1c] hover:bg-[#2c2c2c] text-[#fcfbf8] font-medium text-sm transition-all duration-150 shadow-[inset_0px_0.5px_0px_rgba(255,255,255,0.2),inset_0px_0px_0px_0.5px_rgba(0,0,0,0.2),0px_1px_2px_rgba(0,0,0,0.05)] active:opacity-85'
const BTN_OUTLINE = 'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-white hover:bg-[#1c1c1c]/5 text-[#1c1c1c] font-medium text-sm border border-[#1c1c1c]/30 hover:border-[#1c1c1c] transition-all duration-150 active:opacity-85 shadow-2xs'

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
    supabase
      .from('batches')
      .select('*, profiles!teacher_id(full_name)')
      .eq('is_active', true)
      .order('name')
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
    const { data, error } = await supabase
      .from('study_cards')
      .select('*')
      .eq('is_active', true)
      .or('is_public.eq.true,is_featured.eq.true')
      .order('display_order')

    if (error) {
      toast.error('Failed to load study cards: ' + error.message)
    } else if (data) {
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
        // Fallback
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
    const shareText = `🎓 Check out ${activeBatch.name} at ${INSTITUTE_NAME}! Complete curriculum, live timetable & demo lectures:`

    const shareData = {
      title: shareTitle,
      text: shareText,
      url: shareUrl,
    }

    if (navigator.share) {
      try {
        if (navigator.canShare && !navigator.canShare(shareData)) {
          await navigator.share({
            title: shareTitle,
            text: `${shareText}\n${shareUrl}`,
          })
        } else {
          await navigator.share(shareData)
        }
        return
      } catch (err) {
        if (err.name === 'AbortError') return
      }
    }

    const copied = await copyToClipboard(`${shareText}\n${shareUrl}`)
    if (copied) {
      toast.success('Batch link copied! Share with friends.')
    } else {
      toast.error('Failed to copy link')
    }
  }

  const scrollCarousel = (direction) => {
    if (carouselRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320
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
      <div className="min-h-screen bg-[#f7f4ed] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#1c1c1c] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono font-medium text-[#5f5f5d]">Loading batch details…</p>
        </div>
      </div>
    )
  }

  const facultyList = activeBatch && Array.isArray(activeBatch.faculty_images) ? activeBatch.faculty_images : []

  return (
    <div className="min-h-screen bg-[#f7f4ed] text-[#1c1c1c] font-sans antialiased selection:bg-[#1c1c1c] selection:text-[#fcfbf8] flex flex-col w-full min-w-0 max-w-full overflow-x-hidden">

      {/* ════════════ TOP NAVIGATION BAR (Lovable Style) ════════════ */}
      <header className="sticky top-0 z-40 bg-[#f7f4ed]/95 backdrop-blur-md border-b border-[#e7e4dc]">
        <div className={`${CONTAINER} h-16 flex items-center justify-between gap-4`}>
          
          {/* Left: Brand & Breadcrumbs */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-[#1c1c1c] text-[#fcfbf8] flex items-center justify-center font-bold shadow-xs">
                <GraduationCap className="w-4.5 h-4.5" />
              </div>
              <span className="font-semibold text-base text-[#1c1c1c] tracking-tight group-hover:opacity-80 transition-opacity">
                {INSTITUTE_NAME}
              </span>
            </Link>

            <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#5f5f5d] pl-3 border-l border-[#e7e4dc]">
              <Link to="/" className="hover:text-[#1c1c1c] transition-colors">Home</Link>
              <span>/</span>
              <span>Batches</span>
              {activeBatch && (
                <>
                  <span>/</span>
                  <span className="text-[#1c1c1c] font-medium max-w-[160px] truncate">{activeBatch.name}</span>
                </>
              )}
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[#1c1c1c]/25 hover:border-[#1c1c1c] text-[#1c1c1c] text-xs font-medium transition-colors bg-white/60"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Login</span>
            </Link>

            <Link
              to={activeBatch ? `/register?batch=${activeBatch.id}` : '/register'}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#1c1c1c] hover:bg-[#2c2c2c] text-[#fcfbf8] text-xs font-medium shadow-[inset_0px_0.5px_0px_rgba(255,255,255,0.2),inset_0px_0px_0px_0.5px_rgba(0,0,0,0.2),0px_1px_2px_rgba(0,0,0,0.05)] transition-all"
            >
              <span>Enroll Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ════════════ BATCH SELECTOR STRIP ════════════ */}
      {batches.length > 0 && (
        <div className="bg-white border-b border-[#e7e4dc] py-2.5 z-30">
          <div className={CONTAINER}>
            <div className="relative inline-block w-full sm:w-auto" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setShowBatchDropdown(!showBatchDropdown)}
                className={`w-full sm:w-auto min-w-0 sm:min-w-[300px] inline-flex items-center justify-between gap-3 px-4 py-2 rounded-xl border transition-all duration-150 cursor-pointer shadow-2xs ${
                  showBatchDropdown
                    ? 'bg-[#f7f4ed] border-[#1c1c1c]'
                    : 'bg-white hover:bg-[#f7f4ed]/50 border-[#e2ddd1]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center font-bold">
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="text-left leading-tight">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#5f5f5d] block">
                      Cohort ({batches.length})
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-[#1c1c1c] block max-w-[180px] xs:max-w-[220px] truncate">
                      {activeBatch?.name || 'Choose Batch'}
                    </span>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-[#5f5f5d] transition-transform duration-150 ${showBatchDropdown ? 'rotate-180 text-[#1c1c1c]' : ''}`} />
              </button>

              <AnimatePresence>
                {showBatchDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute top-full left-0 right-0 sm:right-auto sm:w-80 mt-1.5 bg-white rounded-xl border border-[#e2ddd1] shadow-lg z-50 py-1.5 overflow-hidden"
                  >
                    {batches.length > 4 && (
                      <div className="px-3 pb-2 pt-1 border-b border-[#eceae4]">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[#5f5f5d]" />
                          <input
                            type="text"
                            placeholder="Filter batches..."
                            value={searchBatchQuery}
                            onChange={(e) => setSearchBatchQuery(e.target.value)}
                            className="w-full pl-8 pr-3 py-1 bg-[#f7f4ed] border border-[#e2ddd1] rounded-lg text-xs text-[#1c1c1c] placeholder-[#5f5f5d] focus:outline-none focus:border-[#1c1c1c]"
                          />
                        </div>
                      </div>
                    )}
                    <div className="max-h-72 overflow-y-auto divide-y divide-[#eceae4]">
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
                              className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                                isActive
                                  ? 'bg-[#1c1c1c] text-[#fcfbf8]'
                                  : 'text-[#1c1c1c] hover:bg-[#f7f4ed]'
                              }`}
                            >
                              <span className="text-xs font-medium truncate">{b.name}</span>
                              {isActive && <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />}
                            </button>
                          )
                        })
                      ) : (
                        <div className="py-4 text-center text-xs text-[#5f5f5d]">No matching cohorts</div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ MAIN CONTENT BODY ════════════ */}
      {activeBatch ? (
        <main className="flex-1 pb-28 sm:pb-24">
          
          {/* ─── BATCH HERO BANNER (Warm Illuminated Gradient #fbf9f4 to #f3eee3) ─── */}
          <section
            className="relative overflow-hidden py-12 sm:py-16 border-b border-[#e7e4dc]"
            style={{
              background: 'linear-gradient(180deg, #fbf9f4 0%, #f7f4ed 60%, #f3eee3 100%)',
            }}
          >
            {/* Atmospheric Multi-Color Wash */}
            <div
              className="absolute inset-0 pointer-events-none opacity-50 select-none"
              style={{
                background: 'radial-gradient(ellipse at 50% 30%, rgba(251, 191, 36, 0.22) 0%, rgba(96, 165, 250, 0.12) 50%, transparent 100%)',
              }}
            />

            <div className={`${CONTAINER} relative z-10 grid lg:grid-cols-12 gap-10 items-center`}>
              
              {/* Left Details */}
              <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                
                {/* Admissions Badge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#e2ddd1] bg-white text-xs text-[#1c1c1c] shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold uppercase tracking-wider text-[11px]">
                    Batch Admissions Open · 2-Day Free Trial
                  </span>
                </div>

                {/* Batch Title */}
                <h1 className="text-3xl sm:text-5xl font-semibold text-[#1c1c1c] tracking-[-0.035em] leading-[1.08] break-words">
                  {activeBatch.name}
                </h1>

                {activeBatch.description && (
                  <p className="text-[#5f5f5d] text-sm sm:text-base leading-relaxed max-w-xl mx-auto lg:mx-0 font-normal">
                    {activeBatch.description}
                  </p>
                )}

                {/* Subjects & Mentor Row */}
                <div className="flex flex-wrap items-center gap-2 justify-center lg:justify-start pt-1">
                  {Array.isArray(activeBatch.subjects) && activeBatch.subjects.length > 0 ? (
                    activeBatch.subjects.map((sub, idx) => (
                      <span key={idx} className="px-3 py-1 rounded-full bg-white border border-[#e2ddd1] text-[#1c1c1c] text-xs font-medium shadow-2xs">
                        {sub}
                      </span>
                    ))
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-white border border-[#e2ddd1] text-[#1c1c1c] text-xs font-medium shadow-2xs">
                      Full Syllabus
                    </span>
                  )}

                  {activeBatch.profiles?.full_name && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-950 text-xs font-medium shadow-2xs">
                      <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                      {activeBatch.profiles.full_name}
                    </span>
                  )}
                </div>

                {/* CTAs */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
                  <Link
                    to={`/register?batch=${activeBatch.id}`}
                    className={BTN_PRIMARY}
                  >
                    <span>Enroll in this Batch</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  {publicStudyCards.length > 0 && (
                    <a href="#public-videos" className={BTN_OUTLINE}>
                      <PlayCircle className="w-4 h-4 text-[#1c1c1c]" />
                      <span>Watch Demo Lectures</span>
                    </a>
                  )}
                </div>

              </div>

              {/* Right: Poster Showcase Card */}
              <div className="lg:col-span-5 flex justify-center lg:justify-end items-start">
                <div className="flex flex-col w-full sm:w-[320px] lg:w-[330px]">
                  
                  {/* Poster Clickable Frame with Champagne Border */}
                  <motion.div
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.18 }}
                    onClick={() => activeBatch.poster_url?.trim() && setShowPosterModal(true)}
                    className="group relative cursor-pointer rounded-2xl overflow-hidden aspect-[9/16] bg-white border border-[#e2ddd1] shadow-[0_12px_40px_rgba(28,28,28,0.06)] flex items-center justify-center"
                  >
                    {activeBatch.poster_url?.trim() ? (
                      <DriveImage
                        src={activeBatch.poster_url.trim()}
                        alt={activeBatch.name}
                        className="w-full h-full object-contain rounded-2xl transition-transform duration-500 group-hover:scale-[1.02]"
                        fallback={
                          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#f7f4ed]">
                            <GraduationCap className="h-10 w-10 text-[#1c1c1c] mb-2" />
                            <h3 className="font-semibold text-base text-[#1c1c1c]">{activeBatch.name}</h3>
                            <p className="text-xs text-[#5f5f5d] mt-1">Official Batch Curriculum</p>
                          </div>
                        }
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#f7f4ed]">
                        <GraduationCap className="h-10 w-10 text-[#1c1c1c] mb-2" />
                        <h3 className="font-semibold text-base text-[#1c1c1c]">{activeBatch.name}</h3>
                        <p className="text-xs text-[#5f5f5d] mt-1">Official Batch Curriculum</p>
                      </div>
                    )}

                    {/* Hover Overlay */}
                    {activeBatch.poster_url?.trim() && (
                      <div className="absolute inset-0 bg-[#1c1c1c]/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-2 p-4 text-center">
                        <div className="w-10 h-10 rounded-full bg-white text-[#1c1c1c] flex items-center justify-center shadow-md">
                          <Maximize2 className="h-4 w-4" />
                        </div>
                        <span className="font-medium text-xs">Tap to Inspect Brochure</span>
                      </div>
                    )}
                  </motion.div>

                  {/* Share Pill Button */}
                  <button
                    type="button"
                    onClick={handleShareBatch}
                    className="mt-3.5 flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-[#e2ddd1] bg-white hover:border-[#1c1c1c] text-[#1c1c1c] font-medium text-xs transition-colors shadow-2xs active:opacity-85 cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5 text-[#5f5f5d]" />
                    <span>Share Batch with Friends</span>
                  </button>

                </div>
              </div>

            </div>
          </section>

          {/* ─── DETAILED CURRICULUM SECTION (Crisp White Background) ─── */}
          <div className="py-12 sm:py-16 bg-white border-b border-[#e7e4dc]">
            <div className={`${CONTAINER} space-y-6`}>
              <div className="flex items-center gap-3 border-b border-[#eceae4] pb-4">
                <div className="w-8 h-8 rounded-lg bg-[#1c1c1c] text-[#fcfbf8] flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg text-[#1c1c1c] tracking-tight">Curriculum &amp; Deliverables</h2>
                  <p className="text-xs text-[#5f5f5d]">Comprehensive syllabus breakdown and learning materials</p>
                </div>
              </div>

              {activeBatch.detailed_info ? (
                <div
                  className="prose prose-neutral max-w-none text-[#1c1c1c] text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(activeBatch.detailed_info) }}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pt-2">
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50/80 to-white border border-blue-100 space-y-2 shadow-2xs">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                      <Video className="w-4.5 h-4.5" />
                    </div>
                    <h3 className="font-semibold text-sm text-blue-950">Interactive Live Classes</h3>
                    <p className="text-xs text-[#5f5f5d] leading-relaxed">
                      Attend daily scheduled interactive lectures or stream on-demand replays anytime in 1080p.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50/80 to-white border border-indigo-100 space-y-2 shadow-2xs">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                      <BookOpen className="w-4.5 h-4.5" />
                    </div>
                    <h3 className="font-semibold text-sm text-indigo-950">Curated Study Materials</h3>
                    <p className="text-xs text-[#5f5f5d] leading-relaxed">
                      Instant access to handwritten formula sheets, practice DPPs, and chapter question banks.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-white border border-emerald-100 space-y-2 shadow-2xs">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                      <Users className="w-4.5 h-4.5" />
                    </div>
                    <h3 className="font-semibold text-sm text-emerald-950">Direct Teacher Mentorship</h3>
                    <p className="text-xs text-[#5f5f5d] leading-relaxed">
                      Message your educator directly through the student portal for personalized doubt resolution.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ─── FACULTY & TEACHERS SECTION (Luminous Academic Atmospheric Canvas) ─── */}
          {facultyList.length > 0 && (
            <div
              className="relative overflow-hidden py-14 sm:py-20 border-b border-[#e2ddd1]"
              style={{
                background: 'radial-gradient(ellipse 70% 50% at 20% 20%, rgba(99, 102, 241, 0.08) 0%, transparent 60%), radial-gradient(ellipse 70% 50% at 80% 80%, rgba(56, 189, 248, 0.08) 0%, transparent 60%), linear-gradient(180deg, #f7f4ed 0%, #eee8d9 50%, #e6decb 100%)',
              }}
            >
              {/* Delicate Architectural Dot Matrix Texture */}
              <div
                className="absolute inset-0 pointer-events-none opacity-[0.035]"
                style={{
                  backgroundImage: 'radial-gradient(#1c1c1c 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                }}
              />

              {/* Atmospheric Ambient Light Glows */}
              <div className="absolute -top-16 -left-16 w-96 h-96 bg-gradient-to-br from-indigo-200/25 via-purple-100/15 to-transparent rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-16 -right-16 w-96 h-96 bg-gradient-to-tl from-sky-200/25 via-indigo-100/15 to-transparent rounded-full blur-3xl pointer-events-none" />

              <div className={`${CONTAINER} relative z-10 space-y-6 sm:space-y-8`}>
                <div className="flex items-start gap-3.5">
                  <div className="w-1.5 h-11 rounded-full bg-gradient-to-b from-indigo-500 to-indigo-700 mt-1 shrink-0 shadow-xs" />
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/80 border border-indigo-200/70 text-indigo-950 text-[11px] font-bold tracking-wide uppercase shadow-2xs mb-1">
                      <Sparkles className="w-3 h-3 text-indigo-600 fill-indigo-500" />
                      <span>Senior Academic Mentors</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1c1c1c] tracking-tight">
                      Faculty &amp; Educators
                    </h2>
                    <p className="text-xs sm:text-sm text-[#5f5f5d] mt-1 max-w-xl leading-relaxed">
                      Learn from dedicated educators committed to conceptual clarity, rigorous problem practice, and student success.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 sm:gap-5 overflow-x-auto snap-x snap-mandatory pb-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:none]">
                  {facultyList.map((fac, i) => (
                    <motion.div
                      key={i}
                      whileHover={{ y: -4, transition: { type: 'spring', stiffness: 350, damping: 25 } }}
                      className="flex-shrink-0 w-80 sm:w-88 snap-start bg-gradient-to-b from-white via-[#fcfbf9] to-white rounded-2xl border border-[#ded9cb] hover:border-indigo-500/80 shadow-[0_10px_30px_rgba(28,28,28,0.06)] hover:shadow-[0_16px_36px_rgba(99,102,241,0.12)] p-4 sm:p-5 flex items-center gap-4 transition-all duration-300 relative group overflow-hidden"
                    >
                      {/* Subtle top edge gradient highlight */}
                      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-600 via-sky-500 to-indigo-700 opacity-80 group-hover:opacity-100 transition-opacity" />

                      <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-[#f7f4ed] overflow-hidden border border-[#dfdbcf] flex-shrink-0 flex items-center justify-center shadow-xs">
                        {fac.image_url?.trim() ? (
                          <DriveImage
                            src={fac.image_url.trim()}
                            alt={fac.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            fallback={<UserCheck className="w-7 h-7 text-[#5f5f5d]" />}
                          />
                        ) : (
                          <UserCheck className="w-7 h-7 text-[#5f5f5d]" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm sm:text-base text-[#1c1c1c] truncate group-hover:text-indigo-950 transition-colors">
                          {fac.name || 'Educator'}
                        </h3>
                        <div className="mt-0.5">
                          <span className="inline-flex items-center text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                            {fac.subject || 'Faculty'}
                          </span>
                        </div>
                        <span className="inline-block text-[11px] text-[#5f5f5d] mt-1 font-medium">
                          {INSTITUTE_NAME} Senior Faculty
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── PUBLIC DEMO LECTURES & STUDY CARDS SECTION ─── */}
          {publicStudyCards.length > 0 && (
            <div id="public-videos" className="py-12 sm:py-16 bg-[#f7f4ed] border-b border-[#e7e4dc]">
              <div className={`${CONTAINER} space-y-6`}>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Free Access
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-semibold text-[#1c1c1c] tracking-tight">
                      Demo Lectures &amp; Public Study Cards
                    </h2>
                    <p className="text-xs sm:text-sm text-[#5f5f5d] mt-1">
                      Experience the teaching methodology for {activeBatch.name} before enrolling.
                    </p>
                  </div>

                  <div className="hidden sm:flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => scrollCarousel('left')}
                      className="p-1.5 rounded-lg border border-[#e2ddd1] bg-white hover:border-[#1c1c1c] text-[#1c1c1c] transition-colors shadow-2xs"
                      title="Scroll Left"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => scrollCarousel('right')}
                      className="p-1.5 rounded-lg border border-[#e2ddd1] bg-white hover:border-[#1c1c1c] text-[#1c1c1c] transition-colors shadow-2xs"
                      title="Scroll Right"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div
                  ref={carouselRef}
                  className="flex gap-4 sm:gap-5 overflow-x-auto snap-x snap-mandatory pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:none]"
                >
                  {publicStudyCards.map((card) => {
                    const thumb = card.thumbnail_url || getYouTubeThumbnail(card.url)
                    return (
                      <motion.div
                        key={card.id}
                        whileHover={{ y: -3 }}
                        transition={{ duration: 0.18 }}
                        onClick={() => navigate(`/watch/${card.id}`, { state: { card } })}
                        className="group flex-shrink-0 w-72 sm:w-80 snap-start bg-white rounded-xl border border-[#e2ddd1] hover:border-[#1c1c1c]/50 overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col"
                      >
                        <div className="relative aspect-video bg-[#1c1c1c] overflow-hidden">
                          {thumb ? (
                            <img
                              src={thumb}
                              alt={card.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : card.type === 'google_drive' ? (
                            <div className="w-full h-full bg-[#f7f4ed] flex items-center justify-center p-3 select-none">
                              <div className="bg-white rounded-lg p-2.5 border border-[#eceae4] w-[85%] h-[82%] flex flex-col justify-between">
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#1c1c1c] text-[#fcfbf8] text-[10px] font-medium">
                                  <FileText className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{card.title}</span>
                                </span>
                                <div className="space-y-1">
                                  <div className="h-0.5 bg-[#eceae4] rounded-full w-full" />
                                  <div className="h-0.5 bg-[#eceae4] rounded-full w-4/5" />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="w-full h-full bg-[#f7f4ed] flex items-center justify-center">
                              <Video className="w-8 h-8 text-[#5f5f5d]" />
                            </div>
                          )}

                          {card.type !== 'google_drive' && (
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                              <div className="w-10 h-10 rounded-full bg-[#1c1c1c]/90 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-md border border-white/20">
                                <PlayCircle className="h-5 w-5 ml-0.5" />
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                          <div>
                            {card.subject && (
                              <span className="text-[10px] font-mono font-medium uppercase tracking-wider text-[#5f5f5d] bg-[#f7f4ed] px-2 py-0.5 rounded-full inline-block mb-1 border border-[#eceae4]">
                                {card.subject}
                              </span>
                            )}
                            <h3 className="font-semibold text-sm text-[#1c1c1c] line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors">
                              {card.title}
                            </h3>
                          </div>
                          <p className="text-xs font-semibold text-[#1c1c1c] flex items-center gap-1 pt-1">
                            {card.type === 'google_drive' ? 'View study material' : 'Watch lecture demo'} <ArrowRight className="w-3.5 h-3.5" />
                          </p>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ─── READY TO EXCEL CLOSING CARD (Luxurious Dark Contrast) ─── */}
          <div className="py-12 sm:py-16">
            <div className={CONTAINER}>
              <section className="rounded-3xl bg-gradient-to-br from-[#1c1c1c] via-[#242424] to-[#141414] text-[#fcfbf8] p-8 sm:p-12 text-center space-y-5 shadow-xl relative overflow-hidden border border-white/10">
                <div
                  className="absolute inset-0 pointer-events-none opacity-25 select-none"
                  style={{
                    background: 'radial-gradient(ellipse at 50% 50%, rgba(99, 102, 241, 0.35) 0%, transparent 70%)',
                  }}
                />
                <div className="max-w-xl mx-auto space-y-2 relative z-10">
                  <span className="inline-block px-3.5 py-1 rounded-full bg-white/10 text-indigo-300 text-xs font-mono font-bold uppercase tracking-wider border border-white/10">
                    Instant Access
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
                    Ready to excel with {activeBatch.name}?
                  </h2>
                  <p className="text-sm text-[#d4d4d8] leading-relaxed">
                    Join today and test-drive full batch access with a 2-day complimentary trial. No obligations.
                  </p>
                </div>

                <div className="pt-2 relative z-10">
                  <Link
                    to={`/register?batch=${activeBatch.id}`}
                    className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-all active:scale-95 cursor-pointer shadow-indigo-600/30"
                  >
                    <span>Start 2-Day Free Trial</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </section>
            </div>
          </div>

        </main>
      ) : (
        <div className="min-h-[50vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center bg-white rounded-2xl p-8 border border-[#e2ddd1] shadow-xs space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#f7f4ed] text-[#1c1c1c] flex items-center justify-center mx-auto border border-[#e2ddd1]">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h2 className="text-base font-semibold text-[#1c1c1c]">No Batches Currently Available</h2>
            <p className="text-xs text-[#5f5f5d] leading-relaxed">
              We are preparing new cohorts for the upcoming session. Explore our free lectures or return home.
            </p>
            <div className="pt-2">
              <Link
                to="/"
                className={BTN_PRIMARY}
              >
                <HomeIcon className="w-3.5 h-3.5" /> Return to Home
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ─── FULL POSTER MODAL (Lovable Clean Surface) ─── */}
      <AnimatePresence>
        {showPosterModal && activeBatch?.poster_url?.trim() && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="relative bg-white rounded-2xl overflow-hidden max-w-4xl w-full max-h-[92vh] border border-[#e2ddd1] shadow-xl flex flex-col"
            >
              <div className="px-5 py-3.5 bg-[#f7f4ed] border-b border-[#e2ddd1] flex items-center justify-between text-[#1c1c1c] flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  <div>
                    <h3 className="font-semibold text-sm leading-tight">{activeBatch.name} — Official Brochure</h3>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={convertDriveUrl(activeBatch.poster_url)}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg border border-[#e2ddd1] bg-white hover:border-[#1c1c1c] text-[#1c1c1c] text-xs font-medium flex items-center gap-1.5 transition-colors"
                    title="Download"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Download</span>
                  </a>
                  <button
                    onClick={() => setShowPosterModal(false)}
                    className="p-1.5 rounded-lg border border-[#e2ddd1] bg-white hover:bg-red-50 hover:text-red-600 text-[#1c1c1c] transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center bg-[#faf8f3]">
                <DriveImage
                  src={activeBatch.poster_url.trim()}
                  alt={activeBatch.name}
                  className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-sm"
                  fallback={
                    <div className="p-12 text-center text-[#5f5f5d]">
                      <p className="font-semibold mb-2">Unable to render high-res view</p>
                      <a href={activeBatch.poster_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">
                        Click here to open link directly
                      </a>
                    </div>
                  }
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MOBILE STICKY BOTTOM ENROLLMENT DOCK ─── */}
      {activeBatch && (
        <div className="sm:hidden fixed bottom-3 inset-x-3 z-40">
          <div className="bg-[#1c1c1c] text-[#fcfbf8] border border-white/10 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-xl">
            <button
              onClick={handleShareBatch}
              className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 active:opacity-85 transition-all"
              title="Share Batch"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <div className="flex-1 min-w-0 px-2 text-left">
              <span className="text-[10px] font-mono text-emerald-400 font-semibold block leading-none">2-DAY FREE TRIAL</span>
              <span className="text-xs font-semibold text-white truncate block leading-tight mt-0.5">{activeBatch.name}</span>
            </div>
            <Link
              to={`/register?batch=${activeBatch.id}`}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1 active:opacity-85 shadow-xs shadow-indigo-600/30"
            >
              <span>Enroll</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* ─── FLOATING BACK TO HOME BUTTON (Mobile & Desktop) ─── */}
      <Link
        to="/"
        className={`fixed ${
          activeBatch ? 'bottom-[72px]' : 'bottom-4'
        } sm:bottom-6 right-3 sm:right-6 z-40 inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-[#1c1c1c]/95 hover:bg-[#2c2c2c] text-[#fcfbf8] font-medium text-xs rounded-full sm:rounded-lg shadow-[inset_0px_0.5px_0px_rgba(255,255,255,0.25),0_4px_12px_rgba(0,0,0,0.2)] border border-white/15 backdrop-blur-md transition-all hover:scale-105 active:scale-95 group`}
        title="Return to Home"
      >
        <HomeIcon className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform shrink-0" />
        <span className="hidden sm:inline">Back to Home</span>
        <span className="sm:hidden text-[11px] font-semibold tracking-tight">Home</span>
      </Link>

    </div>
  )
}
