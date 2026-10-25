import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Sparkles, ChevronLeft, ChevronRight, Layers, MoveRight } from 'lucide-react'
import LectureCard from './LectureCard'
import SkeletonCard from './SkeletonCard'

export default function AllLecturesSection({
  cards = [],
  visibleCards = [],
  loading = false,
  batches = [],
  activeBatch = 'all',
  setActiveBatch,
  totalCards = 0,
  totalPages = 1,
  page = 1,
  setPage,
  dynamicPageSize = 6,
  getCardWidthClass,
  sectionRef,
}) {
  const [activeSwipeIdx, setActiveSwipeIdx] = useState(0)
  const swipeRef = useRef(null)

  // Mobile: maximum 4 lectures in vertical/symmetrical grid
  const topCards = cards.slice(0, 4)
  // Mobile: remaining lectures in clever horizontal swipe view
  const swipeCards = cards.slice(4)

  useEffect(() => {
    setActiveSwipeIdx(0)
    if (swipeRef.current) {
      swipeRef.current.scrollLeft = 0
    }
  }, [activeBatch])

  const handleSwipeScroll = () => {
    if (!swipeRef.current) return
    const el = swipeRef.current
    const cardWidth = 285
    const idx = Math.round(el.scrollLeft / cardWidth)
    setActiveSwipeIdx(Math.min(swipeCards.length - 1, Math.max(0, idx)))
  }

  const scrollSwipe = (direction) => {
    if (!swipeRef.current) return
    const cardWidth = 285
    swipeRef.current.scrollBy({
      left: direction * cardWidth,
      behavior: 'smooth',
    })
  }

  const scrollToCard = (index) => {
    if (!swipeRef.current) return
    const cardWidth = 285
    swipeRef.current.scrollTo({
      left: index * cardWidth,
      behavior: 'smooth',
    })
  }

  const getMobileCardWidthClass = (count) => {
    if (count === 1) return 'w-full max-w-md mx-auto'
    if (count === 2 || count === 4) return 'w-full sm:w-[calc(50%-10px)] max-w-[420px]'
    return 'w-full sm:w-[calc(50%-10px)] max-w-[420px]'
  }

  return (
    <section
      id="all-lectures"
      ref={sectionRef}
      className="relative rounded-3xl sm:rounded-[36px] bg-gradient-to-b from-white via-[#fcfbfa] to-[#faf7f0] border border-[#e4ded2] shadow-[0_12px_45px_rgba(28,28,28,0.06),0_2px_4px_rgba(28,28,28,0.02)] p-5 sm:p-8 lg:p-10 overflow-hidden"
    >
      {/* Architectural tactile dot grid background texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage: 'radial-gradient(#1c1c1c 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Subtle ambient warm radial corner glow */}
      <div className="absolute -top-28 -right-28 w-96 h-96 bg-gradient-to-br from-amber-400/10 via-amber-200/5 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-28 -left-28 w-96 h-96 bg-gradient-to-tr from-indigo-500/5 via-sky-400/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Section Header */}
      <div className="relative z-10 mb-7 sm:mb-8 space-y-4 sm:space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f4efe4] border border-[#dfd8cb] text-[#1c1c1c] text-xs font-semibold tracking-wide uppercase shadow-2xs">
              <BookOpen className="w-3.5 h-3.5 text-indigo-700" />
              <span>Academic Curriculum &amp; Lectures</span>
            </div>

            <div className="flex items-center gap-3 flex-wrap pt-0.5">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#1c1c1c] tracking-tight">
                All lectures
              </h2>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1c1c1c] text-[#fcfbf8] text-xs font-bold tracking-tight shadow-xs">
                <Sparkles className="w-3 h-3 text-amber-300 fill-amber-300" />
                <span>{totalCards} {totalCards === 1 ? 'Curated Lesson' : 'Curated Lessons'}</span>
              </span>
            </div>

            <p className="text-xs sm:text-sm text-[#5f5f5d] max-w-2xl leading-relaxed">
              {totalCards > 0
                ? `Explore all ${totalCards} public study cards with in-depth lectures and reference material.`
                : 'Browse all video lectures and structured course material.'}
            </p>
          </div>

          {totalPages > 1 && (
            <div className="hidden lg:flex items-center gap-1.5 self-end sm:self-auto bg-white p-1 rounded-xl border border-[#e2ddd1] shadow-2xs">
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-7 h-7 rounded-lg text-[#1c1c1c] hover:bg-[#f7f4ed] disabled:opacity-30 flex items-center justify-center transition-colors cursor-pointer"
                title="Previous"
              >
                <ChevronLeft className="h-4 w-4" />
              </motion.button>
              <span className="text-xs font-bold text-[#1c1c1c] px-2 tabular-nums">
                {page} <span className="text-[#5f5f5d] font-normal">/</span> {totalPages}
              </span>
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-7 h-7 rounded-lg text-[#1c1c1c] hover:bg-[#f7f4ed] disabled:opacity-30 flex items-center justify-center transition-colors cursor-pointer"
                title="Next"
              >
                <ChevronRight className="h-4 w-4" />
              </motion.button>
            </div>
          )}
        </div>

        {/* Batch Category Filters with Framer sliding layoutId */}
        <div className="w-full overflow-x-auto pb-1 -mx-1 px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:none]">
          <div className="flex gap-2 w-max items-center p-1.5 bg-white/80 backdrop-blur-md rounded-full border border-[#ded8cb] shadow-2xs">
            <button
              onClick={() => { setActiveBatch('all'); setPage(1) }}
              className="relative px-4 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer"
            >
              {activeBatch === 'all' && (
                <motion.div
                  layoutId="activeBatchPill"
                  className="absolute inset-0 bg-[#1c1c1c] rounded-full shadow-[inset_0px_0.5px_0px_rgba(255,255,255,0.25),0_2px_6px_rgba(0,0,0,0.12)]"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className={`relative z-10 transition-colors ${activeBatch === 'all' ? 'text-[#fcfbf8]' : 'text-[#5f5f5d] hover:text-[#1c1c1c]'}`}>
                All
              </span>
            </button>
            {batches.map(b => (
              <button
                key={b.id}
                onClick={() => { setActiveBatch(b.id); setPage(1) }}
                className="relative px-4 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer"
              >
                {activeBatch === b.id && (
                  <motion.div
                    layoutId="activeBatchPill"
                    className="absolute inset-0 bg-[#1c1c1c] rounded-full shadow-[inset_0px_0.5px_0px_rgba(255,255,255,0.25),0_2px_6px_rgba(0,0,0,0.12)]"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className={`relative z-10 transition-colors ${activeBatch === b.id ? 'text-[#fcfbf8]' : 'text-[#5f5f5d] hover:text-[#1c1c1c]'}`}>
                  {b.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-wrap justify-center gap-5 sm:gap-6 items-stretch pt-2 pb-2 relative z-10">
          {[...Array(dynamicPageSize || 6)].map((_, i) => (
            <div
              key={i}
              className={`${getCardWidthClass ? getCardWidthClass(dynamicPageSize || 6) : 'w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] max-w-[430px]'} flex flex-col`}
            >
              <SkeletonCard />
            </div>
          ))}
        </div>
      ) : cards.length === 0 ? (
        <div className="text-center py-16 sm:py-20 bg-white/70 rounded-3xl border border-[#e2ddd1] shadow-2xs relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-[#f7f4ed] border border-[#e2ddd1] flex items-center justify-center mx-auto mb-3.5 shadow-2xs">
            <BookOpen className="h-7 w-7 text-[#5f5f5d]/70" />
          </div>
          <p className="text-base font-bold text-[#1c1c1c]">No lectures available in this filter.</p>
          <p className="text-xs sm:text-sm text-[#5f5f5d] mt-1">Please select another batch tab above to explore study material.</p>
        </div>
      ) : (
        <>
          {/* ════════════ DESKTOP VIEW (hidden lg:block): 100% UNTOUCHED & IDENTICAL ════════════ */}
          <div className="hidden lg:block">
            <motion.div
              layout
              className="flex flex-wrap justify-center gap-5 sm:gap-6 items-stretch pt-2 pb-2 relative z-10"
            >
              <AnimatePresence mode="popLayout">
                {visibleCards.map((card, idx) => (
                  <motion.div
                    key={card.id}
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{
                      type: 'spring',
                      stiffness: 300,
                      damping: 26,
                      delay: idx * 0.04,
                    }}
                    className={`${getCardWidthClass ? getCardWidthClass(visibleCards.length) : 'w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] max-w-[430px]'} flex flex-col`}
                  >
                    <LectureCard card={card} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1.5 mt-10 relative z-10">
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-xl border border-[#e2ddd1] bg-white hover:border-[#1c1c1c] text-[#1c1c1c] disabled:opacity-30 transition-colors cursor-pointer shadow-2xs"
                  title="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </motion.button>
                {[...Array(totalPages)].map((_, i) => (
                  <motion.button
                    key={i}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setPage(i + 1)}
                    className={`w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      page === i + 1
                        ? 'bg-[#1c1c1c] text-[#fcfbf8] shadow-xs'
                        : 'bg-white border border-[#e2ddd1] text-[#1c1c1c] hover:border-[#1c1c1c]'
                    }`}
                  >
                    {i + 1}
                  </motion.button>
                ))}
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-xl border border-[#e2ddd1] bg-white hover:border-[#1c1c1c] text-[#1c1c1c] disabled:opacity-30 transition-colors cursor-pointer shadow-2xs"
                  title="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </motion.button>
              </div>
            )}
          </div>

          {/* ════════════ MOBILE VIEW (lg:hidden): MAX 4 CARDS + HORIZONTAL SWIPE FOR REMAINING ════════════ */}
          <div className="lg:hidden relative z-10 space-y-6">
            {/* Primary symmetrical grid: Maximum 4 lectures */}
            <motion.div
              layout
              className="flex flex-wrap justify-center gap-4 sm:gap-5 items-stretch"
            >
              <AnimatePresence mode="popLayout">
                {topCards.map((card, idx) => (
                  <motion.div
                    key={card.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{
                      type: 'spring',
                      stiffness: 300,
                      damping: 26,
                      delay: idx * 0.04,
                    }}
                    className={`${getMobileCardWidthClass(topCards.length)} flex flex-col`}
                  >
                    <LectureCard card={card} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>

            {/* Horizontal swipe view for remaining lectures (Cards 5+) */}
            {swipeCards.length > 0 && (
              <div className="pt-5 border-t border-[#e8e2d5]">
                {/* Swipe Sub-Header */}
                <div className="flex items-center justify-between mb-3.5 px-0.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-700 shadow-2xs">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-xs sm:text-sm text-[#1c1c1c] tracking-tight flex items-center gap-1.5">
                        <span>More in this Batch</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                          +{swipeCards.length} more
                        </span>
                      </h3>
                      <p className="text-[10px] text-[#71717a] flex items-center gap-1">
                        <span>Swipe horizontally to explore</span>
                        <MoveRight className="w-2.5 h-2.5 text-indigo-500" />
                      </p>
                    </div>
                  </div>

                  {/* Carousel navigation buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => scrollSwipe(-1)}
                      disabled={activeSwipeIdx === 0}
                      aria-label="Previous swipe card"
                      className="w-7 h-7 rounded-lg border border-[#ded8cb] bg-white hover:bg-[#f7f4ed] disabled:opacity-30 text-[#1c1c1c] flex items-center justify-center shadow-2xs active:scale-95 transition-all cursor-pointer"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollSwipe(1)}
                      disabled={activeSwipeIdx === swipeCards.length - 1}
                      aria-label="Next swipe card"
                      className="w-7 h-7 rounded-lg border border-[#ded8cb] bg-white hover:bg-[#f7f4ed] disabled:opacity-30 text-[#1c1c1c] flex items-center justify-center shadow-2xs active:scale-95 transition-all cursor-pointer"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Smooth Touch Snap Carousel */}
                <div
                  ref={swipeRef}
                  onScroll={handleSwipeScroll}
                  className="overflow-x-auto pt-1 pb-3 -mx-4 px-4 sm:-mx-6 sm:px-6 snap-x snap-mandatory scroll-smooth overscroll-x-contain touch-pan-x cursor-grab active:cursor-grabbing [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:none]"
                >
                  <div className="flex gap-3.5 py-1" style={{ width: 'max-content' }}>
                    {swipeCards.map((card, idx) => (
                      <div
                        key={card.id || idx}
                        className="w-[78vw] max-w-[285px] sm:w-[310px] flex-shrink-0 snap-start flex flex-col"
                      >
                        <LectureCard card={card} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Symmetrical Dot Indicators for Swipe Cards */}
                {swipeCards.length > 1 && (
                  <div className="flex items-center justify-center gap-1.5 mt-2">
                    {swipeCards.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => scrollToCard(i)}
                        aria-label={`Go to swipe card ${i + 1}`}
                        className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                          activeSwipeIdx === i
                            ? 'w-5 bg-[#1c1c1c]'
                            : 'w-1.5 bg-[#d4cebf] hover:bg-[#a8a193]'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  )
}
