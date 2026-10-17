/**
 * Dual-Mode Batch Fee Access Control & Subscription Validity Utility
 *
 * Supported Modes:
 * 1. Monthly Fee Mode:
 *    - Grace Period: Days 1–10 of each calendar month (IST). Full access granted.
 *    - Cutoff: Day 11+ requires verified payment record for the current month.
 *    - Unpaid / rejected day 11+ locks access exclusively to this batch.
 *
 * 2. One-Time Fee Mode:
 *    - Crash courses, short-duration batches, and exam prep courses.
 *    - Validity: Configurable via validity_days (e.g. 90/180/365 days from payment)
 *      or validity_end_date (fixed exam cutoff date).
 *    - Access is locked until payment is verified, and automatically expires when validity ends.
 *
 * Free Trial:
 *    - Student profiles with trial_ends_at > NOW() bypass fee restrictions.
 */

export const FEE_MODES = {
  MONTHLY: 'monthly',
  ONE_TIME: 'one_time',
}

export const BATCH_ACCESS_STATUS = {
  ACTIVE: 'active',
  FEE_PAID: 'fee_paid',
  GRACE_PERIOD: 'grace_period',
  FEE_DUE: 'fee_due',
  FROZEN: 'frozen',
  FEE_OVERDUE: 'fee_overdue',
  EXPIRED: 'expired',
  VALIDITY_EXPIRED: 'validity_expired',
  TRIAL: 'trial',
  TRIAL_EXPIRING: 'trial_expiring',
  TRIAL_EXPIRED: 'trial_expired',
  PROVISIONAL_ACCESS: 'provisional_access',
  PENDING_VERIFICATION: 'pending_verification',
  REJECTED: 'rejected',
  ADMIN_OVERRIDE: 'admin_override',
  SUSPENDED: 'suspended',
  UNENROLLED: 'unenrolled',
  FREE_BATCH: 'free_batch',
  DATA_ERROR: 'data_error',
}

/**
 * Returns a Date object shifted to Indian Standard Time (UTC+5:30)
 */
export function getIndianDate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date)
  // Calculate UTC time in ms, add 5.5 hours for IST
  const utcMs = d.getTime() + (d.getTimezoneOffset() * 60000)
  return new Date(utcMs + (5.5 * 3600000))
}

/**
 * Returns current day of month in IST (1-31)
 */
export function getIndianDay(date = new Date()) {
  return getIndianDate(date).getDate()
}

/**
 * Returns month string in standard format e.g. "October 2026"
 */
export function getCurrentPaymentMonth(date = new Date()) {
  const ist = getIndianDate(date)
  return ist.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

/**
 * Generates an array of the last N months and next M months in IST
 */
export function getAvailablePaymentMonths(past = 3, future = 2, baseDate = new Date()) {
  const months = []
  const base = getIndianDate(baseDate)
  for (let i = -past; i <= future; i++) {
    const d = new Date(base.getFullYear(), base.getMonth() + i, 1)
    months.push(d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }))
  }
  return months
}

/**
 * Authoritative Batch Access-Control Evaluator
 *
 * Precedence:
 * 1. Account Suspended (profiles.is_active = false) -> Denied
 * 2. Public Content (batch_id is null) -> Granted
 * 3. Free Batch (fee_amount <= 0) -> Granted
 * 4. Administrative Override / Monthly Fee Waiver -> Granted
 * 5. Active Universal 2-Day Trial -> Granted
 * 6. Verified Payment -> Granted
 * 7. Pending Payment -> Provisional Unlock Granted during verification
 * 8. Rejected Payment -> Denied / Frozen (unless other valid entitlement)
 * 9. Monthly Grace Period (Days 1–10 IST) -> Granted for eligible enrolled students
 * 10. Trial Expired / Grace Expired / Validity Expired -> Denied / Frozen
 */
export function checkBatchFeeStatus({
  student,
  batch,
  feeRecords = [],
  adminOverrides = [],
  referenceDate = new Date(),
} = {}) {
  // If student has explicit data error flag
  if (student?._dataError) {
    return {
      isActive: false,
      isFrozen: true,
      status: BATCH_ACCESS_STATUS.DATA_ERROR,
      display_label: 'Data Error / Unable to Determine',
      feeMode: batch?.fee_mode || FEE_MODES.MONTHLY,
      feeAmount: Number(batch?.fee_amount) || 0,
      message: 'Unable to determine access status due to database or network error.',
    }
  }

  // 1. Account Suspension: Highest precedence restriction
  if (student?.is_active === false) {
    return {
      isActive: false,
      isFrozen: true,
      isSuspended: true,
      status: BATCH_ACCESS_STATUS.SUSPENDED,
      display_label: 'Account Suspended',
      feeMode: batch?.fee_mode || FEE_MODES.MONTHLY,
      feeAmount: Number(batch?.fee_amount) || 0,
      message: 'Account is suspended. Please contact the administrator.',
    }
  }

  // 2. Unenrolled / No Batch Assigned
  if (!batch) {
    if (student) {
      return {
        isActive: false,
        isFrozen: false,
        isUnenrolled: true,
        status: BATCH_ACCESS_STATUS.UNENROLLED,
        display_label: 'Unenrolled',
        feeMode: FEE_MODES.MONTHLY,
        feeAmount: 0,
        message: 'Student is not currently enrolled in any batch',
      }
    }
    return {
      isActive: true,
      isFrozen: false,
      status: BATCH_ACCESS_STATUS.ACTIVE,
      display_label: 'Active',
      feeMode: FEE_MODES.MONTHLY,
      feeAmount: 0,
      message: 'Global content',
    }
  }

  const feeMode = batch.fee_mode || FEE_MODES.MONTHLY
  const feeAmount = Number(batch.fee_amount) || 0

  // 3. Free Batches (fee_amount <= 0) are always accessible
  if (feeAmount <= 0) {
    return {
      isActive: true,
      isFrozen: false,
      status: BATCH_ACCESS_STATUS.FREE_BATCH,
      display_label: 'Free Batch',
      feeMode,
      feeAmount: 0,
      message: 'Free batch enrollment',
    }
  }

  const currentMonth = getCurrentPaymentMonth(referenceDate)

  // 4. Administrative Access Overrides & Fee Waivers
  const applicableOverrides = (adminOverrides || []).filter(o => {
    if (o.student_id && student?.id && o.student_id !== student.id) return false
    if (o.batch_id && batch.id && o.batch_id !== batch.id) return false
    return true
  })

  // Full access override (indefinite or within validity)
  const fullOverride = applicableOverrides.find(o => 
    o.grant_type === 'full_access_override' &&
    (!o.valid_until || new Date(o.valid_until) >= referenceDate)
  )
  if (fullOverride) {
    return {
      isActive: true,
      isFrozen: false,
      isAdminOverride: true,
      status: BATCH_ACCESS_STATUS.ADMIN_OVERRIDE,
      display_label: 'Access Granted / Fee Waived',
      feeMode,
      feeAmount,
      override: fullOverride,
      validUntil: fullOverride.valid_until,
      message: 'Full access granted by administrator waiver',
    }
  }

  // Current month fee waiver
  const monthlyWaiver = applicableOverrides.find(o =>
    o.grant_type === 'monthly_fee_waiver' && o.billing_month === currentMonth
  )
  if (monthlyWaiver) {
    return {
      isActive: true,
      isFrozen: false,
      isAdminOverride: true,
      isWaived: true,
      status: BATCH_ACCESS_STATUS.ADMIN_OVERRIDE,
      display_label: 'Access Granted / Fee Waived',
      feeMode,
      feeAmount,
      paymentMonth: currentMonth,
      override: monthlyWaiver,
      message: `Monthly fee for ${currentMonth} waived by administrator`,
    }
  }

  // Relevant fee records for this batch
  const batchRecords = (feeRecords || []).filter(r => {
    if (r.batch_id && batch.id) {
      return r.batch_id === batch.id
    }
    // Legacy support: records with null batch_id match if monthly
    return feeMode === FEE_MODES.MONTHLY
  })

  // 5. MONTHLY FEE MODE
  if (feeMode === FEE_MODES.MONTHLY) {
    const dayOfMonth = getIndianDay(referenceDate)

    const verifiedRecord = batchRecords.find(
      r => r.payment_month === currentMonth && r.status === 'verified'
    )
    const pendingRecord = batchRecords.find(
      r => r.payment_month === currentMonth && r.status === 'pending'
    )
    const rejectedRecord = batchRecords.find(
      r => r.payment_month === currentMonth && r.status === 'rejected'
    )

    // A. Verified fee paid for current month (Takes precedence over trial/grace)
    if (verifiedRecord) {
      return {
        isActive: true,
        isFrozen: false,
        status: BATCH_ACCESS_STATUS.ACTIVE,
        display_label: 'Fee Paid / Verified',
        feeMode: FEE_MODES.MONTHLY,
        feeAmount,
        paymentMonth: currentMonth,
        verifiedRecord,
        referenceId: verifiedRecord.reference_id,
        paidAt: verifiedRecord.paid_at,
        message: `Monthly fee paid and verified for ${currentMonth}`,
      }
    }

    // B. Submitted payment pending verification -> Provisional Unlock Granted!
    if (pendingRecord) {
      return {
        isActive: true, // Provisional access active during verification
        isFrozen: false,
        isPendingVerification: true,
        status: BATCH_ACCESS_STATUS.PENDING_VERIFICATION,
        display_label: 'Provisional Access',
        feeMode: FEE_MODES.MONTHLY,
        feeAmount,
        paymentMonth: currentMonth,
        pendingRecord,
        referenceId: pendingRecord.reference_id,
        paidAt: pendingRecord.paid_at,
        message: `Payment submitted for ${currentMonth} · Provisional access active under admin review`,
      }
    }

    // C. Rejected Payment for current month (and no pending/verified) -> Frozen & Notify
    if (rejectedRecord) {
      return {
        isActive: false,
        isFrozen: true,
        isRejected: true,
        status: BATCH_ACCESS_STATUS.REJECTED,
        display_label: 'Payment Rejected / Access Frozen',
        feeMode: FEE_MODES.MONTHLY,
        feeAmount,
        paymentMonth: currentMonth,
        rejectedRecord,
        referenceId: rejectedRecord.reference_id,
        rejectionReason: rejectedRecord.notes,
        message: 'Fee Payment was Rejected By the Admin. Please contact the Admin.',
      }
    }

    // D. Active Universal 2-Day Free Trial Check
    let isTrialExpired = false
    if (student?.trial_ends_at) {
      const trialEnd = new Date(student.trial_ends_at)
      if (trialEnd > referenceDate) {
        const msLeft = trialEnd - referenceDate
        const hoursLeft = Math.max(1, Math.floor(msLeft / 3600000))
        const isExpiring = hoursLeft <= 6
        return {
          isActive: true,
          isFrozen: false,
          isTrialActive: true,
          status: isExpiring ? BATCH_ACCESS_STATUS.TRIAL_EXPIRING : BATCH_ACCESS_STATUS.TRIAL,
          display_label: isExpiring ? `Trial Expiring (${hoursLeft}h)` : `Trial Active (${hoursLeft}h)`,
          feeMode,
          feeAmount,
          trialEndsAt: student.trial_ends_at,
          trialHoursLeft: hoursLeft,
          message: `Active free trial (${hoursLeft} hour${hoursLeft === 1 ? '' : 's'} remaining)`,
        }
      } else {
        isTrialExpired = true
      }
    }

    // E. Days 1 to 10: Grace Period Active (for enrolled students)
    if (dayOfMonth <= 10) {
      const daysRemaining = 11 - dayOfMonth
      return {
        isActive: true,
        isFrozen: false,
        inGracePeriod: true,
        daysRemainingInGrace: daysRemaining,
        status: BATCH_ACCESS_STATUS.GRACE_PERIOD,
        display_label: 'Fee Due / Grace Period',
        feeMode: FEE_MODES.MONTHLY,
        feeAmount,
        paymentMonth: currentMonth,
        message: `Monthly fee due by 10th (${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining before freeze)`,
      }
    }

    // F. Day 11+: Grace Period Expired -> Batch Access Frozen
    const freezeStatus = isTrialExpired ? BATCH_ACCESS_STATUS.TRIAL_EXPIRED : BATCH_ACCESS_STATUS.FROZEN
    const freezeLabel = isTrialExpired ? 'Trial Expired / Access Frozen' : 'Fee Overdue / Access Frozen'
    return {
      isActive: false,
      isFrozen: true,
      inGracePeriod: false,
      status: freezeStatus,
      display_label: freezeLabel,
      feeMode: FEE_MODES.MONTHLY,
      feeAmount,
      paymentMonth: currentMonth,
      trialEndsAt: student?.trial_ends_at,
      message: isTrialExpired
        ? 'Free trial has ended. Monthly fee payment required to continue.'
        : `Batch access frozen. Monthly fee for ${currentMonth} was due by the 10th.`,
    }
  }

  // 6. ONE-TIME FEE MODE
  if (feeMode === FEE_MODES.ONE_TIME) {
    const verifiedRecords = batchRecords.filter(r => r.status === 'verified')
    const pendingRecord = batchRecords.find(r => r.status === 'pending')
    const rejectedRecord = batchRecords.find(r => r.status === 'rejected')

    // A. Submitted payment pending verification -> Provisional Unlock Granted!
    if (pendingRecord) {
      return {
        isActive: true, // Provisional access active during verification
        isFrozen: false,
        isPendingVerification: true,
        status: BATCH_ACCESS_STATUS.PENDING_VERIFICATION,
        display_label: 'Provisional Access',
        feeMode: FEE_MODES.ONE_TIME,
        feeAmount,
        pendingRecord,
        referenceId: pendingRecord.reference_id,
        paidAt: pendingRecord.paid_at,
        message: 'One-time course payment submitted · Provisional access active under admin review',
      }
    }

    // B. Verified records with validity check (Takes precedence over trial)
    if (verifiedRecords.length > 0) {
      let bestRecord = verifiedRecords[0]
      let maxValidUntil = null

      for (const rec of verifiedRecords) {
        let recValidity = null
        if (rec.valid_until) {
          recValidity = new Date(rec.valid_until)
        } else if (batch.validity_end_date) {
          recValidity = new Date(`${batch.validity_end_date}T23:59:59+05:30`)
        } else if (batch.validity_days) {
          const start = rec.paid_at ? new Date(rec.paid_at) : (rec.created_at ? new Date(rec.created_at) : referenceDate)
          recValidity = new Date(start.getTime() + batch.validity_days * 86400000)
        }

        if (!maxValidUntil || (recValidity && recValidity > maxValidUntil)) {
          maxValidUntil = recValidity
          bestRecord = rec
        }
      }

      // Check expiry
      if (maxValidUntil && referenceDate > maxValidUntil) {
        return {
          isActive: false,
          isFrozen: true,
          status: BATCH_ACCESS_STATUS.EXPIRED,
          display_label: 'Course Validity Expired / Access Frozen',
          feeMode: FEE_MODES.ONE_TIME,
          feeAmount,
          validUntil: maxValidUntil,
          verifiedRecord: bestRecord,
          referenceId: bestRecord.reference_id,
          message: `Course validity expired on ${maxValidUntil.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.`,
        }
      }

      return {
        isActive: true,
        isFrozen: false,
        status: BATCH_ACCESS_STATUS.ACTIVE,
        display_label: 'Fee Paid / Verified',
        feeMode: FEE_MODES.ONE_TIME,
        feeAmount,
        validUntil: maxValidUntil,
        verifiedRecord: bestRecord,
        referenceId: bestRecord.reference_id,
        paidAt: bestRecord.paid_at,
        message: maxValidUntil
          ? `Valid until ${maxValidUntil.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
          : 'Full course lifetime access active',
      }
    }

    // C. Rejected payment (and no verified record) -> Frozen & Notify
    if (rejectedRecord) {
      return {
        isActive: false,
        isFrozen: true,
        isRejected: true,
        status: BATCH_ACCESS_STATUS.REJECTED,
        display_label: 'Payment Rejected / Access Frozen',
        feeMode: FEE_MODES.ONE_TIME,
        feeAmount,
        rejectedRecord,
        referenceId: rejectedRecord.reference_id,
        rejectionReason: rejectedRecord.notes,
        message: 'Fee Payment was Rejected By the Admin. Please contact the Admin.',
      }
    }

    // D. Active Universal Free Trial
    let isTrialExpired = false
    if (student?.trial_ends_at) {
      const trialEnd = new Date(student.trial_ends_at)
      if (trialEnd > referenceDate) {
        const msLeft = trialEnd - referenceDate
        const hoursLeft = Math.max(1, Math.floor(msLeft / 3600000))
        const isExpiring = hoursLeft <= 6
        return {
          isActive: true,
          isFrozen: false,
          isTrialActive: true,
          status: isExpiring ? BATCH_ACCESS_STATUS.TRIAL_EXPIRING : BATCH_ACCESS_STATUS.TRIAL,
          display_label: isExpiring ? `Trial Expiring (${hoursLeft}h)` : `Trial Active (${hoursLeft}h)`,
          feeMode,
          feeAmount,
          trialEndsAt: student.trial_ends_at,
          trialHoursLeft: hoursLeft,
          message: `Active free trial (${hoursLeft} hour${hoursLeft === 1 ? '' : 's'} remaining)`,
        }
      } else {
        isTrialExpired = true
      }
    }

    // E. No verified records and no pending payment -> Frozen
    const freezeStatus = isTrialExpired ? BATCH_ACCESS_STATUS.TRIAL_EXPIRED : BATCH_ACCESS_STATUS.FROZEN
    const freezeLabel = isTrialExpired ? 'Trial Expired / Access Frozen' : 'Course Validity Expired / Access Frozen'
    return {
      isActive: false,
      isFrozen: true,
      status: freezeStatus,
      display_label: freezeLabel,
      feeMode: FEE_MODES.ONE_TIME,
      feeAmount,
      trialEndsAt: student?.trial_ends_at,
      message: isTrialExpired
        ? 'Free trial has ended. Course enrollment payment required to continue.'
        : `Course enrollment payment of ₹${feeAmount} is required for ${batch.name}.`,
    }
  }

  return {
    isActive: true,
    isFrozen: false,
    status: BATCH_ACCESS_STATUS.ACTIVE,
    display_label: 'Active',
    feeMode,
    feeAmount,
    message: 'Active',
  }
}

/**
 * Formats a clean human-readable badge label for batch display cards
 */
export function formatBatchFeeBadge(batch) {
  if (!batch) return null
  const mode = batch.fee_mode || FEE_MODES.MONTHLY
  const amount = Number(batch.fee_amount) || 0

  if (amount <= 0) {
    return { text: 'Free Batch', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' }
  }

  if (mode === FEE_MODES.MONTHLY) {
    return {
      text: `Monthly · ₹${amount.toLocaleString('en-IN')}/mo`,
      color: 'bg-blue-100 text-blue-800 border-blue-200',
    }
  }

  // One-time
  if (batch.validity_days) {
    return {
      text: `One-Time · ₹${amount.toLocaleString('en-IN')} (${batch.validity_days} Days)`,
      color: 'bg-purple-100 text-purple-800 border-purple-200',
    }
  }

  if (batch.validity_end_date) {
    return {
      text: `One-Time · ₹${amount.toLocaleString('en-IN')} (Till ${batch.validity_end_date})`,
      color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    }
  }

  return {
    text: `One-Time · ₹${amount.toLocaleString('en-IN')}`,
    color: 'bg-purple-100 text-purple-800 border-purple-200',
  }
}

/**
 * Formats a clean status badge for student management tables and dashboards
 */
/**
 * Formats a clean status badge for student management tables and dashboards
 */
export function formatAccessStatusBadge(feeStatus) {
  if (!feeStatus) return { label: 'Active', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' }

  switch (feeStatus.status) {
    case BATCH_ACCESS_STATUS.SUSPENDED:
      return { label: 'Suspended', color: 'bg-rose-100 text-rose-800 border-rose-300' }
    case BATCH_ACCESS_STATUS.TRIAL:
      return {
        label: `Trial Active${feeStatus.trialHoursLeft ? ` (${feeStatus.trialHoursLeft}h)` : ''}`,
        color: 'bg-amber-100 text-amber-800 border-amber-300',
      }
    case BATCH_ACCESS_STATUS.TRIAL_EXPIRED:
      return { label: 'Trial Over', color: 'bg-red-100 text-red-800 border-red-300' }
    case BATCH_ACCESS_STATUS.ADMIN_OVERRIDE:
      return {
        label: feeStatus.isWaived ? 'Fee Waived' : 'Access Granted',
        color: 'bg-teal-100 text-teal-800 border-teal-300',
      }
    case BATCH_ACCESS_STATUS.PENDING_VERIFICATION:
      return { label: 'Under Review', color: 'bg-sky-100 text-sky-800 border-sky-300' }
    case BATCH_ACCESS_STATUS.REJECTED:
      return { label: 'Payment Rejected', color: 'bg-rose-100 text-rose-800 border-rose-300' }
    case BATCH_ACCESS_STATUS.GRACE_PERIOD:
      return { label: 'Due Soon', color: 'bg-amber-100 text-amber-800 border-amber-300' }
    case BATCH_ACCESS_STATUS.FROZEN:
      return { label: 'Access Frozen', color: 'bg-rose-100 text-rose-800 border-rose-300' }
    case BATCH_ACCESS_STATUS.EXPIRED:
      return { label: 'Validity Expired', color: 'bg-gray-100 text-gray-800 border-gray-300' }
    case BATCH_ACCESS_STATUS.ACTIVE:
    default:
      return { label: 'Active', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' }
  }
}

/**
 * Formats authoritative, semantic status badges for the Admin Student Management table
 * and profile drawer, matching real database access logic and eliminating fake fallbacks.
 */
export function formatStudentAccessBadge(feeStatus) {
  if (!feeStatus || feeStatus.status === BATCH_ACCESS_STATUS.DATA_ERROR) {
    return {
      label: 'Data Error / Unable to Determine',
      color: 'bg-purple-100 text-purple-800 border-purple-300',
    }
  }

  if (feeStatus.status === BATCH_ACCESS_STATUS.SUSPENDED) {
    return {
      label: 'Account Suspended',
      color: 'bg-rose-100 text-rose-800 border-rose-300',
    }
  }

  if (feeStatus.status === BATCH_ACCESS_STATUS.ADMIN_OVERRIDE) {
    return {
      label: 'Access Granted / Fee Waived',
      color: 'bg-teal-100 text-teal-800 border-teal-300',
    }
  }

  if (feeStatus.status === BATCH_ACCESS_STATUS.REJECTED) {
    return {
      label: 'Payment Rejected / Access Frozen',
      color: 'bg-rose-100 text-rose-800 border-rose-300',
    }
  }

  if (feeStatus.status === BATCH_ACCESS_STATUS.EXPIRED) {
    return {
      label: 'Course Validity Expired / Access Frozen',
      color: 'bg-slate-100 text-slate-800 border-slate-300',
    }
  }

  if (feeStatus.status === BATCH_ACCESS_STATUS.TRIAL_EXPIRED) {
    return {
      label: 'Trial Expired / Access Frozen',
      color: 'bg-rose-100 text-rose-800 border-rose-300',
    }
  }

  if (feeStatus.status === BATCH_ACCESS_STATUS.FROZEN) {
    return {
      label: 'Fee Overdue / Access Frozen',
      color: 'bg-rose-100 text-rose-800 border-rose-300',
    }
  }

  if (feeStatus.status === BATCH_ACCESS_STATUS.GRACE_PERIOD) {
    return {
      label: 'Fee Due / Grace Period',
      color: 'bg-amber-100 text-amber-800 border-amber-300',
    }
  }

  if (feeStatus.status === BATCH_ACCESS_STATUS.PENDING_VERIFICATION) {
    if (feeStatus.isActive) {
      return {
        label: 'Provisional Access',
        color: 'bg-sky-100 text-sky-800 border-sky-300',
      }
    }
    return {
      label: 'Pending Verification / Access Frozen',
      color: 'bg-amber-100 text-amber-800 border-amber-300',
    }
  }

  if (feeStatus.isTrialActive || feeStatus.status === BATCH_ACCESS_STATUS.TRIAL || feeStatus.status === BATCH_ACCESS_STATUS.TRIAL_EXPIRING) {
    const hours = feeStatus.trialHoursLeft
    if (hours && hours <= 6) {
      return {
        label: `Trial Expiring (${hours}h)`,
        color: 'bg-amber-100 text-amber-800 border-amber-300',
      }
    }
    return {
      label: hours ? `Trial Active (${hours}h)` : 'Trial Active',
      color: 'bg-amber-100 text-amber-800 border-amber-300',
    }
  }

  if (feeStatus.status === BATCH_ACCESS_STATUS.ACTIVE) {
    if (feeStatus.feeAmount === 0) {
      return {
        label: 'Free Batch',
        color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      }
    }
    return {
      label: 'Fee Paid / Verified',
      color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    }
  }

  if (feeStatus.status === BATCH_ACCESS_STATUS.UNENROLLED) {
    return {
      label: 'Unenrolled',
      color: 'bg-gray-100 text-gray-700 border-gray-300',
    }
  }

  if (feeStatus.display_label) {
    return {
      label: feeStatus.display_label,
      color: feeStatus.isActive ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-rose-100 text-rose-800 border-rose-300',
    }
  }

  return {
    label: 'Data Error / Unable to Determine',
    color: 'bg-purple-100 text-purple-800 border-purple-300',
  }
}


