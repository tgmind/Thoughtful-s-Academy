import { useIsDesktop } from '../../hooks/useDevice'
import AttendanceDesktop from './AttendanceDesktop'
import AttendanceMobile from './AttendanceMobile'

/**
 * Attendance - Viewport Responsive Coordinator
 *
 * Segregates Desktop UI and Mobile/Tablet UI into dedicated files:
 * - Desktop View (>= 1024px): src/pages/teacher/AttendanceDesktop.jsx
 * - Mobile & Tablet View (< 1024px): src/pages/teacher/AttendanceMobile.jsx
 *
 * Allows independent layout and design customization while preserving 100%
 * functionality and exact visual parity.
 */
export default function Attendance(props) {
  const isDesktop = useIsDesktop()
  const isDesktopMode = props.device ? props.device === 'desktop' : isDesktop

  return isDesktopMode ? (
    <AttendanceDesktop {...props} />
  ) : (
    <AttendanceMobile {...props} />
  )
}
