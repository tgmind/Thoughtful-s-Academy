import { useIsDesktop } from '../../hooks/useDevice'
import StudentTrackerDesktop from './StudentTrackerDesktop'
import StudentTrackerMobile from './StudentTrackerMobile'

/**
 * StudentTracker - Viewport Responsive Coordinator
 *
 * Segregates Desktop UI and Mobile/Tablet UI into dedicated files:
 * - Desktop View (>= 1024px): src/pages/admin/StudentTrackerDesktop.jsx
 * - Mobile & Tablet View (< 1024px): src/pages/admin/StudentTrackerMobile.jsx
 *
 * Allows independent layout and design customization while preserving 100%
 * functionality and exact visual parity.
 */
export default function StudentTracker(props) {
  const isDesktop = useIsDesktop()
  const isDesktopMode = props.device ? props.device === 'desktop' : isDesktop

  return isDesktopMode ? (
    <StudentTrackerDesktop {...props} />
  ) : (
    <StudentTrackerMobile {...props} />
  )
}
