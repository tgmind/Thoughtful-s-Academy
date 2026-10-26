import { useIsDesktop } from '../../hooks/useDevice'
import TeacherHomeDesktop from './TeacherHomeDesktop'
import TeacherHomeMobile from './TeacherHomeMobile'

/**
 * TeacherHome - Viewport Responsive Coordinator
 *
 * Segregates Desktop UI and Mobile/Tablet UI into dedicated files:
 * - Desktop View (>= 1024px): src/pages/teacher/TeacherHomeDesktop.jsx
 * - Mobile & Tablet View (< 1024px): src/pages/teacher/TeacherHomeMobile.jsx
 *
 * Allows independent layout and design customization while preserving 100%
 * functionality and exact visual parity.
 */
export default function TeacherHome(props) {
  const isDesktop = useIsDesktop()
  const isDesktopMode = props.device ? props.device === 'desktop' : isDesktop

  return isDesktopMode ? (
    <TeacherHomeDesktop {...props} />
  ) : (
    <TeacherHomeMobile {...props} />
  )
}
