# Master Frontend Component Registry

**Platform:** Thoughtful's Academy (Coaching Institute Management System)  
**Total Source Files:** 73 UI Component/Page files (25,284 LOC)  

---

## 1. Master Component Directory

| Component File Path | LOC | Category | Primary Functionality |
|---|:---:|---|---|
| `src/App.jsx` | 158 | Root Router | Central routing, route guards, and code chunk definitions |
| `src/main.jsx` | 32 | Bootstrap | Root DOM mounting and React StrictMode setup |
| `src/context/AuthContext.jsx` | 78 | State Context | User session, auth state change listener, role state |
| `src/components/layout/DashboardShell.jsx`| 804 | Shell Layout | Collapsible desktop sidebar, mobile drawer, search modal |
| `src/components/shared/ProtectedVideoPlayer.jsx`| 1,607 | Interactive Widget| YouTube player, anti-piracy canvas, doubt panel |
| `src/components/shared/ActivityLogModal.jsx`| 275 | Modal | Audit log viewer for administrative actions |
| `src/components/shared/VideoPlayerModal.jsx`| 265 | Modal | Modal overlay wrapper for video playback |
| `src/components/shared/NotificationPopup.jsx`| 354 | Dropdown | Notification center dropdown in topbar |
| `src/components/shared/LiveClassBanner.jsx`| 88 | Banner | Realtime live stream announcement with 880Hz chime |
| `src/components/shared/EnablePushBanner.jsx`| 84 | Banner | Browser Web Push permission request banner |
| `src/components/shared/DriveImage.jsx` | 92 | Asset Helper | Converts Google Drive links to CDN image URLs |
| `src/components/shared/RouteLoader.jsx` | 38 | UI Feedback | Splash screen shown during lazy route chunk loads |
| `src/components/shared/Skeleton.jsx` | 68 | UI Feedback | Shimmer loading placeholders |
| `src/components/shared/LoadingSpinner.jsx`| 42 | UI Feedback | Centered loading spinner animation |
| `src/components/ui/CustomSelect.jsx` | 132 | UI Primitive | Keyboard-accessible popover dropdown |
| `src/components/analytics/AttendanceChart.jsx`| 161 | Analytics | Monthly student attendance distribution chart |
| `src/components/analytics/FeeChart.jsx` | 155 | Analytics | Fee collection revenue breakdown chart |
| `src/components/InstallAppPrompt.jsx` | 324 | PWA Widget | Mobile bottom drawer prompting PWA installation |
| `src/components/InstallHeaderButton.jsx` | 54 | PWA Widget | Header button triggering PWA installation |
| `src/pages/Home.jsx` | 1,066 | Public Page | Public institute landing page, hero, FAQs |
| `src/pages/BatchDetails.jsx` | 814 | Public Page | Public course curriculum overview and pricing |
| `src/pages/Login.jsx` | 275 | Auth Page | User login form with error handling |
| `src/pages/Register.jsx` | 521 | Auth Page | Multi-step student registration form |
| `src/pages/ResetPassword.jsx` | 138 | Auth Page | Password recovery confirmation form |
| `src/pages/Dashboards.jsx` | 31 | Router | Traffic controller redirecting to role dashboard |
| `src/pages/ErrorPages.jsx` | 84 | Error Page | 404, 403, and 500 error layouts |
| `src/pages/student/StudentLayout.jsx` | 52 | Layout Wrapper | Student navigation link injector |
| `src/pages/student/StudentDashboard.jsx` | 1,391 | Student Page | Student command center and streak tracker |
| `src/pages/student/StudySection.jsx` | 1,190 | Student Page | Subject and chapter curriculum explorer |
| `src/pages/student/WatchLecture.jsx` | 1,007 | Student Page | Full-screen video study room with notes editor |
| `src/pages/student/LiveClass.jsx` | 126 | Student Page | Active live broadcast stream viewer |
| `src/pages/student/Attendance.jsx` | 444 | Student Page | Monthly calendar attendance heatmap |
| `src/pages/student/PayFee.jsx` | 222 | Student Page | UPI QR code display and 12-digit UTR form |
| `src/pages/student/Homework.jsx` | 254 | Student Page | Assignment submissions and grading reviews |
| `src/pages/student/Messages.jsx` | 379 | Student Page | 1-on-1 direct chat with faculty |
| `src/pages/student/Notifications.jsx` | 424 | Student Page | Institute-wide announcements stream |
| `src/pages/teacher/TeacherLayout.jsx` | 50 | Layout Wrapper | Faculty navigation link injector |
| `src/pages/teacher/TeacherHome.jsx` | 214 | Faculty Page | Faculty command center and batch schedules |
| `src/pages/teacher/StudySection.jsx` | 1,948 | Faculty Page | Full curriculum CRUD and YouTube playlist sync |
| `src/pages/teacher/StudyCards.jsx` | 412 | Faculty Page | Card-level publishing and order manager |
| `src/pages/teacher/LiveClass.jsx` | 299 | Faculty Page | Live broadcast studio and stream launcher |
| `src/pages/teacher/Homework.jsx` | 375 | Faculty Page | Assignment authoring and student evaluation |
| `src/pages/teacher/FeeRecords.jsx` | 169 | Faculty Page | Read-only fee collection status view |
| `src/pages/teacher/SalaryStatus.jsx` | 282 | Faculty Page | Faculty monthly disbursement ledger |
| `src/pages/teacher/Messages.jsx` | 655 | Faculty Page | Multi-student inquiry inbox |
| `src/pages/teacher/Notifications.jsx` | 597 | Faculty Page | Faculty announcement composer |
| `src/pages/admin/AdminLayout.jsx` | 66 | Layout Wrapper | Administrative navigation link injector |
| `src/pages/admin/AdminHome.jsx` | 365 | Admin Page | Institute KPI metrics and financials |
| `src/pages/admin/BatchManager.jsx` | 336 | Admin Page | Course batch creation and configuration |
| `src/pages/admin/AdminBatchDetails.jsx`| 704 | Admin Page | Batch roster management and schedule overrides |
| `src/pages/admin/StudentTracker.jsx` | 473 | Admin Page | Master student directory and status toggles |
| `src/pages/admin/TeacherManager.jsx` | 509 | Admin Page | Faculty directory and salary configuration |
| `src/pages/admin/FeeManager.jsx` | 817 | Admin Page | UTR verification and payment approvals |
| `src/pages/admin/SalaryManager.jsx` | 491 | Admin Page | Payroll computation and payout confirmation |
| `src/pages/admin/Announcements.jsx` | 385 | Admin Page | Institute-wide announcement dispatcher |
| `src/pages/admin/Analytics.jsx` | 240 | Admin Page | Historical revenue and attendance trends |
| `src/pages/admin/QRManager.jsx` | 145 | Admin Page | Institute UPI QR code image configuration |
| `src/pages/admin/AdminMessages.jsx` | 745 | Admin Page | Omnichannel communication and chat moderation |
| `src/pages/admin/AdminSettings.jsx` | 795 | Admin Page | Platform settings and administrative accounts |
