#!/bin/bash
# ============================================================
# phase3.sh — Student Dashboard (Phase 3)
# Run inside coaching-institute folder: bash phase3.sh
# ============================================================
set -e
echo "🏗️  Building Phase 3 — Student Dashboard..."

mkdir -p src/components/layout
mkdir -p src/pages/student
mkdir -p src/hooks

# ============================================================
# 1. DASHBOARD SHELL
# ============================================================
cat > src/components/layout/DashboardShell.jsx << 'EOF'
import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Menu, X, Bell, LogOut, ChevronLeft, ChevronRight, GraduationCap } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { INSTITUTE_NAME } from '../../lib/constants'

function initials(name) {
  if (!name) return '?'
  return name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('')
}

const ROLE_COLORS = {
  student: 'bg-green-100 text-green-800',
  teacher: 'bg-blue-100 text-blue-800',
  admin:   'bg-purple-100 text-purple-800',
}

export default function DashboardShell({ navItems, pageTitle }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [collapsed,    setCollapsed]    = useState(false)
  const [drawerOpen,   setDrawerOpen]   = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)

  const handleSignOut = async () => { await signOut(); navigate('/') }

  const NavItems = ({ onClick }) => (
    <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
      {navItems.map(item => (
        <NavLink key={item.path} to={item.path} onClick={onClick}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
             ${isActive
               ? 'bg-blue-950 text-white border-l-4 border-amber-400 pl-2'
               : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`
          }>
          <span className="flex-shrink-0">{item.icon}</span>
          {!collapsed && <span>{item.label}</span>}
        </NavLink>
      ))}
    </nav>
  )

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* ---- Desktop Sidebar ---- */}
      <aside className={`hidden lg:flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'}`}>
        {/* Logo */}
        <div className={`flex items-center gap-2 px-3 py-4 border-b border-gray-100 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 bg-blue-950 rounded-lg flex items-center justify-center flex-shrink-0">
            <GraduationCap className="h-4 w-4 text-white" />
          </div>
          {!collapsed && <span className="font-bold text-blue-950 text-sm truncate">{INSTITUTE_NAME}</span>}
        </div>

        {/* User info */}
        {!collapsed && (
          <div className="px-3 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-blue-950 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {initials(profile?.full_name)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{profile?.full_name}</p>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${ROLE_COLORS[profile?.role] || 'bg-gray-100 text-gray-600'}`}>
                  {profile?.role}
                </span>
              </div>
            </div>
          </div>
        )}

        <NavItems />

        {/* Collapse toggle + sign out */}
        <div className="border-t border-gray-100 p-2 space-y-1">
          <button onClick={handleSignOut}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ${collapsed ? 'justify-center' : ''}`}>
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {!collapsed && 'Sign Out'}
          </button>
          <button onClick={() => setCollapsed(c => !c)}
            className="w-full flex items-center justify-center p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </aside>

      {/* ---- Mobile Drawer ---- */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <div className="relative w-72 bg-white flex flex-col shadow-xl animate-slide-in-right">
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-blue-950 rounded-lg flex items-center justify-center">
                  <GraduationCap className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="font-bold text-blue-950 text-sm">{INSTITUTE_NAME}</span>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-950 flex items-center justify-center text-white font-bold">
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
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <LogOut className="h-4 w-4" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Main area ---- */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button onClick={() => setDrawerOpen(true)} className="lg:hidden p-1.5 text-gray-500 hover:text-gray-700">
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="font-bold text-lg text-gray-900 flex-1">{pageTitle}</h1>
          <div className="relative">
            <button onClick={() => setShowDropdown(s => !s)}
              className="w-8 h-8 rounded-full bg-blue-950 flex items-center justify-center text-white text-sm font-bold hover:bg-blue-800 transition-colors">
              {initials(profile?.full_name)}
            </button>
            {showDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
                <div className="absolute right-0 top-10 z-20 w-44 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-900 truncate">{profile?.full_name}</p>
                    <p className="text-xs text-gray-500 truncate">{profile?.email}</p>
                  </div>
                  <button onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                    <LogOut className="h-4 w-4" /> Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>

      {/* ---- Mobile bottom tab bar ---- */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-30">
        {navItems.slice(0, 5).map(item => (
          <NavLink key={item.path} to={item.path}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 text-xs transition-colors
               ${isActive ? 'text-blue-950 font-semibold' : 'text-gray-500'}`
            }>
            <span className="mb-0.5">{item.icon}</span>
            <span className="truncate max-w-full px-1">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
EOF
echo "  ✅ DashboardShell"

# ============================================================
# 2. STUDENT DASHBOARD (home page)
# ============================================================
cat > src/pages/student/StudentDashboard.jsx << 'EOF'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, CheckCircle, Bell, CreditCard, MessageCircle, TrendingUp } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { LayoutDashboard, CalendarCheck } from 'lucide-react'

export default function StudentDashboard() {
  const { profile, user } = useAuth()
  const [stats, setStats] = useState({ present: 0, absent: 0, pending_fees: 0, unread: 0 })
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const [attRes, feeRes, msgRes, notifRes] = await Promise.all([
        supabase.from('attendance').select('status').eq('student_id', user.id),
        supabase.from('fee_records').select('id').eq('student_id', user.id).eq('status', 'pending'),
        supabase.from('messages').select('id').eq('receiver_id', user.id).eq('is_read', false),
        supabase.from('notifications').select('id, title, body, type, created_at').eq('is_active', true).order('created_at', { ascending: false }).limit(5),
      ])
      const att = attRes.data ?? []
      setStats({
        present: att.filter(a => a.status === 'present').length,
        absent: att.filter(a => a.status === 'absent').length,
        pending_fees: feeRes.data?.length ?? 0,
        unread: msgRes.data?.length ?? 0,
      })
      setNotifications(notifRes.data ?? [])
      setLoading(false)
    }
    load()
  }, [user])

  const pct = stats.present + stats.absent > 0
    ? Math.round((stats.present / (stats.present + stats.absent)) * 100) : 0

  const quickLinks = [
    { label: 'Attendance',    path: 'attendance',    icon: <CalendarCheck className="h-6 w-6" />, color: 'bg-green-50 text-green-700',  desc: `${pct}% this year` },
    { label: 'Study',         path: 'study',         icon: <BookOpen className="h-6 w-6" />,      color: 'bg-blue-50 text-blue-700',    desc: 'Lectures & homework' },
    { label: 'Messages',      path: 'messages',      icon: <MessageCircle className="h-6 w-6" />, color: 'bg-purple-50 text-purple-700',desc: stats.unread > 0 ? `${stats.unread} unread` : 'All caught up' },
    { label: 'Pay Fee',       path: 'pay-fee',       icon: <CreditCard className="h-6 w-6" />,    color: 'bg-amber-50 text-amber-700',  desc: stats.pending_fees > 0 ? `${stats.pending_fees} pending` : 'All clear' },
    { label: 'Notifications', path: 'notifications', icon: <Bell className="h-6 w-6" />,          color: 'bg-red-50 text-red-700',      desc: 'Announcements' },
  ]

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-blue-950 to-blue-800 rounded-2xl p-6 text-white">
        <p className="text-blue-200 text-sm mb-1">Welcome back 👋</p>
        <h2 className="font-bold text-2xl">{profile?.full_name}</h2>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 bg-white/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{pct}%</p>
            <p className="text-xs text-blue-200 mt-0.5">Attendance</p>
          </div>
          <div className="flex-1 bg-white/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{stats.present}</p>
            <p className="text-xs text-blue-200 mt-0.5">Days Present</p>
          </div>
          <div className="flex-1 bg-white/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{stats.absent}</p>
            <p className="text-xs text-blue-200 mt-0.5">Days Absent</p>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {quickLinks.map(q => (
          <Link key={q.path} to={q.path}
            className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className={`w-10 h-10 rounded-lg ${q.color} flex items-center justify-center mb-3`}>
              {q.icon}
            </div>
            <p className="font-semibold text-gray-900 text-sm">{q.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{q.desc}</p>
          </Link>
        ))}
      </div>

      {/* Recent notifications */}
      {notifications.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Recent Announcements</h3>
            <Link to="notifications" className="text-xs text-blue-700 font-medium hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {notifications.map(n => (
              <div key={n.id} className="px-4 py-3">
                <p className="text-sm font-medium text-gray-900">{n.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{n.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
EOF
echo "  ✅ StudentDashboard home"

# ============================================================
# 3. ATTENDANCE PAGE
# ============================================================
cat > src/pages/student/Attendance.jsx << 'EOF'
import { useState, useEffect } from 'react'
import { CheckCircle, Clock, XCircle, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

function todayISO() { return new Date().toISOString().split('T')[0] }

const STATUS_STYLES = {
  present: { label: 'Present', color: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3.5 w-3.5" /> },
  absent:  { label: 'Absent',  color: 'bg-red-100 text-red-800',     icon: <XCircle className="h-3.5 w-3.5" /> },
  late:    { label: 'Late',    color: 'bg-amber-100 text-amber-800', icon: <Clock className="h-3.5 w-3.5" /> },
}

export default function Attendance() {
  const { user } = useAuth()
  const [records,     setRecords]     = useState([])
  const [todayRecord, setTodayRecord] = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [marking,     setMarking]     = useState(null)
  const [confirm,     setConfirm]     = useState(null)
  const [page,        setPage]        = useState(1)
  const PER_PAGE = 20

  useEffect(() => {
    if (!user) return
    supabase.from('attendance').select('*').eq('student_id', user.id)
      .order('date', { ascending: false })
      .then(({ data }) => {
        const all = data ?? []
        setRecords(all)
        setTodayRecord(all.find(r => r.date === todayISO()) ?? null)
        setLoading(false)
      })
  }, [user])

  const mark = async (status) => {
    setMarking(status)
    const { data, error } = await supabase.from('attendance').insert({
      student_id: user.id, date: todayISO(), status, marked_by: user.id,
    }).select().single()
    if (error) {
      toast.error(error.code === '23505' ? 'Already marked today.' : error.message)
    } else {
      setTodayRecord(data)
      setRecords(r => [data, ...r])
      toast.success(`Marked as ${status}!`)
    }
    setMarking(null)
    setConfirm(null)
  }

  const present = records.filter(r => r.status === 'present').length
  const absent  = records.filter(r => r.status === 'absent').length
  const late    = records.filter(r => r.status === 'late').length
  const total   = present + absent + late
  const pct     = total > 0 ? Math.round(((present + late * 0.5) / total) * 100) : 0

  const paged = records.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const totalPages = Math.ceil(records.length / PER_PAGE)

  return (
    <div className="space-y-6 pb-20 lg:pb-0">

      {/* Mark today */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-blue-950" />
          <div>
            <h2 className="font-bold text-gray-900">Today's Attendance</h2>
            <p className="text-sm text-gray-500">{new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</p>
          </div>
        </div>

        {todayRecord ? (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl ${STATUS_STYLES[todayRecord.status]?.color}`}>
            {STATUS_STYLES[todayRecord.status]?.icon}
            <span className="font-semibold">Marked as {STATUS_STYLES[todayRecord.status]?.label}</span>
            <span className="ml-auto text-xs opacity-70">
              {new Date(todayRecord.marked_at).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}
            </span>
          </div>
        ) : confirm ? (
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="font-medium text-gray-900 mb-3">
              Mark yourself as <span className="capitalize font-bold">{confirm}</span> today?
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => mark(confirm)} disabled={!!marking}
                className="px-6 py-2 bg-blue-950 text-white font-semibold rounded-lg hover:bg-blue-900 disabled:opacity-50 transition-colors">
                {marking ? 'Saving…' : 'Confirm'}
              </button>
              <button onClick={() => setConfirm(null)} className="px-6 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-100">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <button onClick={() => setConfirm('present')}
              className="flex flex-col items-center gap-1.5 p-4 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl font-semibold transition-colors border-2 border-transparent hover:border-green-300">
              <CheckCircle className="h-6 w-6" />
              <span className="text-sm">Present</span>
            </button>
            <button onClick={() => setConfirm('late')}
              className="flex flex-col items-center gap-1.5 p-4 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl font-semibold transition-colors border-2 border-transparent hover:border-amber-300">
              <Clock className="h-6 w-6" />
              <span className="text-sm">Late</span>
            </button>
            <button onClick={() => setConfirm('absent')}
              className="flex flex-col items-center gap-1.5 p-4 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl font-semibold transition-colors border-2 border-transparent hover:border-red-300">
              <XCircle className="h-6 w-6" />
              <span className="text-sm">Absent</span>
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{present}</p>
          <p className="text-xs text-gray-500 mt-1">Present</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-red-500">{absent}</p>
          <p className="text-xs text-gray-500 mt-1">Absent</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className={`text-2xl font-bold ${pct >= 75 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{pct}%</p>
          <p className="text-xs text-gray-500 mt-1">Attendance</p>
        </div>
      </div>

      {/* Attendance history table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Attendance History</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No attendance records yet.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Date', 'Day', 'Status', 'Marked At'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paged.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {new Date(r.date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(r.date).toLocaleDateString('en-IN', { weekday:'short' })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[r.status]?.color}`}>
                          {STATUS_STYLES[r.status]?.icon} {STATUS_STYLES[r.status]?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(r.marked_at).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">Showing {(page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE, records.length)} of {records.length}</p>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => p-1)} disabled={page===1}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">← Prev</button>
                  <button onClick={() => setPage(p => p+1)} disabled={page===totalPages}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">Next →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
EOF
echo "  ✅ Attendance"

# ============================================================
# 4. STUDY SECTION
# ============================================================
cat > src/pages/student/StudySection.jsx << 'EOF'
import { useState, useEffect } from 'react'
import { BookOpen, PlayCircle, ExternalLink, Heart, Youtube, Link as LinkIcon, Video } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

function getYTThumb(url) {
  const match = url?.match(/(?:youtu\.be\/|watch\?v=|embed\/)([^#&?]{11})/)
  return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null
}

const TYPE_BADGES = {
  youtube_video:    { label: 'YouTube', color: 'bg-red-100 text-red-700',    icon: <Youtube className="h-3 w-3" /> },
  youtube_playlist: { label: 'Playlist', color: 'bg-red-100 text-red-700',   icon: <Youtube className="h-3 w-3" /> },
  google_drive:     { label: 'Drive',    color: 'bg-blue-100 text-blue-700', icon: <ExternalLink className="h-3 w-3" /> },
  external_link:    { label: 'Link',     color: 'bg-gray-100 text-gray-700', icon: <LinkIcon className="h-3 w-3" /> },
}

function StudyCard({ card, bookmarked, onBookmark }) {
  const thumb = card.thumbnail_url || getYTThumb(card.url)
  const badge = TYPE_BADGES[card.type] || TYPE_BADGES.external_link
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col">
      <div className="relative">
        {thumb
          ? <img src={thumb} alt={card.title} loading="lazy" className="w-full h-40 object-cover" />
          : <div className="w-full h-40 bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
              <BookOpen className="h-8 w-8 text-blue-300" />
            </div>
        }
        {(card.type === 'youtube_video' || card.type === 'youtube_playlist') && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center">
              <PlayCircle className="h-6 w-6 text-white" />
            </div>
          </div>
        )}
      </div>
      <div className="p-3 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-1 mb-1">
          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${badge.color}`}>
            {badge.icon} {badge.label}
          </span>
          <button onClick={() => onBookmark(card.id, bookmarked)}
            className={`p-1 rounded-full transition-colors ${bookmarked ? 'text-red-500 hover:text-red-700' : 'text-gray-300 hover:text-red-400'}`}>
            <Heart className={`h-4 w-4 ${bookmarked ? 'fill-current' : ''}`} />
          </button>
        </div>
        <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 flex-1">{card.title}</h3>
        {card.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{card.description}</p>}
        <a href={card.url} target="_blank" rel="noopener noreferrer"
          className="mt-3 block text-center py-1.5 bg-blue-950 hover:bg-blue-900 text-white text-xs font-semibold rounded-lg transition-colors">
          {card.type.startsWith('youtube') ? '▶ Watch' : '→ Open'}
        </a>
      </div>
    </div>
  )
}

const TABS = ['All', 'My Batch', 'Featured', 'Bookmarked']

export default function StudySection() {
  const { user } = useAuth()
  const [cards,       setCards]       = useState([])
  const [bookmarks,   setBookmarks]   = useState(new Set())
  const [homework,    setHomework]    = useState([])
  const [submissions, setSubmissions] = useState({})
  const [tab,         setTab]         = useState('All')
  const [loading,     setLoading]     = useState(true)
  const [liveClass,   setLiveClass]   = useState(null)
  const [batchId,     setBatchId]     = useState(null)
  const [driveLinks,  setDriveLinks]  = useState({})

  // Get student batch
  useEffect(() => {
    if (!user) return
    supabase.from('student_profiles').select('batch_id').eq('id', user.id).single()
      .then(({ data }) => setBatchId(data?.batch_id ?? null))
  }, [user])

  // Fetch live class (realtime)
  useEffect(() => {
    if (!user) return
    const fetchLive = () => {
      supabase.from('live_classes').select('*, profiles(full_name)')
        .eq('is_active', true).order('created_at', { ascending: false }).limit(1)
        .then(({ data }) => setLiveClass(data?.[0] ?? null))
    }
    fetchLive()
    const channel = supabase.channel('live_classes_watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_classes' }, fetchLive)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user])

  // Fetch cards
  useEffect(() => {
    if (!user) return
    setLoading(true)
    let query = supabase.from('study_cards').select('*').eq('is_active', true).order('display_order')
    if (tab === 'Featured')  query = query.eq('is_featured', true)
    if (tab === 'My Batch' && batchId) query = query.or(`batch_id.eq.${batchId},batch_id.is.null`)
    query.then(({ data }) => { setCards(data ?? []); setLoading(false) })
  }, [tab, batchId, user])

  // Fetch bookmarks
  useEffect(() => {
    if (!user) return
    supabase.from('student_bookmarks').select('study_card_id').eq('student_id', user.id)
      .then(({ data }) => setBookmarks(new Set((data ?? []).map(b => b.study_card_id))))
  }, [user])

  // Fetch homework
  useEffect(() => {
    if (!user || !batchId) return
    supabase.from('homework').select('*').eq('batch_id', batchId).eq('is_active', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => setHomework(data ?? []))
    supabase.from('homework_submissions').select('homework_id, submitted_at, grade')
      .eq('student_id', user.id)
      .then(({ data }) => {
        const map = {}
        ;(data ?? []).forEach(s => { map[s.homework_id] = s })
        setSubmissions(map)
      })
  }, [user, batchId])

  const toggleBookmark = async (cardId, isBookmarked) => {
    if (isBookmarked) {
      await supabase.from('student_bookmarks').delete().eq('student_id', user.id).eq('study_card_id', cardId)
      setBookmarks(s => { const n = new Set(s); n.delete(cardId); return n })
      toast.success('Removed from bookmarks')
    } else {
      await supabase.from('student_bookmarks').insert({ student_id: user.id, study_card_id: cardId })
      setBookmarks(s => new Set(s).add(cardId))
      toast.success('Bookmarked!')
    }
  }

  const submitHomework = async (hwId) => {
    const link = driveLinks[hwId]?.trim()
    if (!link) { toast.error('Paste your Google Drive link first'); return }
    const { error } = await supabase.from('homework_submissions').insert({ homework_id: hwId, student_id: user.id, drive_link: link })
    if (error) toast.error(error.message)
    else {
      toast.success('Submitted!')
      setSubmissions(s => ({ ...s, [hwId]: { homework_id: hwId, submitted_at: new Date().toISOString() } }))
      setDriveLinks(d => ({ ...d, [hwId]: '' }))
    }
  }

  const displayCards = tab === 'Bookmarked' ? cards.filter(c => bookmarks.has(c.id)) : cards

  return (
    <div className="space-y-6 pb-20 lg:pb-0">

      {/* Live class banner */}
      {liveClass && (
        <div className="bg-gradient-to-r from-red-600 to-red-500 rounded-2xl p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
            <span className="font-bold text-sm uppercase tracking-wide">Live Now</span>
          </div>
          <p className="font-bold text-lg">{liveClass.title}</p>
          {liveClass.profiles?.full_name && <p className="text-red-100 text-sm">by {liveClass.profiles.full_name}</p>}
          {liveClass.password && (
            <p className="text-sm mt-1">Password: <span className="font-mono bg-white/20 px-1.5 py-0.5 rounded">{liveClass.password}</span></p>
          )}
          <a href={liveClass.join_url} target="_blank" rel="noopener noreferrer"
            className="mt-3 inline-block px-6 py-2 bg-white text-red-600 font-bold rounded-xl hover:bg-red-50 transition-colors text-sm">
            Join Class →
          </a>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${tab === t ? 'bg-blue-950 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Cards grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
              <div className="h-40 bg-gray-200" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : displayCards.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <BookOpen className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">
            {tab === 'Bookmarked' ? 'No bookmarks yet. Heart a lecture to save it here.' : 'No lectures here yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayCards.map(c => (
            <StudyCard key={c.id} card={c} bookmarked={bookmarks.has(c.id)} onBookmark={toggleBookmark} />
          ))}
        </div>
      )}

      {/* Homework section */}
      {homework.length > 0 && (
        <section>
          <h2 className="font-bold text-lg text-gray-900 mb-3">Homework</h2>
          <div className="space-y-3">
            {homework.map(hw => {
              const overdue = hw.due_date && new Date(hw.due_date) < new Date()
              const submitted = !!submissions[hw.id]
              return (
                <div key={hw.id} className="bg-white rounded-xl border border-gray-100 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{hw.title}</h3>
                      {hw.description && <p className="text-sm text-gray-500 mt-0.5">{hw.description}</p>}
                      {hw.due_date && (
                        <p className={`text-xs mt-1 font-medium ${overdue ? 'text-red-600' : 'text-amber-600'}`}>
                          {overdue ? '⚠ Overdue' : '📅 Due'}: {new Date(hw.due_date).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}
                        </p>
                      )}
                    </div>
                    <a href={hw.drive_link} target="_blank" rel="noopener noreferrer"
                      className="flex-shrink-0 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg hover:bg-blue-100 transition-colors">
                      View Assignment
                    </a>
                  </div>
                  {submitted ? (
                    <div className="mt-3 flex items-center gap-2 text-green-600 bg-green-50 px-3 py-2 rounded-lg text-sm">
                      <span>✓</span> <span className="font-medium">Submitted</span>
                      {submissions[hw.id]?.grade && <span className="ml-auto font-bold">Grade: {submissions[hw.id].grade}</span>}
                    </div>
                  ) : (
                    <div className="mt-3 flex gap-2">
                      <input type="url" placeholder="Paste your Google Drive link here…"
                        value={driveLinks[hw.id] || ''}
                        onChange={e => setDriveLinks(d => ({ ...d, [hw.id]: e.target.value }))}
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600" />
                      <button onClick={() => submitHomework(hw.id)}
                        className="px-4 py-1.5 bg-blue-950 text-white text-sm font-semibold rounded-lg hover:bg-blue-900 transition-colors">
                        Submit
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
EOF
echo "  ✅ StudySection"

# ============================================================
# 5. MESSAGES PAGE
# ============================================================
cat > src/pages/student/Messages.jsx << 'EOF'
import { useState, useEffect, useRef } from 'react'
import { Send, ArrowLeft, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

function initials(name) {
  if (!name) return '?'
  return name.split(' ').filter(Boolean).slice(0,2).map(n=>n[0].toUpperCase()).join('')
}

function timeStr(d) {
  const date = new Date(d)
  const now  = new Date()
  const diff = now - date
  if (diff < 86400000) return date.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })
  return date.toLocaleDateString('en-IN', { day:'numeric', month:'short' })
}

export default function Messages() {
  const { user } = useAuth()
  const [contacts,  setContacts]  = useState([])
  const [selected,  setSelected]  = useState(null)
  const [messages,  setMessages]  = useState([])
  const [text,      setText]      = useState('')
  const [sending,   setSending]   = useState(false)
  const [showList,  setShowList]  = useState(true)
  const bottomRef = useRef(null)

  // Load contacts (all teachers + admins)
  useEffect(() => {
    supabase.from('profiles').select('id, full_name, role, email')
      .in('role', ['teacher', 'admin']).order('role')
      .then(({ data }) => setContacts(data ?? []))
  }, [])

  // Load messages for selected contact
  useEffect(() => {
    if (!selected || !user) return
    supabase.from('messages').select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selected.id}),and(sender_id.eq.${selected.id},receiver_id.eq.${user.id})`)
      .order('created_at')
      .then(({ data }) => {
        setMessages(data ?? [])
        // Mark as read
        supabase.from('messages').update({ is_read: true })
          .eq('receiver_id', user.id).eq('sender_id', selected.id).eq('is_read', false)
          .then(() => {})
      })
  }, [selected, user])

  // Realtime subscription
  useEffect(() => {
    if (!user) return
    const channel = supabase.channel('messages_watch')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `receiver_id=eq.${user.id}`
      }, payload => {
        if (payload.new.sender_id === selected?.id) {
          setMessages(m => [...m, payload.new])
        }
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user, selected])

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!text.trim() || !selected) return
    setSending(true)
    const { data, error } = await supabase.from('messages').insert({
      sender_id: user.id, receiver_id: selected.id, content: text.trim()
    }).select().single()
    if (error) toast.error(error.message)
    else { setMessages(m => [...m, data]); setText('') }
    setSending(false)
  }

  const openConvo = (contact) => { setSelected(contact); setShowList(false) }

  return (
    <div className="flex h-[calc(100vh-8rem)] lg:h-[calc(100vh-5rem)] bg-white rounded-2xl border border-gray-100 overflow-hidden">

      {/* Contact list */}
      <div className={`${showList ? 'flex' : 'hidden'} lg:flex flex-col w-full lg:w-72 border-r border-gray-100 flex-shrink-0`}>
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Messages</h2>
          <p className="text-xs text-gray-500">Teachers & Admin</p>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {contacts.length === 0 && (
            <div className="p-6 text-center text-sm text-gray-400">No teachers found yet.</div>
          )}
          {contacts.map(c => (
            <button key={c.id} onClick={() => openConvo(c)}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left transition-colors ${selected?.id === c.id ? 'bg-blue-50' : ''}`}>
              <div className="w-10 h-10 rounded-full bg-blue-950 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {initials(c.full_name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900 text-sm truncate">{c.full_name}</p>
                <p className="text-xs text-gray-400 capitalize">{c.role}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat window */}
      <div className={`${!showList ? 'flex' : 'hidden'} lg:flex flex-col flex-1 min-w-0`}>
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <MessageCircle className="h-12 w-12 text-gray-200 mb-3" />
            <p className="font-medium text-gray-500">Select a teacher to start messaging</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 flex-shrink-0">
              <button onClick={() => setShowList(true)} className="lg:hidden p-1 text-gray-400 hover:text-gray-600">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="w-9 h-9 rounded-full bg-blue-950 flex items-center justify-center text-white text-sm font-bold">
                {initials(selected.full_name)}
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{selected.full_name}</p>
                <p className="text-xs text-gray-400 capitalize">{selected.role}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
              {messages.length === 0 && (
                <div className="text-center text-sm text-gray-400 mt-8">
                  No messages yet. Say hello! 👋
                </div>
              )}
              {messages.map(m => {
                const mine = m.sender_id === user.id
                return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-sm px-3.5 py-2 rounded-2xl text-sm
                      ${mine ? 'bg-blue-950 text-white rounded-br-sm' : 'bg-gray-100 text-gray-900 rounded-bl-sm'}`}>
                      <p>{m.content}</p>
                      <p className={`text-xs mt-1 ${mine ? 'text-blue-300' : 'text-gray-400'}`}>{timeStr(m.created_at)}</p>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 flex-shrink-0">
              <input type="text" value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder="Type a message…"
                className="flex-1 px-4 py-2 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-colors" />
              <button onClick={send} disabled={sending || !text.trim()}
                className="w-9 h-9 bg-blue-950 hover:bg-blue-900 text-white rounded-xl flex items-center justify-center disabled:opacity-40 transition-colors flex-shrink-0">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
EOF
echo "  ✅ Messages"

# ============================================================
# 6. PAY FEE PAGE
# ============================================================
cat > src/pages/student/PayFee.jsx << 'EOF'
import { useState, useEffect } from 'react'
import { CreditCard, CheckCircle, Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

function getMonths() {
  const months = []
  const now = new Date()
  for (let i = 0; i < 4; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    months.push(d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }))
  }
  return months
}

const FEE_STATUS = {
  pending:  { label: 'Pending',  color: 'bg-amber-100 text-amber-800' },
  verified: { label: 'Verified', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
}

export default function PayFee() {
  const { user } = useAuth()
  const [step,     setStep]     = useState(1)
  const [qr,       setQr]       = useState(null)
  const [history,  setHistory]  = useState([])
  const [loading,  setLoading]  = useState(false)
  const [success,  setSuccess]  = useState(null)
  const [form, setForm] = useState({ amount: '', month: getMonths()[0], reference_id: '', screenshot_url: '' })

  useEffect(() => {
    supabase.from('qr_settings').select('*').eq('is_active', true).limit(1).single()
      .then(({ data }) => setQr(data))
    if (user) {
      supabase.from('fee_records').select('*').eq('student_id', user.id)
        .order('paid_at', { ascending: false })
        .then(({ data }) => setHistory(data ?? []))
    }
  }, [user])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.amount || !form.reference_id) { toast.error('Fill in amount and transaction ID'); return }
    setLoading(true)
    const { data, error } = await supabase.from('fee_records').insert({
      student_id: user.id, amount: parseFloat(form.amount),
      payment_month: form.month, reference_id: form.reference_id,
      screenshot_url: form.screenshot_url || null, status: 'pending',
    }).select().single()
    setLoading(false)
    if (error) { toast.error(error.message); return }
    setSuccess(data)
    setHistory(h => [data, ...h])
    setStep(3)
    toast.success('Payment submitted for verification!')
  }

  const copyUPI = () => {
    if (qr?.upi_id) { navigator.clipboard.writeText(qr.upi_id); toast.success('UPI ID copied!') }
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0 max-w-lg">

      {/* Step indicator */}
      {step < 3 && (
        <div className="flex items-center gap-2">
          {['Fill Details', 'Pay via QR', 'Done'].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                ${step === i+1 ? 'bg-blue-950 text-white' : step > i+1 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {step > i+1 ? '✓' : i+1}
              </div>
              <span className={`text-xs font-medium ${step === i+1 ? 'text-gray-900' : 'text-gray-400'}`}>{label}</span>
              {i < 2 && <div className="flex-1 h-px bg-gray-200 w-8" />}
            </div>
          ))}
        </div>
      )}

      {/* Step 1 */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-blue-950" /> Fee Payment
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount (₹)</label>
            <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)}
              placeholder="Enter amount" className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Month</label>
            <select value={form.month} onChange={e => set('month', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600">
              {getMonths().map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">UPI Transaction ID <span className="text-red-500">*</span></label>
            <input type="text" value={form.reference_id} onChange={e => set('reference_id', e.target.value)}
              placeholder="e.g. 123456789012" className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Screenshot Link (optional)</label>
            <input type="url" value={form.screenshot_url} onChange={e => set('screenshot_url', e.target.value)}
              placeholder="Google Drive link to screenshot" className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600" />
          </div>
          <button onClick={() => setStep(2)} disabled={!form.amount}
            className="w-full py-3 bg-blue-950 hover:bg-blue-900 text-white font-bold rounded-xl disabled:opacity-50 transition-colors">
            Proceed to Pay →
          </button>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center space-y-4">
          <h2 className="font-bold text-gray-900">Scan & Pay</h2>
          <p className="text-sm text-gray-500">Scan the QR code or use the UPI ID below</p>
          {qr ? (
            <>
              <img src={qr.qr_image_url} alt="Payment QR" className="w-52 h-52 mx-auto rounded-xl border-2 border-gray-200 object-contain" />
              {qr.payee_name && <p className="font-semibold text-gray-900">{qr.payee_name}</p>}
              {qr.upi_id && (
                <button onClick={copyUPI}
                  className="flex items-center gap-2 mx-auto px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors">
                  <Copy className="h-4 w-4" /> {qr.upi_id}
                </button>
              )}
              {qr.description && <p className="text-xs text-gray-500">{qr.description}</p>}
            </>
          ) : (
            <div className="py-8 text-gray-400 text-sm">QR code not set up yet. Contact admin.</div>
          )}
          <p className="text-sm font-semibold text-blue-950">Amount: ₹{form.amount} · {form.month}</p>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50">
              ← Back
            </button>
            <button onClick={submit} disabled={loading}
              className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl disabled:opacity-50 transition-colors">
              {loading ? 'Submitting…' : 'I Have Paid ✓'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Success */}
      {step === 3 && success && (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="font-bold text-xl text-gray-900">Payment Submitted!</h2>
          <p className="text-gray-500 text-sm mt-2 mb-4">Your payment is pending verification by the admin.</p>
          <div className="bg-gray-50 rounded-xl p-4 text-left space-y-1 text-sm mb-6">
            <p><span className="text-gray-500">Amount:</span> <span className="font-semibold">₹{success.amount}</span></p>
            <p><span className="text-gray-500">Month:</span> <span className="font-semibold">{success.payment_month}</span></p>
            <p><span className="text-gray-500">Reference:</span> <span className="font-mono text-xs">{success.reference_id}</span></p>
          </div>
          <button onClick={() => { setStep(1); setForm({ amount:'', month: getMonths()[0], reference_id:'', screenshot_url:'' }) }}
            className="w-full py-3 bg-blue-950 text-white font-bold rounded-xl hover:bg-blue-900">
            Pay Another Month
          </button>
        </div>
      )}

      {/* Fee history */}
      {history.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Payment History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Month', 'Amount', 'Reference', 'Status', 'Date'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {history.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{r.payment_month}</td>
                    <td className="px-4 py-3 font-semibold">₹{r.amount}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{r.reference_id || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${FEE_STATUS[r.status]?.color}`}>
                        {FEE_STATUS[r.status]?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(r.paid_at).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
EOF
echo "  ✅ PayFee"

# ============================================================
# 7. NOTIFICATIONS PAGE
# ============================================================
cat > src/pages/student/Notifications.jsx << 'EOF'
import { useState, useEffect } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const TYPE_STYLES = {
  fee:          { color: 'border-l-amber-400',  bg: 'bg-amber-50',  label: 'Fee',          icon: '💰' },
  live_class:   { color: 'border-l-red-500',    bg: 'bg-red-50',    label: 'Live Class',   icon: '🔴' },
  announcement: { color: 'border-l-blue-500',   bg: 'bg-blue-50',   label: 'Announcement', icon: '📢' },
  homework:     { color: 'border-l-purple-500', bg: 'bg-purple-50', label: 'Homework',     icon: '📝' },
  general:      { color: 'border-l-gray-400',   bg: '',             label: 'Notice',       icon: '📌' },
}

function groupByDate(items) {
  const groups = {}
  const now = new Date()
  items.forEach(n => {
    const d = new Date(n.created_at)
    const diffDays = Math.floor((now - d) / 86400000)
    const key = diffDays === 0 ? 'Today' : diffDays === 1 ? 'Yesterday' : diffDays < 7 ? 'This Week' : 'Earlier'
    if (!groups[key]) groups[key] = []
    groups[key].push(n)
  })
  return groups
}

export default function Notifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [readIds,       setReadIds]       = useState(new Set())
  const [loading,       setLoading]       = useState(true)

  useEffect(() => {
    if (!user) return
    Promise.all([
      supabase.from('notifications').select('*').eq('is_active', true)
        .or('target_role.eq.student,target_role.eq.all')
        .order('created_at', { ascending: false }),
      supabase.from('notification_reads').select('notification_id').eq('user_id', user.id),
    ]).then(([{ data: notifs }, { data: reads }]) => {
      setNotifications(notifs ?? [])
      setReadIds(new Set((reads ?? []).map(r => r.notification_id)))
      setLoading(false)
    })
  }, [user])

  const markRead = async (id) => {
    if (readIds.has(id)) return
    await supabase.from('notification_reads').insert({ user_id: user.id, notification_id: id })
    setReadIds(s => new Set(s).add(id))
  }

  const markAllRead = async () => {
    const unread = notifications.filter(n => !readIds.has(n.id))
    if (!unread.length) return
    await supabase.from('notification_reads').insert(
      unread.map(n => ({ user_id: user.id, notification_id: n.id }))
    )
    setReadIds(new Set(notifications.map(n => n.id)))
    toast.success('All marked as read')
  }

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length
  const groups = groupByDate(notifications)

  if (loading) return <div className="py-12 text-center text-gray-400 text-sm">Loading…</div>

  return (
    <div className="space-y-5 pb-20 lg:pb-0 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-lg text-gray-900">Notifications</h2>
          {unreadCount > 0 && <p className="text-sm text-gray-500">{unreadCount} unread</p>}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead}
            className="flex items-center gap-1.5 text-sm text-blue-700 font-medium hover:underline">
            <CheckCheck className="h-4 w-4" /> Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Bell className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No notifications yet.</p>
        </div>
      ) : (
        Object.entries(groups).map(([group, items]) => (
          <div key={group}>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{group}</p>
            <div className="space-y-2">
              {items.map(n => {
                const style = TYPE_STYLES[n.type] || TYPE_STYLES.general
                const isRead = readIds.has(n.id)
                return (
                  <div key={n.id} onClick={() => markRead(n.id)}
                    className={`border-l-4 ${style.color} ${style.bg} bg-white rounded-r-xl p-4 cursor-pointer hover:bg-gray-50 transition-colors
                      ${!isRead ? 'shadow-sm border border-gray-100' : 'opacity-80'}`}>
                    <div className="flex items-start gap-3">
                      <span className="text-xl flex-shrink-0">{style.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold text-gray-500 uppercase">{style.label}</span>
                          {!isRead && <span className="w-2 h-2 bg-blue-600 rounded-full" />}
                        </div>
                        <p className="font-semibold text-gray-900 text-sm">{n.title}</p>
                        <p className="text-sm text-gray-600 mt-1">{n.body}</p>
                        <p className="text-xs text-gray-400 mt-1.5">
                          {new Date(n.created_at).toLocaleString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
EOF
echo "  ✅ Notifications"

# ============================================================
# 8. STUDENT LAYOUT WRAPPER (wires DashboardShell + routes)
# ============================================================
cat > src/pages/student/StudentLayout.jsx << 'EOF'
import { LayoutDashboard, CalendarCheck, BookOpen, MessageCircle, CreditCard, Bell } from 'lucide-react'
import DashboardShell from '../../components/layout/DashboardShell'

const NAV = [
  { label: 'Home',          path: '/student/dashboard',     icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Attendance',    path: '/student/attendance',    icon: <CalendarCheck className="h-4 w-4" /> },
  { label: 'Study',         path: '/student/study',         icon: <BookOpen className="h-4 w-4" /> },
  { label: 'Messages',      path: '/student/messages',      icon: <MessageCircle className="h-4 w-4" /> },
  { label: 'Pay Fee',       path: '/student/pay-fee',       icon: <CreditCard className="h-4 w-4" /> },
  { label: 'Notifications', path: '/student/notifications', icon: <Bell className="h-4 w-4" /> },
]

export default function StudentLayout() {
  return <DashboardShell navItems={NAV} pageTitle="Student Portal" />
}
EOF
echo "  ✅ StudentLayout"

# ============================================================
# 9. UPDATE App.jsx with full student routes
# ============================================================
cat > src/App.jsx << 'EOF'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider }     from './context/AuthContext'
import { ProtectedRoute }   from './utils/roleGuard'
import { Toaster }          from 'react-hot-toast'

import Home           from './pages/Home'
import Login          from './pages/Login'
import Register       from './pages/Register'
import { NotFound, Unauthorized, AccountSuspended } from './pages/ErrorPages'

// Student
import StudentLayout        from './pages/student/StudentLayout'
import StudentDashboard     from './pages/student/StudentDashboard'
import Attendance           from './pages/student/Attendance'
import StudySection         from './pages/student/StudySection'
import Messages             from './pages/student/Messages'
import PayFee               from './pages/student/PayFee'
import StudentNotifications from './pages/student/Notifications'

// Placeholder dashboards for teacher + admin (built in Phase 4 & 5)
import { TeacherDashboard, AdminDashboard } from './pages/Dashboards'

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" toastOptions={{
        duration: 4000,
        style: { fontFamily:'Inter,system-ui,sans-serif', fontSize:'14px', borderRadius:'10px', border:'1px solid #e5e7eb' },
        success: { iconTheme: { primary:'#16a34a', secondary:'#fff' } },
        error:   { iconTheme: { primary:'#dc2626', secondary:'#fff' } },
      }} />

      <Routes>
        {/* Public */}
        <Route path="/"                  element={<Home />}             />
        <Route path="/login"             element={<Login />}            />
        <Route path="/register"          element={<Register />}         />
        <Route path="/unauthorized"      element={<Unauthorized />}     />
        <Route path="/account-suspended" element={<AccountSuspended />} />

        {/* Student */}
        <Route element={<ProtectedRoute allowedRoles={['student']} />}>
          <Route path="/student" element={<StudentLayout />}>
            <Route path="dashboard"     element={<StudentDashboard />}     />
            <Route path="attendance"    element={<Attendance />}           />
            <Route path="study"         element={<StudySection />}         />
            <Route path="messages"      element={<Messages />}             />
            <Route path="pay-fee"       element={<PayFee />}               />
            <Route path="notifications" element={<StudentNotifications />} />
          </Route>
        </Route>

        {/* Teacher (Phase 4) */}
        <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
          <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
        </Route>

        {/* Admin (Phase 5) */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  )
}
EOF
echo "  ✅ App.jsx updated with student routes"

echo ""
echo "✅ Phase 3 complete! All student pages built."
echo ""
echo "Run:  npm run dev"
echo "Then open:  http://localhost:5173/login"
echo ""
echo "Log in as a student → you'll see the full dashboard with:"
echo "  • Home with stats"
echo "  • Attendance marking + history"
echo "  • Study section with bookmarks + homework"
echo "  • Messages (WhatsApp-style)"
echo "  • Fee payment with QR"
echo "  • Notifications"
