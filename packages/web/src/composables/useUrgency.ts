import { differenceInDays, startOfDay, isValid, parseISO } from 'date-fns'
import type { UrgencyLevel } from '../types'

/**
 * Compute the urgency level from a due-date ISO string.
 * Used both in components and for list sorting.
 *
 * > 7 days  → 'low'
 * 4–7 days  → 'medium'
 * 1–3 days  → 'high'
 * 0 / past  → 'overdue'
 * no date   → 'none'
 */
export function computeUrgencyLevel(dueDate: string | null | undefined): UrgencyLevel {
  if (!dueDate) return 'none'
  const parsed = parseISO(dueDate)
  if (!isValid(parsed)) return 'none'

  const days = differenceInDays(startOfDay(parsed), startOfDay(new Date()))
  if (days < 0) return 'overdue'
  if (days === 0) return 'overdue'
  if (days <= 3) return 'high'
  if (days <= 7) return 'medium'
  return 'low'
}
