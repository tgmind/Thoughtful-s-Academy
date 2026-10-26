import { useIsDesktop } from '../hooks/useDevice'
import BatchDetailsDesktop from './BatchDetailsDesktop'
import BatchDetailsMobile from './BatchDetailsMobile'

/**
 * BatchDetails - Viewport Responsive Coordinator
 *
 * Segregates Desktop UI and Mobile/Tablet UI into dedicated files:
 * - Desktop View (>= 1024px): src/pages/BatchDetailsDesktop.jsx
 * - Mobile & Tablet View (< 1024px): src/pages/BatchDetailsMobile.jsx
 *
 * Allows independent layout and design customization while preserving 100%
 * functionality and exact visual parity.
 */
export default function BatchDetails(props) {
  const isDesktop = useIsDesktop()
  const isDesktopMode = props.device ? props.device === 'desktop' : isDesktop

  return isDesktopMode ? (
    <BatchDetailsDesktop {...props} />
  ) : (
    <BatchDetailsMobile {...props} />
  )
}
