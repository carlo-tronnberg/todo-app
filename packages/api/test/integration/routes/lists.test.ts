import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import { getTestApp, closeTestApp } from '../../helpers/app'

describe('Lists Routes', () => {
  let app: FastifyInstance
  let token: string

  beforeAll(async () => {
    app = await getTestApp()

    // Register and get token
    const uniqueId = Date.now()
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: `lists+${uniqueId}@example.com`,
        username: `listsuser${uniqueId}`,
        password: 'SecurePass123',
      },
    })
    token = res.json().token
  })

  afterAll(closeTestApp)

  const authHeaders = () => ({ authorization: `Bearer ${token}` })

  describe('POST /api/lists', () => {
    it('creates a new list', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/lists',
        headers: authHeaders(),
        payload: { title: 'My Bills', description: 'Monthly bill payments' },
      })
      expect(res.statusCode).toBe(201)
      const body = res.json()
      expect(body.title).toBe('My Bills')
      expect(body.id).toBeTruthy()
    })

    it('returns 400 without a title', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/lists',
        headers: authHeaders(),
        payload: {},
      })
      expect(res.statusCode).toBe(400)
    })
  })

  describe('GET /api/lists', () => {
    it('returns all lists for the authenticated user', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/lists',
        headers: authHeaders(),
      })
      expect(res.statusCode).toBe(200)
      expect(Array.isArray(res.json())).toBe(true)
    })
  })

  describe('Item creation within a list', () => {
    let listId: string

    beforeAll(async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/lists',
        headers: authHeaders(),
        payload: { title: 'Recurring Tasks' },
      })
      listId = res.json().id
    })

    it('creates an item with a monthly recurrence rule', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/lists/${listId}/items`,
        headers: authHeaders(),
        payload: {
          title: 'Pay electricity bill',
          dueDate: '2024-01-15T00:00:00Z',
          recurrenceRule: { type: 'monthly_on_day', dayOfMonth: 15 },
        },
      })
      expect(res.statusCode).toBe(201)
      expect(res.json().title).toBe('Pay electricity bill')
    })

    it('returns items for a list', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/lists/${listId}/items`,
        headers: authHeaders(),
      })
      expect(res.statusCode).toBe(200)
      expect(Array.isArray(res.json())).toBe(true)
    })
  })
})
