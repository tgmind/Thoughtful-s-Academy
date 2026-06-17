-- ============================================================
-- 007_subject_enrollment.sql
-- Adds multi-subject support:
--   batches.subjects      TEXT[]  — subjects offered in this batch
--   study_cards.subject   TEXT    — which subject a card belongs to
--   student_profiles.subjects TEXT[] — subjects the student chose
-- ============================================================

-- Subjects available in a batch (e.g. ["Physics","Chemistry","Maths"])
ALTER TABLE batches
  ADD COLUMN IF NOT EXISTS subjects TEXT[] DEFAULT '{}';

-- Which subject a study card belongs to
ALTER TABLE study_cards
  ADD COLUMN IF NOT EXISTS subject TEXT;

-- Subjects a student is enrolled in within their batch
ALTER TABLE student_profiles
  ADD COLUMN IF NOT EXISTS subjects TEXT[] DEFAULT '{}';
