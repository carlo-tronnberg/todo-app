import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import { getTestApp, closeTestApp } from '../../helpers/app'

describe('Completions Routes', () => {
  let app: FastifyInstance
  let token: string
  let otherToken: string
  let itemId: string
  let recurringItemId: string
  let listId: string

  beforeAll(async () => {
    app = await getTestApp()
    const uid = Date.now()

    // Register both users in parallel
    const [registerRes, otherRes] = await Promise.all([
      app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: `completions+${uid}@example.com`,
          username: `compuser${uid}`,
          password: 'SecurePass123',
        },
      }),
      app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: `compother+${uid}@example.com`,
          username: `compother${uid}`,
          password: 'SecurePass123',
        },
      }),
    ])
    token = registerRes.json().token
    otherToken = otherRes.json().token

    // Create a list (depends on token)
    const listRes = await app.inject({
      method: 'POST',
      url: '/api/lists',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: 'Completions Test List' },
    })
    listId = listRes.json().id

    // Create both items in parallel (both depend on listId)
    const [itemRes, recurringRes] = await Promise.all([
      app.inject({
        method: 'POST',
        url: `/api/lists/${listId}/items`,
        headers: { authorization: `Bearer ${token}` },
        payload: { title: 'Simple Item', dueDate: '2024-03-01T00:00:00Z' },
      }),
      app.inject({
        method: 'POST',
        url: `/api/lists/${listId}/items`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          title: 'Recurring Item',
          dueDate: '2024-03-15T00:00:00Z',
          recurrenceRule: { type: 'monthly_on_day', dayOfMonth: 15 },
        },
      }),
    ])
    itemId = itemRes.json().id
    recurringItemId = recurringRes.json().id
  })

  afterAll(closeTestApp)

  const auth = () => ({ authorization: `Bearer ${token}` })
  const otherAuth = () => ({ authorization: `Bearer ${otherToken}` })
  const missing = '00000000-0000-0000-0000-000000000000'

  describe('DELETE /api/completions/:completionId', () => {
    it('deletes a completion (undo)', async () => {
      const completeRes = await app.inject({
        method: 'POST',
        url: `/api/items/${itemId}/complete`,
        headers: auth(),
      })
      const completionId = completeRes.json().id

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/completions/${completionId}`,
        headers: auth(),
      })
      expect(res.statusCode).toBe(204)
    })

    it('reverts due date when undoing latest completion of a recurring item', async () => {
      const originalDueDate = '2024-03-15T00:00:00.000Z'

      // Complete the recurring item (this advances the due date)
      const completeRes = await app.inject({
        method: 'POST',
        url: `/api/items/${recurringItemId}/complete`,
        headers: auth(),
      })
      const completionId = completeRes.json().id

      // Undo the completion
      const deleteRes = await app.inject({
        method: 'DELETE',
        url: `/api/completions/${completionId}`,
        headers: auth(),
      })
      expect(deleteRes.statusCode).toBe(204)

      // Due date should be reverted
      const itemRes = await app.inject({
        method: 'GET',
        url: `/api/items/${recurringItemId}`,
        headers: auth(),
      })
      expect(itemRes.json().dueDate).toBe(originalDueDate)
    })

    it('returns 404 for non-existent completion', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/completions/${missing}`,
        headers: auth(),
      })
      expect(res.statusCode).toBe(404)
    })

    it("returns 403 when trying to delete another user's completion", async () => {
      // Complete primary user's item
      const completeRes = await app.inject({
        method: 'POST',
        url: `/api/items/${itemId}/complete`,
        headers: auth(),
      })
      const completionId = completeRes.json().id

      // Try to delete with the other user's token
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/completions/${completionId}`,
        headers: otherAuth(),
      })
      expect(res.statusCode).toBe(403)
    })
  })
})
