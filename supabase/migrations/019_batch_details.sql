-- ============================================================
-- 019_batch_details.sql
-- Adds detailed_info and faculty_images to batches
-- ============================================================

ALTER TABLE batches
  ADD COLUMN IF NOT EXISTS detailed_info TEXT,
  ADD COLUMN IF NOT EXISTS faculty_images JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN batches.detailed_info IS
  'Rich text / HTML detailed content for the batch page (overview, syllabus, features, schedule).';

COMMENT ON COLUMN batches.faculty_images IS
  'Array of objects: [{ name, subject, image_url }] representing batch faculty members.';
