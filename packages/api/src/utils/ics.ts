import { format, addDays } from 'date-fns'

type RecurrenceType =
  | 'none'
  | 'daily'
  | 'weekly'
  | 'monthly_on_day'
  | 'custom_days'
  | 'yearly'
  | 'weekly_on_day'

interface IcsItem {
  id: string
  title: string
  description?: string | null
  dueDate: Date
  recurrenceRule?: {
    type: RecurrenceType
    dayOfMonth?: number | null
    intervalDays?: number | null
    weekdayMask?: number | null
  } | null
}

// Weekday bitmask → ICS BYDAY string (Sun=1, Mon=2, Tue=4 … Sat=64)
const BITMASK_TO_ICS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']

function buildRrule(rule: IcsItem['recurrenceRule']): string | null {
  if (!rule || rule.type === 'none') return null
  switch (rule.type) {
    case 'daily':
      return 'FREQ=DAILY'
    case 'weekly': {
      const mask = rule.weekdayMask ?? 0b1111111
      const days = BITMASK_TO_ICS.filter((_, i) => mask & (1 << i)).join(',')
      return `FREQ=WEEKLY;BYDAY=${days || 'MO'}`
    }
    case 'monthly_on_day':
      return `FREQ=MONTHLY;BYMONTHDAY=${rule.dayOfMonth ?? 1}`
    case 'custom_days':
      return `FREQ=DAILY;INTERVAL=${rule.intervalDays ?? 1}`
    case 'yearly':
      return 'FREQ=YEARLY'
    case 'weekly_on_day': {
      // Single weekday stored as one bit in weekdayMask (Sun=1, Mon=2, Tue=4 … Sat=64)
      const mask = rule.weekdayMask ?? 0b0000010 // default Monday
      const day = BITMASK_TO_ICS.find((_, i) => mask & (1 << i)) ?? 'MO'
      return `FREQ=WEEKLY;BYDAY=${day}`
    }
    default:
      return null
  }
}

/** Escape special characters in iCalendar text properties */
function escapeIcs(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '')
}

/** Fold long iCal lines at 75 octets (RFC 5545 §3.1) */
function foldLine(line: string): string {
  const MAX = 75
  if (line.length <= MAX) return line
  const parts: string[] = []
  let pos = 0
  while (pos < line.length) {
    if (pos === 0) {
      parts.push(line.slice(0, MAX))
      pos = MAX
    } else {
      parts.push(' ' + line.slice(pos, pos + MAX - 1))
      pos += MAX - 1
    }
  }
  return parts.join('\r\n')
}

/** Format a Date as iCal DATE (all-day): 20240115 */
function icsDate(d: Date): string {
  return format(d, 'yyyyMMdd')
}

/** Format a Date as iCal DATETIME in UTC: 20240115T000000Z */
function icsDateTime(d: Date): string {
  return format(d, "yyyyMMdd'T'HHmmss'Z'")
}

/**
 * Generate a valid iCalendar (.ics) string from a list of todo items.
 * Each item becomes a VEVENT. Recurring items include an RRULE.
 */
export function generateIcs(items: IcsItem[], calendarName = 'Todo Tracker'): string {
  const now = icsDateTime(new Date())
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Todo Tracker//Todo Tracker 1.0//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcs(calendarName)}`,
    'X-WR-TIMEZONE:UTC',
  ]

  for (const item of items) {
    const rrule = buildRrule(item.recurrenceRule)

    lines.push('BEGIN:VEVENT')
    lines.push(`UID:todo-${item.id}@todo-tracker`)
    lines.push(`DTSTAMP:${now}`)
    // Use DATE (all-day) events so they sit on the correct day in all timezones
    lines.push(`DTSTART;VALUE=DATE:${icsDate(item.dueDate)}`)
    lines.push(`DTEND;VALUE=DATE:${icsDate(addDays(item.dueDate, 1))}`)
    lines.push(foldLine(`SUMMARY:${escapeIcs(item.title)}`))
    if (item.description) {
      lines.push(foldLine(`DESCRIPTION:${escapeIcs(item.description)}`))
    }
    if (rrule) {
      lines.push(`RRULE:${rrule}`)
    }
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')
  return lines.map(foldLine).join('\r\n')
}
