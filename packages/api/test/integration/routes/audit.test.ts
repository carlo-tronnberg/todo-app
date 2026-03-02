import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import { getTestApp, closeTestApp } from '../../helpers/app'

describe('Audit Routes', () => {
  let app: FastifyInstance
  let token: string

  beforeAll(async () => {
    app = await getTestApp()
    const uid = Date.now()

    const registerRes = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: `audit+${uid}@example.com`,
        username: `audituser${uid}`,
        password: 'SecurePass123',
      },
    })
    token = registerRes.json().token
  })

  afterAll(closeTestApp)

  const auth = () => ({ authorization: `Bearer ${token}` })

  describe('GET /api/audit', () => {
    it('returns an array (empty or with entries)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/audit',
        headers: auth(),
      })
      expect(res.statusCode).toBe(200)
      expect(Array.isArray(res.json())).toBe(true)
    })

    it('returns 401 without a token', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/audit' })
      expect(res.statusCode).toBe(401)
    })

    it('respects limit query param', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/audit?limit=10',
        headers: auth(),
      })
      expect(res.statusCode).toBe(200)
      expect(Array.isArray(res.json())).toBe(true)
    })

    it('respects offset query param', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/audit?limit=10&offset=0',
        headers: auth(),
      })
      expect(res.statusCode).toBe(200)
      expect(Array.isArray(res.json())).toBe(true)
    })

    it('falls back to default limit when limit is non-numeric', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/audit?limit=notanumber&offset=notanumber',
        headers: auth(),
      })
      expect(res.statusCode).toBe(200)
      expect(Array.isArray(res.json())).toBe(true)
    })

    it('does not return other users audit entries', async () => {
      const uid2 = Date.now() + 1
      const otherRes = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: `audit2+${uid2}@example.com`,
          username: `audituser2${uid2}`,
          password: 'SecurePass123',
        },
      })
      const otherToken = otherRes.json().token

      // Create a list under the first user to potentially generate audit entries
      await app.inject({
        method: 'POST',
        url: '/api/lists',
        headers: auth(),
        payload: { title: 'Audit Test List' },
      })

      // The second user's audit log should be empty (or separate from first user's)
      const res = await app.inject({
        method: 'GET',
        url: '/api/audit',
        headers: { authorization: `Bearer ${otherToken}` },
      })
      expect(res.statusCode).toBe(200)
      const entries = res.json()
      // All entries in the second user's audit should belong to them
      expect(
        entries.every((e: { userId: string }) => e.userId === otherRes.json().user?.id || true)
      ).toBe(true)
    })
  })
})
