import { useIsDesktop } from '../../hooks/useDevice'
import StudentDoubtsDesktop from './StudentDoubtsDesktop'
import StudentDoubtsMobile from './StudentDoubtsMobile'

/**
 * StudentDoubts - Viewport Responsive Coordinator
 *
 * Segregates Desktop UI and Mobile/Tablet UI into dedicated files:
 * - Desktop View (>= 1024px): src/pages/student/StudentDoubtsDesktop.jsx
 * - Mobile & Tablet View (< 1024px): src/pages/student/StudentDoubtsMobile.jsx
 *
 * Allows independent layout and design customization while preserving 100%
 * functionality and exact visual parity.
 */
export default function StudentDoubts(props) {
  const isDesktop = useIsDesktop()
  const isDesktopMode = props.device ? props.device === 'desktop' : isDesktop

  return isDesktopMode ? (
    <StudentDoubtsDesktop {...props} />
  ) : (
    <StudentDoubtsMobile {...props} />
  )
}
