import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import { getTestApp, closeTestApp } from '../../helpers/app'

// Integration tests require a running PostgreSQL database.
// Set TEST_DATABASE_URL in your environment or use docker-compose.test.yml.
describe('Auth Routes', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await getTestApp()
  })

  afterAll(async () => {
    await closeTestApp()
  })

  describe('POST /api/auth/register', () => {
    const uniqueId = Date.now()
    const payload = {
      email: `test+${uniqueId}@example.com`,
      username: `testuser${uniqueId}`,
      password: 'SecurePass123',
    }

    it('registers a new user and returns a JWT', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload,
      })

      expect(res.statusCode).toBe(201)
      const body = res.json()
      expect(body.token).toBeTruthy()
      expect(body.user.email).toBe(payload.email)
      expect(body.user.username).toBe(payload.username)
      expect(body.user).not.toHaveProperty('passwordHash')
    })

    it('returns 409 when email is already registered', async () => {
      await app.inject({ method: 'POST', url: '/api/auth/register', payload })
      const res = await app.inject({ method: 'POST', url: '/api/auth/register', payload })
      expect(res.statusCode).toBe(409)
    })

    it('returns 400 when password is too short', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { ...payload, password: 'short' },
      })
      expect(res.statusCode).toBe(400)
    })
  })

  describe('POST /api/auth/login', () => {
    const uniqueId = Date.now() + 1
    const credentials = {
      email: `login+${uniqueId}@example.com`,
      password: 'SecurePass123',
    }

    beforeAll(async () => {
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { ...credentials, username: `loginuser${uniqueId}` },
      })
    })

    it('returns a token for valid credentials', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: credentials,
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().token).toBeTruthy()
    })

    it('returns 401 for wrong password', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { ...credentials, password: 'WrongPass!' },
      })
      expect(res.statusCode).toBe(401)
    })
  })

  describe('GET /api/auth/me', () => {
    it('returns user profile when authenticated', async () => {
      const uniqueId = Date.now() + 2
      const registerRes = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: `me+${uniqueId}@example.com`,
          username: `meuser${uniqueId}`,
          password: 'SecurePass123',
        },
      })
      const { token } = registerRes.json()

      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: { authorization: `Bearer ${token}` },
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().email).toBe(`me+${uniqueId}@example.com`)
    })

    it('returns 401 without a token', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/auth/me' })
      expect(res.statusCode).toBe(401)
    })
  })

  describe('PATCH /api/auth/me', () => {
    let token: string

    beforeAll(async () => {
      const uid = Date.now() + 3
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: `patch+${uid}@example.com`,
          username: `patchuser${uid}`,
          password: 'SecurePass123',
        },
      })
      token = res.json().token
    })

    it('updates profile fields and returns updated user', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/auth/me',
        headers: { authorization: `Bearer ${token}` },
        payload: { firstName: 'Alice', lastName: 'Smith', phone: '+1 555 000 0001' },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body.firstName).toBe('Alice')
      expect(body.lastName).toBe('Smith')
      expect(body.phone).toBe('+1 555 000 0001')
    })

    it('clears profile fields when null is passed', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/auth/me',
        headers: { authorization: `Bearer ${token}` },
        payload: { firstName: null, lastName: null },
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().firstName).toBeNull()
    })

    it('returns 401 without a token', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/auth/me',
        payload: { firstName: 'Bob' },
      })
      expect(res.statusCode).toBe(401)
    })
  })

  describe('PATCH /api/auth/password', () => {
    let token: string
    const uid = Date.now() + 4
    const initialPassword = 'SecurePass123'

    beforeAll(async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: `pw+${uid}@example.com`,
          username: `pwuser${uid}`,
          password: initialPassword,
        },
      })
      token = res.json().token
    })

    it('returns 400 when fields are missing', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/auth/password',
        headers: { authorization: `Bearer ${token}` },
        payload: { oldPassword: initialPassword },
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 when new password is too short', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/auth/password',
        headers: { authorization: `Bearer ${token}` },
        payload: { oldPassword: initialPassword, newPassword: 'short' },
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 401 when old password is wrong', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/auth/password',
        headers: { authorization: `Bearer ${token}` },
        payload: { oldPassword: 'WrongPassword!', newPassword: 'NewSecurePass456' },
      })
      expect(res.statusCode).toBe(401)
    })

    it('changes password and returns 204', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/auth/password',
        headers: { authorization: `Bearer ${token}` },
        payload: { oldPassword: initialPassword, newPassword: 'NewSecurePass456' },
      })
      expect(res.statusCode).toBe(204)
    })

    it('can log in with the new password after change', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: `pw+${uid}@example.com`, password: 'NewSecurePass456' },
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().token).toBeTruthy()
    })

    it('returns 401 without a token', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/auth/password',
        payload: { oldPassword: 'anything', newPassword: 'AnythingLong123' },
      })
      expect(res.statusCode).toBe(401)
    })
  })
})
