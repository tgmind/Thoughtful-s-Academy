# Feature Status & Verification Matrix

Audit Date: 2026-10-13  
Platform: Thoughtful's Academy

---

## 1. Master Status Matrix

| Feature ID | Feature Name | Verification Status | Code Location | Observed Behavior / Defect Notes |
|---|---|---|---|---|
| **FEAT-001** | User Registration & Role Selection | **VERIFIED WORKING** (Security Flaw) | `src/pages/Register.jsx` | Functional multi-step form, but vulnerable to Admin Role Injection ([SEC-001](../SECURITY/SECURITY_FINDINGS.md#SEC-001)). |
| **FEAT-002** | Email / Password Authentication | **VERIFIED WORKING** | `src/pages/Login.jsx` | Verified working; redirects based on DB profile role. Suspends inactive users. |
| **FEAT-003** | Password Reset via Email | **PARTIALLY WORKING** | `src/pages/ResetPassword.jsx` | UI and recovery listener work; requires SMTP server configured in Supabase. |
| **FEAT-004** | 2-Day Free Trial Onboarding | **PARTIALLY WORKING** | `Register.jsx`, `StudentDashboard.jsx` | Sets `trial_ends_at`, displays countdown banner; but lacks automated lockout enforcement after expiration. |
| **FEAT-005** | Public Landing Page | **VERIFIED WORKING** | `src/pages/Home.jsx` | Verified working; loads active batches, featured cards, and notices dynamically. |
| **FEAT-006** | Public Batch Catalog & Syllabus | **VERIFIED WORKING** (Security Flaw) | `src/pages/BatchDetails.jsx` | Renders batch details, but contains Stored XSS via `dangerouslySetInnerHTML` ([SEC-002](../SECURITY/SECURITY_FINDINGS.md#SEC-002)). |
| **FEAT-007** | Public Video Lecture Preview | **VERIFIED WORKING** (Content Leak) | `src/pages/student/WatchLecture.jsx` | Renders player on `/watch/:cardId`, but allows unauthenticated access to private cards if ID is known ([BUG-001](../FINDINGS/FUNCTIONAL_DEFECTS.md#BUG-001)). |
| **FEAT-008** | Study Cards & Batch Workspaces | **VERIFIED WORKING** | `StudySection.jsx` | Full CRUD for video, playlist, drive links. Multi-batch assignment supported. |
| **FEAT-009** | Protected Video Classroom Player | **VERIFIED WORKING** | `ProtectedVideoPlayer.jsx` | Custom controls, quality menu, speed controls, screen lock, and progress save work. |
| **FEAT-010** | Lecture Doubt Submission & Notes | **VERIFIED WORKING** | `WatchLecture.jsx`, `doubtService.js` | Authoritative in-video doubt creation stored in `doubts` table with role-based controls, single-video tab vanishing, and description deduplication. |
| **FEAT-011** | Live Class Broadcast & Chime | **VERIFIED WORKING** | `LiveClass.jsx`, `useRealtime.js` | Realtime broadcast works; 880Hz Web Audio chime sounds upon new class. |
| **FEAT-012** | Self-Attendance & Streaks | **VERIFIED WORKING** | `Attendance.jsx`, `StudentDashboard.jsx` | Daily check-in button, streak counter, SVG ring, and monthly heatmap work. |
| **FEAT-013** | Homework Assignment & Submission | **PARTIALLY WORKING** | `Homework.jsx` (Student/Teacher) | Drive link submission and grading work; auto-notifications trigger on update. |
| **FEAT-014** | 1-on-1 Faculty-Student Messaging | **VERIFIED WORKING** | `Messages.jsx` | Realtime messaging with timestamp dividers and unread badges works. |
| **FEAT-015** | Offline UPI Fee Reconciliation | **PARTIALLY WORKING** | `PayFee.jsx`, `FeeManager.jsx` | Flow works; lacks automated payment gateway or duplicate UTR detection. |
| **FEAT-016** | Web Push Notification Dispatch | **IMPLEMENTED / UNVERIFIED LIVE** | `Announcements.jsx`, `send-push` | Requires real browser subscription and Supabase Deno deployment secrets. |
| **FEAT-017** | Student Directory & Enrollment | **VERIFIED WORKING** | `src/pages/admin/StudentTracker.jsx` | Admin can filter by batch, inspect attendance %, and modify batch subjects. |
| **FEAT-018** | Faculty Directory & Permissions | **VERIFIED WORKING** (Security Flaw) | `src/pages/admin/TeacherManager.jsx` | Permissions toggle in UI, but teacher can bypass via direct API update ([SEC-003](../SECURITY/SECURITY_FINDINGS.md#SEC-003)). |
| **FEAT-019** | Multi-Teacher Batch Management | **PARTIALLY WORKING** | `src/pages/admin/BatchManager.jsx` | Supports `teacher_ids` array; PostgREST lacks automatic join on array fields. |
| **FEAT-020** | Faculty Salary Payroll | **IMPLEMENTED / UNVERIFIED LIVE** | `SalaryManager.jsx`, `SalaryStatus.jsx` | Flow works; QR image storage depends on `teacher-qr` bucket policies. |
| **FEAT-021** | Attendance & Fee Analytics | **VERIFIED WORKING** | `Analytics.jsx`, `AttendanceChart.jsx` | Recharts bar and line graphs calculate 30-day attendance and 6-month fees. |
| **FEAT-022** | Destructive System Reset | **BROKEN / DEFECTIVE** | `src/pages/admin/AdminSettings.jsx` | Deletes `public.profiles` but leaves `auth.users`, locking emails from re-signup ([DATA-001](../DATABASE/DATA_INTEGRITY_AUDIT.md#DATA-001)). |
| **FEAT-023** | Cross-Portal Doubt Resolution Hub | **VERIFIED WORKING** | `doubtService.js`, `DoubtCard.jsx`, `StudentDoubts.jsx`, `TeacherDoubts.jsx`, `AdminDoubts.jsx` | First-class doubt management with role-tailored portals, self-study clearing, subject/batch accordions, dual admin views, and realtime badges. |
| **FEAT-024** | Saved Playback Progress & Resume | **VERIFIED WORKING** | `ProtectedVideoPlayer.jsx` | Top-left floating glassmorphic resume prompt without timeline collisions, auto-play seek, and deep-link suppression. |
