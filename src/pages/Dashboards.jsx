import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { INSTITUTE_NAME } from '../lib/constants'

function PlaceholderDash({ role }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const handleSignOut = async () => { await signOut(); navigate('/') }
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow border border-gray-200 p-8 text-center max-w-sm w-full">
        <div className="w-14 h-14 bg-blue-950 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-white font-bold text-xl capitalize">{role[0]}</span>
        </div>
        <h1 className="font-bold text-xl text-blue-950">{INSTITUTE_NAME}</h1>
        <p className="text-gray-500 text-sm mt-1 capitalize">{role} Dashboard</p>
        <p className="text-gray-700 font-medium mt-3">Hello, {profile?.full_name} 👋</p>
        <p className="text-xs text-gray-400 mt-2 mb-6">
          Placeholder — full dashboard coming in Phase {role === 'student' ? '3' : role === 'teacher' ? '4' : '5'}.
        </p>
        <button onClick={handleSignOut} className="w-full py-2 px-4 border-2 border-blue-950 text-blue-950 rounded-lg font-semibold hover:bg-blue-950 hover:text-white transition-all">
          Log Out
        </button>
      </div>
    </div>
  )
}

export function StudentDashboard() { return <PlaceholderDash role="student" /> }
export function TeacherDashboard() { return <PlaceholderDash role="teacher" /> }
export function AdminDashboard()   { return <PlaceholderDash role="admin"   /> }
