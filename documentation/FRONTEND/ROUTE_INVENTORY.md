# Frontend Route Inventory & Navigation Map

Audit Date: 2026-10-13  
Platform: Graviton Academy  
Total Discovered Routes: **30**

---

## 1. Master Route Inventory

| Route Path | Allowed Roles | Component File | Chunk Name | Purpose / View Description |
|---|---|---|---|---|
| `/` | Public (All) | `src/pages/Home.jsx` | `Home-4qt0wq1Q.js` | Landing page, running batches, featured lectures, notices |
| `/batch-details` | Public (All) | `src/pages/BatchDetails.jsx` | `BatchDetails-BgBFuyvU.js` | Batch curriculum details, poster, public cards, apply CTA |
| `/watch/:cardId?` | Public (All) | `src/pages/student/WatchLecture.jsx` | `WatchLecture-xoHNfcm4.js` | Public lecture preview & sample playback |
| `/login` | Public (All) | `src/pages/Login.jsx` | `Login-CHZ9nDGh.js` | User authentication & password reset request |
| `/register` | Public (All) | `src/pages/Register.jsx` | `Register-BGGVLZ26.js` | Role-based onboarding & trial account creation |
| `/reset-password` | Public (All) | `src/pages/ResetPassword.jsx` | `ResetPassword-47dXFdbV.js` | Password reset completion via token hash |
| `/unauthorized` | Public (All) | `src/pages/ErrorPages.jsx` | `ErrorPages-CtQrWuSY.js` | 403 Forbidden error page |
| `/account-suspended` | Public (All) | `src/pages/ErrorPages.jsx` | `ErrorPages-CtQrWuSY.js` | Suspended / deactivated account error page |
| `*` | Public (All) | `src/pages/ErrorPages.jsx` | `ErrorPages-CtQrWuSY.js` | 404 Not Found error page |
| `/student/watch/:cardId?`| `student` | `src/pages/student/WatchLecture.jsx` | `WatchLecture-xoHNfcm4.js` | Enrolled student classroom & in-video doubts |
| `/student/dashboard` | `student` | `src/pages/student/StudentDashboard.jsx` | `StudentDashboard-wvuol49H.js` | Student hub, attendance streak, live class, stats |
| `/student/attendance`| `student` | `src/pages/student/Attendance.jsx` | `Attendance-DpXTXVA-.js` | Monthly attendance calendar heatmap & breakdown |
| `/student/study` | `student` | `src/pages/student/StudySection.jsx` | `StudySection-BUWi8DDr.js` | Batch curriculum cards, chapters, and bookmarks |
| `/student/homework` | `student` | `src/pages/student/Homework.jsx` | `Homework-BxTGmOgc.js` | Pending assignments & Google Drive submissions |
| `/student/live-class`| `student` | `src/pages/student/LiveClass.jsx` | `LiveClass-BJxOjd_L.js` | Live class join room (Zoom / Google Meet) |
| `/student/messages` | `student` | `src/pages/student/Messages.jsx` | `Messages-BrCC5ze2.js` | Direct messaging with assigned faculty |
| `/student/doubts` | `student` | `src/pages/student/StudentDoubts.jsx` | `StudentDoubts-DE_ZS3X4.js` | Student Doubt Hub: stats, filterable doubts, self-study resolution |
| `/student/pay-fee` | `student` | `src/pages/student/PayFee.jsx` | `PayFee-DIoy_RbK.js` | Monthly fee payment guide & UTR submission form |
| `/student/notifications`| `student` | `src/pages/student/Notifications.jsx` | `Notifications-DNyG0tTA.js` | Student notification inbox |
| `/teacher/watch/:cardId?`| `teacher` | `src/pages/student/WatchLecture.jsx` | `WatchLecture-xoHNfcm4.js` | Teacher standalone watch room |
| `/teacher/dashboard` | `teacher` | `src/pages/teacher/TeacherHome.jsx` | `TeacherHome-5VFI18RL.js` | Teacher overview & assigned batch cards |
| `/teacher/study` | `teacher` | `src/pages/teacher/StudySection.jsx` | `StudySection-DUZz8-aR.js` | Batch study workspace & card CRUD management |
| `/teacher/study-cards`| `teacher` | `src/pages/teacher/StudySection.jsx` | `StudySection-DUZz8-aR.js` | Alias to teacher study workspace |
| `/teacher/doubts` | `teacher` | `src/pages/teacher/TeacherDoubts.jsx` | `TeacherDoubts-VyloMdnV.js` | Teacher Doubt Hub: subject & batch accordions, educator action queue |
| `/teacher/homework` | `teacher` | `src/pages/teacher/Homework.jsx` | `Homework-CsJrqAR1.js` | Homework assignment creator & submission grading |
| `/teacher/live-class`| `teacher` | `src/pages/teacher/LiveClass.jsx` | `LiveClass-i4hvYFYl.js` | Live class launcher & meeting manager |
| `/teacher/messages` | `teacher` | `src/pages/teacher/Messages.jsx` | `Messages-G2F48aAg.js` | Faculty student messaging interface |
| `/teacher/salary` | `teacher` | `src/pages/teacher/SalaryStatus.jsx` | `SalaryStatus-BTCewA4O.js` | Teacher payroll receipts & personal UPI QR settings |
| `/teacher/fee-records`| `teacher` | `src/pages/teacher/FeeRecords.jsx` | `FeeRecords-Xcp1ZbgD.js` | Batch student fee inspection (permission-gated) |
| `/teacher/notifications`| `teacher` | `src/pages/teacher/Notifications.jsx` | `Notifications-wuoUIWXo.js` | Teacher notification view |
| `/admin/watch/:cardId?` | `admin` | `src/pages/student/WatchLecture.jsx` | `WatchLecture-xoHNfcm4.js` | Admin standalone watch room |
| `/admin/dashboard` | `admin` | `src/pages/admin/AdminHome.jsx` | `AdminHome-xHKgpr_y.js` | Admin overview, real-time metrics, alerts |
| `/admin/students` | `admin` | `src/pages/admin/StudentTracker.jsx` | `StudentTracker-CykSIo12.js` | Student roster, attendance %, batch re-assignment |
| `/admin/teachers` | `admin` | `src/pages/admin/TeacherManager.jsx` | `TeacherManager-BhW1ppZ6.js` | Faculty roster & permission toggles |
| `/admin/fees` | `admin` | `src/pages/admin/FeeManager.jsx` | `FeeManager-Cl9Aty_2.js` | Fee verification, defaulters, receipt audit |
| `/admin/batches` | `admin` | `src/pages/admin/BatchManager.jsx` | `BatchManager-CgKM8a0M.js` | Batch CRUD & multi-teacher assignment |
| `/admin/batch-details` | `admin` | `src/pages/admin/AdminBatchDetails.jsx` | `AdminBatchDetails-4pczvibp.js` | Batch curriculum details & RichText syllabus editor |
| `/admin/study` | `admin` | `src/pages/teacher/StudySection.jsx` | `StudySection-DUZz8-aR.js` | Study Section with `isAdmin={true}` |
| `/admin/doubts` | `admin` | `src/pages/admin/AdminDoubts.jsx` | `AdminDoubts-H_Cx2d6l.js` | Admin Doubt Central: dual views (teacher vs subject/batch), KPI stats |
| `/admin/homework` | `admin` | `src/pages/teacher/Homework.jsx` | `Homework-CsJrqAR1.js` | Homework Manager with `isAdmin={true}` |
| `/admin/live-class`| `admin` | `src/pages/teacher/LiveClass.jsx` | `LiveClass-i4hvYFYl.js` | Live Class Launcher with `isAdmin={true}` |
| `/admin/qr` | `admin` | `src/pages/admin/QRManager.jsx` | `QRManager-DOmMJFnb.js` | Institute payment QR image uploader |
| `/admin/salary` | `admin` | `src/pages/admin/SalaryManager.jsx` | `SalaryManager-B2z0Q5mM.js` | Faculty payroll & disbursement management |
| `/admin/announcements`| `admin` | `src/pages/admin/Announcements.jsx` | `Announcements-Cr2yPUYZ.js` | Announcement publisher & push dispatcher |
| `/admin/messages` | `admin` | `src/pages/admin/AdminMessages.jsx` | `AdminMessages-BZDgWa8g.js` | Institute-wide chat monitoring |
| `/admin/analytics` | `admin` | `src/pages/admin/Analytics.jsx` | `Analytics-BukFZj_f.js` | Visual attendance and financial charts |
| `/admin/settings` | `admin` | `src/pages/admin/AdminSettings.jsx` | `AdminSettings-DcHgkhSE.js` | Destructive database reset & student cleanup |
