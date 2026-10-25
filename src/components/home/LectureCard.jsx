import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BookOpen, PlayCircle, ExternalLink, Sparkles, Youtube } from 'lucide-react'
import { getYouTubeThumbnail } from '../../utils/formatters'

function getThumbnail(url) {
  return getYouTubeThumbnail(url)
}

export default function LectureCard({ card, isFeaturedCard = false }) {
  const navigate = useNavigate()
  const thumb = card.thumbnail_url || getThumbnail(card.url)
  const isExternal = card.type === 'external_link'
  const desc = card.description?.trim() || ''

  const handleOpen = (e) => {
    if (e) e.stopPropagation()
    if (!isExternal) {
      navigate(`/watch/${card.id}`, { state: { card } })
    } else {
      window.open(card.url, '_blank', 'noopener,noreferrer')
    }
  }

  const handleCardClick = (e) => {
    if (e.target.closest('a') || e.target.closest('button')) return
    handleOpen()
  }

  return (
    <motion.div
      whileHover={{ y: -5, transition: { type: 'spring', stiffness: 350, damping: 25 } }}
      whileTap={{ scale: 0.98 }}
      onClick={handleCardClick}
      className={`group relative bg-white rounded-2xl sm:rounded-3xl border ${
        isFeaturedCard
          ? 'border-white/20 hover:border-indigo-400/80 shadow-[0_10px_30px_rgba(0,0,0,0.5)] hover:shadow-[0_18px_40px_rgba(99,102,241,0.25)]'
          : 'border-[#e2ddd1] hover:border-[#1c1c1c]'
      } overflow-hidden transition-all duration-300 flex flex-col w-full h-full justify-between cursor-pointer shadow-[0_4px_20px_rgba(28,28,28,0.05)] hover:shadow-[0_20px_40px_rgba(28,28,28,0.12)] p-3 sm:p-3.5`}
    >
      {/* Thumbnail Frame */}
      <div className="relative aspect-video w-full overflow-hidden rounded-xl sm:rounded-2xl bg-[#141414] shrink-0">
        {thumb ? (
          <img
            src={thumb}
            alt={card.title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-[#f7f4ed] flex items-center justify-center">
            <BookOpen className="h-8 w-8 text-[#5f5f5d]/60" />
          </div>
        )}

        {/* Ambient dark vignette on hover */}
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/35 transition-colors duration-300 pointer-events-none" />

        {/* Centered Play Trigger */}
        {!isExternal ? (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-12 h-12 rounded-full bg-white/95 text-[#1c1c1c] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 border border-white/60">
              <PlayCircle className="h-6 w-6 ml-0.5 text-[#1c1c1c]" />
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <ExternalLink className="h-5 w-5" />
            </div>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 pointer-events-none max-w-[calc(100%-60px)]">
          {card.is_featured && (
            <span className="inline-flex items-center gap-1 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs border border-white/20 shrink-0">
              <Sparkles className="w-2.5 h-2.5 fill-white" />
              <span>Featured</span>
            </span>
          )}
          {card.subject && (
            <span className="bg-black/70 backdrop-blur-md text-white text-[10.5px] font-semibold px-2.5 py-0.5 rounded-lg border border-white/20 truncate">
              {card.subject}
            </span>
          )}
        </div>

        {/* Top Right: HD indicator */}
        <div className="absolute top-2.5 right-2.5 pointer-events-none shrink-0">
          <span className="bg-black/70 backdrop-blur-md text-white/90 text-[9.5px] font-bold px-2 py-0.5 rounded-md border border-white/10 uppercase tracking-wider">
            {!isExternal ? '1080p' : 'PDF'}
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-3 sm:p-3.5 flex flex-col justify-between flex-1 pt-3.5">
        <div>
          <h3 className="font-bold text-[#1c1c1c] text-sm sm:text-base leading-snug line-clamp-2 min-h-[2.5rem] tracking-tight group-hover:text-indigo-600 transition-colors">
            {card.title}
          </h3>
          <p className="text-xs sm:text-[13px] text-[#5f5f5d] leading-relaxed line-clamp-2 mt-1.5 min-h-[2rem]">
            {desc || 'Structured video lecture for thorough conceptual clarity.'}
          </p>
        </div>

        {/* Card Footer Bar */}
        <div className="pt-3 border-t border-[#f0ede6] shrink-0 flex items-center justify-between mt-3 gap-2">
          <span className="text-[11px] font-medium text-[#5f5f5d] truncate flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0" />
            <span>{!isExternal ? 'Free Video' : 'Reference Notes'}</span>
          </span>

          <button
            type="button"
            onClick={handleOpen}
            className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full bg-[#1c1c1c] group-hover:bg-[#2c2c2c] text-[#fcfbf8] text-[11px] sm:text-xs font-semibold transition-all duration-200 shadow-2xs group-hover:shadow-xs active:scale-95 cursor-pointer shrink-0"
          >
            {!isExternal ? (
              <>
                <Youtube className="h-3.5 w-3.5 text-red-400 shrink-0" />
                <span className="whitespace-nowrap">Watch lecture</span>
              </>
            ) : (
              <>
                <ExternalLink className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                <span className="whitespace-nowrap">Open material</span>
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  )
}
