# Row Level Security (RLS) & Authorization Matrix Audit

**Platform:** Thoughtful's Academy (Coaching Institute Management System)  
**Database Engine:** PostgreSQL 15.6  
**Auditor:** Cybersecurity & Database Authorization Specialist  
**Authorization Scope:** Complete audit of all Row Level Security policies across 18 public database tables.  

---

## 1. Master Authorization & RLS Evaluation Matrix

| Table Name | RLS Enabled | SELECT Policy Scope | INSERT Policy Scope | UPDATE Policy Scope | DELETE Policy Scope | Security Rating |
|---|:---:|---|---|---|---|:---:|
| `profiles` | **YES** | Self, Teacher, Admin | Self (`auth.uid() = id`) | Self or Admin (**Unconstrained columns**) | Admin only | **CRITICAL FLAW** (`SEC-003`) |
| `student_profiles` | **YES** | Self, Teacher, Admin | Self (`auth.uid() = id`) | Self or Admin | Admin only | **ACCEPTABLE** |
| `teacher_profiles` | **YES** | Public (Staff list) | Self (`auth.uid() = id`) | Self or Admin (**Salary unconstrained**) | Admin only | **CRITICAL FLAW** (`SEC-003`) |
| `batches` | **YES** | Public (`true`) | Admin only | Admin only | Admin only | **SECURE** |
| `study_cards` | **YES** | Batch-Enrolled Students | Admin or Assigned Faculty | Admin or Assigned Faculty | Admin or Assigned Faculty | **SECURE** |
| `student_bookmarks`| **YES** | Self (`student_id = uid`)| Self (`student_id = uid`)| N/A | Self (`student_id = uid`) | **SECURE** |
| `attendance` | **YES** | Self, Faculty, Admin | Admin or Authorized Faculty | Admin or Authorized Faculty | Admin only | **SECURE** |
| `fee_records` | **YES** | Self, Authorized Faculty, Admin | Self or Admin | Admin only (`status` verification) | Admin only | **SECURE** |
| `salary_records` | **YES** | Self (Teacher), Admin | Admin only | Admin only | Admin only | **SECURE** |
| `live_classes` | **YES** | Batch Students & Staff | Admin or Authorized Faculty | Admin or Authorized Faculty | Admin or Authorized Faculty | **SECURE** |
| `notifications` | **YES** | Targeted Role & Batch | Admin or Faculty | Admin or Author | Admin only | **SECURE** |
| `notification_reads`| **YES**| Self (`user_id = uid`) | Self (`user_id = uid`) | N/A | Self | **SECURE** |
| `messages` | **YES** | Participant (Sender/Receiver)| Sender (`sender_id = uid`) | Receiver (`is_read` update) | Admin only | **SECURE** |
| `homework` | **YES** | Batch Students & Staff | Admin or Authorized Faculty | Admin or Assigned Faculty | Admin or Assigned Faculty | **SECURE** |
| `homework_submissions`| **YES**| Student Author & Faculty| Student Author | Assigned Faculty (Grading) | Admin only | **SECURE** |
| `push_subscriptions`| **YES** | Self (`user_id = uid`) | Self (`user_id = uid`) | Self | Self | **SECURE** |
| `activity_logs` | **YES** | Admin or Batch Faculty | Admin or Faculty | Blocked | Admin only | **SECURE** |
| `qr_settings` | **YES** | Public Authenticated | Admin only | Admin only | Admin only | **SECURE** |

---

## 2. In-Depth Vulnerability Analysis: Unconstrained Column Updates (`SEC-003`)

### 2.1 The Policy Flaw in `profiles`
In `supabase/migrations/002_rls_policies.sql`:
```sql
CREATE POLICY "profiles: own update"
  ON profiles FOR UPDATE
  USING (auth.uid() = id OR is_admin());
```
- **PostgreSQL Semantic Reality:** A `FOR UPDATE USING` clause only evaluates whether the row qualifies for modification. If there is no `WITH CHECK` clause restricting columns, or no `BEFORE UPDATE` trigger preventing sensitive column alterations, the updater can write to ANY column on that row.
- **Exploitation:** Any authenticated student can issue:
  ```json
  PATCH /rest/v1/profiles?id=eq.<student-uuid>
  { "role": "admin" }
  ```
  The database updates `profiles.role` to `'admin'`. Upon the student's next request, `is_admin()` returns `true`, and the student acquires full superuser control.

### 2.2 The Policy Flaw in `teacher_profiles`
In `002_rls_policies.sql` and `021_fix_teacher_study_cards_permissions.sql`:
```sql
CREATE POLICY "teacher_profiles: own update"
  ON teacher_profiles FOR UPDATE
  USING (auth.uid() = id OR is_admin());
```
- **Exploitation:** An authenticated instructor can send:
  ```json
  PATCH /rest/v1/teacher_profiles?id=eq.<teacher-uuid>
  {
    "salary_amount": 250000.00,
    "can_manage_study_cards": true,
    "can_view_fee_records": true
  }
  ```
  This allows teachers to unilaterally escalate their salary records and grant themselves unauthorized platform permissions.

---

## 3. Immediate RLS Hardening Remediation

Execute the following DDL to deploy defensive column protection triggers:

```sql
-- Hardening Trigger for profiles
CREATE OR REPLACE FUNCTION protect_profile_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role <> OLD.role AND NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized role modification attempt.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_protect_profile_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_profile_columns();

-- Hardening Trigger for teacher_profiles
CREATE OR REPLACE FUNCTION protect_teacher_profile_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.salary_amount <> OLD.salary_amount OR
      NEW.can_manage_study_cards <> OLD.can_manage_study_cards OR
      NEW.can_view_fee_records <> OLD.can_view_fee_records) AND NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized teacher permission or salary modification attempt.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_protect_teacher_profile_columns
  BEFORE UPDATE ON public.teacher_profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_teacher_profile_columns();
```
