import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  GraduationCap,
  Grid,
  X,
  LogOut,
} from 'lucide-react'
import { INSTITUTE_NAME } from '../../lib/constants'

export function DashboardHeaderMobile({ portalName }) {
  return (
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
  )
}

export default function DashboardShellMobile({
  primaryMobileTabs,
  navItems,
  badges,
  isSecondaryActive,
  hasSecondaryLiveBadge,
  hasSecondaryBadge,
  activeSecondaryItem,
  showMoreSheet,
  setShowMoreSheet,
  closeSheet,
  handleModuleClick,
  location,
  handleSignOut,
}) {
  return (
    <>
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
                            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600 ${
                              isActive ? 'ring-2 ring-blue-950' : 'ring-2 ring-white'
                            }`} />
                          </span>
                        ) : (
                          <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 animate-pulse ${
                            isActive ? 'ring-2 ring-blue-950' : 'ring-2 ring-white'
                          }`} />
                        )
                      )}
                    </span>
                    <span className="text-[10px] leading-tight text-center truncate max-w-full px-0.5">
                      {item.shortLabel || item.label}
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
                      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600 ${
                        isSecondaryActive ? 'ring-2 ring-blue-950' : 'ring-2 ring-white'
                      }`} />
                    </span>
                  ) : (
                    <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 animate-pulse ${
                      isSecondaryActive ? 'ring-2 ring-blue-950' : 'ring-2 ring-white'
                    }`} />
                  )
                )}
              </span>
              <span className="text-[10px] leading-tight text-center truncate max-w-full px-0.5">
                {activeSecondaryItem ? (activeSecondaryItem.shortLabel || activeSecondaryItem.label) : 'More'}
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
                          <span className="inline-flex items-center gap-1 mt-1 text-[8.5px] font-black uppercase tracking-wider text-rose-600 bg-rose-100/90 px-1.5 py-0.5 rounded-full border border-rose-300 shadow-2xs animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                            LIVE
                          </span>
                        ) : (
                          <span className="inline-block mt-1 text-[8.5px] font-black uppercase tracking-wider text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60">
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
    </>
  )
}
