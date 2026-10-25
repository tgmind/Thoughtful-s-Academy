# Form and Validation Comprehensive Inventory

**Platform:** Graviton Academy (Coaching Institute Management System)  
**Scope:** Complete inventory of all input forms, client and server-side validation rules, error handling behavior, and sanitization mechanisms across all 3 portals.  
**Total Forms Documented:** 15 distinct forms  

---

## 1. Master Form Catalog

| Form ID | Component Location | Target User | Target Entity / Table | Submission Type | Primary Validation Mechanism |
|---|---|:---:|---|---|---|
| `FORM-001` | `src/pages/Register.jsx` | Student / Staff | `auth.users` & `public.profiles` | Direct Auth SDK | Local React State `onSubmit` |
| `FORM-002` | `src/pages/Login.jsx` | All Users | `auth.users` | Direct Auth SDK | Basic non-empty validation |
| `FORM-003` | `src/pages/ResetPassword.jsx` | All Users | `auth.users` | Direct Auth SDK | Length & Equality checks |
| `FORM-004` | `src/pages/student/PayFee.jsx` | Student | `public.fee_records` | PostgREST INSERT | Regex (12-digit numeric UTR) |
| `FORM-005` | `src/pages/student/Attendance.jsx` | Student | `public.leave_requests` | PostgREST INSERT | Date boundary comparisons |
| `FORM-006` | `src/components/shared/ProtectedVideoPlayer.jsx` | Student | `public.study_doubts` | PostgREST INSERT | Trimmed string length |
| `FORM-007` | `src/pages/teacher/StudySection.jsx` | Faculty | `public.study_cards` | PostgREST INSERT/UPDATE | Regex YouTube parsing |
| `FORM-008` | `src/pages/teacher/StudySection.jsx` | Faculty | `public.chapters` | PostgREST INSERT/UPDATE | Non-empty string |
| `FORM-009` | `src/pages/teacher/Homework.jsx` | Faculty | `public.homework` | PostgREST INSERT/UPDATE | Due date & non-empty text |
| `FORM-010` | `src/pages/teacher/LiveClass.jsx` | Faculty | `public.live_classes` | PostgREST INSERT/UPDATE | Stream URL parsing |
| `FORM-011` | `src/pages/admin/FeeManager.jsx` | Admin | `public.fee_records` | PostgREST UPDATE | Conditional requirement on reject |
| `FORM-012` | `src/pages/admin/SalaryManager.jsx` | Admin | `public.salary_records` | PostgREST INSERT/UPDATE | Numeric positive boundary |
| `FORM-013` | `src/pages/admin/Announcements.jsx` | Admin / Faculty | `public.announcements` | PostgREST + Edge Func | Non-empty title & payload |
| `FORM-014` | `src/pages/admin/BatchManager.jsx` | Admin | `public.batches` | PostgREST INSERT/UPDATE | Capacity & Fee numeric bounds |
| `FORM-015` | `src/pages/admin/TeacherManager.jsx` | Admin | `auth.users` & `profiles` | Edge Function / Admin | Email format & positive salary |

---

## 2. Granular Form Field Specifications & Validation Rules

### 2.1 `FORM-001`: User Registration (`Register.jsx`)
- **Fields:**
  - `full_name`: Text, mandatory, minimum 3 characters.
  - `email`: Email string, regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`.
  - `phone`: String, 10 digits numeric, regex: `/^[6-9]\d{9}$/`.
  - `password`: String, minimum 6 characters.
  - `confirm_password`: Must exactly match `password`.
  - `batch_id`: UUID, selected from active batches dropdown.
  - `roll_number`: Auto-generated or manual text.
  - `admin_code`: String, tested against `VITE_ADMIN_CODE` for role elevation bypass.
- **Timing:** Evaluated on form submit button click. Error banner displays first detected violation.
- **Defect Note:** Client-side evaluation only; duplicate roll numbers trigger database constraint error toast rather than a friendly validation hint.

### 2.2 `FORM-004`: Student Fee Payment Submission (`PayFee.jsx`)
- **Fields:**
  - `batch_id`: Selected batch ID.
  - `month`: Target month string (e.g., `"October 2026"`).
  - `amount`: Read-only numeric value populated from `batches.monthly_fee`.
  - `payment_mode`: Enum: `"UPI"` (default) or `"Cash"`.
  - `utr_number`: String. When mode is `"UPI"`, validated against `/^\d{12}$/` (must be exactly 12 numeric digits).
  - `payment_date`: Date picker, defaults to current date; future dates blocked client-side.
- **Sanitization:** Strips whitespace and hyphens before executing regex match.

### 2.3 `FORM-007`: Study Card Creator & Video Sync (`TeacherStudySection.jsx`)
- **Fields:**
  - `title`: String, mandatory, trimmed length >= 3.
  - `chapter_id`: UUID, selected from active subject chapters.
  - `youtube_url`: String, validated via `extractYouTubeId()` utility function (`src/utils/youtube.js`). Supports standard URLs (`youtube.com/watch?v=...`), short URLs (`youtu.be/...`), and direct 11-character video IDs.
  - `duration`: Number in seconds, parsed from minutes/seconds inputs.
  - `description`: Text area, supports markdown.
  - `notes_url`: Google Drive or web PDF URL, validated for basic URL structure.
  - `is_published`: Boolean toggle.
- **Sanitization Gap:** Description renders via custom markdown parser without server-side validation.

### 2.4 `FORM-011`: Admin Fee Reconciliation Modal (`FeeManager.jsx`)
- **Fields:**
  - `action`: Enum (`"approved"` | `"rejected"`).
  - `rejection_reason`: Mandatory when action is `"rejected"`; submission disabled if input is empty or whitespace only.
  - `admin_notes`: Optional string.

---

## 3. Validation Architecture Assessment & Recommendations

### 3.1 Current Validation Architecture
- Forms rely heavily on raw React state variables (`useState` per input field) and manual `if (!value) setError(...)` conditional branches inside submit handler functions.
- **Limitations:**
  - No unified form schema validation library (e.g., Zod, Yup).
  - Error messages are inconsistent: some forms render inline red error paragraphs below inputs, while others fire floating toasts (`react-hot-toast` or custom toasts).
  - Form state resets on inadvertent modal closure, leading to user data loss.

### 3.2 Target Architecture Recommendation
- Adopt **React Hook Form** paired with **Zod** schemas across all forms.
- Extract common input components into reusable form controls (`FormInput`, `FormSelect`, `FormTextarea`) that automatically wire ARIA error descriptions (`aria-invalid="true"`, `aria-describedby="field-error"`).
