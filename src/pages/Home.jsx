import { useIsDesktop } from '../hooks/useDevice'
import HomeDesktop from './HomeDesktop'
import HomeMobile from './HomeMobile'

/**
 * Public Landing Page - Dynamic Viewport Coordinator
 *
 * Segregates Desktop UI and Mobile/Tablet UI into dedicated files:
 * - Desktop View (>= 1024px): src/pages/HomeDesktop.jsx
 * - Mobile & Tablet View (< 1024px): src/pages/HomeMobile.jsx
 *
 * Allows independent layout and design customization while preserving 100%
 * functionality and exact visual parity.
 */
export default function Home(props) {
  const isDesktop = useIsDesktop()
  const isDesktopMode = props.device ? props.device === 'desktop' : isDesktop

  return isDesktopMode ? (
    <HomeDesktop {...props} />
  ) : (
    <HomeMobile {...props} />
  )
}
