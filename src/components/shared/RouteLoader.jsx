import { motion } from 'framer-motion'
import { GraduationCap } from 'lucide-react'

export default function RouteLoader() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="relative flex flex-col items-center gap-4"
      >
        {/* Ambient glow */}
        <div className="absolute -inset-4 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />

        {/* Brand Icon with subtle pulsating ring */}
        <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-950 via-indigo-900 to-blue-900 flex items-center justify-center shadow-lg shadow-blue-950/20 ring-1 ring-white/20">
          <GraduationCap className="h-6 w-6 text-amber-400 animate-pulse" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
          </span>
        </div>

        {/* Loading text with shimmer */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="h-1.5 w-24 bg-slate-200/80 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-amber-400 via-indigo-600 to-amber-400 rounded-full"
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
            />
          </div>
          <span className="text-[11px] font-semibold text-slate-400 tracking-wide">
            Loading...
          </span>
        </div>
      </motion.div>
    </div>
  )
}
