import { useIsDesktop } from '../../hooks/useDevice'
import BatchManagerDesktop from './BatchManagerDesktop'
import BatchManagerMobile from './BatchManagerMobile'

/**
 * BatchManager - Viewport Responsive Coordinator
 *
 * Segregates Desktop UI and Mobile/Tablet UI into dedicated files:
 * - Desktop View (>= 1024px): src/pages/admin/BatchManagerDesktop.jsx
 * - Mobile & Tablet View (< 1024px): src/pages/admin/BatchManagerMobile.jsx
 *
 * Allows independent layout and design customization while preserving 100%
 * functionality and exact visual parity.
 */
export default function BatchManager(props) {
  const isDesktop = useIsDesktop()
  const isDesktopMode = props.device ? props.device === 'desktop' : isDesktop

  return isDesktopMode ? (
    <BatchManagerDesktop {...props} />
  ) : (
    <BatchManagerMobile {...props} />
  )
}
