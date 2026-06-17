-- ============================================================
-- 002_rls_policies.sql
-- Run AFTER 001_initial_schema.sql
-- Safe to re-run: drops each policy before recreating it.
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches               ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance            ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_cards           ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_bookmarks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages              ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_records           ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_settings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_classes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework              ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_submissions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_records        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_reads    ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: is current user an admin?
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: check teacher permission flag
CREATE OR REPLACE FUNCTION teacher_can(permission TEXT)
RETURNS BOOLEAN AS $$
  SELECT CASE
    WHEN permission = 'study_cards'      THEN can_manage_study_cards
    WHEN permission = 'live_class'       THEN can_drop_live_class
    WHEN permission = 'message'          THEN can_message_students
    WHEN permission = 'view_attendance'  THEN can_view_attendance
    WHEN permission = 'view_fees'        THEN can_view_fee_records
    ELSE false
  END
  FROM teacher_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- PROFILES
-- ============================================================
DROP POLICY IF EXISTS "profiles: own read"    ON profiles;
DROP POLICY IF EXISTS "profiles: own update"  ON profiles;
DROP POLICY IF EXISTS "profiles: auth insert" ON profiles;

CREATE POLICY "profiles: own read"
  ON profiles FOR SELECT
  USING (auth.uid() = id OR is_admin() OR get_my_role() = 'teacher');

CREATE POLICY "profiles: own update"
  ON profiles FOR UPDATE
  USING (auth.uid() = id OR is_admin());

CREATE POLICY "profiles: auth insert"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- STUDENT_PROFILES
-- ============================================================
DROP POLICY IF EXISTS "student_profiles: own or admin/teacher" ON student_profiles;
DROP POLICY IF EXISTS "student_profiles: own update"           ON student_profiles;
DROP POLICY IF EXISTS "student_profiles: own insert"           ON student_profiles;

CREATE POLICY "student_profiles: own or admin/teacher"
  ON student_profiles FOR SELECT
  USING (auth.uid() = id OR is_admin() OR get_my_role() = 'teacher');

CREATE POLICY "student_profiles: own update"
  ON student_profiles FOR UPDATE
  USING (auth.uid() = id OR is_admin());

CREATE POLICY "student_profiles: own insert"
  ON student_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- TEACHER_PROFILES
-- ============================================================
DROP POLICY IF EXISTS "teacher_profiles: own read"    ON teacher_profiles;
DROP POLICY IF EXISTS "teacher_profiles: admin update" ON teacher_profiles;
DROP POLICY IF EXISTS "teacher_profiles: own insert"   ON teacher_profiles;

CREATE POLICY "teacher_profiles: own read"
  ON teacher_profiles FOR SELECT
  USING (auth.uid() = id OR is_admin());

CREATE POLICY "teacher_profiles: admin update"
  ON teacher_profiles FOR UPDATE
  USING (is_admin() OR auth.uid() = id);

CREATE POLICY "teacher_profiles: own insert"
  ON teacher_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- BATCHES
-- ============================================================
DROP POLICY IF EXISTS "batches: all read"     ON batches;
DROP POLICY IF EXISTS "batches: admin manage" ON batches;

CREATE POLICY "batches: all read"     ON batches FOR SELECT USING (true);
CREATE POLICY "batches: admin manage" ON batches FOR ALL    USING (is_admin());

-- ============================================================
-- ATTENDANCE
-- ============================================================
DROP POLICY IF EXISTS "attendance: student own"        ON attendance;
DROP POLICY IF EXISTS "attendance: student insert own" ON attendance;
DROP POLICY IF EXISTS "attendance: admin full"         ON attendance;

CREATE POLICY "attendance: student own"
  ON attendance FOR SELECT
  USING (auth.uid() = student_id OR is_admin() OR get_my_role() = 'teacher');

CREATE POLICY "attendance: student insert own"
  ON attendance FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "attendance: admin full"
  ON attendance FOR ALL
  USING (is_admin());

-- ============================================================
-- STUDY_CARDS
-- batch_id = NULL  → public, visible on homepage (no login)
-- batch_id = X     → enrolled students in that batch only
-- ============================================================
DROP POLICY IF EXISTS "study_cards: all read active"                ON study_cards;
DROP POLICY IF EXISTS "study_cards: public read"                    ON study_cards;
DROP POLICY IF EXISTS "study_cards: enrolled read"                  ON study_cards;
DROP POLICY IF EXISTS "study_cards: admin read all"                 ON study_cards;
DROP POLICY IF EXISTS "study_cards: admin or permitted teacher insert" ON study_cards;
DROP POLICY IF EXISTS "study_cards: admin or permitted teacher update" ON study_cards;

CREATE POLICY "study_cards: public read"
  ON study_cards FOR SELECT
  USING (is_active = true AND batch_id IS NULL);

CREATE POLICY "study_cards: enrolled read"
  ON study_cards FOR SELECT
  USING (
    is_active = true
    AND batch_id IS NOT NULL
    AND (
      is_admin()
      OR get_my_role() = 'teacher'
      OR EXISTS (
        SELECT 1 FROM student_profiles sp
        WHERE sp.id = auth.uid() AND sp.batch_id = study_cards.batch_id
      )
    )
  );

CREATE POLICY "study_cards: admin read all"
  ON study_cards FOR SELECT
  USING (is_admin());

CREATE POLICY "study_cards: admin or permitted teacher insert"
  ON study_cards FOR INSERT
  WITH CHECK (is_admin() OR teacher_can('study_cards'));

CREATE POLICY "study_cards: admin or permitted teacher update"
  ON study_cards FOR UPDATE
  USING (is_admin() OR (teacher_can('study_cards') AND added_by = auth.uid()));

-- ============================================================
-- STUDENT_BOOKMARKS
-- ============================================================
DROP POLICY IF EXISTS "bookmarks: own" ON student_bookmarks;

CREATE POLICY "bookmarks: own"
  ON student_bookmarks FOR ALL
  USING (auth.uid() = student_id);

-- ============================================================
-- MESSAGES
-- ============================================================
DROP POLICY IF EXISTS "messages: sender or receiver"   ON messages;
DROP POLICY IF EXISTS "messages: authenticated insert" ON messages;
DROP POLICY IF EXISTS "messages: mark read"            ON messages;

CREATE POLICY "messages: sender or receiver"
  ON messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id OR is_admin());

CREATE POLICY "messages: authenticated insert"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "messages: mark read"
  ON messages FOR UPDATE
  USING (auth.uid() = receiver_id OR is_admin());

-- ============================================================
-- FEE_RECORDS
-- ============================================================
DROP POLICY IF EXISTS "fee_records: student own"    ON fee_records;
DROP POLICY IF EXISTS "fee_records: student insert" ON fee_records;
DROP POLICY IF EXISTS "fee_records: admin verify"   ON fee_records;

CREATE POLICY "fee_records: student own"
  ON fee_records FOR SELECT
  USING (auth.uid() = student_id OR is_admin());

CREATE POLICY "fee_records: student insert"
  ON fee_records FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "fee_records: admin verify"
  ON fee_records FOR UPDATE
  USING (is_admin());

-- ============================================================
-- QR_SETTINGS
-- ============================================================
DROP POLICY IF EXISTS "qr_settings: all read"    ON qr_settings;
DROP POLICY IF EXISTS "qr_settings: admin manage" ON qr_settings;
DROP POLICY IF EXISTS "qr_settings: admin insert" ON qr_settings;
DROP POLICY IF EXISTS "qr_settings: admin update" ON qr_settings;
DROP POLICY IF EXISTS "qr_settings: admin delete" ON qr_settings;

CREATE POLICY "qr_settings: all read"
  ON qr_settings FOR SELECT USING (true);

CREATE POLICY "qr_settings: admin insert"
  ON qr_settings FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "qr_settings: admin update"
  ON qr_settings FOR UPDATE
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "qr_settings: admin delete"
  ON qr_settings FOR DELETE
  USING (is_admin());

-- ============================================================
-- LIVE_CLASSES
-- ============================================================
DROP POLICY IF EXISTS "live_classes: all read active"                   ON live_classes;
DROP POLICY IF EXISTS "live_classes: admin or permitted teacher insert"  ON live_classes;
DROP POLICY IF EXISTS "live_classes: admin or own teacher update"        ON live_classes;

CREATE POLICY "live_classes: all read active"
  ON live_classes FOR SELECT
  USING (is_active = true);

CREATE POLICY "live_classes: admin or permitted teacher insert"
  ON live_classes FOR INSERT
  WITH CHECK (is_admin() OR teacher_can('live_class'));

CREATE POLICY "live_classes: admin or own teacher update"
  ON live_classes FOR UPDATE
  USING (is_admin() OR (teacher_can('live_class') AND teacher_id = auth.uid()));

-- ============================================================
-- NOTIFICATIONS
-- target_role='all' + target_batch_id=NULL → public (homepage)
-- target_role='student'                    → logged-in students
-- target_role='teacher'                    → logged-in teachers
-- target_batch_id = X                      → students in that batch only
-- ============================================================
DROP POLICY IF EXISTS "notifications: all read active" ON notifications;
DROP POLICY IF EXISTS "notifications: public read"     ON notifications;
DROP POLICY IF EXISTS "notifications: student read"    ON notifications;
DROP POLICY IF EXISTS "notifications: teacher read"    ON notifications;
DROP POLICY IF EXISTS "notifications: admin manage"    ON notifications;

CREATE POLICY "notifications: public read"
  ON notifications FOR SELECT
  USING (
    is_active = true
    AND target_role = 'all'
    AND target_batch_id IS NULL
    AND (scheduled_at IS NULL OR scheduled_at <= NOW())
    AND (expires_at   IS NULL OR expires_at   >= NOW())
  );

CREATE POLICY "notifications: student read"
  ON notifications FOR SELECT
  USING (
    is_active = true
    AND get_my_role() = 'student'
    AND target_role IN ('student', 'all')
    AND (
      target_batch_id IS NULL
      OR target_batch_id IN (
        SELECT batch_id FROM student_profiles WHERE id = auth.uid()
      )
    )
    AND (scheduled_at IS NULL OR scheduled_at <= NOW())
    AND (expires_at   IS NULL OR expires_at   >= NOW())
  );

CREATE POLICY "notifications: teacher read"
  ON notifications FOR SELECT
  USING (
    is_active = true
    AND get_my_role() = 'teacher'
    AND target_role IN ('teacher', 'all')
    AND (scheduled_at IS NULL OR scheduled_at <= NOW())
    AND (expires_at   IS NULL OR expires_at   >= NOW())
  );

CREATE POLICY "notifications: admin manage"
  ON notifications FOR ALL
  USING (is_admin());

-- ============================================================
-- HOMEWORK
-- ============================================================
DROP POLICY IF EXISTS "homework: all read active"        ON homework;
DROP POLICY IF EXISTS "homework: admin or teacher insert" ON homework;

CREATE POLICY "homework: all read active"
  ON homework FOR SELECT
  USING (is_active = true);

CREATE POLICY "homework: admin or teacher insert"
  ON homework FOR INSERT
  WITH CHECK (is_admin() OR get_my_role() = 'teacher');

-- ============================================================
-- HOMEWORK_SUBMISSIONS
-- ============================================================
DROP POLICY IF EXISTS "submissions: own or teacher/admin" ON homework_submissions;
DROP POLICY IF EXISTS "submissions: student insert"       ON homework_submissions;

CREATE POLICY "submissions: own or teacher/admin"
  ON homework_submissions FOR SELECT
  USING (auth.uid() = student_id OR is_admin() OR get_my_role() = 'teacher');

CREATE POLICY "submissions: student insert"
  ON homework_submissions FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- ============================================================
-- SALARY_RECORDS
-- ============================================================
DROP POLICY IF EXISTS "salary: teacher own"   ON salary_records;
DROP POLICY IF EXISTS "salary: admin manage"  ON salary_records;

CREATE POLICY "salary: teacher own"
  ON salary_records FOR SELECT
  USING (auth.uid() = teacher_id OR is_admin());

CREATE POLICY "salary: admin manage"
  ON salary_records FOR ALL
  USING (is_admin());

-- ============================================================
-- NOTIFICATION_READS
-- ============================================================
DROP POLICY IF EXISTS "reads: own" ON notification_reads;

CREATE POLICY "reads: own"
  ON notification_reads FOR ALL
  USING (auth.uid() = user_id);
