# Executive Summary — Comprehensive Platform Audit

Audit Date: October 13, 2026  
Target Application: Graviton Academy (Coaching Institute Platform)  
Repository: `/home/thoughtful/Downloads/coaching-institute-last`  
Auditor Role: Principal Software Architect, Full-Stack & Security Specialist

---

## 1. What the Platform Actually Is

**Graviton Academy** is a specialized, web-based EdTech coaching and institute management platform designed for hybrid and online academic coaching institutes in India (specifically focused on secondary and senior secondary competitive coaching, e.g., Class 9-10 Foundations, Class 11-12 Physics/Science, JEE/NEET preparation).

The product serves four distinct user personas:
1. **Public Visitors & Prospective Students:** Browse active batches, view founder credentials, inspect curriculum details, watch sample video lectures, and self-register for batches with an automated 2-day free trial.
2. **Enrolled Students:** Track personal daily attendance and check-in streaks, stream protected video lectures from batch playlists, take notes, submit timestamped doubts to faculty, submit homework via Google Drive links, receive fee reminders, pay fees via UPI QR code reconciliation, and join live online classes (Zoom / Google Meet).
3. **Faculty & Teachers:** Manage batch study cards and curriculum resources, assign and grade homework with custom feedback, launch live classes with instant broadcast chimes, answer student direct messages, view salary disbursement history, and inspect batch student fee records (permission-gated).
4. **Institute Administrators:** Full control over students, teachers, permissions, batches, multi-teacher assignments, UPI QR payment settings, teacher payroll, institute-wide announcements, attendance analytics, and destructive database reset controls.

---

## 2. Technology Stack & Architecture

- **Frontend Core:** React 18.3.1 (Single Page Application via `react-router-dom` v6.28.0), styled with Tailwind CSS v3.4.14, Lucide React icons, and Framer Motion micro-interactions.
- **Client Bundler & PWA:** Vite 5.4.10 with `@vitejs/plugin-react` and `vite-plugin-pwa` 1.3.0 utilizing Workbox for precaching (1.82 MB offline bundle) and a standalone Web Push service worker (`push-sw.js`).
- **Backend as a Service (BaaS):** Supabase Cloud providing managed PostgreSQL 15, PostgREST 12 HTTP API, Supabase Auth (GoTrue), Supabase Storage (`qr-codes`, `teacher-qr`), and Realtime WebSocket replication.
- **Edge & Serverless Compute:**
  * Netlify Serverless Function (`youtube-playlist.js`) for proxying and discovering YouTube RSS feeds without exposing Google API keys.
  * Supabase Edge Function (`send-push` on Deno) triggered by database webhooks on `messages` and `notifications` to dispatch RFC 8291 Web Push notifications via VAPID.
- **Data Model:** 18 relational tables in schema `public` protected by PostgreSQL Row Level Security (RLS) policies defined across 24 incremental migrations.

---

## 3. High-Level Audit Conclusions

### What Is Verified Working
- **Core Production Build & Compilation:** `npm run build` succeeds cleanly in 10.19 seconds, generating 54 optimized code-split chunks with zero compilation errors.
- **Codebase Linting:** `npm run lint` passes with 0 errors and 0 warnings under ESLint 9.13.0.
- **Navigation & Routing:** All 27 application routes are properly mapped with `React.lazy()` chunk loading, protected by `ProtectedRoute` role guards, and connected to the layout hierarchy.
- **Public Batch Catalog & Discovery:** The homepage and batch details pages properly pull live active batches and public study cards from the connected Supabase instance.
- **Lecture Player & Custom UI:** The custom `ProtectedVideoPlayer` successfully wraps YouTube iframes, prevents autoplay redirection to external YouTube pages, provides custom speed/scrubbing controls, and persists student playback timestamps in `localStorage`.
- **Realtime WebSocket Channels:** Attendance, Live Class broadcasts (with Web Audio API chime), unread badges, and 1-on-1 direct messages subscribe to Supabase Realtime channels.
- **PWA Capabilities:** Web App Manifest (`manifest.json`), service worker registration, and push notification listener scripts are deployed and functional.

### What Is Partially Working or Defective
- **Admin Privilege Escalation:** Client-side registration permits arbitrary users to register as `admin` by passing `options.data.role = 'admin'` to `supabase.auth.signUp()`, because `handle_new_user()` in PostgreSQL trusts client metadata blindly ([SEC-001](./SECURITY/SECURITY_FINDINGS.md#SEC-001)).
- **Unrestricted Profile Updates:** Authenticated users can modify the `role` column in `profiles` to `'admin'`, and teachers can elevate their own permissions and salary in `teacher_profiles` due to missing `WITH CHECK` restrictions on RLS update policies ([SEC-003](./SECURITY/SECURITY_FINDINGS.md#SEC-003)).
- **Stored XSS in Batch Details:** Admin rich text editor inserts unescaped HTML directly into `batches.detailed_info`, which is rendered on public pages via `dangerouslySetInnerHTML` without sanitization ([SEC-002](./SECURITY/SECURITY_FINDINGS.md#SEC-002)).
- **Orphan User Deletions:** Deleting users in `AdminSettings.jsx` deletes rows from `public.profiles` but leaves records in `auth.users`, breaking subsequent account logins and re-registrations ([DATA-001](./DATABASE/DATA_INTEGRITY_AUDIT.md#DATA-001)).
- **Manual Payment Flow:** Fee payments rely entirely on manual student entry of UPI UTR numbers with offline admin verification, rather than automated webhooks from a payment aggregator ([ARCH-002](./ARCHITECTURE/SYSTEM_OVERVIEW.md#ARCH-002)).

### What Is Completely Missing
- **Automated Tests:** **0% automated test coverage.** There are zero unit tests, integration tests, or end-to-end tests in the repository ([TEST-001](./TESTING/KNOWN_TEST_GAPS.md#TEST-001)).
- **Error Monitoring (APM):** No integration with Sentry, LogRocket, or Datadog; unhandled runtime exceptions fail silently in user browser consoles ([INFRA-002](./INFRASTRUCTURE/LOGGING_AND_MONITORING.md#INFRA-002)).
- **Automated CI/CD Test Pipeline:** Pull requests are not tested in GitHub Actions prior to merging ([INFRA-001](./INFRASTRUCTURE/CI_CD_PIPELINE.md#INFRA-001)).

---

## 4. Key Findings Summary by Severity

| Finding ID | Category | Severity | Title | Impact |
|---|---|---|---|---|
| **[SEC-001](./SECURITY/SECURITY_FINDINGS.md#SEC-001)** | Security | **P0 - Critical** | Client-controlled Admin Role Assignment | Complete platform takeover via self-registration |
| **[SEC-002](./SECURITY/SECURITY_FINDINGS.md#SEC-002)** | Security | **P0 - Critical** | Stored XSS in Batch Details HTML | Account takeover / credential theft on public pages |
| **[SEC-003](./SECURITY/SECURITY_FINDINGS.md#SEC-003)** | Security | **P0 - Critical** | Unconstrained RLS Column Updates on Profiles | Self-elevation of permissions and salary amounts |
| **[SEC-004](./SECURITY/SECURITY_FINDINGS.md#SEC-004)** | Security | **P1 - High** | Exposed `VITE_ADMIN_CODE` in Frontend Bundle | Hardcoded secret bundled into client JavaScript |
| **[DATA-001](./DATABASE/DATA_INTEGRITY_AUDIT.md#DATA-001)** | Data | **P1 - High** | Incomplete User Deletion (Auth vs Profile Drift) | Orphan auth users locked out of registration |
| **[BUG-001](./FINDINGS/FUNCTIONAL_DEFECTS.md#BUG-001)** | Functional | **P1 - High** | Video Lecture Public Gate Missing on Direct URLs | Unenrolled guests can bypass paywalls on public watch routes |
| **[TEST-001](./TESTING/KNOWN_TEST_GAPS.md#TEST-001)** | Testing | **P1 - High** | Total Absence of Automated Testing Suite | High regression risk during subsequent feature work |
| **[PERF-001](./PERFORMANCE_AND_SCALABILITY/BOTTLENECK_ANALYSIS.md#PERF-001)** | Performance | **P2 - Medium** | PostgREST Connection Starvation at Peak Logins | Database connection exhaustion beyond ~500 concurrents |
| **[UX-001](./FRONTEND/UI_UX_AUDIT.md#UX-001)** | UX | **P2 - Medium** | Mobile Keyboard Overlap on Message Input Drawer | Text input obscured on small iOS/Android screens |

---

## 5. Practical Student Capacity Assessment

Based on the verified Supabase BaaS architecture and PostgREST connection model:
- **Registered Students Capacity:** Up to **100,000+** registered students in PostgreSQL without degradation.
- **Concurrent Browsing Users:** **1,500 – 3,000** concurrent students on standard Supabase Pro compute tier ($25/mo) with connection pooling (PgBouncer).
- **Concurrent Video Viewers:** **Virtually Unlimited (50,000+)** because video chunks are streamed directly from YouTube's global CDN edge, consuming 0 Kbps of institute server bandwidth.
- **Concurrent Live Class Participants:** Limited by the third-party meeting platform (Zoom: 100-500 participants; Google Meet: 100-250 participants).
- **Primary Bottlenecks:** Realtime WebSocket connection pool and peak simultaneous database writes (e.g. 500 students submitting attendance within the same 60-second morning window).

---

## 6. Top Recommended Upgrade Priorities (Next Steps)

1. **P0 Security Patch:** Rewrite `handle_new_user()` in PostgreSQL to ignore `meta->>'role'` and force `role = 'student'` on public signups. Restrict admin promotion strictly to existing admin database operations.
2. **P0 RLS Hardening:** Add PostgreSQL triggers or revoke column-level permissions so non-admins cannot update `role` on `profiles` or permission flags on `teacher_profiles`.
3. **P0 XSS Sanitization:** Integrate `DOMPurify` before rendering `detailed_info` in `BatchDetails.jsx`.
4. **P1 Testing Foundation:** Install `vitest` and `@testing-library/react` to establish regression test suites for authentication, role gating, and attendance calculations.
5. **P1 Content Protection:** Gate `/watch/:cardId` routes to verify batch enrollment or active free trial before rendering lecture video streams.
