import { useIsDesktop } from '../../hooks/useDevice'
import HomeworkDesktop from './HomeworkDesktop'
import HomeworkMobile from './HomeworkMobile'

/**
 * Homework - Viewport Responsive Coordinator
 *
 * Segregates Desktop UI and Mobile/Tablet UI into dedicated files:
 * - Desktop View (>= 1024px): src/pages/teacher/HomeworkDesktop.jsx
 * - Mobile & Tablet View (< 1024px): src/pages/teacher/HomeworkMobile.jsx
 *
 * Allows independent layout and design customization while preserving 100%
 * functionality and exact visual parity.
 */
export default function Homework(props) {
  const isDesktop = useIsDesktop()
  const isDesktopMode = props.device ? props.device === 'desktop' : isDesktop

  return isDesktopMode ? (
    <HomeworkDesktop {...props} />
  ) : (
    <HomeworkMobile {...props} />
  )
}
