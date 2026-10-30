import { Link } from 'react-router-dom'
import {
  BookOpen, LogIn, ArrowRight, Sparkles, Atom, Compass, Award, GraduationCap
} from 'lucide-react'
import { useLandingMedia } from '../../hooks/useLandingMedia'
import { handleImageFallback } from '../../utils/imageOptimizer'

const CONTAINER = 'max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8'

export default function PersonalHeroMobile() {
  const { getSlot } = useLandingMedia()
  const mentorMedia = getSlot('mentor_slide_hero')

  return (
    <div className="w-full relative">
      <div className={`${CONTAINER} relative z-10 flex flex-col gap-6 sm:gap-8 items-center`}>
        
        {/* Editorial Headline & Actions (Fully Blended with Website UI) */}
        <div className="w-full text-center space-y-4 sm:space-y-5">
          
          {/* Top Pill Tag */}
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full border border-amber-200/80 bg-gradient-to-r from-amber-50/70 via-white to-amber-50/50 backdrop-blur-sm text-[11px] sm:text-xs text-[#1c1c1c] shadow-xs max-w-full">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
            <span className="font-semibold tracking-tight text-amber-950">Academic Vision</span>
            <span className="text-amber-300">·</span>
            <span className="text-amber-900 font-bold whitespace-nowrap">Lead Physics Mentor</span>
          </div>

          {/* Display Headline with Teacher Name Prominently Highlighted */}
          <div className="space-y-2.5 sm:space-y-3">
            <h1 className="text-2xl sm:text-4xl font-extrabold text-[#1c1c1c] tracking-[-0.03em] leading-[1.15]">
              <span className="block text-xs sm:text-sm font-bold text-[#5f5f5d] uppercase tracking-wider mb-1">
                Meet Your Mentor
              </span>
              <span className="block mt-0.5">
                <span className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-amber-700 to-amber-950 font-black text-3xl sm:text-4xl">
                  Rupan Sir
                </span>
              </span>
              <span className="block text-base sm:text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[#1c1c1c] via-[#2d2d2d] to-[#454545] mt-1 font-serif italic tracking-tight">
                Simplifying Physics. Shaping Future Achievers.
              </span>
            </h1>

            {/* High-Impact Academic Distinctions: NITian & Gold Medalist (Selling Tags) */}
            <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto pt-1">
              {/* Distinction Card 1: NITian */}
              <div className="flex items-center gap-2 p-2 rounded-xl bg-gradient-to-br from-amber-500/10 via-amber-50/50 to-white border-2 border-amber-300/80 shadow-2xs">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 text-white flex items-center justify-center shrink-0 shadow-2xs ring-1 ring-amber-300/50">
                  <GraduationCap className="w-4 h-4 text-white" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-amber-800/80 leading-none">Alumnus</p>
                  <p className="text-sm font-black text-[#1c1c1c] leading-tight">NITian</p>
                </div>
              </div>

              {/* Distinction Card 2: Gold Medalist */}
              <div className="flex items-center gap-2 p-2 rounded-xl bg-gradient-to-br from-amber-500/15 via-yellow-50/60 to-white border-2 border-amber-400/90 shadow-2xs">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-white flex items-center justify-center shrink-0 shadow-2xs ring-1 ring-yellow-300/60">
                  <Award className="w-4 h-4 text-white" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-amber-800/80 leading-none">Top Rank</p>
                  <p className="text-sm font-black text-amber-950 leading-tight">Gold Medalist</p>
                </div>
              </div>
            </div>

            {/* Academic Pedigree & Experience - Styled Hierarchical Typography */}
            <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-xs text-[#5f5f5d] pt-1">
              <span className="inline-flex items-center gap-1 font-semibold text-[#1c1c1c]">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <span className="text-amber-950 font-bold">Postgraduate (PG)</span>
                <span className="text-[#5f5f5d] font-normal">Physics</span>
              </span>
              <span className="text-[#d8d3c5] select-none">·</span>
              <span className="inline-flex items-center gap-1 font-semibold text-[#1c1c1c]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-emerald-950 font-bold">6+ Years</span>
                <span className="text-[#5f5f5d] font-normal">Teaching Exp.</span>
              </span>
            </div>
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
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/60 flex items-center justify-center shrink-0">
                <Atom className="w-3.5 h-3.5 text-indigo-600" />
              </div>
              <div>
                <p className="text-[11px] sm:text-xs font-semibold text-[#1c1c1c] leading-tight">First Principles</p>
                <p className="text-[10px] text-[#5f5f5d] leading-none hidden sm:block mt-0.5">Core Physics</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center sm:items-center text-center sm:text-left gap-1 sm:gap-2.5 p-2 sm:px-3 sm:py-2.5 rounded-xl bg-white/80 border border-[#e2ddd1] backdrop-blur-2xs shadow-2xs hover:border-[#1c1c1c]/30 transition-colors">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center justify-center shrink-0">
                <Compass className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div>
                <p className="text-[11px] sm:text-xs font-semibold text-[#1c1c1c] leading-tight">1-on-1 Doubt</p>
                <p className="text-[10px] text-[#5f5f5d] leading-none hidden sm:block mt-0.5">Personal Desk</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center sm:items-center text-center sm:text-left gap-1 sm:gap-2.5 p-2 sm:px-3 sm:py-2.5 rounded-xl bg-white/80 border border-[#e2ddd1] backdrop-blur-2xs shadow-2xs hover:border-[#1c1c1c]/30 transition-colors">
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center justify-center shrink-0">
                <Award className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div>
                <p className="text-[11px] sm:text-xs font-semibold text-[#1c1c1c] leading-tight">DPPs &amp; Notes</p>
                <p className="text-[10px] text-[#5f5f5d] leading-none hidden sm:block mt-0.5">Curated Sheets</p>
              </div>
            </div>
          </div>
        </div>

        {/* MOBILE VISUAL STAGING AREA (Class 8-12 CBSE Physics Native Graphic Artwork) */}
        <div className="w-full max-w-[340px] xs:max-w-[370px] mx-auto select-none">
          <div className="relative h-[295px] xs:h-[315px] flex items-end justify-center select-none pt-2">
            
            {/* Native Vector Graphic: Class 8-12 CBSE Physics Canvas */}
            <svg
              viewBox="0 0 350 310"
              className="absolute inset-0 w-full h-full pointer-events-none z-0"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="vibgyorSpectrumMobile" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
                  <stop offset="20%" stopColor="#f97316" stopOpacity="0.75" />
                  <stop offset="40%" stopColor="#eab308" stopOpacity="0.7" />
                  <stop offset="60%" stopColor="#10b981" stopOpacity="0.65" />
                  <stop offset="80%" stopColor="#06b6d4" stopOpacity="0.65" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.75" />
                </linearGradient>

                <linearGradient id="prismGlassMobile" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.75" />
                  <stop offset="50%" stopColor="#f0fdf4" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#e0f2fe" stopOpacity="0.6" />
                </linearGradient>

                <linearGradient id="waveHorizonFadeMobile" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                  <stop offset="60%" stopColor="#ffffff" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
                <mask id="nativeWaveMaskMobile">
                  <rect x="0" y="0" width="350" height="70" fill="url(#waveHorizonFadeMobile)" />
                </mask>
              </defs>

              {/* 1. Glass Prism & Rainbow Spectrum (Class 10 Optics) */}
              <g className="opacity-80">
                <line x1="0" y1="160" x2="35" y2="150" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
                <polygon
                  points="35,185 65,115 95,185"
                  fill="url(#prismGlassMobile)"
                  stroke="#94a3b8"
                  strokeWidth="1"
                />
                {/* Dispersed Beam */}
                <path
                  d="M 80 150 Q 180 100 350 135 L 350 185 Q 180 145 85 170 Z"
                  fill="url(#vibgyorSpectrumMobile)"
                  opacity="0.35"
                />
              </g>

              {/* 2. Bohr Atomic Shells (Class 9 & 11) */}
              <g className="opacity-65">
                <ellipse cx="200" cy="150" rx="55" ry="105" transform="rotate(-15 200 150)" fill="none" stroke="#d97706" strokeWidth="0.9" strokeDasharray="3 4" />
                <ellipse cx="200" cy="150" rx="90" ry="145" transform="rotate(30 200 150)" fill="none" stroke="#0284c7" strokeWidth="1" strokeDasharray="3 5" />
                <circle cx="240" cy="115" r="2.5" fill="#f59e0b" />
                <circle cx="130" cy="90" r="2" fill="#0284c7" />
              </g>

              {/* 3. CBSE Formula Watermarks */}
              <g className="select-none pointer-events-none">
                <text x="15" y="35" className="font-serif italic text-[10px] fill-[#1c1c1c]/35 font-bold">F = m·a</text>
                <text x="260" y="32" className="font-mono text-[9px] fill-[#1c1c1c]/35 font-semibold">V = I·R</text>
                <text x="20" y="240" className="font-serif italic text-[9px] fill-[#1c1c1c]/35 font-semibold">1/f = 1/v - 1/u</text>
                <text x="250" y="245" className="font-mono text-[9px] fill-[#1c1c1c]/35 font-semibold">E = h·ν</text>
              </g>

              {/* 4. Interference Wave Baseline */}
              <g className="opacity-75">
                <path
                  d="M 0 250 Q 90 225 180 245 T 350 240 L 350 310 L 0 310 Z"
                  fill="url(#vibgyorSpectrumMobile)"
                  mask="url(#nativeWaveMaskMobile)"
                  opacity="0.35"
                />
              </g>
            </svg>

            {/* Native Callout 1: Ray Optics & Dispersion (Top Left) */}
            <div className="absolute top-2 left-0 z-20 flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/80 backdrop-blur-md border border-[#dfdbcf] shadow-2xs text-[#1c1c1c]">
              <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-red-500 via-amber-400 to-cyan-500" />
              <span className="text-[9px] font-bold">Optics &amp; Dispersion</span>
              <span className="text-[8px] font-mono font-bold text-amber-800 bg-amber-50 px-0.5 rounded">n = c/v</span>
            </div>

            {/* Native Callout 2: Bohr Model (Top Right) */}
            <div className="absolute top-2 right-0 z-20 flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/80 backdrop-blur-md border border-[#dfdbcf] shadow-2xs text-[#1c1c1c]">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
              <span className="text-[9px] font-bold">Bohr Atom: E = hν</span>
            </div>

            {/* Cutout Portrait with Feathered Waist */}
            <div
              className="relative z-10 w-full flex items-end justify-center select-none"
              style={{
                maskImage: 'linear-gradient(to bottom, black 65%, rgba(0,0,0,0.6) 82%, rgba(0,0,0,0.15) 94%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, black 65%, rgba(0,0,0,0.6) 82%, rgba(0,0,0,0.15) 94%, transparent 100%)',
              }}
            >
              <picture className="contents">
                <source
                  type="image/webp"
                  srcSet={mentorMedia?.mobile_url || mentorMedia?.desktop_url || '/rupan.webp'}
                />
                <img
                  src={mentorMedia?.mobile_url || mentorMedia?.desktop_url || '/rupan.webp'}
                  alt={mentorMedia?.alt_text || 'GRAViTON PHYSICS Lead Mentor'}
                  className="max-h-[270px] xs:max-h-[290px] w-auto object-contain select-none"
                  style={{
                    objectPosition: mentorMedia?.object_position || 'center bottom',
                    filter: 'drop-shadow(0 10px 20px rgba(28, 28, 28, 0.16)) drop-shadow(0 0 15px rgba(245, 158, 11, 0.16))',
                  }}
                  onError={(e) => handleImageFallback(e, '/rupan.webp')}
                />
              </picture>
            </div>

            {/* Floating Elite Mentor Card (Rendered ON FRONT of the Hero Image as an Overlay with Solid Pure White Background) */}
            <div className="absolute bottom-8 right-0 z-30 flex items-center gap-2 px-3 py-2 rounded-xl bg-white border-2 border-amber-400 shadow-[0_12px_28px_-4px_rgba(217,119,6,0.25),0_4px_12px_rgba(0,0,0,0.10)] select-none">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 text-white flex items-center justify-center shrink-0 shadow-xs ring-1 ring-amber-300/60">
                <Award className="w-4 h-4 text-white" />
              </div>
              <div className="text-left whitespace-nowrap">
                <div className="flex items-center gap-1">
                  <p className="text-xs font-black text-[#1c1c1c] leading-tight whitespace-nowrap">
                    Rupan Sir
                  </p>
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)] shrink-0" />
                </div>
                <p className="text-[10px] font-black text-amber-900 leading-tight mt-0.5 flex items-center gap-0.5 whitespace-nowrap">
                  <span className="text-amber-600 font-bold">★</span> NITian, Goldmedalist
                </p>
              </div>
            </div>

            {/* Natural ground shadow */}
            <div className="absolute inset-x-8 bottom-0 h-5 bg-gradient-to-r from-transparent via-black/20 to-transparent rounded-full blur-md pointer-events-none" />
          </div>

          {/* Integrated Editorial Metrics Strip (Non-breaking, Precision Dividers) */}
          <div className="mt-3 w-full max-w-[340px] xs:max-w-[370px] mx-auto select-none">
            <div className="flex items-center justify-between py-2 px-2.5 xs:px-3 rounded-xl bg-white border border-[#dfdbcf] shadow-2xs">
              <div className="flex items-center gap-1 whitespace-nowrap shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <span className="text-[11px] xs:text-xs font-black text-[#1c1c1c] whitespace-nowrap">6+ Years</span>
                <span className="text-[9px] xs:text-[10px] text-[#5f5f5d] font-medium whitespace-nowrap">Exp.</span>
              </div>
              
              <div className="w-px h-3 bg-[#dfdbcf] shrink-0" aria-hidden="true" />

              <div className="flex items-center gap-1 whitespace-nowrap shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                <span className="text-[11px] xs:text-xs font-black text-[#1c1c1c] whitespace-nowrap">1-on-1</span>
                <span className="text-[9px] xs:text-[10px] text-[#5f5f5d] font-medium whitespace-nowrap">Doubt</span>
              </div>

              <div className="w-px h-3 bg-[#dfdbcf] shrink-0" aria-hidden="true" />

              <div className="flex items-center gap-1 whitespace-nowrap shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-[11px] xs:text-xs font-black text-[#1c1c1c] whitespace-nowrap">Classes 9–12</span>
                <span className="text-[9px] xs:text-[10px] text-[#5f5f5d] font-medium whitespace-nowrap">JEE · NEET</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
