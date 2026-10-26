import { useIsDesktop } from '../../hooks/useDevice'
import WatchLectureDesktop from './WatchLectureDesktop'
import WatchLectureMobile from './WatchLectureMobile'

/**
 * WatchLecture - Viewport Responsive Coordinator
 *
 * Segregates Desktop UI and Mobile/Tablet UI into dedicated files:
 * - Desktop View (>= 1024px): src/pages/student/WatchLectureDesktop.jsx
 * - Mobile & Tablet View (< 1024px): src/pages/student/WatchLectureMobile.jsx
 *
 * Allows independent layout and design customization while preserving 100%
 * functionality and exact visual parity.
 */
export default function WatchLecture(props) {
  const isDesktop = useIsDesktop()
  const isDesktopMode = props.device ? props.device === 'desktop' : isDesktop

  return isDesktopMode ? (
    <WatchLectureDesktop {...props} />
  ) : (
    <WatchLectureMobile {...props} />
  )
}
