-- ============================================================
-- 027_capacity_and_realtime_optimizations.sql
-- Graviton Academy High-Capacity & Realtime Index Optimization
--
-- Performance & Capacity Objectives:
-- 1. Index high-frequency Realtime & Dashboard filter paths
-- 2. Add GIN indexing for array-containment on multi-batch study cards
-- 3. Eliminate sequential table scans on notifications, homework, and live classes
-- 4. Provide partial indexes for ultra-low latency unread message counts
-- 5. Accelerate foreign-key join lookups on student_profiles and attendance
-- ============================================================

-- ── 1. NOTIFICATIONS & READ RECEIPTS OPTIMIZATION ─────────────────────────────
-- Speeds up dashboard notification feeds and targeted announcements
CREATE INDEX IF NOT EXISTS idx_notifications_active_created 
  ON public.notifications (is_active, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_target_role_batch 
  ON public.notifications (target_role, target_batch_id) 
  WHERE is_active = true;

-- Speeds up foreign key cascade deletes and notification lookups
-- Note: notification_reads already has PRIMARY KEY (user_id, notification_id) which
-- covers user_id lookups. Indexing notification_id covers reverse queries and FK cascades.
CREATE INDEX IF NOT EXISTS idx_notification_reads_notif_id 
  ON public.notification_reads (notification_id);


-- ── 2. HOMEWORK & SUBMISSIONS OPTIMIZATION ──────────────────────────────────
-- Speeds up batch homework dashboard listings
CREATE INDEX IF NOT EXISTS idx_homework_batch_active_created 
  ON public.homework (batch_id, is_active, created_at DESC);

-- Speeds up student submission lookup and deduplication checks
CREATE INDEX IF NOT EXISTS idx_homework_submissions_student_hw 
  ON public.homework_submissions (student_id, homework_id);

CREATE INDEX IF NOT EXISTS idx_homework_submissions_hw_created 
  ON public.homework_submissions (homework_id, submitted_at DESC);


-- ── 3. STUDY CARDS & MULTI-BATCH GIN INDEXING ────────────────────────────────
-- GIN index on batch_ids UUID[] enables sub-millisecond array-containment queries
-- (e.g. batch_ids @> ARRAY[current_batch_id])
CREATE INDEX IF NOT EXISTS idx_study_cards_batch_ids_gin 
  ON public.study_cards USING GIN (batch_ids);

CREATE INDEX IF NOT EXISTS idx_study_cards_active_created 
  ON public.study_cards (is_active, is_public, created_at DESC);


-- ── 4. STUDENT PROFILES & ENROLLMENT JOINS ───────────────────────────────────
-- Accelerates batch-level joins and attendance roster population
CREATE INDEX IF NOT EXISTS idx_student_profiles_batch_id 
  ON public.student_profiles (batch_id);


-- ── 5. FEE RECORDS & DEFAULTER TRACKING ──────────────────────────────────────
-- Accelerates monthly fee collection, defaulters filter, and pending receipt views
CREATE INDEX IF NOT EXISTS idx_fee_records_month_status 
  ON public.fee_records (payment_month, status);

CREATE INDEX IF NOT EXISTS idx_fee_records_student_status 
  ON public.fee_records (student_id, status);


-- ── 6. LIVE CLASSES REALTIME DISCOVERY ───────────────────────────────────────
-- Accelerates 0ms live class discovery on dashboard and navigation badges
CREATE INDEX IF NOT EXISTS idx_live_classes_active_created 
  ON public.live_classes (is_active, created_at DESC);


-- ── 7. MESSAGING LATENCY & UNREAD BADGES (PARTIAL INDEX) ─────────────────────
-- Partial index: only indexes unread messages, making count queries near-instant
CREATE INDEX IF NOT EXISTS idx_messages_unread_receiver 
  ON public.messages (receiver_id) 
  WHERE is_read = false;


-- ── 8. ATTENDANCE ROSTER & METRICS ───────────────────────────────────────────
-- Accelerates monthly attendance summaries and student record history
CREATE INDEX IF NOT EXISTS idx_attendance_student_status_date 
  ON public.attendance (student_id, status, date DESC);
