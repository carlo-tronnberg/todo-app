import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import { getTestApp, closeTestApp } from '../../helpers/app'

describe('Lists Routes (extended)', () => {
  let app: FastifyInstance
  let token: string
  let listId: string

  beforeAll(async () => {
    app = await getTestApp()
    const uid = Date.now()

    const registerRes = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: `listsext+${uid}@example.com`,
        username: `listsext${uid}`,
        password: 'SecurePass123',
      },
    })
    token = registerRes.json().token

    const listRes = await app.inject({
      method: 'POST',
      url: '/api/lists',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: 'Extended Test List', description: 'for extended tests' },
    })
    listId = listRes.json().id
  })

  afterAll(closeTestApp)

  const auth = () => ({ authorization: `Bearer ${token}` })
  const missing = '00000000-0000-0000-0000-000000000000'

  describe('GET /api/lists/:listId', () => {
    it('returns the list by id', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/lists/${listId}`,
        headers: auth(),
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().id).toBe(listId)
      expect(res.json().title).toBe('Extended Test List')
    })

    it('returns 404 for non-existent list', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/lists/${missing}`,
        headers: auth(),
      })
      expect(res.statusCode).toBe(404)
    })
  })

  describe('PATCH /api/lists/:listId', () => {
    it('updates the list title and description', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/lists/${listId}`,
        headers: auth(),
        payload: { title: 'Renamed List', description: 'updated desc' },
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().title).toBe('Renamed List')
    })

    it('returns 404 for non-existent list', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/lists/${missing}`,
        headers: auth(),
        payload: { title: 'x' },
      })
      expect(res.statusCode).toBe(404)
    })
  })

  describe('DELETE /api/lists/:listId', () => {
    it('deletes the list', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/lists',
        headers: auth(),
        payload: { title: 'To Delete' },
      })
      const deleteId = createRes.json().id

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/lists/${deleteId}`,
        headers: auth(),
      })
      expect(res.statusCode).toBe(204)
    })

    it('returns 404 for non-existent list', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/lists/${missing}`,
        headers: auth(),
      })
      expect(res.statusCode).toBe(404)
    })
  })

  describe('POST /api/lists/:listId/items — edge cases', () => {
    it('returns 400 when title is missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/lists/${listId}/items`,
        headers: auth(),
        payload: {},
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 404 when list does not exist', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/lists/${missing}/items`,
        headers: auth(),
        payload: { title: 'Orphan Item' },
      })
      expect(res.statusCode).toBe(404)
    })
  })
})
