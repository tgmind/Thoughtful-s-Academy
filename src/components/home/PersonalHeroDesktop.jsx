import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  BookOpen, LogIn, ArrowRight, Sparkles, Atom, Compass, Award, GraduationCap, Clock
} from 'lucide-react'

const CONTAINER = 'max-w-[1440px] 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12'

export default function PersonalHeroDesktop({
  onCtaHoverStart,
  onCtaHoverEnd,
} = {}) {
  return (
    <div className="w-full relative">
      <div className={`${CONTAINER} relative z-10 grid lg:grid-cols-12 gap-8 lg:gap-8 xl:gap-12 items-center`}>
        
        {/* LEFT: Editorial Headline & Actions (Blended with Website UI) */}
        <div className="lg:col-span-6 text-center lg:text-left space-y-4 sm:space-y-5">
          
          {/* Top Pill Tag - Matching Slide 1 Architecture */}
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
          <div className="space-y-3 sm:space-y-3.5">
            <h1 className="text-3xl sm:text-4xl lg:text-[44px] xl:text-[48px] font-extrabold text-[#1c1c1c] tracking-[-0.03em] leading-[1.12]">
              <span className="block text-lg sm:text-xl lg:text-2xl text-[#5f5f5d] font-semibold tracking-normal">
                Meet Your Mentor
              </span>
              <span className="block mt-0.5 sm:mt-1">
                <span className="relative inline-block text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-amber-700 to-amber-950 drop-shadow-xs font-black text-4xl sm:text-5xl lg:text-[54px] xl:text-[58px] tracking-tight">
                  Rupan Sir
                </span>
              </span>
              <span className="block text-lg sm:text-2xl lg:text-[23px] font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[#1c1c1c] via-[#2d2d2d] to-[#454545] mt-1 sm:mt-1.5 font-serif italic tracking-tight">
                Simplifying Physics. Shaping Future Achievers.
              </span>
            </h1>

            {/* High-Impact Academic Distinctions: NITian & Gold Medalist (Selling Tags) */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 max-w-lg mx-auto lg:mx-0 pt-1">
              {/* Distinction Card 1: NITian */}
              <div className="relative overflow-hidden flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-50/60 to-white border-2 border-amber-300/80 shadow-[0_4px_16px_rgba(245,158,11,0.12)] hover:border-amber-400 transition-all">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 text-white flex items-center justify-center shrink-0 shadow-sm ring-2 ring-amber-300/50">
                  <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-800/80 leading-none">
                    Prestigious Alumnus
                  </p>
                  <p className="text-base sm:text-lg font-black text-[#1c1c1c] tracking-tight leading-tight mt-0.5">
                    NITian
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-[#5f5f5d] font-medium leading-none mt-0.5 truncate">
                    National Inst. of Tech
                  </p>
                </div>
              </div>

              {/* Distinction Card 2: Gold Medalist */}
              <div className="relative overflow-hidden flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-2xl bg-gradient-to-br from-amber-500/15 via-yellow-50/70 to-white border-2 border-amber-400/90 shadow-[0_4px_16px_rgba(245,158,11,0.16)] hover:border-amber-500 transition-all">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-white flex items-center justify-center shrink-0 shadow-sm ring-2 ring-yellow-300/60">
                  <Award className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-800/80 leading-none">
                    Academic Honor
                  </p>
                  <p className="text-base sm:text-lg font-black text-amber-950 tracking-tight leading-tight mt-0.5">
                    Gold Medalist
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-[#5f5f5d] font-medium leading-none mt-0.5 truncate">
                    Top University Rank
                  </p>
                </div>
              </div>
            </div>

            {/* Academic Pedigree & Experience - Styled Hierarchical Typography */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-3.5 gap-y-1.5 text-xs sm:text-[13.5px] pt-1">
              <div className="inline-flex items-center gap-1.5 font-semibold text-[#1c1c1c]">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <span className="text-amber-950 font-bold">Postgraduate (PG)</span>
                <span className="text-[#5f5f5d] font-normal">in Physics</span>
              </div>
              <span className="text-[#d8d3c5] select-none hidden sm:inline">·</span>
              <div className="inline-flex items-center gap-1.5 font-semibold text-[#1c1c1c]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-emerald-950 font-bold">6+ Years</span>
                <span className="text-[#5f5f5d] font-normal">Teaching Experience</span>
              </div>
            </div>
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

          {/* Micro-Trust Highlights - Bento Tiles Matching Slide 1 */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-2 max-w-lg mx-auto lg:mx-0">
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

        {/* RIGHT: Pure Native CBSE Physics Graphics (Zero Card Boxiness, Seamlessly Blended) */}
        <div className="lg:col-span-6 flex flex-col items-center lg:items-end justify-center">
          
          <div className="relative w-full max-w-[560px] lg:max-w-[620px] xl:max-w-[660px]">
            
            {/* Visual Staging Area (Native Canvas Art, NO Card Borders) */}
            <div className="relative h-[350px] lg:h-[375px] xl:h-[395px] flex items-end justify-center select-none">
              
              {/* Native Vector Graphic: Class 8-12 CBSE Physics Canvas */}
              <svg
                viewBox="0 0 560 375"
                className="absolute inset-0 w-full h-full pointer-events-none z-0"
                aria-hidden="true"
              >
                <defs>
                  {/* VIBGYOR Rainbow Spectrum Gradient (Prism Light Dispersion - Class 10/12) */}
                  <linearGradient id="vibgyorSpectrum" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
                    <stop offset="18%" stopColor="#f97316" stopOpacity="0.75" />
                    <stop offset="36%" stopColor="#eab308" stopOpacity="0.7" />
                    <stop offset="54%" stopColor="#10b981" stopOpacity="0.65" />
                    <stop offset="72%" stopColor="#06b6d4" stopOpacity="0.65" />
                    <stop offset="88%" stopColor="#3b82f6" stopOpacity="0.7" />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.75" />
                  </linearGradient>

                  {/* Soft Background Dispersion Beam Gradient */}
                  <linearGradient id="dispersionBeam" x1="0%" y1="0%" x2="100%" y2="50%">
                    <stop offset="0%" stopColor="#fef08a" stopOpacity="0.45" />
                    <stop offset="35%" stopColor="#fb923c" stopOpacity="0.30" />
                    <stop offset="70%" stopColor="#38bdf8" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                  </linearGradient>

                  {/* Glass Prism Reflection */}
                  <linearGradient id="prismGlass" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.75" />
                    <stop offset="50%" stopColor="#f0fdf4" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#e0f2fe" stopOpacity="0.6" />
                  </linearGradient>

                  {/* Bohr Atomic Orbit Gradients */}
                  <linearGradient id="bohrOrbitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#d97706" stopOpacity="0.5" />
                    <stop offset="50%" stopColor="#0284c7" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#4338ca" stopOpacity="0.5" />
                  </linearGradient>

                  {/* Organic Wave Horizon Mask */}
                  <linearGradient id="waveHorizonFade" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                    <stop offset="60%" stopColor="#ffffff" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                  </linearGradient>
                  <mask id="nativeWaveMask">
                    <rect x="0" y="0" width="560" height="100" fill="url(#waveHorizonFade)" />
                  </mask>
                </defs>

                {/* 1. OPTICS: Glass Triangular Prism & Light Dispersion (Class 10 & 12 NCERT) */}
                <g className="opacity-80">
                  {/* Incident White Light Ray */}
                  <line x1="0" y1="210" x2="65" y2="195" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="0" y1="210" x2="65" y2="195" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
                  
                  {/* Ray Arrowhead */}
                  <polygon points="35,200 42,201 38,206" fill="#f59e0b" />

                  {/* Triangular Glass Prism (Equilateral) */}
                  <polygon
                    points="65,245 110,150 155,245"
                    fill="url(#prismGlass)"
                    stroke="#94a3b8"
                    strokeWidth="1.2"
                  />
                  {/* Internal Refraction Light Paths */}
                  <line x1="65" y1="195" x2="120" y2="190" stroke="#fde047" strokeWidth="1.5" opacity="0.8" />
                  <line x1="65" y1="195" x2="130" y2="215" stroke="#818cf8" strokeWidth="1.5" opacity="0.8" />

                  {/* Dispersed Multi-Spectral Beam Sweeping Across the Canvas */}
                  <path
                    d="M 125 190 Q 280 130 560 170 L 560 235 Q 280 185 135 220 Z"
                    fill="url(#dispersionBeam)"
                  />
                  {/* VIBGYOR Spectrum Ribbons */}
                  <path d="M 125 190 Q 280 130 560 170" fill="none" stroke="#ef4444" strokeWidth="1.8" opacity="0.75" />
                  <path d="M 127 195 Q 280 138 560 180" fill="none" stroke="#f97316" strokeWidth="1.6" opacity="0.75" />
                  <path d="M 129 200 Q 280 146 560 190" fill="none" stroke="#eab308" strokeWidth="1.6" opacity="0.75" />
                  <path d="M 131 205 Q 280 154 560 200" fill="none" stroke="#10b981" strokeWidth="1.6" opacity="0.75" />
                  <path d="M 133 210 Q 280 162 560 210" fill="none" stroke="#06b6d4" strokeWidth="1.6" opacity="0.75" />
                  <path d="M 135 215 Q 280 170 560 220" fill="none" stroke="#3b82f6" strokeWidth="1.6" opacity="0.75" />
                  <path d="M 137 220 Q 280 178 560 230" fill="none" stroke="#8b5cf6" strokeWidth="1.8" opacity="0.75" />
                </g>

                {/* 2. MODERN PHYSICS: Bohr Atomic Shells & Quantum Leaps (Class 9 & 11/12) */}
                <g className="opacity-70">
                  {/* Shell K (n=1) */}
                  <ellipse cx="320" cy="180" rx="75" ry="135" transform="rotate(-20 320 180)" fill="none" stroke="#d97706" strokeWidth="1" strokeDasharray="3 5" />
                  {/* Shell L (n=2) */}
                  <ellipse cx="320" cy="180" rx="125" ry="195" transform="rotate(35 320 180)" fill="none" stroke="#0284c7" strokeWidth="1.1" strokeDasharray="4 6" />
                  {/* Shell M (n=3) */}
                  <ellipse cx="320" cy="180" rx="175" ry="245" transform="rotate(-10 320 180)" fill="none" stroke="#6366f1" strokeWidth="0.9" opacity="0.5" />

                  {/* Luminous Electron Particles */}
                  <circle cx="370" cy="130" r="3.5" fill="#f59e0b" />
                  <circle cx="370" cy="130" r="7" fill="#f59e0b" opacity="0.3" />
                  
                  <circle cx="230" cy="100" r="3" fill="#0284c7" />
                  <circle cx="230" cy="100" r="6" fill="#0284c7" opacity="0.3" />

                  <circle cx="465" cy="225" r="2.5" fill="#10b981" />

                  {/* Quantum Jump / Emitted Photon (ΔE = hν) */}
                  <path d="M 370 130 Q 395 105 425 115 T 465 110" fill="none" stroke="#d97706" strokeWidth="1.5" strokeDasharray="2 3" />
                </g>

                {/* 3. ELECTROMAGNETISM & GRAVITATION: Magnetic Field Lines (Class 10 & 12) */}
                <g className="opacity-45">
                  <path d="M 50 310 Q 280 375 540 300" fill="none" stroke="#4338ca" strokeWidth="1.3" strokeDasharray="5 7" />
                  <path d="M 80 280 Q 280 340 500 270" fill="none" stroke="#0284c7" strokeWidth="1" />
                  
                  {/* Directional field arrows */}
                  <polygon points="295,357 305,355 301,362" fill="#4338ca" />
                  <polygon points="305,324 315,322 311,329" fill="#0284c7" />
                </g>

                {/* 4. AUTHENTIC CBSE CLASS 8-12 FORMULAS (Etched into the Page Fabric) */}
                <g className="select-none pointer-events-none">
                  {/* Mechanics (Class 9 & 11) */}
                  <text x="35" y="45" className="font-serif italic text-xs fill-[#1c1c1c]/35 font-bold tracking-wider">F = m·a</text>
                  <text x="440" y="45" className="font-mono text-[10px] fill-[#1c1c1c]/35 font-semibold tracking-widest">v = u + a·t</text>
                  <text x="430" y="325" className="font-serif italic text-xs fill-[#1c1c1c]/35 font-semibold">F = G·(M·m)/r²</text>

                  {/* Optics (Class 10 & 12) */}
                  <text x="30" y="325" className="font-mono text-[10px] fill-[#1c1c1c]/35 font-semibold">1/f = 1/v - 1/u</text>

                  {/* Electricity & Modern Physics (Class 10, 11 & 12) */}
                  <text x="480" y="145" className="font-serif italic text-xs fill-[#1c1c1c]/35 font-bold">V = I·R</text>
                  <text x="40" y="105" className="font-serif italic text-xs fill-[#1c1c1c]/35 font-bold">E = h·ν</text>
                  <text x="245" y="40" className="font-mono text-[11px] fill-[#1c1c1c]/30 font-bold tracking-wider">E = m·c²</text>
                </g>

                {/* 5. WAVE OPTICS: Interference Wave Baseline (Class 12) */}
                <g className="opacity-75">
                  <path
                    d="M 0 310 Q 140 280 280 305 T 560 295 L 560 375 L 0 375 Z"
                    fill="url(#vibgyorSpectrum)"
                    mask="url(#nativeWaveMask)"
                    opacity="0.3"
                  />
                  <path
                    d="M 0 310 Q 140 280 280 305 T 560 295"
                    fill="none"
                    stroke="#d97706"
                    strokeWidth="1.4"
                    opacity="0.6"
                  />
                </g>
              </svg>

              {/* Native Graphic Callout 1: Ray Optics & Dispersion (Top Left) */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="absolute top-4 left-0 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 backdrop-blur-md border border-[#dfdbcf] shadow-2xs text-[#1c1c1c]"
              >
                <span className="w-2 h-2 rounded-full bg-gradient-to-r from-red-500 via-amber-400 to-cyan-500" />
                <span className="text-[10px] font-bold tracking-tight">Ray Optics &amp; Dispersion</span>
                <span className="text-[9px] font-mono font-bold text-amber-800 bg-amber-50 px-1 py-0.5 rounded ml-0.5">n = c/v</span>
              </motion.div>

              {/* Native Graphic Callout 2: Bohr Atom & Energy Levels (Top Right) */}
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.35 }}
                className="absolute top-4 right-0 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 backdrop-blur-md border border-[#dfdbcf] shadow-2xs text-[#1c1c1c]"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                <span className="text-[10px] font-bold tracking-tight">Bohr Model (n=3)</span>
                <span className="text-[9px] font-mono font-bold text-indigo-800 bg-indigo-50 px-1 py-0.5 rounded ml-0.5">ΔE = hν</span>
              </motion.div>

              {/* High-Resolution Cutout Portrait (Centered, Seamlessly Merged with Vectors) */}
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="relative z-10 w-full h-full flex items-end justify-center select-none"
              >
                {/* Soft Radiant Halo directly behind torso */}
                <div className="absolute top-8 w-56 h-56 rounded-full bg-gradient-to-tr from-amber-400/20 via-sky-400/15 to-indigo-400/15 blur-2xl pointer-events-none" />

                <div
                  className="w-full flex items-end justify-center"
                  style={{
                    maskImage: 'linear-gradient(to bottom, black 65%, rgba(0,0,0,0.6) 82%, rgba(0,0,0,0.15) 94%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, black 65%, rgba(0,0,0,0.6) 82%, rgba(0,0,0,0.15) 94%, transparent 100%)',
                  }}
                >
                  <picture className="contents">
                    <source type="image/webp" srcSet="/rupan.webp" />
                    <img
                      src="/rupan.png"
                      alt="Graviton Academy Lead Mentor"
                      className="max-h-[340px] lg:max-h-[365px] w-auto object-contain select-none transition-transform duration-500 hover:scale-[1.01]"
                      style={{
                        filter: 'drop-shadow(0 14px 26px rgba(28, 28, 28, 0.16)) drop-shadow(0 0 20px rgba(245, 158, 11, 0.16))',
                      }}
                    />
                  </picture>
                </div>

                {/* Natural Ground Contact Shadow */}
                <div className="absolute inset-x-12 bottom-0 h-6 bg-gradient-to-r from-transparent via-black/20 to-transparent rounded-full blur-md pointer-events-none" />
              </motion.div>

              {/* Floating Elite Mentor Card (Rendered ON FRONT of the Hero Image as an Overlay with Solid Pure White Background) */}
              <motion.div
                initial={{ opacity: 0, x: 20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.35 }}
                className="absolute bottom-10 sm:bottom-14 right-1 sm:right-4 lg:right-2 xl:right-4 z-30 flex items-center gap-3 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl bg-white border-2 border-amber-400 shadow-[0_16px_36px_-4px_rgba(217,119,6,0.22),0_6px_18px_-2px_rgba(0,0,0,0.12)] select-none pointer-events-auto"
              >
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 text-white flex items-center justify-center shrink-0 shadow-md ring-2 ring-amber-300/60">
                  <Award className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="text-left whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm sm:text-base font-black text-[#1c1c1c] tracking-tight leading-none whitespace-nowrap">
                      Rupan Sir
                    </p>
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)] shrink-0" />
                  </div>
                  <p className="text-xs sm:text-[13px] font-black text-amber-900 leading-tight mt-1 flex items-center gap-1 whitespace-nowrap">
                    <span className="text-amber-600 font-bold">★</span> NITian, Goldmedalist
                  </p>
                </div>
              </motion.div>

            </div>

          </div>

          {/* Integrated Editorial Metrics Pill (Desktop View Only - Seamlessly Sized) */}
          <div className="mt-4 flex justify-center w-full select-none">
            <div className="inline-flex items-center justify-center gap-3.5 lg:gap-4.5 xl:gap-5.5 py-2 px-4.5 sm:px-6 rounded-full bg-white border border-[#dfdbcf] shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.8)]">
              <div className="flex items-center gap-1.5 whitespace-nowrap shrink-0">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <span className="text-xs lg:text-[13px] font-black text-[#1c1c1c] whitespace-nowrap">6+ Years</span>
                <span className="text-[11px] lg:text-xs text-[#5f5f5d] font-medium whitespace-nowrap">Teaching Exp.</span>
              </div>
              
              <div className="w-px h-3.5 bg-[#dfdbcf] shrink-0" aria-hidden="true" />

              <div className="flex items-center gap-1.5 whitespace-nowrap shrink-0">
                <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                <span className="text-xs lg:text-[13px] font-black text-[#1c1c1c] whitespace-nowrap">1-on-1</span>
                <span className="text-[11px] lg:text-xs text-[#5f5f5d] font-medium whitespace-nowrap">Doubt Desk</span>
              </div>

              <div className="w-px h-3.5 bg-[#dfdbcf] shrink-0" aria-hidden="true" />

              <div className="flex items-center gap-1.5 whitespace-nowrap shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-xs lg:text-[13px] font-black text-[#1c1c1c] whitespace-nowrap">Classes 9–12</span>
                <span className="text-[11px] lg:text-xs text-[#5f5f5d] font-medium whitespace-nowrap">JEE · NEET · Boards</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
