import { describe, it, expect } from 'vitest'
import { RecurrenceService } from '../../../src/services/recurrence.service'

// TDD: written before implementation to define expected behavior
describe('RecurrenceService', () => {
  const svc = new RecurrenceService()

  describe('computeNextDueDate', () => {
    describe('none', () => {
      it('returns null for type=none', () => {
        const result = svc.computeNextDueDate({ type: 'none' }, new Date('2024-01-15'))
        expect(result).toBeNull()
      })
    })

    describe('daily', () => {
      it('advances by exactly one day', () => {
        const base = new Date('2024-01-15T10:00:00Z')
        const next = svc.computeNextDueDate({ type: 'daily' }, base)
        expect(next).not.toBeNull()
        expect(next!.toISOString().startsWith('2024-01-16')).toBe(true)
      })

      it('handles month-end rollover', () => {
        const base = new Date('2024-01-31T10:00:00Z')
        const next = svc.computeNextDueDate({ type: 'daily' }, base)
        expect(next!.toISOString().startsWith('2024-02-01')).toBe(true)
      })

      it('uses today as base when dueDate is null', () => {
        const before = new Date()
        const next = svc.computeNextDueDate({ type: 'daily' }, null)
        const after = new Date()
        expect(next).not.toBeNull()
        // next should be roughly tomorrow
        const diffMs = next!.getTime() - before.getTime()
        expect(diffMs).toBeGreaterThanOrEqual(24 * 60 * 60 * 1000 - 1000)
        expect(diffMs).toBeLessThanOrEqual(after.getTime() - before.getTime() + 24 * 60 * 60 * 1000 + 1000)
      })
    })

    describe('weekly', () => {
      it('advances to next Monday when mask is Monday-only (bit 2)', () => {
        // 2024-01-15 is a Monday. Next Monday = 2024-01-22
        const base = new Date('2024-01-15T10:00:00Z')
        // weekdayMask: Mon = 1 << 1 = 2
        const next = svc.computeNextDueDate({ type: 'weekly', weekdayMask: 0b0000010 }, base)
        expect(next!.toISOString().startsWith('2024-01-22')).toBe(true)
      })

      it('advances to next Tuesday when base is Monday', () => {
        // 2024-01-15 is Monday, next Tue = 2024-01-16
        const base = new Date('2024-01-15T00:00:00Z')
        // Tue = 1 << 2 = 4
        const next = svc.computeNextDueDate({ type: 'weekly', weekdayMask: 0b0000100 }, base)
        expect(next!.toISOString().startsWith('2024-01-16')).toBe(true)
      })

      it('throws when weekdayMask is 0', () => {
        expect(() =>
          svc.computeNextDueDate({ type: 'weekly', weekdayMask: 0 }, new Date())
        ).toThrow()
      })
    })

    describe('monthly_on_day', () => {
      it('advances to next month same day', () => {
        const base = new Date('2024-01-15T10:00:00Z')
        const next = svc.computeNextDueDate({ type: 'monthly_on_day', dayOfMonth: 15 }, base)
        expect(next!.getDate()).toBe(15)
        expect(next!.getMonth()).toBe(1) // February (0-indexed)
        expect(next!.getFullYear()).toBe(2024)
      })

      it('clamps day 31 to last day of February', () => {
        const base = new Date('2024-01-31T10:00:00Z')
        const next = svc.computeNextDueDate({ type: 'monthly_on_day', dayOfMonth: 31 }, base)
        // Feb 2024 has 29 days (leap year)
        expect(next!.getDate()).toBe(29)
        expect(next!.getMonth()).toBe(1)
      })

      it('uses day 1 when dayOfMonth is not provided', () => {
        const base = new Date('2024-03-15T10:00:00Z')
        const next = svc.computeNextDueDate({ type: 'monthly_on_day' }, base)
        expect(next!.getDate()).toBe(1)
        expect(next!.getMonth()).toBe(3) // April
      })
    })

    describe('custom_days', () => {
      it('advances by the specified interval', () => {
        const base = new Date('2024-01-15T10:00:00Z')
        const next = svc.computeNextDueDate({ type: 'custom_days', intervalDays: 30 }, base)
        expect(next!.toISOString().startsWith('2024-02-14')).toBe(true)
      })

      it('advances by 1 when intervalDays is not provided', () => {
        const base = new Date('2024-01-15T10:00:00Z')
        const next = svc.computeNextDueDate({ type: 'custom_days' }, base)
        expect(next!.toISOString().startsWith('2024-01-16')).toBe(true)
      })

      it('throws when intervalDays is less than 1', () => {
        expect(() =>
          svc.computeNextDueDate({ type: 'custom_days', intervalDays: 0 }, new Date())
        ).toThrow()
      })
    })
  })
})
