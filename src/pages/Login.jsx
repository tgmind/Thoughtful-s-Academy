import { useIsDesktop } from '../hooks/useDevice'
import LoginDesktop from './LoginDesktop'
import LoginMobile from './LoginMobile'

/**
 * Login - Viewport Responsive Coordinator
 *
 * Segregates Desktop UI and Mobile/Tablet UI into dedicated files:
 * - Desktop View (>= 1024px): src/pages/LoginDesktop.jsx
 * - Mobile & Tablet View (< 1024px): src/pages/LoginMobile.jsx
 *
 * Allows independent layout and design customization while preserving 100%
 * functionality and exact visual parity.
 */
export default function Login(props) {
  const isDesktop = useIsDesktop()
  const isDesktopMode = props.device ? props.device === 'desktop' : isDesktop

  return isDesktopMode ? (
    <LoginDesktop {...props} />
  ) : (
    <LoginMobile {...props} />
  )
}
