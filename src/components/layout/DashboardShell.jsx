import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Grid,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useNavBadges } from '../../hooks/useNavBadges'
import { syncPush } from '../../utils/push'
import { INSTITUTE_NAME } from '../../lib/constants'
import NotificationPopup from '../shared/NotificationPopup'
import EnablePushBanner from '../shared/EnablePushBanner'

function initials(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0].toUpperCase())
    .join('')
}

const ROLE_COLORS = {
  student: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  teacher: 'bg-blue-50 text-blue-700 border-blue-200/80',
  admin:   'bg-purple-50 text-purple-700 border-purple-200/80',
}

const AVATAR_BG = {
  student: 'from-emerald-600 via-teal-600 to-green-700',
  teacher: 'from-blue-600 via-indigo-600 to-cyan-700',
  admin:   'from-purple-600 via-indigo-600 to-violet-700',
}

const PORTAL_NAMES = {
  student: 'Student Portal',
  teacher: 'Faculty Portal',
  admin:   'Admin Central',
}

export default function DashboardShell({ navItems, pageTitle }) {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const badges = useNavBadges(profile?.role, user?.id)

  const [collapsed, setCollapsed] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showMoreSheet, setShowMoreSheet] = useState(false)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  const searchInputRef = useRef(null)
  const dropdownRef = useRef(null)

  // Direct, rock-solid sheet dismissal
  const closeSheet = useCallback(() => {
    setShowMoreSheet(false)
  }, [])

  // Instant unmount + navigation on module selection
  const handleModuleClick = useCallback((path) => {
    setShowMoreSheet(false)
    navigate(path)
  }, [navigate])

  // Auto-close overlays on route change
  useEffect(() => {
    setShowMoreSheet(false)
    setShowDropdown(false)
    setShowCommandPalette(false)
    setSearchQuery('')
  }, [location.pathname])

  // Click outside to close user profile dropdown
  useEffect(() => {
    if (!showDropdown) return
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('pointerdown', handleClickOutside)
    return () => document.removeEventListener('pointerdown', handleClickOutside)
  }, [showDropdown])

  // Auto-hide navigation sheet on inactivity (6 seconds)
  useEffect(() => {
    if (!showMoreSheet) return

    let idleTimer = null

    const resetIdle = () => {
      if (idleTimer) clearTimeout(idleTimer)
      idleTimer = setTimeout(() => {
        closeSheet()
      }, 6000)
    }

    // Initialize timer immediately
    resetIdle()

    const events = ['pointerdown', 'touchstart', 'scroll', 'keydown']
    const onActivity = () => resetIdle()

    events.forEach(evt => {
      window.addEventListener(evt, onActivity, { passive: true, capture: true })
    })

    return () => {
      if (idleTimer) clearTimeout(idleTimer)
      events.forEach(evt => {
        window.removeEventListener(evt, onActivity, { capture: true })
      })
    }
  }, [showMoreSheet, closeSheet])

  // Prevent background scrolling when bottom sheet is open on mobile
  useEffect(() => {
    if (showMoreSheet) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [showMoreSheet])

  // Sync push token for authenticated user
  useEffect(() => {
    if (user?.id) syncPush(user.id)
  }, [user?.id])

  // Keyboard shortcut for ⌘K / Ctrl+K Command Palette
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowCommandPalette(prev => !prev)
      } else if (e.key === 'Escape') {
        setShowCommandPalette(false)
        setShowMoreSheet(false)
        setShowDropdown(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Auto-focus search input when Command Palette opens
  useEffect(() => {
    if (showCommandPalette) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
    }
  }, [showCommandPalette])

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const avatarBg = AVATAR_BG[profile?.role] || 'from-gray-600 to-gray-700'
  const portalName = PORTAL_NAMES[profile?.role] || pageTitle || 'Academic Portal'

  // Primary bottom tab items on mobile (first 4 items, rest in sheet)
  const primaryMobileTabs = useMemo(() => navItems.slice(0, 4), [navItems])
  const secondaryMobileTabs = useMemo(() => navItems.slice(4), [navItems])

  // Filtered items for ⌘K Command Palette
  const filteredNavItems = useMemo(() => {
    if (!searchQuery.trim()) return navItems
    const q = searchQuery.toLowerCase().trim()
    return navItems.filter(item => item.label.toLowerCase().includes(q))
  }, [navItems, searchQuery])

  useEffect(() => {
    setSelectedIndex(0)
  }, [searchQuery])

  const handleCommandKeyNav = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev + 1) % (filteredNavItems.length || 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev - 1 + filteredNavItems.length) % (filteredNavItems.length || 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredNavItems[selectedIndex]) {
        navigate(filteredNavItems[selectedIndex].path)
        setShowCommandPalette(false)
      }
    }
  }

  const activeSecondaryItem = useMemo(() => {
    return secondaryMobileTabs.find(item => location.pathname === item.path || location.pathname.startsWith(item.path + '/'))
  }, [secondaryMobileTabs, location.pathname])

  const isSecondaryActive = !!activeSecondaryItem

  const hasSecondaryBadge = useMemo(() => {
    return secondaryMobileTabs.some(item => !!badges[item.path])
  }, [secondaryMobileTabs, badges])

  const hasSecondaryLiveBadge = useMemo(() => {
    return secondaryMobileTabs.some(item => item.path.includes('live-class') && !!badges[item.path])
  }, [secondaryMobileTabs, badges])

  return (
    <div className="flex h-screen h-[100dvh] max-h-[100dvh] w-full bg-slate-50/70 overflow-hidden font-sans">

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
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border capitalize inline-block mt-0.5 ${ROLE_COLORS[profile?.role] || 'bg-slate-100 text-slate-600'}`}>
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
                <span>Jump to module…</span>
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
                        <span className="ml-auto text-[10px] font-black px-1.5 py-0.2 rounded-full bg-amber-500 text-white shrink-0">
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

      {/* ============================================================ */}
      {/* 2. Main Portal Area & Responsive Top Header                  */}
      {/* ============================================================ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">

        {/* Top Header Bar (Balanced & Well-Filled on Both Mobile & Desktop) */}
        <header className="bg-white/85 backdrop-blur-xl border-b border-slate-200/70 px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-3 shrink-0 shadow-sm relative z-30">

          {/* Left: Brand Monogram & Portal on Mobile / Page Title on Desktop */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Brand Monogram */}
            <div className="lg:hidden flex items-center gap-2.5 shrink-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-950 to-indigo-900 flex items-center justify-center text-white shadow-sm">
                <GraduationCap className="h-4 w-4 text-amber-400" />
              </div>
              <div className="min-w-0">
                <span className="font-display font-black text-slate-900 text-xs sm:text-sm tracking-tight truncate block leading-tight">
                  {INSTITUTE_NAME}
                </span>
                <span className="text-[10px] font-bold text-indigo-600 block leading-none">
                  {portalName}
                </span>
              </div>
            </div>

            {/* Desktop Page Title & Badge */}
            <div className="hidden lg:flex items-center gap-2.5 min-w-0">
              <h1 className="font-display font-black text-lg text-slate-900 truncate">
                {pageTitle}
              </h1>
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                <ShieldCheck className="h-3 w-3 text-indigo-500" />
                Session Active
              </span>
            </div>
          </div>

          {/* Right: Quick Search Button & Profile Avatar */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Quick ⌘K Search Button */}
            <button
              onClick={() => setShowCommandPalette(true)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-100/80 hover:bg-slate-200/80 text-slate-600 hover:text-slate-900 border border-slate-200/80 transition-all text-xs font-semibold active:scale-95 shadow-sm"
              title="Search modules and actions (⌘K / Ctrl+K)"
            >
              <Search className="h-3.5 w-3.5 text-slate-500" />
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden sm:inline-flex items-center text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-500">
                ⌘K
              </kbd>
            </button>

            {/* Profile Avatar Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(s => !s)}
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br ${avatarBg} flex items-center justify-center text-white text-xs font-black shadow-md hover:ring-2 hover:ring-blue-900/30 transition-all active:scale-95`}
                aria-label="User account menu"
              >
                {initials(profile?.full_name)}
              </button>

              <AnimatePresence>
                {showDropdown && (
                  <motion.div
                    key="profile-dropdown-menu"
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-11 z-50 w-60 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden"
                  >
                      <div className="px-4 py-3.5 border-b border-slate-100 bg-slate-50/70">
                        <p className="text-xs font-bold text-slate-900 truncate">{profile?.full_name}</p>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">{profile?.email}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border capitalize inline-block mt-1.5 ${ROLE_COLORS[profile?.role] || 'bg-slate-100 text-slate-600'}`}>
                          {profile?.role}
                        </span>
                      </div>

                      <div className="p-1.5 space-y-1">
                        <button
                          onClick={() => {
                            setShowDropdown(false)
                            setShowCommandPalette(true)
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                        >
                          <Search className="h-4 w-4 text-slate-500" />
                          <span>Quick Switcher (⌘K)</span>
                        </button>

                        <button
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto p-3.5 sm:p-5 md:p-6 pb-28 lg:pb-8">
          <EnablePushBanner />
          <Outlet />
        </main>
      </div>

      {/* ============================================================ */}
      {/* 3. Mobile Premium Whitish Frosted Bottom Dock (< lg)         */}
      {/* ============================================================ */}
      <nav className="lg:hidden fixed bottom-2.5 inset-x-3 sm:inset-x-8 max-w-md mx-auto z-40 bg-white/95 backdrop-blur-2xl border border-white/80 shadow-[0_10px_35px_rgba(0,0,0,0.12)] rounded-3xl p-1.5 flex items-center justify-around ring-1 ring-slate-900/5">
        {primaryMobileTabs.map(item => {
          const hasDot = !!badges[item.path]
          const isLiveItem = item.path.includes('live-class')
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setShowMoreSheet(false)}
              className={({ isActive }) =>
                `relative flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all duration-200 select-none ${
                  isActive
                    ? 'text-white font-extrabold'
                    : isLiveItem && hasDot
                      ? 'text-rose-600 font-bold'
                      : 'text-slate-500 hover:text-slate-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="mobileActiveTabPill"
                      className="absolute inset-0 bg-gradient-to-r from-blue-950 to-indigo-900 rounded-2xl shadow-md shadow-blue-950/20"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
                    />
                  )}
                  <span className="relative z-10 flex flex-col items-center gap-0.5">
                    <span className="relative">
                      {item.icon}
                      {hasDot && (
                        isLiveItem ? (
                          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600 ring-2 ring-white" />
                          </span>
                        ) : (
                          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-white animate-pulse" />
                        )
                      )}
                    </span>
                    <span className="text-[10px] leading-tight text-center">
                      {item.label}
                    </span>
                  </span>
                </>
              )}
            </NavLink>
          )
        })}

        {/* The "More / Active" launcher button */}
        {navItems.length > 4 && (
          <button
            onClick={() => setShowMoreSheet(prev => !prev)}
            className={`relative flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all duration-200 select-none ${
              isSecondaryActive
                ? 'text-white font-extrabold'
                : hasSecondaryLiveBadge
                  ? 'text-rose-600 font-bold'
                  : 'text-slate-500 hover:text-slate-900'
            }`}
            aria-label="Open portal modules"
          >
            {isSecondaryActive && (
              <motion.div
                layoutId="mobileActiveTabPill"
                className="absolute inset-0 bg-gradient-to-r from-blue-950 to-indigo-900 rounded-2xl shadow-md shadow-blue-950/20"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
              />
            )}
            <span className="relative z-10 flex flex-col items-center gap-0.5">
              <span className="relative">
                {activeSecondaryItem ? activeSecondaryItem.icon : <Grid className="h-4 w-4" />}
                {hasSecondaryBadge && (
                  hasSecondaryLiveBadge ? (
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600 ring-2 ring-white" />
                    </span>
                  ) : (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-white animate-pulse" />
                  )
                )}
              </span>
              <span className="text-[10px] leading-tight text-center truncate max-w-[56px]">
                {activeSecondaryItem ? activeSecondaryItem.label : 'More'}
              </span>
            </span>
          </button>
        )}
      </nav>

      {/* ============================================================ */}
      {/* 4. Mobile Bottom Sheet Modal for All Portal Modules          */}
      {/* ============================================================ */}
      {showMoreSheet && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-slate-950/15 flex items-end justify-center p-0 sm:p-4 select-none animate-in fade-in duration-200"
          onClick={closeSheet}
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) {
              closeSheet()
            }
          }}
        >
          {/* Bottom Sheet Card (Compact, Apple-grade, zero text cutoff) */}
          <div
            className="relative w-full max-w-md bg-white rounded-t-[28px] sm:rounded-3xl shadow-[0_-10px_35px_rgba(0,0,0,0.12)] z-10 px-4 pt-3 pb-5 sm:px-5 sm:pt-3.5 sm:pb-6 border-t border-x border-slate-200/80 max-h-[58vh] flex flex-col cursor-auto select-auto animate-in slide-in-from-bottom duration-250 ease-out"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {/* Apple-style Grab handle */}
            <div className="w-9 h-1 bg-slate-300 rounded-full mx-auto mb-2.5 shrink-0" />

            {/* Sheet Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-3 shrink-0">
              <div>
                <h3 className="font-display font-black text-sm sm:text-base text-slate-900 leading-tight">
                  All Portal Modules
                </h3>
                <p className="text-[10px] sm:text-[11px] text-slate-400">Quick access to all features</p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  closeSheet()
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Grid of modules with NO text wrapping / cutting off */}
            <div className="grid grid-cols-2 gap-2 sm:gap-2.5 overflow-y-auto pr-0.5 custom-scrollbar flex-1">
              {navItems.map(item => {
                const hasDot = !!badges[item.path]
                const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/')
                const isLiveItem = item.path.includes('live-class')
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => handleModuleClick(item.path)}
                    className={`py-2 px-2.5 sm:py-2.5 sm:px-3 rounded-2xl border transition-all duration-150 flex items-center gap-2.5 group active:scale-[0.98] text-left w-full cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-950 via-indigo-950 to-blue-900 text-white border-blue-950 shadow-sm shadow-blue-950/25 ring-1 ring-blue-900/40'
                        : isLiveItem && hasDot
                          ? 'bg-rose-50/90 hover:bg-rose-100/90 border-rose-200 text-rose-950 font-bold shadow-2xs'
                          : 'bg-slate-50/85 hover:bg-slate-100/90 border-slate-200/70 text-slate-800 shadow-2xs'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      isActive
                        ? 'bg-white/20 text-amber-400 shadow-inner'
                        : isLiveItem && hasDot
                          ? 'bg-rose-600 text-white shadow-sm shadow-rose-500/30'
                          : 'bg-white shadow-2xs border border-slate-200/50 text-indigo-700'
                    }`}>
                      {item.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`font-bold text-[11.5px] sm:text-xs leading-none whitespace-nowrap truncate tracking-tight ${
                        isActive ? 'text-white' : 'text-slate-800'
                      }`}>
                        {item.label}
                      </p>
                      {hasDot && (
                        isLiveItem ? (
                          <span className="inline-flex items-center gap-1 mt-1 text-[8.5px] font-black uppercase tracking-wider text-rose-600 bg-rose-100/90 px-1.5 py-0.2 rounded-full border border-rose-300 shadow-2xs animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                            LIVE
                          </span>
                        ) : (
                          <span className="inline-block mt-1 text-[8.5px] font-black uppercase tracking-wider text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/60">
                            New
                          </span>
                        )
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Sheet Footer: Subtle Sign Out Button */}
            <div className="mt-3 pt-2.5 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => {
                  closeSheet()
                  handleSignOut()
                }}
                className="w-full py-2 px-3 rounded-xl bg-rose-50/80 hover:bg-rose-100/90 text-rose-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors active:scale-[0.99] cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out of Portal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. Universal ⌘K Command Palette (Desktop, Tablet & Mobile)   */}
      {/* ============================================================ */}
      <AnimatePresence>
        {showCommandPalette && (
          <motion.div
            key="command-palette-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-start justify-center pt-16 sm:pt-24 p-4"
            onClick={() => setShowCommandPalette(false)}
          >
            {/* Modal Dialog */}
            <motion.div
              key="command-palette-dialog"
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15 }}
              className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={handleCommandKeyNav}
            >
              {/* Search Bar Input */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 bg-slate-50/50">
                <Search className="h-5 w-5 text-indigo-600 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Jump to module, page, or section..."
                  className="w-full bg-transparent border-none text-slate-900 placeholder-slate-400 text-sm font-semibold focus:outline-none"
                />
                <button
                  onClick={() => setShowCommandPalette(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Items List */}
              <div className="p-2 max-h-80 overflow-y-auto space-y-1">
                {filteredNavItems.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No matching modules found for &quot;{searchQuery}&quot;
                  </div>
                ) : (
                  filteredNavItems.map((item, idx) => {
                    const isSelected = idx === selectedIndex
                    return (
                      <button
                        key={item.path}
                        onClick={() => {
                          navigate(item.path)
                          setShowCommandPalette(false)
                        }}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-left transition-all ${
                          isSelected
                            ? 'bg-blue-950 text-white shadow-sm'
                            : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`shrink-0 ${isSelected ? 'text-amber-400' : 'text-slate-500'}`}>
                            {item.icon}
                          </span>
                          <span className="text-xs sm:text-sm font-bold truncate">
                            {item.label}
                          </span>
                          {badges[item.path] && (
                            item.path.includes('live-class') ? (
                              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-rose-600 text-white shrink-0 flex items-center gap-1 shadow-xs animate-pulse">
                                <span className="w-1 h-1 rounded-full bg-white" />
                                LIVE
                              </span>
                            ) : (
                              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-amber-500 text-white shrink-0">
                                NEW
                              </span>
                            )
                          )}
                        </div>
                        <ArrowRight className={`h-3.5 w-3.5 shrink-0 ${isSelected ? 'text-amber-400 translate-x-0.5' : 'text-slate-300'}`} />
                      </button>
                    )
                  })
                )}
              </div>

              {/* Palette Footer Tip */}
              <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>Use ↑↓ arrows to navigate, Enter to jump</span>
                <span className="font-mono">ESC to close</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Notifications */}
      <NotificationPopup />

    </div>
  )
}
