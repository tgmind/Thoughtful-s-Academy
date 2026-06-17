import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/shared/LoadingSpinner'

// ============================================================
// ProtectedRoute
// Usage:
//   <Route element={<ProtectedRoute allowedRoles={['student']} />}>
//     <Route path="dashboard" element={<StudentDashboard />} />
//   </Route>
// ============================================================

export function ProtectedRoute({ allowedRoles }) {
  const { user, profile, loading } = useAuth()

  // Still bootstrapping — don't flash a redirect
  if (loading) return <LoadingSpinner fullScreen />

  // Not logged in
  if (!user) return <Navigate to="/login" replace />

  // Logged in but profile hasn't loaded yet (edge case during registration)
  if (!profile) return <LoadingSpinner fullScreen />

  // Logged in but wrong role
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  // Account deactivated by admin
  if (!profile.is_active) {
    return <Navigate to="/account-suspended" replace />
  }

  return <Outlet />
}
