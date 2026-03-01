import { addDays, addMonths, addYears, setDate, getDaysInMonth } from 'date-fns'
import { RecurrenceType } from '../types'

export interface RecurrenceRule {
  type: RecurrenceType
  dayOfMonth?: number | null
  intervalDays?: number | null
  weekdayMask?: number | null
  anchorDate?: Date | null
}

/**
 * Pure domain service for computing recurrence. No database dependencies.
 * Fully covered by unit tests (TDD).
 */
export class RecurrenceService {
  /**
   * Given a recurrence rule and the current due date, compute the next due date.
   * Returns null if the rule type is 'none'.
   */
  computeNextDueDate(rule: RecurrenceRule, currentDueDate: Date | null): Date | null {
    if (rule.type === 'none') return null

    const base = currentDueDate ?? new Date()

    switch (rule.type) {
      case 'daily':
        return addDays(base, 1)

      case 'weekly':
        return this.nextWeeklyDate(base, rule.weekdayMask ?? 0b1111111)

      case 'weekly_on_day': {
        // Exactly one weekday bit expected. Fall back to Monday (bit 1) if unset.
        const mask = rule.weekdayMask ?? 0b0000010
        if (mask === 0) throw new Error('weekdayMask must have at least one day set')
        return this.nextWeeklyDate(base, mask)
      }

      case 'monthly_on_day': {
        const targetDay = rule.dayOfMonth ?? 1
        // Move one month forward then set the target day,
        // clamping to the last day of the month (handles e.g. day=31 in February)
        const next = addMonths(base, 1)
        return setDate(next, Math.min(targetDay, getDaysInMonth(next)))
      }

      case 'custom_days': {
        const interval = rule.intervalDays ?? 1
        if (interval < 1) throw new Error('intervalDays must be >= 1')
        return addDays(base, interval)
      }

      case 'yearly':
        // Same month+day, one year later.
        // date-fns addYears automatically clamps Feb-29 → Feb-28 on non-leap years.
        return addYears(base, 1)

      default:
        return null
    }
  }

  private nextWeeklyDate(from: Date, weekdayMask: number): Date {
    if (weekdayMask === 0) throw new Error('weekdayMask must have at least one day set')
    let next = addDays(from, 1)
    // Advance day-by-day until we hit a day whose bit is set
    while (!(weekdayMask & (1 << next.getDay()))) {
      next = addDays(next, 1)
    }
    return next
  }
}
