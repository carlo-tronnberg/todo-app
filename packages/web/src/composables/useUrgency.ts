import { computed } from 'vue'
import { differenceInDays, startOfDay, isValid, parseISO } from 'date-fns'
import type { UrgencyLevel } from '../types'

export const URGENCY_COLORS: Record<UrgencyLevel, string> = {
  none: 'transparent',
  low: '#bbf7d0', // green-200
  medium: '#fef08a', // yellow-200
  high: '#fed7aa', // orange-200
  overdue: '#fecaca', // red-200
}

export const URGENCY_BORDER_COLORS: Record<UrgencyLevel, string> = {
  none: 'transparent',
  low: '#4ade80',
  medium: '#facc15',
  high: '#fb923c',
  overdue: '#f87171',
}

export const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  none: '',
  low: 'Due soon',
  medium: 'Due this week',
  high: 'Due in 1-3 days',
  overdue: 'Overdue',
}

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

/**
 * Returns reactive urgency level and style for a todo item's due date.
 */
export function useUrgency(dueDate: string | null | undefined, colorOverride?: string | null) {
  const level = computed<UrgencyLevel>(() => computeUrgencyLevel(dueDate))

  const backgroundColor = computed(() => {
    if (colorOverride) return colorOverride
    return URGENCY_COLORS[level.value]
  })

  const borderColor = computed(() => URGENCY_BORDER_COLORS[level.value])
  const label = computed(() => URGENCY_LABELS[level.value])

  return { level, backgroundColor, borderColor, label }
}
