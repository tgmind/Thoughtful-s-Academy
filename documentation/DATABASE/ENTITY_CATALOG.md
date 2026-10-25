# Database Entity Catalog & Schema Reference

**Platform:** Graviton Academy (Coaching Institute Management System)  
**Database Engine:** PostgreSQL 15.6  
**Total Entities Documented:** 19 Core Relational Tables  

---

## 1. User Identity & Profiles Entities

### 1.1 `public.profiles`
Primary identity registry linked directly to Supabase authentication.
- `id` (UUID, PK): References `auth.users(id)` ON DELETE CASCADE.
- `full_name` (TEXT, NOT NULL): Student or instructor legal name.
- `email` (TEXT, NOT NULL): Contact email address.
- `phone` (TEXT, NULL): Primary contact phone number.
- `role` (TEXT, NOT NULL): Enum check `CHECK (role IN ('student', 'teacher', 'admin'))`.
- `avatar_url` (TEXT, NULL): URL to profile photo.
- `is_active` (BOOLEAN, DEFAULT true): Soft-disable account toggle.
- `created_at` (TIMESTAMPTZ, DEFAULT NOW()): Registration timestamp.
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW()): Last modification timestamp.

### 1.2 `public.student_profiles`
Extended academic records for student accounts.
- `id` (UUID, PK): References `profiles(id)` ON DELETE CASCADE.
- `batch_id` (UUID, NULL): References `batches(id)` ON DELETE SET NULL.
- `roll_number` (TEXT, NULL): Formatted identifier (e.g., `2026-JEE-001`).
- `parent_phone` (TEXT, NULL): Guardian WhatsApp / contact phone.
- `address` (TEXT, NULL): Residential postal address.
- `date_of_birth` (DATE, NULL): Student birth date.
- `admission_date` (DATE, DEFAULT CURRENT_DATE): Institute admission date.
- `subjects` (TEXT[], DEFAULT '{}'): Array of enrolled subjects.
- `is_trial` (BOOLEAN, DEFAULT false): Free trial status flag.
- `trial_ends_at` (TIMESTAMPTZ, NULL): Expiration timestamp for trial access.
- `notes` (TEXT, NULL): Administrative remarks.

### 1.3 `public.teacher_profiles`
Faculty compensation, specialization, and granular permission flags.
- `id` (UUID, PK): References `profiles(id)` ON DELETE CASCADE.
- `subject` (TEXT, NULL): Primary academic subject taught.
- `qualification` (TEXT, NULL): Academic degrees (e.g., "M.Sc. Physics").
- `joining_date` (DATE, DEFAULT CURRENT_DATE): Faculty start date.
- `salary_amount` (NUMERIC(10,2), DEFAULT 0): Base monthly compensation.
- `bank_name` (TEXT, NULL): Payout bank institution name.
- `account_number` (TEXT, NULL): Bank account number.
- `ifsc_code` (TEXT, NULL): Bank branch IFSC routing code.
- `upi_id` (TEXT, NULL): Faculty UPI VPA for disbursements.
- `can_manage_study_cards` (BOOLEAN, DEFAULT false): Permission flag for curriculum CRUD.
- `can_manage_homework` (BOOLEAN, DEFAULT false): Permission flag for assignments CRUD.
- `can_drop_live_class` (BOOLEAN, DEFAULT false): Permission flag to broadcast live streams.
- `can_message_students` (BOOLEAN, DEFAULT true): Permission flag for 1-on-1 chats.
- `can_view_attendance` (BOOLEAN, DEFAULT false): Read permission for student attendance.
- `can_view_fee_records` (BOOLEAN, DEFAULT false): Read permission for student fee statuses.

---

## 2. Academic & Curriculum Entities

### 2.1 `public.batches`
Academic course cohorts.
- `id` (UUID, PK, DEFAULT `uuid_generate_v4()`).
- `name` (TEXT, NOT NULL): Batch name (e.g., "Class 10 Science", "JEE Mains 2026").
- `description` (TEXT, NULL): Brief summary.
- `detailed_info` (TEXT, NULL): Rich HTML curriculum breakdown.
- `subject` (TEXT, NULL): Primary subject category.
- `teacher_id` (UUID, NULL): References `profiles(id)` ON DELETE SET NULL (Legacy single teacher).
- `teacher_ids` (UUID[], DEFAULT '{}'): Array of assigned faculty profile IDs.
- `monthly_fee` (NUMERIC(10,2), DEFAULT 0): Standard monthly tuition fee.
- `poster_url` (TEXT, NULL): Batch promotional banner image URL.
- `is_active` (BOOLEAN, DEFAULT true): Enrollment status.
- `created_at` (TIMESTAMPTZ, DEFAULT NOW()).

### 2.2 `public.study_cards`
Curriculum lecture content and video containers.
- `id` (UUID, PK, DEFAULT `uuid_generate_v4()`).
- `batch_id` (UUID, NULL): References `batches(id)` ON DELETE CASCADE.
- `batch_ids` (UUID[], DEFAULT '{}'): Multi-batch visibility mapping.
- `chapter_id` (UUID, NULL): References `chapters(id)` ON DELETE SET NULL.
- `title` (TEXT, NOT NULL): Lecture topic title.
- `description` (TEXT, NULL): Lecture synopsis and markdown notes.
- `youtube_url` (TEXT, NULL): YouTube video URL or ID.
- `duration` (INT, DEFAULT 0): Playback duration in seconds.
- `notes_url` (TEXT, NULL): Google Drive / PDF notes document URL.
- `is_published` (BOOLEAN, DEFAULT true): Visibility toggle.
- `created_at` (TIMESTAMPTZ, DEFAULT NOW()).

### 2.3 `public.student_bookmarks`
Saved study cards per student account.
- `id` (UUID, PK, DEFAULT `uuid_generate_v4()`).
- `student_id` (UUID, NOT NULL): References `profiles(id)` ON DELETE CASCADE.
- `card_id` (UUID, NOT NULL): References `study_cards(id)` ON DELETE CASCADE.
- `created_at` (TIMESTAMPTZ, DEFAULT NOW()).

---

## 3. Communication & Operational Entities

### 3.1 `public.attendance`
- `id` (UUID, PK, DEFAULT `uuid_generate_v4()`).
- `student_id` (UUID, NOT NULL): References `profiles(id)` ON DELETE CASCADE.
- `batch_id` (UUID, NULL): References `batches(id)` ON DELETE CASCADE.
- `date` (DATE, NOT NULL, DEFAULT CURRENT_DATE).
- `status` (TEXT, NOT NULL): `CHECK (status IN ('present', 'absent', 'late'))`.
- `marked_at` (TIMESTAMPTZ, DEFAULT NOW()).
- `marked_by` (UUID, NULL): References `profiles(id)`.

### 3.2 `public.fee_records`
- `id` (UUID, PK, DEFAULT `uuid_generate_v4()`).
- `student_id` (UUID, NOT NULL): References `profiles(id)` ON DELETE CASCADE.
- `batch_id` (UUID, NULL): References `batches(id)` ON DELETE CASCADE.
- `amount` (NUMERIC(10,2), NOT NULL): Submitted fee amount.
- `month` (TEXT, NOT NULL): Fee period (e.g., "October 2026").
- `payment_mode` (TEXT, NOT NULL): Enum check (`UPI`, `Cash`).
- `utr_number` (TEXT, NULL): 12-digit UPI transaction reference.
- `status` (TEXT, NOT NULL, DEFAULT 'pending'): `CHECK (status IN ('pending', 'approved', 'rejected'))`.
- `rejection_reason` (TEXT, NULL): Explanatory note on rejection.
- `verified_by` (UUID, NULL): References `profiles(id)` (Admin).
- `verified_at` (TIMESTAMPTZ, NULL).
- `created_at` (TIMESTAMPTZ, DEFAULT NOW()).

### 3.3 `public.salary_records`
- `id` (UUID, PK, DEFAULT `uuid_generate_v4()`).
- `teacher_id` (UUID, NOT NULL): References `profiles(id)` ON DELETE CASCADE.
- `amount` (NUMERIC(10,2), NOT NULL): Net disbursed salary.
- `month` (TEXT, NOT NULL): Compensation month.
- `status` (TEXT, NOT NULL, DEFAULT 'pending'): `CHECK (status IN ('pending', 'paid'))`.
- `payment_date` (DATE, NULL).
- `transaction_ref` (TEXT, NULL): Bank transfer reference.
- `created_at` (TIMESTAMPTZ, DEFAULT NOW()).

### 3.4 `public.live_classes`
- `id` (UUID, PK, DEFAULT `uuid_generate_v4()`).
- `batch_id` (UUID, NOT NULL): References `batches(id)` ON DELETE CASCADE.
- `teacher_id` (UUID, NOT NULL): References `profiles(id)` ON DELETE CASCADE.
- `stream_url` (TEXT, NOT NULL): YouTube Live stream URL or video ID.
- `status` (TEXT, NOT NULL, DEFAULT 'live'): `CHECK (status IN ('scheduled', 'live', 'ended'))`.
- `started_at` (TIMESTAMPTZ, DEFAULT NOW()).
- `ended_at` (TIMESTAMPTZ, NULL).

### 3.5 `public.notifications`
- `id` (UUID, PK, DEFAULT `uuid_generate_v4()`).
- `title` (TEXT, NOT NULL): Announcement headline.
- `body` (TEXT, NOT NULL): Full notification content.
- `type` (TEXT, NOT NULL, DEFAULT 'general'): `CHECK (type IN ('general', 'fee', 'live_class', 'announcement', 'homework'))`.
- `target_role` (TEXT, NOT NULL, DEFAULT 'all'): `CHECK (target_role IN ('all', 'student', 'teacher'))`.
- `target_batch_id` (UUID, NULL): References `batches(id)` ON DELETE CASCADE.
- `created_by` (UUID, NULL): References `profiles(id)`.
- `is_active` (BOOLEAN, DEFAULT true).
- `created_at` (TIMESTAMPTZ, DEFAULT NOW()).

### 3.6 `public.notification_reads`
- `id` (UUID, PK, DEFAULT `uuid_generate_v4()`).
- `notification_id` (UUID, NOT NULL): References `notifications(id)` ON DELETE CASCADE.
- `user_id` (UUID, NOT NULL): References `profiles(id)` ON DELETE CASCADE.
- `read_at` (TIMESTAMPTZ, DEFAULT NOW()).

### 3.7 `public.messages`
- `id` (UUID, PK, DEFAULT `uuid_generate_v4()`).
- `sender_id` (UUID, NOT NULL): References `profiles(id)` ON DELETE CASCADE.
- `receiver_id` (UUID, NOT NULL): References `profiles(id)` ON DELETE CASCADE.
- `content` (TEXT, NOT NULL): Chat message body.
- `is_read` (BOOLEAN, DEFAULT false).
- `created_at` (TIMESTAMPTZ, DEFAULT NOW()).

### 3.8 `public.homework` & `public.homework_submissions`
- **`homework`**: `id`, `batch_id`, `teacher_id`, `title`, `description`, `due_date`, `attachment_url`, `created_at`.
- **`homework_submissions`**: `id`, `homework_id`, `student_id`, `submission_url`, `submitted_at`, `grade`, `feedback`.

### 3.9 `public.push_subscriptions`
- `id` (UUID, PK, DEFAULT `gen_random_uuid()`).
- `user_id` (UUID, NOT NULL): References `profiles(id)` ON DELETE CASCADE.
- `endpoint` (TEXT, NOT NULL, UNIQUE): Browser push service endpoint.
- `p256dh` (TEXT, NOT NULL): Public elliptic curve key.
- `auth` (TEXT, NOT NULL): Authentication secret key.
- `user_agent` (TEXT, NULL): Browser/device string.
- `created_at` (TIMESTAMPTZ, DEFAULT NOW()).

### 3.10 `public.activity_logs`
- `id` (UUID, PK, DEFAULT `gen_random_uuid()`).
- `batch_id` (UUID, NULL): References `batches(id)` ON DELETE CASCADE.
- `user_id` (UUID, NULL): References `profiles(id)` ON DELETE SET NULL.
- `user_name` (TEXT, NOT NULL): Actor display name.
- `user_role` (TEXT, NOT NULL, DEFAULT 'teacher').
- `action_type` (TEXT, NOT NULL): `create`, `update`, `delete`, `toggle_visibility`.
- `entity_type` (TEXT, NOT NULL, DEFAULT 'study_card').
- `entity_title` (TEXT, NOT NULL): Human-readable name of impacted resource.
- `details` (TEXT, NULL): JSON or text diff summary.
- `created_at` (TIMESTAMPTZ, DEFAULT NOW()).

### 3.11 `public.qr_settings`
- `id` (UUID, PK, DEFAULT `uuid_generate_v4()`).
- `qr_image_url` (TEXT, NOT NULL): Institute UPI QR code image link.
- `upi_id` (TEXT, NOT NULL): Institute VPA ID (e.g. `institute@upi`).
- `account_name` (TEXT, NOT NULL): Account holder name.
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW()).

### 3.12 `public.doubts` (Migration `028_doubt_resolution_hub.sql`)
Authoritative lecture doubt lifecycle, student identity snapshot, timestamped seek, and educator resolution tracking.
- `id` (UUID, PK, DEFAULT `gen_random_uuid()`).
- `student_id` (UUID, NOT NULL): References `profiles(id)` ON DELETE CASCADE.
- `student_name` (TEXT, NOT NULL): Student legal display name snapshot.
- `roll_number` (TEXT, NULL): Student official roll number snapshot.
- `batch_id` (UUID, NULL): References `batches(id)` ON DELETE SET NULL.
- `batch_name` (TEXT, NULL): Batch cohort title snapshot.
- `subject` (TEXT, NOT NULL): Academic subject category (e.g. Physics, Chemistry).
- `study_card_id` (UUID, NULL): References `study_cards(id)` ON DELETE SET NULL.
- `lecture_title` (TEXT, NOT NULL): Title of the lecture video.
- `video_url` (TEXT, NULL): Direct or embedded video URL.
- `timestamp_seconds` (INTEGER, NOT NULL, DEFAULT 0): Exact video seek time offset in seconds.
- `question` (TEXT, NOT NULL): Formatted doubt question text.
- `status` (TEXT, NOT NULL, DEFAULT 'pending'): Enum check `CHECK (status IN ('pending', 'addressed'))`.
- `addressed_by` (UUID, NULL): References `profiles(id)` ON DELETE SET NULL (educator who addressed the doubt).
- `addressed_by_name` (TEXT, NULL): Educator display name snapshot.
- `addressed_at` (TIMESTAMPTZ, NULL): Timestamp when marked addressed.
- `created_at` (TIMESTAMPTZ, DEFAULT NOW()): Submission timestamp.
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW()): Last modification timestamp.
