import { apiClient } from './client'
import type { CalendarItem } from '../types'
import { format } from 'date-fns'

export const calendarApi = {
  getRange: (from: Date, to: Date) =>
    apiClient
      .get<CalendarItem[]>('/calendar', {
        params: { from: from.toISOString(), to: to.toISOString() },
      })
      .then((r) => r.data),
}
