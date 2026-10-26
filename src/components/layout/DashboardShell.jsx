import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  X,
  LogOut,
  ArrowRight,
  BookOpen,
  PlayCircle,
  FileText,
  School,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { useNavBadges } from '../../hooks/useNavBadges'
import { syncPush } from '../../utils/push'
import NotificationPopup from '../shared/NotificationPopup'
import EnablePushBanner from '../shared/EnablePushBanner'
import DashboardShellDesktop, { DashboardHeaderDesktop } from './DashboardShellDesktop'
import DashboardShellMobile, { DashboardHeaderMobile } from './DashboardShellMobile'

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
  const [studentSubjects, setStudentSubjects] = useState([])
  const [studyCards, setStudyCards] = useState([])
  const [adminBatches, setAdminBatches] = useState([])

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

  // Fetch account-specific data for Global Search
  useEffect(() => {
    if (!user?.id) return

    if (profile?.role === 'student') {
      supabase
        .from('student_profiles')
        .select('batch_id, subjects, batches(name)')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          const bId = data?.batch_id ?? null
          setStudentSubjects(data?.subjects ?? [])

          let query = supabase
            .from('study_cards')
            .select('id, title, description, subject, type, is_public, batch_id, batch_ids, chapter, chapter_id')
            .eq('is_active', true)
            .order('display_order', { ascending: true })

          if (bId) {
            query = query.or(`is_public.eq.true,batch_id.eq.${bId},batch_ids.cs.{${bId}}`)
          } else {
            query = query.eq('is_public', true)
          }

          query.then(({ data: cardData, error }) => {
            if (!error && cardData) {
              setStudyCards(cardData)
            } else {
              // Resilient fallback for public cards
              supabase
                .from('study_cards')
                .select('id, title, description, subject, type, is_public, batch_id, batch_ids, chapter, chapter_id')
                .eq('is_active', true)
                .eq('is_public', true)
                .then(({ data: pubData }) => {
                  setStudyCards(pubData || [])
                })
            }
          })
        })
    } else if (profile?.role === 'admin' || profile?.role === 'teacher') {
      // Fetch batches for Admin & Teacher
      supabase
        .from('batches')
        .select('id, name, subjects, teacher_id, teacher_ids, is_active')
        .order('name')
        .then(({ data: batchData }) => {
          const allBatches = batchData || []
          const filteredBatches = profile?.role === 'teacher'
            ? allBatches.filter(b => b.teacher_id === user.id || (Array.isArray(b.teacher_ids) && b.teacher_ids.includes(user.id)))
            : allBatches

          const effectiveBatches = filteredBatches.length > 0 ? filteredBatches : allBatches
          setAdminBatches(effectiveBatches)

          // Derive unique subjects from batches
          const subjSet = new Set()
          effectiveBatches.forEach(b => {
            if (Array.isArray(b.subjects)) {
              b.subjects.forEach(s => s && subjSet.add(s))
            }
          })
          setStudentSubjects(Array.from(subjSet))
        })

      // Fetch active study cards for Global Search
      supabase
        .from('study_cards')
        .select('id, title, description, subject, type, is_public, batch_id, batch_ids, chapter, chapter_id')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .then(({ data: cardData }) => {
          setStudyCards(cardData || [])
        })
    }
  }, [user?.id, profile?.role])

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const avatarBg = AVATAR_BG[profile?.role] || 'from-gray-600 to-gray-700'
  const portalName = PORTAL_NAMES[profile?.role] || pageTitle || 'Academic Portal'

  // Primary bottom tab items on mobile (first 4 items, rest in sheet)
  const primaryMobileTabs = useMemo(() => navItems.slice(0, 4), [navItems])
  const secondaryMobileTabs = useMemo(() => navItems.slice(4), [navItems])

  // Unified Global Search across:
  // 1. Portal Modules & Pages
  // 2. Subject Workspaces
  // 3. Lectures & Study Materials
  // 4. Quick Actions
  // Unified Global Search across:
  // 1. Portal Modules & Pages
  // 2. Subject Workspaces
  // 3. Lectures & Study Materials
  // 4. Quick Actions
  const groupedSearchResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    const sections = []

    // 1. Portal Modules & Pages
    const matchingNav = (navItems || []).filter(item => {
      if (!q) return true
      return item.label.toLowerCase().includes(q)
    })
    if (matchingNav.length > 0) {
      sections.push({
        title: 'Portal Modules & Pages',
        items: matchingNav.map(item => ({
          id: `nav-${item.path}`,
          type: 'module',
          label: item.label,
          icon: item.icon,
          badge: badges[item.path],
          action: () => {
            navigate(item.path)
            setShowCommandPalette(false)
          }
        }))
      })
    }

    // 2. Batches (for Admin & Teacher)
    if ((profile?.role === 'admin' || profile?.role === 'teacher') && adminBatches.length > 0 && q) {
      const matchingBatches = adminBatches.filter(b => (b.name || '').toLowerCase().includes(q)).slice(0, 5)
      if (matchingBatches.length > 0) {
        const studyBasePath = profile?.role === 'admin' ? '/admin/study' : '/teacher/study'
        sections.push({
          title: 'Batches',
          items: matchingBatches.map(b => ({
            id: `batch-${b.id}`,
            type: 'batch',
            label: b.name,
            subtext: Array.isArray(b.subjects) && b.subjects.length > 0 ? b.subjects.join(' • ') : undefined,
            icon: <School className="h-4 w-4 text-indigo-500" />,
            action: () => {
              navigate(`${studyBasePath}?batch=${b.id}`)
              setShowCommandPalette(false)
            }
          }))
        })
      }
    }

    // 3. Subject Workspaces (for all roles)
    if (studentSubjects.length > 0) {
      const matchingSubjs = studentSubjects.filter(s => !q || s.toLowerCase().includes(q))
      if (matchingSubjs.length > 0) {
        const studyBasePath = profile?.role === 'admin' ? '/admin/study' : profile?.role === 'teacher' ? '/teacher/study' : '/student/study'
        sections.push({
          title: 'Subject Workspaces',
          items: matchingSubjs.map(s => ({
            id: `subject-${s}`,
            type: 'subject',
            label: `${s} Workspace`,
            icon: <BookOpen className="h-4 w-4 text-amber-500" />,
            action: () => {
              navigate(`${studyBasePath}?subject=${encodeURIComponent(s)}`)
              setShowCommandPalette(false)
            }
          }))
        })
      }
    }

    // 4. Lectures & Study Materials (for all roles)
    if (studyCards.length > 0 && q) {
      const matchingCards = studyCards.filter(c => {
        return (
          (c.title || '').toLowerCase().includes(q) ||
          (c.subject || '').toLowerCase().includes(q) ||
          (c.chapter || '').toLowerCase().includes(q) ||
          (c.description || '').toLowerCase().includes(q)
        )
      }).slice(0, 6)

      if (matchingCards.length > 0) {
        const isStudent = profile?.role === 'student'
        const studyBasePath = profile?.role === 'admin' ? '/admin/study' : profile?.role === 'teacher' ? '/teacher/study' : '/student/study'

        sections.push({
          title: 'Lectures & Study Materials',
          items: matchingCards.map(card => {
            const isVideo = card.type === 'youtube_video' || card.type === 'youtube_playlist'
            return {
              id: `card-${card.id}`,
              type: 'study',
              label: card.title,
              subtext: card.subject ? `${card.subject}${card.chapter ? ` • ${card.chapter}` : ''}` : card.chapter || undefined,
              icon: isVideo ? <PlayCircle className="h-4 w-4 text-rose-500" /> : <FileText className="h-4 w-4 text-emerald-500" />,
              badgeLabel: card.type === 'youtube_playlist' ? 'Playlist' : isVideo ? 'Video' : 'Notes',
              badgeColor: isVideo ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
              action: () => {
                if (isStudent) {
                  if (isVideo) {
                    const chParam = card.chapter_id || card.chapter ? `&returnChapter=${encodeURIComponent(card.chapter_id || card.chapter)}` : ''
                    navigate(`/student/watch/${card.id}?returnSubject=${encodeURIComponent(card.subject || '')}${chParam}`)
                  } else {
                    navigate(`/student/study?subject=${encodeURIComponent(card.subject || '')}&cardId=${card.id}`)
                  }
                } else {
                  const bParam = card.batch_id ? `batch=${card.batch_id}&` : ''
                  const sParam = card.subject ? `subject=${encodeURIComponent(card.subject)}&` : ''
                  navigate(`${studyBasePath}?${bParam}${sParam}cardId=${card.id}`)
                }
                setShowCommandPalette(false)
              }
            }
          })
        })
      }
    }

    // 5. Quick Actions
    const quickActions = []
    if (q) {
      if (profile?.role === 'student') {
        quickActions.push({
          id: 'action-search-study',
          type: 'action',
          label: `Filter Study Hub for "${searchQuery.trim()}"`,
          icon: <Search className="h-4 w-4 text-blue-600" />,
          action: () => {
            navigate(`/student/study?search=${encodeURIComponent(searchQuery.trim())}`)
            setShowCommandPalette(false)
          }
        })
      } else {
        const studyBasePath = profile?.role === 'admin' ? '/admin/study' : '/teacher/study'
        quickActions.push({
          id: 'action-search-study',
          type: 'action',
          label: `Filter Study Materials for "${searchQuery.trim()}"`,
          icon: <Search className="h-4 w-4 text-blue-600" />,
          action: () => {
            navigate(`${studyBasePath}?search=${encodeURIComponent(searchQuery.trim())}`)
            setShowCommandPalette(false)
          }
        })
      }
    }

    if (quickActions.length > 0) {
      sections.push({
        title: 'Quick Actions',
        items: quickActions
      })
    }

    return sections
  }, [searchQuery, navItems, profile?.role, studentSubjects, studyCards, adminBatches, badges, navigate])

  const flatResults = useMemo(() => {
    return groupedSearchResults.flatMap(s => s.items)
  }, [groupedSearchResults])

  useEffect(() => {
    setSelectedIndex(0)
  }, [searchQuery])

  const handleCommandKeyNav = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev + 1) % (flatResults.length || 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev - 1 + flatResults.length) % (flatResults.length || 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (flatResults[selectedIndex]) {
        flatResults[selectedIndex].action()
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

      {/* 1. Desktop Left Sidebar (Dedicated Desktop Layout File) */}
      <DashboardShellDesktop
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        portalName={portalName}
        avatarBg={avatarBg}
        profile={profile}
        initials={initials}
        roleColors={ROLE_COLORS}
        setShowCommandPalette={setShowCommandPalette}
        navItems={navItems}
        badges={badges}
        handleSignOut={handleSignOut}
        pageTitle={pageTitle}
      />

      {/* ============================================================ */}
      {/* 2. Main Portal Area & Responsive Top Header                  */}
      {/* ============================================================ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">

        {/* Top Header Bar (Balanced & Well-Filled on Both Mobile & Desktop) */}
        <header className="bg-white/85 backdrop-blur-xl border-b border-slate-200/70 px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-3 shrink-0 shadow-sm relative z-30">

          {/* Left: Brand Monogram & Portal on Mobile / Page Title on Desktop */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Brand Monogram */}
            <DashboardHeaderMobile portalName={portalName} />

            {/* Desktop Page Title & Badge */}
            <DashboardHeaderDesktop pageTitle={pageTitle} />
          </div>

          {/* Right: Quick Search Button & Profile Avatar */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Quick ⌘K Search Button */}
            <button
              onClick={() => setShowCommandPalette(true)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-100/80 hover:bg-slate-200/80 text-slate-600 hover:text-slate-900 border border-slate-200/80 transition-all text-xs font-semibold active:scale-95 shadow-sm"
              title="Global Search (⌘K / Ctrl+K)"
              aria-label="Global Search (⌘K / Ctrl+K)"
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
                          <span>Global Search (⌘K)</span>
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
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden p-3.5 sm:p-5 md:p-6 pb-28 lg:pb-8 overscroll-contain [-webkit-overflow-scrolling:touch] no-scrollbar sm:[&::-webkit-scrollbar]:block">
          <EnablePushBanner />
          <Outlet />
        </main>
      </div>

      {/* 3 & 4. Mobile Bottom Dock & Sheet Modal (< lg) (Dedicated Mobile Layout File) */}
      <DashboardShellMobile
        primaryMobileTabs={primaryMobileTabs}
        navItems={navItems}
        badges={badges}
        isSecondaryActive={isSecondaryActive}
        hasSecondaryLiveBadge={hasSecondaryLiveBadge}
        hasSecondaryBadge={hasSecondaryBadge}
        activeSecondaryItem={activeSecondaryItem}
        showMoreSheet={showMoreSheet}
        setShowMoreSheet={setShowMoreSheet}
        closeSheet={closeSheet}
        handleModuleClick={handleModuleClick}
        location={location}
        handleSignOut={handleSignOut}
      />

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
            className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-start justify-center p-3 sm:p-4 pt-10 sm:pt-16 overflow-hidden"
            onClick={() => setShowCommandPalette(false)}
          >
            {/* Modal Dialog */}
            <motion.div
              key="command-palette-dialog"
              initial={{ opacity: 0, scale: 0.96, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -8 }}
              transition={{ duration: 0.15 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden z-10 flex flex-col max-h-[82vh] sm:max-h-[72vh]"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={handleCommandKeyNav}
            >
              {/* Search Bar Input */}
              <div className="flex items-center gap-2.5 px-3.5 py-3 border-b border-slate-100 bg-slate-50/70 shrink-0">
                <Search className="h-4 w-4 text-indigo-600 shrink-0 ml-0.5" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search modules, subjects, lectures, or notes…"
                  className="w-full bg-transparent border-none text-slate-900 placeholder-slate-400 text-xs sm:text-sm font-semibold focus:outline-none"
                />
                {searchQuery ? (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
                    title="Clear query"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <kbd className="hidden sm:inline-block text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-400">
                    ESC
                  </kbd>
                )}
              </div>

              {/* Grouped Search Results List */}
              <div className="flex-1 overflow-y-auto overscroll-contain p-2 space-y-2 custom-scrollbar min-h-0">
                {flatResults.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 font-medium">
                    No matching results found for &ldquo;{searchQuery}&rdquo;
                  </div>
                ) : (
                  groupedSearchResults.map((section) => (
                    <div key={section.title} className="space-y-0.5">
                      <div className="px-3 pt-1 pb-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        {section.title}
                      </div>
                      {section.items.map((item) => {
                        const itemIndex = flatResults.findIndex(fi => fi.id === item.id)
                        const isSelected = itemIndex === selectedIndex
                        return (
                          <button
                            key={item.id}
                            onClick={item.action}
                            onMouseEnter={() => setSelectedIndex(itemIndex)}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 sm:py-2 rounded-xl text-left transition-colors cursor-pointer group ${
                              isSelected
                                ? 'bg-blue-950 text-white shadow-xs'
                                : 'hover:bg-slate-100/90 text-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <span className={`h-4 w-4 shrink-0 flex items-center justify-center transition-colors ${
                                isSelected ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-600'
                              }`}>
                                {item.icon}
                              </span>
                              <div className="min-w-0 flex-1 flex items-baseline gap-2">
                                <span className="text-xs sm:text-sm font-semibold truncate">
                                  {item.label}
                                </span>
                                {item.subtext && (
                                  <span className={`text-[11px] truncate hidden sm:inline ${
                                    isSelected ? 'text-slate-300' : 'text-slate-400 font-normal'
                                  }`}>
                                    {item.subtext}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                              {item.badgeLabel && (
                                <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded border ${
                                  isSelected ? 'bg-white/20 text-white border-white/20' : item.badgeColor
                                }`}>
                                  {item.badgeLabel}
                                </span>
                              )}
                              {item.badge && (
                                item.badge.includes && item.badge.includes('live-class') ? (
                                  <span className="text-[8.5px] font-black px-1.5 py-0.5 rounded-full bg-rose-600 text-white shrink-0 animate-pulse">
                                    LIVE
                                  </span>
                                ) : (
                                  <span className="text-[8.5px] font-black px-1.5 py-0.5 rounded-full bg-amber-500 text-white shrink-0">
                                    NEW
                                  </span>
                                )
                              )}
                              {isSelected ? (
                                <kbd className="hidden sm:inline-flex items-center text-[9px] font-mono px-1 py-0.5 rounded bg-white/20 text-white border border-white/20">
                                  ↵
                                </kbd>
                              ) : (
                                <ArrowRight className="h-3 w-3 shrink-0 text-slate-300 group-hover:text-slate-400 transition-colors" />
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  ))
                )}
              </div>

              {/* Palette Footer Tip */}
              <div className="px-3.5 py-2 bg-slate-50/90 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
                <span>Use ↑↓ arrows to navigate, Enter to select</span>
                <span className="font-mono text-[10px]">ESC to close</span>
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
