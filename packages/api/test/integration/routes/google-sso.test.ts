import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import { getTestApp, closeTestApp } from '../../helpers/app'

describe('Google SSO Routes', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await getTestApp()
  })

  afterAll(closeTestApp)

  describe('GET /api/auth/google', () => {
    it('redirects to Google OAuth when configured', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/google',
      })

      if (process.env.GOOGLE_CLIENT_ID) {
        expect(res.statusCode).toBe(302)
        expect(res.headers.location).toContain('accounts.google.com')
      } else {
        // Not configured — returns 400
        expect(res.statusCode).toBe(400)
      }
    })
  })

  describe('GET /api/auth/google/callback', () => {
    it('redirects with error when error query param is present', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/google/callback?error=access_denied',
      })
      expect(res.statusCode).toBe(302)
      expect(res.headers.location).toContain('error=google_denied')
    })

    it('returns 400 when code is missing', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/google/callback',
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 401 when code is invalid', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/google/callback?code=invalid-code',
      })
      expect(res.statusCode).toBe(401)
    })
  })
})
