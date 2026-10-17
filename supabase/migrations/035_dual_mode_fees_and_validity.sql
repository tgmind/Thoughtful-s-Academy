-- ============================================================
-- 035_dual_mode_fees_and_validity.sql
-- Dual-Mode Batch Fee Payment Architecture & Subscription Validity
--
-- 1. Batches table:
--    - fee_mode: 'monthly' | 'one_time' (default 'monthly')
--    - fee_amount: numeric (e.g. 1500.00)
--    - validity_days: integer (for duration-based one-time courses)
--    - validity_end_date: date (for fixed exam-date one-time courses)
--
-- 2. Fee records table:
--    - batch_id: uuid references batches(id)
--    - fee_mode: 'monthly' | 'one_time'
--    - valid_until: timestamptz
--
-- 3. Function is_batch_access_active(p_student_id, p_batch_id)
--    - Free trial bypass
--    - Monthly: Grace period Days 1-10; Day 11+ requires verified payment
--    - One-Time: Requires verified payment within valid_until window
--
-- 4. Trigger on fee_records:
--    - Automatically sets valid_until upon verification for one-time courses
--
-- 5. Updated RLS policies for study_cards, chapters, homework, and live_classes
-- ============================================================

-- 1. Batches schema enhancements
ALTER TABLE batches
  ADD COLUMN IF NOT EXISTS fee_mode TEXT NOT NULL DEFAULT 'monthly' CHECK (fee_mode IN ('monthly', 'one_time')),
  ADD COLUMN IF NOT EXISTS fee_amount NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS validity_days INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS validity_end_date DATE DEFAULT NULL;

-- 2. Fee records schema enhancements
ALTER TABLE fee_records
  ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fee_mode TEXT DEFAULT 'monthly' CHECK (fee_mode IN ('monthly', 'one_time')),
  ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ DEFAULT NULL;

-- Create indexes for performant access checks
CREATE INDEX IF NOT EXISTS idx_fee_records_student_batch_status ON fee_records(student_id, batch_id, status);
CREATE INDEX IF NOT EXISTS idx_fee_records_payment_month ON fee_records(payment_month);
CREATE INDEX IF NOT EXISTS idx_fee_records_valid_until ON fee_records(valid_until);

-- Backfill existing fee_records with student's current batch_id if unassigned
UPDATE fee_records f
SET batch_id = sp.batch_id
FROM student_profiles sp
WHERE f.student_id = sp.id
  AND f.batch_id IS NULL
  AND sp.batch_id IS NOT NULL;

-- 3. Trigger function to compute valid_until when a one-time fee record is verified
CREATE OR REPLACE FUNCTION compute_fee_record_validity()
RETURNS TRIGGER AS $$
DECLARE
  v_batch_mode TEXT;
  v_days INTEGER;
  v_end_date DATE;
BEGIN
  IF NEW.fee_mode = 'one_time' AND NEW.status = 'verified' AND NEW.valid_until IS NULL AND NEW.batch_id IS NOT NULL THEN
    SELECT fee_mode, validity_days, validity_end_date
    INTO v_batch_mode, v_days, v_end_date
    FROM batches
    WHERE id = NEW.batch_id;

    IF v_end_date IS NOT NULL THEN
      NEW.valid_until := (v_end_date::text || ' 23:59:59+05:30')::timestamptz;
    ELSIF v_days IS NOT NULL THEN
      NEW.valid_until := COALESCE(NEW.paid_at, NOW()) + (v_days || ' days')::interval;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_compute_fee_validity ON fee_records;
CREATE TRIGGER trg_compute_fee_validity
  BEFORE INSERT OR UPDATE OF status, fee_mode, batch_id
  ON fee_records
  FOR EACH ROW
  EXECUTE FUNCTION compute_fee_record_validity();

-- 4. Centralized Access Control Verification Function
CREATE OR REPLACE FUNCTION is_batch_access_active(p_student_id UUID, p_batch_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
  v_trial_ends TIMESTAMPTZ;
  v_fee_mode TEXT;
  v_fee_amount NUMERIC;
  v_current_day INTEGER;
  v_current_month TEXT;
BEGIN
  -- If batch_id is NULL, content is public/global
  IF p_batch_id IS NULL THEN
    RETURN true;
  END IF;

  -- Admin and teacher full override
  IF is_admin() THEN
    RETURN true;
  END IF;

  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
  IF v_role = 'teacher' THEN
    RETURN true;
  END IF;

  -- Verify student profile & trial status
  SELECT trial_ends_at INTO v_trial_ends
  FROM student_profiles
  WHERE id = p_student_id;

  -- Free trial active bypass
  IF v_trial_ends IS NOT NULL AND v_trial_ends > NOW() THEN
    RETURN true;
  END IF;

  -- Verify batch details
  SELECT fee_mode, COALESCE(fee_amount, 0)
  INTO v_fee_mode, v_fee_amount
  FROM batches
  WHERE id = p_batch_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Free batches are always active
  IF v_fee_amount <= 0 THEN
    RETURN true;
  END IF;

  -- Mode 1: MONTHLY FEE
  IF v_fee_mode = 'monthly' THEN
    -- In IST (Asia/Kolkata), check day of month
    v_current_day := EXTRACT(DAY FROM NOW() AT TIME ZONE 'Asia/Kolkata');
    -- Grace period: Days 1-10 are active
    IF v_current_day <= 10 THEN
      RETURN true;
    END IF;

    -- Day 11+: Requires verified fee record for the current month
    v_current_month := TO_CHAR(NOW() AT TIME ZONE 'Asia/Kolkata', 'FMMonth YYYY');
    RETURN EXISTS (
      SELECT 1 FROM fee_records
      WHERE student_id = p_student_id
        AND (batch_id = p_batch_id OR batch_id IS NULL)
        AND payment_month = v_current_month
        AND status = 'verified'
    );
  END IF;

  -- Mode 2: ONE-TIME FEE
  IF v_fee_mode = 'one_time' THEN
    RETURN EXISTS (
      SELECT 1 FROM fee_records
      WHERE student_id = p_student_id
        AND batch_id = p_batch_id
        AND status = 'verified'
        AND (valid_until IS NULL OR valid_until >= NOW())
    );
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 5. Update RLS on study_cards
DROP POLICY IF EXISTS "study_cards: enrolled student read" ON study_cards;
CREATE POLICY "study_cards: enrolled student read"
  ON study_cards FOR SELECT
  USING (
    is_active = true
    AND (
      is_public = true
      OR EXISTS (
        SELECT 1 FROM student_profiles sp
        WHERE sp.id = auth.uid()
          AND (
            (study_cards.batch_id IS NOT NULL AND sp.batch_id = study_cards.batch_id AND is_batch_access_active(auth.uid(), study_cards.batch_id))
            OR
            (study_cards.batch_ids IS NOT NULL AND sp.batch_id = ANY(study_cards.batch_ids) AND is_batch_access_active(auth.uid(), sp.batch_id))
          )
      )
    )
  );

-- 6. Update RLS on chapters
DROP POLICY IF EXISTS "chapters: read accessible" ON chapters;
CREATE POLICY "chapters: read accessible"
  ON chapters FOR SELECT
  USING (
    is_admin()
    OR get_my_role() = 'teacher'
    OR batch_id IS NULL
    OR (
      EXISTS (
        SELECT 1 FROM student_profiles sp
        WHERE sp.id = auth.uid()
          AND sp.batch_id = chapters.batch_id
          AND is_batch_access_active(auth.uid(), chapters.batch_id)
      )
    )
    OR auth.role() = 'anon'
  );

-- 7. Update RLS on homework
DROP POLICY IF EXISTS "homework: all read active" ON homework;
CREATE POLICY "homework: all read active"
  ON homework FOR SELECT
  USING (
    is_active = true
    AND (
      is_admin()
      OR get_my_role() = 'teacher'
      OR (
        get_my_role() = 'student'
        AND (
          batch_id IS NULL
          OR (
            EXISTS (
              SELECT 1 FROM student_profiles sp
              WHERE sp.id = auth.uid()
                AND sp.batch_id = homework.batch_id
                AND is_batch_access_active(auth.uid(), homework.batch_id)
            )
          )
        )
      )
    )
  );
