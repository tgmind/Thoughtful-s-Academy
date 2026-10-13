# Master Frontend Route Registry

**Platform:** Thoughtful's Academy (Coaching Institute Management System)  
**Router:** React Router DOM v6.26.2  
**Total Cataloged Routes:** 27 Routes  

---

## 1. Master Route Directory

| Route Path | Allowed Roles | Component File | Chunk Name | Route Category |
|---|---|---|---|---|
| `/` | Public | `src/pages/Home.jsx` | `Home-*.js` | Marketing Landing |
| `/login` | Public / Guest | `src/pages/Login.jsx` | `Login-*.js` | Authentication |
| `/register` | Public / Guest | `src/pages/Register.jsx` | `Register-*.js` | Authentication |
| `/reset-password` | Public / Guest | `src/pages/ResetPassword.jsx` | `ResetPassword-*.js` | Authentication |
| `/batch-details` | Public | `src/pages/BatchDetails.jsx` | `BatchDetails-*.js` | Curriculum Info |
| `/watch/:cardId` | Public / All | `src/pages/student/WatchLecture.jsx` | `WatchLecture-*.js` | Study Room |
| `/dashboard` | Authenticated | `src/pages/Dashboards.jsx` | `Dashboards-*.js` | Traffic Controller |
| `/student` | Student | `src/pages/student/StudentDashboard.jsx` | `StudentDashboard-*.js` | Student Command |
| `/student/study` | Student | `src/pages/student/StudySection.jsx` | `StudySection-*.js` | Curriculum Explorer |
| `/student/live` | Student | `src/pages/student/LiveClass.jsx` | `LiveClass-*.js` | Live Broadcast |
| `/student/homework` | Student | `src/pages/student/Homework.jsx` | `Homework-*.js` | Assignments |
| `/student/attendance` | Student | `src/pages/student/Attendance.jsx` | `Attendance-*.js` | Attendance Heatmap |
| `/student/fees` | Student | `src/pages/student/PayFee.jsx` | `PayFee-*.js` | Fee Payment |
| `/student/messages` | Student | `src/pages/student/Messages.jsx` | `Messages-*.js` | Direct Chat |
| `/student/notifications`| Student | `src/pages/student/Notifications.jsx` | `Notifications-*.js` | Notices Stream |
| `/teacher` | Teacher | `src/pages/teacher/TeacherHome.jsx` | `TeacherHome-*.js` | Faculty Command |
| `/teacher/cards` | Teacher | `src/pages/teacher/StudyCards.jsx` | `StudyCards-*.js` | Card Operations |
| `/teacher/study` | Teacher | `src/pages/teacher/StudySection.jsx` | `TeacherStudySection-*.js`| Curriculum Studio |
| `/teacher/live` | Teacher | `src/pages/teacher/LiveClass.jsx` | `TeacherLiveClass-*.js` | Live Broadcast Studio|
| `/teacher/homework` | Teacher | `src/pages/teacher/Homework.jsx` | `TeacherHomework-*.js` | Homework Manager |
| `/teacher/fees` | Teacher | `src/pages/teacher/FeeRecords.jsx` | `FeeRecords-*.js` | Fee Ledger |
| `/teacher/messages` | Teacher | `src/pages/teacher/Messages.jsx` | `TeacherMessages-*.js` | Student Inbox |
| `/teacher/notifications`| Teacher | `src/pages/teacher/Notifications.jsx`| `TeacherNotifications-*.js`| Announcement Studio |
| `/admin` | Admin | `src/pages/admin/AdminHome.jsx` | `AdminHome-*.js` | Admin Central |
| `/admin/batches` | Admin | `src/pages/admin/BatchManager.jsx` | `BatchManager-*.js` | Batch Operations |
| `/admin/students` | Admin | `src/pages/admin/StudentTracker.jsx` | `StudentTracker-*.js` | Student Directory |
| `/admin/teachers` | Admin | `src/pages/admin/TeacherManager.jsx` | `TeacherManager-*.js` | Faculty Directory |
| `/admin/fees` | Admin | `src/pages/admin/FeeManager.jsx` | `FeeManager-*.js` | Fee Reconciliation |
| `/admin/salaries` | Admin | `src/pages/admin/SalaryManager.jsx` | `SalaryManager-*.js` | Payroll Console |
| `/admin/announcements` | Admin | `src/pages/admin/Announcements.jsx` | `Announcements-*.js` | Broadcast Dispatcher|
| `/admin/analytics` | Admin | `src/pages/admin/Analytics.jsx` | `Analytics-*.js` | Business Analytics |
| `/admin/qr` | Admin | `src/pages/admin/QRManager.jsx` | `QRManager-*.js` | Payment QR Settings |
| `/admin/messages` | Admin | `src/pages/admin/AdminMessages.jsx` | `AdminMessages-*.js` | Intercom Console |
| `/admin/settings` | Admin | `src/pages/admin/AdminSettings.jsx` | `AdminSettings-*.js` | Institute Settings |
