import { useIsDesktop } from '../hooks/useDevice'
import RegisterDesktop from './RegisterDesktop'
import RegisterMobile from './RegisterMobile'

/**
 * Register - Viewport Responsive Coordinator
 *
 * Segregates Desktop UI and Mobile/Tablet UI into dedicated files:
 * - Desktop View (>= 1024px): src/pages/RegisterDesktop.jsx
 * - Mobile & Tablet View (< 1024px): src/pages/RegisterMobile.jsx
 *
 * Allows independent layout and design customization while preserving 100%
 * functionality and exact visual parity.
 */
export default function Register(props) {
  const isDesktop = useIsDesktop()
  const isDesktopMode = props.device ? props.device === 'desktop' : isDesktop

  return isDesktopMode ? (
    <RegisterDesktop {...props} />
  ) : (
    <RegisterMobile {...props} />
  )
}
