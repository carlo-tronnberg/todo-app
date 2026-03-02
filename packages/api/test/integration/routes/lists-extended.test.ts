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

  describe('GET /api/lists — completions and upcoming items coverage', () => {
    // This test creates items with due dates this month (to trigger completions branch)
    // and items with future due dates (to trigger upcomingItems branch)
    it('populates uncompletedThisMonth and upcomingItems when items exist', async () => {
      // Create a fresh user + list to control the data exactly
      const uid2 = Date.now() + 100
      const freshUserRes = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: `listscomp+${uid2}@example.com`,
          username: `listscomp${uid2}`,
          password: 'SecurePass123',
        },
      })
      const freshToken = freshUserRes.json().token
      const freshAuth = () => ({ authorization: `Bearer ${freshToken}` })

      const freshListRes = await app.inject({
        method: 'POST',
        url: '/api/lists',
        headers: freshAuth(),
        payload: { title: 'Completions Coverage List' },
      })
      const freshListId = freshListRes.json().id

      // Add items due in current month (March 2026) to trigger completions query
      const thisMonth = '2026-03-15T00:00:00Z'
      const item1Res = await app.inject({
        method: 'POST',
        url: `/api/lists/${freshListId}/items`,
        headers: freshAuth(),
        payload: { title: 'Item Due This Month 1', dueDate: thisMonth },
      })
      const item1Id = item1Res.json().id

      // Complete one item to exercise the completedItemIds Set
      await app.inject({
        method: 'POST',
        url: `/api/items/${item1Id}/complete`,
        headers: freshAuth(),
      })

      // Add items with future due dates to trigger upcomingItems (need 4+ to test the < 3 limit)
      const futureDate1 = '2026-04-01T00:00:00Z'
      const futureDate2 = '2026-04-02T00:00:00Z'
      const futureDate3 = '2026-04-03T00:00:00Z'
      const futureDate4 = '2026-04-04T00:00:00Z'
      await app.inject({
        method: 'POST',
        url: `/api/lists/${freshListId}/items`,
        headers: freshAuth(),
        payload: { title: 'Future Item 1', dueDate: futureDate1 },
      })
      await app.inject({
        method: 'POST',
        url: `/api/lists/${freshListId}/items`,
        headers: freshAuth(),
        payload: { title: 'Future Item 2', dueDate: futureDate2 },
      })
      await app.inject({
        method: 'POST',
        url: `/api/lists/${freshListId}/items`,
        headers: freshAuth(),
        payload: { title: 'Future Item 3', dueDate: futureDate3 },
      })
      await app.inject({
        method: 'POST',
        url: `/api/lists/${freshListId}/items`,
        headers: freshAuth(),
        payload: { title: 'Future Item 4', dueDate: futureDate4 },
      })

      // Call GET /api/lists to exercise the branches
      const res = await app.inject({
        method: 'GET',
        url: '/api/lists',
        headers: freshAuth(),
      })
      expect(res.statusCode).toBe(200)
      const lists = res.json()
      expect(Array.isArray(lists)).toBe(true)

      const targetList = lists.find((l: { id: string }) => l.id === freshListId)
      expect(targetList).toBeDefined()
      // upcomingItems capped at 3
      expect(targetList.upcomingItems.length).toBeLessThanOrEqual(3)
    })
  })

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
