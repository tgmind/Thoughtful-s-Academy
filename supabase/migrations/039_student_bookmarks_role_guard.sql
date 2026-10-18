-- ============================================================================
-- Migration 039: Student Bookmarks Role Guard and Non-Student Purge
-- ============================================================================

-- 1. Safely purge any bookmark records created by non-student accounts (admin, teacher, or orphans)
DELETE FROM public.student_bookmarks
WHERE student_id IN (
  SELECT id FROM public.profiles WHERE role IN ('admin', 'teacher')
) OR student_id NOT IN (
  SELECT id FROM public.profiles
);

-- 2. Drop existing permissive RLS policy
DROP POLICY IF EXISTS "bookmarks: own" ON public.student_bookmarks;
DROP POLICY IF EXISTS "student_bookmarks: student only" ON public.student_bookmarks;
DROP POLICY IF EXISTS "student_bookmarks: admin access" ON public.student_bookmarks;

-- 3. Strict Student Only Policy: Authenticated students can view/manage only their own bookmarks
CREATE POLICY "student_bookmarks: student only"
  ON public.student_bookmarks FOR ALL
  TO authenticated
  USING (
    auth.uid() = student_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'student'
    )
  )
  WITH CHECK (
    auth.uid() = student_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'student'
    )
  );

-- 4. Admin Access Policy: Admins can inspect and manage bookmarks for maintenance/wipe
CREATE POLICY "student_bookmarks: admin access"
  ON public.student_bookmarks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );
