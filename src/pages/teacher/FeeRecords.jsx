import { useIsDesktop } from '../../hooks/useDevice'
import FeeRecordsDesktop from './FeeRecordsDesktop'
import FeeRecordsMobile from './FeeRecordsMobile'

/**
 * FeeRecords - Viewport Responsive Coordinator
 *
 * Segregates Desktop UI and Mobile/Tablet UI into dedicated files:
 * - Desktop View (>= 1024px): src/pages/teacher/FeeRecordsDesktop.jsx
 * - Mobile & Tablet View (< 1024px): src/pages/teacher/FeeRecordsMobile.jsx
 *
 * Allows independent layout and design customization while preserving 100%
 * functionality and exact visual parity.
 */
export default function FeeRecords(props) {
  const isDesktop = useIsDesktop()
  const isDesktopMode = props.device ? props.device === 'desktop' : isDesktop

  return isDesktopMode ? (
    <FeeRecordsDesktop {...props} />
  ) : (
    <FeeRecordsMobile {...props} />
  )
}
