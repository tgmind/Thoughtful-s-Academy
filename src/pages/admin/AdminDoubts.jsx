import { useIsDesktop } from '../../hooks/useDevice'
import AdminDoubtsDesktop from './AdminDoubtsDesktop'
import AdminDoubtsMobile from './AdminDoubtsMobile'

/**
 * AdminDoubts - Viewport Responsive Coordinator
 *
 * Segregates Desktop UI and Mobile/Tablet UI into dedicated files:
 * - Desktop View (>= 1024px): src/pages/admin/AdminDoubtsDesktop.jsx
 * - Mobile & Tablet View (< 1024px): src/pages/admin/AdminDoubtsMobile.jsx
 *
 * Allows independent layout and design customization while preserving 100%
 * functionality and exact visual parity.
 */
export default function AdminDoubts(props) {
  const isDesktop = useIsDesktop()
  const isDesktopMode = props.device ? props.device === 'desktop' : isDesktop

  return isDesktopMode ? (
    <AdminDoubtsDesktop {...props} />
  ) : (
    <AdminDoubtsMobile {...props} />
  )
}
