-- ============================================================
-- 003_fix_qr_rls.sql
-- Fixes "new row violates row-level security policy" error
-- when admin tries to INSERT into qr_settings.
--
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Re-create the is_admin() helper in case it wasn't created yet
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Ensure RLS is enabled
ALTER TABLE qr_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (safe to re-run)
DROP POLICY IF EXISTS "qr_settings: all read"     ON qr_settings;
DROP POLICY IF EXISTS "qr_settings: admin manage" ON qr_settings;
DROP POLICY IF EXISTS "qr_settings: admin insert" ON qr_settings;
DROP POLICY IF EXISTS "qr_settings: admin update" ON qr_settings;
DROP POLICY IF EXISTS "qr_settings: admin delete" ON qr_settings;

-- Anyone can read QR settings (needed for PayFee page)
CREATE POLICY "qr_settings: all read"
  ON qr_settings FOR SELECT
  USING (true);

-- Admins can insert new QR settings rows
CREATE POLICY "qr_settings: admin insert"
  ON qr_settings FOR INSERT
  WITH CHECK (is_admin());

-- Admins can update existing QR settings rows
CREATE POLICY "qr_settings: admin update"
  ON qr_settings FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Admins can delete QR settings rows
CREATE POLICY "qr_settings: admin delete"
  ON qr_settings FOR DELETE
  USING (is_admin());

-- ============================================================
-- Also fix the storage bucket policy for qr-codes uploads.
-- Run this only if the qr-codes bucket already exists.
-- ============================================================

-- Allow admins to upload to qr-codes bucket
INSERT INTO storage.buckets (id, name, public)
  VALUES ('qr-codes', 'qr-codes', true)
  ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop and recreate storage policies
DROP POLICY IF EXISTS "qr-codes: public read"    ON storage.objects;
DROP POLICY IF EXISTS "qr-codes: admin upload"   ON storage.objects;
DROP POLICY IF EXISTS "qr-codes: admin delete"   ON storage.objects;

CREATE POLICY "qr-codes: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'qr-codes');

CREATE POLICY "qr-codes: admin upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'qr-codes' AND is_admin());

CREATE POLICY "qr-codes: admin delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'qr-codes' AND is_admin());
