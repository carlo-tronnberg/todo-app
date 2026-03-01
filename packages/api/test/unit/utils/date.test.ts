import { describe, it, expect } from 'vitest'
import { computeUrgency, parseDateOrNull } from '../../../src/utils/date'

describe('computeUrgency', () => {
  const today = new Date('2024-06-15T12:00:00Z')

  it('returns none for null due date', () => {
    expect(computeUrgency(null, today)).toBe('none')
  })

  it('returns none for undefined due date', () => {
    expect(computeUrgency(undefined, today)).toBe('none')
  })

  it('returns overdue for past dates', () => {
    expect(computeUrgency(new Date('2024-06-14'), today)).toBe('overdue')
    expect(computeUrgency(new Date('2024-01-01'), today)).toBe('overdue')
  })

  it('returns overdue for today', () => {
    expect(computeUrgency(new Date('2024-06-15'), today)).toBe('overdue')
  })

  it('returns high for 1 day away', () => {
    expect(computeUrgency(new Date('2024-06-16'), today)).toBe('high')
  })

  it('returns high for 3 days away', () => {
    expect(computeUrgency(new Date('2024-06-18'), today)).toBe('high')
  })

  it('returns medium for 4 days away', () => {
    expect(computeUrgency(new Date('2024-06-19'), today)).toBe('medium')
  })

  it('returns medium for 7 days away', () => {
    expect(computeUrgency(new Date('2024-06-22'), today)).toBe('medium')
  })

  it('returns low for 8 days away', () => {
    expect(computeUrgency(new Date('2024-06-23'), today)).toBe('low')
  })

  it('returns low for far future', () => {
    expect(computeUrgency(new Date('2025-01-01'), today)).toBe('low')
  })
})

describe('parseDateOrNull', () => {
  it('returns null for null input', () => {
    expect(parseDateOrNull(null)).toBeNull()
  })

  it('returns null for undefined input', () => {
    expect(parseDateOrNull(undefined)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parseDateOrNull('')).toBeNull()
  })

  it('parses a valid ISO date string into a Date', () => {
    const result = parseDateOrNull('2024-06-15')
    expect(result).not.toBeNull()
    expect(result!.getFullYear()).toBe(2024)
    expect(result!.getMonth()).toBe(5) // June is 0-indexed
    expect(result!.getDate()).toBe(15)
  })

  it('parses a valid ISO datetime string', () => {
    const result = parseDateOrNull('2024-06-15T10:30:00Z')
    expect(result).not.toBeNull()
    expect(result!.getFullYear()).toBe(2024)
  })

  it('returns null for an invalid date string', () => {
    expect(parseDateOrNull('not-a-date')).toBeNull()
  })
})
