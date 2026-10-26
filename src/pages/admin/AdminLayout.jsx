import { useIsDesktop } from '../../hooks/useDevice'
import AdminLayoutDesktop from './AdminLayoutDesktop'
import AdminLayoutMobile from './AdminLayoutMobile'

/**
 * AdminLayout - Viewport Responsive Coordinator
 *
 * Segregates Desktop UI and Mobile/Tablet UI into dedicated files:
 * - Desktop View (>= 1024px): src/pages/admin/AdminLayoutDesktop.jsx
 * - Mobile & Tablet View (< 1024px): src/pages/admin/AdminLayoutMobile.jsx
 *
 * Allows independent layout and design customization while preserving 100%
 * functionality and exact visual parity.
 */
export default function AdminLayout(props) {
  const isDesktop = useIsDesktop()
  const isDesktopMode = props.device ? props.device === 'desktop' : isDesktop

  return isDesktopMode ? (
    <AdminLayoutDesktop {...props} />
  ) : (
    <AdminLayoutMobile {...props} />
  )
}
