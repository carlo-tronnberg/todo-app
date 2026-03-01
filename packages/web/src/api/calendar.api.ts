import { apiClient } from './client'
import type { CalendarResponse } from '../types'

export const calendarApi = {
  /** Fetch upcoming items and completions for a date range */
  getRange: (from: Date, to: Date): Promise<CalendarResponse> =>
    apiClient
      .get<CalendarResponse>('/calendar', {
        params: { from: from.toISOString(), to: to.toISOString() },
      })
      .then((r) => r.data),

  /**
   * Build the iCal subscription URL for the current user.
   * Uses a JWT query-param so calendar apps can subscribe without custom headers.
   * Returns https://, webcal:// and Google Calendar add-URL variants.
   */
  getIcalUrls(): { https: string; webcal: string; google: string } {
    const token = localStorage.getItem('auth_token') ?? ''
    const httpsUrl = `${window.location.origin}/api/calendar/ical?token=${encodeURIComponent(token)}`
    const webcalUrl = httpsUrl.replace(/^https?:\/\//, 'webcal://')
    const googleUrl = `https://www.google.com/calendar/render?cid=${encodeURIComponent(webcalUrl)}`
    return { https: httpsUrl, webcal: webcalUrl, google: googleUrl }
  },
}
