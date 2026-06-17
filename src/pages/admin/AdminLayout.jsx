import { LayoutDashboard, Users, BookUser, CreditCard, Layers, QrCode, DollarSign, Bell, MessageCircle, BookOpen, ClipboardList, Video, BarChart2, Settings } from 'lucide-react'
import DashboardShell from '../../components/layout/DashboardShell'

const NAV = [
  { label:'Dashboard',   path:'/admin/dashboard',     icon:<LayoutDashboard className="h-4 w-4"/> },
  { label:'Students',    path:'/admin/students',      icon:<Users className="h-4 w-4"/>           },
  { label:'Teachers',    path:'/admin/teachers',      icon:<BookUser className="h-4 w-4"/>        },
  { label:'Fees',        path:'/admin/fees',          icon:<CreditCard className="h-4 w-4"/>      },
  { label:'Batches',     path:'/admin/batches',       icon:<Layers className="h-4 w-4"/>          },
  { label:'Study Cards', path:'/admin/study-cards',   icon:<BookOpen className="h-4 w-4"/>        },
  { label:'Homework',    path:'/admin/homework',      icon:<ClipboardList className="h-4 w-4"/>   },
  { label:'Live Class',  path:'/admin/live-class',    icon:<Video className="h-4 w-4"/>           },
  { label:'QR Code',     path:'/admin/qr',            icon:<QrCode className="h-4 w-4"/>          },
  { label:'Salary',      path:'/admin/salary',        icon:<DollarSign className="h-4 w-4"/>      },
  { label:'Announce',    path:'/admin/announcements', icon:<Bell className="h-4 w-4"/>             },
  { label:'Messages',    path:'/admin/messages',      icon:<MessageCircle className="h-4 w-4"/>   },
  { label:'Analytics',   path:'/admin/analytics',     icon:<BarChart2 className="h-4 w-4"/>       },
  { label:'Settings',    path:'/admin/settings',      icon:<Settings  className="h-4 w-4"/>       },
]

export default function AdminLayout() {
  return <DashboardShell navItems={NAV} pageTitle="Admin Panel" />
}
