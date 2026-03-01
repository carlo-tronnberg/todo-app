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
        expect(diffMs).toBeLessThanOrEqual(
          after.getTime() - before.getTime() + 24 * 60 * 60 * 1000 + 1000
        )
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

    describe('unknown type (defensive default branch)', () => {
      it('returns null for an unrecognised recurrence type', () => {
        // TypeScript won't allow an invalid literal, so we cast through unknown.
        const unknownRule = { type: 'biweekly' as unknown as 'daily' }
        const result = svc.computeNextDueDate(unknownRule, new Date('2024-01-15'))
        expect(result).toBeNull()
      })
    })

    describe('yearly', () => {
      it('advances exactly one year on a standard date', () => {
        const base = new Date('2024-03-15T10:00:00Z')
        const next = svc.computeNextDueDate({ type: 'yearly' }, base)
        expect(next).not.toBeNull()
        expect(next!.getFullYear()).toBe(2025)
        expect(next!.getMonth()).toBe(2) // March (0-indexed)
        expect(next!.getDate()).toBe(15)
      })

      it('clamps Feb 29 to Feb 28 on a non-leap year', () => {
        // 2024 is a leap year; 2025 is not
        const base = new Date('2024-02-29T10:00:00Z')
        const next = svc.computeNextDueDate({ type: 'yearly' }, base)
        expect(next!.getFullYear()).toBe(2025)
        expect(next!.getMonth()).toBe(1) // February
        expect(next!.getDate()).toBe(28)
      })

      it('handles Dec 31 rollover correctly', () => {
        const base = new Date('2024-12-31T10:00:00Z')
        const next = svc.computeNextDueDate({ type: 'yearly' }, base)
        expect(next!.getFullYear()).toBe(2025)
        expect(next!.getMonth()).toBe(11) // December
        expect(next!.getDate()).toBe(31)
      })
    })

    describe('weekly_on_day', () => {
      it('advances to next Wednesday when base is Monday (mask=Wed=8)', () => {
        // 2024-01-15 is a Monday; next Wednesday = 2024-01-17
        const base = new Date('2024-01-15T10:00:00Z')
        const next = svc.computeNextDueDate({ type: 'weekly_on_day', weekdayMask: 0b0001000 }, base) // Wed = 1<<3
        expect(next!.toISOString().startsWith('2024-01-17')).toBe(true)
      })

      it('advances to the *next* occurrence of the same weekday (full week forward)', () => {
        // 2024-01-15 is Monday; next Monday = 2024-01-22
        const base = new Date('2024-01-15T10:00:00Z')
        const next = svc.computeNextDueDate({ type: 'weekly_on_day', weekdayMask: 0b0000010 }, base) // Mon = 1<<1
        expect(next!.toISOString().startsWith('2024-01-22')).toBe(true)
      })

      it('advances to next Friday from Wednesday (mask=Fri=32)', () => {
        // 2024-01-17 is Wednesday; next Friday = 2024-01-19
        const base = new Date('2024-01-17T10:00:00Z')
        const next = svc.computeNextDueDate({ type: 'weekly_on_day', weekdayMask: 0b0100000 }, base) // Fri = 1<<5
        expect(next!.toISOString().startsWith('2024-01-19')).toBe(true)
      })

      it('defaults to Monday when weekdayMask is not provided', () => {
        // 2024-01-15 is Monday; next Monday = 2024-01-22
        const base = new Date('2024-01-15T10:00:00Z')
        const next = svc.computeNextDueDate({ type: 'weekly_on_day' }, base)
        expect(next!.toISOString().startsWith('2024-01-22')).toBe(true)
      })

      it('throws when weekdayMask is 0', () => {
        expect(() =>
          svc.computeNextDueDate({ type: 'weekly_on_day', weekdayMask: 0 }, new Date())
        ).toThrow()
      })
    })
  })
})
