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
  PENDING_VERIFICATION: 'pending_verification',
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
 * Evaluates whether a student has active access to a specific batch based on fee mode,
 * grace period, and subscription validity.
 */
export function checkBatchFeeStatus({
  student,
  batch,
  feeRecords = [],
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

  // 1. Free Batches (fee_amount <= 0) are always accessible
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

  // 2. Free Trial bypass
  if (student?.trial_ends_at) {
    const trialEnd = new Date(student.trial_ends_at)
    if (trialEnd > referenceDate) {
      return {
        isActive: true,
        isFrozen: false,
        isTrialActive: true,
        status: BATCH_ACCESS_STATUS.TRIAL,
        feeMode,
        feeAmount,
        trialEndsAt: student.trial_ends_at,
        message: 'Active free trial',
      }
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

  // 3. MONTHLY FEE MODE
  if (feeMode === FEE_MODES.MONTHLY) {
    const currentMonth = getCurrentPaymentMonth(referenceDate)
    const dayOfMonth = getIndianDay(referenceDate)

    const verifiedRecord = batchRecords.find(
      r => r.payment_month === currentMonth && r.status === 'verified'
    )
    const pendingRecord = batchRecords.find(
      r => r.payment_month === currentMonth && r.status === 'pending'
    )

    // Verified fee paid for current month
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

    // Days 1 to 10: Grace Period Active
    if (dayOfMonth <= 10) {
      const daysRemaining = 11 - dayOfMonth
      if (pendingRecord) {
        return {
          isActive: true,
          isFrozen: false,
          inGracePeriod: true,
          daysRemainingInGrace: daysRemaining,
          status: BATCH_ACCESS_STATUS.GRACE_PERIOD,
          feeMode: FEE_MODES.MONTHLY,
          feeAmount,
          paymentMonth: currentMonth,
          pendingRecord,
          message: `Payment under verification · Grace period active (${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining)`,
        }
      }

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

    // Day 11+: Grace Period Expired -> Batch Access Frozen
    if (pendingRecord) {
      return {
        isActive: false,
        isFrozen: true,
        inGracePeriod: false,
        status: BATCH_ACCESS_STATUS.PENDING_VERIFICATION,
        feeMode: FEE_MODES.MONTHLY,
        feeAmount,
        paymentMonth: currentMonth,
        pendingRecord,
        message: `Fee payment for ${currentMonth} is under review. Access will activate upon verification.`,
      }
    }

    return {
      isActive: false,
      isFrozen: true,
      inGracePeriod: false,
      status: BATCH_ACCESS_STATUS.FROZEN,
      feeMode: FEE_MODES.MONTHLY,
      feeAmount,
      paymentMonth: currentMonth,
      message: `Batch access frozen. Monthly fee for ${currentMonth} was due by the 10th.`,
    }
  }

  // 4. ONE-TIME FEE MODE
  if (feeMode === FEE_MODES.ONE_TIME) {
    // Find latest verified record for this batch
    const verifiedRecords = batchRecords.filter(r => r.status === 'verified')
    const pendingRecord = batchRecords.find(r => r.status === 'pending')

    if (verifiedRecords.length === 0) {
      if (pendingRecord) {
        return {
          isActive: false,
          isFrozen: true,
          status: BATCH_ACCESS_STATUS.PENDING_VERIFICATION,
          feeMode: FEE_MODES.ONE_TIME,
          feeAmount,
          pendingRecord,
          message: 'One-time course payment is pending admin verification.',
        }
      }

      return {
        isActive: false,
        isFrozen: true,
        status: BATCH_ACCESS_STATUS.FROZEN,
        feeMode: FEE_MODES.ONE_TIME,
        feeAmount,
        message: `Course enrollment payment of ₹${feeAmount} is required for ${batch.name}.`,
      }
    }

    // Pick the verified record with the latest validity
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
