import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import { getTestApp, closeTestApp } from '../../helpers/app'

describe('Items Routes', () => {
  let app: FastifyInstance
  let token: string
  let listId: string
  let itemId: string

  beforeAll(async () => {
    app = await getTestApp()
    const uid = Date.now()

    const registerRes = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: `items+${uid}@example.com`,
        username: `itemsuser${uid}`,
        password: 'SecurePass123',
      },
    })
    token = registerRes.json().token

    const listRes = await app.inject({
      method: 'POST',
      url: '/api/lists',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: 'Items Test List' },
    })
    listId = listRes.json().id

    const itemRes = await app.inject({
      method: 'POST',
      url: `/api/lists/${listId}/items`,
      headers: { authorization: `Bearer ${token}` },
      payload: { title: 'Test Item', dueDate: '2024-06-01T00:00:00Z' },
    })
    itemId = itemRes.json().id
  })

  afterAll(closeTestApp)

  const auth = () => ({ authorization: `Bearer ${token}` })
  const missing = '00000000-0000-0000-0000-000000000000'

  describe('GET /api/items/:itemId', () => {
    it('returns the item', async () => {
      const res = await app.inject({ method: 'GET', url: `/api/items/${itemId}`, headers: auth() })
      expect(res.statusCode).toBe(200)
      expect(res.json().id).toBe(itemId)
      expect(res.json().title).toBe('Test Item')
    })

    it('returns 404 for non-existent item', async () => {
      const res = await app.inject({ method: 'GET', url: `/api/items/${missing}`, headers: auth() })
      expect(res.statusCode).toBe(404)
    })
  })

  describe('PATCH /api/items/:itemId', () => {
    it('updates the item title', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/items/${itemId}`,
        headers: auth(),
        payload: { title: 'Updated Item' },
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().title).toBe('Updated Item')
    })

    it('adds a recurrence rule', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/items/${itemId}`,
        headers: auth(),
        payload: { recurrenceRule: { type: 'weekly', weekdayMask: 0b0000010 } },
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().recurrenceRule?.type).toBe('weekly')
    })

    it('updates an existing recurrence rule in-place', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/items/${itemId}`,
        headers: auth(),
        payload: { recurrenceRule: { type: 'monthly_on_day', dayOfMonth: 1 } },
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().recurrenceRule?.type).toBe('monthly_on_day')
    })

    it('removes a recurrence rule', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/items/${itemId}`,
        headers: auth(),
        payload: { recurrenceRule: null },
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().recurrenceRule).toBeNull()
    })

    it('sends recurrenceRule: null on an item that already has no rule (covers no-op removal branch)', async () => {
      // itemId at this point has no recurrenceRule (was removed in the previous test)
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/items/${itemId}`,
        headers: auth(),
        payload: { recurrenceRule: null },
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().recurrenceRule).toBeNull()
    })

    it('updates an existing rule to a type with fewer optional fields (covers ?? null fallbacks)', async () => {
      // First, add a monthly rule (so the item has a rule)
      await app.inject({
        method: 'PATCH',
        url: `/api/items/${itemId}`,
        headers: auth(),
        payload: { recurrenceRule: { type: 'monthly_on_day', dayOfMonth: 10 } },
      })

      // Then update in-place to weekly (no dayOfMonth, no intervalDays) — triggers dayOfMonth ?? null
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/items/${itemId}`,
        headers: auth(),
        payload: { recurrenceRule: { type: 'weekly', weekdayMask: 0b0000100 } },
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().recurrenceRule?.type).toBe('weekly')

      // Clean up: remove rule again
      await app.inject({
        method: 'PATCH',
        url: `/api/items/${itemId}`,
        headers: auth(),
        payload: { recurrenceRule: null },
      })
    })

    it('updates optional fields: description, dueDate, colorOverride, sortOrder', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/items/${itemId}`,
        headers: auth(),
        payload: {
          description: 'A detailed description',
          dueDate: '2025-03-01T00:00:00Z',
          colorOverride: '#ff0000',
          sortOrder: 5,
        },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body.description).toBe('A detailed description')
      expect(body.colorOverride).toBe('#ff0000')
      expect(body.sortOrder).toBe(5)
    })

    it('clears dueDate and colorOverride by sending null values', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/items/${itemId}`,
        headers: auth(),
        payload: {
          dueDate: null,
          colorOverride: null,
        },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body.dueDate).toBeNull()
      expect(body.colorOverride).toBeNull()
    })

    it('returns 404 for non-existent item', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/items/${missing}`,
        headers: auth(),
        payload: { title: 'x' },
      })
      expect(res.statusCode).toBe(404)
    })
  })

  describe('POST /api/items/:itemId/complete', () => {
    it('creates a completion record', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/items/${itemId}/complete`,
        headers: auth(),
      })
      expect(res.statusCode).toBe(201)
      expect(res.json().itemId).toBe(itemId)
    })

    it('advances due date for a recurring item', async () => {
      const uid = Date.now()
      const createRes = await app.inject({
        method: 'POST',
        url: `/api/lists/${listId}/items`,
        headers: auth(),
        payload: {
          title: `Recurring ${uid}`,
          dueDate: '2024-01-15T00:00:00Z',
          recurrenceRule: { type: 'monthly_on_day', dayOfMonth: 15 },
        },
      })
      const recurringId = createRes.json().id

      const completeRes = await app.inject({
        method: 'POST',
        url: `/api/items/${recurringId}/complete`,
        headers: auth(),
      })
      expect(completeRes.statusCode).toBe(201)

      // Due date should have advanced to the next month
      const getRes = await app.inject({
        method: 'GET',
        url: `/api/items/${recurringId}`,
        headers: auth(),
      })
      expect(getRes.json().dueDate).not.toBe('2024-01-15T00:00:00.000Z')
    })

    it('returns 404 for non-existent item', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/items/${missing}/complete`,
        headers: auth(),
      })
      expect(res.statusCode).toBe(404)
    })
  })

  describe('GET /api/items/:itemId/completions', () => {
    it('returns completions for the item', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/items/${itemId}/completions`,
        headers: auth(),
      })
      expect(res.statusCode).toBe(200)
      expect(Array.isArray(res.json())).toBe(true)
    })

    it('returns 404 for non-existent item', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/items/${missing}/completions`,
        headers: auth(),
      })
      expect(res.statusCode).toBe(404)
    })
  })

  describe('DELETE /api/items/:itemId', () => {
    it('archives the item (soft delete)', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: `/api/lists/${listId}/items`,
        headers: auth(),
        payload: { title: 'To Archive' },
      })
      const archiveId = createRes.json().id

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/items/${archiveId}`,
        headers: auth(),
      })
      expect(res.statusCode).toBe(204)
    })

    it('returns 404 for non-existent item', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/items/${missing}`,
        headers: auth(),
      })
      expect(res.statusCode).toBe(404)
    })
  })
})
