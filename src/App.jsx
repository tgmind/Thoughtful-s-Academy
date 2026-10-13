import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider }   from './context/AuthContext'
import { ProtectedRoute } from './utils/roleGuard'
import { Toaster }        from 'react-hot-toast'
import InstallAppPrompt from './components/InstallAppPrompt'
import RouteLoader from './components/shared/RouteLoader'

// Lazy-loaded Public Pages
const Home          = lazy(() => import('./pages/Home'))
const Login         = lazy(() => import('./pages/Login'))
const Register      = lazy(() => import('./pages/Register'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const BatchDetails   = lazy(() => import('./pages/BatchDetails'))
const WatchLecture  = lazy(() => import('./pages/student/WatchLecture'))

// Error Pages
const NotFound         = lazy(() => import('./pages/ErrorPages').then(m => ({ default: m.NotFound })))
const Unauthorized     = lazy(() => import('./pages/ErrorPages').then(m => ({ default: m.Unauthorized })))
const AccountSuspended = lazy(() => import('./pages/ErrorPages').then(m => ({ default: m.AccountSuspended })))

// Lazy-loaded Student Pages & Layout
const StudentLayout        = lazy(() => import('./pages/student/StudentLayout'))
const StudentDashboard     = lazy(() => import('./pages/student/StudentDashboard'))
const Attendance           = lazy(() => import('./pages/student/Attendance'))
const StudySection         = lazy(() => import('./pages/student/StudySection'))
const StudentMessages      = lazy(() => import('./pages/student/Messages'))
const PayFee               = lazy(() => import('./pages/student/PayFee'))
const StudentNotifications = lazy(() => import('./pages/student/Notifications'))
const StudentLiveClass     = lazy(() => import('./pages/student/LiveClass'))
const StudentHomework      = lazy(() => import('./pages/student/Homework'))
const StudentDoubts        = lazy(() => import('./pages/student/StudentDoubts'))

// Lazy-loaded Teacher Pages & Layout
const TeacherLayout        = lazy(() => import('./pages/teacher/TeacherLayout'))
const TeacherHome           = lazy(() => import('./pages/teacher/TeacherHome'))
const TeacherStudySection   = lazy(() => import('./pages/teacher/StudySection'))
const TeacherLiveClass      = lazy(() => import('./pages/teacher/LiveClass'))
const TeacherMessages       = lazy(() => import('./pages/teacher/Messages'))
const SalaryStatus          = lazy(() => import('./pages/teacher/SalaryStatus'))
const TeacherNotifications  = lazy(() => import('./pages/teacher/Notifications'))
const TeacherFeeRecords     = lazy(() => import('./pages/teacher/FeeRecords'))
const TeacherHomework       = lazy(() => import('./pages/teacher/Homework'))
const TeacherDoubts         = lazy(() => import('./pages/teacher/TeacherDoubts'))

// Lazy-loaded Admin Pages & Layout
const AdminLayout       = lazy(() => import('./pages/admin/AdminLayout'))
const AdminHome         = lazy(() => import('./pages/admin/AdminHome'))
const StudentTracker    = lazy(() => import('./pages/admin/StudentTracker'))
const TeacherManager    = lazy(() => import('./pages/admin/TeacherManager'))
const FeeManager        = lazy(() => import('./pages/admin/FeeManager'))
const BatchManager      = lazy(() => import('./pages/admin/BatchManager'))
const AdminBatchDetails = lazy(() => import('./pages/admin/AdminBatchDetails'))
const QRManager         = lazy(() => import('./pages/admin/QRManager'))
const SalaryManager     = lazy(() => import('./pages/admin/SalaryManager'))
const Announcements     = lazy(() => import('./pages/admin/Announcements'))
const AdminMessages     = lazy(() => import('./pages/admin/AdminMessages'))
const Analytics         = lazy(() => import('./pages/admin/Analytics'))
const AdminSettings     = lazy(() => import('./pages/admin/AdminSettings'))
const AdminDoubts       = lazy(() => import('./pages/admin/AdminDoubts'))


export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" toastOptions={{
        duration: 4000,
        style: { fontFamily:'Inter,system-ui,sans-serif', fontSize:'14px', borderRadius:'10px', border:'1px solid #e5e7eb' },
        success: { iconTheme: { primary:'#16a34a', secondary:'#fff' } },
        error:   { iconTheme: { primary:'#dc2626', secondary:'#fff' } },
      }} />

      <InstallAppPrompt />

      <Suspense fallback={<RouteLoader />}>
        <Routes>
          {/* Public */}
          <Route path="/"                  element={<Home />}             />
          <Route path="/batch-details"     element={<BatchDetails />}    />
          <Route path="/watch/:cardId?"    element={<WatchLecture />}     />
          <Route path="/login"             element={<Login />}            />
          <Route path="/register"          element={<Register />}         />
          <Route path="/reset-password"    element={<ResetPassword />}    />
          <Route path="/unauthorized"      element={<Unauthorized />}     />
          <Route path="/account-suspended" element={<AccountSuspended />} />

          {/* Student Standalone Watch Room */}
          <Route element={<ProtectedRoute allowedRoles={['student']} />}>
            <Route path="/student/watch/:cardId?" element={<WatchLecture />} />
          </Route>

          {/* Teacher Standalone Watch Room */}
          <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
            <Route path="/teacher/watch/:cardId?" element={<WatchLecture />} />
          </Route>

          {/* Admin Standalone Watch Room */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin/watch/:cardId?" element={<WatchLecture />} />
          </Route>

          {/* Student */}
          <Route element={<ProtectedRoute allowedRoles={['student']} />}>
            <Route path="/student" element={<StudentLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard"     element={<StudentDashboard />}     />
              <Route path="attendance"    element={<Attendance />}           />
              <Route path="study"         element={<StudySection />}         />
              <Route path="doubts"        element={<StudentDoubts />}        />
              <Route path="homework"      element={<StudentHomework />}       />
              <Route path="messages"      element={<StudentMessages />}      />
              <Route path="pay-fee"       element={<PayFee />}               />
              <Route path="notifications" element={<StudentNotifications />} />
              <Route path="live-class"    element={<StudentLiveClass />}     />
            </Route>
          </Route>

          {/* Teacher */}
          <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
            <Route path="/teacher" element={<TeacherLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard"     element={<TeacherHome />}            />
              <Route path="study"         element={<TeacherStudySection />}    />
              <Route path="study-cards"   element={<TeacherStudySection />}    />
              <Route path="doubts"        element={<TeacherDoubts />}          />
              <Route path="homework"      element={<TeacherHomework />}         />
              <Route path="live-class"    element={<TeacherLiveClass />}        />
              <Route path="messages"      element={<TeacherMessages />}         />
              <Route path="salary"        element={<SalaryStatus />}            />
              <Route path="notifications" element={<TeacherNotifications />}    />
              <Route path="fee-records"   element={<TeacherFeeRecords />}       />
            </Route>
          </Route>

          {/* Admin */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard"     element={<AdminHome />}                       />
              <Route path="students"      element={<StudentTracker />}                  />
              <Route path="teachers"      element={<TeacherManager />}                  />
              <Route path="fees"          element={<FeeManager />}                      />
              <Route path="batches"       element={<BatchManager />}                    />
              <Route path="batch-details" element={<AdminBatchDetails />}               />
              <Route path="study"         element={<TeacherStudySection isAdmin={true} />} />
              <Route path="study-cards"   element={<TeacherStudySection isAdmin={true} />} />
              <Route path="doubts"        element={<AdminDoubts />}                     />
              <Route path="homework"      element={<TeacherHomework  isAdmin={true} />}  />
              <Route path="live-class"    element={<TeacherLiveClass isAdmin={true} />}  />
              <Route path="qr"            element={<QRManager />}                       />
              <Route path="salary"        element={<SalaryManager />}                   />
              <Route path="announcements" element={<Announcements />}                   />
              <Route path="messages"      element={<AdminMessages />}                   />
              <Route path="analytics"     element={<Analytics />}                       />
              <Route path="settings"      element={<AdminSettings />}                   />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  )
}
