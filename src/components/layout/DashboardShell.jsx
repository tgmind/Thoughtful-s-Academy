import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Menu, X, LogOut, ChevronLeft, ChevronRight, GraduationCap, MoreHorizontal } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useNavBadges } from '../../hooks/useNavBadges'
import { syncPush } from '../../utils/push'
import { INSTITUTE_NAME } from '../../lib/constants'
import NotificationPopup from '../shared/NotificationPopup'
import EnablePushBanner from '../shared/EnablePushBanner'

function initials(name) {
  if (!name) return '?'
  return name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('')
}

const ROLE_COLORS = {
  student: 'bg-emerald-100 text-emerald-800',
  teacher: 'bg-blue-100 text-blue-800',
  admin:   'bg-purple-100 text-purple-800',
}

const AVATAR_BG = {
  student: 'from-emerald-600 to-green-700',
  teacher: 'from-blue-600 to-indigo-700',
  admin:   'from-purple-600 to-violet-700',
}

export default function DashboardShell({ navItems, pageTitle }) {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const badges = useNavBadges(profile?.role, user?.id)
  const [collapsed,    setCollapsed]    = useState(false)
  const [drawerOpen,   setDrawerOpen]   = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showMoreNav,  setShowMoreNav]  = useState(false)

  // If the user has already allowed alerts on this device, keep their push
  // subscription fresh in the DB on every login. No-op if unsupported/unset.
  useEffect(() => { if (user?.id) syncPush(user.id) }, [user?.id])

  const handleSignOut = async () => { await signOut(); navigate('/') }

  const avatarBg = AVATAR_BG[profile?.role] || 'from-gray-600 to-gray-700'

  const NavItems = ({ onClick, isCollapsed = false }) => (
    <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
      {navItems.map(item => {
        const hasDot = !!badges[item.path]
        return (
          <NavLink key={item.path} to={item.path} onClick={onClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
               ${isActive
                 ? 'bg-gradient-to-r from-blue-950 to-blue-900 text-white shadow-sm border-l-[3px] border-amber-400 pl-[calc(0.75rem-3px)]'
                 : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`
            }>
            <span className="relative flex-shrink-0">
              {item.icon}
              {hasDot && isCollapsed && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white" />
              )}
            </span>
            {!isCollapsed && <span className="truncate">{item.label}</span>}
            {hasDot && !isCollapsed && (
              <span className="ml-auto h-2 w-2 rounded-full bg-amber-500 flex-shrink-0" />
            )}
          </NavLink>
        )
      })}
    </nav>
  )

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* ---- Desktop Sidebar ---- */}
      <aside className={`hidden lg:flex flex-col bg-white border-r border-gray-200 transition-all duration-300 flex-shrink-0 ${collapsed ? 'w-[60px]' : 'w-60'}`}>
        {/* Logo */}
        <div className={`flex items-center gap-2.5 px-3 py-4 border-b border-gray-100 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 bg-gradient-to-br from-blue-950 to-indigo-800 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
            <GraduationCap className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <span className="font-display font-bold text-blue-950 text-sm truncate leading-tight">
              {INSTITUTE_NAME}
            </span>
          )}
        </div>

        {/* User info */}
        {!collapsed && (
          <div className="px-3 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarBg} flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm`}>
                {initials(profile?.full_name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 truncate leading-snug">{profile?.full_name}</p>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${ROLE_COLORS[profile?.role] || 'bg-gray-100 text-gray-600'}`}>
                  {profile?.role}
                </span>
              </div>
            </div>
          </div>
        )}

        <NavItems isCollapsed={collapsed} />

        {/* Bottom controls */}
        <div className="border-t border-gray-100 p-2 space-y-1">
          <button onClick={handleSignOut}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors ${collapsed ? 'justify-center' : ''}`}>
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {!collapsed && 'Sign Out'}
          </button>
          <button onClick={() => setCollapsed(c => !c)}
            className="w-full flex items-center justify-center p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </aside>

      {/* ---- Mobile Drawer ---- */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="relative w-72 bg-white flex flex-col shadow-2xl animate-slide-in-right">
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-950 to-indigo-800 rounded-lg flex items-center justify-center shadow-sm">
                  <GraduationCap className="h-4 w-4 text-white" />
                </div>
                <span className="font-display font-bold text-blue-950 text-sm">{INSTITUTE_NAME}</span>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
              <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${avatarBg} flex items-center justify-center text-white font-bold shadow-sm`}>
                {initials(profile?.full_name)}
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{profile?.full_name}</p>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${ROLE_COLORS[profile?.role] || ''}`}>
                  {profile?.role}
                </span>
              </div>
            </div>
            <NavItems onClick={() => setDrawerOpen(false)} />
            <div className="border-t border-gray-100 p-3">
              <button onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium">
                <LogOut className="h-4 w-4" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Main area ---- */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 flex-shrink-0 shadow-sm">
          <button onClick={() => setDrawerOpen(true)} className="lg:hidden p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="font-display font-bold text-lg text-gray-900 flex-1 truncate">{pageTitle}</h1>
          <div className="relative">
            <button onClick={() => setShowDropdown(s => !s)}
              className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarBg} flex items-center justify-center text-white text-sm font-bold hover:opacity-90 transition-opacity shadow-sm`}>
              {initials(profile?.full_name)}
            </button>
            {showDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
                <div className="absolute right-0 top-11 z-20 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-fade-in">
                  <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/50">
                    <p className="text-xs font-semibold text-gray-900 truncate">{profile?.full_name}</p>
                    <p className="text-xs text-gray-500 truncate">{profile?.email}</p>
                  </div>
                  <button onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium">
                    <LogOut className="h-4 w-4" /> Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 lg:pb-6">
          <EnablePushBanner />
          <Outlet />
        </main>
      </div>

      {/* ---- Notification pop-ups ---- */}
      <NotificationPopup />

      {/* ---- Mobile bottom tab bar ---- */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-30 shadow-lg">
        {navItems.slice(0, 4).map(item => (
          <NavLink key={item.path} to={item.path}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2.5 text-xs transition-colors gap-0.5
               ${isActive ? 'text-blue-950 font-semibold' : 'text-gray-400 hover:text-gray-600'}`
            }>
            {({ isActive }) => (
              <>
                <span className={`relative p-1 rounded-lg transition-colors ${isActive ? 'bg-blue-950/10' : ''}`}>
                  {item.icon}
                  {badges[item.path] && (
                    <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white" />
                  )}
                </span>
                <span className="truncate max-w-full px-0.5 leading-tight">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
        {navItems.length > 4 && (
          <div className="flex-1 relative">
            <button
              onClick={() => setShowMoreNav(v => !v)}
              className="w-full flex flex-col items-center py-2.5 text-xs text-gray-400 hover:text-gray-600 gap-0.5">
              <span className="relative p-1 rounded-lg">
                <MoreHorizontal className="h-4 w-4" />
                {navItems.slice(4).some(item => badges[item.path]) && (
                  <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white" />
                )}
              </span>
              <span className="leading-tight">More</span>
            </button>
            {showMoreNav && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowMoreNav(false)} />
                <div className="absolute bottom-full right-0 z-40 mb-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-fade-in">
                  {navItems.slice(4).map(item => (
                    <NavLink key={item.path} to={item.path} onClick={() => setShowMoreNav(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors
                         ${isActive ? 'bg-blue-950 text-white' : 'text-gray-700 hover:bg-gray-50'}`
                      }>
                      <span className="flex-shrink-0">{item.icon}</span>
                      <span>{item.label}</span>
                      {badges[item.path] && (
                        <span className="ml-auto h-2 w-2 rounded-full bg-amber-500 flex-shrink-0" />
                      )}
                    </NavLink>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </nav>
    </div>
  )
}
