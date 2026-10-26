import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import GravitonHeroDesktop from './GravitonHeroDesktop'
import PersonalHeroDesktop from './PersonalHeroDesktop'

const SLIDE_DURATION = 4500 // 4.5 seconds per slide
const TRANSITION_DURATION = 0.7 // 700ms horizontal ease

export default function HeroCarouselDesktop({
  instituteName,
  heroActiveCard,
  activeDesktopCard,
  heroDeckItems,
  handleSelectHeroCard,
  handleDeckActivity,
  handleDeckMouseLeave,
  pauseOnHover = false,
}) {
  // Track position: 0 (Slide 0: Graviton), 1 (Slide 1: Mentor), 2 (Slide 2: Graviton Clone)
  const [trackPosition, setTrackPosition] = useState(0)
  const [isSnapping, setIsSnapping] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  
  const timerRef = useRef(null)
  const startTimeRef = useRef(Date.now())
  const remainingTimeRef = useRef(SLIDE_DURATION)
  const isPausedRef = useRef(false)
  const isCardHoveredRef = useRef(false)
  const isCtaHoveredRef = useRef(false)
  const prefersReducedMotion = useReducedMotion()

  // Logical active slide (0 = Academy, 1 = Mentor)
  const activeSlideIndex = trackPosition === 2 ? 0 : trackPosition

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // Advancing always moves right-to-left: 0 -> 1 -> 2 (then seamlessly snaps to 0)
  const advanceSlide = useCallback(() => {
    setTrackPosition((prev) => {
      if (prev === 0) return 1
      if (prev === 1) return 2
      return 1
    })
    remainingTimeRef.current = SLIDE_DURATION
    startTimeRef.current = Date.now()
  }, [])

  // Precise Pause: saves exact elapsed time and freezes countdown
  const handlePauseRotation = useCallback(() => {
    if (isPausedRef.current) return
    isPausedRef.current = true
    setIsPaused(true)

    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
      const elapsed = Date.now() - (startTimeRef.current || Date.now())
      remainingTimeRef.current = Math.max(500, remainingTimeRef.current - elapsed)
    }
  }, [])

  // Precise Resume: seamlessly continues sliding from where it paused with remaining duration
  const handleResumeRotation = useCallback(() => {
    // Only resume if neither cards nor CTA buttons are hovered
    if (isCardHoveredRef.current || isCtaHoveredRef.current) return
    if (!isPausedRef.current) return

    isPausedRef.current = false
    setIsPaused(false)
    startTimeRef.current = Date.now()

    clearTimer()
    timerRef.current = setTimeout(() => {
      advanceSlide()
    }, remainingTimeRef.current)
  }, [advanceSlide, clearTimer])

  // Card Hover Handlers (Pauses when pointer hovers over any of the 3 cards)
  const handleCardHoverStart = useCallback(() => {
    isCardHoveredRef.current = true
    handlePauseRotation()
  }, [handlePauseRotation])

  const handleCardHoverEnd = useCallback(() => {
    isCardHoveredRef.current = false
    handleResumeRotation()
  }, [handleResumeRotation])

  // Explicit hover pausing for the 3 CTA buttons ("Explore All Batches", "Login", "Register Free")
  const handleCtaHoverStart = useCallback(() => {
    isCtaHoveredRef.current = true
    handlePauseRotation()
  }, [handlePauseRotation])

  const handleCtaHoverEnd = useCallback(() => {
    isCtaHoveredRef.current = false
    handleResumeRotation()
  }, [handleResumeRotation])

  // Automatic Rotation Lifecycle with Strict Right-to-Left Cadence & Resumable Countdown
  useEffect(() => {
    if (prefersReducedMotion || isSnapping) {
      clearTimer()
      return
    }

    if (isPausedRef.current) {
      clearTimer()
      return
    }

    // New slide entered viewport: reset countdown to full duration
    remainingTimeRef.current = SLIDE_DURATION
    startTimeRef.current = Date.now()

    clearTimer()
    timerRef.current = setTimeout(() => {
      advanceSlide()
    }, remainingTimeRef.current)

    return () => clearTimer()
  }, [trackPosition, isSnapping, prefersReducedMotion, clearTimer, advanceSlide])

  // Desktop-only Initial Scroll Capture:
  // When a visitor lands on Slide 1 and scrolls down, we intercept the scroll
  // so the website doesn't skip past the hero. Instead, we initiate the smooth
  // slide transition to Slide 2 ("Meet Your Mentor").
  // While Slide 2 is sliding in (~750ms), residual momentum wheel ticks are absorbed.
  // Once Slide 2 has appeared, the lock is released and subsequent scrolls work normally.
  const hasRevealedSlide2Ref = useRef(false)
  const isScrollLockedRef = useRef(false)
  const lockTimeoutRef = useRef(null)

  const trackPositionRef = useRef(trackPosition)
  useEffect(() => {
    trackPositionRef.current = trackPosition
    if (trackPosition === 1) {
      hasRevealedSlide2Ref.current = true
    }
  }, [trackPosition])

  useEffect(() => {
    const unlockScroll = () => {
      isScrollLockedRef.current = false
      hasRevealedSlide2Ref.current = true
      if (lockTimeoutRef.current) {
        clearTimeout(lockTimeoutRef.current)
        lockTimeoutRef.current = null
      }
    }

    const handleWheel = (e) => {
      // Only process vertical downward scroll
      if (e.deltaY <= 0) return

      const currentScrollY = typeof window !== 'undefined' ? (window.scrollY || document.documentElement.scrollTop || 0) : 0
      const isAtTop = currentScrollY <= 15

      // If currently locked during transition to Slide 2 at the top of the page,
      // absorb momentum wheel ticks so the page doesn't jerk down mid-slide
      if (isScrollLockedRef.current) {
        if (isAtTop) {
          e.preventDefault()
        }
        return
      }

      // If at top on Slide 1 and Slide 2 has not yet been revealed, intercept & transition
      if (isAtTop && trackPositionRef.current === 0 && !hasRevealedSlide2Ref.current) {
        e.preventDefault()
        isScrollLockedRef.current = true
        advanceSlide()

        lockTimeoutRef.current = setTimeout(() => {
          unlockScroll()
        }, Math.round(TRANSITION_DURATION * 1000) + 50)
      }
    }

    const handleKeyDown = (e) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase()
      if (activeTag === 'input' || activeTag === 'textarea' || document.activeElement?.isContentEditable) {
        return
      }

      const isDownKey = e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)
      if (!isDownKey) return

      const currentScrollY = typeof window !== 'undefined' ? (window.scrollY || document.documentElement.scrollTop || 0) : 0
      const isAtTop = currentScrollY <= 15

      if (isScrollLockedRef.current && isAtTop) {
        e.preventDefault()
        return
      }

      if (isAtTop && trackPositionRef.current === 0 && !hasRevealedSlide2Ref.current) {
        e.preventDefault()
        isScrollLockedRef.current = true
        advanceSlide()

        lockTimeoutRef.current = setTimeout(() => {
          unlockScroll()
        }, Math.round(TRANSITION_DURATION * 1000) + 50)
      }
    }

    window.addEventListener('wheel', handleWheel, { passive: false })
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('wheel', handleWheel)
      window.removeEventListener('keydown', handleKeyDown)
      if (lockTimeoutRef.current) {
        clearTimeout(lockTimeoutRef.current)
        lockTimeoutRef.current = null
      }
    }
  }, [advanceSlide])

  // Pause rotation when browser tab is inactive / hidden, resume from where paused
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handlePauseRotation()
      } else {
        handleResumeRotation()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [handlePauseRotation, handleResumeRotation])

  // Seamless right-to-left snap reset: when position 2 (clone) finishes sliding in,
  // instantaneously reset track to position 0 without animation.
  // Because position 2 and position 0 are visually identical, this is 100% invisible!
  const handleAnimationComplete = () => {
    if (trackPosition === 2) {
      setIsSnapping(true)
      setTrackPosition(0)
      // Re-enable smooth transitions on the very next render tick
      requestAnimationFrame(() => {
        setIsSnapping(false)
      })
    } else if (trackPosition === 1) {
      // Slide 2 has arrived and settled! Release scroll lock so subsequent scrolls work immediately
      isScrollLockedRef.current = false
      hasRevealedSlide2Ref.current = true
      if (lockTimeoutRef.current) {
        clearTimeout(lockTimeoutRef.current)
        lockTimeoutRef.current = null
      }
    }
  }

  // Resilient snap safety fallback: guarantees that even if onAnimationComplete is delayed
  // or throttled by browser compositor/backgrounding, position 2 always snaps to 0.
  useEffect(() => {
    if (trackPosition === 2) {
      const snapTimer = setTimeout(() => {
        setIsSnapping(true)
        setTrackPosition(0)
        requestAnimationFrame(() => {
          setIsSnapping(false)
        })
      }, Math.round(TRANSITION_DURATION * 1000) + 60)
      return () => clearTimeout(snapTimer)
    }
  }, [trackPosition])

  // Manual Slide Selection (Always preserves right-to-left flow)
  const handleSlideSelect = (targetIndex) => {
    if (targetIndex === activeSlideIndex) return
    clearTimer()

    if (targetIndex === 1) {
      // From Slide 0 -> Slide 1 (Right-to-Left)
      setTrackPosition(1)
    } else {
      // From Slide 1 -> Slide 2/Clone (Right-to-Left), which seamlessly resets to 0
      setTrackPosition(2)
    }
  }

  // Calculate track translation
  const getTrackX = () => {
    if (trackPosition === 0) return '0%'
    if (trackPosition === 1) return '-33.333333%'
    return '-66.666667%'
  }

  return (
    <section
      className="relative overflow-hidden pt-6 pb-6 sm:pt-10 sm:pb-8 border-b border-[#e7e4dc] select-none"
      style={{
        background: 'radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.05) 0%, rgba(245, 242, 235, 0.4) 40%, rgba(247, 244, 237, 0) 70%), linear-gradient(180deg, #fbfaf6 0%, #f7f4ed 55%, #f3eee3 100%)',
      }}
      onMouseEnter={pauseOnHover ? handlePauseRotation : undefined}
      onMouseLeave={pauseOnHover ? handleResumeRotation : undefined}
      onFocusCapture={pauseOnHover ? handlePauseRotation : undefined}
      onBlurCapture={pauseOnHover ? handleResumeRotation : undefined}
      aria-label="GRAViTON PHYSICS Featured Showcases"
      role="region"
    >
      {/* Subtle architectural tactile dot grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage: 'radial-gradient(#1c1c1c 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
        aria-hidden="true"
      />

      {/* Atmospheric ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none select-none opacity-60"
        style={{
          background: 'radial-gradient(circle at 75% 25%, rgba(99, 102, 241, 0.07) 0%, rgba(186, 230, 253, 0.12) 35%, rgba(241, 245, 249, 0) 70%)',
        }}
        aria-hidden="true"
      />

      {/* ─── UNIDIRECTIONAL RIGHT-TO-LEFT HORIZONTAL SLIDE TRACK ─── */}
      <div className="w-full overflow-hidden relative">
        <motion.div
          className="flex w-[300%] items-start transform-gpu will-change-transform"
          style={{
            transform: 'translate3d(0, 0, 0)',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
          animate={{ x: getTrackX() }}
          transition={{
            duration: prefersReducedMotion || isSnapping ? 0 : TRANSITION_DURATION,
            ease: [0.25, 1, 0.5, 1],
          }}
          onAnimationComplete={handleAnimationComplete}
        >
          {/* SLIDE 0: Graviton Academy Hero (Primary) */}
          <div className="w-1/3 shrink-0">
            <GravitonHeroDesktop
              instituteName={instituteName}
              heroActiveCard={heroActiveCard}
              activeDesktopCard={activeDesktopCard}
              heroDeckItems={heroDeckItems}
              handleSelectHeroCard={handleSelectHeroCard}
              handleDeckActivity={handleDeckActivity}
              handleDeckMouseLeave={handleDeckMouseLeave}
              onCtaHoverStart={handleCtaHoverStart}
              onCtaHoverEnd={handleCtaHoverEnd}
              onCardHoverStart={handleCardHoverStart}
              onCardHoverEnd={handleCardHoverEnd}
            />
          </div>

          {/* SLIDE 1: Art-Directed Personal Mentor Hero */}
          <div className="w-1/3 shrink-0">
            <PersonalHeroDesktop
              onCtaHoverStart={handleCtaHoverStart}
              onCtaHoverEnd={handleCtaHoverEnd}
              onCardHoverStart={handleCardHoverStart}
              onCardHoverEnd={handleCardHoverEnd}
            />
          </div>

          {/* SLIDE 2: Graviton Academy Visual Clone (for seamless right-to-left loop) */}
          <div className="w-1/3 shrink-0 pointer-events-none select-none" aria-hidden="true">
            {trackPosition > 0 && (
              <GravitonHeroDesktop
                instituteName={instituteName}
                heroActiveCard={heroActiveCard}
                activeDesktopCard={activeDesktopCard}
                heroDeckItems={heroDeckItems}
                handleSelectHeroCard={() => {}}
                handleDeckActivity={() => {}}
                handleDeckMouseLeave={() => {}}
                isClone={true}
              />
            )}
          </div>
        </motion.div>
      </div>

      {/* ─── MODERN DUAL-STADIUM PRECISION INDICATOR DOCK & PEEK CHIP ─── */}
      <div className="relative z-20 flex flex-col sm:flex-row items-center justify-center gap-3 mt-4">
        <div
          className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/75 border border-[#dfdbcf] shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.8)] backdrop-blur-md select-none"
          role="tablist"
          aria-label="Carousel slide navigation"
        >
          {/* Slide 1 Segment (Academy) */}
          <button
            type="button"
            role="tab"
            aria-selected={activeSlideIndex === 0}
            aria-label="Slide 1: Institute Overview"
            onClick={() => handleSlideSelect(0)}
            className="relative h-6 flex items-center justify-center transition-all focus:outline-hidden"
          >
            {activeSlideIndex === 0 ? (
              <motion.div
                layoutId="heroCarouselActiveSegmentDesktop"
                className="w-11 sm:w-12 h-2.5 rounded-full bg-[#1c1c1c] shadow-xs flex items-center justify-center"
                transition={{ type: 'spring', stiffness: 500, damping: 32 }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b] animate-pulse" />
              </motion.div>
            ) : (
              <span className="w-3 sm:w-3.5 h-2.5 rounded-full bg-[#d5d0c3] hover:bg-[#a8a396] hover:w-5 transition-all duration-300" />
            )}
          </button>

          {/* Slide 2 Segment (Mentor) */}
          <button
            type="button"
            role="tab"
            aria-selected={activeSlideIndex === 1}
            aria-label="Slide 2: Meet Your Mentor"
            onClick={() => handleSlideSelect(1)}
            className="relative h-6 flex items-center justify-center transition-all focus:outline-hidden"
          >
            {activeSlideIndex === 1 ? (
              <motion.div
                layoutId="heroCarouselActiveSegmentDesktop"
                className="w-11 sm:w-12 h-2.5 rounded-full bg-[#1c1c1c] shadow-xs flex items-center justify-center"
                transition={{ type: 'spring', stiffness: 500, damping: 32 }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4] animate-pulse" />
              </motion.div>
            ) : (
              <span className="w-3 sm:w-3.5 h-2.5 rounded-full bg-[#d5d0c3] hover:bg-[#a8a396] hover:w-5 transition-all duration-300" />
            )}
          </button>
        </div>

        {/* Minimalist Slide 2 Peek Chip: Allows jumping to mentor & gives instant preview */}
        {activeSlideIndex === 0 && (
          <button
            type="button"
            onClick={() => handleSlideSelect(1)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 hover:bg-white text-[#1c1c1c] border border-[#dfdbcf] hover:border-amber-400/80 text-[11px] font-semibold shadow-xs hover:shadow-sm transition-all active:scale-95 group"
            aria-label="Preview next slide: Meet Your Mentor"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span>Up Next: Meet Your Mentor</span>
            <span className="text-amber-600 font-bold group-hover:translate-x-0.5 transition-transform">→</span>
          </button>
        )}
      </div>

    </section>
  )
}
