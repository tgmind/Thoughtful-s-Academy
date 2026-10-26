import { useIsDesktop } from '../../hooks/useDevice'
import AnnouncementsDesktop from './AnnouncementsDesktop'
import AnnouncementsMobile from './AnnouncementsMobile'

/**
 * Announcements - Viewport Responsive Coordinator
 *
 * Segregates Desktop UI and Mobile/Tablet UI into dedicated files:
 * - Desktop View (>= 1024px): src/pages/admin/AnnouncementsDesktop.jsx
 * - Mobile & Tablet View (< 1024px): src/pages/admin/AnnouncementsMobile.jsx
 *
 * Allows independent layout and design customization while preserving 100%
 * functionality and exact visual parity.
 */
export default function Announcements(props) {
  const isDesktop = useIsDesktop()
  const isDesktopMode = props.device ? props.device === 'desktop' : isDesktop

  return isDesktopMode ? (
    <AnnouncementsDesktop {...props} />
  ) : (
    <AnnouncementsMobile {...props} />
  )
}
