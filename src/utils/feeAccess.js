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
  GRACE_PERIOD: 'grace_period',
  FROZEN: 'frozen',
  EXPIRED: 'expired',
  TRIAL: 'trial',
  TRIAL_EXPIRED: 'trial_expired',
  PENDING_VERIFICATION: 'pending_verification',
  REJECTED: 'rejected',
  ADMIN_OVERRIDE: 'admin_override',
  SUSPENDED: 'suspended',
  UNENROLLED: 'unenrolled',
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
  // If no batch is provided, access cannot be evaluated (treat as open/global)
  if (!batch) {
    return {
      isActive: true,
      isFrozen: false,
      status: BATCH_ACCESS_STATUS.ACTIVE,
      feeMode: FEE_MODES.MONTHLY,
      feeAmount: 0,
      message: 'Global content',
    }
  }

  const feeMode = batch.fee_mode || FEE_MODES.MONTHLY
  const feeAmount = Number(batch.fee_amount) || 0

  // 1. Account Suspension: Highest precedence restriction
  if (student?.is_active === false) {
    return {
      isActive: false,
      isFrozen: true,
      isSuspended: true,
      status: BATCH_ACCESS_STATUS.SUSPENDED,
      feeMode,
      feeAmount,
      message: 'Account is suspended. Please contact the administrator.',
    }
  }

  // 2. Free Batches (fee_amount <= 0) are always accessible
  if (feeAmount <= 0) {
    return {
      isActive: true,
      isFrozen: false,
      status: BATCH_ACCESS_STATUS.ACTIVE,
      feeMode,
      feeAmount: 0,
      message: 'Free batch enrollment',
    }
  }

  const currentMonth = getCurrentPaymentMonth(referenceDate)

  // 3. Administrative Access Overrides & Fee Waivers
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
      feeMode,
      feeAmount,
      override: fullOverride,
      message: 'Full access granted by administrator',
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
      feeMode,
      feeAmount,
      paymentMonth: currentMonth,
      override: monthlyWaiver,
      message: `Monthly fee for ${currentMonth} waived by administrator`,
    }
  }

  // 4. Universal 2-Day Free Trial Check
  let isTrialExpired = false
  if (student?.trial_ends_at) {
    const trialEnd = new Date(student.trial_ends_at)
    if (trialEnd > referenceDate) {
      const msLeft = trialEnd - referenceDate
      const hoursLeft = Math.max(1, Math.floor(msLeft / 3600000))
      return {
        isActive: true,
        isFrozen: false,
        isTrialActive: true,
        status: BATCH_ACCESS_STATUS.TRIAL,
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

    // A. Verified fee paid for current month
    if (verifiedRecord) {
      return {
        isActive: true,
        isFrozen: false,
        status: BATCH_ACCESS_STATUS.ACTIVE,
        feeMode: FEE_MODES.MONTHLY,
        feeAmount,
        paymentMonth: currentMonth,
        verifiedRecord,
        message: 'Monthly fee paid and verified',
      }
    }

    // B. Submitted payment pending verification -> Provisional Unlock Granted!
    if (pendingRecord) {
      return {
        isActive: true, // Provisional access active during verification
        isFrozen: false,
        isPendingVerification: true,
        status: BATCH_ACCESS_STATUS.PENDING_VERIFICATION,
        feeMode: FEE_MODES.MONTHLY,
        feeAmount,
        paymentMonth: currentMonth,
        pendingRecord,
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
        feeMode: FEE_MODES.MONTHLY,
        feeAmount,
        paymentMonth: currentMonth,
        rejectedRecord,
        message: 'Fee Payment was Rejected By the Admin. Please contact the Admin.',
      }
    }

    // D. Days 1 to 10: Grace Period Active (for enrolled students)
    if (dayOfMonth <= 10) {
      const daysRemaining = 11 - dayOfMonth
      return {
        isActive: true,
        isFrozen: false,
        inGracePeriod: true,
        daysRemainingInGrace: daysRemaining,
        status: BATCH_ACCESS_STATUS.GRACE_PERIOD,
        feeMode: FEE_MODES.MONTHLY,
        feeAmount,
        paymentMonth: currentMonth,
        message: `Monthly fee due by 10th (${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining before freeze)`,
      }
    }

    // E. Day 11+: Grace Period Expired -> Batch Access Frozen
    const freezeStatus = isTrialExpired ? BATCH_ACCESS_STATUS.TRIAL_EXPIRED : BATCH_ACCESS_STATUS.FROZEN
    return {
      isActive: false,
      isFrozen: true,
      inGracePeriod: false,
      status: freezeStatus,
      feeMode: FEE_MODES.MONTHLY,
      feeAmount,
      paymentMonth: currentMonth,
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
        feeMode: FEE_MODES.ONE_TIME,
        feeAmount,
        pendingRecord,
        message: 'One-time course payment submitted · Provisional access active under admin review',
      }
    }

    // B. Rejected payment (and no verified record) -> Frozen & Notify
    if (rejectedRecord && verifiedRecords.length === 0) {
      return {
        isActive: false,
        isFrozen: true,
        isRejected: true,
        status: BATCH_ACCESS_STATUS.REJECTED,
        feeMode: FEE_MODES.ONE_TIME,
        feeAmount,
        rejectedRecord,
        message: 'Fee Payment was Rejected By the Admin. Please contact the Admin.',
      }
    }

    // C. No verified records and no pending payment -> Frozen
    if (verifiedRecords.length === 0) {
      const freezeStatus = isTrialExpired ? BATCH_ACCESS_STATUS.TRIAL_EXPIRED : BATCH_ACCESS_STATUS.FROZEN
      return {
        isActive: false,
        isFrozen: true,
        status: freezeStatus,
        feeMode: FEE_MODES.ONE_TIME,
        feeAmount,
        message: isTrialExpired
          ? 'Free trial has ended. Course enrollment payment required to continue.'
          : `Course enrollment payment of ₹${feeAmount} is required for ${batch.name}.`,
      }
    }

    // D. Pick the verified record with the latest validity
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
        feeMode: FEE_MODES.ONE_TIME,
        feeAmount,
        validUntil: maxValidUntil,
        verifiedRecord: bestRecord,
        message: `Course validity expired on ${maxValidUntil.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.`,
      }
    }

    return {
      isActive: true,
      isFrozen: false,
      status: BATCH_ACCESS_STATUS.ACTIVE,
      feeMode: FEE_MODES.ONE_TIME,
      feeAmount,
      validUntil: maxValidUntil,
      verifiedRecord: bestRecord,
      message: maxValidUntil
        ? `Valid until ${maxValidUntil.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
        : 'Full course lifetime access active',
    }
  }

  return {
    isActive: true,
    isFrozen: false,
    status: BATCH_ACCESS_STATUS.ACTIVE,
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

