-- ============================================================
-- 010_teacher_payment_details.sql
-- Adds UPI/QR fields to teacher_profiles so teachers can share
-- their payment details, and adds screenshot_url to
-- salary_records for payment proof.
-- ============================================================

-- 1. teacher_profiles: store teacher's own UPI QR + ID
ALTER TABLE teacher_profiles
  ADD COLUMN IF NOT EXISTS upi_qr_url TEXT,
  ADD COLUMN IF NOT EXISTS upi_id     TEXT;

-- 2. salary_records: store optional payment screenshot URL
ALTER TABLE salary_records
  ADD COLUMN IF NOT EXISTS screenshot_url TEXT;

-- 3. Create storage bucket for teacher QR uploads (public read)
INSERT INTO storage.buckets (id, name, public)
  VALUES ('teacher-qr', 'teacher-qr', true)
  ON CONFLICT (id) DO UPDATE SET public = true;

-- 4. Storage policies for teacher-qr bucket

DROP POLICY IF EXISTS "teacher-qr: public read"    ON storage.objects;
DROP POLICY IF EXISTS "teacher-qr: teacher upload" ON storage.objects;
DROP POLICY IF EXISTS "teacher-qr: teacher update" ON storage.objects;
DROP POLICY IF EXISTS "teacher-qr: teacher delete" ON storage.objects;
DROP POLICY IF EXISTS "teacher-qr: admin manage"   ON storage.objects;

-- Anyone can view teacher QR codes (needed for admin payment panel)
CREATE POLICY "teacher-qr: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'teacher-qr');

-- Teachers can upload to their own sub-folder: {teacher_id}/...
CREATE POLICY "teacher-qr: teacher upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'teacher-qr'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Teachers can replace/update their own files
CREATE POLICY "teacher-qr: teacher update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'teacher-qr'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Teachers can delete their own files
CREATE POLICY "teacher-qr: teacher delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'teacher-qr'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Admins can manage all files in this bucket
CREATE POLICY "teacher-qr: admin manage"
  ON storage.objects FOR ALL
  USING (bucket_id = 'teacher-qr' AND is_admin());
