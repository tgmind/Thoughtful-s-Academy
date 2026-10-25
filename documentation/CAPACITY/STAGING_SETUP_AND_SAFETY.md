# Staging Validation Setup, Safety Protocols & Isolation Runbook

**Platform:** Graviton Academy / Coaching Institute  
**Phase:** Phase 4 — Staging Validation, Realtime Correctness, and Measured Capacity  
**Date:** 2026-10-13  
**Status:** Authoritative Safety Protocol & Environment Configuration  

---

## 1. Operating Rules & Production Safety Boundaries

To ensure zero risk to live student records, payment ledgers, or production cloud infrastructure, all verification, migration testing, and load simulations strictly enforce the following safety mandates:

| Safety Rule | Mandate & Boundary | Enforcement Mechanism |
|---|---|---|
| **SR-01: No Production Mutations** | Never execute destructive queries, drops, or truncates against production. | Explicit check of `VITE_SUPABASE_URL` and database host targets. |
| **SR-02: No Remote DB Reset** | Never run `supabase db reset --linked` or remote reset. | CLI guardrails and prohibition of remote reset commands. |
| **SR-03: No Unapproved Production Migrations** | Never run `supabase db push` against production. Migration 027 is staged only. | Migration runner restricted to isolated test environments. |
| **SR-04: Zero Production Data in Load Tests** | Never use real student identities, live UPI UTRs, or real credentials in load tests. | 100% synthetic deterministic identities (`usr-student-A`, `usr-teacher-01`, etc.). |
| **SR-05: Secret Protection** | Never expose service-role keys, database passwords, or JWT secrets in logs, tests, or documentation. | Sanitized logs, environment variable masking, zero secrets committed to Git. |
| **SR-06: Process Preservation** | Preserve pre-existing development and background services. | Pre-existing PID 5289 on port 5173 verified untouched and healthy. |
| **SR-07: Security Boundary Integrity** | Never weaken RLS policies, authentication gates, or role checks to improve a benchmark. | All authorization checks and RLS policies remain in full effect. |
| **SR-08: Evidence Grounding** | Distinguish unit tests, synthetic simulations, and live tests. Never invent results. | Explicitly report test types: Unit, Mocked Component, Staged Simulation, and Blocked Live. |

---

## 2. Infrastructure Inventory & Staging Availability

### 2.1 Host Environment Assessment
- **Operating System:** Linux (`thoughtfulpc`)
- **Node.js Runtime:** v26.5.0
- **Python Runtime:** Python 3.12.3
- **PostgreSQL Client:** `/usr/bin/psql` installed
- **PostgreSQL Server Cluster:** `pg_lsclusters` reported 0 active clusters configured on localhost.
- **Docker Container Engine:** Not installed on host (`docker: command not found`).
- **Dev Server Process:** Active on `http://localhost:5173` (PID 5289, verified returning `HTTP/1.1 200 OK`).

### 2.2 Staging Supabase Credentials Status
- The local environment file `.env.local` provides client-side `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- No separate dedicated staging database connection string (`postgres://...`) or service-role secret is configured in `.env.local`.
- **Classification:** Staged testing and index validation were executed offline using Vitest simulation runners, SQL AST and schema parsers, and synthetic event harnesses, while live direct PostgreSQL push is documented as a controlled post-staging gate.

---

## 3. Synthetic Test Data Architecture

All staged tests utilize isolated, synthetic datasets generated on-the-fly:

### 3.1 Synthetic Identities
```javascript
const SYNTHETIC_IDENTITIES = {
  ADMIN: {
    id: 'usr-synth-admin-01',
    role: 'admin',
    full_name: 'Synthetic Institute Director',
  },
  TEACHER: {
    id: 'usr-synth-teacher-01',
    role: 'teacher',
    full_name: 'Synthetic Physics Instructor',
    batch_ids: ['batch-synth-101', 'batch-synth-102'],
  },
  STUDENT_A: {
    id: 'usr-synth-student-A',
    role: 'student',
    batch_id: 'batch-synth-101',
    full_name: 'Synthetic Student Alpha',
  },
  STUDENT_B: {
    id: 'usr-synth-student-B',
    role: 'student',
    batch_id: 'batch-synth-102',
    full_name: 'Synthetic Student Beta',
  },
}
```

### 3.2 Synthetic Seed Tables
- **Batches:** `batch-synth-101` (Physics Morning), `batch-synth-102` (Chemistry Evening)
- **Notifications:** Role-scoped and batch-scoped broadcast announcements
- **Messages:** Direct student $\leftrightarrow$ teacher messages
- **Homework & Submissions:** Mock assignments and PDF link submissions
- **Live Classes:** Active and inactive classroom session states
- **Attendance Records:** Idempotent single-check-in per student per date
- **Fee Records:** Pending and verified payment records

---

## 4. Test Data Cleanup & Idempotency Runbook

If synthetic records are inserted into a shared staging database during manual QA, execute the following SQL cleanup script in the Supabase SQL Editor:

```sql
-- ── STAGING TEST DATA CLEANUP SCRIPT ─────────────────────────────────────────
-- Clean up all records prefixed with 'usr-synth-' or 'batch-synth-'
DELETE FROM public.notification_reads WHERE user_id IN (SELECT id FROM public.profiles WHERE id::text LIKE 'usr-synth%');
DELETE FROM public.homework_submissions WHERE student_id IN (SELECT id FROM public.profiles WHERE id::text LIKE 'usr-synth%');
DELETE FROM public.attendance WHERE student_id IN (SELECT id FROM public.profiles WHERE id::text LIKE 'usr-synth%');
DELETE FROM public.fee_records WHERE student_id IN (SELECT id FROM public.profiles WHERE id::text LIKE 'usr-synth%');
DELETE FROM public.messages WHERE sender_id::text LIKE 'usr-synth%' OR receiver_id::text LIKE 'usr-synth%';
DELETE FROM public.live_classes WHERE batch_id::text LIKE 'batch-synth%';
DELETE FROM public.homework WHERE batch_id::text LIKE 'batch-synth%';
DELETE FROM public.study_cards WHERE 'batch-synth-101'::uuid = ANY(batch_ids) OR 'batch-synth-102'::uuid = ANY(batch_ids);
DELETE FROM public.student_profiles WHERE id::text LIKE 'usr-synth%';
DELETE FROM public.teacher_profiles WHERE id::text LIKE 'usr-synth%';
DELETE FROM public.profiles WHERE id::text LIKE 'usr-synth%';
DELETE FROM public.batches WHERE id::text LIKE 'batch-synth%';
```
