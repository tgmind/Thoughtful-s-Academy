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
  )
}
