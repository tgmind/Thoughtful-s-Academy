# User Roles, Permissions & Access Matrix

Audit Date: 2026-10-13  
Platform: Graviton Academy

---

## 1. System Roles Definition

The platform defines three primary authenticated roles, constrained by PostgreSQL constraint `CHECK (role IN ('student', 'teacher', 'admin'))`:

1. **Student (`student`):** Enrolled learner assigned to a specific batch. Access is restricted to personal attendance, enrolled batch study materials, personal homework submissions, fee payment forms, and direct messaging with teachers.
2. **Teacher / Faculty (`teacher`):** Instructor assigned to one or more batches. In addition to basic messaging, teachers can manage curriculum cards, launch live classes, and assign homework either globally (if granted permissions) or strictly within their assigned batches.
3. **Administrator (`admin`):** Superuser with unrestricted access across all batches, financial records, student records, faculty configurations, announcements, analytics, and destructive reset controls.
4. **Public Visitor / Guest (Unauthenticated):** Anonymous visitor browsing public batch details, viewing featured cards, and registering for an account.

---

## 2. Granular Teacher Permission Flags

In `teacher_profiles`, six granular boolean columns control teacher authority:

| Permission Column | Default Value | Controlled By | Description & Capabilities |
|---|---|---|---|
| `can_manage_study_cards` | `false` | Admin in Teacher Manager | Allows publishing, updating, and deleting study cards across all batches. |
| `can_manage_homework` | `false` | Admin in Teacher Manager | Allows creating homework assignments and grading submissions. |
| `can_drop_live_class` | `false` | Admin in Teacher Manager | Allows scheduling and starting live online class sessions. |
| `can_message_students` | `true` | Admin in Teacher Manager | Allows 1-on-1 direct messaging with enrolled students. |
| `can_view_attendance` | `false` | Admin in Teacher Manager | Allows viewing batch attendance registers. |
| `can_view_fee_records` | `false` | Admin in Teacher Manager | Grants access to `/teacher/fee-records` to inspect fee payment status of batch students. |

*Dynamic Fallback (Migration 022/023):* If a global permission flag is `false`, the helper function `teacher_can()` automatically evaluates whether the teacher is explicitly assigned to the target batch (`batches.teacher_id = auth.uid() OR auth.uid() = ANY(batches.teacher_ids)`).

---

## 3. End-to-End Role Permission Matrix

| Module / Operation | Guest | Student | Teacher (Assigned) | Teacher (Unassigned) | Admin |
|---|:---:|:---:|:---:|:---:|:---:|
| View Public Homepage & Batches | ✅ | ✅ | ✅ | ✅ | ✅ |
| Preview Public Video Lectures | ✅ | ✅ | ✅ | ✅ | ✅ |
| Stream Batch-Restricted Lectures | ❌ | ✅ (Own Batch) | ✅ (Assigned) | ❌ (Unless Permitted) | ✅ (All) |
| Submit In-Video Doubts | ❌ | ✅ | ❌ | ❌ | ❌ |
| Mark Daily Self-Attendance | ❌ | ✅ (Own) | ❌ | ❌ | ❌ |
| View Personal Heatmap & Streak | ❌ | ✅ (Own) | ❌ | ❌ | ❌ |
| Submit Homework via Google Drive | ❌ | ✅ (Own Batch) | ❌ | ❌ | ❌ |
| Grade Student Homework | ❌ | ❌ | ✅ | ❌ | ✅ |
| Launch Live Online Class | ❌ | ❌ | ✅ | ❌ | ✅ |
| Join Active Live Class | ❌ | ✅ (Own Batch) | ✅ | ✅ | ✅ |
| Direct Message Faculty | ❌ | ✅ | ✅ | ✅ | ✅ |
| Submit UPI Fee Receipt (UTR) | ❌ | ✅ | ❌ | ❌ | ❌ |
| Verify / Reject Student Fees | ❌ | ❌ | ❌ | ❌ | ✅ |
| Inspect Batch Student Fee Status | ❌ | ❌ | ✅ (If Permitted) | ❌ | ✅ |
| View Personal Salary Disbursement | ❌ | ❌ | ✅ (Own) | ✅ (Own) | ✅ (All) |
| Disburse Salary & Upload Admin QR | ❌ | ❌ | ❌ | ❌ | ✅ |
| Create / Edit Batches & Posters | ❌ | ❌ | ❌ | ❌ | ✅ |
| Grant / Revoke Faculty Permissions | ❌ | ❌ | ❌ | ❌ | ✅ |
| Publish Institute Announcements | ❌ | ❌ | ❌ | ❌ | ✅ |
| View Institute Analytics Charts | ❌ | ❌ | ❌ | ❌ | ✅ |
| Execute Database Full Reset | ❌ | ❌ | ❌ | ❌ | ✅ |
