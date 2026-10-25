import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Layers } from 'lucide-react'
import LectureCard from './LectureCard'

export default function AllLecturesMobile({
  cards = [],
  activeBatch = 'all',
  sectionRef,
}) {
  const [mobilePage, setMobilePage] = useState(1)
  const MOBILE_PAGE_SIZE = 4

  // Reset to page 1 whenever batch filter changes
  useEffect(() => {
    setMobilePage(1)
  }, [activeBatch])

  const totalMobilePages = Math.max(1, Math.ceil(cards.length / MOBILE_PAGE_SIZE))

  // Keep mobilePage in bounds if cards change
  useEffect(() => {
    if (mobilePage > totalMobilePages) {
      setMobilePage(1)
    }
  }, [totalMobilePages, mobilePage])

  const currentCards = cards.slice(
    (mobilePage - 1) * MOBILE_PAGE_SIZE,
    mobilePage * MOBILE_PAGE_SIZE
  )

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalMobilePages || newPage === mobilePage) return
    setMobilePage(newPage)

    // Smoothly ensure the top of the lectures section is visible when page changes
    if (sectionRef?.current) {
      const rect = sectionRef.current.getBoundingClientRect()
      if (rect.top < 0) {
        sectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }

  const getMobileCardWidthClass = (count) => {
    if (count === 1) return 'w-full max-w-md mx-auto'
    if (count === 2 || count === 4) return 'w-full sm:w-[calc(50%-10px)] max-w-[420px]'
    return 'w-full sm:w-[calc(50%-10px)] max-w-[420px]'
  }

  return (
    <div className="lg:hidden relative z-10 space-y-6">
      {/* Symmetrical Mini Header Pager for Mobile when multiple pages exist */}
      {totalMobilePages > 1 && (
        <div className="flex items-center justify-between gap-3 px-1 py-1">
          <div className="flex items-center gap-2 text-xs text-[#71717a] font-medium min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="truncate">
              Showing {(mobilePage - 1) * MOBILE_PAGE_SIZE + 1}–
              {Math.min(mobilePage * MOBILE_PAGE_SIZE, cards.length)} of {cards.length} lectures
            </span>
          </div>

          {/* Luxury Floating Pill Pager (prevents text wrapping and delivers tactile micro-interactions) */}
          <div className="inline-flex items-center gap-1 bg-white/95 backdrop-blur-md p-1 rounded-full border border-[#ded8cb] shadow-[0_2px_8px_rgba(28,28,28,0.06),0_1px_2px_rgba(28,28,28,0.04)] shrink-0">
            <motion.button
              type="button"
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => handlePageChange(mobilePage - 1)}
              disabled={mobilePage === 1}
              className="w-7 h-7 rounded-full text-[#1c1c1c] hover:bg-[#f4efe4] disabled:opacity-20 disabled:hover:bg-transparent flex items-center justify-center transition-colors cursor-pointer"
              title="Previous"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5 stroke-[2.25]" />
            </motion.button>
            <span className="text-xs font-bold text-[#1c1c1c] px-2.5 py-0.5 rounded-full bg-[#f6f2e9] border border-[#e5dfd2] tabular-nums whitespace-nowrap shadow-2xs select-none">
              {mobilePage} / {totalMobilePages}
            </span>
            <motion.button
              type="button"
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => handlePageChange(mobilePage + 1)}
              disabled={mobilePage === totalMobilePages}
              className="w-7 h-7 rounded-full text-[#1c1c1c] hover:bg-[#f4efe4] disabled:opacity-20 disabled:hover:bg-transparent flex items-center justify-center transition-colors cursor-pointer"
              title="Next"
              aria-label="Next page"
            >
              <ChevronRight className="h-3.5 w-3.5 stroke-[2.25]" />
            </motion.button>
          </div>
        </div>
      )}

      {/* Symmetrical Card Grid: Maximum 4 lectures per page */}
      <motion.div
        layout
        className="flex flex-wrap justify-center gap-4 sm:gap-5 items-stretch"
      >
        <AnimatePresence mode="popLayout">
          {currentCards.map((card, idx) => (
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
              className={`${getMobileCardWidthClass(currentCards.length)} flex flex-col`}
            >
              <LectureCard card={card} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Symmetrical Bottom Numbered Pagination (matching Luxury Pill aesthetics) */}
      {totalMobilePages > 1 && (
        <div className="flex items-center justify-center mt-8 pt-4 border-t border-[#e8e2d5]/60 relative z-10">
          <div className="inline-flex items-center gap-1.5 p-1.5 rounded-full bg-white/95 backdrop-blur-md border border-[#ded8cb] shadow-[0_2px_8px_rgba(28,28,28,0.06),0_1px_2px_rgba(28,28,28,0.04)]">
            <motion.button
              type="button"
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => handlePageChange(mobilePage - 1)}
              disabled={mobilePage === 1}
              className="w-8 h-8 rounded-full text-[#1c1c1c] hover:bg-[#f4efe4] disabled:opacity-20 disabled:hover:bg-transparent flex items-center justify-center transition-colors cursor-pointer"
              title="Previous page"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </motion.button>

            {[...Array(totalMobilePages)].map((_, i) => (
              <motion.button
                key={i}
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={() => handlePageChange(i + 1)}
                className={`w-8 h-8 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                  mobilePage === i + 1
                    ? 'bg-[#1c1c1c] text-[#fcfbf8] shadow-xs'
                    : 'text-[#1c1c1c] hover:bg-[#f4efe4]'
                }`}
                aria-label={`Go to page ${i + 1}`}
                aria-current={mobilePage === i + 1 ? 'page' : undefined}
              >
                {i + 1}
              </motion.button>
            ))}

            <motion.button
              type="button"
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => handlePageChange(mobilePage + 1)}
              disabled={mobilePage === totalMobilePages}
              className="w-8 h-8 rounded-full text-[#1c1c1c] hover:bg-[#f4efe4] disabled:opacity-20 disabled:hover:bg-transparent flex items-center justify-center transition-colors cursor-pointer"
              title="Next page"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </motion.button>
          </div>
        </div>
      )}
    </div>
  )
}
