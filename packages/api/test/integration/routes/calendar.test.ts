import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import { getTestApp, closeTestApp } from '../../helpers/app'

describe('Calendar Routes', () => {
  let app: FastifyInstance
  let token: string

  beforeAll(async () => {
    app = await getTestApp()
    const uid = Date.now()

    const registerRes = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: `calendar+${uid}@example.com`,
        username: `caluser${uid}`,
        password: 'SecurePass123',
      },
    })
    token = registerRes.json().token

    // Create a list with items in the test range
    const listRes = await app.inject({
      method: 'POST',
      url: '/api/lists',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: 'Calendar Test List' },
    })
    const listId = listRes.json().id

    // Create a plain item and a recurring item in parallel
    const [plainRes] = await Promise.all([
      app.inject({
        method: 'POST',
        url: `/api/lists/${listId}/items`,
        headers: { authorization: `Bearer ${token}` },
        payload: { title: 'Due in range', dueDate: '2024-06-15T00:00:00Z' },
      }),
      app.inject({
        method: 'POST',
        url: `/api/lists/${listId}/items`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          title: 'Recurring in range',
          dueDate: '2024-06-20T00:00:00Z',
          recurrenceRule: { type: 'monthly_on_day', dayOfMonth: 20 },
        },
      }),
    ])

    // Complete the plain item so its dueDateSnapshot falls in the calendar range
    await app.inject({
      method: 'POST',
      url: `/api/items/${plainRes.json().id}/complete`,
      headers: { authorization: `Bearer ${token}` },
    })
  })

  afterAll(closeTestApp)

  const auth = () => ({ authorization: `Bearer ${token}` })

  describe('GET /api/calendar', () => {
    it('returns items and completions in range', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/calendar?from=2024-06-01&to=2024-06-30',
        headers: auth(),
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body).toHaveProperty('items')
      expect(body).toHaveProperty('completions')
      expect(Array.isArray(body.items)).toBe(true)
      expect(Array.isArray(body.completions)).toBe(true)
      expect(body.items.some((i: { title: string }) => i.title === 'Due in range')).toBe(true)
    })

    it('returns completions with isLatestCompletion flag', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/calendar?from=2024-06-01&to=2024-06-30',
        headers: auth(),
      })
      expect(res.statusCode).toBe(200)
      const { completions } = res.json()
      expect(completions.length).toBeGreaterThan(0)
      expect(completions[0]).toHaveProperty('isLatestCompletion')
      expect(completions[0].isLatestCompletion).toBe(true)
    })

    it('returns empty arrays for range with no items', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/calendar?from=2099-01-01&to=2099-01-31',
        headers: auth(),
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().items).toHaveLength(0)
    })

    it('returns 400 when from is missing', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/calendar?to=2024-06-30',
        headers: auth(),
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 when to is missing', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/calendar?from=2024-06-01',
        headers: auth(),
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 with invalid date strings', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/calendar?from=not-a-date&to=also-not',
        headers: auth(),
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 when from is after to', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/calendar?from=2024-12-31&to=2024-01-01',
        headers: auth(),
      })
      expect(res.statusCode).toBe(400)
    })
  })

  describe('GET /api/calendar/ical', () => {
    it('returns an ICS file with valid token', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/calendar/ical?token=${token}`,
      })
      expect(res.statusCode).toBe(200)
      expect(res.headers['content-type']).toContain('text/calendar')
      expect(res.headers['content-disposition']).toContain('todo-tracker.ics')
      expect(res.body).toContain('BEGIN:VCALENDAR')
      expect(res.body).toContain('RRULE:')
    })

    it('returns 401 without a token', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/calendar/ical' })
      expect(res.statusCode).toBe(401)
    })

    it('returns 401 with an invalid token', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/calendar/ical?token=invalid.jwt.token',
      })
      expect(res.statusCode).toBe(401)
    })
  })
})
