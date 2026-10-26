import { useIsDesktop } from '../../hooks/useDevice'
import NotificationsDesktop from './NotificationsDesktop'
import NotificationsMobile from './NotificationsMobile'

/**
 * Notifications - Viewport Responsive Coordinator
 *
 * Segregates Desktop UI and Mobile/Tablet UI into dedicated files:
 * - Desktop View (>= 1024px): src/pages/teacher/NotificationsDesktop.jsx
 * - Mobile & Tablet View (< 1024px): src/pages/teacher/NotificationsMobile.jsx
 *
 * Allows independent layout and design customization while preserving 100%
 * functionality and exact visual parity.
 */
export default function Notifications(props) {
  const isDesktop = useIsDesktop()
  const isDesktopMode = props.device ? props.device === 'desktop' : isDesktop

  return isDesktopMode ? (
    <NotificationsDesktop {...props} />
  ) : (
    <NotificationsMobile {...props} />
  )
}
