import { useIsDesktop } from '../../hooks/useDevice'
import StudyCardsDesktop from './StudyCardsDesktop'
import StudyCardsMobile from './StudyCardsMobile'

/**
 * StudyCards - Viewport Responsive Coordinator
 *
 * Segregates Desktop UI and Mobile/Tablet UI into dedicated files:
 * - Desktop View (>= 1024px): src/pages/teacher/StudyCardsDesktop.jsx
 * - Mobile & Tablet View (< 1024px): src/pages/teacher/StudyCardsMobile.jsx
 *
 * Allows independent layout and design customization while preserving 100%
 * functionality and exact visual parity.
 */
export default function StudyCards(props) {
  const isDesktop = useIsDesktop()
  const isDesktopMode = props.device ? props.device === 'desktop' : isDesktop

  return isDesktopMode ? (
    <StudyCardsDesktop {...props} />
  ) : (
    <StudyCardsMobile {...props} />
  )
}
