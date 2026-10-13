# Database Architecture & Relational Overview

**Platform:** Thoughtful's Academy (Coaching Institute Management System)  
**Database Engine:** PostgreSQL 15.6 (Managed via Supabase Cloud)  
**Primary Region:** AWS Mumbai (`ap-south-1`)  
**Access Layer:** PostgREST 12+ RESTful Data Gateway & Elixir Realtime Engine  
**Security Model:** 100% Table Row Level Security (RLS) Enforcement  
**Schema Count:** 18 Core Relational Tables  
**Total Migrations:** 24 Version-Controlled SQL Migrations (`001` - `024`)  

---

## 1. Architectural Philosophy & Design Principles

The database layer serves as the single source of truth and the ultimate security boundary for Thoughtful's Academy. Rather than routing queries through an intermediate application server running an ORM (like Prisma or TypeORM), client web applications communicate directly with PostgreSQL tables via PostgREST.

Key architectural characteristics include:
1. **Strict Relational Normalization:** User identities reside in `profiles` (keyed to `auth.users(id)`), while role-specific metadata is cleanly partitioned into `student_profiles` and `teacher_profiles` via 1-to-1 foreign keys.
2. **Defensive RLS Authorization:** Data isolation is enforced at the PostgreSQL kernel level. Unauthenticated queries or unauthorized role tokens return 0 rows or trigger policy rejection errors (`42501`).
3. **Database-Level Side Effects:** Critical domain logic (automated student roll number computation and user profile initialization) executes within transactional database triggers (`handle_new_user()`).
4. **Realtime CDC (Change Data Capture):** Tables supporting live collaboration (`live_classes`, `notifications`, `messages`) are published to the `supabase_realtime` replication slot for WebSocket streaming.

---

## 2. Table Summary & Taxonomy

| # | Table Name | Primary Purpose | Record Scale | Primary Key | Key Foreign Keys |
|---|---|---|---|---|---|
| 1 | `profiles` | Universal identity, names, emails, roles | 1:1 `auth.users` | `id` (UUID) | `auth.users(id)` |
| 2 | `student_profiles` | Roll numbers, parents, batches, trial status | 1:1 per Student | `id` (UUID) | `profiles(id)`, `batches(id)` |
| 3 | `teacher_profiles` | Qualifications, salaries, granular permissions | 1:1 per Teacher | `id` (UUID) | `profiles(id)` |
| 4 | `batches` | Academic cohorts, schedules, fee amounts | Low (<100) | `id` (UUID) | `profiles(id)` |
| 5 | `attendance` | Daily student attendance logs | High (Daily x N) | `id` (UUID) | `profiles(id)`, `batches(id)` |
| 6 | `study_cards` | Video lectures, YouTube URLs, notes links | Medium (100s-1000s) | `id` (UUID) | `batches(id)` |
| 7 | `student_bookmarks` | Saved study cards per student | Medium | `id` (UUID) | `profiles(id)`, `study_cards(id)` |
| 8 | `messages` | Direct 1-on-1 student-faculty chat logs | High (Messaging) | `id` (UUID) | `profiles(id)` (sender/receiver) |
| 9 | `fee_records` | Offline UPI payments, UTRs, receipts | Medium (Monthly x N)| `id` (UUID) | `profiles(id)`, `batches(id)` |
| 10 | `qr_settings` | Institute UPI QR image and VPA ID | Singleton (1 row) | `id` (UUID) | None |
| 11 | `live_classes` | Active live broadcast links & timestamps | Ephemeral | `id` (UUID) | `batches(id)`, `profiles(id)` |
| 12 | `notifications` | Broadcast notices & personal alerts | Medium | `id` (UUID) | `batches(id)`, `profiles(id)` |
| 13 | `notification_reads` | Read receipts tracking per notification | High (N x Students) | `id` (UUID) | `profiles(id)`, `notifications(id)` |
| 14 | `homework` | Assignments, instructions, deadlines | Medium | `id` (UUID) | `batches(id)`, `profiles(id)` |
| 15 | `homework_submissions`| Student homework files, grades, feedback | High | `id` (UUID) | `homework(id)`, `profiles(id)` |
| 16 | `salary_records` | Monthly faculty payroll disbursements | Medium | `id` (UUID) | `profiles(id)` (teacher) |
| 17 | `push_subscriptions` | Browser VAPID endpoints & encryption keys | Medium | `id` (UUID) | `profiles(id)` |
| 18 | `activity_logs` | Audit trail of administrative/faculty actions | High (Audit log) | `id` (UUID) | `batches(id)`, `profiles(id)` |

---

## 3. Storage Engine & Database Extensions

The database utilizes standard PostgreSQL storage engines with two active extensions:
- **`uuid-ossp`:** Provides `uuid_generate_v4()` for cryptographically random primary keys.
- **`pgcrypto`:** Used for encryption and `gen_random_uuid()` fallback generation.
- **`TIMESTAMPTZ` Standard:** All temporal columns (`created_at`, `updated_at`, `marked_at`) strictly enforce UTC timestamps with timezone awareness.
