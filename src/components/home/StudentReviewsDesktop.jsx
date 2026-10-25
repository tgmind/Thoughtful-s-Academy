import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Star, Sparkles, CheckCircle2, MessageSquareQuote, Pause, Play } from 'lucide-react'
import { STUDENT_REVIEWS } from './studentReviewsData'

export default function StudentReviewsDesktop({ targetHeight }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const timerRef = useRef(null)

  const CARD_HEIGHT = 152 // Height of each card in pixels
  const GAP = 12 // Gap between cards
  const STEP = CARD_HEIGHT + GAP
  const totalReviews = STUDENT_REVIEWS.length

  // Triplicate reviews array to enable seamless continuous vertical rolling on tall viewports
  const extendedReviews = [...STUDENT_REVIEWS, ...STUDENT_REVIEWS, ...STUDENT_REVIEWS]

  useEffect(() => {
    if (isPaused) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % totalReviews)
    }, 3200)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPaused, totalReviews])

  // Hard ceiling for maximum 6 review cards: 6 * 152px + 5 * 12px + 132px (header/footer/padding) = 1000px
  const MAX_REVIEWS_HEIGHT = 1000
  const effectiveHeight = targetHeight ? Math.min(MAX_REVIEWS_HEIGHT, targetHeight) : null

  const containerStyle = effectiveHeight
    ? { height: `${effectiveHeight}px`, maxHeight: `${effectiveHeight}px` }
    : { minHeight: '260px', maxHeight: `${MAX_REVIEWS_HEIGHT}px` }

  return (
    <div
      style={containerStyle}
      className="bg-white border border-[#e2ddd1] rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 select-none flex flex-col"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onClick={(e) => {
        // No effects of mouse clicks as required
        e.preventDefault()
        e.stopPropagation()
      }}
      role="region"
      aria-label="Student Testimonials"
    >
      {/* Framer Dark Header matching What's On with Styled Text Hierarchy (No Pills) */}
      <div className="shrink-0 flex items-center justify-between px-4 sm:px-5 py-3.5 bg-gradient-to-r from-[#141414] via-[#1c1c1c] to-[#262626] text-white border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-inner shrink-0">
            <MessageSquareQuote className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white tracking-tight leading-tight">
              Student Reviews
            </h3>
            <p className="text-[11px] text-white/65 font-medium leading-none mt-1">
              Class 11, 12, JEE &amp; NEET Voices
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="flex items-center justify-end gap-1 text-amber-400 font-bold text-xs tracking-tight">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>4.9 / 5</span>
          </div>
          <p className="text-[10px] text-emerald-400/90 font-medium tracking-wide flex items-center justify-end gap-1 mt-0.5">
            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
            <span>Verified Feedback</span>
          </p>
        </div>
      </div>

      {/* Auto-scrolling Viewport (Flex-1 fills remaining card height) */}
      <div className="relative flex-1 min-h-0 overflow-hidden bg-white p-3.5">
        {/* Soft top gradient fade mask */}
        <div className="pointer-events-none absolute top-0 inset-x-0 h-6 bg-gradient-to-b from-white via-white/80 to-transparent z-10" />

        {/* Vertically sliding track */}
        <motion.div
          className="flex flex-col gap-3"
          animate={{ y: -(currentIndex * STEP) }}
          transition={{
            type: 'spring',
            stiffness: 85,
            damping: 20,
            mass: 0.8,
          }}
        >
          {extendedReviews.map((review, idx) => (
            <div
              key={`${review.id}-${idx}`}
              className="h-[152px] p-3 rounded-xl bg-[#faf8f5] hover:bg-[#f4efe6] border border-[#e7e1d4] transition-colors flex flex-col justify-between cursor-default shrink-0"
            >
              {/* Top row: Avatar, Name & Stars */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-full ${review.avatarBg} text-white flex items-center justify-center font-bold text-[11px] shadow-2xs shrink-0`}
                  >
                    {review.initials}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-xs text-[#1c1c1c] truncate">
                        {review.name}
                      </span>
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                    </div>
                    <span className="text-[10px] text-[#71717a] truncate block leading-tight">
                      {review.batch}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-0.5 shrink-0 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/70">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>

              {/* Review text */}
              <p className="text-[11px] text-[#3f3f46] leading-relaxed line-clamp-3 italic">
                &ldquo;{review.review}&rdquo;
              </p>

              {/* Footer: Highlight tag & location */}
              <div className="pt-2 border-t border-[#ece5d8] flex items-center justify-between text-[10px]">
                <span className="inline-flex items-center gap-1 font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/70 px-2 py-0.5 rounded-md">
                  <Sparkles className="w-2.5 h-2.5 text-indigo-500" />
                  <span>{review.highlight}</span>
                </span>
                <span className="text-[#8e8e93] font-medium truncate max-w-[100px]">
                  {review.city}
                </span>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Soft bottom gradient fade mask */}
        <div className="pointer-events-none absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-white via-white/90 to-transparent z-10" />
      </div>

      {/* Footer Status Bar with Hover Pause Indicator */}
      <div className="shrink-0 px-3.5 py-2.5 bg-[#fbf9f4] border-t border-[#eceae4] flex items-center justify-between text-[11px] text-[#71717a]">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span
              className={`absolute inline-flex h-full w-full rounded-full ${
                isPaused ? 'bg-amber-400 opacity-75' : 'bg-emerald-400 animate-ping opacity-75'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isPaused ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
            />
          </span>
          <span className="font-medium text-[10px]">
            {isPaused ? 'Paused on Hover' : 'Auto-scrolling Reviews'}
          </span>
        </div>

        <div className="flex items-center gap-1 text-[10px] text-[#8e8e93]">
          {isPaused ? <Pause className="w-3 h-3 text-amber-600" /> : <Play className="w-3 h-3 text-emerald-600" />}
          <span>Hover to Pause</span>
        </div>
      </div>
    </div>
  )
}
