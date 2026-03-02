import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import { getTestApp, closeTestApp } from '../../helpers/app'

describe('Backup Routes', () => {
  let app: FastifyInstance
  let token: string
  let otherToken: string
  let richItemId: string

  beforeAll(async () => {
    app = await getTestApp()
    const uid = Date.now()

    const registerRes = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: `backup+${uid}@example.com`,
        username: `backupuser${uid}`,
        password: 'SecurePass123',
      },
    })
    token = registerRes.json().token

    // Create a list + item for the main user so the backup is non-empty
    const listRes = await app.inject({
      method: 'POST',
      url: '/api/lists',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: 'Route Backup List', defaultCurrency: 'SEK' },
    })
    const listId = listRes.json().id

    await app.inject({
      method: 'POST',
      url: `/api/lists/${listId}/items`,
      headers: { authorization: `Bearer ${token}` },
      payload: { title: 'Backup Item', dueDate: '2025-09-01T00:00:00Z' },
    })

    // Create a list with a rich item (recurrence rule, completions, comments) for full coverage
    const richListRes = await app.inject({
      method: 'POST',
      url: '/api/lists',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: 'Rich Backup List', description: 'rich list', defaultCurrency: 'USD' },
    })
    const richListId = richListRes.json().id

    const richItemRes = await app.inject({
      method: 'POST',
      url: `/api/lists/${richListId}/items`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        title: 'Rich Backup Item',
        description: 'rich item',
        dueDate: '2025-06-15T00:00:00Z',
        startDate: '2025-06-01T00:00:00Z',
        startTime: '08:00',
        endTime: '09:00',
        amount: '12.50',
        currency: 'USD',
        colorOverride: '#123456',
        recurrenceRule: { type: 'monthly_on_day', dayOfMonth: 15 },
      },
    })
    richItemId = richItemRes.json().id

    // Add a completion to the rich item
    await app.inject({
      method: 'POST',
      url: `/api/items/${richItemId}/complete`,
      headers: { authorization: `Bearer ${token}` },
      payload: { note: 'completed for backup test' },
    })

    // Add a comment to the rich item
    await app.inject({
      method: 'POST',
      url: `/api/items/${richItemId}/comments`,
      headers: { authorization: `Bearer ${token}` },
      payload: { content: 'comment for backup test' },
    })

    // Second user for isolation tests
    const uid2 = Date.now() + 1
    const otherRes = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: `backup2+${uid2}@example.com`,
        username: `backupuser2${uid2}`,
        password: 'SecurePass123',
      },
    })
    otherToken = otherRes.json().token
  })

  afterAll(closeTestApp)

  const auth = () => ({ authorization: `Bearer ${token}` })

  describe('GET /api/backup', () => {
    it('returns 401 without a token', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/backup' })
      expect(res.statusCode).toBe(401)
    })

    it('returns 200 with version:1 and lists array', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/backup', headers: auth() })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body.version).toBe(1)
      expect(Array.isArray(body.lists)).toBe(true)
      expect(body.exportedAt).toBeTruthy()
    })

    it("includes the user's list and its item", async () => {
      const res = await app.inject({ method: 'GET', url: '/api/backup', headers: auth() })
      const body = res.json()
      const list = body.lists.find((l: { title: string }) => l.title === 'Route Backup List')
      expect(list).toBeDefined()
      expect(list.defaultCurrency).toBe('SEK')
      expect(Array.isArray(list.items)).toBe(true)
      const item = list.items.find((i: { title: string }) => i.title === 'Backup Item')
      expect(item).toBeDefined()
    })

    it('sets Content-Disposition attachment header', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/backup', headers: auth() })
      expect(res.headers['content-disposition']).toMatch(
        /attachment; filename="todo-backup-.*\.json"/
      )
    })

    it("does not include other users' data", async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/backup',
        headers: { authorization: `Bearer ${otherToken}` },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      const hasMainUserList = body.lists.some(
        (l: { title: string }) => l.title === 'Route Backup List'
      )
      expect(hasMainUserList).toBe(false)
    })

    it('exports items with recurrence rules, completions, and comments', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/backup', headers: auth() })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      const richList = body.lists.find((l: { title: string }) => l.title === 'Rich Backup List')
      expect(richList).toBeDefined()
      const richItem = richList.items.find((i: { title: string }) => i.title === 'Rich Backup Item')
      expect(richItem).toBeDefined()
      expect(richItem.recurrenceRule).toBeTruthy()
      expect(richItem.recurrenceRule.type).toBe('monthly_on_day')
      expect(richItem.recurrenceRule.dayOfMonth).toBe(15)
      expect(richItem.completions.length).toBeGreaterThanOrEqual(1)
      expect(richItem.completions[0].note).toBe('completed for backup test')
      expect(richItem.comments.length).toBeGreaterThanOrEqual(1)
      expect(richItem.comments[0].content).toBe('comment for backup test')
    })

    it('returns empty lists for a user with no data', async () => {
      const uid3 = Date.now() + 2
      const emptyUserRes = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: `backupempty+${uid3}@example.com`,
          username: `backupempty${uid3}`,
          password: 'SecurePass123',
        },
      })
      const emptyToken = emptyUserRes.json().token
      const res = await app.inject({
        method: 'GET',
        url: '/api/backup',
        headers: { authorization: `Bearer ${emptyToken}` },
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().lists).toEqual([])
    })
  })

  describe('POST /api/backup/restore', () => {
    it('returns 401 without a token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/backup/restore',
        payload: { version: 1, exportedAt: '', lists: [] },
      })
      expect(res.statusCode).toBe(401)
    })

    it('returns 400 for invalid payload (missing version)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/backup/restore',
        headers: auth(),
        payload: { exportedAt: '', lists: [] },
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 for wrong version', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/backup/restore',
        headers: auth(),
        payload: { version: 99, exportedAt: '', lists: [] },
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 when lists is not an array', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/backup/restore',
        headers: auth(),
        payload: { version: 1, exportedAt: '', lists: 'nope' },
      })
      expect(res.statusCode).toBe(400)
    })

    it('returns 201 with { lists, items } for an empty backup', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/backup/restore',
        headers: auth(),
        payload: { version: 1, exportedAt: new Date().toISOString(), lists: [] },
      })
      expect(res.statusCode).toBe(201)
      expect(res.json()).toEqual({ lists: 0, items: 0 })
    })

    it('imports a list with items and returns correct counts', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/backup/restore',
        headers: auth(),
        payload: {
          version: 1,
          exportedAt: new Date().toISOString(),
          lists: [
            {
              title: 'Restored List',
              description: null,
              defaultCurrency: null,
              items: [
                {
                  title: 'Restored Item 1',
                  description: null,
                  startDate: null,
                  startTime: null,
                  endTime: null,
                  dueDate: null,
                  amount: null,
                  currency: null,
                  colorOverride: null,
                  isArchived: false,
                  sortOrder: 0,
                  recurrenceRule: null,
                  completions: [],
                  comments: [],
                },
              ],
            },
          ],
        },
      })
      expect(res.statusCode).toBe(201)
      const body = res.json()
      expect(body.lists).toBe(1)
      expect(body.items).toBe(1)
    })

    it('imports items with recurrence rules, completions, and comments', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/backup/restore',
        headers: auth(),
        payload: {
          version: 1,
          exportedAt: new Date().toISOString(),
          lists: [
            {
              title: 'Rich Restored List',
              description: 'a rich list',
              defaultCurrency: 'EUR',
              items: [
                {
                  title: 'Rich Restored Item',
                  description: 'with everything',
                  startDate: '2025-01-01T00:00:00.000Z',
                  startTime: '09:00',
                  endTime: '10:00',
                  dueDate: '2025-03-01T00:00:00.000Z',
                  amount: '99.99',
                  currency: 'EUR',
                  colorOverride: '#aabbcc',
                  isArchived: false,
                  sortOrder: 1,
                  recurrenceRule: {
                    type: 'weekly',
                    dayOfMonth: null,
                    intervalDays: null,
                    weekdayMask: 2,
                    anchorDate: null,
                  },
                  completions: [
                    {
                      completedAt: '2025-02-01T12:00:00.000Z',
                      dueDateSnapshot: '2025-02-01T00:00:00.000Z',
                      note: 'a note',
                    },
                  ],
                  comments: [
                    {
                      content: 'a comment',
                      createdAt: '2025-02-01T10:00:00.000Z',
                    },
                  ],
                },
              ],
            },
          ],
        },
      })
      expect(res.statusCode).toBe(201)
      expect(res.json().lists).toBe(1)
      expect(res.json().items).toBe(1)
    })

    it('imports items with recurrence rule using anchorDate', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/backup/restore',
        headers: auth(),
        payload: {
          version: 1,
          exportedAt: new Date().toISOString(),
          lists: [
            {
              title: 'Anchor Restored List',
              description: null,
              defaultCurrency: null,
              items: [
                {
                  title: 'Anchor Item',
                  description: null,
                  startDate: null,
                  startTime: null,
                  endTime: null,
                  dueDate: '2025-04-01T00:00:00.000Z',
                  amount: null,
                  currency: null,
                  colorOverride: null,
                  isArchived: false,
                  sortOrder: 0,
                  recurrenceRule: {
                    type: 'custom_days',
                    dayOfMonth: null,
                    intervalDays: 7,
                    weekdayMask: null,
                    anchorDate: '2025-01-01T00:00:00.000Z',
                  },
                  completions: [],
                  comments: [],
                },
              ],
            },
          ],
        },
      })
      expect(res.statusCode).toBe(201)
      expect(res.json().lists).toBe(1)
      expect(res.json().items).toBe(1)
    })

    it('round-trips: export then restore creates new copies', async () => {
      // Export current state
      const exportRes = await app.inject({ method: 'GET', url: '/api/backup', headers: auth() })
      const backup = exportRes.json()

      const listsBefore = backup.lists.length
      const itemsBefore = backup.lists.reduce(
        (sum: number, l: { items: unknown[] }) => sum + l.items.length,
        0
      )

      // Restore into the same user
      const restoreRes = await app.inject({
        method: 'POST',
        url: '/api/backup/restore',
        headers: auth(),
        payload: backup,
      })
      expect(restoreRes.statusCode).toBe(201)
      expect(restoreRes.json().lists).toBe(listsBefore)
      expect(restoreRes.json().items).toBe(itemsBefore)
    })
  })
})
