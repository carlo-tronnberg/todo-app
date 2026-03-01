import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import { getTestApp, closeTestApp } from '../../helpers/app'

describe('Comments Routes', () => {
  let app: FastifyInstance
  let token: string
  let otherToken: string
  let listId: string
  let itemId: string

  beforeAll(async () => {
    app = await getTestApp()
    const uid = Date.now()

    const registerRes = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: `comments+${uid}@example.com`,
        username: `commentsuser${uid}`,
        password: 'SecurePass123',
      },
    })
    token = registerRes.json().token

    const otherRes = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: `comments2+${uid}@example.com`,
        username: `commentsuser2${uid}`,
        password: 'SecurePass123',
      },
    })
    otherToken = otherRes.json().token

    const listRes = await app.inject({
      method: 'POST',
      url: '/api/lists',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: 'Comments Test List' },
    })
    listId = listRes.json().id

    const itemRes = await app.inject({
      method: 'POST',
      url: `/api/lists/${listId}/items`,
      headers: { authorization: `Bearer ${token}` },
      payload: { title: 'Comments Test Item' },
    })
    itemId = itemRes.json().id
  })

  afterAll(closeTestApp)

  const auth = () => ({ authorization: `Bearer ${token}` })
  const missing = '00000000-0000-0000-0000-000000000000'

  describe('GET /api/items/:itemId/comments', () => {
    it('returns empty array when no comments exist', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/items/${itemId}/comments`,
        headers: auth(),
      })
      expect(res.statusCode).toBe(200)
      expect(res.json()).toEqual([])
    })

    it('returns 404 for non-existent item', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/items/${missing}/comments`,
        headers: auth(),
      })
      expect(res.statusCode).toBe(404)
    })

    it('returns 404 when item belongs to another user', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/items/${itemId}/comments`,
        headers: { authorization: `Bearer ${otherToken}` },
      })
      expect(res.statusCode).toBe(404)
    })

    it('returns 401 without token', async () => {
      const res = await app.inject({ method: 'GET', url: `/api/items/${itemId}/comments` })
      expect(res.statusCode).toBe(401)
    })
  })

  describe('POST /api/items/:itemId/comments', () => {
    it('creates a comment and returns 201', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/items/${itemId}/comments`,
        headers: auth(),
        payload: { content: 'First comment' },
      })
      expect(res.statusCode).toBe(201)
      const body = res.json()
      expect(body.content).toBe('First comment')
      expect(body.itemId).toBe(itemId)
      expect(body.id).toBeTruthy()
    })

    it('returns comment in subsequent GET', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/items/${itemId}/comments`,
        headers: auth(),
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().length).toBeGreaterThan(0)
      expect(res.json()[0].content).toBe('First comment')
    })

    it('returns 400 when content is empty', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/items/${itemId}/comments`,
        headers: auth(),
        payload: { content: '   ' },
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 when content is missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/items/${itemId}/comments`,
        headers: auth(),
        payload: {},
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 404 for non-existent item', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/items/${missing}/comments`,
        headers: auth(),
        payload: { content: 'Ghost comment' },
      })
      expect(res.statusCode).toBe(404)
    })

    it('returns 401 without token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/items/${itemId}/comments`,
        payload: { content: 'Unauthenticated' },
      })
      expect(res.statusCode).toBe(401)
    })
  })

  describe('DELETE /api/comments/:commentId', () => {
    let commentId: string

    beforeAll(async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/items/${itemId}/comments`,
        headers: auth(),
        payload: { content: 'Comment to delete' },
      })
      commentId = res.json().id
    })

    it('returns 404 when comment does not exist', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/comments/${missing}`,
        headers: auth(),
      })
      expect(res.statusCode).toBe(404)
    })

    it('returns 404 when comment belongs to another user', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/comments/${commentId}`,
        headers: { authorization: `Bearer ${otherToken}` },
      })
      expect(res.statusCode).toBe(404)
    })

    it('deletes own comment and returns 204', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/comments/${commentId}`,
        headers: auth(),
      })
      expect(res.statusCode).toBe(204)
    })

    it('returns 404 after deletion', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/comments/${commentId}`,
        headers: auth(),
      })
      expect(res.statusCode).toBe(404)
    })

    it('returns 401 without token', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/comments/${commentId}`,
      })
      expect(res.statusCode).toBe(401)
    })
  })
})
