# Critical (P0) & High Priority (P1) Findings Deep Dive

**Platform:** Graviton Academy (Coaching Institute Management System)  
**Total Priority Items:** 3 P0 Critical | 8 P1 High Priority Findings  
**Action Mandate:** Mandatory resolution before production launch with live students and fee processing.  

---

## 1. P0 Critical Priority Findings (Immediate Blockers)

### 1.1 `SEC-001`: Client-Controlled Role Assignment via User Metadata
- **Severity:** P0 Critical | **CVSS 9.8**
- **Location:** `supabase/migrations/014_handle_new_user.sql:9`
- **Root Cause:**
  ```sql
  v_role TEXT := COALESCE(meta->>'role', 'student');
  ```
- **Exploitation:** Any public user can send `{ "role": "admin" }` in registration metadata to become a platform administrator.
- **Fix:** Hardcode `v_role := 'student'` in `handle_new_user()`.

### 1.2 `SEC-002`: Stored Cross-Site Scripting (XSS) in Batch Details
- **Severity:** P0 Critical | **CVSS 9.0**
- **Location:** `src/pages/BatchDetails.jsx:532`
- **Root Cause:** Unsanitized rendering of `activeBatch.detailed_info` via `dangerouslySetInnerHTML`.
- **Exploitation:** Malicious scripts injected into course descriptions execute in visitors' browsers, exfiltrating session tokens.
- **Fix:** Wrap content in `DOMPurify.sanitize(activeBatch.detailed_info)`.

### 1.3 `SEC-003`: Unconstrained Column Updates via PostgREST RLS
- **Severity:** P0 Critical | **CVSS 9.1**
- **Location:** `supabase/migrations/002_rls_policies.sql:64`
- **Root Cause:** RLS `UPDATE` policy lacks column restrictions. Authenticated students can patch their own `role` to `'admin'`.
- **Fix:** Add a PostgreSQL `BEFORE UPDATE` trigger preventing non-admins from altering `role` or `salary_amount`.

---

## 2. P1 High Priority Findings

### 2.1 `SEC-004`: Bundled Admin Invite Secret in Public JS Bundle
- **Location:** `src/pages/Register.jsx:18`
- **Risk:** `VITE_ADMIN_CODE` is baked into the public compiled frontend JavaScript chunks. Anyone inspecting network bundles can read the code.
- **Fix:** Move invite validation to a server-side Edge Function.

### 2.2 `DATA-001`: Orphaned User Records in `auth.users` on Student Deletion
- **Location:** `src/pages/admin/AdminSettings.jsx:412`
- **Risk:** Deleting a student from `public.profiles` leaves the record intact in `auth.users`, locking the email address permanently from re-registering.
- **Fix:** Call `supabase.auth.admin.deleteUser(id)` via Edge Function.

### 2.3 `DATA-002`: Concurrency Race in Automated Roll Number Generation
- **Location:** `014_handle_new_user.sql:35`
- **Risk:** Concurrent signups for the same batch calculate identical `COUNT(*) + 1` roll numbers, causing database transaction collisions.
- **Fix:** Implement dedicated sequences per batch or PostgreSQL advisory transaction locks.

### 2.4 `TEST-001`: 0.00% Automated Test Coverage
- **Location:** Global Repository
- **Risk:** Zero unit, integration, or E2E tests exist, creating severe regression risk during updates.
- **Fix:** Bootstrap Vitest and Playwright test harnesses.

### 2.5 `UX-001`: Severe WCAG AA Color Contrast Failure on Saffron Buttons
- **Location:** `src/index.css:42` (`.btn-primary`)
- **Risk:** White text on `#f59e0b` has a 2.14:1 contrast ratio, failing WCAG AA 4.5:1 standards and impairing readability for low-vision users.
- **Fix:** Change button text color to `text-slate-950` or `text-navy-900`.
