# Master Database Table & Schema Registry

**Platform:** Thoughtful's Academy (Coaching Institute Management System)  
**Database Engine:** PostgreSQL 15.6 (Managed via Supabase Cloud)  
**Total Tables Cataloged:** 18 Core Relational Tables  

---

## 1. Master Database Entity Registry

| Table Name | Schema | Primary Key | Column Count | RLS Status | Key Foreign Key References |
|---|---|---|:---:|:---:|---|
| `profiles` | `public` | `id` (UUID) | 9 | **ENABLED** | `auth.users(id)` |
| `student_profiles` | `public` | `id` (UUID) | 11 | **ENABLED** | `profiles(id)`, `batches(id)` |
| `teacher_profiles` | `public` | `id` (UUID) | 15 | **ENABLED** | `profiles(id)` |
| `batches` | `public` | `id` (UUID) | 11 | **ENABLED** | `profiles(id)` |
| `study_cards` | `public` | `id` (UUID) | 11 | **ENABLED** | `batches(id)` |
| `student_bookmarks` | `public` | `id` (UUID) | 4 | **ENABLED** | `profiles(id)`, `study_cards(id)` |
| `attendance` | `public` | `id` (UUID) | 7 | **ENABLED** | `profiles(id)`, `batches(id)` |
| `fee_records` | `public` | `id` (UUID) | 12 | **ENABLED** | `profiles(id)`, `batches(id)` |
| `salary_records` | `public` | `id` (UUID) | 8 | **ENABLED** | `profiles(id)` |
| `live_classes` | `public` | `id` (UUID) | 8 | **ENABLED** | `batches(id)`, `profiles(id)` |
| `notifications` | `public` | `id` (UUID) | 9 | **ENABLED** | `batches(id)`, `profiles(id)` |
| `notification_reads`| `public` | `id` (UUID) | 4 | **ENABLED** | `notifications(id)`, `profiles(id)` |
| `messages` | `public` | `id` (UUID) | 6 | **ENABLED** | `profiles(id)` (sender/receiver) |
| `homework` | `public` | `id` (UUID) | 8 | **ENABLED** | `batches(id)`, `profiles(id)` |
| `homework_submissions`| `public` | `id` (UUID) | 7 | **ENABLED** | `homework(id)`, `profiles(id)` |
| `push_subscriptions`| `public` | `id` (UUID) | 7 | **ENABLED** | `profiles(id)` |
| `activity_logs` | `public` | `id` (UUID) | 10 | **ENABLED** | `batches(id)`, `profiles(id)` |
| `qr_settings` | `public` | `id` (UUID) | 5 | **ENABLED** | None |
