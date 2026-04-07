import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import { eq } from 'drizzle-orm'
import { getTestApp, closeTestApp } from '../../helpers/app'
import { users } from '../../../src/db'

describe('Admin Routes', () => {
  let app: FastifyInstance
  let adminToken: string
  let regularToken: string
  let adminUserId: string

  beforeAll(async () => {
    app = await getTestApp()
    const uid = Date.now()

    // Register admin user
    const adminRes = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: `admin+${uid}@example.com`,
        username: `admin${uid}`,
        password: 'SecurePass123',
      },
    })
    adminToken = adminRes.json().token
    adminUserId = adminRes.json().user.id

    // Make them admin directly in DB
    await app.db.update(users).set({ isAdmin: true }).where(eq(users.id, adminUserId))

    // Register regular user
    const regRes = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: `regular+${uid}@example.com`,
        username: `regular${uid}`,
        password: 'SecurePass123',
      },
    })
    regularToken = regRes.json().token
  })

  afterAll(closeTestApp)

  it('GET /api/admin/users returns 403 for non-admin', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/users',
      headers: { authorization: `Bearer ${regularToken}` },
    })
    expect(res.statusCode).toBe(403)
  })

  it('GET /api/admin/users returns user list for admin', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/users',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.json())).toBe(true)
    expect(res.json().length).toBeGreaterThan(0)
  })

  it('PATCH /api/admin/users/:id toggles admin status', async () => {
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/admin/users',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    const nonAdmin = listRes.json().find((u: { id: string }) => u.id !== adminUserId)

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/admin/users/${nonAdmin.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { isAdmin: true },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().isAdmin).toBe(true)

    // Revert
    await app.inject({
      method: 'PATCH',
      url: `/api/admin/users/${nonAdmin.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { isAdmin: false },
    })
  })

  it('PATCH /api/admin/users/:id returns 403 for non-admin', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/admin/users/${adminUserId}`,
      headers: { authorization: `Bearer ${regularToken}` },
      payload: { isAdmin: true },
    })
    expect(res.statusCode).toBe(403)
  })
})
