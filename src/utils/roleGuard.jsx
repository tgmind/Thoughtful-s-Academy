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

  // Still bootstrapping or fetching profile — don't flash a redirect
  if (loading) return <LoadingSpinner fullScreen />

  // Not logged in
  if (!user) return <Navigate to="/login" replace />

  // Logged in but no profile row exists
  if (!profile) return <Navigate to="/login" replace />

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
