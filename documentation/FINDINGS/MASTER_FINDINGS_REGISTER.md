# Master Platform Audit Findings Register

**Platform:** Graviton Academy (Coaching Institute Management System)  
**Total Identified Findings:** 30 Distinct Forensic Findings  
**Severity Breakdown:** 3 P0 Critical | 8 P1 High | 12 P2 Medium | 7 P3 Low  

---

## 1. Master Findings Catalog

| Finding ID | Severity | Category | Title / Summary | Affected Component |
|---|:---:|---|---|---|
| `SEC-001` | **P0 Critical** | Security | Client-Controlled Role Assignment via User Metadata | `014_handle_new_user.sql` |
| `SEC-002` | **P0 Critical** | Security | Stored Cross-Site Scripting (XSS) in Batch Details | `BatchDetails.jsx:532` |
| `SEC-003` | **P0 Critical** | Security | Unconstrained Column Updates via PostgREST RLS | `002_rls_policies.sql:64` |
| `SEC-004` | **P1 High** | Security | Bundled Admin Invite Secret in Public JS Bundle | `Register.jsx:18` |
| `SEC-006` | **P1 High** | Security | Insecure Direct Access to Private Video Study Rooms | `App.jsx:92` (`/watch/:cardId`) |
| `SEC-007` | **P1 High** | Security | 19 Unpatched Vulnerabilities in NPM Dependency Tree | `package.json` |
| `DATA-001` | **P1 High** | Data Integrity | Orphaned Records in `auth.users` on Student Deletion | `AdminSettings.jsx:412` |
| `DATA-002` | **P1 High** | Data Integrity | Concurrency Race in Automated Roll Number Generation | `014_handle_new_user.sql` |
| `TEST-001` | **P1 High** | Quality | 0.00% Automated Test Coverage across all platform features| Entire Codebase |
| `FED-002` | **P1 High** | Maintainability| Megalithic Component Debt (>1,000 LOC Single-File Hubs)| `TeacherStudySection.jsx`, etc. |
| `UX-001` | **P1 High** | Accessibility | Severe WCAG AA Color Contrast Failure on Saffron Buttons| `index.css` (`.btn-primary`) |
| `BUG-001` | **P1 High** | Functional | Public Video Gate Missing on Direct Watch Routes | `App.jsx` (`/watch/:cardId`) |
| `BUG-002` | **P2 Medium** | Functional | Batch Content Gating Bypass via Legacy `batch_id` Column | `study_cards` Table |
| `BUG-003` | **P2 Medium** | Functional | Duplicate Roll Number Violation on Concurrent Registrations| `handle_new_user()` |
| `BUG-004` | **P2 Medium** | Functional | Video Player Buffering Blackout without Loading Indicator| `ProtectedVideoPlayer.jsx` |
| `BUG-005` | **P2 Medium** | Functional | Absence of Granular Component Error Boundaries | `App.jsx` & Page Trees |
| `PERF-001` | **P2 Medium** | Performance | Missing Secondary Indexes on Foreign Keys | PostgreSQL Database Schema |
| `PERF-002` | **P2 Medium** | Performance | Monolithic Unvirtualized DOM Trees in Teacher Studio | `TeacherStudySection.jsx` |
| `PERF-003` | **P2 Medium** | Performance | Redundant Network Calls on Route Navigation | Multiple Page Components |
| `PERF-004` | **P2 Medium** | Performance | Re-render Cascades during Doubt Input in Video Player | `ProtectedVideoPlayer.jsx` |
| `PERF-005` | **P2 Medium** | Scalability | Connection Pool Starvation Risk during Morning Rush | PostgREST / Supabase |
| `UX-002` | **P2 Medium** | Mobile UX | Sub-Standard Touch Targets on Chapter Accordion Chevrons| `TeacherStudySection.jsx` |
| `UX-003` | **P2 Medium** | Accessibility | Missing `aria-label` Attributes on Icon-Only Controls | `DashboardShell.jsx`, etc. |
| `UX-004` | **P2 Medium** | Accessibility | Inlined Modal Dialogs Lack Keyboard Focus Trapping | `TeacherStudySection.jsx` |
| `UX-005` | **P2 Medium** | UX Friction | Manual 12-Digit UTR Payment Verification Overhead | Student & Admin Fee Workflows |
| `SEC-005` | **P2 Medium** | Security | Absence of Rate Limiting on Netlify Proxy Endpoint | `youtube-playlist.js` |
| `BUG-006` | **P3 Low** | UX / Data Loss | Modal Form State Lost Immediately on Backdrop Click | Teacher Study Modals |
| `BUG-007` | **P3 Low** | Information Disc| Raw PostgREST Database Exceptions Leaked in UI Toasts | Client Form Handlers |
| `UX-006` | **P3 Low** | Efficiency | Absence of Bulk "Mark All Present" Action for Faculty | `Attendance.jsx` |
| `BED-006` | **P3 Low** | Atomicity | Lack of Database Transaction Wrapping on Multi-Step Ops | Admin Management Pages |
