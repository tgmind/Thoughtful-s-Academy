import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Star, Sparkles, CheckCircle2, MessageSquareQuote, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import { STUDENT_REVIEWS } from './studentReviewsData'

export default function StudentReviewsMobile() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const scrollRef = useRef(null)
  const timerRef = useRef(null)
  const total = STUDENT_REVIEWS.length

  const scrollLeftTo = (left) => {
    if (!scrollRef.current) return
    if (typeof scrollRef.current.scrollTo === 'function') {
      scrollRef.current.scrollTo({ left, behavior: 'smooth' })
    } else {
      scrollRef.current.scrollLeft = left
    }
  }

  // Auto-scroll horizontally at fixed intervals
  useEffect(() => {
    if (isPaused) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = (prev + 1) % total
        const cardWidth = 290 // card width + gap approximation
        scrollLeftTo(next * cardWidth)
        return next
      })
    }, 3500)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPaused, total])

  const handleManualScroll = (direction) => {
    setIsPaused(true)
    const next = direction > 0 ? (currentIndex + 1) % total : (currentIndex - 1 + total) % total
    setCurrentIndex(next)
    const cardWidth = 290
    scrollLeftTo(next * cardWidth)
    // Resume auto-scroll after 5 seconds of inactivity
    setTimeout(() => setIsPaused(false), 5000)
  }

  return (
    <section
      className="py-6 sm:py-8 select-none"
      aria-label="Student Reviews Mobile"
      onClick={(e) => {
        // No effects on mouse click
        e.preventDefault()
      }}
    >
      {/* Section Header */}
      <div className="flex items-end justify-between mb-4 px-1">
        <div>
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-900 text-[10px] font-bold tracking-wide uppercase mb-1.5 shadow-2xs">
            <MessageSquareQuote className="w-3 h-3 text-indigo-600" />
            <span>Student Testimonials</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-[#1c1c1c] tracking-tight">
            What Our Students Say
          </h2>
          <p className="text-xs text-[#71717a] mt-0.5">
            Real feedback from Class 11, 12, JEE &amp; NEET cohorts
          </p>
        </div>

        {/* Manual Arrow Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleManualScroll(-1)}
            className="w-8 h-8 rounded-full border border-gray-300 bg-white text-gray-700 flex items-center justify-center shadow-2xs hover:bg-gray-50 active:scale-95 transition-all"
            aria-label="Previous review"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleManualScroll(1)}
            className="w-8 h-8 rounded-full border border-gray-300 bg-white text-gray-700 flex items-center justify-center shadow-2xs hover:bg-gray-50 active:scale-95 transition-all"
            aria-label="Next review"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Rolling Track */}
      <div
        ref={scrollRef}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => {
          setTimeout(() => setIsPaused(false), 4000)
        }}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-3 pt-1 px-1 [-ms-overflow-style:'none'] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {STUDENT_REVIEWS.map((review, idx) => (
          <div
            key={review.id}
            className={`w-[280px] sm:w-[310px] shrink-0 snap-center p-4 rounded-2xl border transition-all duration-300 flex flex-col justify-between ${
              currentIndex === idx
                ? 'bg-white border-amber-300 shadow-md ring-1 ring-amber-300/40'
                : 'bg-white/90 border-[#e4ded3] shadow-xs'
            }`}
          >
            {/* Top row: Avatar & Stars */}
            <div>
              <div className="flex items-start justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-full ${review.avatarBg} text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0`}
                  >
                    {review.initials}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-xs text-[#1c1c1c] truncate">
                        {review.name}
                      </span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    </div>
                    <span className="text-[10px] text-[#71717a] truncate block leading-tight">
                      {review.batch}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-0.5 shrink-0 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200/60">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>

              {/* Review Text */}
              <p className="text-xs text-[#3f3f46] leading-relaxed line-clamp-4 italic">
                &ldquo;{review.review}&rdquo;
              </p>
            </div>

            {/* Bottom Row */}
            <div className="mt-3 pt-2.5 border-t border-[#ece6da] flex items-center justify-between text-[10px]">
              <span className="inline-flex items-center gap-1 font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/70 px-2 py-0.5 rounded-md">
                <Sparkles className="w-2.5 h-2.5 text-indigo-500" />
                <span>{review.highlight}</span>
              </span>
              <span className="text-[#8e8e93] font-medium">{review.city}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Dot Indicators */}
      <div className="flex items-center justify-between px-2 pt-2 text-[10px] text-[#8e8e93]">
        <div className="flex items-center gap-1">
          {STUDENT_REVIEWS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setIsPaused(true)
                setCurrentIndex(i)
                scrollLeftTo(i * 290)
                setTimeout(() => setIsPaused(false), 5000)
              }}
              className={`transition-all rounded-full ${
                currentIndex === i
                  ? 'w-4 h-1.5 bg-indigo-600'
                  : 'w-1.5 h-1.5 bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Go to review ${i + 1}`}
            />
          ))}
        </div>

        <div className="flex items-center gap-1">
          <span className="relative flex h-1.5 w-1.5">
            <span
              className={`absolute inline-flex h-full w-full rounded-full ${
                isPaused ? 'bg-amber-400' : 'bg-emerald-400 animate-ping'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                isPaused ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
            />
          </span>
          <span className="text-[10px]">
            {isPaused ? 'Paused' : 'Auto-rolling'}
          </span>
        </div>
      </div>
    </section>
  )
}
