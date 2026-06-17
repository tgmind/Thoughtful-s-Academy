import { Routes, Route } from 'react-router-dom'
import { AuthProvider }   from './context/AuthContext'
import { ProtectedRoute } from './utils/roleGuard'
import { Toaster }        from 'react-hot-toast'

import Home     from './pages/Home'
import Login    from './pages/Login'
import Register from './pages/Register'
import ResetPassword from './pages/ResetPassword'
import { NotFound, Unauthorized, AccountSuspended } from './pages/ErrorPages'

// Student
import StudentLayout        from './pages/student/StudentLayout'
import StudentDashboard     from './pages/student/StudentDashboard'
import Attendance           from './pages/student/Attendance'
import StudySection         from './pages/student/StudySection'
import StudentMessages      from './pages/student/Messages'
import PayFee               from './pages/student/PayFee'
import StudentNotifications from './pages/student/Notifications'
import StudentLiveClass     from './pages/student/LiveClass'
import StudentHomework      from './pages/student/Homework'

// Teacher
import TeacherLayout        from './pages/teacher/TeacherLayout'
import TeacherHome           from './pages/teacher/TeacherHome'
import TeacherStudyCards     from './pages/teacher/StudyCards'
import TeacherLiveClass      from './pages/teacher/LiveClass'
import TeacherMessages       from './pages/teacher/Messages'
import SalaryStatus          from './pages/teacher/SalaryStatus'
import TeacherNotifications  from './pages/teacher/Notifications'
import TeacherFeeRecords     from './pages/teacher/FeeRecords'
import TeacherHomework       from './pages/teacher/Homework'

// Admin
import AdminLayout     from './pages/admin/AdminLayout'
import AdminHome       from './pages/admin/AdminHome'
import StudentTracker  from './pages/admin/StudentTracker'
import TeacherManager  from './pages/admin/TeacherManager'
import FeeManager      from './pages/admin/FeeManager'
import BatchManager    from './pages/admin/BatchManager'
import QRManager       from './pages/admin/QRManager'
import SalaryManager   from './pages/admin/SalaryManager'
import Announcements   from './pages/admin/Announcements'
import AdminMessages   from './pages/admin/AdminMessages'
import Analytics       from './pages/admin/Analytics'
import AdminStudyCards from './pages/teacher/StudyCards'
import AdminLiveClass  from './pages/teacher/LiveClass'
import AdminHomework   from './pages/teacher/Homework'
import AdminSettings   from './pages/admin/AdminSettings'

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
        <Route path="/reset-password"    element={<ResetPassword />}    />
        <Route path="/unauthorized"      element={<Unauthorized />}     />
        <Route path="/account-suspended" element={<AccountSuspended />} />

        {/* Student */}
        <Route element={<ProtectedRoute allowedRoles={['student']} />}>
          <Route path="/student" element={<StudentLayout />}>
            <Route path="dashboard"     element={<StudentDashboard />}     />
            <Route path="attendance"    element={<Attendance />}           />
            <Route path="study"         element={<StudySection />}         />
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
            <Route path="dashboard"     element={<TeacherHome />}            />
            <Route path="study-cards"   element={<TeacherStudyCards />}      />
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
            <Route path="dashboard"     element={<AdminHome />}                       />
            <Route path="students"      element={<StudentTracker />}                  />
            <Route path="teachers"      element={<TeacherManager />}                  />
            <Route path="fees"          element={<FeeManager />}                      />
            <Route path="batches"       element={<BatchManager />}                    />
            <Route path="study-cards"   element={<AdminStudyCards isAdmin={true} />} />
            <Route path="homework"      element={<AdminHomework   isAdmin={true} />} />
            <Route path="live-class"    element={<AdminLiveClass  isAdmin={true} />} />
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
    </AuthProvider>
  )
}
