# Authentication & Onboarding Deep Dive

Audit Date: 2026-10-13  
Platform: Graviton Academy  
Feature IDs: FEAT-001, FEAT-002, FEAT-003, FEAT-004

---

## 1. Feature Specifications

### 1.1 Multi-Step Self-Registration (FEAT-001)
- **Component:** `src/pages/Register.jsx` (522 LOC)
- **UX Workflow:**
  * **Step 1 (Role Selection):** Choose Student, Teacher, or Admin. Admin displays an indicator: *"Requires admin invite code"*.
  * **Step 2 (Details Form):** Full Name, Email, Phone, Password (with strength meter), Confirm Password.
  * *Role-Specific Fields:*
    * **Student:** Batch selection (pre-selected if registering from `/batch-details?id=...`), Subject checkboxes (populated from `batches.subjects`), Parent's Phone, Date of Birth.
    * **Teacher:** Subject, Educational Qualification.
    * **Admin:** Secret Admin Invite Code input.
- **Roll Number Generation (`014_handle_new_user.sql`):**
  When a student registers with a selected `batch_id`, PostgreSQL synthesizes an automated roll number formatted as `YYYY-PREFIX-SEQ` (e.g., `2026-JEE-001`), where `PREFIX` is the first 3 alphanumeric characters of the batch name and `SEQ` is the sequential student count in that batch formatted to 3 digits.

### 1.2 Two-Day Free Trial (FEAT-004)
- **Implementation:** `Register.jsx` line 372 sets:
  ```javascript
  const trialEndsAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
  await supabase.from('student_profiles').upsert({
    id: uid, batch_id, trial_ends_at: trialEndsAt, ...
  })
  ```
- **Dashboard Countdown:** `StudentDashboard.jsx` displays a trial banner if `trial_ends_at` is in the future, warning how much trial time remains.
- **Trial Expiration Defect:** When `trial_ends_at` passes, the application displays an expired badge in `AdminHome.jsx`, but **does NOT lock out the student** from continuing to access `/student/dashboard` or `/student/study` unless an administrator manually marks `profiles.is_active = false` ([BUG-004](../FINDINGS/FUNCTIONAL_DEFECTS.md#BUG-004)).

---

## 2. Security Vulnerabilities in Onboarding

1. **[SEC-001](../SECURITY/SECURITY_FINDINGS.md#SEC-001) — Admin Role Injection:**
   The client-side registration form validates `ADMIN_CODE` in browser JavaScript, but `handle_new_user()` in PostgreSQL assigns whatever role is passed in `NEW.raw_user_meta_data->>'role'`. Anyone calling `supabase.auth.signUp()` via cURL with `{ role: 'admin' }` bypasses the code and gains full administrative privileges.
2. **[SEC-004](../SECURITY/SECURITY_FINDINGS.md#SEC-004) — Bundled Admin Invite Secret:**
   `VITE_ADMIN_CODE` is baked directly into the static JavaScript chunk (`Register-BGGVLZ26.js`), making it readable by anyone inspecting network source files.
