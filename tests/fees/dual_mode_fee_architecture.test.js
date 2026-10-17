import { describe, it, expect } from 'vitest'
import {
  checkBatchFeeStatus,
  formatBatchFeeBadge,
  formatAccessStatusBadge,
  BATCH_ACCESS_STATUS,
  getCurrentPaymentMonth,
} from '../../src/utils/feeAccess'

describe('Dual-Mode Batch Fee Architecture & Access Control Logic', () => {
  const baseStudent = { id: 'student-uuid-1', trial_ends_at: null }
  const monthlyBatch = {
    id: 'batch-monthly-1',
    name: 'Class 10 Regular Physics',
    fee_mode: 'monthly',
    fee_amount: 1500,
  }

  describe('Monthly Fee Mode', () => {

    it('grants full active access during Grace Period (Days 1–10) even without payment', () => {
      // 5th of October 2026
      const refDate = new Date('2026-10-05T10:00:00Z')
      const result = checkBatchFeeStatus({
        student: baseStudent,
        batch: monthlyBatch,
        feeRecords: [],
        referenceDate: refDate,
      })

      expect(result.isActive).toBe(true)
      expect(result.isFrozen).toBe(false)
      expect(result.inGracePeriod).toBe(true)
      expect(result.status).toBe(BATCH_ACCESS_STATUS.GRACE_PERIOD)
      expect(result.daysRemainingInGrace).toBe(6) // 11 - 5 = 6 days remaining
      expect(result.message).toContain('due by 10th')
    })

    it('maintains grace period on Day 10 cutoff boundary', () => {
      // 10th of October 2026 (IST)
      const refDate = new Date('2026-10-10T12:00:00+05:30')
      const result = checkBatchFeeStatus({
        student: baseStudent,
        batch: monthlyBatch,
        feeRecords: [],
        referenceDate: refDate,
      })

      expect(result.isActive).toBe(true)
      expect(result.isFrozen).toBe(false)
      expect(result.inGracePeriod).toBe(true)
      expect(result.daysRemainingInGrace).toBe(1)
    })

    it('freezes batch access on Day 11+ when unpaid', () => {
      // 11th of October 2026 (IST)
      const refDate = new Date('2026-10-11T09:00:00+05:30')
      const result = checkBatchFeeStatus({
        student: baseStudent,
        batch: monthlyBatch,
        feeRecords: [],
        referenceDate: refDate,
      })

      expect(result.isActive).toBe(false)
      expect(result.isFrozen).toBe(true)
      expect(result.inGracePeriod).toBe(false)
      expect(result.status).toBe(BATCH_ACCESS_STATUS.FROZEN)
      expect(result.message).toContain('Batch access frozen')
    })

    it('grants provisional active access when payment is submitted and pending verification on Day 11+', () => {
      const refDate = new Date('2026-10-14T09:00:00+05:30')
      const currentMonth = getCurrentPaymentMonth(refDate)
      const pendingRecord = {
        id: 'fee-rec-1',
        student_id: baseStudent.id,
        batch_id: monthlyBatch.id,
        amount: 1500,
        payment_month: currentMonth,
        status: 'pending',
      }

      const result = checkBatchFeeStatus({
        student: baseStudent,
        batch: monthlyBatch,
        feeRecords: [pendingRecord],
        referenceDate: refDate,
      })

      expect(result.isActive).toBe(true)
      expect(result.isFrozen).toBe(false)
      expect(result.isPendingVerification).toBe(true)
      expect(result.status).toBe(BATCH_ACCESS_STATUS.PENDING_VERIFICATION)
      expect(result.message).toContain('Provisional access active')
    })

    it('automatically restores active access when admin verifies monthly payment on Day 11+', () => {
      const refDate = new Date('2026-10-14T09:00:00+05:30')
      const currentMonth = getCurrentPaymentMonth(refDate)
      const verifiedRecord = {
        id: 'fee-rec-2',
        student_id: baseStudent.id,
        batch_id: monthlyBatch.id,
        amount: 1500,
        payment_month: currentMonth,
        status: 'verified',
        paid_at: '2026-10-12T10:00:00Z',
      }

      const result = checkBatchFeeStatus({
        student: baseStudent,
        batch: monthlyBatch,
        feeRecords: [verifiedRecord],
        referenceDate: refDate,
      })

      expect(result.isActive).toBe(true)
      expect(result.isFrozen).toBe(false)
      expect(result.status).toBe(BATCH_ACCESS_STATUS.ACTIVE)
      expect(result.message).toContain('paid and verified')
    })
  })

  describe('One-Time Fee Mode & Validity Expiration', () => {
    const oneTimeBatchDays = {
      id: 'batch-crash-90d',
      name: 'JEE 90-Day Crash Course',
      fee_mode: 'one_time',
      fee_amount: 4999,
      validity_days: 90,
    }

    const oneTimeBatchFixed = {
      id: 'batch-neet-2027',
      name: 'NEET 2027 Comprehensive',
      fee_mode: 'one_time',
      fee_amount: 12000,
      validity_end_date: '2027-05-31',
    }

    it('locks access before one-time payment is made', () => {
      const refDate = new Date('2026-10-02T10:00:00Z')
      const result = checkBatchFeeStatus({
        student: baseStudent,
        batch: oneTimeBatchDays,
        feeRecords: [],
        referenceDate: refDate,
      })

      expect(result.isActive).toBe(false)
      expect(result.isFrozen).toBe(true)
      expect(result.status).toBe(BATCH_ACCESS_STATUS.FROZEN)
      expect(result.message).toContain('Course enrollment payment of ₹4999 is required')
    })

    it('grants full access when one-time payment is verified and within validity_days', () => {
      const refDate = new Date('2026-10-20T10:00:00Z')
      const verifiedRecord = {
        id: 'fee-ot-1',
        student_id: baseStudent.id,
        batch_id: oneTimeBatchDays.id,
        amount: 4999,
        fee_mode: 'one_time',
        status: 'verified',
        paid_at: '2026-10-01T10:00:00Z',
        // 90 days from Oct 1 is approx Dec 30 2026
        valid_until: '2026-12-30T23:59:59Z',
      }

      const result = checkBatchFeeStatus({
        student: baseStudent,
        batch: oneTimeBatchDays,
        feeRecords: [verifiedRecord],
        referenceDate: refDate,
      })

      expect(result.isActive).toBe(true)
      expect(result.isFrozen).toBe(false)
      expect(result.status).toBe(BATCH_ACCESS_STATUS.ACTIVE)
      expect(result.message).toContain('Valid until')
    })

    it('locks access when validity_days has expired', () => {
      // 100 days after Oct 1 is in Jan 2027
      const refDate = new Date('2027-01-10T10:00:00Z')
      const expiredRecord = {
        id: 'fee-ot-1',
        student_id: baseStudent.id,
        batch_id: oneTimeBatchDays.id,
        amount: 4999,
        fee_mode: 'one_time',
        status: 'verified',
        paid_at: '2026-10-01T10:00:00Z',
        valid_until: '2026-12-30T23:59:59Z',
      }

      const result = checkBatchFeeStatus({
        student: baseStudent,
        batch: oneTimeBatchDays,
        feeRecords: [expiredRecord],
        referenceDate: refDate,
      })

      expect(result.isActive).toBe(false)
      expect(result.isFrozen).toBe(true)
      expect(result.status).toBe(BATCH_ACCESS_STATUS.EXPIRED)
      expect(result.message).toContain('Course validity expired')
    })

    it('grants access when within fixed validity_end_date and expires after cutoff', () => {
      const verifiedRecord = {
        id: 'fee-ot-2',
        student_id: baseStudent.id,
        batch_id: oneTimeBatchFixed.id,
        amount: 12000,
        fee_mode: 'one_time',
        status: 'verified',
        paid_at: '2026-10-01T10:00:00Z',
      }

      // Test before cutoff: March 2027
      const activeDate = new Date('2027-03-15T10:00:00Z')
      const activeResult = checkBatchFeeStatus({
        student: baseStudent,
        batch: oneTimeBatchFixed,
        feeRecords: [verifiedRecord],
        referenceDate: activeDate,
      })
      expect(activeResult.isActive).toBe(true)
      expect(activeResult.isFrozen).toBe(false)

      // Test after cutoff: June 2027
      const expiredDate = new Date('2027-06-05T10:00:00Z')
      const expiredResult = checkBatchFeeStatus({
        student: baseStudent,
        batch: oneTimeBatchFixed,
        feeRecords: [verifiedRecord],
        referenceDate: expiredDate,
      })
      expect(expiredResult.isActive).toBe(false)
      expect(expiredResult.isFrozen).toBe(true)
      expect(expiredResult.status).toBe(BATCH_ACCESS_STATUS.EXPIRED)
    })
  })

  describe('Free Trial Bypass & Multi-Batch Isolation', () => {
    it('bypasses fee requirement when free trial is active', () => {
      const trialStudent = {
        id: 'trial-student-1',
        trial_ends_at: '2026-10-25T23:59:59Z',
      }
      const monthlyBatch = {
        id: 'batch-monthly-1',
        name: 'Maths Grade 12',
        fee_mode: 'monthly',
        fee_amount: 2000,
      }

      // Day 15 (normally frozen if unpaid)
      const refDate = new Date('2026-10-15T10:00:00Z')
      const result = checkBatchFeeStatus({
        student: trialStudent,
        batch: monthlyBatch,
        feeRecords: [],
        referenceDate: refDate,
      })

      expect(result.isActive).toBe(true)
      expect(result.isFrozen).toBe(false)
      expect(result.isTrialActive).toBe(true)
      expect(result.status).toBe(BATCH_ACCESS_STATUS.TRIAL)
    })

    it('isolates batch freeze: freezing Batch A does not affect Batch B', () => {
      const refDate = new Date('2026-10-15T10:00:00+05:30')
      const currentMonth = getCurrentPaymentMonth(refDate)

      const batchA = { id: 'batch-A', name: 'Physics', fee_mode: 'monthly', fee_amount: 1000 }
      const batchB = { id: 'batch-B', name: 'Chemistry', fee_mode: 'monthly', fee_amount: 1000 }

      // Student has verified payment for Batch B only
      const records = [
        {
          id: 'rec-B',
          student_id: baseStudent.id,
          batch_id: 'batch-B',
          amount: 1000,
          payment_month: currentMonth,
          status: 'verified',
        },
      ]

      const statusA = checkBatchFeeStatus({
        student: baseStudent,
        batch: batchA,
        feeRecords: records,
        referenceDate: refDate,
      })
      const statusB = checkBatchFeeStatus({
        student: baseStudent,
        batch: batchB,
        feeRecords: records,
        referenceDate: refDate,
      })

      // Batch A is frozen
      expect(statusA.isActive).toBe(false)
      expect(statusA.isFrozen).toBe(true)

      // Batch B remains active
      expect(statusB.isActive).toBe(true)
      expect(statusB.isFrozen).toBe(false)
    })

    it('rejects access when fee record is marked rejected', () => {
      const refDate = new Date('2026-10-15T10:00:00+05:30')
      const currentMonth = getCurrentPaymentMonth(refDate)
      const rejectedRecord = {
        id: 'rec-rej',
        student_id: baseStudent.id,
        batch_id: 'batch-monthly-1',
        amount: 1500,
        payment_month: currentMonth,
        status: 'rejected',
      }

      const result = checkBatchFeeStatus({
        student: baseStudent,
        batch: { id: 'batch-monthly-1', fee_mode: 'monthly', fee_amount: 1500 },
        feeRecords: [rejectedRecord],
        referenceDate: refDate,
      })

      expect(result.isActive).toBe(false)
      expect(result.isFrozen).toBe(true)
    })

    it('handles exact temporal boundary: 23:59:59 IST on Day 10 is in grace, 00:00:00 IST on Day 11 is frozen', () => {
      // 10th October 23:59:59 IST (UTC 18:29:59)
      const day10End = new Date('2026-10-10T18:29:59.000Z')
      const res10 = checkBatchFeeStatus({
        student: baseStudent,
        batch: monthlyBatch,
        feeRecords: [],
        referenceDate: day10End,
      })
      expect(res10.isActive).toBe(true)
      expect(res10.inGracePeriod).toBe(true)

      // 11th October 00:00:01 IST (UTC 18:30:01)
      const day11Start = new Date('2026-10-10T18:30:01.000Z')
      const res11 = checkBatchFeeStatus({
        student: baseStudent,
        batch: monthlyBatch,
        feeRecords: [],
        referenceDate: day11Start,
      })
      expect(res11.isActive).toBe(false)
      expect(res11.isFrozen).toBe(true)
    })

    it('correctly transitions across year boundary: 31st Dec to 1st Jan', () => {
      // Dec 31 2026 23:59:59 IST -> requires December fee if day 11+
      const dec31 = new Date('2026-12-31T18:29:59.000Z')
      expect(getCurrentPaymentMonth(dec31)).toBe('December 2026')

      // Jan 1 2027 00:00:01 IST -> in Grace period for January 2027
      const jan1 = new Date('2026-12-31T18:30:01.000Z')
      expect(getCurrentPaymentMonth(jan1)).toBe('January 2027')
      const resJan1 = checkBatchFeeStatus({
        student: baseStudent,
        batch: monthlyBatch,
        feeRecords: [],
        referenceDate: jan1,
      })
      expect(resJan1.isActive).toBe(true)
      expect(resJan1.inGracePeriod).toBe(true)
      expect(resJan1.daysRemainingInGrace).toBe(10)
    })

    it('handles leap year February 28 vs 29 boundaries', () => {
      // 2028 is a leap year
      const feb29 = new Date('2028-02-29T06:30:00.000Z')
      expect(getCurrentPaymentMonth(feb29)).toBe('February 2028')
      const resFeb29 = checkBatchFeeStatus({
        student: baseStudent,
        batch: monthlyBatch,
        feeRecords: [],
        referenceDate: feb29,
      })
      // Day 29 is > 10, so it is frozen if unpaid
      expect(resFeb29.isActive).toBe(false)
      expect(resFeb29.isFrozen).toBe(true)
    })
  })

  describe('Badge Formatting', () => {
    it('formats monthly batch badge', () => {
      const badge = formatBatchFeeBadge({ fee_mode: 'monthly', fee_amount: 1500 })
      expect(badge.text).toBe('Monthly · ₹1,500/mo')
    })

    it('formats one-time duration batch badge', () => {
      const badge = formatBatchFeeBadge({ fee_mode: 'one_time', fee_amount: 5000, validity_days: 180 })
      expect(badge.text).toBe('One-Time · ₹5,000 (180 Days)')
    })

    it('formats one-time fixed date batch badge', () => {
      const badge = formatBatchFeeBadge({ fee_mode: 'one_time', fee_amount: 8000, validity_end_date: '2027-04-30' })
      expect(badge.text).toBe('One-Time · ₹8,000 (Till 2027-04-30)')
    })

    it('formats free batch badge', () => {
      const badge = formatBatchFeeBadge({ fee_mode: 'monthly', fee_amount: 0 })
      expect(badge.text).toBe('Free Batch')
    })
  })

  describe('Suspension, Admin Overrides, and Rejection Recovery', () => {
    it('suspends access strictly when student account is inactive (profiles.is_active = false)', () => {
      const suspendedStudent = { id: 's-susp', is_active: false, trial_ends_at: '2026-10-30T00:00:00Z' }
      const verifiedRecord = {
        id: 'fee-v',
        student_id: 's-susp',
        batch_id: monthlyBatch.id,
        amount: 1500,
        payment_month: 'October 2026',
        status: 'verified',
      }
      const override = {
        student_id: 's-susp',
        batch_id: monthlyBatch.id,
        grant_type: 'monthly_fee_waiver',
        billing_month: 'October 2026',
      }

      const result = checkBatchFeeStatus({
        student: suspendedStudent,
        batch: monthlyBatch,
        feeRecords: [verifiedRecord],
        adminOverrides: [override],
        referenceDate: new Date('2026-10-15T10:00:00Z'),
      })

      expect(result.isActive).toBe(false)
      expect(result.isFrozen).toBe(true)
      expect(result.status).toBe(BATCH_ACCESS_STATUS.SUSPENDED)
      expect(result.message).toContain('Account is suspended')
    })

    it('grants access when an audited admin monthly fee waiver exists for current month', () => {
      const unpaidStudent = { id: 's-waiver', is_active: true, trial_ends_at: null }
      const override = {
        student_id: 's-waiver',
        batch_id: monthlyBatch.id,
        grant_type: 'monthly_fee_waiver',
        billing_month: 'October 2026',
      }

      const result = checkBatchFeeStatus({
        student: unpaidStudent,
        batch: monthlyBatch,
        feeRecords: [],
        adminOverrides: [override],
        referenceDate: new Date('2026-10-15T10:00:00Z'),
      })

      expect(result.isActive).toBe(true)
      expect(result.isFrozen).toBe(false)
      expect(result.isWaived).toBe(true)
      expect(result.status).toBe(BATCH_ACCESS_STATUS.ADMIN_OVERRIDE)
      expect(result.message).toContain('waived by administrator')
    })

    it('grants access when an audited admin full access override exists for one-time course', () => {
      const unpaidStudent = { id: 's-ot-override', is_active: true, trial_ends_at: null }
      const oneTimeBatch = { id: 'b-ot', fee_mode: 'one_time', fee_amount: 5000 }
      const override = {
        student_id: 's-ot-override',
        batch_id: 'b-ot',
        grant_type: 'full_access_override',
        valid_until: '2026-12-31T23:59:59Z',
      }

      const result = checkBatchFeeStatus({
        student: unpaidStudent,
        batch: oneTimeBatch,
        feeRecords: [],
        adminOverrides: [override],
        referenceDate: new Date('2026-10-15T10:00:00Z'),
      })

      expect(result.isActive).toBe(true)
      expect(result.isFrozen).toBe(false)
      expect(result.status).toBe(BATCH_ACCESS_STATUS.ADMIN_OVERRIDE)
    })

    it('locks access upon rejection and restores upon recovery to verified', () => {
      const student = { id: 's-rej', is_active: true }
      const rejectedRecord = {
        id: 'rec-rej-1',
        student_id: 's-rej',
        batch_id: monthlyBatch.id,
        amount: 1500,
        payment_month: 'October 2026',
        status: 'rejected',
        notes: 'Invalid UTR reference',
      }

      const rejResult = checkBatchFeeStatus({
        student,
        batch: monthlyBatch,
        feeRecords: [rejectedRecord],
        referenceDate: new Date('2026-10-15T10:00:00Z'),
      })

      expect(rejResult.isActive).toBe(false)
      expect(rejResult.isFrozen).toBe(true)
      expect(rejResult.status).toBe(BATCH_ACCESS_STATUS.REJECTED)
      expect(rejResult.message).toContain('Fee Payment was Rejected')

      // Recovery: admin marks it verified
      const recoveredRecord = { ...rejectedRecord, status: 'verified', notes: 'Recovered by admin' }
      const recResult = checkBatchFeeStatus({
        student,
        batch: monthlyBatch,
        feeRecords: [recoveredRecord],
        referenceDate: new Date('2026-10-15T10:00:00Z'),
      })

      expect(recResult.isActive).toBe(true)
      expect(recResult.isFrozen).toBe(false)
      expect(recResult.status).toBe(BATCH_ACCESS_STATUS.ACTIVE)
    })
  })

  describe('formatAccessStatusBadge formatting', () => {
    it('formats badges appropriately for all statuses', () => {
      expect(formatAccessStatusBadge({ status: BATCH_ACCESS_STATUS.ACTIVE }).label).toBe('Active')
      expect(formatAccessStatusBadge({ status: BATCH_ACCESS_STATUS.TRIAL, trialHoursLeft: 12 }).label).toBe('Trial Active (12h)')
      expect(formatAccessStatusBadge({ status: BATCH_ACCESS_STATUS.TRIAL_EXPIRED }).label).toBe('Trial Over')
      expect(formatAccessStatusBadge({ status: BATCH_ACCESS_STATUS.PENDING_VERIFICATION }).label).toBe('Under Review')
      expect(formatAccessStatusBadge({ status: BATCH_ACCESS_STATUS.REJECTED }).label).toBe('Payment Rejected')
      expect(formatAccessStatusBadge({ status: BATCH_ACCESS_STATUS.ADMIN_OVERRIDE, isWaived: true }).label).toBe('Fee Waived')
      expect(formatAccessStatusBadge({ status: BATCH_ACCESS_STATUS.ADMIN_OVERRIDE, isWaived: false }).label).toBe('Access Granted')
      expect(formatAccessStatusBadge({ status: BATCH_ACCESS_STATUS.FROZEN }).label).toBe('Access Frozen')
      expect(formatAccessStatusBadge({ status: BATCH_ACCESS_STATUS.SUSPENDED }).label).toBe('Suspended')
    })
  })
})
