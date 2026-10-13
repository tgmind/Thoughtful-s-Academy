# Master Feature Catalog

Audit Date: 2026-10-13  
Platform: Thoughtful's Academy

---

## 1. Feature Identification & Catalog

The platform encompasses **22 distinct functional features** grouped across 6 functional domains:

| Feature ID | Domain | Feature Name | Primary Component(s) | Primary User Persona |
|---|---|---|---|---|
| **FEAT-001** | Auth | User Registration & Role Selection | `Register.jsx`, `handle_new_user()` | Public Visitor |
| **FEAT-002** | Auth | Secure Email/Password Authentication | `Login.jsx`, `AuthContext.jsx` | All Personas |
| **FEAT-003** | Auth | Password Reset via Email Magic Link | `ResetPassword.jsx`, `Login.jsx` | All Personas |
| **FEAT-004** | Auth | Automated 2-Day Free Trial Onboarding | `Register.jsx`, `StudentDashboard.jsx` | Student |
| **FEAT-005** | Public | Public Institute Landing Page | `Home.jsx` | Public Visitor |
| **FEAT-006** | Public | Public Batch Catalog & Syllabus Viewer | `BatchDetails.jsx` | Public Visitor |
| **FEAT-007** | Public | Public Video Lecture Preview | `WatchLecture.jsx` | Public Visitor |
| **FEAT-008** | Academic | Study Cards & Batch Curriculum Workspaces | `StudySection.jsx` (Student/Teacher) | Student, Teacher |
| **FEAT-009** | Academic | Protected Video Classroom Player | `ProtectedVideoPlayer.jsx`, `WatchLecture.jsx` | Student |
| **FEAT-010** | Academic | Lecture Doubt Submission & Notes | `WatchLecture.jsx` | Student |
| **FEAT-011** | Academic | Live Class Broadcasting & Audio Chime | `LiveClass.jsx` (Student/Teacher), `LiveClassBanner.jsx` | Student, Teacher |
| **FEAT-012** | Tracking | Self-Attendance Check-In & Streak Counter | `Attendance.jsx`, `StudentDashboard.jsx` | Student |
| **FEAT-013** | Academic | Homework Assignment & Submission | `Homework.jsx` (Student/Teacher) | Student, Teacher |
| **FEAT-014** | Communication | Realtime 1-on-1 Faculty-Student Messaging | `Messages.jsx` (Student/Teacher/Admin) | All Personas |
| **FEAT-015** | Financial | Offline UPI Fee Payment & Verification | `PayFee.jsx`, `FeeManager.jsx` | Student, Admin |
| **FEAT-016** | Notification | Web Push & In-App Announcement Dispatch | `Announcements.jsx`, `send-push` Edge Fn, `push-sw.js` | Admin, All |
| **FEAT-017** | Admin | Student Tracker & Batch Enrollment | `StudentTracker.jsx` | Admin |
| **FEAT-018** | Admin | Faculty Directory & Granular Permissions | `TeacherManager.jsx` | Admin |
| **FEAT-019** | Admin | Multi-Teacher Batch Management & Posters | `BatchManager.jsx`, `AdminBatchDetails.jsx` | Admin |
| **FEAT-020** | Financial | Faculty Salary Payroll & Teacher QR Codes | `SalaryManager.jsx`, `SalaryStatus.jsx` | Admin, Teacher |
| **FEAT-021** | Analytics | Batch Attendance & Fee Analytics Charts | `Analytics.jsx`, `AttendanceChart.jsx`, `FeeChart.jsx` | Admin |
| **FEAT-022** | Admin | Destructive System Reset & Student Purge | `AdminSettings.jsx` | Admin |

---

## 2. Feature Domain Summaries

### Domain 1: Authentication & Onboarding (FEAT-001 - FEAT-004)
Covers multi-step account creation with dynamic role selection (Student, Teacher, Admin), password strength indicators, automatic roll number synthesis (`YYYY-BATCH-SEQ`), 2-day free trial issuance (`trial_ends_at`), and session persistence across browser reloads.

### Domain 2: Public Presentation & Discovery (FEAT-005 - FEAT-007)
Provides a high-conversion landing page with founder credentials, admissions open alerts, dynamic responsive posters for running batches, filtered study card feeds, and public trial video viewing routes.

### Domain 3: Core Academic Delivery (FEAT-008 - FEAT-011)
Delivers batch-restricted learning resources: YouTube playlist ingestion, shielded video streaming without distracting YouTube recommendations, 2x long-press speed accelerators, in-video doubt submission with exact timestamps, and live class broadcasting with instant audio notifications.

### Domain 4: Consistency & Accountability (FEAT-012 - FEAT-013)
Encourages daily engagement through one-click self-attendance marking, dynamic streak calculation (fire flame badge), monthly attendance heatmaps, circular SVG progress rings, and Google Drive homework submission with teacher grading.

### Domain 5: Communication & Notifications (FEAT-014, FEAT-016)
Facilitates direct academic doubt resolution through real-time 1-on-1 chat threads, unread badge counters, VAPID Web Push notifications for closed browser sessions, and floating announcement popups.

### Domain 6: Institute Governance & Operations (FEAT-015, FEAT-017 - FEAT-022)
Empowers institute management: offline UPI payment reconciliation (pending, verified, rejected), fee defaulter tracking, teacher permission toggles, multi-teacher batch assignment, payroll disbursement, Recharts analytics, and database reset controls.
