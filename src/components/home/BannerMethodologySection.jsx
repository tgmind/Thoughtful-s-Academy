import { useState, useRef } from 'react'
import { Video, MessageSquare, BookOpen, CheckCircle2, GraduationCap, Award } from 'lucide-react'
import { useLandingMedia } from '../../hooks/useLandingMedia'
import { handleImageFallback } from '../../utils/imageOptimizer'

export const METHODOLOGY_CARDS = [
  {
    icon: Video,
    iconBg: 'bg-blue-600',
    iconShadow: 'shadow-[0_4px_12px_rgba(37,99,235,0.3)]',
    border: 'border-sky-200/90 hover:border-sky-400',
    bg: 'bg-gradient-to-br from-sky-50/80 via-white to-white',
    title: 'Live & Recorded Classes',
    desc: 'Attend daily interactive lectures live or stream unlimited 1080p replays at your own pace.',
  },
  {
    icon: MessageSquare,
    iconBg: 'bg-indigo-600',
    iconShadow: 'shadow-[0_4px_12px_rgba(79,70,229,0.3)]',
    border: 'border-indigo-200/90 hover:border-indigo-400',
    bg: 'bg-gradient-to-br from-indigo-50/80 via-white to-white',
    title: 'Personal Doubt Support',
    desc: 'Message your educator directly or ask doubts during video playback for prompt resolution.',
  },
  {
    icon: BookOpen,
    iconBg: 'bg-emerald-600',
    iconShadow: 'shadow-[0_4px_12px_rgba(5,150,105,0.3)]',
    border: 'border-emerald-200/90 hover:border-emerald-400',
    bg: 'bg-gradient-to-br from-emerald-50/80 via-white to-white',
    title: 'Handwritten Notes & DPPs',
    desc: 'Concise formula sheets, chapter notes, and daily practice problem cards for exam readiness.',
  },
  {
    icon: CheckCircle2,
    iconBg: 'bg-rose-600',
    iconShadow: 'shadow-[0_4px_12px_rgba(225,29,72,0.3)]',
    border: 'border-rose-200/90 hover:border-rose-400',
    bg: 'bg-gradient-to-br from-rose-50/80 via-white to-white',
    title: 'Consistency & Attendance',
    desc: 'Daily streak tracking, attendance gauges, and homework deadlines to foster peak consistency.',
  },
]

const CONTAINER = 'max-w-[1440px] 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12'

export default function BannerMethodologySection() {
  const { getSlot } = useLandingMedia()
  const desktopBannerMedia = getSlot('banner_desktop')
  const mobileBannerMedia = getSlot('banner_mobile')

  const scrollRef = useRef(null)
  const [activeIdx, setActiveIdx] = useState(0)

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const cardStep = 270
    const idx = Math.round(el.scrollLeft / cardStep)
    setActiveIdx(Math.min(Math.max(0, idx), METHODOLOGY_CARDS.length - 1))
  }

  const scrollToCard = (i) => {
    const el = scrollRef.current
    if (!el) return
    const cardStep = 270
    el.scrollTo({ left: i * cardStep, behavior: 'smooth' })
  }

  return (
    <section className="relative pt-4 sm:pt-0 pb-14 sm:pb-22 overflow-visible bg-[#fbfaf6]">
      {/* ─── MOBILE SECTION HEADER (CLEAN & CENTERED ABOVE BANNER - NEVER COVERS MENTOR) ─── */}
      <div className="sm:hidden px-4 mb-4 text-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1c1c1c] tracking-tight leading-snug pb-1.5">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-amber-700 to-amber-950 font-black inline-block">
            6+ Years
          </span>{' '}
          <span className="inline-block">of Teaching Experience</span>
        </h2>
        <p className="mt-2.5 text-xs xs:text-sm text-[#444] font-medium leading-[1.6] max-w-sm mx-auto">
          AN{' '}
          <span className="relative inline-flex items-center gap-1 font-black text-sm xs:text-base tracking-tight text-[#1e3a8a] mx-0.5 align-baseline">
            <GraduationCap className="w-3.5 h-3.5 text-[#1e3a8a] shrink-0" />
            <span>NITian</span>
            <span className="absolute -bottom-0.5 inset-x-0 h-[2px] bg-[#1e3a8a] rounded-full" />
          </span>{' '}
          and{' '}
          <span className="relative inline-flex items-center gap-1 font-black text-sm xs:text-base tracking-tight text-[#78350f] mx-0.5 align-baseline">
            <Award className="w-3.5 h-3.5 text-[#b45309] shrink-0" />
            <span>Goldmedalist</span>
            <span className="absolute -bottom-0.5 inset-x-0 h-[2px] bg-[#b45309] rounded-full shadow-[0_0_4px_rgba(180,83,9,0.3)]" />
          </span>{' '}
          brings the best learning experience right to your fingertips...
        </p>
      </div>

      {/* ─── FULL-WIDTH PANORAMIC BANNER (PINNED TO TOP ON DESKTOP - HEAD NEVER CHOPPED) ─── */}
      <div className="relative w-full overflow-hidden bg-gradient-to-r from-[#f6ebe2] via-[#f7f4ed] to-[#151c2e]">
        <picture>
          {/* Desktop & Tablet Widescreen Source */}
          <source
            media="(min-width: 641px)"
            type="image/webp"
            srcSet={
              desktopBannerMedia?.is_custom
                ? (desktopBannerMedia.desktop_url || '/banner.webp')
                : '/banner-720.webp 720w, /banner-1200.webp 1200w, /banner.webp 2172w'
            }
            sizes="100vw"
          />
          {/* Mobile Art-Directed Panoramic Source */}
          <source
            media="(max-width: 640px)"
            type="image/webp"
            srcSet={
              mobileBannerMedia?.is_custom
                ? (mobileBannerMedia.mobile_url || mobileBannerMedia.desktop_url || '/banner-mobile.webp')
                : '/banner-mobile-600.webp 600w, /banner-mobile.webp 1100w'
            }
            sizes="100vw"
          />
          <img
            src={
              desktopBannerMedia?.is_custom
                ? (desktopBannerMedia.desktop_url || '/banner.png')
                : '/banner.png'
            }
            alt={desktopBannerMedia?.alt_text || 'GRAViTON PHYSICS Pedagogy & Mentorship'}
            width="2172"
            height="724"
            loading="lazy"
            decoding="async"
            className="w-full h-[240px] sm:h-[400px] md:h-[460px] lg:h-[500px] xl:h-[560px] 2xl:h-[600px] object-cover object-center sm:object-top select-none"
            style={{
              objectPosition: desktopBannerMedia?.object_position || 'center top',
            }}
            onError={(e) => handleImageFallback(e, '/banner.png')}
          />
        </picture>

        {/* Desktop Overlay Content (Positioned in CONTAINER on open left quadrant, >=sm only) */}
        <div className="hidden sm:block absolute inset-0 pointer-events-none z-10">
          <div className={`${CONTAINER} h-full flex flex-col justify-center`}>
            <div className="max-w-lg lg:max-w-xl xl:max-w-2xl pb-16 lg:pb-20">
              <h2 className="text-3xl sm:text-4xl lg:text-[44px] xl:text-[48px] font-extrabold text-[#1c1c1c] tracking-[-0.025em] leading-[1.3] sm:leading-[1.28] lg:leading-[1.25] pb-1.5">
                <span className="relative inline-block text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-amber-700 to-amber-950 font-black drop-shadow-xs">
                  6+ Years
                </span>{' '}
                <span className="text-[#1c1c1c]">of Teaching Experience</span>
              </h2>
              <p className="mt-4 sm:mt-5 text-base sm:text-lg lg:text-[20px] text-[#2d2d2b] font-medium leading-[1.65]">
                AN{' '}
                <span className="relative inline-flex items-center gap-1.5 font-black text-xl sm:text-2xl lg:text-[25px] tracking-tight text-[#1e3a8a] mx-1 align-baseline group">
                  <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-[#1e3a8a] shrink-0 inline-block" />
                  <span>NITian</span>
                  <span className="absolute -bottom-1 inset-x-0 h-[2.5px] bg-[#1e3a8a] rounded-full" />
                </span>{' '}
                and{' '}
                <span className="relative inline-flex items-center gap-1.5 font-black text-xl sm:text-2xl lg:text-[25px] tracking-tight text-[#78350f] mx-1 align-baseline group">
                  <Award className="w-4 h-4 sm:w-5 sm:h-5 text-[#b45309] shrink-0 inline-block" />
                  <span>Goldmedalist</span>
                  <span className="absolute -bottom-1 inset-x-0 h-[2.5px] bg-[#b45309] rounded-full shadow-[0_0_6px_rgba(180,83,9,0.35)]" />
                </span>{' '}
                brings the best learning experience right to your fingertips...
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── OVERLAPPING INFO CARDS (OVERLAPPING BANNER BOTTOM MARGIN ONLY) ─── */}
      <div className="relative -mt-6 sm:-mt-16 lg:-mt-20 xl:-mt-24 z-20">
        <div className={CONTAINER}>
          {/* Track: Swipeable carousel on mobile (<sm), 4-col responsive grid on tablet/desktop (>=sm) */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5 lg:gap-6 overflow-x-auto sm:overflow-visible sm:overflow-x-visible snap-x snap-mandatory touch-manipulation overscroll-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 py-2 sm:py-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] [-webkit-overflow-scrolling:touch]"
          >
            {METHODOLOGY_CARDS.map((card) => {
              const Icon = card.icon
              return (
                <div
                  key={card.title}
                  className={`p-5 sm:p-6 rounded-2xl sm:rounded-3xl border ${card.border} ${card.bg} transition-all duration-300 shadow-[0_8px_24px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_16px_36px_rgba(0,0,0,0.1)] hover:-translate-y-1.5 flex flex-col justify-between w-[80vw] max-w-[290px] shrink-0 sm:w-auto sm:shrink sm:max-w-none snap-start backdrop-blur-md group`}
                >
                  <div>
                    {/* Squircle Color Icon */}
                    <div
                      className={`w-11 h-11 rounded-2xl ${card.iconBg} ${card.iconShadow} text-white flex items-center justify-center mb-3.5 transition-transform duration-300 group-hover:scale-105`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    {/* Card Title */}
                    <h3 className="font-bold text-sm sm:text-base text-[#1c1c1c] tracking-tight mb-1.5">
                      {card.title}
                    </h3>

                    {/* Card Description */}
                    <p className="text-xs sm:text-[13px] text-[#555] leading-relaxed">
                      {card.desc}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Mobile Swipe Pagination Indicator Dots (Hidden on sm and larger) */}
          <div className="flex sm:hidden items-center justify-center gap-1.5 mt-3 pt-1">
            {METHODOLOGY_CARDS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => scrollToCard(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  activeIdx === i ? 'w-5 bg-[#1c1c1c]' : 'w-1.5 bg-[#1c1c1c]/25'
                }`}
                aria-label={`Go to methodology card ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
