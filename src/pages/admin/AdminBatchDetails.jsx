import { useIsDesktop } from '../../hooks/useDevice'
import AdminBatchDetailsDesktop from './AdminBatchDetailsDesktop'
import AdminBatchDetailsMobile from './AdminBatchDetailsMobile'

/**
 * AdminBatchDetails - Viewport Responsive Coordinator
 *
 * Segregates Desktop UI and Mobile/Tablet UI into dedicated files:
 * - Desktop View (>= 1024px): src/pages/admin/AdminBatchDetailsDesktop.jsx
 * - Mobile & Tablet View (< 1024px): src/pages/admin/AdminBatchDetailsMobile.jsx
 *
 * Allows independent layout and design customization while preserving 100%
 * functionality and exact visual parity.
 */
export default function AdminBatchDetails(props) {
  const isDesktop = useIsDesktop()
  const isDesktopMode = props.device ? props.device === 'desktop' : isDesktop

  return isDesktopMode ? (
    <AdminBatchDetailsDesktop {...props} />
  ) : (
    <AdminBatchDetailsMobile {...props} />
  )
}
