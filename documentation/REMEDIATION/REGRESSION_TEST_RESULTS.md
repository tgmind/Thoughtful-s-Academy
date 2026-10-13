# Regression Test Results & Evidence

This document records the automated regression test execution results, coverage metrics, and validation output following the Phase 2 remediations.

---

## 1. Test Execution Summary

- **Framework:** Vitest v2.1.9 (in jsdom environment)
- **Assertion Library:** Vitest + `@testing-library/jest-dom`
- **Execution Command:** `npm test` (`vitest run`)
- **Total Test Files:** 5
- **Total Tests:** 30
- **Passed:** 30
- **Failed:** 0
- **Skipped:** 0
- **Total Execution Duration:** 4.83s

---

## 2. Test Suite Breakdown

### Suite 1: `tests/security/role_assignment.test.js`
Validates mitigations for **`SEC-001`** and **`SEC-004`**.

| Test Case | Description | Result |
| :--- | :--- | :--- |
| `blocks client-side attempt to request admin role upon registration` | Confirms that requesting `'admin'` role defaults to `'student'`. | **PASSED** |
| `blocks arbitrary role injections (superadmin, moderator, root)` | Confirms unknown and privileged role strings default to `'student'`. | **PASSED** |
| `permits legitimate student and teacher role assignment` | Confirms valid roles (`student`, `teacher`) pass through unaffected. | **PASSED** |
| `guarantees VITE_ADMIN_CODE is not exposed in public environment` | Confirms `import.meta.env.VITE_ADMIN_CODE` is completely undefined. | **PASSED** |
| `validates roll number generation pattern complies with YYYY-PRE-SEQ specification` | Confirms roll number formatting matches monotonic 12-char pattern. | **PASSED** |

---

### Suite 2: `tests/security/column_updates.test.js`
Validates mitigations for **`SEC-003`** (Trigger & RLS protections).

| Test Case | Description | Result |
| :--- | :--- | :--- |
| `rejects student attempting to elevate own role to admin` | Simulates `profiles` update with non-admin caller mutating `role`. | **PASSED** |
| `rejects student attempting to mutate their profile id` | Simulates `profiles` update with non-admin caller mutating `id`. | **PASSED** |
| `allows student to update non-sensitive personal profile fields` | Simulates legitimate user updating `full_name`. | **PASSED** |
| `allows administrator to legitimately reassign user roles` | Simulates admin caller updating `role`. | **PASSED** |
| `rejects teacher attempting to inflate their own salary` | Simulates `teacher_profiles` update mutating `salary_amount`. | **PASSED** |
| `rejects teacher attempting to enable elevated permissions` | Simulates `teacher_profiles` update mutating `can_manage_study_cards`. | **PASSED** |
| `allows administrator to configure teacher salary and permissions` | Simulates admin caller updating salary and permissions. | **PASSED** |
| `rejects student self-submitting approved or verified fee payments` | Validates RLS check blocking `status = 'approved'/'verified'`. | **PASSED** |
| `allows student submitting payment receipt in pending status` | Validates RLS check accepting `status = 'pending'`. | **PASSED** |
| `rejects student submitting payment receipt for another user` | Validates RLS check blocking mismatched `student_id`. | **PASSED** |
| `rejects student submitting homework with a self-awarded grade` | Validates RLS check blocking non-null `grade`. | **PASSED** |
| `rejects student submitting homework with self-assigned feedback` | Validates RLS check blocking non-null `feedback`. | **PASSED** |
| `allows legitimate student submission without grades or feedback` | Validates RLS check accepting submission with null grades/feedback. | **PASSED** |

---

### Suite 3: `tests/security/xss_sanitization.test.jsx`
Validates mitigations for **`SEC-002`** (Stored XSS).

| Test Case | Description | Result |
| :--- | :--- | :--- |
| `strips <script> tags from batch detailed info HTML` | Confirms `<script>` tags and inner JS execution are removed. | **PASSED** |
| `strips onerror and onload event handlers from images` | Confirms DOM event handlers on images are stripped. | **PASSED** |
| `strips javascript: pseudo-protocols from hyperlinks` | Confirms `javascript:` URI handlers in `<a>` tags are stripped. | **PASSED** |
| `strips malicious <iframe> and <object> embed vectors` | Confirms phishing iframes and Flash objects are removed. | **PASSED** |
| `preserves legitimate curriculum formatting and HTML elements` | Confirms `<h3>`, `<strong>`, `<ul>`, `<li>`, `<table>` are kept intact. | **PASSED** |

---

### Suite 4: `tests/security/lecture_authorization.test.jsx`
Validates mitigations for **`SEC-006` / `BUG-001`** (Direct lecture route authorization).

| Test Case | Description | Result |
| :--- | :--- | :--- |
| `denies unauthenticated access to private study cards and prompts for login` | Confirms private lectures display "Enrolled Student Access Required". | **PASSED** |
| `permits unauthenticated viewing of public preview lectures` | Confirms public lectures (`is_public = true`) remain viewable to guests. | **PASSED** |
| `prompts unauthenticated user to log in when lecture is not found or inaccessible` | Confirms non-existent/hidden cards prompt unauthenticated users to sign in. | **PASSED** |

---

### Suite 5: `tests/workflows/student_workflow.test.js`
Validates student onboarding, form validation, and trial calculation logic.

| Test Case | Description | Result |
| :--- | :--- | :--- |
| `validates password strength according to security standards` | Confirms 0-4 scoring on length, uppercase, numbers, and symbols. | **PASSED** |
| `rejects incomplete or invalid student registration inputs` | Confirms error collection on invalid email, missing name, short password. | **PASSED** |
| `approves complete and valid student registration inputs` | Confirms valid student registration form passes validation with 0 errors. | **PASSED** |
| `accurately computes 2-day free trial timestamp on enrollment` | Confirms ISO string generation for current time + 48 hours. | **PASSED** |

---

## 3. Raw Test Output Log

```
 RUN  v2.1.9 /home/thoughtful/Downloads/coaching-institute-last

 ✓ tests/security/role_assignment.test.js (5)
 ✓ tests/security/column_updates.test.js (13)
 ✓ tests/security/lecture_authorization.test.jsx (3)
 ✓ tests/security/xss_sanitization.test.jsx (5)
 ✓ tests/workflows/student_workflow.test.js (4)

 Test Files  5 passed (5)
      Tests  30 passed (30)
   Start at  21:17:57
   Duration  4.83s (transform 570ms, setup 730ms, collect 1.23s, tests 639ms, environment 7.26s, prepare 756ms)
```
