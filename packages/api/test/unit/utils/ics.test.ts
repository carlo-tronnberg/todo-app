import { describe, it, expect } from 'vitest'
import { generateIcs } from '../../../src/utils/ics'

// ── helpers ────────────────────────────────────────────────────────────────

/** Unfold RFC 5545 line continuations so tests can check full property values. */
function unfold(ics: string): string {
  return ics.replace(/\r\n /g, '')
}

/** Extract all VEVENT blocks from an ICS string. */
function extractEvents(ics: string): string[] {
  const events: string[] = []
  const regex = /BEGIN:VEVENT[\s\S]*?END:VEVENT/g
  let match
  while ((match = regex.exec(ics)) !== null) events.push(match[0])
  return events
}

/** Return the value of a property line in an unfolded ICS block, or undefined. */
function prop(block: string, name: string): string | undefined {
  const unfolded = unfold(block)
  const line = unfolded.split('\r\n').find((l) => l.startsWith(`${name}:`))
  return line ? line.slice(name.length + 1) : undefined
}

// ── tests ──────────────────────────────────────────────────────────────────

describe('generateIcs', () => {
  describe('calendar envelope', () => {
    it('produces a valid VCALENDAR wrapper', () => {
      const ics = generateIcs([])
      expect(ics).toContain('BEGIN:VCALENDAR')
      expect(ics).toContain('END:VCALENDAR')
      expect(ics).toContain('VERSION:2.0')
      expect(ics).toContain('METHOD:PUBLISH')
    })

    it('uses the default calendar name when none is supplied', () => {
      const ics = generateIcs([])
      expect(ics).toContain('X-WR-CALNAME:Todo Tracker')
    })

    it('uses a custom calendar name when supplied', () => {
      const ics = generateIcs([], 'My Tasks')
      expect(ics).toContain('X-WR-CALNAME:My Tasks')
    })

    it('escapes special characters in the calendar name', () => {
      const ics = generateIcs([], 'Tasks; Work, Home')
      expect(ics).toContain('X-WR-CALNAME:Tasks\\; Work\\, Home')
    })

    it('produces no VEVENTs for an empty items array', () => {
      const ics = generateIcs([])
      expect(ics).not.toContain('BEGIN:VEVENT')
    })
  })

  describe('single item — core VEVENT properties', () => {
    const dueDate = new Date('2024-06-15T00:00:00Z')
    const item = {
      id: 'abc123',
      title: 'Buy groceries',
      dueDate,
    }

    it('wraps the item in a VEVENT', () => {
      const events = extractEvents(generateIcs([item]))
      expect(events).toHaveLength(1)
    })

    it('sets UID based on item id', () => {
      const [event] = extractEvents(generateIcs([item]))
      expect(prop(event, 'UID')).toBe('todo-abc123@todo-tracker')
    })

    it('sets DTSTART as all-day DATE', () => {
      const [event] = extractEvents(generateIcs([item]))
      const dtstart = prop(event, 'DTSTART;VALUE=DATE')
      expect(dtstart).toBe('20240615')
    })

    it('sets DTEND to the day after DTSTART', () => {
      const [event] = extractEvents(generateIcs([item]))
      const dtend = prop(event, 'DTEND;VALUE=DATE')
      expect(dtend).toBe('20240616')
    })

    it('sets SUMMARY from item title', () => {
      const [event] = extractEvents(generateIcs([item]))
      expect(prop(event, 'SUMMARY')).toBe('Buy groceries')
    })

    it('omits DESCRIPTION when item has no description', () => {
      const [event] = extractEvents(generateIcs([item]))
      expect(unfold(event)).not.toContain('DESCRIPTION:')
    })

    it('omits RRULE when item has no recurrence rule', () => {
      const [event] = extractEvents(generateIcs([item]))
      expect(event).not.toContain('RRULE:')
    })
  })

  describe('description handling', () => {
    it('includes DESCRIPTION when provided', () => {
      const item = {
        id: '1',
        title: 'Task',
        description: 'Some details',
        dueDate: new Date('2024-01-01'),
      }
      const [event] = extractEvents(generateIcs([item]))
      expect(prop(event, 'DESCRIPTION')).toBe('Some details')
    })

    it('escapes special characters in description', () => {
      const item = {
        id: '1',
        title: 'Task',
        description: 'Line1\nLine2; more, stuff',
        dueDate: new Date('2024-01-01'),
      }
      const [event] = extractEvents(generateIcs([item]))
      expect(prop(event, 'DESCRIPTION')).toBe('Line1\\nLine2\\; more\\, stuff')
    })
  })

  describe('SUMMARY escaping', () => {
    it('escapes semicolons, commas, and backslashes in title', () => {
      const item = {
        id: '1',
        title: 'Buy milk; bread, and\\eggs',
        dueDate: new Date('2024-01-01'),
      }
      const [event] = extractEvents(generateIcs([item]))
      expect(prop(event, 'SUMMARY')).toBe('Buy milk\\; bread\\, and\\\\eggs')
    })
  })

  describe('line folding (RFC 5545 §3.1)', () => {
    it('folds lines longer than 75 octets', () => {
      const longTitle = 'A'.repeat(80)
      const item = { id: '1', title: longTitle, dueDate: new Date('2024-01-01') }
      const ics = generateIcs([item])
      // Each logical line in the output must be ≤75 chars; continuation lines start with a space
      const lines = ics.split('\r\n')
      for (const line of lines) {
        expect(line.length).toBeLessThanOrEqual(75)
      }
    })

    it('reconstructs the original title after unfolding', () => {
      const longTitle = 'B'.repeat(200)
      const item = { id: '1', title: longTitle, dueDate: new Date('2024-01-01') }
      const [event] = extractEvents(generateIcs([item]))
      expect(prop(event, 'SUMMARY')).toBe(longTitle)
    })
  })

  describe('multiple items', () => {
    it('produces one VEVENT per item', () => {
      const items = [
        { id: '1', title: 'Task 1', dueDate: new Date('2024-01-01') },
        { id: '2', title: 'Task 2', dueDate: new Date('2024-01-02') },
        { id: '3', title: 'Task 3', dueDate: new Date('2024-01-03') },
      ]
      const events = extractEvents(generateIcs(items))
      expect(events).toHaveLength(3)
    })
  })

  describe('RRULE generation', () => {
    const dueDate = new Date('2024-06-15T00:00:00Z')

    it('omits RRULE for type=none', () => {
      const item = {
        id: '1',
        title: 'T',
        dueDate,
        recurrenceRule: { type: 'none' as const },
      }
      const [event] = extractEvents(generateIcs([item]))
      expect(event).not.toContain('RRULE:')
    })

    it('omits RRULE when recurrenceRule is null', () => {
      const item = { id: '1', title: 'T', dueDate, recurrenceRule: null }
      const [event] = extractEvents(generateIcs([item]))
      expect(event).not.toContain('RRULE:')
    })

    it('daily → FREQ=DAILY', () => {
      const item = {
        id: '1',
        title: 'T',
        dueDate,
        recurrenceRule: { type: 'daily' as const },
      }
      const [event] = extractEvents(generateIcs([item]))
      expect(prop(event, 'RRULE')).toBe('FREQ=DAILY')
    })

    it('weekly with Mon+Wed+Fri mask → FREQ=WEEKLY;BYDAY=MO,WE,FR', () => {
      // Mon=bit1=2, Wed=bit3=8, Fri=bit5=32  →  mask = 42
      const item = {
        id: '1',
        title: 'T',
        dueDate,
        recurrenceRule: { type: 'weekly' as const, weekdayMask: 42 },
      }
      const [event] = extractEvents(generateIcs([item]))
      expect(prop(event, 'RRULE')).toBe('FREQ=WEEKLY;BYDAY=MO,WE,FR')
    })

    it('weekly with no mask defaults to all days', () => {
      const item = {
        id: '1',
        title: 'T',
        dueDate,
        recurrenceRule: { type: 'weekly' as const },
      }
      const [event] = extractEvents(generateIcs([item]))
      expect(prop(event, 'RRULE')).toContain('FREQ=WEEKLY')
    })

    it('weekly with mask=0 falls back to MO', () => {
      const item = {
        id: '1',
        title: 'T',
        dueDate,
        recurrenceRule: { type: 'weekly' as const, weekdayMask: 0 },
      }
      const [event] = extractEvents(generateIcs([item]))
      expect(prop(event, 'RRULE')).toBe('FREQ=WEEKLY;BYDAY=MO')
    })

    it('weekly_on_day with Wednesday (mask=8) → FREQ=WEEKLY;BYDAY=WE', () => {
      const item = {
        id: '1',
        title: 'T',
        dueDate,
        recurrenceRule: { type: 'weekly_on_day' as const, weekdayMask: 8 },
      }
      const [event] = extractEvents(generateIcs([item]))
      expect(prop(event, 'RRULE')).toBe('FREQ=WEEKLY;BYDAY=WE')
    })

    it('weekly_on_day with no mask defaults to Monday', () => {
      const item = {
        id: '1',
        title: 'T',
        dueDate,
        recurrenceRule: { type: 'weekly_on_day' as const },
      }
      const [event] = extractEvents(generateIcs([item]))
      expect(prop(event, 'RRULE')).toBe('FREQ=WEEKLY;BYDAY=MO')
    })

    it('weekly_on_day with mask=0 falls back to MO', () => {
      const item = {
        id: '1',
        title: 'T',
        dueDate,
        recurrenceRule: { type: 'weekly_on_day' as const, weekdayMask: 0 },
      }
      const [event] = extractEvents(generateIcs([item]))
      expect(prop(event, 'RRULE')).toBe('FREQ=WEEKLY;BYDAY=MO')
    })

    it('monthly_on_day with dayOfMonth=15 → FREQ=MONTHLY;BYMONTHDAY=15', () => {
      const item = {
        id: '1',
        title: 'T',
        dueDate,
        recurrenceRule: { type: 'monthly_on_day' as const, dayOfMonth: 15 },
      }
      const [event] = extractEvents(generateIcs([item]))
      expect(prop(event, 'RRULE')).toBe('FREQ=MONTHLY;BYMONTHDAY=15')
    })

    it('monthly_on_day with no dayOfMonth defaults to 1', () => {
      const item = {
        id: '1',
        title: 'T',
        dueDate,
        recurrenceRule: { type: 'monthly_on_day' as const },
      }
      const [event] = extractEvents(generateIcs([item]))
      expect(prop(event, 'RRULE')).toBe('FREQ=MONTHLY;BYMONTHDAY=1')
    })

    it('custom_days with intervalDays=7 → FREQ=DAILY;INTERVAL=7', () => {
      const item = {
        id: '1',
        title: 'T',
        dueDate,
        recurrenceRule: { type: 'custom_days' as const, intervalDays: 7 },
      }
      const [event] = extractEvents(generateIcs([item]))
      expect(prop(event, 'RRULE')).toBe('FREQ=DAILY;INTERVAL=7')
    })

    it('custom_days with no intervalDays defaults to INTERVAL=1', () => {
      const item = {
        id: '1',
        title: 'T',
        dueDate,
        recurrenceRule: { type: 'custom_days' as const },
      }
      const [event] = extractEvents(generateIcs([item]))
      expect(prop(event, 'RRULE')).toBe('FREQ=DAILY;INTERVAL=1')
    })

    it('yearly → FREQ=YEARLY', () => {
      const item = {
        id: '1',
        title: 'T',
        dueDate,
        recurrenceRule: { type: 'yearly' as const },
      }
      const [event] = extractEvents(generateIcs([item]))
      expect(prop(event, 'RRULE')).toBe('FREQ=YEARLY')
    })

    it('unknown recurrence type (defensive default) → no RRULE emitted', () => {
      // Cast through unknown to exercise the default branch in buildRrule
      const item = {
        id: '1',
        title: 'T',
        dueDate,
        recurrenceRule: { type: 'biweekly' as unknown as 'daily' },
      }
      const [event] = extractEvents(generateIcs([item]))
      expect(event).not.toContain('RRULE:')
    })
  })
})
