import { useIsDesktop } from '../../hooks/useDevice'
import StudentDashboardDesktop from './StudentDashboardDesktop'
import StudentDashboardMobile from './StudentDashboardMobile'

/**
 * StudentDashboard - Viewport Responsive Coordinator
 *
 * Segregates Desktop UI and Mobile/Tablet UI into dedicated files:
 * - Desktop View (>= 1024px): src/pages/student/StudentDashboardDesktop.jsx
 * - Mobile & Tablet View (< 1024px): src/pages/student/StudentDashboardMobile.jsx
 *
 * Allows independent layout and design customization while preserving 100%
 * functionality and exact visual parity.
 */
export default function StudentDashboard(props) {
  const isDesktop = useIsDesktop()
  const isDesktopMode = props.device ? props.device === 'desktop' : isDesktop

  return isDesktopMode ? (
    <StudentDashboardDesktop {...props} />
  ) : (
    <StudentDashboardMobile {...props} />
  )
}
