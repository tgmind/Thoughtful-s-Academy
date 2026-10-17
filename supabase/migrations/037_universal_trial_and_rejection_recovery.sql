-- ============================================================
-- 037_universal_trial_and_rejection_recovery.sql
-- Universal 2-Day Free Trial, Admin Overrides & Fee Waivers,
-- Provisional Payment Unlocks, and Notification RLS Parity
-- ============================================================

-- 1. Create table for explicit administrative access overrides and fee waivers
CREATE TABLE IF NOT EXISTS admin_access_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  grant_type TEXT NOT NULL CHECK (grant_type IN ('full_access_override', 'monthly_fee_waiver', 'trial_extension')),
  billing_month TEXT, -- populated for monthly_fee_waiver e.g. 'October 2026'
  valid_until TIMESTAMPTZ, -- populated for trial_extension or temporary full_access_override
  granted_by UUID NOT NULL REFERENCES profiles(id),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for lightning fast evaluation in is_batch_access_active
CREATE INDEX IF NOT EXISTS idx_aao_student_batch ON admin_access_overrides(student_id, batch_id, grant_type);
CREATE INDEX IF NOT EXISTS idx_aao_student_month ON admin_access_overrides(student_id, billing_month);

-- RLS for admin_access_overrides
ALTER TABLE admin_access_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_access_overrides: admin manage" ON admin_access_overrides;
CREATE POLICY "admin_access_overrides: admin manage"
  ON admin_access_overrides
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin_access_overrides: student read own" ON admin_access_overrides;
CREATE POLICY "admin_access_overrides: student read own"
  ON admin_access_overrides
  FOR SELECT
  USING (auth.uid() = student_id OR is_admin());

-- Add to realtime publication safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'admin_access_overrides'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE admin_access_overrides;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

-- 2. Trigger on student_profiles to protect trial_ends_at from student tampering
-- and guarantee default 48-hour universal trial
CREATE OR REPLACE FUNCTION protect_student_profile_trial()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Ensure newly created student profile gets 48h trial if not explicitly set
    IF NEW.trial_ends_at IS NULL THEN
      NEW.trial_ends_at := NOW() + INTERVAL '2 days';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- If caller is a student, prevent altering trial_ends_at
    IF NOT is_admin() AND OLD.trial_ends_at IS DISTINCT FROM NEW.trial_ends_at THEN
      NEW.trial_ends_at := OLD.trial_ends_at;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_student_profile_trial ON student_profiles;
CREATE TRIGGER trg_protect_student_profile_trial
  BEFORE INSERT OR UPDATE ON student_profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_student_profile_trial();

-- 3. Hardened is_batch_access_active with account suspension, admin overrides, 
-- trial status, provisional pending payment access, and one-time/monthly validity
CREATE OR REPLACE FUNCTION is_batch_access_active(p_student_id UUID, p_batch_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER STABLE
SET search_path = public, pg_temp
LANGUAGE plpgsql AS $$
DECLARE
  v_caller_role TEXT;
  v_is_active BOOLEAN;
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

  -- 1. Account suspension precedence: If user account is deactivated/suspended, deny immediately
  SELECT is_active INTO v_is_active FROM profiles WHERE id = p_student_id;
  IF v_is_active IS FALSE THEN
    RETURN false;
  END IF;

  -- 2. Admin override
  IF is_admin() THEN
    RETURN true;
  END IF;

  -- 3. Teacher override
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();
  IF v_caller_role = 'teacher' THEN
    RETURN true;
  END IF;

  -- 4. Cross-student probing isolation
  IF auth.uid() IS NOT NULL AND v_caller_role = 'student' AND p_student_id != auth.uid() THEN
    RETURN false;
  END IF;

  -- Compute current month and day in IST
  v_current_day := EXTRACT(DAY FROM NOW() AT TIME ZONE 'Asia/Kolkata');
  v_current_month := TO_CHAR(NOW() AT TIME ZONE 'Asia/Kolkata', 'FMMonth YYYY');

  -- 5. Administrative Access Overrides / Fee Waivers
  IF EXISTS (
    SELECT 1 FROM admin_access_overrides
    WHERE student_id = p_student_id
      AND batch_id = p_batch_id
      AND (
        (grant_type = 'full_access_override' AND (valid_until IS NULL OR valid_until >= NOW()))
        OR
        (grant_type = 'monthly_fee_waiver' AND billing_month = v_current_month)
      )
  ) THEN
    RETURN true;
  END IF;

  -- 6. Free Trial Active Check
  SELECT trial_ends_at INTO v_trial_ends
  FROM student_profiles
  WHERE id = p_student_id;

  IF v_trial_ends IS NOT NULL AND v_trial_ends > NOW() THEN
    RETURN true;
  END IF;

  -- 7. Batch details & free batch check
  SELECT fee_mode, COALESCE(fee_amount, 0)
  INTO v_fee_mode, v_fee_amount
  FROM batches
  WHERE id = p_batch_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_fee_amount <= 0 THEN
    RETURN true;
  END IF;

  -- 8. Mode 1: MONTHLY FEE
  IF v_fee_mode = 'monthly' THEN
    -- Check for verified fee record for current month
    IF EXISTS (
      SELECT 1 FROM fee_records
      WHERE student_id = p_student_id
        AND (batch_id = p_batch_id OR batch_id IS NULL)
        AND payment_month = v_current_month
        AND status = 'verified'
    ) THEN
      RETURN true;
    END IF;

    -- Check for pending fee record (Provisional Unlock during verification)
    IF EXISTS (
      SELECT 1 FROM fee_records
      WHERE student_id = p_student_id
        AND (batch_id = p_batch_id OR batch_id IS NULL)
        AND payment_month = v_current_month
        AND status = 'pending'
    ) THEN
      RETURN true;
    END IF;

    -- Grace period: Days 1-10 are active if student has not been rejected for this month
    IF v_current_day <= 10 THEN
      -- If student submitted and got rejected, they are not allowed grace bypass without new submission
      IF NOT EXISTS (
        SELECT 1 FROM fee_records
        WHERE student_id = p_student_id
          AND (batch_id = p_batch_id OR batch_id IS NULL)
          AND payment_month = v_current_month
          AND status = 'rejected'
      ) THEN
        RETURN true;
      END IF;
    END IF;

    -- Day 11+ or rejected without pending/verified -> frozen
    RETURN false;
  END IF;

  -- 9. Mode 2: ONE-TIME FEE
  IF v_fee_mode = 'one_time' THEN
    -- Check for pending fee record (Provisional Unlock during verification)
    IF EXISTS (
      SELECT 1 FROM fee_records
      WHERE student_id = p_student_id
        AND batch_id = p_batch_id
        AND status = 'pending'
    ) THEN
      RETURN true;
    END IF;

    -- Check for verified fee record with active validity
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
          ) IS NULL -- lifetime access
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

-- 4. Fix notifications: student read policy to allow students to receive direct/individual notifications
DROP POLICY IF EXISTS "notifications: student read" ON notifications;
CREATE POLICY "notifications: student read"
  ON notifications
  FOR SELECT
  USING (
    is_active = true
    AND (
      -- Broadcast or batch-scoped notifications
      (
        get_my_role() = 'student'
        AND target_role = ANY (ARRAY['student', 'all'])
        AND (
          target_batch_id IS NULL
          OR target_batch_id IN (
            SELECT student_profiles.batch_id
            FROM student_profiles
            WHERE student_profiles.id = auth.uid()
          )
        )
      )
      OR
      -- Individual direct notifications
      (
        target_role = 'individual'
        AND target_user_id = auth.uid()
      )
    )
    AND (scheduled_at IS NULL OR scheduled_at <= now())
    AND (expires_at IS NULL OR expires_at >= now())
  );
