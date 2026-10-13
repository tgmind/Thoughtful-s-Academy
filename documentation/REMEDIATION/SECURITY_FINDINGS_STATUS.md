# Security Findings Status Matrix

This document provides forensic status tracking for each security and data integrity finding identified during the Phase 1 audit and addressed in Phase 2.

---

## 1. Finding SEC-001: Unauthenticated Admin Account Creation

- **CVSS Score:** 9.8 (Critical) — `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H`
- **Component:** `supabase/migrations/014_handle_new_user.sql`
- **Original Vulnerability:**
  The `handle_new_user()` trigger function read user metadata directly from `raw_user_meta_data`:
  ```sql
  v_role := COALESCE(meta->>'role', 'student');
  ```
  Any public attacker issuing `supabase.auth.signUp({ email, password, options: { data: { role: 'admin' } } })` had an administrative account provisioned in `public.profiles` without authentication or authorization.
- **Remediation Implemented:**
  1. Authoring forward-only migration `supabase/migrations/026_security_and_integrity_hardening.sql`:
     ```sql
     -- Strict role defense: Public signups can NEVER self-elevate to 'admin'
     IF v_role NOT IN ('student', 'teacher') THEN
       v_role := 'student';
     END IF;
     ```
  2. Public signups requesting `role = 'admin'` or any arbitrary role string are forcefully clamped to `'student'`.
  3. Administration accounts can only be provisioned through secure direct database promotion or authenticated administrative onboarding.
- **Verification Evidence:**
  - Automated test `tests/security/role_assignment.test.js` executed via `vitest run`.
  - Passed test: `blocks client-side attempt to request admin role upon registration`.
  - Passed test: `blocks arbitrary role injections (superadmin, moderator, root)`.
- **Status:** **RESOLVED**

---

## 2. Finding SEC-002: Stored Cross-Site Scripting (XSS) via Batch Details

- **CVSS Score:** 9.0 (Critical) — `CVSS:3.1/AV:N/AC:L/PR:L/UI:R/S:C/C:H/I:H/A:N`
- **Component:** `src/pages/BatchDetails.jsx` line 532
- **Original Vulnerability:**
  The `detailed_info` column of `batches` was rendered into the DOM using React's `dangerouslySetInnerHTML`:
  ```jsx
  <div
    className="prose prose-blue max-w-none text-gray-800 text-sm leading-relaxed"
    dangerouslySetInnerHTML={{ __html: activeBatch.detailed_info }}
  />
  ```
  Any script tag, `onerror` image handler, or malicious link stored by an administrative or compromised account executed arbitrarily in visiting student and guest browsers, enabling credential and session hijacking.
- **Remediation Implemented:**
  1. Installed production dependency `dompurify` (`^3.2.4`).
  2. Updated `src/pages/BatchDetails.jsx` to sanitize `activeBatch.detailed_info` through `DOMPurify.sanitize()` before DOM injection:
     ```jsx
     import DOMPurify from 'dompurify'
     ...
     <div
       className="prose prose-blue max-w-none text-gray-800 text-sm leading-relaxed"
       dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(activeBatch.detailed_info) }}
     />
     ```
- **Verification Evidence:**
  - Automated test suite `tests/security/xss_sanitization.test.jsx`.
  - Tested payloads: `<script>`, `<img onerror=...>`, `<a href="javascript:...">`, `<iframe src="...">`.
  - All malicious tags stripped; educational formatting (`<h3>`, `<strong>`, `<ul>`, `<table>`) preserved.
- **Status:** **RESOLVED**

---

## 3. Finding SEC-003: Horizontal & Vertical Privilege Escalation via Open Column Updates

- **CVSS Score:** 9.1 (Critical) — `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N`
- **Components:**
  - `supabase/migrations/002_rls_policies.sql` (`profiles: own update`, `teacher_profiles: admin update`, `fee_records: student insert`, `submissions: student insert`)
  - `supabase/migrations/021_fix_teacher_study_cards_permissions.sql`
- **Original Vulnerabilities:**
  1. `profiles: own update` allowed `auth.uid() = id` without column restrictions. A student could execute `UPDATE profiles SET role = 'admin' WHERE id = auth.uid()`.
  2. `teacher_profiles: admin update` allowed `auth.uid() = id`. A teacher could execute `UPDATE teacher_profiles SET salary_amount = 999999, can_manage_study_cards = true WHERE id = auth.uid()`.
  3. `fee_records: student insert` allowed students to insert records without checking `status = 'pending'`, enabling fee self-approval.
  4. `homework_submissions: student insert` allowed students to insert records with arbitrary `grade` and `feedback`, enabling self-grading.
- **Remediation Implemented:**
  1. Added PostgreSQL trigger `trg_enforce_profile_role_integrity` on `public.profiles` (`026_security_and_integrity_hardening.sql`) aborting transactions with `RAISE EXCEPTION` if a non-admin mutates `role` or `id`.
  2. Added PostgreSQL trigger `trg_enforce_teacher_profile_integrity` on `public.teacher_profiles` aborting transactions if non-admins mutate `salary_amount` or any `can_*` permission flags.
  3. Replaced RLS policy `fee_records: student insert` with `WITH CHECK (auth.uid() = student_id AND (status = 'pending' OR status IS NULL))`.
  4. Replaced RLS policy `submissions: student insert` with `WITH CHECK (auth.uid() = student_id AND grade IS NULL AND feedback IS NULL)`.
- **Verification Evidence:**
  - Automated test suite `tests/security/column_updates.test.js` (13 test cases).
  - All privilege tampering attempts verified to throw unauthorized errors or fail RLS checks.
- **Status:** **RESOLVED**

---

## 4. Finding SEC-004: Client-Side Admin Secret Bundled into JavaScript

- **CVSS Score:** 7.5 (High) — `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N`
- **Component:** `src/pages/Register.jsx` line 10 & line 125, `.env.local` line 11
- **Original Vulnerability:**
  `const ADMIN_CODE = import.meta.env.VITE_ADMIN_CODE` was declared in `Register.jsx`. Because Vite prefixes (`VITE_*`) are compiled statically into JavaScript bundles, `VITE_ADMIN_CODE` was extracted by any user downloading `Register-*.js`. Furthermore, validation was purely client-side (`if (form.admin_code !== ADMIN_CODE)`).
- **Remediation Implemented:**
  1. Removed `VITE_ADMIN_CODE` from `src/pages/Register.jsx`.
  2. Removed `admin` account option from public self-registration (`Register.jsx`). Public users can only select `student` or `teacher`.
  3. Deprecated and commented out `VITE_ADMIN_CODE` in `.env.local`.
  4. Rebuilt client bundle and verified zero presence of admin secrets in compiled chunks.
- **Verification Evidence:**
  - Verified bundle using `grep -i "ADMIN_CODE" dist/assets/*.js`: Returned "No secret leaked in dist".
  - Automated test `tests/security/role_assignment.test.js`: Confirmed `VITE_ADMIN_CODE` is undefined.
- **Status:** **RESOLVED**

---

## 5. Finding SEC-006 / BUG-001: Unprotected Standalone Lecture Route

- **CVSS Score:** 7.5 (High) — `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N`
- **Component:** `src/App.jsx` line 77, `src/pages/student/WatchLecture.jsx`
- **Original Vulnerability:**
  The route `/watch/:cardId?` was mapped under `{/* Public */}` in `src/App.jsx` without role or authentication guards. If an unauthenticated user accessed a private study card URL directly or through router state, the component rendered without clear enrollment feedback, or failed gracefully into broken states.
- **Remediation Implemented:**
  1. Updated `src/pages/student/WatchLecture.jsx` with strict access verification:
     - If `!card.is_public && !user`: Renders an explicit "Enrolled Student Access Required" security gate with a "Sign In to Watch" redirect action (`/login?redirect=...`) and "Back to Home".
     - If `!card && !user`: Renders "Enrolled Student Access Required" instead of a confusing "Not Found".
     - If `!card && user`: Informs enrolled students that the lecture is restricted or unavailable.
  2. Updated `handleGoBack()` in `WatchLecture.jsx` so unauthenticated visitors are safely returned to `/` instead of hitting protected dashboard route redirects.
  3. Optimized card hydration to prevent redundant database fetches when card state is already present in `location.state.card`.
- **Verification Evidence:**
  - Automated test suite `tests/security/lecture_authorization.test.jsx`.
  - Verified private cards prompt for login, public cards render for guests, and non-existent lectures require login for unauthenticated visitors.
- **Status:** **RESOLVED**

---

## 6. Finding DATA-001: Orphaned `auth.users` on Student Profile Deletion

- **Severity:** High (Data Integrity & Operational)
- **Component:** `src/pages/admin/AdminSettings.jsx`, PostgreSQL foreign key relationships
- **Original Vulnerability:**
  `AdminSettings.jsx` deleted rows from `public.profiles` (`supabase.from('profiles').delete().in('id', ids)`). In Supabase, `public.profiles.id` references `auth.users(id) ON DELETE CASCADE`. However, deleting the child row (`profiles`) does NOT cascade to delete the parent row (`auth.users`). Consequently, orphaned auth records were left behind, permanently blocking students from re-registering with their email address.
- **Remediation Implemented:**
  Added PostgreSQL trigger `handle_profile_deleted()` in `026_security_and_integrity_hardening.sql`:
  ```sql
  CREATE OR REPLACE FUNCTION public.handle_profile_deleted()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = auth, public
  AS $$
  BEGIN
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = OLD.id) THEN
      DELETE FROM auth.users WHERE id = OLD.id;
    END IF;
    RETURN OLD;
  END;
  $$;

  CREATE TRIGGER on_profile_deleted
    AFTER DELETE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_profile_deleted();
  ```
  When an admin deletes a profile, the database securely cascades the deletion to `auth.users`, ensuring full cleanup without orphaned auth records.
- **Status:** **RESOLVED**

---

## 7. Finding DATA-002: Roll Number Duplication Race Condition

- **Severity:** High (Data Integrity)
- **Component:** `supabase/migrations/014_handle_new_user.sql`
- **Original Vulnerability:**
  `handle_new_user()` generated student roll numbers using `SELECT COUNT(*) + 1 INTO v_seq FROM student_profiles WHERE batch_id = v_batch_id`. In concurrent registrations for the same batch, multiple transactions read the identical count, resulting in duplicate roll numbers (e.g. two students assigned `2026-JEE-005`).
- **Remediation Implemented:**
  Updated `handle_new_user()` in `026_security_and_integrity_hardening.sql`:
  ```sql
  -- Serialize roll-number generation per batch to prevent race condition duplicates
  PERFORM pg_advisory_xact_lock(hashtext(v_batch_id::text));

  -- Use MAX sequence number to ensure monotonic increments even if prior rows were deleted
  SELECT COALESCE(MAX(SUBSTRING(roll_number FROM '[0-9]+$')::int), 0) + 1
  INTO v_seq
  FROM public.student_profiles
  WHERE batch_id = v_batch_id
    AND roll_number LIKE (v_year || '-' || COALESCE(v_batch_pref, 'B') || '-%');
  ```
- **Verification Evidence:**
  - Automated test `tests/security/role_assignment.test.js`: Confirmed format compliance and sequence padding.
- **Status:** **RESOLVED**
