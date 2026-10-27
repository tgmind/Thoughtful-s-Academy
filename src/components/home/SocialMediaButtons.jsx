import React, { useState, useEffect } from 'react'
import { ExternalLink, Globe } from 'lucide-react'
import { fetchPublicSocialLinks } from '../../services/socialLinksService'

// High-fidelity vector glyphs for major social media platforms
export function PlatformIcon({ platform, className = "w-5 h-5 shrink-0" }) {
  const norm = (platform || '').toLowerCase().trim()

  if (norm === 'youtube') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    )
  }

  if (norm === 'whatsapp') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.301-.15-1.78-.878-2.056-.979-.276-.1-.476-.15-.677.15-.2.301-.777.979-.953 1.18-.175.201-.351.226-.652.075-.301-.15-1.272-.469-2.423-1.496-.897-.798-1.502-1.784-1.678-2.085-.175-.301-.019-.464.132-.614.136-.135.301-.351.452-.527.15-.175.2-.301.3-.501.101-.2.051-.376-.025-.527-.075-.15-.677-1.631-.928-2.233-.244-.585-.492-.506-.677-.515-.175-.009-.376-.009-.577-.009s-.527.075-.803.376c-.276.301-1.054 1.03-1.054 2.512s1.079 2.914 1.23 3.115c.15.201 2.124 3.243 5.147 4.549.719.311 1.28.497 1.718.636.723.23 1.381.198 1.901.12.58-.088 1.78-.727 2.031-1.43.251-.703.251-1.305.176-1.43-.075-.125-.276-.201-.577-.351zm-5.467 7.618H12c-1.802 0-3.566-.484-5.11-1.402l-.367-.218-3.799.996 1.014-3.704-.239-.38A9.957 9.957 0 0 1 2.004 12c0-5.514 4.486-10 10-10 2.671 0 5.183 1.04 7.071 2.929 1.889 1.889 2.929 4.4 2.929 7.071 0 5.514-4.486 10-10 10zm8.485-18.485C18.196 1.218 15.215 0 12 0 5.383 0 0 5.383 0 12c0 2.115.553 4.181 1.603 5.998L0 24l6.177-1.621A11.942 11.942 0 0 0 12 24c6.617 0 12-5.383 12-12 0-3.215-1.218-6.196-3.515-8.485z"/>
      </svg>
    )
  }

  if (norm === 'telegram') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.197 1.006.128.832.942z"/>
      </svg>
    )
  }

  if (norm === 'instagram') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    )
  }

  if (norm === 'playstore' || norm === 'googleplay') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M3.609 1.814L13.792 12 3.61 22.186a2.03 2.03 0 0 1-.61-.926V2.74c0-.348.226-.684.61-.926zm11.238 11.24l2.122 2.123-11.86 6.84 9.738-8.963zm0-2.108L5.109 1.982l11.86 6.842-2.122 2.122zm1.085 1.054l3.528 2.037a1.68 1.68 0 0 0 0-2.92l-3.528-2.037 1.054 1.054 1.054 1.054-.108.812z"/>
      </svg>
    )
  }

  return <Globe className={className} />
}

// Visual color schemes mapped to each platform
export function getPlatformTheme(platform) {
  const norm = (platform || '').toLowerCase().trim()

  switch (norm) {
    case 'youtube':
      return {
        badgeBg: 'bg-red-50 text-red-600 border-red-200/80 group-hover:bg-red-600 group-hover:text-white group-hover:border-red-600',
        hoverBorder: 'hover:border-red-400 hover:shadow-[0_10px_24px_-4px_rgba(239,68,68,0.22)]',
        accentColor: '#dc2626',
      }
    case 'whatsapp':
      return {
        badgeBg: 'bg-emerald-50 text-emerald-600 border-emerald-200/80 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600',
        hoverBorder: 'hover:border-emerald-400 hover:shadow-[0_10px_24px_-4px_rgba(16,185,129,0.22)]',
        accentColor: '#16a34a',
      }
    case 'telegram':
      return {
        badgeBg: 'bg-sky-50 text-sky-600 border-sky-200/80 group-hover:bg-sky-500 group-hover:text-white group-hover:border-sky-500',
        hoverBorder: 'hover:border-sky-400 hover:shadow-[0_10px_24px_-4px_rgba(14,165,233,0.22)]',
        accentColor: '#0284c7',
      }
    case 'instagram':
      return {
        badgeBg: 'bg-pink-50 text-pink-600 border-pink-200/80 group-hover:bg-gradient-to-tr group-hover:from-amber-500 group-hover:via-rose-600 group-hover:to-purple-600 group-hover:text-white group-hover:border-transparent',
        hoverBorder: 'hover:border-rose-400 hover:shadow-[0_10px_24px_-4px_rgba(244,63,94,0.22)]',
        accentColor: '#e11d48',
      }
    case 'playstore':
    case 'googleplay':
      return {
        badgeBg: 'bg-indigo-50 text-indigo-600 border-indigo-200/80 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600',
        hoverBorder: 'hover:border-indigo-400 hover:shadow-[0_10px_24px_-4px_rgba(99,102,241,0.22)]',
        accentColor: '#4f46e5',
      }
    default:
      return {
        badgeBg: 'bg-slate-100 text-slate-700 border-slate-200 group-hover:bg-slate-800 group-hover:text-white group-hover:border-slate-800',
        hoverBorder: 'hover:border-slate-400 hover:shadow-[0_10px_24px_-4px_rgba(15,23,42,0.18)]',
        accentColor: '#1e293b',
      }
  }
}

/**
 * SocialMediaButtons
 * Modern, medium-sized, tactile interactive social channel buttons
 * Placed beneath the philosophy sentence at the bottom of the landing page.
 */
export default function SocialMediaButtons({ className = "" }) {
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadLinks() {
      try {
        const data = await fetchPublicSocialLinks()
        if (isMounted) {
          const list = Array.isArray(data) ? data : []
          setLinks(list.filter(item => item && item.url && item.url.trim()))
          setLoading(false)
        }
      } catch (err) {
        if (isMounted) {
          setLinks([])
          setLoading(false)
        }
      }
    }

    loadLinks()
    return () => { isMounted = false }
  }, [])

  if (loading) {
    // Subtle skeleton placeholders of matching medium size
    return (
      <div className={`flex flex-wrap items-center justify-center gap-2.5 sm:gap-3.5 pt-6 pb-2 ${className}`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-11 w-32 rounded-2xl bg-black/5 animate-pulse border border-[#e5dfd2]"
          />
        ))}
      </div>
    )
  }

  if (!links || !Array.isArray(links) || links.length === 0) {
    return null
  }

  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-2.5 sm:gap-3.5 pt-6 pb-2 max-w-4xl mx-auto ${className}`}
      aria-label="Official Social Media Channels"
    >
      {links.map((item) => {
        const theme = getPlatformTheme(item.platform)

        return (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Visit our official ${item.title || item.platform} channel`}
            className={`group inline-flex items-center gap-2.5 px-4 sm:px-4.5 py-2.5 rounded-2xl bg-white/90 hover:bg-white border border-[#ded9cb] ${theme.hoverBorder} text-[#1c1c1c] text-xs sm:text-sm font-semibold tracking-tight transition-all duration-200 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] select-none`}
          >
            {/* Platform Emblem Badge */}
            <span
              className={`w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-xl flex items-center justify-center border transition-all duration-200 shrink-0 ${theme.badgeBg}`}
            >
              <PlatformIcon platform={item.platform} className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </span>

            {/* Platform Title */}
            <span className="truncate max-w-[130px] sm:max-w-[160px] group-hover:text-[#0a0a0a] transition-colors">
              {item.title}
            </span>

            {/* Subtle outward glyph indicator */}
            <ExternalLink className="w-3 h-3 text-[#5f5f5d]/50 group-hover:text-[#1c1c1c] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
          </a>
        )
      })}
    </div>
  )
}
