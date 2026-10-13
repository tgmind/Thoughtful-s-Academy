-- ============================================================
-- 028_doubt_resolution_hub.sql
-- Dedicated Doubt Resolution Hub Schema, Indexing & Row-Level Security
-- Hardened with Column-Level Immutability and Authoritative Integrity Triggers
-- ============================================================

-- 1. Create doubts table
CREATE TABLE IF NOT EXISTS public.doubts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  roll_number TEXT,
  batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
  batch_name TEXT,
  subject TEXT NOT NULL,
  study_card_id UUID REFERENCES public.study_cards(id) ON DELETE SET NULL,
  lecture_title TEXT NOT NULL,
  video_url TEXT,
  timestamp_seconds INTEGER NOT NULL DEFAULT 0 CHECK (timestamp_seconds >= 0),
  question TEXT NOT NULL CHECK (length(trim(question)) > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'addressed')),
  addressed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  addressed_by_name TEXT,
  addressed_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Performance indexes
CREATE INDEX IF NOT EXISTS idx_doubts_student_status 
  ON public.doubts (student_id, status);

CREATE INDEX IF NOT EXISTS idx_doubts_batch_status 
  ON public.doubts (batch_id, status);

CREATE INDEX IF NOT EXISTS idx_doubts_subject_status 
  ON public.doubts (subject, status);

CREATE INDEX IF NOT EXISTS idx_doubts_status_created 
  ON public.doubts (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_doubts_study_card_id
  ON public.doubts (study_card_id);

CREATE INDEX IF NOT EXISTS idx_doubts_created_at
  ON public.doubts (created_at DESC);

-- 3. Enable Row-Level Security
ALTER TABLE public.doubts ENABLE ROW LEVEL SECURITY;

-- 4. Authoritative Integrity & Immutability Triggers

-- Trigger 4A: Enforce Insert Integrity & Anti-Forgery
CREATE OR REPLACE FUNCTION public.enforce_doubt_insert_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_role TEXT;
  v_student_name TEXT;
  v_roll_number TEXT;
  v_batch_id UUID;
  v_batch_name TEXT;
BEGIN
  -- Obtain caller role
  SELECT role, full_name INTO v_user_role, v_student_name
  FROM public.profiles
  WHERE id = auth.uid();

  -- Administrators are permitted to insert records directly without override
  IF v_user_role = 'admin' THEN
    NEW.updated_at := NOW();
    RETURN NEW;
  END IF;

  -- For student insertions, strictly prevent identity and batch forgery
  IF auth.uid() IS NULL OR NEW.student_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Students may only raise doubts under their authenticated profile.';
  END IF;

  -- Authoritatively fetch authentic profile & enrollment values
  SELECT sp.roll_number, sp.batch_id, b.name
  INTO v_roll_number, v_batch_id, v_batch_name
  FROM public.student_profiles sp
  LEFT JOIN public.batches b ON b.id = sp.batch_id
  WHERE sp.id = auth.uid();

  -- Bind authentic values to the record
  NEW.student_name := COALESCE(v_student_name, NEW.student_name, 'Student');
  NEW.roll_number := v_roll_number;
  NEW.batch_id := v_batch_id;
  NEW.batch_name := v_batch_name;

  -- Force initial lifecycle state
  NEW.status := 'pending';
  NEW.addressed_by := NULL;
  NEW.addressed_by_name := NULL;
  NEW.addressed_at := NULL;
  NEW.resolution_notes := NULL;
  NEW.created_at := NOW();
  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_doubts_insert_integrity ON public.doubts;
CREATE TRIGGER trg_doubts_insert_integrity
  BEFORE INSERT ON public.doubts
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_doubt_insert_integrity();

-- Trigger 4B: Enforce Column Immutability & Status Transition Rules
CREATE OR REPLACE FUNCTION public.enforce_doubt_mutation_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_role TEXT;
  v_educator_name TEXT;
BEGIN
  SELECT role, full_name INTO v_user_role, v_educator_name
  FROM public.profiles
  WHERE id = auth.uid();

  -- Administrators retain full moderation and correction privileges
  IF v_user_role = 'admin' THEN
    NEW.updated_at := NOW();
    RETURN NEW;
  END IF;

  -- Protect immutable fields from unauthorized tampering by non-admins
  IF (OLD.student_id IS DISTINCT FROM NEW.student_id) OR
     (OLD.student_name IS DISTINCT FROM NEW.student_name) OR
     (OLD.roll_number IS DISTINCT FROM NEW.roll_number) OR
     (OLD.batch_id IS DISTINCT FROM NEW.batch_id) OR
     (OLD.batch_name IS DISTINCT FROM NEW.batch_name) OR
     (OLD.subject IS DISTINCT FROM NEW.subject) OR
     (OLD.study_card_id IS DISTINCT FROM NEW.study_card_id) OR
     (OLD.lecture_title IS DISTINCT FROM NEW.lecture_title) OR
     (OLD.video_url IS DISTINCT FROM NEW.video_url) OR
     (OLD.timestamp_seconds IS DISTINCT FROM NEW.timestamp_seconds) OR
     (OLD.question IS DISTINCT FROM NEW.question) OR
     (OLD.created_at IS DISTINCT FROM NEW.created_at) THEN
    RAISE EXCEPTION 'Immutable doubt fields (student identity, lecture, question, timestamp, batch) cannot be modified.';
  END IF;

  -- Lifecycle transition rules for educators
  IF OLD.status = 'addressed' AND NEW.status = 'pending' THEN
    RAISE EXCEPTION 'Unauthorized: Addressed doubts cannot be reopened except by an administrator.';
  END IF;

  IF NEW.status = 'addressed' THEN
    NEW.addressed_by := auth.uid();
    NEW.addressed_by_name := COALESCE(NEW.addressed_by_name, v_educator_name, 'Educator');
    NEW.addressed_at := COALESCE(NEW.addressed_at, NOW());
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_doubts_mutation_rules ON public.doubts;
CREATE TRIGGER trg_doubts_mutation_rules
  BEFORE UPDATE ON public.doubts
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_doubt_mutation_rules();

-- 5. Row-Level Security Policies

-- Drop existing policies if any to ensure clean idempotent execution
DROP POLICY IF EXISTS "doubts: student select own" ON public.doubts;
DROP POLICY IF EXISTS "doubts: student insert own" ON public.doubts;
DROP POLICY IF EXISTS "doubts: student delete own" ON public.doubts;
DROP POLICY IF EXISTS "doubts: teacher select assigned" ON public.doubts;
DROP POLICY IF EXISTS "doubts: teacher update addressed" ON public.doubts;
DROP POLICY IF EXISTS "doubts: admin select all" ON public.doubts;
DROP POLICY IF EXISTS "doubts: admin update all" ON public.doubts;
DROP POLICY IF EXISTS "doubts: admin delete all" ON public.doubts;

-- [Student Policy] Students can read only their own doubts
CREATE POLICY "doubts: student select own"
  ON public.doubts FOR SELECT
  USING (auth.uid() = student_id);

-- [Student Policy] Students can insert a doubt only for themselves
CREATE POLICY "doubts: student insert own"
  ON public.doubts FOR INSERT
  WITH CHECK (
    auth.uid() = student_id
    AND status = 'pending'
    AND addressed_by IS NULL
    AND addressed_at IS NULL
  );

-- [Student Policy] Students can delete their own doubts when cleared by self-study
CREATE POLICY "doubts: student delete own"
  ON public.doubts FOR DELETE
  USING (auth.uid() = student_id);

-- [Teacher Policy] Teachers can view doubts belonging to their assigned batches
-- Scoped to batches where the teacher is actively assigned (batches.teacher_id or ANY(batches.teacher_ids))
-- If teacher has a subject specialty, matches that subject or single-teacher batch
CREATE POLICY "doubts: teacher select assigned"
  ON public.doubts FOR SELECT
  USING (
    get_my_role() = 'teacher'
    AND doubts.batch_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.batches b
      WHERE b.id = doubts.batch_id
        AND (b.teacher_id = auth.uid() OR auth.uid() = ANY(b.teacher_ids))
        AND (
          NOT EXISTS (
            SELECT 1 FROM public.teacher_profiles tp
            WHERE tp.id = auth.uid()
              AND tp.subject IS NOT NULL
              AND TRIM(tp.subject) <> ''
          )
          OR EXISTS (
            SELECT 1 FROM public.teacher_profiles tp
            WHERE tp.id = auth.uid()
              AND LOWER(TRIM(tp.subject)) = LOWER(TRIM(doubts.subject))
          )
          OR (b.teacher_id = auth.uid() AND (b.teacher_ids IS NULL OR array_length(b.teacher_ids, 1) <= 1))
        )
    )
  );

-- [Teacher Policy] Teachers can update status to 'addressed' in assigned batches
CREATE POLICY "doubts: teacher update addressed"
  ON public.doubts FOR UPDATE
  USING (
    get_my_role() = 'teacher'
    AND doubts.batch_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.batches b
      WHERE b.id = doubts.batch_id
        AND (b.teacher_id = auth.uid() OR auth.uid() = ANY(b.teacher_ids))
        AND (
          NOT EXISTS (
            SELECT 1 FROM public.teacher_profiles tp
            WHERE tp.id = auth.uid()
              AND tp.subject IS NOT NULL
              AND TRIM(tp.subject) <> ''
          )
          OR EXISTS (
            SELECT 1 FROM public.teacher_profiles tp
            WHERE tp.id = auth.uid()
              AND LOWER(TRIM(tp.subject)) = LOWER(TRIM(doubts.subject))
          )
          OR (b.teacher_id = auth.uid() AND (b.teacher_ids IS NULL OR array_length(b.teacher_ids, 1) <= 1))
        )
    )
  )
  WITH CHECK (
    get_my_role() = 'teacher'
    AND status = 'addressed'
    AND addressed_by = auth.uid()
  );

-- [Admin Policy] Admin has unrestricted full access across all operations
CREATE POLICY "doubts: admin select all"
  ON public.doubts FOR SELECT
  USING (is_admin());

-- Notice: WITH CHECK (is_admin()) on UPDATE allows administrators to moderate any field
CREATE POLICY "doubts: admin update all"
  ON public.doubts FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "doubts: admin delete all"
  ON public.doubts FOR DELETE
  USING (is_admin());

-- 6. Permissions Grant
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doubts TO authenticated;

-- 7. Realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'doubts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.doubts;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;
