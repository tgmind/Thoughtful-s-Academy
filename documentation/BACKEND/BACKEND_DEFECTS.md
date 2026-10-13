# Backend & API Defects Register

**Platform:** Thoughtful's Academy (Coaching Institute Management System)  
**Scope:** Complete forensic register of all architectural defects, security vulnerabilities, race conditions, and data integrity gaps identified in backend APIs, triggers, functions, and database interactions.  
**Total Defects Documented:** 8 Defects (`BED-001` through `BED-008`)  

---

## 1. Master Backend Defects Summary Table

| Defect ID | Severity | Category | Component / Location | Title / Summary |
|---|:---:|---|---|---|
| `BED-001` | **P0 Critical** | Security / Auth | `supabase/migrations/014_handle_new_user.sql:9` | Client-Controlled Role Assignment via User Metadata |
| `BED-002` | **P0 Critical** | Authorization | `supabase/migrations/002_rls_policies.sql:64` | Unconstrained Column Updates via PostgREST RLS Policies |
| `BED-003` | **P1 High** | Data Integrity | `src/pages/admin/AdminSettings.jsx:412` | Orphaned Records in `auth.users` on Student Deletion |
| `BED-004` | **P1 High** | Concurrency / Integrity | `014_handle_new_user.sql:35` | Race Condition in Roll Number `COUNT(*) + 1` Generation |
| `BED-005` | **P2 Medium** | Information Disclosure | PostgREST Client Queries (`src/pages/`) | Leaked Internal Database Schema & RLS Violation Details |
| `BED-006` | **P2 Medium** | Atomicity | Multi-table mutations across Admin pages | Lack of Database Transaction Wrapping on Multi-Step Ops |
| `BED-007` | **P2 Medium** | Abuse / Rate Limiting | `netlify/functions/youtube-playlist.js` | Unauthenticated, Un-Rate-Limited YouTube Proxy Endpoint |
| `BED-008` | **P3 Low** | Scalability | PostgREST Direct Connection Model | Connection Pool Starvation Risk During Morning Peak |

---

## 2. Granular Technical Profiles & Root Cause Analysis

### 2.1 `BED-001` (SEC-001): Client-Controlled Role Assignment in User Metadata
- **File:** `supabase/migrations/014_handle_new_user.sql`
- **Vulnerable Code:**
  ```sql
  meta   JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_role TEXT  := COALESCE(meta->>'role', 'student');
  ```
- **Exploitation:** An unauthenticated attacker calls `supabase.auth.signUp()` with `{ data: { role: admin } }`. The trigger executes with `SECURITY DEFINER` privileges, inserting a row into `public.profiles` with `role = admin`, granting complete administrative superuser control over the entire platform.
- **Remediation:** Remove reliance on client-supplied `meta->>role`. Hardcode `v_role := student` for public signups, and require an administrative service role function to elevate users to faculty or administrator.

### 2.2 `BED-002` (SEC-003): Unconstrained Column Updates via RLS Policies
- **File:** `supabase/migrations/002_rls_policies.sql` line 64:
  ```sql
  CREATE POLICY "profiles: own update"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);
  ```
- **Vulnerability:** Standard PostgREST `UPDATE profiles` with `USING (auth.uid() = id)` contains NO `WITH CHECK` restricting column modifications. A student can send:
  ```json
  PATCH /rest/v1/profiles?id=eq.<my-uid>
  { "role": "admin" }
  ```
  PostgreSQL executes the update successfully because `auth.uid() = id` is true.
- **Remediation:** Create a `BEFORE UPDATE` trigger that prevents users from modifying the `role` column unless `is_admin()` is true, or split sensitive columns into a separate table.

### 2.3 `BED-003` (DATA-001): Orphaned Records in `auth.users` on Student Deletion
- **Location:** `src/pages/admin/AdminSettings.jsx`
- **Issue:** The admin interface deletes users by calling `supabase.from(profiles).delete().eq(id, userId)`. While foreign key cascade deletes associated student records, the parent user remains intact inside Supabase internal schema `auth.users`.
- **Consequence:** The student is removed from the dashboard, but their email address remains locked in `auth.users`. Any attempt to re-register with that email fails with "User already registered".
- **Remediation:** Invoke a secure Supabase Edge Function that uses `supabase.auth.admin.deleteUser(userId)` using the `SUPABASE_SERVICE_ROLE_KEY`.

### 2.4 `BED-004` (DATA-002): Race Condition in Automated Roll Number Generation
- **Location:** `014_handle_new_user.sql` line 35
- **Root Cause:**
  ```sql
  SELECT COUNT(*) + 1 INTO v_seq
  FROM public.student_profiles WHERE batch_id = v_batch_id;
  ```
- **Consequence:** If two students register concurrently for the same batch, both transactions read the exact same count, calculating identical roll numbers (e.g., `2026-JEE-005`). One of the transactions crashes with a unique key violation.
- **Remediation:** Replace `COUNT(*) + 1` with a dedicated PostgreSQL sequence per batch or apply `pg_advisory_xact_lock(hashtext(v_batch_id::text))`.

### 2.5 `BED-007`: Un-Rate-Limited YouTube Proxy Endpoint
- **Location:** `netlify/functions/youtube-playlist.js`
- **Issue:** The endpoint accepts unauthenticated GET requests from anywhere on the internet (`Access-Control-Allow-Origin: *`) without an IP rate limiter or secret token check.
- **Consequence:** Threat actors can use the endpoint as a free scraping proxy for YouTube playlists, consuming Netlify serverless execution quotas and risking IP bans from YouTube.
- **Remediation:** Enforce user authentication or origin validation, and implement an in-memory rate limiter per IP address.
