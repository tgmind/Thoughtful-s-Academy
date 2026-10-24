import { motion } from 'framer-motion'
import { GraduationCap, Sparkles, BookOpen, Video, Users, CheckCircle2, Award, Compass, ShieldCheck } from 'lucide-react'
import { INSTITUTE_NAME, INSTITUTE_TAGLINE } from '../../lib/constants'

/**
 * InstituteHeroEmblem
 * 
 * Replaces the personal photo of Subodh Verma in the Hero section with a majestic,
 * glowing Coaching Institute Emblem card designed in royal navy & golden saffron.
 * 
 * Features:
 * - 24px/28px squircle frame with amber-gold rim (#f59e0b) and ambient glow
 * - Official Institute Emblem: 3D-styled golden graduation cap, academic crest, and orbit rings
 * - Credential badges: "Center for Science & Foundation", "Class 9–12 • Board & Olympiad"
 * - Live status indicator: "● Admissions Open 2025–26"
 * - Smooth framer-motion micro-interactions
 */
export default function InstituteHeroEmblem({ className = '' }) {
  return (
    <div className={`relative w-full max-w-[320px] sm:max-w-[360px] mx-auto select-none ${className}`}>
      
      {/* Radiant ambient glow behind the card */}
      <div 
        className="absolute -inset-4 rounded-3xl pointer-events-none opacity-50 blur-2xl"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(245, 158, 11, 0.3) 0%, rgba(59, 130, 246, 0.25) 50%, transparent 75%)',
        }}
      />

      {/* Main Crest Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        whileHover={{ scale: 1.015 }}
        className="relative rounded-[2rem] overflow-hidden border border-white/15 ring-1 ring-amber-400/40 shadow-2xl bg-gradient-to-b from-[#0e164d] via-[#090e38] to-[#050826] p-6 sm:p-7 flex flex-col items-center text-center backdrop-blur-xl group"
      >
        {/* Subtle interior physics / dot matrix grid */}
        <div 
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)',
            backgroundSize: '20px 20px',
          }}
        />

        {/* Diagonal glass sheen */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-20 group-hover:opacity-35 transition-opacity duration-700"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 40%, rgba(245,158,11,0.2) 70%, transparent 100%)',
          }}
        />

        {/* Top live admissions badge inside emblem */}
        <div className="relative z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 text-[10px] font-bold tracking-wider uppercase mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Accredited Academy · 2025–26</span>
        </div>

        {/* Central Logo Graphic with Orbit Rings */}
        <div className="relative z-10 my-1">
          {/* Outer rotating hairline ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 50, repeat: Infinity, ease: 'linear' }}
            className="absolute -inset-4 rounded-full border border-amber-400/20 border-dashed pointer-events-none"
          />

          {/* Golden Aura */}
          <div className="absolute inset-0 bg-amber-400/30 rounded-3xl blur-xl" />

          {/* Squircle Cap Tile */}
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-[28%] bg-gradient-to-tr from-[#0b0f3d] via-[#1a237e] to-amber-500/30 border border-amber-400/60 flex items-center justify-center shadow-lg shadow-amber-400/20 group-hover:scale-105 transition-transform duration-300">
            <GraduationCap className="w-13 h-13 sm:w-16 sm:h-16 text-amber-400 stroke-[1.8] drop-shadow-[0_4px_16px_rgba(245,158,11,0.6)]" />
          </div>
        </div>

        {/* Institute Title & Brand Lockup */}
        <div className="relative z-10 mt-4 space-y-1">
          <h2 className="font-display font-extrabold text-white text-xl sm:text-2xl tracking-tight leading-tight">
            {INSTITUTE_NAME}
          </h2>
          <p className="text-amber-400 font-extrabold text-xs uppercase tracking-widest">
            Center for Science &amp; Mathematics
          </p>
          <p className="text-blue-200/70 text-xs font-medium pt-0.5">
            {INSTITUTE_TAGLINE}
          </p>
        </div>

        {/* Academic Credentials Box */}
        <div className="relative z-10 w-full mt-5 pt-4 border-t border-white/10 space-y-2 text-left">
          <div className="flex items-center gap-2 text-xs text-blue-100 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Class 9–12 Foundation &amp; Board Mastery</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-blue-100 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Live Interactive Lectures + 1080p Replays</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-blue-100 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Dedicated 1-on-1 Personal Doubt Solving</span>
          </div>
        </div>

        {/* Bottom accent glow bar */}
        <div className="absolute bottom-0 inset-x-8 h-[2px] bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
      </motion.div>
    </div>
  )
}
