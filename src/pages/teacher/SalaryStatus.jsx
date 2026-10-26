import { useIsDesktop } from '../../hooks/useDevice'
import SalaryStatusDesktop from './SalaryStatusDesktop'
import SalaryStatusMobile from './SalaryStatusMobile'

/**
 * SalaryStatus - Viewport Responsive Coordinator
 *
 * Segregates Desktop UI and Mobile/Tablet UI into dedicated files:
 * - Desktop View (>= 1024px): src/pages/teacher/SalaryStatusDesktop.jsx
 * - Mobile & Tablet View (< 1024px): src/pages/teacher/SalaryStatusMobile.jsx
 *
 * Allows independent layout and design customization while preserving 100%
 * functionality and exact visual parity.
 */
export default function SalaryStatus(props) {
  const isDesktop = useIsDesktop()
  const isDesktopMode = props.device ? props.device === 'desktop' : isDesktop

  return isDesktopMode ? (
    <SalaryStatusDesktop {...props} />
  ) : (
    <SalaryStatusMobile {...props} />
  )
}
