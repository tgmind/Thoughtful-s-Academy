import { useIsDesktop } from '../../hooks/useDevice'
import AdminSettingsDesktop from './AdminSettingsDesktop'
import AdminSettingsMobile from './AdminSettingsMobile'

/**
 * AdminSettings - Viewport Responsive Coordinator
 *
 * Segregates Desktop UI and Mobile/Tablet UI into dedicated files:
 * - Desktop View (>= 1024px): src/pages/admin/AdminSettingsDesktop.jsx
 * - Mobile & Tablet View (< 1024px): src/pages/admin/AdminSettingsMobile.jsx
 *
 * Allows independent layout and design customization while preserving 100%
 * functionality and exact visual parity.
 */
export default function AdminSettings(props) {
  const isDesktop = useIsDesktop()
  const isDesktopMode = props.device ? props.device === 'desktop' : isDesktop

  return isDesktopMode ? (
    <AdminSettingsDesktop {...props} />
  ) : (
    <AdminSettingsMobile {...props} />
  )
}
