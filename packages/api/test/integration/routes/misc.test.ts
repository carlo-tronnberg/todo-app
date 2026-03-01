import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import { getTestApp, closeTestApp } from '../../helpers/app'

describe('Miscellaneous coverage', () => {
  let app: FastifyInstance
  let token: string
  let itemId: string

  beforeAll(async () => {
    app = await getTestApp()
    const uid = Date.now()

    const registerRes = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: `misc+${uid}@example.com`,
        username: `miscuser${uid}`,
        password: 'SecurePass123',
      },
    })
    token = registerRes.json().token

    const listRes = await app.inject({
      method: 'POST',
      url: '/api/lists',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: 'Misc Test List' },
    })
    const listId = listRes.json().id

    const itemRes = await app.inject({
      method: 'POST',
      url: `/api/lists/${listId}/items`,
      headers: { authorization: `Bearer ${token}` },
      payload: { title: 'Misc Item', dueDate: '2024-05-01T00:00:00Z' },
    })
    itemId = itemRes.json().id
  })

  afterAll(closeTestApp)

  const auth = () => ({ authorization: `Bearer ${token}` })

  describe('GET /health', () => {
    it('returns status ok with environment and timestamp', async () => {
      const res = await app.inject({ method: 'GET', url: '/health' })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body.status).toBe('ok')
      expect(body).toHaveProperty('environment')
      expect(body).toHaveProperty('timestamp')
    })
  })

  describe('POST /api/auth/register — validation', () => {
    it('returns 400 when required fields are missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {},
      })
      expect(res.statusCode).toBe(400)
    })
  })

  describe('POST /api/auth/register — username taken', () => {
    it('returns 409 when username is already registered', async () => {
      const uid = Date.now()
      const username = `dupuser${uid}`

      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { email: `first+${uid}@example.com`, username, password: 'SecurePass123' },
      })

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { email: `second+${uid}@example.com`, username, password: 'SecurePass123' },
      })
      expect(res.statusCode).toBe(409)
      expect(res.json().message).toContain('Username')
    })
  })

  describe('POST /api/auth/login — validation', () => {
    it('returns 400 when email is missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { password: 'SecurePass123' },
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 when password is missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'test@example.com' },
      })
      expect(res.statusCode).toBe(400)
    })
  })

  describe('POST /api/items/:itemId/complete — with note', () => {
    it('records a completion with an optional note', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/items/${itemId}/complete`,
        headers: auth(),
        payload: { note: 'Finished ahead of schedule' },
      })
      expect(res.statusCode).toBe(201)
      expect(res.json().note).toBe('Finished ahead of schedule')
    })
  })

  describe('POST /api/auth/login — non-existent email', () => {
    it('returns 401 when email does not exist', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'no-such-user@example.com',
          password: 'SomePassword123',
        },
      })
      expect(res.statusCode).toBe(401)
    })
  })
})
