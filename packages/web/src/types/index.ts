export type RecurrenceType =
  | 'none'
  | 'daily'
  | 'weekly'
  | 'monthly_on_day'
  | 'custom_days'
  | 'yearly'
  | 'weekly_on_day'

export type UrgencyLevel = 'none' | 'low' | 'medium' | 'high' | 'overdue'

export interface RecurrenceRule {
  id: string
  type: RecurrenceType
  dayOfMonth?: number | null
  intervalDays?: number | null
  weekdayMask?: number | null
  interval?: number | null
  anchorDate?: string | null
}

export interface User {
  id: string
  email: string
  username: string
  firstName?: string | null
  lastName?: string | null
  phone?: string | null
  createdAt: string
}

export interface TodoList {
  id: string
  userId: string
  title: string
  description?: string | null
  defaultCurrency?: string | null
  createdAt: string
  updatedAt: string
  uncompletedThisMonth?: number
  upcomingItems?: { id: string; title: string; dueDate: string }[]
}

export interface TodoItem {
  id: string
  listId: string
  recurrenceRuleId?: string | null
  title: string
  description?: string | null
  startDate?: string | null
  startTime?: string | null
  endTime?: string | null
  dueDate?: string | null
  amount?: string | null
  currency?: string | null
  url?: string | null
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
  amount?: string | null
  currency?: string | null
}

export interface ItemComment {
  id: string
  itemId: string
  userId: string
  content: string
  createdAt: string
  updatedAt: string
}

export interface AuditLog {
  id: string
  userId: string
  action: string
  entityType: string
  entityId: string
  summary?: string | null
  createdAt: string
}

export interface CalendarItem extends TodoItem {
  listTitle: string
  listId: string
}

export interface CalendarCompletion {
  id: string
  itemId: string
  completedAt: string
  dueDateSnapshot: string | null
  note: string | null
  itemTitle: string
  itemDescription: string | null
  listId: string
  listTitle: string
  /** True when this is the most recent completion – undo can safely revert dueDate */
  isLatestCompletion: boolean
}

export interface CalendarResponse {
  items: CalendarItem[]
  completions: CalendarCompletion[]
}
