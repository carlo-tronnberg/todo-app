import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGet } = vi.hoisted(() => ({
  mockGet: vi.fn(),
}))

vi.mock('../../../src/api/client', () => ({
  apiClient: { get: mockGet },
}))

import { calendarApi } from '../../../src/api/calendar.api'

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  delete (window as any).location
  ;(window as any).location = { origin: 'https://example.com', href: '' }
})

describe('calendarApi.getRange', () => {
  it('GETs /calendar with ISO date params', async () => {
    const from = new Date('2024-06-01T00:00:00Z')
    const to = new Date('2024-06-30T00:00:00Z')
    const fakeResponse = { items: [], completions: [] }
    mockGet.mockResolvedValue({ data: fakeResponse })

    const result = await calendarApi.getRange(from, to)
    expect(mockGet).toHaveBeenCalledWith('/calendar', {
      params: {
        from: from.toISOString(),
        to: to.toISOString(),
      },
    })
    expect(result).toEqual(fakeResponse)
  })
})

describe('calendarApi.getIcalUrls', () => {
  it('returns https, webcal and google URLs with encoded token', () => {
    localStorage.setItem('auth_token', 'my-jwt-token')

    const urls = calendarApi.getIcalUrls()

    expect(urls.https).toBe('https://example.com/api/calendar/ical?token=my-jwt-token')
    expect(urls.webcal).toBe('webcal://example.com/api/calendar/ical?token=my-jwt-token')
    expect(urls.google).toContain('google.com/calendar/render?cid=')
    expect(urls.google).toContain(encodeURIComponent(urls.webcal))
  })

  it('uses empty token when none stored in localStorage', () => {
    const urls = calendarApi.getIcalUrls()
    expect(urls.https).toBe('https://example.com/api/calendar/ical?token=')
  })

  it('URL-encodes special characters in the token', () => {
    localStorage.setItem('auth_token', 'tok+en=with&special')
    const urls = calendarApi.getIcalUrls()
    expect(urls.https).toContain('tok%2Ben%3Dwith%26special')
  })
})
