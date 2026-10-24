import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  getMessageExpirationInfo,
  toggleKeepMessage,
  toggleBulkKeepMessages,
  triggerOpportunisticCleanup,
} from '../../src/services/messageService'
import MessageRetentionNotice from '../../src/components/shared/MessageRetentionNotice'
import BulkMessageActionBar from '../../src/components/shared/BulkMessageActionBar'

describe('Messages 3-Month Retention & Star/Keep System', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear()
    }
  })

  describe('1. Expiration & Retention Logic', () => {
    it('correctly calculates unexpired message within 90-day window', () => {
      const now = Date.now()
      const tenDaysAgo = new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString()
      const info = getMessageExpirationInfo(tenDaysAgo, false)

      expect(info.isExpired).toBe(false)
      expect(info.isStarred).toBe(false)
      expect(info.daysElapsed).toBe(10)
      expect(info.daysRemaining).toBe(80)
    })

    it('correctly identifies expired message older than 90 days', () => {
      const now = Date.now()
      const hundredDaysAgo = new Date(now - 100 * 24 * 60 * 60 * 1000).toISOString()
      const info = getMessageExpirationInfo(hundredDaysAgo, false)

      expect(info.isExpired).toBe(true)
      expect(info.daysRemaining).toBe(0)
    })

    it('marks starred/kept messages as permanently preserved (never expired)', () => {
      const now = Date.now()
      const yearAgo = new Date(now - 365 * 24 * 60 * 60 * 1000).toISOString()
      const info = getMessageExpirationInfo(yearAgo, true)

      expect(info.isExpired).toBe(false)
      expect(info.isStarred).toBe(true)
      expect(info.daysRemaining).toBe(Infinity)
    })

    it('handles invalid timestamps safely without throwing', () => {
      const info = getMessageExpirationInfo('invalid-date', false)
      expect(info.isExpired).toBe(false)
      expect(info.daysRemaining).toBe(90)
    })
  })

  describe('2. MessageRetentionNotice Component', () => {
    it('renders the minimalistic WhatsApp-style retention pill text', () => {
      render(
        <MessageRetentionNotice
          keptCount={3}
          isKeptFilterActive={false}
          onViewKept={() => {}}
        />
      )

      expect(screen.getByText(/Messages delete after 90 days/i)).toBeInTheDocument()
      expect(screen.getByText(/Star to keep/i)).toBeInTheDocument()
      expect(screen.getByText(/⭐ 3/i)).toBeInTheDocument()
    })

    it('triggers onViewKept when clicked with kept messages', () => {
      const onViewKept = vi.fn()
      render(
        <MessageRetentionNotice
          keptCount={2}
          isKeptFilterActive={false}
          onViewKept={onViewKept}
        />
      )

      const pillButton = screen.getByRole('button')
      fireEvent.click(pillButton)
      expect(onViewKept).toHaveBeenCalledTimes(1)
    })

    it('renders as non-clickable when there are zero kept messages', () => {
      render(
        <MessageRetentionNotice
          keptCount={0}
          isKeptFilterActive={false}
          onViewKept={() => {}}
        />
      )

      const pillButton = screen.getByRole('button')
      expect(pillButton).toBeDisabled()
    })
  })

  describe('3. BulkMessageActionBar Component', () => {
    it('renders selected count and triggers Keep Selected and Unkeep Selected', () => {
      const onSelectAll = vi.fn()
      const onKeepSelected = vi.fn()
      const onUnkeepSelected = vi.fn()
      const onCancel = vi.fn()

      render(
        <BulkMessageActionBar
          selectedCount={4}
          totalCount={10}
          onSelectAll={onSelectAll}
          onKeepSelected={onKeepSelected}
          onUnkeepSelected={onUnkeepSelected}
          onCancel={onCancel}
        />
      )

      expect(screen.getByText(/4/i)).toBeInTheDocument()
      expect(screen.getByText(/of 10 selected/i)).toBeInTheDocument()

      const keepBtn = screen.getByRole('button', { name: /keep selected/i })
      fireEvent.click(keepBtn)
      expect(onKeepSelected).toHaveBeenCalledTimes(1)

      const unkeepBtn = screen.getByRole('button', { name: /unkeep/i })
      fireEvent.click(unkeepBtn)
      expect(onUnkeepSelected).toHaveBeenCalledTimes(1)

      const cancelBtn = screen.getByRole('button', { name: /exit selection mode/i })
      fireEvent.click(cancelBtn)
      expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('disables keep and unkeep buttons when selectedCount is 0', () => {
      render(
        <BulkMessageActionBar
          selectedCount={0}
          totalCount={8}
          onSelectAll={() => {}}
        />
      )

      const keepBtn = screen.getByRole('button', { name: /keep selected/i })
      expect(keepBtn).toBeDisabled()
    })
  })

  describe('4. Opportunistic Cleanup Throttling', () => {
    it('throttles execution to prevent spamming server RPCs', async () => {
      // First invocation sets localStorage timestamp
      await triggerOpportunisticCleanup()
      const firstTs = window.localStorage.getItem('ta_messages_last_cleanup_timestamp')
      expect(firstTs).toBeTruthy()

      // Immediate second call should be ignored due to 24h throttle
      await triggerOpportunisticCleanup()
      expect(window.localStorage.getItem('ta_messages_last_cleanup_timestamp')).toBe(firstTs)
    })
  })
})
