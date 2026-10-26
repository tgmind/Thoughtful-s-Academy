import { useIsDesktop } from '../hooks/useDevice'
import ResetPasswordDesktop from './ResetPasswordDesktop'
import ResetPasswordMobile from './ResetPasswordMobile'

/**
 * ResetPassword - Viewport Responsive Coordinator
 *
 * Segregates Desktop UI and Mobile/Tablet UI into dedicated files:
 * - Desktop View (>= 1024px): src/pages/ResetPasswordDesktop.jsx
 * - Mobile & Tablet View (< 1024px): src/pages/ResetPasswordMobile.jsx
 *
 * Allows independent layout and design customization while preserving 100%
 * functionality and exact visual parity.
 */
export default function ResetPassword(props) {
  const isDesktop = useIsDesktop()
  const isDesktopMode = props.device ? props.device === 'desktop' : isDesktop

  return isDesktopMode ? (
    <ResetPasswordDesktop {...props} />
  ) : (
    <ResetPasswordMobile {...props} />
  )
}
