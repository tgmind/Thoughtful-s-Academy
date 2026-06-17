import { LayoutDashboard, BookOpen, ClipboardList, Video, MessageCircle, DollarSign, Bell, Receipt } from 'lucide-react'
import DashboardShell from '../../components/layout/DashboardShell'

const NAV = [
  { label: 'Home',          path: '/teacher/dashboard',     icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Study Cards',   path: '/teacher/study-cards',   icon: <BookOpen className="h-4 w-4" />        },
  { label: 'Homework',      path: '/teacher/homework',      icon: <ClipboardList className="h-4 w-4" />   },
  { label: 'Live Class',    path: '/teacher/live-class',    icon: <Video className="h-4 w-4" />           },
  { label: 'Messages',      path: '/teacher/messages',      icon: <MessageCircle className="h-4 w-4" />   },
  { label: 'Salary',        path: '/teacher/salary',        icon: <DollarSign className="h-4 w-4" />      },
  { label: 'Fee Records',   path: '/teacher/fee-records',   icon: <Receipt className="h-4 w-4" />         },
  { label: 'Notifications', path: '/teacher/notifications', icon: <Bell className="h-4 w-4" />            },
]

export default function TeacherLayout() {
  return <DashboardShell navItems={NAV} pageTitle="Teacher Portal" />
}
