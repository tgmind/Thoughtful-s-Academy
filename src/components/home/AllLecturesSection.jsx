import { motion } from 'framer-motion'
import { BookOpen, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react'
import SkeletonCard from './SkeletonCard'
import AllLecturesDesktop from './AllLecturesDesktop'
import AllLecturesMobile from './AllLecturesMobile'

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

          {/* Desktop compact header pager (Luxury Pill Design) */}
          {totalPages > 1 && (
            <div className="hidden lg:inline-flex items-center gap-1 self-end sm:self-auto bg-white/95 backdrop-blur-md p-1 rounded-full border border-[#ded8cb] shadow-[0_2px_8px_rgba(28,28,28,0.06),0_1px_2px_rgba(28,28,28,0.04)] shrink-0">
              <motion.button
                type="button"
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-7 h-7 rounded-full text-[#1c1c1c] hover:bg-[#f4efe4] disabled:opacity-20 disabled:hover:bg-transparent flex items-center justify-center transition-colors cursor-pointer"
                title="Previous"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-3.5 w-3.5 stroke-[2.25]" />
              </motion.button>
              <span className="text-xs font-bold text-[#1c1c1c] px-2.5 py-0.5 rounded-full bg-[#f6f2e9] border border-[#e5dfd2] tabular-nums whitespace-nowrap shadow-2xs select-none">
                {page} / {totalPages}
              </span>
              <motion.button
                type="button"
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-7 h-7 rounded-full text-[#1c1c1c] hover:bg-[#f4efe4] disabled:opacity-20 disabled:hover:bg-transparent flex items-center justify-center transition-colors cursor-pointer"
                title="Next"
                aria-label="Next page"
              >
                <ChevronRight className="h-3.5 w-3.5 stroke-[2.25]" />
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
              className={`${getCardWidthClass ? getCardWidthClass(dynamicPageSize || 6) : 'w-full sm:w-[calc(50%-12px)] lg:w-[calc(50%-12px)] 2xl:w-[calc(33.333%-16px)] max-w-[470px]'} flex flex-col`}
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
          {/* Desktop View (hidden lg:block): 100% untouched & identical */}
          <AllLecturesDesktop
            visibleCards={visibleCards}
            getCardWidthClass={getCardWidthClass}
            totalPages={totalPages}
            page={page}
            setPage={setPage}
          />

          {/* Mobile View (lg:hidden): Max 4 cards per page with symmetrical pagination */}
          <AllLecturesMobile
            cards={cards}
            activeBatch={activeBatch}
            sectionRef={sectionRef}
          />
        </>
      )}
    </section>
  )
}
