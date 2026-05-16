import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import { eq } from 'drizzle-orm'
import { getTestApp, closeTestApp } from '../../helpers/app'
import { users, todoLists } from '../../../src/db'

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

  it('GET /api/admin/lists returns 403 for non-admin', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/lists',
      headers: { authorization: `Bearer ${regularToken}` },
    })
    expect(res.statusCode).toBe(403)
  })

  it('GET /api/admin/lists returns all lists with owner and item count', async () => {
    const uid = Date.now()

    // Create a list for the regular user
    const [list] = await app.db
      .insert(todoLists)
      .values({ userId: adminUserId, title: `Test List ${uid}` })
      .returning({ id: todoLists.id })

    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/lists',
      headers: { authorization: `Bearer ${adminToken}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body)).toBe(true)

    const found = body.find((l: { id: string }) => l.id === list.id)
    expect(found).toBeDefined()
    expect(found.owner.id).toBe(adminUserId)
    expect(found.shares).toEqual([])
    expect(typeof found.itemCount).toBe('number')

    // Cleanup
    await app.db.delete(todoLists).where(eq(todoLists.id, list.id))
  })

  describe('System admin manages shares on another user’s list', () => {
    let otherUserToken: string
    let otherListId: string
    let thirdUserEmail: string
    let thirdUserId: string

    beforeAll(async () => {
      const uid = `${Date.now()}adminshares`

      // Register "other user" — owner of the list we'll administer
      const otherRes = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: `other+${uid}@example.com`,
          username: `other${uid}`,
          password: 'SecurePass123',
        },
      })
      otherUserToken = otherRes.json().token

      // Register "third user" — someone the admin will share the list with
      thirdUserEmail = `third+${uid}@example.com`
      const thirdRes = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: thirdUserEmail,
          username: `third${uid}`,
          password: 'SecurePass123',
        },
      })
      thirdUserId = thirdRes.json().user.id

      // Other user creates a list
      const listRes = await app.inject({
        method: 'POST',
        url: '/api/lists',
        headers: { authorization: `Bearer ${otherUserToken}` },
        payload: { title: 'Other User List' },
      })
      otherListId = listRes.json().id
    })

    it('admin can share a list they do not own', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/lists/${otherListId}/shares`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { email: thirdUserEmail, role: 'editor' },
      })
      expect(res.statusCode).toBe(201)
      expect(res.json().user.id).toBe(thirdUserId)
      expect(res.json().role).toBe('editor')
    })

    it('admin can update a share role on a list they do not own', async () => {
      const sharesRes = await app.inject({
        method: 'GET',
        url: `/api/lists/${otherListId}/shares`,
        headers: { authorization: `Bearer ${adminToken}` },
      })
      const shareId = sharesRes.json()[0].id

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/lists/${otherListId}/shares/${shareId}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { role: 'viewer' },
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().role).toBe('viewer')
    })

    it('admin can remove a share on a list they do not own', async () => {
      const sharesRes = await app.inject({
        method: 'GET',
        url: `/api/lists/${otherListId}/shares`,
        headers: { authorization: `Bearer ${adminToken}` },
      })
      const shareId = sharesRes.json()[0].id

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/lists/${otherListId}/shares/${shareId}`,
        headers: { authorization: `Bearer ${adminToken}` },
      })
      expect(res.statusCode).toBe(204)
    })

    it('non-admin without ownership or share-admin role still gets 403', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/lists/${otherListId}/shares`,
        headers: { authorization: `Bearer ${regularToken}` },
        payload: { email: thirdUserEmail, role: 'editor' },
      })
      expect(res.statusCode).toBe(403)
    })
  })
})
