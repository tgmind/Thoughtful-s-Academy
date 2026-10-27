import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  BookOpen, LogIn, ArrowRight, Sparkles, Video, MessageSquare, Award, Zap
} from 'lucide-react'
import GravitonBrandText from '../shared/GravitonBrandText'
import { useLandingMedia } from '../../hooks/useLandingMedia'
import { handleImageFallback } from '../../utils/imageOptimizer'

const CONTAINER = 'max-w-[1440px] 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12'

export default function GravitonHeroDesktop({
  instituteName,
  heroActiveCard,
  activeDesktopCard,
  heroDeckItems,
  handleSelectHeroCard,
  handleDeckActivity,
  handleDeckMouseLeave,
  isClone = false,
  onCtaHoverStart,
  onCtaHoverEnd,
  onCardHoverStart = () => {},
  onCardHoverEnd = () => {},
}) {
  const { getSlot } = useLandingMedia()
  const leftCardMedia = getSlot('hero_card_left')
  const centerCardMedia = getSlot('hero_card_center')
  const rightCardMedia = getSlot('hero_card_right')

  return (
    <div className="w-full relative" aria-hidden={isClone ? true : undefined}>
      <div className={`${CONTAINER} relative z-10 grid lg:grid-cols-12 gap-8 lg:gap-8 xl:gap-12 items-center`}>
        
        {/* LEFT: Editorial Headline & Actions */}
        <div className="lg:col-span-6 text-center lg:text-left space-y-4 sm:space-y-6">
          
          {/* Top Pill Tag - Refined, single-line responsive pill */}
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
          <div className="space-y-2 sm:space-y-3">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-[#1c1c1c] tracking-[-0.03em] leading-[1.1]">
              <span className="block">
                <GravitonBrandText name={instituteName} variant="hero" />
              </span>
              <span className="block text-xl sm:text-3xl lg:text-4xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[#1c1c1c] via-[#2d2d2d] to-[#454545] mt-1 sm:mt-2 font-serif italic">
                Empowering Concepts. Building Toppers.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base lg:text-[15px] xl:text-[16px] text-[#5f5f5d] font-normal leading-relaxed max-w-xl mx-auto lg:mx-0">
              Expert Physics mentoring for Classes 9–12, with focused preparation for JEE, NEET, and board examinations. Master complex concepts through clear explanations, structured learning, problem-solving techniques, and interactive sessions, supported by regular practice and dedicated doubt resolution.
            </p>
          </div>

          {/* CTAs - Proportionate Widths Ensuring Text & Icons Have Generous Breathing Room */}
          <div
            className="grid grid-cols-1 sm:grid-cols-[1.35fr_0.8fr_1.1fr] gap-2.5 sm:gap-3 pt-1 max-w-xl lg:max-w-2xl mx-auto lg:mx-0 w-full"
            onMouseEnter={onCtaHoverStart}
            onMouseLeave={onCtaHoverEnd}
            onFocusCapture={onCtaHoverStart}
            onBlurCapture={onCtaHoverEnd}
          >
            <Link
              to="/batch-details"
              onMouseEnter={onCtaHoverStart}
              onMouseLeave={onCtaHoverEnd}
              className="w-full h-11 sm:h-12 inline-flex items-center justify-center gap-2 px-4 sm:px-5 rounded-xl bg-[#1c1c1c] hover:bg-[#2c2c2c] text-[#fcfbf8] font-semibold text-xs sm:text-sm whitespace-nowrap transition-all duration-150 border border-[#1c1c1c] shadow-[inset_0px_0.5px_0px_rgba(255,255,255,0.25),inset_0px_0px_0px_0.5px_rgba(0,0,0,0.2),0px_4px_12px_rgba(0,0,0,0.12)] active:scale-[0.98] group"
            >
              <BookOpen className="w-4 h-4 text-white shrink-0 group-hover:scale-105 transition-transform" />
              <span>Explore All Batches</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#fcfbf8]/60 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              to="/login"
              onMouseEnter={onCtaHoverStart}
              onMouseLeave={onCtaHoverEnd}
              className="w-full h-11 sm:h-12 inline-flex items-center justify-center gap-2 px-3 sm:px-4 rounded-xl bg-white hover:bg-[#f7f4ed] text-[#1c1c1c] font-semibold text-xs sm:text-sm whitespace-nowrap border border-[#d8d3c5] hover:border-[#1c1c1c] transition-all duration-150 shadow-2xs active:scale-[0.98] group"
            >
              <LogIn className="w-4 h-4 text-[#5f5f5d] shrink-0 group-hover:translate-x-0.5 transition-transform" />
              <span>Login</span>
            </Link>

            <Link
              to="/register"
              onMouseEnter={onCtaHoverStart}
              onMouseLeave={onCtaHoverEnd}
              className="w-full h-11 sm:h-12 inline-flex items-center justify-center gap-2 px-3.5 sm:px-4.5 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50/50 to-emerald-50 hover:from-emerald-100/90 hover:to-teal-100/80 text-emerald-950 font-semibold text-xs sm:text-sm whitespace-nowrap border border-emerald-200/90 hover:border-emerald-300 transition-all duration-150 shadow-[inset_0px_0.5px_0px_rgba(255,255,255,0.75),0_1px_2px_rgba(16,185,129,0.06)] active:scale-[0.98] group"
            >
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 group-hover:scale-110 group-hover:rotate-6 transition-all duration-200" />
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

        {/* RIGHT: Modern High-Craft 3-Card Physics Triad */}
        <div className="lg:col-span-6 flex flex-col items-center lg:items-end justify-center">
          
          <div 
            className="relative w-full max-w-[550px] lg:max-w-[600px] xl:max-w-[650px] group/deck"
            onMouseMove={handleDeckActivity}
            onPointerDown={handleDeckActivity}
          >
            {/* Multi-spectral ambient glow aura */}
            <div className="absolute -inset-6 bg-gradient-to-tr from-amber-500/10 via-sky-400/15 to-indigo-500/15 rounded-3xl blur-3xl opacity-75 pointer-events-none" />

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

            {/* 3-Card Symmetrical Fanned Gallery Stage */}
            <div 
              onMouseEnter={onCardHoverStart}
              onMouseLeave={(e) => {
                handleDeckMouseLeave(e)
                onCardHoverEnd()
              }}
              className="relative h-[340px] lg:h-[360px] flex items-center justify-center select-none pt-2"
            >
              
              {/* CARD 1: RUPAN SIR CONVOCATION (LEFT) */}
              <motion.div
                initial={{ opacity: 0, x: -35, y: 30, rotate: -10 }}
                animate={{ 
                  opacity: 1, 
                  x: 0, 
                  y: isClone ? 0 : [0, -6, 0], 
                  rotate: activeDesktopCard === 'einstein' ? 0 : -6,
                  scale: activeDesktopCard === 'einstein' ? 1.04 : 1,
                  zIndex: activeDesktopCard === 'einstein' ? 30 : 10,
                }}
                transition={{ 
                  opacity: { duration: 0.6, ease: 'easeOut' },
                  x: { duration: 0.6, ease: 'easeOut' },
                  rotate: { type: 'spring', stiffness: 350, damping: 25 },
                  scale: { type: 'spring', stiffness: 350, damping: 25 },
                  y: isClone ? { duration: 0 } : { repeat: Infinity, duration: 4.8, ease: 'easeInOut' }
                }}
                whileHover={{ 
                  scale: 1.06, 
                  rotate: 0, 
                  zIndex: 35, 
                  y: -10,
                  transition: { type: 'spring', stiffness: 350, damping: 22 }
                }}
                onMouseEnter={onCardHoverStart}
                onMouseLeave={onCardHoverEnd}
                onClick={() => handleSelectHeroCard('einstein')}
                className={`absolute left-0 lg:left-2 top-4 lg:top-5 w-[205px] lg:w-[220px] aspect-[4/5] rounded-3xl border ${
                  activeDesktopCard === 'einstein' 
                    ? 'border-amber-400/80 shadow-[0_20px_50px_rgba(245,158,11,0.25)] ring-2 ring-amber-400/30' 
                    : 'border-[#dfdbcf] shadow-[0_16px_40px_rgba(28,28,28,0.12),0_2px_6px_rgba(0,0,0,0.04)]'
                } bg-gradient-to-b from-white via-[#faf8f3] to-white p-2.5 transition-colors duration-300 cursor-pointer`}
                style={{ transformOrigin: 'bottom center' }}
              >
                <div className="relative rounded-2xl overflow-hidden w-full h-full bg-slate-950 border border-white/10 group/einstein">
                  <picture className="contents">
                    <source
                      type="image/webp"
                      srcSet={leftCardMedia?.desktop_url || '/rupan-left.webp'}
                    />
                    <img
                      src={leftCardMedia?.desktop_url || '/rupan-left.png'}
                      alt={leftCardMedia?.alt_text || 'Rupan Sir — Gold Medalist, 1st Convocation MBBU'}
                      loading="eager"
                      fetchpriority="high"
                      className="w-full h-full object-cover filter contrast-[1.02] transition-transform duration-700 group-hover/einstein:scale-105"
                      style={{ objectPosition: leftCardMedia?.object_position || '50% 28%' }}
                      onError={(e) => handleImageFallback(e, '/rupan-left.webp')}
                    />
                  </picture>
                </div>
              </motion.div>

              {/* CARD 3: RUPAN SIR GRAVITON PHYSICS (RIGHT) */}
              <motion.div
                initial={{ opacity: 0, x: 35, y: 30, rotate: 10 }}
                animate={{ 
                  opacity: 1, 
                  x: 0, 
                  y: isClone ? 0 : [0, -6, 0], 
                  rotate: activeDesktopCard === 'feynman' ? 0 : 6,
                  scale: activeDesktopCard === 'feynman' ? 1.04 : 1,
                  zIndex: activeDesktopCard === 'feynman' ? 30 : 10,
                }}
                transition={{ 
                  opacity: { duration: 0.6, ease: 'easeOut', delay: 0.15 },
                  x: { duration: 0.6, ease: 'easeOut', delay: 0.15 },
                  rotate: { type: 'spring', stiffness: 350, damping: 25 },
                  scale: { type: 'spring', stiffness: 350, damping: 25 },
                  y: isClone ? { duration: 0 } : { repeat: Infinity, duration: 4.6, ease: 'easeInOut', delay: 0.6 }
                }}
                whileHover={{ 
                  scale: 1.06, 
                  rotate: 0, 
                  zIndex: 35, 
                  y: -10,
                  transition: { type: 'spring', stiffness: 350, damping: 22 }
                }}
                onMouseEnter={onCardHoverStart}
                onMouseLeave={onCardHoverEnd}
                onClick={() => handleSelectHeroCard('feynman')}
                className={`absolute right-0 lg:right-2 top-4 lg:top-5 w-[205px] lg:w-[220px] aspect-[4/5] rounded-3xl border ${
                  activeDesktopCard === 'feynman' 
                    ? 'border-cyan-400/80 shadow-[0_20px_50px_rgba(6,182,212,0.25)] ring-2 ring-cyan-400/30' 
                    : 'border-[#dfdbcf] shadow-[0_16px_40px_rgba(28,28,28,0.12),0_2px_6px_rgba(0,0,0,0.04)]'
                } bg-gradient-to-b from-white via-[#faf8f3] to-white p-2.5 transition-colors duration-300 cursor-pointer`}
                style={{ transformOrigin: 'bottom center' }}
              >
                <div className="relative rounded-2xl overflow-hidden w-full h-full bg-slate-950 border border-white/10 group/feynman">
                  <picture className="contents">
                    <source
                      type="image/webp"
                      srcSet={rightCardMedia?.desktop_url || '/rupan-right.webp'}
                    />
                    <img
                      src={rightCardMedia?.desktop_url || '/rupan-right.png'}
                      alt={rightCardMedia?.alt_text || 'Rupan Sir — NITian & Physics Mentor'}
                      loading="eager"
                      fetchpriority="high"
                      className="w-full h-full object-cover filter contrast-[1.02] transition-transform duration-700 group-hover/feynman:scale-105"
                      style={{ objectPosition: rightCardMedia?.object_position || '50% 24%' }}
                      onError={(e) => handleImageFallback(e, '/rupan-right.webp')}
                    />
                  </picture>
                </div>
              </motion.div>

              {/* CARD 2: GRAVITON ACADEMY EMBLEM */}
              <motion.div
                initial={{ opacity: 0, y: -25, scale: 0.95 }}
                animate={{ 
                  opacity: 1, 
                  y: isClone ? 0 : [0, -8, 0], 
                  rotate: 0,
                  scale: activeDesktopCard === 'graviton' ? 1.04 : 1,
                  zIndex: activeDesktopCard === 'graviton' ? 30 : 20,
                }}
                transition={{ 
                  opacity: { duration: 0.6, ease: 'easeOut', delay: 0.25 },
                  scale: { type: 'spring', stiffness: 350, damping: 25 },
                  rotate: { type: 'spring', stiffness: 350, damping: 25 },
                  y: isClone ? { duration: 0 } : { repeat: Infinity, duration: 5.4, ease: 'easeInOut', delay: 0.3 }
                }}
                whileHover={{ 
                  scale: 1.07, 
                  zIndex: 35, 
                  y: -12,
                  transition: { type: 'spring', stiffness: 350, damping: 22 }
                }}
                onMouseEnter={onCardHoverStart}
                onMouseLeave={onCardHoverEnd}
                onClick={() => handleSelectHeroCard('graviton')}
                className={`relative z-20 w-[205px] lg:w-[220px] aspect-[4/5] rounded-3xl border ${
                  activeDesktopCard === 'graviton'
                    ? 'border-amber-400/80 shadow-[0_25px_60px_rgba(28,28,28,0.22),0_4px_16px_rgba(0,0,0,0.08)] ring-2 ring-amber-400/40'
                    : 'border-[#dfdbcf] shadow-[0_20px_50px_rgba(28,28,28,0.16),0_4px_16px_rgba(0,0,0,0.08)] ring-1 ring-amber-400/20'
                } bg-gradient-to-b from-white via-[#faf8f3] to-white p-2.5 transition-colors duration-300 cursor-pointer`}
                style={{ transformOrigin: 'center center' }}
              >
                <div className="relative rounded-2xl overflow-hidden w-full h-full bg-[#000000] border border-white/10 flex items-center justify-center group/logo">
                  
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(56,189,248,0.18)_0%,rgba(99,102,241,0.08)_40%,transparent_70%)] pointer-events-none" />
                  <div 
                    className="absolute inset-0 opacity-[0.06] pointer-events-none"
                    style={{
                      backgroundImage: 'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)',
                      backgroundSize: '20px 20px',
                    }}
                  />

                  <img
                    src={centerCardMedia?.desktop_url || '/mainlogo.jpg'}
                    alt={centerCardMedia?.alt_text || `${instituteName} Logo`}
                    className="w-full h-full object-contain p-2.5 transition-transform duration-700 group-hover/logo:scale-[1.04]"
                    style={{ objectPosition: centerCardMedia?.object_position || 'center center' }}
                    onError={(e) => handleImageFallback(e, '/mainlogo.jpg')}
                  />
                  
                  <div className="absolute top-2 left-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-white text-[9.5px] font-semibold shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Admissions Open</span>
                  </div>

                  <div className="absolute top-2 right-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#fcfbf8]/95 backdrop-blur-md border border-[#dfdbcf] text-[#1c1c1c] text-[9.5px] font-bold shadow-xs">
                    <Sparkles className="w-2.5 h-2.5 text-amber-500 fill-amber-400" />
                    <span>Premier</span>
                  </div>

                  <div className="absolute inset-x-2 bottom-2 p-2 rounded-xl bg-black/80 backdrop-blur-md border border-white/15 text-white flex items-center justify-between shadow-lg">
                    <div className="min-w-0 pr-1.5">
                      <div className="flex items-center gap-1">
                        <Award className="w-3 h-3 text-amber-400 shrink-0" />
                        <p className="text-[11px] font-bold text-white tracking-tight leading-tight truncate">{instituteName}</p>
                      </div>
                      <p className="text-[8.5px] text-white/70 leading-none mt-0.5 truncate">Class 9–12 • JEE &amp; NEET</p>
                    </div>
                    <Link
                      to="/batch-details"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white hover:bg-[#f7f4ed] text-[#1c1c1c] border border-white/40 font-bold text-[9px] transition-all shrink-0 shadow-xs active:scale-[0.98] group/btn"
                    >
                      <span>Batches</span>
                      <ArrowRight className="w-2.5 h-2.5 text-[#1c1c1c]/70 group-hover/btn:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>
              </motion.div>

            </div>
          </div>

          {/* Mini Stat Ticker below the Triad Deck */}
          <div className="mt-3 sm:mt-4 grid grid-cols-3 gap-1.5 sm:gap-2 px-0.5 w-full max-w-[320px] sm:max-w-[360px] mx-auto">
            <div className="text-center p-2 rounded-xl bg-[#f7f4ed] border border-[#dfdbcf] shadow-2xs">
              <p className="text-xs sm:text-sm font-extrabold text-[#1c1c1c] leading-none">500+</p>
              <p className="text-[9px] sm:text-[10px] text-[#5f5f5d] mt-1 font-medium leading-tight">Students</p>
            </div>
            <div className="text-center p-2 rounded-xl bg-[#f7f4ed] border border-[#dfdbcf] shadow-2xs">
              <p className="text-xs sm:text-sm font-extrabold text-[#1c1c1c] leading-none">100%</p>
              <p className="text-[9px] sm:text-[10px] text-[#5f5f5d] mt-1 font-medium leading-tight">Concept Focus</p>
            </div>
            <div className="text-center p-2 rounded-xl bg-[#f7f4ed] border border-[#dfdbcf] shadow-2xs">
              <p className="text-xs sm:text-sm font-extrabold text-[#1c1c1c] leading-none">24/7</p>
              <p className="text-[9px] sm:text-[10px] text-[#5f5f5d] mt-1 font-medium leading-tight">Doubt Desk</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
