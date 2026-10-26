import { useIsDesktop } from '../../hooks/useDevice'
import AdminHomeDesktop from './AdminHomeDesktop'
import AdminHomeMobile from './AdminHomeMobile'

/**
 * AdminHome - Viewport Responsive Coordinator
 *
 * Segregates Desktop UI and Mobile/Tablet UI into dedicated files:
 * - Desktop View (>= 1024px): src/pages/admin/AdminHomeDesktop.jsx
 * - Mobile & Tablet View (< 1024px): src/pages/admin/AdminHomeMobile.jsx
 *
 * Allows independent layout and design customization while preserving 100%
 * functionality and exact visual parity.
 */
export default function AdminHome(props) {
  const isDesktop = useIsDesktop()
  const isDesktopMode = props.device ? props.device === 'desktop' : isDesktop

  return isDesktopMode ? (
    <AdminHomeDesktop {...props} />
  ) : (
    <AdminHomeMobile {...props} />
  )
}
