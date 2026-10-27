import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import LectureCard from './LectureCard'

export default function AllLecturesDesktop({
  visibleCards = [],
  getCardWidthClass,
  totalPages = 1,
  page = 1,
  setPage,
}) {
  return (
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
              className={`${getCardWidthClass ? getCardWidthClass(visibleCards.length) : 'w-full sm:w-[calc(50%-12px)] lg:w-[calc(50%-12px)] 2xl:w-[calc(33.333%-16px)] max-w-[470px]'} flex flex-col`}
            >
              <LectureCard card={card} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center mt-10 relative z-10">
          <div className="inline-flex items-center gap-1.5 p-1.5 rounded-full bg-white/95 backdrop-blur-md border border-[#ded8cb] shadow-[0_2px_8px_rgba(28,28,28,0.06),0_1px_2px_rgba(28,28,28,0.04)]">
            <motion.button
              type="button"
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-8 h-8 rounded-full text-[#1c1c1c] hover:bg-[#f4efe4] disabled:opacity-20 disabled:hover:bg-transparent flex items-center justify-center transition-colors cursor-pointer"
              title="Previous page"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </motion.button>
            {[...Array(totalPages)].map((_, i) => (
              <motion.button
                key={i}
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={() => setPage(i + 1)}
                className={`w-8 h-8 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                  page === i + 1
                    ? 'bg-[#1c1c1c] text-[#fcfbf8] shadow-xs'
                    : 'text-[#1c1c1c] hover:bg-[#f4efe4]'
                }`}
                aria-label={`Go to page ${i + 1}`}
                aria-current={page === i + 1 ? 'page' : undefined}
              >
                {i + 1}
              </motion.button>
            ))}
            <motion.button
              type="button"
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
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
