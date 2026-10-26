import { useIsDesktop } from '../../hooks/useDevice'
import TeacherLayoutDesktop from './TeacherLayoutDesktop'
import TeacherLayoutMobile from './TeacherLayoutMobile'

/**
 * TeacherLayout - Viewport Responsive Coordinator
 *
 * Segregates Desktop UI and Mobile/Tablet UI into dedicated files:
 * - Desktop View (>= 1024px): src/pages/teacher/TeacherLayoutDesktop.jsx
 * - Mobile & Tablet View (< 1024px): src/pages/teacher/TeacherLayoutMobile.jsx
 *
 * Allows independent layout and design customization while preserving 100%
 * functionality and exact visual parity.
 */
export default function TeacherLayout(props) {
  const isDesktop = useIsDesktop()
  const isDesktopMode = props.device ? props.device === 'desktop' : isDesktop

  return isDesktopMode ? (
    <TeacherLayoutDesktop {...props} />
  ) : (
    <TeacherLayoutMobile {...props} />
  )
}
