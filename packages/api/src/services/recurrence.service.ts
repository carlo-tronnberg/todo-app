import { addDays, addMonths, setDate } from 'date-fns'
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

      case 'monthly_on_day': {
        const targetDay = rule.dayOfMonth ?? 1
        // Move one month forward then set the target day
        const next = addMonths(base, 1)
        // Clamp to last day of month to handle e.g. day=31 in February
        const daysInMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
        return setDate(next, Math.min(targetDay, daysInMonth))
      }

      case 'custom_days': {
        const interval = rule.intervalDays ?? 1
        if (interval < 1) throw new Error('intervalDays must be >= 1')
        return addDays(base, interval)
      }

      default:
        return null
    }
  }

  private nextWeeklyDate(from: Date, weekdayMask: number): Date {
    if (weekdayMask === 0) throw new Error('weekdayMask must have at least one day set')
    let next = addDays(from, 1)
    // Advance until we hit a day whose bit is set
    for (let i = 0; i < 7; i++) {
      if (weekdayMask & (1 << next.getDay())) return next
      next = addDays(next, 1)
    }
    // Fallback: should never reach here with valid mask
    return next
  }
}
