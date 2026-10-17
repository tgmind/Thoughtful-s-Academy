import { describe, it, expect } from 'vitest'
import {
  formatTimestamp,
  isMissingTableError,
  createDoubt,
} from '../../src/services/doubtService'

describe('doubtService Unit Tests', () => {
  describe('formatTimestamp helper', () => {
    it('formats seconds below 1 minute as M:SS', () => {
      expect(formatTimestamp(0)).toBe('0:00')
      expect(formatTimestamp(5)).toBe('0:05')
      expect(formatTimestamp(59)).toBe('0:59')
    })

    it('formats minutes and seconds as M:SS or MM:SS', () => {
      expect(formatTimestamp(60)).toBe('1:00')
      expect(formatTimestamp(75)).toBe('1:15')
      expect(formatTimestamp(599)).toBe('9:59')
      expect(formatTimestamp(600)).toBe('10:00')
    })

    it('formats hours, minutes, and seconds as H:MM:SS', () => {
      expect(formatTimestamp(3600)).toBe('1:00:00')
      expect(formatTimestamp(3665)).toBe('1:01:05')
      expect(formatTimestamp(7325)).toBe('2:02:05')
    })

    it('handles negative or invalid inputs gracefully', () => {
      expect(formatTimestamp(-10)).toBe('0:00')
      expect(formatTimestamp(null)).toBe('0:00')
      expect(formatTimestamp(undefined)).toBe('0:00')
      expect(formatTimestamp(NaN)).toBe('0:00')
    })
  })

  describe('isMissingTableError helper', () => {
    it('identifies PGRST205 error code', () => {
      expect(isMissingTableError({ code: 'PGRST205', message: 'Not found' })).toBe(true)
    })

    it('identifies schema cache error messages', () => {
      expect(isMissingTableError({ message: "Could not find the table 'public.doubts' in the schema cache" })).toBe(true)
    })

    it('returns false for unrelated errors', () => {
      expect(isMissingTableError({ code: '23505', message: 'duplicate key' })).toBe(false)
      expect(isMissingTableError(null)).toBe(false)
      expect(isMissingTableError(undefined)).toBe(false)
    })
  })

  describe('createDoubt parameter validation', () => {
    it('throws error when required fields are missing', async () => {
      await expect(createDoubt({})).rejects.toThrow('Student ID, lecture title, and question text are required.')
      await expect(
        createDoubt({
          student_id: '123',
          lecture_title: '',
          question: 'Hello',
        })
      ).rejects.toThrow('Student ID, lecture title, and question text are required.')
      await expect(
        createDoubt({
          student_id: '123',
          lecture_title: 'Physics 101',
          question: '   ',
        })
      ).rejects.toThrow('Student ID, lecture title, and question text are required.')
    })
  })
})
