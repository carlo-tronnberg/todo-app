export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly_on_day' | 'custom_days'

export type UrgencyLevel = 'none' | 'low' | 'medium' | 'high' | 'overdue'

export interface RecurrenceRule {
  id: string
  type: RecurrenceType
  dayOfMonth?: number | null
  intervalDays?: number | null
  weekdayMask?: number | null
  anchorDate?: string | null
}

export interface User {
  id: string
  email: string
  username: string
  createdAt: string
}

export interface TodoList {
  id: string
  userId: string
  title: string
  description?: string | null
  createdAt: string
  updatedAt: string
}

export interface TodoItem {
  id: string
  listId: string
  recurrenceRuleId?: string | null
  title: string
  description?: string | null
  dueDate?: string | null
  colorOverride?: string | null
  isArchived: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
  recurrenceRule?: RecurrenceRule | null
}

export interface Completion {
  id: string
  itemId: string
  dueDateSnapshot?: string | null
  completedAt: string
  note?: string | null
}

export interface CalendarItem extends TodoItem {
  listTitle: string
  listId: string
}
