import { useIsDesktop } from '../../hooks/useDevice'
import LiveClassDesktop from './LiveClassDesktop'
import LiveClassMobile from './LiveClassMobile'

/**
 * LiveClass - Viewport Responsive Coordinator
 *
 * Segregates Desktop UI and Mobile/Tablet UI into dedicated files:
 * - Desktop View (>= 1024px): src/pages/teacher/LiveClassDesktop.jsx
 * - Mobile & Tablet View (< 1024px): src/pages/teacher/LiveClassMobile.jsx
 *
 * Allows independent layout and design customization while preserving 100%
 * functionality and exact visual parity.
 */
export default function LiveClass(props) {
  const isDesktop = useIsDesktop()
  const isDesktopMode = props.device ? props.device === 'desktop' : isDesktop

  return isDesktopMode ? (
    <LiveClassDesktop {...props} />
  ) : (
    <LiveClassMobile {...props} />
  )
}
