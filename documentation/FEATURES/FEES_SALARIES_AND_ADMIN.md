# Fees, Salaries & Administrative Governance Deep Dive

Audit Date: 2026-10-13  
Platform: Thoughtful's Academy  
Feature IDs: FEAT-015, FEAT-017, FEAT-018, FEAT-019, FEAT-020, FEAT-021, FEAT-022

---

## 1. Offline UPI Fee Reconciliation (FEAT-015)

- **Student Submission:** `src/pages/student/PayFee.jsx` (223 LOC)
- **Admin Reconciliation:** `src/pages/admin/FeeManager.jsx` (818 LOC)
- **Workflow & Audit:**
  1. Student selects academic month, enters fee amount, reviews institute's active UPI QR code, transfers via UPI app, and submits the 12-digit UTR reference ID.
  2. Row is created in `fee_records` with `status = 'pending'`.
  3. `FeeManager.jsx` categorizes payments across three views:
     * **Fee Defaulters:** Identifies enrolled students who have not submitted a payment for the active academic month.
     * **Pending Verifications:** Actionable queue of submitted receipts awaiting approval.
     * **All Records:** Searchable, exportable history of verified and rejected payments.
  4. Admin clicks "Verify" (sets `status = 'verified'`, `verified_by = admin.id`, `verified_at = NOW()`) or "Reject" (prompts for rejection reason and sets `status = 'rejected'`).

---

## 2. Faculty Salary & Payroll Management (FEAT-020)

- **Admin Payroll:** `src/pages/admin/SalaryManager.jsx` (492 LOC)
- **Teacher Status:** `src/pages/teacher/SalaryStatus.jsx` (282 LOC)
- **Workflow:**
  1. Admin navigates to `/admin/salary`, selects target month, and reviews teacher directory with their configured `salary_amount`.
  2. Admin transfers funds directly to the teacher's UPI ID or scans their personal QR code (`teacher_profiles.upi_qr_url`).
  3. Admin enters payment method (UPI, Bank Transfer, Cash, Cheque) and transaction reference ID, and clicks "Mark Paid".
  4. Inserts row into `salary_records` (`status = 'paid'`, `paid_by = admin.id`, `paid_at = NOW()`).
  5. Teacher views payment receipts and historical disbursements on `/teacher/salary`.

---

## 3. Administrative Governance & Control

### 3.1 Student Tracker (FEAT-017)
- Displays student roster with batch filters, individual attendance percentages, and monthly fee status pills.
- Allows admins to modify a student's assigned batch and subject enrollment on the fly.
- Displays free trial status badges and remaining hours.

### 3.2 Teacher Manager (FEAT-018)
- Allows admins to inspect all faculty profiles, view assigned batches, and toggle the 6 granular permission flags (`can_manage_study_cards`, `can_manage_homework`, etc.) with instant database updates.

### 3.3 Multi-Teacher Batches (FEAT-019)
- Allows assigning multiple faculty members to a single batch via `batches.teacher_ids UUID[]`.
- Facilitates team teaching (e.g. Physics Teacher, Chemistry Teacher, and Math Teacher sharing the same JEE batch).

### 3.4 Destructive Database Reset (FEAT-022)
- **Component:** `src/pages/admin/AdminSettings.jsx`
- **Controls:**
  * **Full System Reset:** Requires typing "RESET". Executes sequential cascading deletions across all 16 data tables while preserving the acting admin user.
  * **Defect Warning ([DATA-001](../DATABASE/DATA_INTEGRITY_AUDIT.md#DATA-001)):** Wipes `public.profiles` but leaves records in `auth.users`, creating orphaned auth users unable to re-register.
