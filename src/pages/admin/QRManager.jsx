import { useIsDesktop } from '../../hooks/useDevice'
import QRManagerDesktop from './QRManagerDesktop'
import QRManagerMobile from './QRManagerMobile'

/**
 * QRManager - Viewport Responsive Coordinator
 *
 * Segregates Desktop UI and Mobile/Tablet UI into dedicated files:
 * - Desktop View (>= 1024px): src/pages/admin/QRManagerDesktop.jsx
 * - Mobile & Tablet View (< 1024px): src/pages/admin/QRManagerMobile.jsx
 *
 * Allows independent layout and design customization while preserving 100%
 * functionality and exact visual parity.
 */
export default function QRManager(props) {
  const isDesktop = useIsDesktop()
  const isDesktopMode = props.device ? props.device === 'desktop' : isDesktop

  return isDesktopMode ? (
    <QRManagerDesktop {...props} />
  ) : (
    <QRManagerMobile {...props} />
  )
}
