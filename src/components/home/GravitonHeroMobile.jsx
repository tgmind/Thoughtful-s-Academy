import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  BookOpen, LogIn, ArrowRight, Sparkles, Video, MessageSquare, Award
} from 'lucide-react'
import GravitonBrandText from '../shared/GravitonBrandText'
import { useLandingMedia } from '../../hooks/useLandingMedia'
import { handleImageFallback } from '../../utils/imageOptimizer'

const CONTAINER = 'max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8'

export default function GravitonHeroMobile({
  instituteName,
  heroActiveCard,
  mobileHeroCard,
  heroDeckItems,
  handleSelectHeroCard,
  handleDeckActivity,
  isClone = false,
}) {
  const { getSlot } = useLandingMedia()
  const leftCardMedia = getSlot('hero_card_left')
  const centerCardMedia = getSlot('hero_card_center')
  const rightCardMedia = getSlot('hero_card_right')

  return (
    <div className="w-full relative" aria-hidden={isClone ? true : undefined}>
      <div className={`${CONTAINER} relative z-10 flex flex-col gap-6 sm:gap-8 items-center`}>
        
        {/* Editorial Headline & Actions */}
        <div className="w-full text-center space-y-4 sm:space-y-5">
          
          {/* Top Pill Tag */}
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full border border-[#dcd7cb] bg-gradient-to-r from-white via-[#fcfbf9] to-white backdrop-blur-sm text-[11px] sm:text-xs text-[#1c1c1c] shadow-xs max-w-full">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-semibold tracking-tight">Academic Excellence</span>
            <span className="text-[#5f5f5d]/50">·</span>
            <span className="text-indigo-950 font-semibold whitespace-nowrap">Conceptual Mastery</span>
          </div>

          {/* Display Headline */}
          <div className="space-y-2.5 sm:space-y-3">
            <h1 className="text-2xl sm:text-4xl font-extrabold text-[#1c1c1c] tracking-[-0.03em] leading-[1.15]">
              <span className="block text-xs sm:text-sm font-bold text-[#5f5f5d] uppercase tracking-wider mb-1">
                Physics Coaching Institute
              </span>
              <span className="block mt-0.5">
                <GravitonBrandText name={instituteName} variant="hero-mobile" className="text-3xl sm:text-4xl" />
              </span>
              <span className="block text-base sm:text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[#1c1c1c] via-[#2d2d2d] to-[#454545] mt-1 font-serif italic tracking-tight">
                Empowering Concepts. Building Toppers.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xs sm:text-sm text-[#5f5f5d] font-normal leading-relaxed max-w-xl mx-auto">
              Expert Physics mentoring for Classes 9–12, with focused preparation for JEE, NEET, and board examinations. Master complex concepts through clear explanations, structured learning, problem-solving techniques, and interactive sessions, supported by regular practice and dedicated doubt resolution.
            </p>
          </div>

          {/* CTAs */}
          <div className="grid grid-cols-1 sm:grid-cols-[1.35fr_0.8fr_1.1fr] gap-2.5 sm:gap-3 pt-1 max-w-xl mx-auto w-full">
            <Link
              to="/batch-details"
              className="w-full h-11 sm:h-12 inline-flex items-center justify-center gap-2 px-4 sm:px-5 rounded-xl bg-[#1c1c1c] hover:bg-[#2c2c2c] text-[#fcfbf8] font-semibold text-xs sm:text-sm whitespace-nowrap transition-all duration-150 border border-[#1c1c1c] shadow-[inset_0px_0.5px_0px_rgba(255,255,255,0.25),inset_0px_0px_0px_0.5px_rgba(0,0,0,0.2),0px_4px_12px_rgba(0,0,0,0.12)] active:scale-[0.98] group"
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
              className="w-full h-11 sm:h-12 inline-flex items-center justify-center gap-2 px-3.5 sm:px-4.5 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50/50 to-emerald-50 hover:from-emerald-100/90 hover:to-teal-100/80 text-emerald-950 font-semibold text-xs sm:text-sm whitespace-nowrap border border-emerald-200/90 hover:border-emerald-300 transition-all duration-150 shadow-[inset_0px_0.5px_0px_rgba(255,255,255,0.75),0_1px_2px_rgba(16,185,129,0.06)] active:scale-[0.98] group"
            >
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 group-hover:scale-110 group-hover:rotate-6 transition-all duration-200" />
              <span>Register Free</span>
            </Link>
          </div>

          {/* Micro-Trust Highlights */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-2 max-w-lg mx-auto">
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

        {/* MOBILE 3D TRIAD STAGING AREA */}
        <div 
          className="w-full max-w-[340px] xs:max-w-[370px] mx-auto select-none"
          onTouchStart={handleDeckActivity}
          onPointerDown={handleDeckActivity}
        >
          {/* Accessible Tablist for Hero Cards (Visual pill removed per user instruction) */}
          <div 
            className="sr-only"
            role="tablist"
            aria-label="Hero showcase cards"
          >
            {heroDeckItems.map((item, idx) => {
              const isActive = heroActiveCard === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={`Select card ${idx + 1}${item.isInitial ? ' (Graviton Institute)' : ''}`}
                  onClick={() => handleSelectHeroCard(item.id)}
                >
                  Card {idx + 1}
                </button>
              )
            })}
          </div>

          {/* Mobile 3D Triad Staging Area */}
          <div className="relative h-[295px] xs:h-[315px] flex items-center justify-center select-none pt-2">
            
            {/* Flanking Card: Rupan Sir (Gold Medalist) */}
            <motion.div
              animate={{
                rotate: mobileHeroCard === 'einstein' ? 0 : -6,
                scale: mobileHeroCard === 'einstein' ? 1.04 : 0.9,
                x: mobileHeroCard === 'einstein' ? 24 : 0,
                y: isClone ? 0 : [0, -5, 0],
                zIndex: mobileHeroCard === 'einstein' ? 30 : 10,
                opacity: mobileHeroCard === 'feynman' ? 0.6 : 1,
              }}
              transition={{
                rotate: { type: 'spring', stiffness: 320, damping: 25 },
                scale: { type: 'spring', stiffness: 320, damping: 25 },
                x: { type: 'spring', stiffness: 320, damping: 25 },
                opacity: { duration: 0.25 },
                zIndex: { duration: 0.1 },
                y: isClone ? { duration: 0 } : { repeat: Infinity, duration: 4.8, ease: 'easeInOut' }
              }}
              onClick={() => handleSelectHeroCard('einstein')}
              style={{ transformOrigin: 'bottom center' }}
              className={`absolute left-0 xs:left-1 top-3.5 w-[185px] xs:w-[200px] aspect-[4/5] rounded-2xl border ${
                mobileHeroCard === 'einstein'
                  ? 'border-amber-400/80 shadow-[0_20px_50px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/30 p-2'
                  : 'border-[#dfdbcf] shadow-md p-1.5'
              } bg-gradient-to-b from-white via-[#faf8f3] to-white cursor-pointer transition-colors duration-200`}
            >
              <div className="relative rounded-xl overflow-hidden w-full h-full bg-slate-950 border border-white/10">
                <picture className="contents">
                  <source
                    type="image/webp"
                    srcSet={leftCardMedia?.mobile_url || leftCardMedia?.desktop_url || '/rupan-left.webp'}
                  />
                  <img
                    src={leftCardMedia?.mobile_url || leftCardMedia?.desktop_url || '/rupan-left.webp'}
                    alt={leftCardMedia?.alt_text || 'Rupan Sir — Gold Medalist, 1st Convocation MBBU'}
                    className="w-full h-full object-cover filter contrast-[1.02]"
                    style={{ objectPosition: leftCardMedia?.object_position || '50% 28%' }}
                    onError={(e) => handleImageFallback(e, '/rupan-left.webp')}
                  />
                </picture>
              </div>
            </motion.div>

            {/* Central / Active Card: Graviton Logo */}
            <motion.div
              animate={{
                rotate: mobileHeroCard === 'graviton' ? 0 : (mobileHeroCard === 'einstein' ? 5 : -5),
                scale: mobileHeroCard === 'graviton' ? 1.02 : 0.92,
                x: 0,
                y: isClone ? 0 : [0, -7, 0],
                zIndex: mobileHeroCard === 'graviton' ? 25 : 15,
                opacity: mobileHeroCard === 'graviton' ? 1 : 0.75,
              }}
              transition={{
                rotate: { type: 'spring', stiffness: 320, damping: 25 },
                scale: { type: 'spring', stiffness: 320, damping: 25 },
                opacity: { duration: 0.25 },
                zIndex: { duration: 0.1 },
                y: isClone ? { duration: 0 } : { repeat: Infinity, duration: 5.2, ease: 'easeInOut', delay: 0.3 }
              }}
              onClick={() => handleSelectHeroCard('graviton')}
              style={{ transformOrigin: 'center center' }}
              className={`relative z-20 w-[195px] xs:w-[215px] aspect-[4/5] rounded-2xl border ${
                mobileHeroCard === 'graviton'
                  ? 'border-amber-400/80 shadow-[0_20px_50px_rgba(28,28,28,0.22)] ring-1 ring-amber-400/30 p-2'
                  : 'border-[#dfdbcf] shadow-md p-1.5'
              } bg-gradient-to-b from-white via-[#faf8f3] to-white cursor-pointer transition-colors duration-200`}
            >
              <div className="relative rounded-xl overflow-hidden w-full h-full bg-[#000000] border border-white/10 flex items-center justify-center">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(56,189,248,0.18)_0%,rgba(99,102,241,0.08)_40%,transparent_70%)] pointer-events-none" />
                <img
                  src={centerCardMedia?.mobile_url || centerCardMedia?.desktop_url || '/mainlogo.jpg'}
                  alt={centerCardMedia?.alt_text || `${instituteName} Logo`}
                  className="w-full h-full object-contain p-2"
                  style={{ objectPosition: centerCardMedia?.object_position || 'center center' }}
                  onError={(e) => handleImageFallback(e, '/mainlogo.jpg')}
                />
                <div className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-white text-[9px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Admissions Open</span>
                </div>
                <div className="absolute bottom-2 inset-x-2 p-2 rounded-lg bg-black/80 backdrop-blur-md border border-white/15 text-white flex items-center justify-between">
                  <div className="min-w-0 pr-1">
                    <div className="flex items-center gap-1">
                      <Award className="w-3 h-3 text-amber-400 shrink-0" />
                      <p className="text-[11px] font-bold text-white truncate">{instituteName}</p>
                    </div>
                    <p className="text-[8.5px] text-white/70 leading-none mt-0.5 truncate">Class 9–12 • JEE &amp; NEET</p>
                  </div>
                  <Link
                    to="/batch-details"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-0.5 px-2 py-1 rounded bg-white text-[#1c1c1c] font-bold text-[9px] shrink-0"
                  >
                    <span>Batches</span>
                    <ArrowRight className="w-2.5 h-2.5" />
                  </Link>
                </div>
              </div>
            </motion.div>

            {/* Flanking Card: Rupan Sir (NITian & Physics Mentor) */}
            <motion.div
              animate={{
                rotate: mobileHeroCard === 'feynman' ? 0 : 6,
                scale: mobileHeroCard === 'feynman' ? 1.04 : 0.9,
                x: mobileHeroCard === 'feynman' ? -24 : 0,
                y: isClone ? 0 : [0, -5, 0],
                zIndex: mobileHeroCard === 'feynman' ? 30 : 10,
                opacity: mobileHeroCard === 'einstein' ? 0.6 : 1,
              }}
              transition={{
                rotate: { type: 'spring', stiffness: 320, damping: 25 },
                scale: { type: 'spring', stiffness: 320, damping: 25 },
                x: { type: 'spring', stiffness: 320, damping: 25 },
                opacity: { duration: 0.25 },
                zIndex: { duration: 0.1 },
                y: isClone ? { duration: 0 } : { repeat: Infinity, duration: 4.6, ease: 'easeInOut', delay: 0.6 }
              }}
              onClick={() => handleSelectHeroCard('feynman')}
              style={{ transformOrigin: 'bottom center' }}
              className={`absolute right-0 xs:right-1 top-3.5 w-[185px] xs:w-[200px] aspect-[4/5] rounded-2xl border ${
                mobileHeroCard === 'feynman'
                  ? 'border-cyan-400/80 shadow-[0_20px_50px_rgba(6,182,212,0.25)] ring-1 ring-cyan-400/30 p-2'
                  : 'border-[#dfdbcf] shadow-md p-1.5'
              } bg-gradient-to-b from-white via-[#faf8f3] to-white cursor-pointer transition-colors duration-200`}
            >
              <div className="relative rounded-xl overflow-hidden w-full h-full bg-slate-950 border border-white/10">
                <picture className="contents">
                  <source
                    type="image/webp"
                    srcSet={rightCardMedia?.mobile_url || rightCardMedia?.desktop_url || '/rupan-right.webp'}
                  />
                  <img
                    src={rightCardMedia?.mobile_url || rightCardMedia?.desktop_url || '/rupan-right.webp'}
                    alt={rightCardMedia?.alt_text || 'Rupan Sir — NITian & Physics Mentor'}
                    className="w-full h-full object-cover filter contrast-[1.02]"
                    style={{ objectPosition: rightCardMedia?.object_position || '50% 24%' }}
                    onError={(e) => handleImageFallback(e, '/rupan-right.webp')}
                  />
                </picture>
              </div>
            </motion.div>

          </div>

          {/* Mini Stat Ticker below the Triad Deck (Harmonized with Slide 2) */}
          <div className="mt-3 w-full max-w-[340px] xs:max-w-[370px] mx-auto select-none">
            <div className="flex items-center justify-between py-2 px-2.5 xs:px-3 rounded-xl bg-white border border-[#dfdbcf] shadow-2xs">
              <div className="flex items-center gap-1 whitespace-nowrap shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <span className="text-[11px] xs:text-xs font-black text-[#1c1c1c] whitespace-nowrap">500+</span>
                <span className="text-[9px] xs:text-[10px] text-[#5f5f5d] font-medium whitespace-nowrap">Students</span>
              </div>
              
              <div className="w-px h-3 bg-[#dfdbcf] shrink-0" aria-hidden="true" />

              <div className="flex items-center gap-1 whitespace-nowrap shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                <span className="text-[11px] xs:text-xs font-black text-[#1c1c1c] whitespace-nowrap">100%</span>
                <span className="text-[9px] xs:text-[10px] text-[#5f5f5d] font-medium whitespace-nowrap">Concept Focus</span>
              </div>

              <div className="w-px h-3 bg-[#dfdbcf] shrink-0" aria-hidden="true" />

              <div className="flex items-center gap-1 whitespace-nowrap shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-[11px] xs:text-xs font-black text-[#1c1c1c] whitespace-nowrap">24/7</span>
                <span className="text-[9px] xs:text-[10px] text-[#5f5f5d] font-medium whitespace-nowrap">Doubt Desk</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
