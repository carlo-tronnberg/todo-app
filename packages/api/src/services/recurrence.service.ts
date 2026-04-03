import { addDays, addMonths, addYears, setDate, getDaysInMonth } from 'date-fns'
import { RecurrenceType } from '../types'

export interface RecurrenceRule {
  type: RecurrenceType
  dayOfMonth?: number | null
  intervalDays?: number | null
  weekdayMask?: number | null
  interval?: number | null // multiplier for the base period (default 1)
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
    const n = rule.interval ?? 1

    switch (rule.type) {
      case 'daily':
        return addDays(base, n)

      case 'weekly':
        return this.nextWeeklyDate(base, rule.weekdayMask ?? 0b1111111, n)

      case 'weekly_on_day': {
        // Exactly one weekday bit expected. Fall back to Monday (bit 1) if unset.
        const mask = rule.weekdayMask ?? 0b0000010
        if (mask === 0) throw new Error('weekdayMask must have at least one day set')
        return this.nextWeeklyDate(base, mask, n)
      }

      case 'monthly_on_day': {
        const targetDay = rule.dayOfMonth ?? 1
        const next = addMonths(base, n)
        return setDate(next, Math.min(targetDay, getDaysInMonth(next)))
      }

      case 'custom_days': {
        const interval = rule.intervalDays ?? 1
        if (interval < 1) throw new Error('intervalDays must be >= 1')
        return addDays(base, interval)
      }

      case 'yearly':
        return addYears(base, n)

      default:
        return null
    }
  }

  private nextWeeklyDate(from: Date, weekdayMask: number, interval = 1): Date {
    if (weekdayMask === 0) throw new Error('weekdayMask must have at least one day set')
    // For interval > 1, jump forward (interval - 1) weeks first, then find the next matching day
    let next = interval > 1 ? addDays(from, 7 * (interval - 1) + 1) : addDays(from, 1)
    while (!(weekdayMask & (1 << next.getDay()))) {
      next = addDays(next, 1)
    }
    return next
  }
}
