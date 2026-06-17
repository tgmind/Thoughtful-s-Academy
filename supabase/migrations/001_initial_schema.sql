-- ============================================================
-- 001_initial_schema.sql
-- Run this FIRST in: Supabase Dashboard → SQL Editor → New query
-- Safe to re-run — uses IF NOT EXISTS everywhere
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- PROFILES TABLE (extends Supabase auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name   TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT,
  role        TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
  avatar_url  TEXT,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BATCHES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS batches (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name        TEXT NOT NULL,          -- e.g. "Class 10 Science", "JEE Mains 2026"
  description TEXT,
  subject     TEXT,
  teacher_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STUDENT_PROFILES TABLE (extra student-specific fields)
-- ============================================================
CREATE TABLE IF NOT EXISTS student_profiles (
  id             UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  batch_id       UUID REFERENCES batches(id) ON DELETE SET NULL,
  roll_number    TEXT,
  parent_phone   TEXT,
  address        TEXT,
  date_of_birth  DATE,
  admission_date DATE DEFAULT CURRENT_DATE,
  notes          TEXT    -- admin internal notes
);

-- ============================================================
-- TEACHER_PROFILES TABLE (extra teacher-specific fields)
-- ============================================================
CREATE TABLE IF NOT EXISTS teacher_profiles (
  id                       UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  subject                  TEXT,
  qualification            TEXT,
  joining_date             DATE DEFAULT CURRENT_DATE,
  -- PERMISSIONS (managed by admin — all false by default)
  can_manage_study_cards   BOOLEAN DEFAULT false,
  can_drop_live_class      BOOLEAN DEFAULT false,
  can_message_students     BOOLEAN DEFAULT false,
  can_view_attendance      BOOLEAN DEFAULT false,
  can_view_fee_records     BOOLEAN DEFAULT false,
  salary_amount            NUMERIC(10,2) DEFAULT 0
);

-- ============================================================
-- ATTENDANCE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id  UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  batch_id    UUID REFERENCES batches(id)  ON DELETE CASCADE,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  status      TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late')),
  marked_at   TIMESTAMPTZ DEFAULT NOW(),
  marked_by   UUID REFERENCES profiles(id),    -- self-marked or admin/teacher
  UNIQUE(student_id, date)                     -- one record per student per day
);

CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_batch_date   ON attendance(batch_id,   date);

-- ============================================================
-- STUDY_CARDS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS study_cards (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title         TEXT NOT NULL,
  description   TEXT,
  type          TEXT NOT NULL CHECK (type IN ('youtube_video','youtube_playlist','google_drive','external_link')),
  url           TEXT NOT NULL,
  thumbnail_url TEXT,
  batch_id      UUID REFERENCES batches(id) ON DELETE CASCADE,   -- NULL = visible to all
  is_featured   BOOLEAN DEFAULT false,
  added_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_active     BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_cards_batch ON study_cards(batch_id);

-- ============================================================
-- STUDENT_BOOKMARKS
-- ============================================================
CREATE TABLE IF NOT EXISTS student_bookmarks (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id    UUID REFERENCES profiles(id)    ON DELETE CASCADE,
  study_card_id UUID REFERENCES study_cards(id) ON DELETE CASCADE,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, study_card_id)
);

-- ============================================================
-- MESSAGES TABLE (student ↔ teacher/admin)
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sender_id      UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id    UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content        TEXT NOT NULL,
  is_read        BOOLEAN DEFAULT false,
  attachment_url TEXT,    -- Google Drive link if any
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_sender   ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread   ON messages(sender_id, receiver_id, created_at);

-- ============================================================
-- FEE_RECORDS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS fee_records (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount         NUMERIC(10,2) NOT NULL,
  payment_month  TEXT NOT NULL,                    -- e.g. "June 2025"
  reference_id   TEXT,                             -- UPI transaction ID
  screenshot_url TEXT,                             -- optional Drive link
  status         TEXT NOT NULL CHECK (status IN ('pending','verified','rejected')) DEFAULT 'pending',
  paid_at        TIMESTAMPTZ DEFAULT NOW(),
  verified_by    UUID REFERENCES profiles(id),
  verified_at    TIMESTAMPTZ,
  notes          TEXT
);

CREATE INDEX IF NOT EXISTS idx_fee_student ON fee_records(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_status  ON fee_records(status);

-- ============================================================
-- QR_SETTINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS qr_settings (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  qr_image_url TEXT NOT NULL,    -- Supabase Storage URL
  upi_id       TEXT,
  payee_name   TEXT,
  description  TEXT,
  is_active    BOOLEAN DEFAULT true,
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_by   UUID REFERENCES profiles(id)
);

-- ============================================================
-- LIVE_CLASSES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS live_classes (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title        TEXT NOT NULL,
  platform     TEXT NOT NULL CHECK (platform IN ('zoom','google_meet','other')),
  join_url     TEXT NOT NULL,
  password     TEXT,
  scheduled_at TIMESTAMPTZ,
  batch_id     UUID REFERENCES batches(id)  ON DELETE CASCADE,    -- NULL = all students
  teacher_id   UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  is_active    BOOLEAN DEFAULT true,                              -- false = class ended
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_live_classes_batch ON live_classes(batch_id, is_active);

-- ============================================================
-- NOTIFICATIONS TABLE (homepage What's On panel)
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('general','fee','live_class','homework','announcement')),
  target_batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,   -- NULL = all
  target_role     TEXT CHECK (target_role IN ('student','teacher','all')) DEFAULT 'all',
  is_active       BOOLEAN DEFAULT true,
  scheduled_at    TIMESTAMPTZ,    -- NULL = publish immediately
  expires_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- HOMEWORK TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS homework (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,
  drive_link  TEXT NOT NULL,    -- Google Drive view/download link
  batch_id    UUID REFERENCES batches(id)  ON DELETE CASCADE,
  teacher_id  UUID REFERENCES profiles(id) ON DELETE CASCADE,
  due_date    DATE,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- HOMEWORK_SUBMISSIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS homework_submissions (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  homework_id  UUID REFERENCES homework(id)  ON DELETE CASCADE,
  student_id   UUID REFERENCES profiles(id)  ON DELETE CASCADE,
  drive_link   TEXT NOT NULL,    -- student's Google Drive link
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  feedback     TEXT,
  grade        TEXT,
  UNIQUE(homework_id, student_id)
);

-- ============================================================
-- SALARY_RECORDS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS salary_records (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  teacher_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount         NUMERIC(10,2) NOT NULL,
  payment_month  TEXT NOT NULL,
  payment_method TEXT,
  reference_id   TEXT,
  status         TEXT NOT NULL CHECK (status IN ('pending','paid')) DEFAULT 'pending',
  paid_at        TIMESTAMPTZ,
  paid_by        UUID REFERENCES profiles(id),
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATION_READS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_reads (
  user_id         UUID REFERENCES profiles(id)      ON DELETE CASCADE,
  notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
  read_at         TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, notification_id)
);

-- ============================================================
-- AUTO updated_at TRIGGER on profiles
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
