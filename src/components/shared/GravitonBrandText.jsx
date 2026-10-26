import React from 'react'

/**
 * GravitonBrandText
 * High-craft, art-directed typographic rendering of the institute brand name:
 * "GRAViTON PHYSICS" (exact letter casing)
 *
 * Features:
 * - Geometric Poppins typography with optical kerning
 * - Vibrant physics quantum dot (luminous cyan tittle with subtle aura)
 * - Accessible DOM tree with full screen-reader label & copy-paste fidelity
 */
export default function GravitonBrandText({
  name = 'GRAViTON PHYSICS',
  variant = 'nav', // 'nav' | 'hero' | 'hero-mobile' | 'subtle'
  className = '',
  halo = true,
}) {
  // If a custom name that is not GRAViTON PHYSICS is provided, render plain text safely
  if (name && name !== 'GRAViTON PHYSICS' && !name.includes('GRAViTON')) {
    return <span className={className}>{name}</span>
  }
  if (variant === 'hero') {
    return (
      <span
        className={`inline-flex items-baseline font-display font-extrabold tracking-[-0.025em] text-[#1c1c1c] ${className}`}
        aria-label="GRAViTON PHYSICS"
      >
        <span aria-hidden="true" className="inline-flex items-baseline select-none">
          <span>GRAV</span>
          <span className="relative inline-block mx-[0.5px]">
            {halo && (
              <span
                className="absolute top-[6%] left-1/2 -translate-x-1/2 w-[0.42em] h-[0.42em] rounded-full bg-sky-400/30 blur-[4px] pointer-events-none"
                aria-hidden="true"
              />
            )}
            <span
              className="inline-block bg-gradient-to-b from-[#0284c7] via-[#0ea5e9] via-[32%] to-[#1c1c1c] to-[34%] bg-clip-text text-transparent filter drop-shadow-[0_0_10px_rgba(14,165,233,0.35)]"
            >
              i
            </span>
          </span>
          <span>TON</span>
          <span className="ml-[0.24em] font-extrabold tracking-[0.03em] text-[#1c1c1c]">
            PHYSICS
          </span>
        </span>
        <span className="sr-only">GRAViTON PHYSICS</span>
      </span>
    )
  }

  if (variant === 'hero-mobile') {
    return (
      <span
        className={`inline-flex items-baseline font-display font-black tracking-[-0.025em] text-[#1c1c1c] ${className}`}
        aria-label="GRAViTON PHYSICS"
      >
        <span aria-hidden="true" className="inline-flex items-baseline select-none">
          <span>GRAV</span>
          <span className="relative inline-block mx-[0.5px]">
            {halo && (
              <span
                className="absolute top-[6%] left-1/2 -translate-x-1/2 w-[0.42em] h-[0.42em] rounded-full bg-sky-400/35 blur-[3px] pointer-events-none"
                aria-hidden="true"
              />
            )}
            <span
              className="inline-block bg-gradient-to-b from-[#0284c7] via-[#0ea5e9] via-[32%] to-[#1c1c1c] to-[34%] bg-clip-text text-transparent filter drop-shadow-[0_0_8px_rgba(14,165,233,0.35)]"
            >
              i
            </span>
          </span>
          <span>TON</span>
          <span className="ml-[0.22em] font-black tracking-[0.03em] text-[#1c1c1c]">
            PHYSICS
          </span>
        </span>
        <span className="sr-only">GRAViTON PHYSICS</span>
      </span>
    )
  }

  // Default: 'nav' (Top navigation bar scale)
  return (
    <span
      className={`inline-flex items-baseline font-display font-bold tracking-tight text-[#1c1c1c] ${className}`}
      aria-label="GRAViTON PHYSICS"
    >
      <span aria-hidden="true" className="inline-flex items-baseline select-none">
        <span>GRAV</span>
        <span className="relative inline-block mx-[0.2px]">
          {halo && (
            <span
              className="absolute top-[8%] left-1/2 -translate-x-1/2 w-[0.38em] h-[0.38em] rounded-full bg-sky-400/30 blur-[2px] pointer-events-none"
              aria-hidden="true"
            />
          )}
          <span
            className="inline-block bg-gradient-to-b from-[#0284c7] via-[#0ea5e9] via-[32%] to-[#1c1c1c] to-[34%] bg-clip-text text-transparent"
          >
            i
          </span>
        </span>
        <span>TON</span>
        <span className="ml-[0.22em] font-bold tracking-[0.02em] text-[#1c1c1c]">
          PHYSICS
        </span>
      </span>
      <span className="sr-only">GRAViTON PHYSICS</span>
    </span>
  )
}
