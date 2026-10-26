import { useIsDesktop } from '../../hooks/useDevice'
import StudentLayoutDesktop from './StudentLayoutDesktop'
import StudentLayoutMobile from './StudentLayoutMobile'

/**
 * StudentLayout - Viewport Responsive Coordinator
 *
 * Segregates Desktop UI and Mobile/Tablet UI into dedicated files:
 * - Desktop View (>= 1024px): src/pages/student/StudentLayoutDesktop.jsx
 * - Mobile & Tablet View (< 1024px): src/pages/student/StudentLayoutMobile.jsx
 *
 * Allows independent layout and design customization while preserving 100%
 * functionality and exact visual parity.
 */
export default function StudentLayout(props) {
  const isDesktop = useIsDesktop()
  const isDesktopMode = props.device ? props.device === 'desktop' : isDesktop

  return isDesktopMode ? (
    <StudentLayoutDesktop {...props} />
  ) : (
    <StudentLayoutMobile {...props} />
  )
}
