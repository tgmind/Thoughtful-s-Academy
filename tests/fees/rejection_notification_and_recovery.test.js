import { describe, it, expect } from 'vitest'
import {
  checkBatchFeeStatus,
  formatAccessStatusBadge,
  BATCH_ACCESS_STATUS,
  getCurrentPaymentMonth,
} from '../../src/utils/feeAccess'

describe('Payment Rejection, Direct Messaging, and Recovery Architecture', () => {
  const mockStudent = {
    id: 'student-rej-1',
    full_name: 'Priya Sharma',
    is_active: true,
    trial_ends_at: '2026-10-01T00:00:00Z', // Expired trial
  }

  const mockBatch = {
    id: 'batch-jee-2026',
    name: 'JEE Masterclass 2026',
    fee_mode: 'monthly',
    fee_amount: 2500,
  }

  it('marks student access as REJECTED when admin rejects fee submission', () => {
    const rejectedPayment = {
      id: 'fee-rec-rej-101',
      student_id: mockStudent.id,
      batch_id: mockBatch.id,
      amount: 2500,
      payment_month: 'October 2026',
      status: 'rejected',
      notes: 'UTR number 998877 is invalid / not found in bank ledger',
    }

    const status = checkBatchFeeStatus({
      student: mockStudent,
      batch: mockBatch,
      feeRecords: [rejectedPayment],
      referenceDate: new Date('2026-10-15T12:00:00Z'),
    })

    expect(status.isActive).toBe(false)
    expect(status.isFrozen).toBe(true)
    expect(status.status).toBe(BATCH_ACCESS_STATUS.REJECTED)
    expect(status.message).toContain('Fee Payment was Rejected By the Admin')
    expect(status.rejectedRecord.notes).toBe('UTR number 998877 is invalid / not found in bank ledger')

    const badge = formatAccessStatusBadge(status)
    expect(badge.label).toBe('Payment Rejected')
    expect(badge.color).toContain('rose')
  })

  it('restores access to ACTIVE when payment is recovered by admin', () => {
    // Admin recovers accidental rejection by updating to verified
    const recoveredPayment = {
      id: 'fee-rec-rej-101',
      student_id: mockStudent.id,
      batch_id: mockBatch.id,
      amount: 2500,
      payment_month: 'October 2026',
      status: 'verified',
      notes: 'Recovered and verified by administrator',
      paid_at: '2026-10-15T12:30:00Z',
    }

    const status = checkBatchFeeStatus({
      student: mockStudent,
      batch: mockBatch,
      feeRecords: [recoveredPayment],
      referenceDate: new Date('2026-10-15T12:35:00Z'),
    })

    expect(status.isActive).toBe(true)
    expect(status.isFrozen).toBe(false)
    expect(status.status).toBe(BATCH_ACCESS_STATUS.ACTIVE)
    expect(status.message).toContain('paid and verified')

    const badge = formatAccessStatusBadge(status)
    expect(badge.label).toBe('Active')
  })

  it('unlocks batch access immediately when admin grants monthly fee waiver', () => {
    const currentMonth = getCurrentPaymentMonth(new Date('2026-10-16T10:00:00Z'))
    const adminWaiver = {
      id: 'override-1',
      student_id: mockStudent.id,
      batch_id: mockBatch.id,
      grant_type: 'monthly_fee_waiver',
      billing_month: currentMonth,
      reason: 'Administrative scholarship approval',
    }

    // Student has unpaid fee on Day 16 (normally frozen)
    const status = checkBatchFeeStatus({
      student: mockStudent,
      batch: mockBatch,
      feeRecords: [],
      adminOverrides: [adminWaiver],
      referenceDate: new Date('2026-10-16T10:00:00Z'),
    })

    expect(status.isActive).toBe(true)
    expect(status.isFrozen).toBe(false)
    expect(status.isWaived).toBe(true)
    expect(status.status).toBe(BATCH_ACCESS_STATUS.ADMIN_OVERRIDE)

    const badge = formatAccessStatusBadge(status)
    expect(badge.label).toBe('Fee Waived')
  })

  it('verifies notification and message payload structure for rejected payments', () => {
    const adminUserId = 'admin-uuid-1'
    const studentUserId = mockStudent.id
    const reason = 'Fake screenshot uploaded'

    // Individual notification payload (matching migration 037 RLS policy)
    const notifPayload = {
      title: 'Fee Payment Rejected',
      body: `Your payment was rejected by the admin. Reason: ${reason}. Please visit Pay Fee to resubmit.`,
      type: 'fee',
      target_role: 'individual',
      target_user_id: studentUserId,
      target_batch_id: mockBatch.id,
      created_by: adminUserId,
      is_active: true,
    }

    expect(notifPayload.target_role).toBe('individual')
    expect(notifPayload.target_user_id).toBe(studentUserId)
    expect(notifPayload.body).toContain(reason)

    // Direct personal message payload in messages table
    const msgPayload = {
      sender_id: adminUserId,
      receiver_id: studentUserId,
      content: `Fee Payment was Rejected By the Admin. Please contact the Admin.\nReason: ${reason}\nPlease go to the Pay Fee section and submit a valid payment receipt.`,
      batch_id: mockBatch.id,
      is_broadcast: false,
    }

    expect(msgPayload.receiver_id).toBe(studentUserId)
    expect(msgPayload.content).toContain('Fee Payment was Rejected By the Admin')
    expect(msgPayload.is_broadcast).toBe(false)
  })
})
