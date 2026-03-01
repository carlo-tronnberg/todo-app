import {
  addDays,
  addMonths,
  setDate,
  startOfDay,
  endOfDay,
  differenceInDays,
  isValid,
  parseISO,
} from 'date-fns'

export type UrgencyLevel = 'none' | 'low' | 'medium' | 'high' | 'overdue'

/**
 * Compute the urgency level of a todo item given its due date and today.
 * This is the canonical urgency logic shared between frontend and backend.
 *
 * > 7 days  → 'low'     (green)
 * 4–7 days  → 'medium'  (yellow)
 * 1–3 days  → 'high'    (orange)
 * 0 / past  → 'overdue' (red)
 * no date   → 'none'
 */
export function computeUrgency(dueDate: Date | null | undefined, today = new Date()): UrgencyLevel {
  if (!dueDate || !isValid(dueDate)) return 'none'
  const days = differenceInDays(startOfDay(dueDate), startOfDay(today))
  if (days < 0) return 'overdue'
  if (days === 0) return 'overdue'
  if (days <= 3) return 'high'
  if (days <= 7) return 'medium'
  return 'low'
}

export function parseDateOrNull(value: string | undefined | null): Date | null {
  if (!value) return null
  const d = parseISO(value)
  return isValid(d) ? d : null
}

export { addDays, addMonths, setDate, startOfDay, endOfDay, differenceInDays }
