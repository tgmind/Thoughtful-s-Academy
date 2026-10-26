import { useIsDesktop } from '../../hooks/useDevice'
import TeacherManagerDesktop from './TeacherManagerDesktop'
import TeacherManagerMobile from './TeacherManagerMobile'

/**
 * TeacherManager - Viewport Responsive Coordinator
 *
 * Segregates Desktop UI and Mobile/Tablet UI into dedicated files:
 * - Desktop View (>= 1024px): src/pages/admin/TeacherManagerDesktop.jsx
 * - Mobile & Tablet View (< 1024px): src/pages/admin/TeacherManagerMobile.jsx
 *
 * Allows independent layout and design customization while preserving 100%
 * functionality and exact visual parity.
 */
export default function TeacherManager(props) {
  const isDesktop = useIsDesktop()
  const isDesktopMode = props.device ? props.device === 'desktop' : isDesktop

  return isDesktopMode ? (
    <TeacherManagerDesktop {...props} />
  ) : (
    <TeacherManagerMobile {...props} />
  )
}
