import { useIsDesktop } from '../hooks/useDevice'
import * as ErrorPagesDesktop from './ErrorPagesDesktop'
import * as ErrorPagesMobile from './ErrorPagesMobile'

export function NotFound(props) {
  const isDesktop = useIsDesktop()
  const isDesktopMode = props.device ? props.device === 'desktop' : isDesktop
  return isDesktopMode ? (
    <ErrorPagesDesktop.NotFound {...props} />
  ) : (
    <ErrorPagesMobile.NotFound {...props} />
  )
}

export function Unauthorized(props) {
  const isDesktop = useIsDesktop()
  const isDesktopMode = props.device ? props.device === 'desktop' : isDesktop
  return isDesktopMode ? (
    <ErrorPagesDesktop.Unauthorized {...props} />
  ) : (
    <ErrorPagesMobile.Unauthorized {...props} />
  )
}

export function AccountSuspended(props) {
  const isDesktop = useIsDesktop()
  const isDesktopMode = props.device ? props.device === 'desktop' : isDesktop
  return isDesktopMode ? (
    <ErrorPagesDesktop.AccountSuspended {...props} />
  ) : (
    <ErrorPagesMobile.AccountSuspended {...props} />
  )
}
