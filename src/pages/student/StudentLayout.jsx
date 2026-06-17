import { LayoutDashboard, CalendarCheck, BookOpen, ClipboardList, MessageCircle, CreditCard, Bell, Video } from 'lucide-react'
import DashboardShell from '../../components/layout/DashboardShell'

const NAV = [
  { label: 'Home',          path: '/student/dashboard',     icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Attendance',    path: '/student/attendance',    icon: <CalendarCheck className="h-4 w-4" /> },
  { label: 'Study',         path: '/student/study',         icon: <BookOpen className="h-4 w-4" /> },
  { label: 'Homework',      path: '/student/homework',      icon: <ClipboardList className="h-4 w-4" /> },
  { label: 'Live Class',    path: '/student/live-class',    icon: <Video className="h-4 w-4" /> },
  { label: 'Messages',      path: '/student/messages',      icon: <MessageCircle className="h-4 w-4" /> },
  { label: 'Pay Fee',       path: '/student/pay-fee',       icon: <CreditCard className="h-4 w-4" /> },
  { label: 'Notifications', path: '/student/notifications', icon: <Bell className="h-4 w-4" /> },
]

export default function StudentLayout() {
  return <DashboardShell navItems={NAV} pageTitle="Student Portal" />
}
