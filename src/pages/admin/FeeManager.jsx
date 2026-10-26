import { useIsDesktop } from '../../hooks/useDevice'
import FeeManagerDesktop from './FeeManagerDesktop'
import FeeManagerMobile from './FeeManagerMobile'

/**
 * FeeManager - Viewport Responsive Coordinator
 *
 * Segregates Desktop UI and Mobile/Tablet UI into dedicated files:
 * - Desktop View (>= 1024px): src/pages/admin/FeeManagerDesktop.jsx
 * - Mobile & Tablet View (< 1024px): src/pages/admin/FeeManagerMobile.jsx
 *
 * Allows independent layout and design customization while preserving 100%
 * functionality and exact visual parity.
 */
export default function FeeManager(props) {
  const isDesktop = useIsDesktop()
  const isDesktopMode = props.device ? props.device === 'desktop' : isDesktop

  return isDesktopMode ? (
    <FeeManagerDesktop {...props} />
  ) : (
    <FeeManagerMobile {...props} />
  )
}
