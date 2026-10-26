import { useIsDesktop } from '../../hooks/useDevice'
import TeacherDoubtsDesktop from './TeacherDoubtsDesktop'
import TeacherDoubtsMobile from './TeacherDoubtsMobile'

/**
 * TeacherDoubts - Viewport Responsive Coordinator
 *
 * Segregates Desktop UI and Mobile/Tablet UI into dedicated files:
 * - Desktop View (>= 1024px): src/pages/teacher/TeacherDoubtsDesktop.jsx
 * - Mobile & Tablet View (< 1024px): src/pages/teacher/TeacherDoubtsMobile.jsx
 *
 * Allows independent layout and design customization while preserving 100%
 * functionality and exact visual parity.
 */
export default function TeacherDoubts(props) {
  const isDesktop = useIsDesktop()
  const isDesktopMode = props.device ? props.device === 'desktop' : isDesktop

  return isDesktopMode ? (
    <TeacherDoubtsDesktop {...props} />
  ) : (
    <TeacherDoubtsMobile {...props} />
  )
}
