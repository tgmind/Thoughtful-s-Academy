# Database Integrity, Constraints & Orphan Records Audit

**Platform:** Graviton Academy (Coaching Institute Management System)  
**Database Engine:** PostgreSQL 15.6  
**Auditor:** Database Architect & Systems Forensics Specialist  
**Integrity Score:** 84 / 100 (Solid Relational Skeleton with Specific Structural Risks)  

---

## 1. Master Data Integrity Findings

| Finding ID | Severity | Category | Root Cause | Impact |
|---|:---:|---|---|---|
| `DATA-001` | **P1 High** | User Orphanage | `DELETE profiles` bypasses `auth.users` | Deleted students remain registered in auth schema; email blocked from re-registration |
| `DATA-002` | **P1 High** | Uniqueness / Race | `COUNT(*) + 1` in `handle_new_user()` | Concurrent signups for same batch compute identical roll numbers, crashing transactions |
| `DATA-003` | **P2 Medium** | Data Duplication | Dual columns `teacher_id` vs `teacher_ids` in `batches` | Assigning co-teachers in array can desynchronize lead teacher column |
| `DATA-004` | **P2 Medium** | Multi-Batch Drift | Dual columns `batch_id` vs `batch_ids` in `study_cards` | Legacy single batch ID can contradict multi-batch array values |
| `DATA-005` | **P2 Medium** | Missing FK Constraint | `chapter_id` in `study_cards` lacks foreign key constraint | Deleting a chapter leaves orphaned UUIDs in cards table |

---

## 2. In-Depth Technical Analysis

### 2.1 `DATA-001`: Auth Schema User Orphanage
- **Mechanism:** In `AdminSettings.jsx`, student removal executes:
  ```javascript
  await supabase.from('profiles').delete().eq('id', studentId)
  ```
- **Analysis:** Foreign keys in PostgreSQL cascade downwards (`profiles` -> `student_profiles`, `attendance`, `fee_records`). However, the foreign key points from `profiles.id` to `auth.users.id`. Deleting a row in `profiles` does NOT delete the parent in `auth.users`.
- **Consequence:** The user is orphaned in `auth.users`. If the student attempts to sign up again with their original email address, GoTrue rejects the signup with `422: User already registered`.
- **Fix:** Deletions must execute through a secure Edge Function using `supabase.auth.admin.deleteUser(id)`.

### 2.2 `DATA-002`: Concurrent Roll Number Collisions
- **Trigger:** `supabase/migrations/014_handle_new_user.sql`:
  ```sql
  SELECT COUNT(*) + 1 INTO v_seq
  FROM public.student_profiles WHERE batch_id = v_batch_id;
  ```
- **Risk:** Read-uncommitted / Read-committed isolation allows two concurrent signup transactions to calculate the exact same sequence number `v_seq = 15`. Both produce roll number `2026-JEE-015`.
- **Fix:** Implement a database sequence per batch, or wrap roll number assignment in `SELECT ... FOR UPDATE` row locks.

### 2.3 `DATA-003` & `DATA-004`: Column Synchronization Redundancies
- When migrating to multi-teacher batches (`023_multi_teacher_batches.sql`) and multi-batch study cards (`008_study_cards_multi_batch.sql`), array columns (`teacher_ids`, `batch_ids`) were introduced without dropping or auto-syncing the scalar columns (`teacher_id`, `batch_id`).
- **Remediation:** Introduce a database trigger that automatically syncs scalar and array representations, or deprecate the scalar columns entirely.
