-- ============================================================
-- 031_subject_chapters.sql
-- Introduce chapters table and study_cards chapter association
-- ============================================================

-- 1. Create chapters table
CREATE TABLE IF NOT EXISTS chapters (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  batch_id      UUID REFERENCES batches(id) ON DELETE CASCADE,
  subject       TEXT NOT NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  display_order INTEGER DEFAULT 0,
  created_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chapters_batch_subject ON chapters(batch_id, subject);
CREATE INDEX IF NOT EXISTS idx_chapters_display_order ON chapters(display_order);

-- 2. Add chapter linkage to study_cards
ALTER TABLE study_cards
  ADD COLUMN IF NOT EXISTS chapter_id UUID REFERENCES chapters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS chapter TEXT;

CREATE INDEX IF NOT EXISTS idx_study_cards_chapter_id ON study_cards(chapter_id);
CREATE INDEX IF NOT EXISTS idx_study_cards_chapter ON study_cards(chapter);

-- 3. Row Level Security Policies for chapters
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;

-- Read accessible to public/landing visitors, enrolled students, teachers, and admins
DROP POLICY IF EXISTS "chapters: read accessible" ON chapters;
CREATE POLICY "chapters: read accessible"
  ON chapters FOR SELECT
  USING (
    is_admin()
    OR get_my_role() = 'teacher'
    OR (
      batch_id IS NULL
      OR EXISTS (
        SELECT 1 FROM student_profiles sp
        WHERE sp.id = auth.uid()
          AND sp.batch_id = chapters.batch_id
      )
    )
    OR auth.role() = 'anon'
  );

-- Teachers and Admins can insert
DROP POLICY IF EXISTS "chapters: admin or permitted teacher insert" ON chapters;
CREATE POLICY "chapters: admin or permitted teacher insert"
  ON chapters FOR INSERT
  WITH CHECK (
    is_admin()
    OR teacher_can('study_cards')
    OR EXISTS (
      SELECT 1 FROM batches
      WHERE (teacher_id = auth.uid() OR auth.uid() = ANY(teacher_ids))
        AND is_active = true
        AND id = chapters.batch_id
    )
  );

-- Teachers and Admins can update
DROP POLICY IF EXISTS "chapters: admin or permitted teacher update" ON chapters;
CREATE POLICY "chapters: admin or permitted teacher update"
  ON chapters FOR UPDATE
  USING (
    is_admin()
    OR teacher_can('study_cards')
    OR EXISTS (
      SELECT 1 FROM batches
      WHERE (teacher_id = auth.uid() OR auth.uid() = ANY(teacher_ids))
        AND is_active = true
        AND id = chapters.batch_id
    )
  );

-- Teachers and Admins can delete
DROP POLICY IF EXISTS "chapters: admin or permitted teacher delete" ON chapters;
CREATE POLICY "chapters: admin or permitted teacher delete"
  ON chapters FOR DELETE
  USING (
    is_admin()
    OR teacher_can('study_cards')
    OR EXISTS (
      SELECT 1 FROM batches
      WHERE (teacher_id = auth.uid() OR auth.uid() = ANY(teacher_ids))
        AND is_active = true
        AND id = chapters.batch_id
    )
  );
