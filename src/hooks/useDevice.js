import { useState, useEffect } from 'react'

/**
 * useDevice Hook
 * Returns reactive booleans indicating whether the current viewport
 * corresponds to Desktop (>= 1024px, Tailwind 'lg') or Mobile & Tablet (< 1024px).
 *
 * This provides clean device-based rendering separation so Mobile/Tablet and Desktop
 * layouts can be tweaked independently in distinct files.
 */
export function useDevice(desktopBreakpoint = 1024) {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.innerWidth >= desktopBreakpoint
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (typeof window.matchMedia !== 'function') {
      const handleResize = () => {
        setIsDesktop(window.innerWidth >= desktopBreakpoint)
      }
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }

    const media = window.matchMedia(`(min-width: ${desktopBreakpoint}px)`)
    const update = (e) => setIsDesktop(e.matches)

    setIsDesktop(media.matches)

    if (media.addEventListener) {
      media.addEventListener('change', update)
      return () => media.removeEventListener('change', update)
    } else if (media.addListener) {
      media.addListener(update)
      return () => media.removeListener(update)
    }
  }, [desktopBreakpoint])

  return {
    isDesktop,
    isMobile: !isDesktop, // true for Mobile and Tablet (< 1024px)
    isTablet: !isDesktop, // Tablet & Mobile fall under the Mobile/Tablet layout category
  }
}

export function useIsDesktop(desktopBreakpoint = 1024) {
  return useDevice(desktopBreakpoint).isDesktop
}
