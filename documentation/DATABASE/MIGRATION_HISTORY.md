# Database Migration History & Schema Evolution Audit

**Platform:** Thoughtful's Academy (Coaching Institute Management System)  
**Database Engine:** PostgreSQL 15.6  
**Migration Directory:** `supabase/migrations/`  
**Total Migrations:** 28 SQL Migration Files (`001` through `028`)  

---

## 1. Master Migration Chronicle

| # | Migration Filename | Primary Scope & Intent | Key DDL Operations | Idempotent |
|---|---|---|---|:---:|
| `001` | `001_initial_schema.sql` | Baseline table creation | 16 tables, extensions `uuid-ossp`, `pgcrypto` | YES |
| `002` | `002_rls_policies.sql` | Core Row Level Security baseline | Enables RLS across all 16 tables, creates helper functions | YES |
| `003` | `003_fix_qr_rls.sql` | Institute QR code public read policy | RLS policy allowing all authenticated users to read `qr_settings` | YES |
| `004` | `004_gate_batch_content.sql` | Batch-gated access to study cards | Restricts `study_cards` SELECT policy to enrolled batch students | YES |
| `005` | `005_fix_profiles_student_read.sql`| RLS policy for viewing peers | Allows students to read fellow batch student profiles | YES |
| `006` | `006_teacher_notifications.sql` | Teacher notification authoring | Permits teachers to broadcast notifications to their batch | YES |
| `007` | `007_subject_enrollment.sql` | Subject arrays & multi-subject support | Adds `subjects TEXT[]` to `student_profiles` and `batches` | YES |
| `008` | `008_study_cards_multi_batch.sql` | Cross-batch study card sharing | Adds `batch_ids UUID[]` to `study_cards` | YES |
| `009` | `009_admin_delete_policies.sql` | Administrative purge capabilities | Explicit DELETE RLS policies for admin across all tables | YES |
| `010` | `010_teacher_payment_details.sql`| Teacher banking & UPI credentials | Adds `bank_name`, `account_number`, `ifsc_code`, `upi_id` | YES |
| `011` | `011_teacher_fee_records_rls.sql`| Teacher view of student fee status | Allows teachers with `can_view_fee_records` to read `fee_records` | YES |
| `012` | `012_live_classes_rls_fix.sql` | Fix teacher live stream start | Permits teachers with `can_drop_live_class` to start streams | YES |
| `013` | `013_push_subscriptions.sql` | Web Push subscription registry | Creates `push_subscriptions` table with RLS and user index | YES |
| `014` | `014_handle_new_user.sql` | Automated signup trigger & roll nos | Replaces `handle_new_user()` trigger on `auth.users` | YES |
| `015` | `015_homework_management.sql` | Homework assignment RLS tightening| Enables granular teacher homework creation and grading | YES |
| `016` | `016_targeted_notifications.sql`| Targeted push & notification filtering| Adds `target_role`, `target_batch_id` to `notifications` | YES |
| `017` | `017_batch_poster.sql` | Course promotional banners | Adds `poster_url TEXT` to `batches` table | YES |
| `018` | `018_free_trial.sql` | Student trial period tracking | Adds `is_trial BOOLEAN` and `trial_ends_at TIMESTAMPTZ` | YES |
| `019` | `019_batch_details.sql` | Rich curriculum description field | Adds `detailed_info TEXT` to `batches` | YES |
| `020` | `020_homework_and_default_teacher_permissions.sql`| Granular teacher homework flag | Adds `can_manage_homework` to `teacher_profiles` | YES |
| `021` | `021_fix_teacher_study_cards_permissions.sql` | Teacher card CRUD fix | Reconfigures `teacher_profiles` study cards policies | YES |
| `022` | `022_clean_teacher_global_permissions.sql` | Cleanup redundant global policies | Tightens teacher permissions to batch-assigned contexts | YES |
| `023` | `023_multi_teacher_batches.sql` | Co-teaching multi-faculty support | Adds `teacher_ids UUID[]` array to `batches` | YES |
| `024` | `024_activity_logs.sql` | Audit logging subsystem | Creates `activity_logs` table, batch index, and RLS | YES |
| `025` | `025_tests.sql` | Automated test suite helper schema | Test assertion helpers and regression verification tables | YES |
| `026` | `026_security_and_integrity_hardening.sql` | SEC-001/002/003 & DATA-001 fixes | Hardened `handle_new_user()`, column immutability triggers, RLS update locks | YES |
| `027` | `027_capacity_and_realtime_optimizations.sql` | Realtime channel & index optimization | 11 composite and partial performance indexes, realtime filter optimization | YES |
| `028` | `028_doubt_resolution_hub.sql` | Doubt Resolution Hub lifecycle | Creates `public.doubts`, 6 composite indexes, RLS, mutation triggers, realtime | YES |

---

## 2. Forensic Migration Quality Evaluation

### 2.1 Re-run Safety (Idempotency)
- All migration scripts consistently implement `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, and `DROP POLICY IF EXISTS ... CREATE POLICY`.
- Migrations can be executed repeatedly on existing environments without crashing or dropping data.

### 2.2 Lack of Down/Rollback Scripts
- The repository only contains forward migrations. There are no paired `down` migration scripts (e.g. `024_down.sql`). Reverting a schema change requires manual authoring of compensating DDL.
