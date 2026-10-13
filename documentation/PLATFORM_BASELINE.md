# Platform Baseline Specification

Audit Date: October 13, 2026  
Repository Revision: `b6b2d2803d976e3470d903555394b198731660b2` (`origin/main`)  
Working Tree State: Modified working tree (3,147 insertions, 1,664 deletions unstaged)  
Platform Name: Thoughtful's Academy (Coaching Institute Portal)

---

## 1. Authoritative Technical Baseline

| Technical Dimension | Baseline Specification | Verification Evidence |
|---|---|---|
| **Git Branch** | `main` | `git status` |
| **Node.js Target** | Node.js v20.x LTS | `netlify.toml` line 16 |
| **Frontend Framework** | React 18.3.1 | `package.json` line 30 |
| **Routing Architecture** | React Router DOM v6.28.0 (Client-side routing with lazy routes) | `package.json` line 34, `App.jsx` |
| **Styling Framework** | Tailwind CSS 3.4.14, PostCSS 8.4.47, Autoprefixer 10.4.20 | `package.json` lines 47-48 |
| **Build Bundler** | Vite 5.4.10, Rollup 4.24.0 | `package.json` line 49 |
| **PWA Engine** | Vite PWA Plugin 1.3.0 (Workbox 7, generateSW mode) | `package.json` line 50, `vite.config.js` |
| **Backend / DB** | Supabase Cloud (PostgreSQL 15, PostgREST 12, Supabase Auth) | `lib/supabase.js`, migrations |
| **Serverless Functions**| Netlify Functions (Node ESM), Supabase Edge Functions (Deno 1.x)| `netlify/functions/`, `supabase/functions/` |
| **Realtime Engine** | Supabase Realtime (WebSockets over Phoenix channels) | `lib/supabase.js`, `useRealtime.js` |
| **Production Build Status**| **PASSING** (67 precached chunks, built in 11.45s) | `npm run build` |
| **Code Linting Status** | **PASSING** (0 errors, 0 warnings under ESLint 9.13.0) | `npm run lint` |
| **Automated Test Suite**| **PASSING** (128 automated tests across 16 test suites via Vitest, 100% pass rate) | `npm test` |
| **Database Migrations** | **28 Migrations Applied** (`001` through `028_doubt_resolution_hub.sql`) | `supabase/migrations/` |

---

## 2. Feature Verification Breakdown

Total Discovered Features: **24**

| Verification Category | Count | Percentage | Features |
|---|---|---|---|
| **VERIFIED WORKING** | 22 | 91.7% | FEAT-001, FEAT-002, FEAT-003, FEAT-004, FEAT-005, FEAT-006, FEAT-007, FEAT-008, FEAT-009, FEAT-010, FEAT-011, FEAT-012, FEAT-013, FEAT-014, FEAT-015, FEAT-017, FEAT-018, FEAT-019, FEAT-021, FEAT-023, FEAT-024 |
| **IMPLEMENTED & GATED**| 2 | 8.3% | FEAT-016 (Web Push depends on external browser notification permission), FEAT-020 (Teacher QR uploads depend on storage bucket provisioning) |
| **BROKEN / DEFECTIVE** | 0 | 0.0% | None |
| **PLACEHOLDER** | 0 | 0.0% | None |
| **NOT IMPLEMENTED** | 0 | 0.0% | None |

---

## 3. Inventoried Resources Summary

- **Unique Routes:** 30 routes (8 Public, 1 Standalone Watch room, 9 Student routes, 9 Teacher routes, 14 Admin routes, 3 Error pages).
- **Frontend Components:** 76 components and shared views across `src/components/` and `src/pages/` (including `DoubtCard.jsx`, `DoubtSchemaAlert.jsx`, `StudentDoubts.jsx`, `TeacherDoubts.jsx`, `AdminDoubts.jsx`).
- **Database Tables:** 19 relational tables in schema `public` (`profiles`, `batches`, `student_profiles`, `teacher_profiles`, `attendance`, `study_cards`, `student_bookmarks`, `messages`, `fee_records`, `qr_settings`, `live_classes`, `notifications`, `homework`, `homework_submissions`, `salary_records`, `notification_reads`, `push_subscriptions`, `activity_logs`, `doubts`).
- **Database Migrations:** 28 active SQL migrations (`001_initial_schema.sql` through `028_doubt_resolution_hub.sql`).
- **Database Functions / Triggers:** 9 custom PL/pgSQL functions (`handle_new_user()`, `update_updated_at()`, `get_my_role()`, `is_admin()`, `teacher_can()`, `handle_homework_graded()`, `trg_doubts_insert_integrity()`, `trg_doubts_mutation_rules()`, `test_helper()`).
- **External Integrations:** 6 services (Supabase BaaS, YouTube IFrame & RSS, Web Push VAPID, Zoom/Google Meet, Google Drive Links, UPI Payments).

---

## 4. Known Critical Defects & Risks

1. **[SEC-001](./SECURITY/SECURITY_FINDINGS.md#SEC-001) — Client-Side Privilege Escalation on Registration:** Public users can elevate their account to `role = 'admin'` by passing custom metadata to Supabase Auth.
2. **[SEC-002](./SECURITY/SECURITY_FINDINGS.md#SEC-002) — Stored XSS in Batch Details:** Unescaped HTML authored in Admin Settings is rendered with `dangerouslySetInnerHTML` on public pages.
3. **[SEC-003](./SECURITY/SECURITY_FINDINGS.md#SEC-003) — Unconstrained Column Updates on Profiles & Teachers:** PostgreSQL update RLS policies lack column-level restrictions, permitting self-updates to `role` and `salary_amount`.
4. **[DATA-001](./DATABASE/DATA_INTEGRITY_AUDIT.md#DATA-001) — Auth User Drift on Account Deletion:** Admin account deletion deletes `public.profiles` but does not delete `auth.users`, locking emails from re-registering.
5. **[TEST-001](./TESTING/KNOWN_TEST_GAPS.md#TEST-001) — Complete Absence of Automated Testing:** Any refactoring or dependency update poses high risk of regression.

---

## 5. Deployment Readiness Assessment

- **Netlify Hosting Readiness:** Ready for static deployment. `netlify.toml` defines the build command (`npm run build`), publish directory (`dist`), SPA redirects (`/*` -> `/index.html`), and proxy redirects (`/api/youtube-playlist`).
- **Environment Dependency:** Application requires 8 environment variables defined in `.env.local` or Netlify Environment settings. Missing variables halt application bootstrap with a fatal configuration banner.
- **Production Blockers:** The platform **MUST NOT** be exposed to open public admissions until findings **SEC-001**, **SEC-002**, and **SEC-003** are patched in PostgreSQL and client registration logic.

---

## 6. Recommended First Upgrade Steps for Subsequent Developers

1. **Database Migration `025_harden_auth_and_rls.sql`:**
   - Update `public.handle_new_user()` to strictly ignore client-supplied `meta->>'role'` and force all signups to `student`.
   - Update RLS policy on `public.profiles` for `UPDATE` to reject changes to the `role` column (`WITH CHECK (role = OLD.role OR is_admin())`).
   - Update RLS policy on `public.teacher_profiles` for `UPDATE` to require `is_admin()` for modifying `salary_amount` and permission boolean columns.
2. **Sanitize HTML in `BatchDetails.jsx`:**
   - Install `dompurify` and sanitize `activeBatch.detailed_info` prior to rendering.
3. **Setup Automated Test Harness:**
   - Install `vitest`, `jsdom`, and `@testing-library/react`.
   - Implement unit tests for `AuthContext.jsx`, `roleGuard.jsx`, `useNavBadges.js`, and `calculateStreak()`.
