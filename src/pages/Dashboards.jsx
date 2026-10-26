import { useIsDesktop } from '../hooks/useDevice'
import * as DashboardsDesktop from './DashboardsDesktop'
import * as DashboardsMobile from './DashboardsMobile'

export function StudentDashboard(props) {
  const isDesktop = useIsDesktop()
  const isDesktopMode = props.device ? props.device === 'desktop' : isDesktop
  return isDesktopMode ? (
    <DashboardsDesktop.StudentDashboard {...props} />
  ) : (
    <DashboardsMobile.StudentDashboard {...props} />
  )
}

export function TeacherDashboard(props) {
  const isDesktop = useIsDesktop()
  const isDesktopMode = props.device ? props.device === 'desktop' : isDesktop
  return isDesktopMode ? (
    <DashboardsDesktop.TeacherDashboard {...props} />
  ) : (
    <DashboardsMobile.TeacherDashboard {...props} />
  )
}

export function AdminDashboard(props) {
  const isDesktop = useIsDesktop()
  const isDesktopMode = props.device ? props.device === 'desktop' : isDesktop
  return isDesktopMode ? (
    <DashboardsDesktop.AdminDashboard {...props} />
  ) : (
    <DashboardsMobile.AdminDashboard {...props} />
  )
}
