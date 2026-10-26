import { useIsDesktop } from '../../hooks/useDevice'
import SalaryManagerDesktop from './SalaryManagerDesktop'
import SalaryManagerMobile from './SalaryManagerMobile'

/**
 * SalaryManager - Viewport Responsive Coordinator
 *
 * Segregates Desktop UI and Mobile/Tablet UI into dedicated files:
 * - Desktop View (>= 1024px): src/pages/admin/SalaryManagerDesktop.jsx
 * - Mobile & Tablet View (< 1024px): src/pages/admin/SalaryManagerMobile.jsx
 *
 * Allows independent layout and design customization while preserving 100%
 * functionality and exact visual parity.
 */
export default function SalaryManager(props) {
  const isDesktop = useIsDesktop()
  const isDesktopMode = props.device ? props.device === 'desktop' : isDesktop

  return isDesktopMode ? (
    <SalaryManagerDesktop {...props} />
  ) : (
    <SalaryManagerMobile {...props} />
  )
}
