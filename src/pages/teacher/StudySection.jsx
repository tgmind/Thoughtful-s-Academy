import { useIsDesktop } from '../../hooks/useDevice'
import StudySectionDesktop from './StudySectionDesktop'
import StudySectionMobile from './StudySectionMobile'

/**
 * StudySection - Viewport Responsive Coordinator
 *
 * Segregates Desktop UI and Mobile/Tablet UI into dedicated files:
 * - Desktop View (>= 1024px): src/pages/teacher/StudySectionDesktop.jsx
 * - Mobile & Tablet View (< 1024px): src/pages/teacher/StudySectionMobile.jsx
 *
 * Allows independent layout and design customization while preserving 100%
 * functionality and exact visual parity.
 */
export default function StudySection(props) {
  const isDesktop = useIsDesktop()
  const isDesktopMode = props.device ? props.device === 'desktop' : isDesktop

  return isDesktopMode ? (
    <StudySectionDesktop {...props} />
  ) : (
    <StudySectionMobile {...props} />
  )
}
