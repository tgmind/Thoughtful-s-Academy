-- ============================================================
-- 036_fee_access_hardening_and_resource_rls.sql
-- Forensic Security Hardening, Resource RLS & Fee Integrity
--
-- 1. Hardened SECURITY DEFINER functions with explicit search_path:
--    - is_batch_access_active: cross-student RPC isolation,
--      fallback parity for one-time validity calculations.
--    - compute_fee_record_validity: automatic cleanup on rejection.
--
-- 2. Hardened RLS policies:
--    - live_classes: prevent cross-batch meeting link/password leakage
--      and block frozen batch access.
--    - fee_records: enforce valid_until IS NULL on student insert.
--    - homework_submissions: enforce is_batch_access_active on submission.
--    - doubts: enforce is_batch_access_active on batch doubt creation.
-- ============================================================

-- 1. Hardened compute_fee_record_validity with search_path and rejection cleanup
CREATE OR REPLACE FUNCTION compute_fee_record_validity()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql AS $$
DECLARE
  v_days INTEGER;
  v_end_date DATE;
BEGIN
  -- If verified and one_time, ensure valid_until is set
  IF NEW.fee_mode = 'one_time' AND NEW.status = 'verified' AND NEW.batch_id IS NOT NULL THEN
    IF NEW.valid_until IS NULL THEN
      SELECT validity_days, validity_end_date
      INTO v_days, v_end_date
      FROM batches
      WHERE id = NEW.batch_id;

      IF v_end_date IS NOT NULL THEN
        NEW.valid_until := (v_end_date::text || ' 23:59:59+05:30')::timestamptz;
      ELSIF v_days IS NOT NULL THEN
        NEW.valid_until := COALESCE(NEW.paid_at, NOW()) + (v_days || ' days')::interval;
      END IF;
    END IF;
  ELSIF NEW.status IN ('rejected', 'pending') THEN
    -- Clear validity if rejected or reset to pending
    NEW.valid_until := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_compute_fee_validity ON fee_records;
CREATE TRIGGER trg_compute_fee_validity
  BEFORE INSERT OR UPDATE OF status, fee_mode, batch_id
  ON fee_records
  FOR EACH ROW
  EXECUTE FUNCTION compute_fee_record_validity();

-- 2. Hardened is_batch_access_active with search_path and cross-student isolation
CREATE OR REPLACE FUNCTION is_batch_access_active(p_student_id UUID, p_batch_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER STABLE
SET search_path = public, pg_temp
LANGUAGE plpgsql AS $$
DECLARE
  v_caller_role TEXT;
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

  -- Admin override
  IF is_admin() THEN
    RETURN true;
  END IF;

  -- Teacher override
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();
  IF v_caller_role = 'teacher' THEN
    RETURN true;
  END IF;

  -- If caller is authenticated as student, prevent probing other students' batch access
  IF auth.uid() IS NOT NULL AND v_caller_role = 'student' AND p_student_id != auth.uid() THEN
    RETURN false;
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
      SELECT 1 FROM fee_records fr
      CROSS JOIN batches b
      WHERE fr.student_id = p_student_id
        AND fr.batch_id = p_batch_id
        AND b.id = p_batch_id
        AND fr.status = 'verified'
        AND (
          COALESCE(
            fr.valid_until,
            CASE
              WHEN b.validity_end_date IS NOT NULL THEN (b.validity_end_date::text || ' 23:59:59+05:30')::timestamptz
              WHEN b.validity_days IS NOT NULL THEN COALESCE(fr.paid_at, fr.created_at, NOW()) + (b.validity_days || ' days')::interval
              ELSE NULL
            END
          ) IS NULL -- truly lifetime access with no validity limits
          OR
          COALESCE(
            fr.valid_until,
            CASE
              WHEN b.validity_end_date IS NOT NULL THEN (b.validity_end_date::text || ' 23:59:59+05:30')::timestamptz
              WHEN b.validity_days IS NOT NULL THEN COALESCE(fr.paid_at, fr.created_at, NOW()) + (b.validity_days || ' days')::interval
              ELSE NULL
            END
          ) >= NOW()
        )
    );
  END IF;

  RETURN false;
END;
$$;

-- 3. Hardened RLS on fee_records: prevent student from injecting valid_until on insert
DROP POLICY IF EXISTS "fee_records: student insert" ON fee_records;
CREATE POLICY "fee_records: student insert"
  ON fee_records FOR INSERT
  WITH CHECK (
    (auth.uid() = student_id)
    AND ((status = 'pending') OR (status IS NULL))
    AND (verified_by IS NULL)
    AND (verified_at IS NULL)
    AND (valid_until IS NULL)
  );

-- 4. Hardened RLS on live_classes: prevent leakage of batch meeting links/passwords
DROP POLICY IF EXISTS "live_classes: all read active" ON live_classes;
DROP POLICY IF EXISTS "live_classes: authenticated read" ON live_classes;
DROP POLICY IF EXISTS "live_classes: read active batch or public" ON live_classes;

CREATE POLICY "live_classes: read active batch or public"
  ON live_classes FOR SELECT
  USING (
    is_admin()
    OR get_my_role() = 'teacher'
    OR (
      is_active = true
      AND (
        batch_id IS NULL
        OR EXISTS (
          SELECT 1 FROM student_profiles sp
          WHERE sp.id = auth.uid()
            AND sp.batch_id = live_classes.batch_id
            AND is_batch_access_active(auth.uid(), live_classes.batch_id)
        )
      )
    )
  );

-- 5. Hardened RLS on homework_submissions: prevent submission to frozen batches
DROP POLICY IF EXISTS "submissions: student insert" ON homework_submissions;
CREATE POLICY "submissions: student insert"
  ON homework_submissions FOR INSERT
  WITH CHECK (
    (auth.uid() = student_id)
    AND (grade IS NULL)
    AND (feedback IS NULL)
    AND EXISTS (
      SELECT 1 FROM homework h
      JOIN student_profiles sp ON sp.id = auth.uid()
      WHERE h.id = homework_submissions.homework_id
        AND (
          h.batch_id IS NULL
          OR (sp.batch_id = h.batch_id AND is_batch_access_active(auth.uid(), h.batch_id))
        )
    )
  );

-- 6. Hardened RLS on doubts: prevent doubt creation on frozen batches
DROP POLICY IF EXISTS "doubts: student insert own" ON doubts;
CREATE POLICY "doubts: student insert own"
  ON doubts FOR INSERT
  WITH CHECK (
    (auth.uid() = student_id)
    AND (status = 'pending')
    AND (addressed_by IS NULL)
    AND (addressed_at IS NULL)
    AND (
      batch_id IS NULL
      OR is_batch_access_active(auth.uid(), batch_id)
    )
  );
