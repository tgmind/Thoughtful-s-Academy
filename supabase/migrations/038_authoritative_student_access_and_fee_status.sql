-- Migration 038: Authoritative Student Access & Fee Status Model
-- 1. Add created_at column to fee_records if not exists (with fallback to paid_at)
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'fee_records' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.fee_records ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    UPDATE public.fee_records SET created_at = COALESCE(paid_at, NOW()) WHERE created_at IS NULL;
  END IF;
END $do$;

CREATE INDEX IF NOT EXISTS idx_fee_records_created_at ON public.fee_records(created_at);
CREATE INDEX IF NOT EXISTS idx_fee_records_student_month ON public.fee_records(student_id, payment_month);
CREATE INDEX IF NOT EXISTS idx_fee_records_student_batch_status ON public.fee_records(student_id, batch_id, status);

-- 2. Hardened is_batch_access_active with target vs caller separation & deterministic precedence
CREATE OR REPLACE FUNCTION public.is_batch_access_active(p_student_id UUID, p_batch_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER STABLE
SET search_path = public, pg_temp
LANGUAGE plpgsql AS $func$
DECLARE
  v_caller_role TEXT;
  v_target_role TEXT;
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
  SELECT is_active, role INTO v_is_active, v_target_role FROM profiles WHERE id = p_student_id;
  IF v_is_active IS FALSE THEN
    RETURN false;
  END IF;

  -- 2. If target user is an admin or teacher, they have full access
  IF v_target_role IN ('admin', 'teacher') THEN
    RETURN true;
  END IF;

  -- 3. Cross-student probing isolation
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();
  IF auth.uid() IS NOT NULL AND v_caller_role = 'student' AND p_student_id != auth.uid() THEN
    RETURN false;
  END IF;

  -- Compute current month and day in IST
  v_current_day := EXTRACT(DAY FROM NOW() AT TIME ZONE 'Asia/Kolkata');
  v_current_month := TO_CHAR(NOW() AT TIME ZONE 'Asia/Kolkata', 'FMMonth YYYY');

  -- 4. Administrative Access Overrides / Fee Waivers
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

  -- 5. Batch details & free batch check
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

  -- 6. Mode 1: MONTHLY FEE
  IF v_fee_mode = 'monthly' THEN
    -- A. Verified fee record for current month
    IF EXISTS (
      SELECT 1 FROM fee_records
      WHERE student_id = p_student_id
        AND (batch_id = p_batch_id OR batch_id IS NULL)
        AND payment_month = v_current_month
        AND status = 'verified'
    ) THEN
      RETURN true;
    END IF;

    -- B. Pending fee record (Provisional Unlock during verification)
    IF EXISTS (
      SELECT 1 FROM fee_records
      WHERE student_id = p_student_id
        AND (batch_id = p_batch_id OR batch_id IS NULL)
        AND payment_month = v_current_month
        AND status = 'pending'
    ) THEN
      RETURN true;
    END IF;

    -- C. Universal Free Trial Active
    SELECT trial_ends_at INTO v_trial_ends
    FROM student_profiles
    WHERE id = p_student_id;

    IF v_trial_ends IS NOT NULL AND v_trial_ends > NOW() THEN
      RETURN true;
    END IF;

    -- D. Grace period: Days 1-10 are active if student has not been rejected for this month
    IF v_current_day <= 10 THEN
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

  -- 7. Mode 2: ONE-TIME FEE
  IF v_fee_mode = 'one_time' THEN
    -- A. Pending fee record (Provisional Unlock during verification)
    IF EXISTS (
      SELECT 1 FROM fee_records
      WHERE student_id = p_student_id
        AND batch_id = p_batch_id
        AND status = 'pending'
    ) THEN
      RETURN true;
    END IF;

    -- B. Verified fee record with active validity
    IF EXISTS (
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
          ) >= NOW() -- not yet expired
        )
    ) THEN
      RETURN true;
    END IF;

    -- C. Universal Free Trial Active
    SELECT trial_ends_at INTO v_trial_ends
    FROM student_profiles
    WHERE id = p_student_id;

    IF v_trial_ends IS NOT NULL AND v_trial_ends > NOW() THEN
      RETURN true;
    END IF;

    -- Otherwise frozen
    RETURN false;
  END IF;

  RETURN false;
END;
$func$;

-- 3. Authoritative RPC function: get_student_batch_access_status
CREATE OR REPLACE FUNCTION public.get_student_batch_access_status(p_student_id UUID, p_batch_id UUID)
RETURNS JSONB
SECURITY DEFINER STABLE
SET search_path = public, pg_temp
LANGUAGE plpgsql AS $func$
DECLARE
  v_is_active BOOLEAN;
  v_target_role TEXT;
  v_trial_ends TIMESTAMPTZ;
  v_batch_name TEXT;
  v_fee_mode TEXT;
  v_fee_amount NUMERIC;
  v_validity_days INTEGER;
  v_validity_end_date DATE;
  v_current_day INTEGER;
  v_current_month TEXT;
  v_override RECORD;
  v_verified RECORD;
  v_pending RECORD;
  v_rejected RECORD;
  v_hours_left INTEGER;
  v_calc_validity TIMESTAMPTZ;
BEGIN
  -- 1. Account suspended
  SELECT is_active, role INTO v_is_active, v_target_role FROM profiles WHERE id = p_student_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'is_active', false,
      'is_frozen', true,
      'status', 'data_error',
      'display_label', 'Data Error / Unable to Determine',
      'reason', 'Student profile record not found'
    );
  END IF;

  IF v_is_active IS FALSE THEN
    RETURN jsonb_build_object(
      'is_active', false,
      'is_frozen', true,
      'status', 'suspended',
      'display_label', 'Account Suspended',
      'reason', 'Student account is suspended by administrator'
    );
  END IF;

  -- 2. No batch assigned
  IF p_batch_id IS NULL THEN
    RETURN jsonb_build_object(
      'is_active', false,
      'is_frozen', false,
      'status', 'unenrolled',
      'display_label', 'Unenrolled',
      'reason', 'Student is not currently enrolled in any batch'
    );
  END IF;

  -- 3. Batch lookup
  SELECT name, fee_mode, COALESCE(fee_amount, 0), validity_days, validity_end_date
  INTO v_batch_name, v_fee_mode, v_fee_amount, v_validity_days, v_validity_end_date
  FROM batches WHERE id = p_batch_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'is_active', false,
      'is_frozen', true,
      'status', 'data_error',
      'display_label', 'Data Error / Unable to Determine',
      'reason', 'Enrolled batch record not found'
    );
  END IF;

  -- Free batch
  IF v_fee_amount <= 0 THEN
    RETURN jsonb_build_object(
      'is_active', true,
      'is_frozen', false,
      'status', 'free_batch',
      'display_label', 'Free Batch',
      'reason', 'Batch fee amount is zero (free enrollment)',
      'batch_name', v_batch_name,
      'fee_mode', v_fee_mode
    );
  END IF;

  v_current_day := EXTRACT(DAY FROM NOW() AT TIME ZONE 'Asia/Kolkata');
  v_current_month := TO_CHAR(NOW() AT TIME ZONE 'Asia/Kolkata', 'FMMonth YYYY');

  -- 4. Admin Access Overrides / Fee Waivers
  SELECT * INTO v_override FROM admin_access_overrides
  WHERE student_id = p_student_id
    AND batch_id = p_batch_id
    AND (
      (grant_type = 'full_access_override' AND (valid_until IS NULL OR valid_until >= NOW()))
      OR
      (grant_type = 'monthly_fee_waiver' AND billing_month = v_current_month)
    )
  ORDER BY created_at DESC LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'is_active', true,
      'is_frozen', false,
      'status', 'admin_override',
      'display_label', 'Access Granted / Fee Waived',
      'reason', COALESCE(v_override.reason, 'Access granted by administrative waiver'),
      'grant_type', v_override.grant_type,
      'billing_month', v_override.billing_month,
      'valid_until', v_override.valid_until,
      'batch_name', v_batch_name,
      'fee_mode', v_fee_mode
    );
  END IF;

  -- 5. MONTHLY FEE MODE
  IF v_fee_mode = 'monthly' THEN
    -- Check verified
    SELECT * INTO v_verified FROM fee_records
    WHERE student_id = p_student_id
      AND (batch_id = p_batch_id OR batch_id IS NULL)
      AND payment_month = v_current_month
      AND status = 'verified'
    ORDER BY paid_at DESC LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'is_active', true,
        'is_frozen', false,
        'status', 'fee_paid',
        'display_label', 'Fee Paid / Verified',
        'reason', 'Monthly fee verified for ' || v_current_month,
        'payment_month', v_current_month,
        'reference_id', v_verified.reference_id,
        'paid_at', v_verified.paid_at,
        'batch_name', v_batch_name,
        'fee_mode', v_fee_mode
      );
    END IF;

    -- Check pending (provisional)
    SELECT * INTO v_pending FROM fee_records
    WHERE student_id = p_student_id
      AND (batch_id = p_batch_id OR batch_id IS NULL)
      AND payment_month = v_current_month
      AND status = 'pending'
    ORDER BY paid_at DESC LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'is_active', true,
        'is_frozen', false,
        'status', 'provisional_access',
        'display_label', 'Provisional Access',
        'reason', 'Payment proof submitted for ' || v_current_month || ' · Under review',
        'payment_month', v_current_month,
        'reference_id', v_pending.reference_id,
        'paid_at', v_pending.paid_at,
        'batch_name', v_batch_name,
        'fee_mode', v_fee_mode
      );
    END IF;

    -- Check rejection
    SELECT * INTO v_rejected FROM fee_records
    WHERE student_id = p_student_id
      AND (batch_id = p_batch_id OR batch_id IS NULL)
      AND payment_month = v_current_month
      AND status = 'rejected'
    ORDER BY paid_at DESC LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'is_active', false,
        'is_frozen', true,
        'status', 'rejected',
        'display_label', 'Payment Rejected / Access Frozen',
        'reason', 'Payment rejected by admin' || CASE WHEN v_rejected.notes IS NOT NULL AND v_rejected.notes != '' THEN ': ' || v_rejected.notes ELSE '' END,
        'payment_month', v_current_month,
        'reference_id', v_rejected.reference_id,
        'batch_name', v_batch_name,
        'fee_mode', v_fee_mode
      );
    END IF;

    -- Check Universal Free Trial
    SELECT trial_ends_at INTO v_trial_ends FROM student_profiles WHERE id = p_student_id;
    IF v_trial_ends IS NOT NULL THEN
      IF v_trial_ends > NOW() THEN
        v_hours_left := GREATEST(1, FLOOR(EXTRACT(EPOCH FROM (v_trial_ends - NOW())) / 3600)::integer);
        RETURN jsonb_build_object(
          'is_active', true,
          'is_frozen', false,
          'status', CASE WHEN v_hours_left <= 6 THEN 'trial_expiring' ELSE 'trial' END,
          'display_label', CASE 
            WHEN v_hours_left <= 6 THEN 'Trial Expiring (' || v_hours_left || 'h)'
            ELSE 'Trial Active (' || v_hours_left || 'h)'
          END,
          'reason', 'Active free trial until ' || TO_CHAR(v_trial_ends AT TIME ZONE 'Asia/Kolkata', 'DD Mon YYYY HH12:MI AM'),
          'trial_ends_at', v_trial_ends,
          'trial_hours_left', v_hours_left,
          'batch_name', v_batch_name,
          'fee_mode', v_fee_mode
        );
      END IF;
    END IF;

    -- Monthly Grace Period: Days 1-10
    IF v_current_day <= 10 THEN
      RETURN jsonb_build_object(
        'is_active', true,
        'is_frozen', false,
        'status', 'grace_period',
        'display_label', 'Fee Due / Grace Period',
        'reason', 'Monthly fee for ' || v_current_month || ' due by 10th (' || (11 - v_current_day) || ' days left)',
        'payment_month', v_current_month,
        'batch_name', v_batch_name,
        'fee_mode', v_fee_mode
      );
    END IF;

    -- Day 11+ Unpaid
    IF v_trial_ends IS NOT NULL AND v_trial_ends <= NOW() THEN
      RETURN jsonb_build_object(
        'is_active', false,
        'is_frozen', true,
        'status', 'trial_expired',
        'display_label', 'Trial Expired / Access Frozen',
        'reason', 'Free trial expired on ' || TO_CHAR(v_trial_ends AT TIME ZONE 'Asia/Kolkata', 'DD Mon YYYY') || ' · Monthly payment required',
        'trial_ends_at', v_trial_ends,
        'payment_month', v_current_month,
        'batch_name', v_batch_name,
        'fee_mode', v_fee_mode
      );
    END IF;

    RETURN jsonb_build_object(
      'is_active', false,
      'is_frozen', true,
      'status', 'fee_overdue',
      'display_label', 'Fee Overdue / Access Frozen',
      'reason', 'Monthly fee for ' || v_current_month || ' overdue past 10th cutoff',
      'payment_month', v_current_month,
      'batch_name', v_batch_name,
      'fee_mode', v_fee_mode
    );
  END IF;

  -- 6. ONE-TIME FEE MODE
  IF v_fee_mode = 'one_time' THEN
    -- Check pending
    SELECT * INTO v_pending FROM fee_records
    WHERE student_id = p_student_id
      AND batch_id = p_batch_id
      AND status = 'pending'
    ORDER BY paid_at DESC LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'is_active', true,
        'is_frozen', false,
        'status', 'provisional_access',
        'display_label', 'Provisional Access',
        'reason', 'Course fee proof submitted · Under review',
        'reference_id', v_pending.reference_id,
        'paid_at', v_pending.paid_at,
        'batch_name', v_batch_name,
        'fee_mode', v_fee_mode
      );
    END IF;

    -- Check verified
    SELECT * INTO v_verified FROM fee_records
    WHERE student_id = p_student_id
      AND batch_id = p_batch_id
      AND status = 'verified'
    ORDER BY paid_at DESC LIMIT 1;

    IF FOUND THEN
      v_calc_validity := COALESCE(
        v_verified.valid_until,
        CASE
          WHEN v_validity_end_date IS NOT NULL THEN (v_validity_end_date::text || ' 23:59:59+05:30')::timestamptz
          WHEN v_validity_days IS NOT NULL THEN COALESCE(v_verified.paid_at, NOW()) + (v_validity_days || ' days')::interval
          ELSE NULL
        END
      );

      IF v_calc_validity IS NULL OR v_calc_validity >= NOW() THEN
        RETURN jsonb_build_object(
          'is_active', true,
          'is_frozen', false,
          'status', 'fee_paid',
          'display_label', 'Fee Paid / Verified',
          'reason', CASE 
            WHEN v_calc_validity IS NULL THEN 'Lifetime course access verified'
            ELSE 'Course access verified until ' || TO_CHAR(v_calc_validity AT TIME ZONE 'Asia/Kolkata', 'DD Mon YYYY')
          END,
          'valid_until', v_calc_validity,
          'reference_id', v_verified.reference_id,
          'paid_at', v_verified.paid_at,
          'batch_name', v_batch_name,
          'fee_mode', v_fee_mode
        );
      ELSE
        RETURN jsonb_build_object(
          'is_active', false,
          'is_frozen', true,
          'status', 'validity_expired',
          'display_label', 'Course Validity Expired / Access Frozen',
          'reason', 'Course validity expired on ' || TO_CHAR(v_calc_validity AT TIME ZONE 'Asia/Kolkata', 'DD Mon YYYY'),
          'valid_until', v_calc_validity,
          'reference_id', v_verified.reference_id,
          'batch_name', v_batch_name,
          'fee_mode', v_fee_mode
        );
      END IF;
    END IF;

    -- Check rejected
    SELECT * INTO v_rejected FROM fee_records
    WHERE student_id = p_student_id
      AND batch_id = p_batch_id
      AND status = 'rejected'
    ORDER BY paid_at DESC LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'is_active', false,
        'is_frozen', true,
        'status', 'rejected',
        'display_label', 'Payment Rejected / Access Frozen',
        'reason', 'Course payment rejected by admin' || CASE WHEN v_rejected.notes IS NOT NULL AND v_rejected.notes != '' THEN ': ' || v_rejected.notes ELSE '' END,
        'reference_id', v_rejected.reference_id,
        'batch_name', v_batch_name,
        'fee_mode', v_fee_mode
      );
    END IF;

    -- Check Universal Free Trial
    SELECT trial_ends_at INTO v_trial_ends FROM student_profiles WHERE id = p_student_id;
    IF v_trial_ends IS NOT NULL THEN
      IF v_trial_ends > NOW() THEN
        v_hours_left := GREATEST(1, FLOOR(EXTRACT(EPOCH FROM (v_trial_ends - NOW())) / 3600)::integer);
        RETURN jsonb_build_object(
          'is_active', true,
          'is_frozen', false,
          'status', CASE WHEN v_hours_left <= 6 THEN 'trial_expiring' ELSE 'trial' END,
          'display_label', CASE 
            WHEN v_hours_left <= 6 THEN 'Trial Expiring (' || v_hours_left || 'h)'
            ELSE 'Trial Active (' || v_hours_left || 'h)'
          END,
          'reason', 'Active free trial until ' || TO_CHAR(v_trial_ends AT TIME ZONE 'Asia/Kolkata', 'DD Mon YYYY HH12:MI AM'),
          'trial_ends_at', v_trial_ends,
          'trial_hours_left', v_hours_left,
          'batch_name', v_batch_name,
          'fee_mode', v_fee_mode
        );
      ELSE
        RETURN jsonb_build_object(
          'is_active', false,
          'is_frozen', true,
          'status', 'trial_expired',
          'display_label', 'Trial Expired / Access Frozen',
          'reason', 'Free trial expired on ' || TO_CHAR(v_trial_ends AT TIME ZONE 'Asia/Kolkata', 'DD Mon YYYY') || ' · Course payment required',
          'trial_ends_at', v_trial_ends,
          'batch_name', v_batch_name,
          'fee_mode', v_fee_mode
        );
      END IF;
    END IF;

    RETURN jsonb_build_object(
      'is_active', false,
      'is_frozen', true,
      'status', 'frozen',
      'display_label', 'Course Validity Expired / Access Frozen',
      'reason', 'Course payment required to unlock ' || v_batch_name,
      'batch_name', v_batch_name,
      'fee_mode', v_fee_mode
    );
  END IF;

  RETURN jsonb_build_object(
    'is_active', true,
    'is_frozen', false,
    'status', 'active',
    'display_label', 'Active',
    'reason', 'Access active',
    'batch_name', v_batch_name,
    'fee_mode', v_fee_mode
  );
END;
$func$;
