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

  describe('POST /api/lists/:listId/items — recurrence without dueDate (auto-derive)', () => {
    it('auto-derives dueDate when recurrenceRule is set but no dueDate given', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/lists/${listId}/items`,
        headers: auth(),
        payload: {
          title: 'Auto-derive due date item',
          recurrenceRule: { type: 'monthly_on_day', dayOfMonth: 20 },
          // no dueDate — should auto-derive
        },
      })
      expect(res.statusCode).toBe(201)
      // dueDate should have been auto-derived
      expect(res.json().dueDate).toBeTruthy()
    })
  })

  describe('PATCH /api/items/:itemId — recurrence auto-derive on update', () => {
    it('auto-derives dueDate when setting recurrenceRule on item with no dueDate', async () => {
      // Create an item with no dueDate
      const createRes = await app.inject({
        method: 'POST',
        url: `/api/lists/${listId}/items`,
        headers: auth(),
        payload: { title: 'No DueDate Item' },
      })
      const noDueDateId = createRes.json().id

      // Update with recurrenceRule but no dueDate — should auto-derive
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/items/${noDueDateId}`,
        headers: auth(),
        payload: { recurrenceRule: { type: 'weekly', weekdayMask: 4 } },
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().dueDate).toBeTruthy()
    })
  })

  describe('POST /api/items/:itemId/duplicate', () => {
    it('duplicates an item without recurrence and returns the copy', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/items/${itemId}/duplicate`,
        headers: auth(),
      })
      expect(res.statusCode).toBe(201)
      const body = res.json()
      expect(body.id).not.toBe(itemId)
      expect(body.title).toMatch(/^Copy of /)
    })

    it('duplicates an item with recurrence rule, amounts and dates', async () => {
      // Create a rich item to duplicate
      const richRes = await app.inject({
        method: 'POST',
        url: `/api/lists/${listId}/items`,
        headers: auth(),
        payload: {
          title: 'Rich Item to Duplicate',
          description: 'some desc',
          dueDate: '2026-05-01T00:00:00Z',
          startDate: '2026-04-01T00:00:00Z',
          startTime: '09:00',
          endTime: '10:00',
          amount: '55.00',
          currency: 'USD',
          colorOverride: '#aabbcc',
          sortOrder: 3,
          recurrenceRule: { type: 'weekly', weekdayMask: 2 },
        },
      })
      const richItemId = richRes.json().id

      const res = await app.inject({
        method: 'POST',
        url: `/api/items/${richItemId}/duplicate`,
        headers: auth(),
      })
      expect(res.statusCode).toBe(201)
      const copy = res.json()
      expect(copy.id).not.toBe(richItemId)
      expect(copy.title).toBe('Copy of Rich Item to Duplicate')
      expect(copy.recurrenceRule).toBeTruthy()
      expect(copy.recurrenceRule.type).toBe('weekly')
    })

    it('returns 404 for non-existent item', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/items/${missing}/duplicate`,
        headers: auth(),
      })
      expect(res.statusCode).toBe(404)
    })
  })

  describe('PATCH /api/items/:itemId — move to another list', () => {
    it('moves the item to another list when listId is provided', async () => {
      // Create a second list to move the item into
      const secondListRes = await app.inject({
        method: 'POST',
        url: '/api/lists',
        headers: auth(),
        payload: { title: 'Second List for Move Test' },
      })
      const secondListId = secondListRes.json().id

      // Create an item in the first list
      const moveItemRes = await app.inject({
        method: 'POST',
        url: `/api/lists/${listId}/items`,
        headers: auth(),
        payload: { title: 'Item to Move' },
      })
      const moveItemId = moveItemRes.json().id

      // Move the item to the second list
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/items/${moveItemId}`,
        headers: auth(),
        payload: { listId: secondListId },
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().listId).toBe(secondListId)
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
