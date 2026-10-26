import { NavLink } from 'react-router-dom'
import {
  GraduationCap,
  Search,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ShieldCheck,
} from 'lucide-react'
import { INSTITUTE_NAME } from '../../lib/constants'

export default function DashboardShellDesktop({
  collapsed,
  setCollapsed,
  portalName,
  avatarBg,
  profile,
  initials,
  roleColors,
  setShowCommandPalette,
  navItems,
  badges,
  handleSignOut,
}) {
  return (
    <>
      {/* ============================================================ */}
      {/* 1. Modern Luxury Left Sidebar (Desktop & Laptop lg+)         */}
      {/* ============================================================ */}
      <aside
        className={`hidden lg:flex flex-col bg-white/95 backdrop-blur-2xl border-r border-slate-200/80 transition-all duration-300 flex-shrink-0 z-30 shadow-[1px_0_15px_rgba(0,0,0,0.02)] ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Brand Header */}
        <div className={`flex items-center gap-3 px-4 py-4.5 border-b border-slate-100 ${collapsed ? 'justify-center px-2' : ''}`}>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-950 via-indigo-900 to-blue-900 flex items-center justify-center text-white shrink-0 shadow-md shadow-blue-950/20 ring-2 ring-blue-900/10">
            <GraduationCap className="h-5 w-5 text-amber-400" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <span className="font-display font-black text-slate-900 text-sm tracking-tight truncate block leading-tight">
                {INSTITUTE_NAME}
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md inline-block mt-0.5">
                {portalName}
              </span>
            </div>
          )}
        </div>

        {/* User Identity Pill (expanded sidebar) */}
        {!collapsed && (
          <div className="px-3.5 py-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-3 p-2 rounded-2xl bg-white border border-slate-100 shadow-sm">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatarBg} flex items-center justify-center text-white text-xs font-black shrink-0 shadow-inner`}>
                {initials(profile?.full_name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 truncate leading-tight">
                  {profile?.full_name || 'User'}
                </p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border capitalize inline-block mt-0.5 ${roleColors[profile?.role] || 'bg-slate-100 text-slate-600'}`}>
                  {profile?.role || 'Portal'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Quick Search Launcher inside Sidebar */}
        {!collapsed && (
          <div className="px-3.5 pt-3 pb-1">
            <button
              onClick={() => setShowCommandPalette(true)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-100/80 hover:bg-slate-100 text-slate-500 hover:text-slate-900 text-xs font-medium border border-slate-200/70 transition-all"
            >
              <span className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-slate-400" />
                <span>Global Search…</span>
              </span>
              <kbd className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-400">
                ⌘K
              </kbd>
            </button>
          </div>
        )}

        {/* Desktop Navigation Links */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map(item => {
            const hasDot = !!badges[item.path]
            const isLiveItem = item.path.includes('live-class')
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                    collapsed ? 'justify-center px-2 py-3' : ''
                  } ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-950 to-indigo-900 text-white shadow-md shadow-blue-950/20'
                      : isLiveItem && hasDot
                        ? 'text-rose-700 bg-rose-50/90 hover:bg-rose-100 font-bold border border-rose-200/80 shadow-sm'
                        : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100/80'
                  }`
                }
                title={collapsed ? item.label : undefined}
              >
                {({ isActive }) => (
                  <>
                    <span className={`relative shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                      isActive ? 'text-amber-400' : isLiveItem && hasDot ? 'text-rose-600' : 'text-slate-500 group-hover:text-slate-900'
                    }`}>
                      {item.icon}
                      {hasDot && (
                        isLiveItem ? (
                          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600 ring-2 ring-white" />
                          </span>
                        ) : (
                          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white animate-pulse" />
                        )
                      )}
                    </span>
                    {!collapsed && <span className="truncate flex-1">{item.label}</span>}
                    {hasDot && !collapsed && (
                      isLiveItem ? (
                        <span className="ml-auto text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-600 text-white shrink-0 flex items-center gap-1 shadow-sm shadow-rose-600/30 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-white" />
                          LIVE
                        </span>
                      ) : (
                        <span className="ml-auto text-[10px] font-black px-1.5 py-0.5 rounded-full bg-amber-500 text-white shrink-0">
                          NEW
                        </span>
                      )
                    )}
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Sidebar Footer Controls */}
        <div className="border-t border-slate-100 p-2.5 space-y-1 bg-slate-50/40">
          <button
            onClick={handleSignOut}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all ${
              collapsed ? 'justify-center px-1' : ''
            }`}
            title="Sign Out"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && 'Sign Out'}
          </button>

          <button
            onClick={() => setCollapsed(c => !c)}
            className="w-full flex items-center justify-center p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </aside>
    </>
  )
}

export function DashboardHeaderDesktop({ pageTitle }) {
  return (
    <div className="hidden lg:flex items-center gap-2.5 min-w-0">
      <h1 className="font-display font-black text-lg text-slate-900 truncate">
        {pageTitle}
      </h1>
      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
        <ShieldCheck className="h-3 w-3 text-indigo-500" />
        Session Active
      </span>
    </div>
  )
}
