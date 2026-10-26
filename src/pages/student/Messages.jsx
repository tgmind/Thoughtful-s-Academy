import { useIsDesktop } from '../../hooks/useDevice'
import MessagesDesktop from './MessagesDesktop'
import MessagesMobile from './MessagesMobile'

/**
 * Messages - Viewport Responsive Coordinator
 *
 * Segregates Desktop UI and Mobile/Tablet UI into dedicated files:
 * - Desktop View (>= 1024px): src/pages/student/MessagesDesktop.jsx
 * - Mobile & Tablet View (< 1024px): src/pages/student/MessagesMobile.jsx
 *
 * Allows independent layout and design customization while preserving 100%
 * functionality and exact visual parity.
 */
export default function Messages(props) {
  const isDesktop = useIsDesktop()
  const isDesktopMode = props.device ? props.device === 'desktop' : isDesktop

  return isDesktopMode ? (
    <MessagesDesktop {...props} />
  ) : (
    <MessagesMobile {...props} />
  )
}
