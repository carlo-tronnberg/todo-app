import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { computeUrgencyLevel } from '../../../src/composables/useUrgency'

describe('computeUrgencyLevel', () => {
  beforeEach(() => {
    // Pin "today" to 2024-06-15
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "none" for null', () => {
    expect(computeUrgencyLevel(null)).toBe('none')
  })

  it('returns "none" for undefined', () => {
    expect(computeUrgencyLevel(undefined)).toBe('none')
  })

  it('returns "none" for an invalid date string', () => {
    expect(computeUrgencyLevel('not-a-date')).toBe('none')
  })

  it('returns "overdue" for a past date', () => {
    expect(computeUrgencyLevel('2024-06-14T00:00:00Z')).toBe('overdue')
  })

  it('returns "overdue" for today', () => {
    expect(computeUrgencyLevel('2024-06-15T00:00:00Z')).toBe('overdue')
  })

  it('returns "high" for 1 day away', () => {
    expect(computeUrgencyLevel('2024-06-16T00:00:00Z')).toBe('high')
  })

  it('returns "high" for 3 days away', () => {
    expect(computeUrgencyLevel('2024-06-18T00:00:00Z')).toBe('high')
  })

  it('returns "medium" for 4 days away', () => {
    expect(computeUrgencyLevel('2024-06-19T00:00:00Z')).toBe('medium')
  })

  it('returns "medium" for 7 days away', () => {
    expect(computeUrgencyLevel('2024-06-22T00:00:00Z')).toBe('medium')
  })

  it('returns "low" for 8+ days away', () => {
    expect(computeUrgencyLevel('2024-06-23T00:00:00Z')).toBe('low')
  })

  it('returns "low" for a far future date', () => {
    expect(computeUrgencyLevel('2025-01-01T00:00:00Z')).toBe('low')
  })
})
