# Database Relationships, Foreign Keys & Constraint Specifications

**Platform:** Thoughtful's Academy (Coaching Institute Management System)  
**Database Engine:** PostgreSQL 15.6  
**Scope:** Complete inventory of entity foreign keys, cascading deletion mechanics, unique constraints, and check constraints across all 18 tables.  

---

## 1. Foreign Key Relationship Matrix

| Child Table | Foreign Key Column | Target Parent Table | Parent Key | On Delete Action | Integrity Role |
|---|---|---|---|:---:|---|
| `profiles` | `id` | `auth.users` | `id` | **CASCADE** | Deletes profile if auth user is purged |
| `student_profiles` | `id` | `profiles` | `id` | **CASCADE** | 1:1 extension of student profile |
| `student_profiles` | `batch_id` | `batches` | `id` | **SET NULL** | Preserves student if batch is deleted |
| `teacher_profiles` | `id` | `profiles` | `id` | **CASCADE** | 1:1 extension of faculty profile |
| `batches` | `teacher_id` | `profiles` | `id` | **SET NULL** | Preserves batch if lead teacher removed |
| `study_cards` | `batch_id` | `batches` | `id` | **CASCADE** | Cleans cards when batch is purged |
| `student_bookmarks` | `student_id` | `profiles` | `id` | **CASCADE** | Removes bookmark on student deletion |
| `student_bookmarks` | `card_id` | `study_cards` | `id` | **CASCADE** | Removes bookmark on card deletion |
| `attendance` | `student_id` | `profiles` | `id` | **CASCADE** | Cleans logs on student removal |
| `attendance` | `batch_id` | `batches` | `id` | **CASCADE** | Cleans batch logs |
| `attendance` | `marked_by` | `profiles` | `id` | **SET NULL** | Retains attendance log if marker leaves |
| `fee_records` | `student_id` | `profiles` | `id` | **CASCADE** | Purges records if student deleted |
| `fee_records` | `batch_id` | `batches` | `id` | **CASCADE** | Purges records if batch deleted |
| `fee_records` | `verified_by`| `profiles` | `id` | **SET NULL** | Retains audit record if admin removed |
| `salary_records` | `teacher_id` | `profiles` | `id` | **CASCADE** | Purges payroll on teacher removal |
| `live_classes` | `batch_id` | `batches` | `id` | **CASCADE** | Deletes stream if batch removed |
| `live_classes` | `teacher_id` | `profiles` | `id` | **CASCADE** | Deletes stream if teacher removed |
| `notifications` | `target_batch_id`| `batches` | `id` | **CASCADE** | Purges batch notification on batch drop |
| `notifications` | `created_by` | `profiles` | `id` | **SET NULL** | Retains notice if creator is deleted |
| `notification_reads`| `notification_id`| `notifications`| `id` | **CASCADE** | Cleans receipts if notification deleted |
| `notification_reads`| `user_id` | `profiles` | `id` | **CASCADE** | Cleans receipts on user deletion |
| `messages` | `sender_id` | `profiles` | `id` | **CASCADE** | Purges chats on sender deletion |
| `messages` | `receiver_id`| `profiles` | `id` | **CASCADE** | Purges chats on receiver deletion |
| `homework` | `batch_id` | `batches` | `id` | **CASCADE** | Purges homework when batch dropped |
| `homework` | `teacher_id` | `profiles` | `id` | **SET NULL** | Retains homework if creator teacher left |
| `homework_submissions`| `homework_id`| `homework` | `id` | **CASCADE** | Purges submission on assignment delete |
| `homework_submissions`| `student_id` | `profiles` | `id` | **CASCADE** | Purges submission on student delete |
| `push_subscriptions`| `user_id` | `profiles` | `id` | **CASCADE** | Deletes push tokens on user deletion |
| `activity_logs` | `batch_id` | `batches` | `id` | **CASCADE** | Deletes batch logs on batch delete |
| `activity_logs` | `user_id` | `profiles` | `id` | **SET NULL** | Retains audit trace if actor deleted |

---

## 2. Check Constraints & Domain Invariants

```sql
-- profiles
ALTER TABLE profiles ADD CONSTRAINT chk_profiles_role
  CHECK (role IN ('student', 'teacher', 'admin'));

-- attendance
ALTER TABLE attendance ADD CONSTRAINT chk_attendance_status
  CHECK (status IN ('present', 'absent', 'late'));

-- fee_records
ALTER TABLE fee_records ADD CONSTRAINT chk_fee_mode
  CHECK (payment_mode IN ('UPI', 'Cash'));
ALTER TABLE fee_records ADD CONSTRAINT chk_fee_status
  CHECK (status IN ('pending', 'approved', 'rejected'));

-- salary_records
ALTER TABLE salary_records ADD CONSTRAINT chk_salary_status
  CHECK (status IN ('pending', 'paid'));

-- live_classes
ALTER TABLE live_classes ADD CONSTRAINT chk_live_status
  CHECK (status IN ('scheduled', 'live', 'ended'));

-- notifications
ALTER TABLE notifications ADD CONSTRAINT chk_notif_type
  CHECK (type IN ('general', 'fee', 'live_class', 'announcement', 'homework'));
ALTER TABLE notifications ADD CONSTRAINT chk_notif_target
  CHECK (target_role IN ('all', 'student', 'teacher'));
```

---

## 3. Unique Constraints & Composite Keys

| Table | Constrained Columns | Constraint Purpose |
|---|---|---|
| `public.push_subscriptions` | `(endpoint)` | Prevents duplicate push registrations for identical browser endpoints |
| `public.attendance` | `(student_id, date)` | Enforces single attendance record per student per calendar date |
| `public.student_bookmarks` | `(student_id, card_id)` | Prevents duplicate bookmarks on the same study card |
| `public.notification_reads`| `(notification_id, user_id)`| Enforces idempotency for notification read receipts |
