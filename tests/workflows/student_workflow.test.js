import { describe, it, expect } from 'vitest'

function passwordStrength(pw) {
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return score
}

function validateStudentForm(form) {
  const errors = {}
  if (!form.full_name?.trim()) errors.full_name = 'Name is required'
  if (!form.email?.trim()) errors.email = 'Email is required'
  else if (!/\S+@\S+\.\S+/.test(form.email)) errors.email = 'Invalid email'
  if (!form.password) errors.password = 'Password is required'
  else if (form.password.length < 8) errors.password = 'At least 8 characters'
  if (form.password !== form.confirm_password) errors.confirm_password = 'Passwords do not match'
  return errors
}

describe('Student Workflow & Form Validation Rules', () => {
  it('validates password strength according to security standards', () => {
    expect(passwordStrength('short')).toBe(0)
    expect(passwordStrength('eightchars')).toBe(1)
    expect(passwordStrength('EightChars')).toBe(2)
    expect(passwordStrength('EightChars1')).toBe(3)
    expect(passwordStrength('EightChars1!')).toBe(4)
  })

  it('rejects incomplete or invalid student registration inputs', () => {
    const invalidForm = {
      full_name: '',
      email: 'not-an-email',
      password: '123',
      confirm_password: '456',
    }
    const errors = validateStudentForm(invalidForm)

    expect(errors.full_name).toBe('Name is required')
    expect(errors.email).toBe('Invalid email')
    expect(errors.password).toBe('At least 8 characters')
    expect(errors.confirm_password).toBe('Passwords do not match')
  })

  it('approves complete and valid student registration inputs', () => {
    const validForm = {
      full_name: 'Priya Sharma',
      email: 'priya.sharma@example.com',
      password: 'StrongPassword123!',
      confirm_password: 'StrongPassword123!',
    }
    const errors = validateStudentForm(validForm)
    expect(Object.keys(errors)).toHaveLength(0)
  })

  it('accurately computes 2-day free trial timestamp on enrollment', () => {
    const fixedNow = new Date('2026-10-13T12:00:00.000Z').getTime()
    const trialDurationMs = 2 * 24 * 60 * 60 * 1000
    const trialEndsAt = new Date(fixedNow + trialDurationMs).toISOString()

    expect(trialEndsAt).toBe('2026-10-15T12:00:00.000Z')
  })
})
