import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import GravitonHeroMobile from './GravitonHeroMobile'
import PersonalHeroMobile from './PersonalHeroMobile'

const SLIDE_DURATION = 4500 // 4.5 seconds per slide
const TRANSITION_DURATION = 0.7 // 700ms horizontal ease

export default function HeroCarouselMobile({
  instituteName,
  heroActiveCard,
  mobileHeroCard,
  heroDeckItems,
  handleSelectHeroCard,
  handleDeckActivity,
}) {
  // Track position: 0 (Slide 0: Graviton), 1 (Slide 1: Mentor), 2 (Slide 2: Graviton Clone)
  const [trackPosition, setTrackPosition] = useState(0)
  const [isSnapping, setIsSnapping] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const timerRef = useRef(null)
  const touchStartXRef = useRef(0)
  const touchEndXRef = useRef(0)
  const prefersReducedMotion = useReducedMotion()

  // Logical active slide (0 = Academy, 1 = Mentor)
  const activeSlideIndex = trackPosition === 2 ? 0 : trackPosition

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // Advancing always moves right-to-left
  const advanceSlide = useCallback(() => {
    setTrackPosition((prev) => {
      if (prev === 0) return 1
      if (prev === 1) return 2
      return 1
    })
  }, [])

  // Automatic Rotation Lifecycle with Strict Right-to-Left Cadence
  useEffect(() => {
    if (prefersReducedMotion || isPaused || isSnapping) {
      clearTimer()
      return
    }

    timerRef.current = setTimeout(() => {
      advanceSlide()
    }, SLIDE_DURATION)

    return () => clearTimer()
  }, [trackPosition, isPaused, isSnapping, prefersReducedMotion, clearTimer, advanceSlide])

  // Clever & Minimalistic Scroll-Aware Slide-2 Early Reveal:
  // When a mobile visitor begins scrolling down before 4.5s elapses,
  // we smoothly transition to Slide 2 so they never miss the mentor showcase!
  const hasAutoSwappedOnScrollRef = useRef(false)

  useEffect(() => {
    const handleScroll = () => {
      if (
        !hasAutoSwappedOnScrollRef.current &&
        trackPosition === 0 &&
        typeof window !== 'undefined' &&
        window.scrollY > 25 &&
        window.scrollY < 450
      ) {
        hasAutoSwappedOnScrollRef.current = true
        advanceSlide()
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [trackPosition, advanceSlide])

  // Pause rotation when browser tab is inactive / hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsPaused(true)
      } else {
        setIsPaused(false)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  // Seamless right-to-left snap reset: when position 2 (clone) finishes sliding in,
  // instantaneously reset track to position 0 without animation.
  const handleAnimationComplete = () => {
    if (trackPosition === 2) {
      setIsSnapping(true)
      setTrackPosition(0)
      requestAnimationFrame(() => {
        setIsSnapping(false)
      })
    }
  }

  // Resilient snap safety fallback: guarantees position 2 snaps to 0 even if
  // onAnimationComplete is throttled by mobile backgrounding
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

  const handleTouchStart = (e) => {
    setIsPaused(true)
    touchStartXRef.current = e.touches[0].clientX
    touchEndXRef.current = e.touches[0].clientX
  }

  const handleTouchMove = (e) => {
    touchEndXRef.current = e.touches[0].clientX
  }

  const handleTouchEnd = () => {
    setIsPaused(false)
    const deltaX = touchStartXRef.current - touchEndXRef.current
    // Swipe left (advance right-to-left)
    if (deltaX > 40) {
      clearTimer()
      advanceSlide()
    }
    // Swipe right (cycle to previous)
    else if (deltaX < -40) {
      clearTimer()
      if (activeSlideIndex === 1) {
        setTrackPosition(2)
      }
    }
  }

  // Manual Slide Selection (Always preserves right-to-left flow)
  const handleSlideSelect = (targetIndex) => {
    if (targetIndex === activeSlideIndex) return
    clearTimer()

    if (targetIndex === 1) {
      setTrackPosition(1)
    } else {
      setTrackPosition(2)
    }
  }

  const getTrackX = () => {
    if (trackPosition === 0) return '0%'
    if (trackPosition === 1) return '-33.333333%'
    return '-66.666667%'
  }

  return (
    <section
      className="relative overflow-hidden pt-5 pb-6 border-b border-[#e7e4dc] select-none"
      style={{
        background: 'radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.05) 0%, rgba(245, 242, 235, 0.4) 40%, rgba(247, 244, 237, 0) 70%), linear-gradient(180deg, #fbfaf6 0%, #f7f4ed 55%, #f3eee3 100%)',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      aria-label="Graviton Academy Featured Showcases"
      role="region"
    >
      {/* Architectural subtle dot grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage: 'radial-gradient(#1c1c1c 1px, transparent 1px)',
          backgroundSize: '20px 20px',
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
          {/* SLIDE 0: Graviton Academy Hero Mobile (Primary) */}
          <div className="w-1/3 shrink-0">
            <GravitonHeroMobile
              instituteName={instituteName}
              heroActiveCard={heroActiveCard}
              mobileHeroCard={mobileHeroCard}
              heroDeckItems={heroDeckItems}
              handleSelectHeroCard={handleSelectHeroCard}
              handleDeckActivity={handleDeckActivity}
            />
          </div>

          {/* SLIDE 1: Personal Mentor Hero Mobile */}
          <div className="w-1/3 shrink-0">
            <PersonalHeroMobile />
          </div>

          {/* SLIDE 2: Graviton Academy Visual Clone (for seamless right-to-left loop) */}
          <div className="w-1/3 shrink-0 pointer-events-none select-none" aria-hidden="true">
            {trackPosition > 0 && (
              <GravitonHeroMobile
                instituteName={instituteName}
                heroActiveCard={heroActiveCard}
                mobileHeroCard={mobileHeroCard}
                heroDeckItems={heroDeckItems}
                handleSelectHeroCard={() => {}}
                handleDeckActivity={() => {}}
                isClone={true}
              />
            )}
          </div>
        </motion.div>
      </div>

      {/* ─── MODERN DUAL-STADIUM PRECISION INDICATOR DOCK ─── */}
      <div className="relative z-20 flex items-center justify-center mt-4">
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
                layoutId="heroCarouselActiveSegmentMobile"
                className="w-10 h-2.5 rounded-full bg-[#1c1c1c] shadow-xs flex items-center justify-center"
                transition={{ type: 'spring', stiffness: 500, damping: 32 }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b] animate-pulse" />
              </motion.div>
            ) : (
              <span className="w-3 h-2.5 rounded-full bg-[#d5d0c3] hover:bg-[#a8a396] hover:w-5 transition-all duration-300" />
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
                layoutId="heroCarouselActiveSegmentMobile"
                className="w-10 h-2.5 rounded-full bg-[#1c1c1c] shadow-xs flex items-center justify-center"
                transition={{ type: 'spring', stiffness: 500, damping: 32 }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4] animate-pulse" />
              </motion.div>
            ) : (
              <span className="w-3 h-2.5 rounded-full bg-[#d5d0c3] hover:bg-[#a8a396] hover:w-5 transition-all duration-300" />
            )}
          </button>
        </div>
      </div>

    </section>
  )
}
