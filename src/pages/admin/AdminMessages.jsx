import { useIsDesktop } from '../../hooks/useDevice'
import AdminMessagesDesktop from './AdminMessagesDesktop'
import AdminMessagesMobile from './AdminMessagesMobile'

/**
 * AdminMessages - Viewport Responsive Coordinator
 *
 * Segregates Desktop UI and Mobile/Tablet UI into dedicated files:
 * - Desktop View (>= 1024px): src/pages/admin/AdminMessagesDesktop.jsx
 * - Mobile & Tablet View (< 1024px): src/pages/admin/AdminMessagesMobile.jsx
 *
 * Allows independent layout and design customization while preserving 100%
 * functionality and exact visual parity.
 */
export default function AdminMessages(props) {
  const isDesktop = useIsDesktop()
  const isDesktopMode = props.device ? props.device === 'desktop' : isDesktop

  return isDesktopMode ? (
    <AdminMessagesDesktop {...props} />
  ) : (
    <AdminMessagesMobile {...props} />
  )
}
