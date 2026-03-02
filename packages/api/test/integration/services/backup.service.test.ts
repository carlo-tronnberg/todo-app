import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import { getTestApp, closeTestApp } from '../../helpers/app'
import { BackupService } from '../../../src/services/backup.service'

describe('BackupService', () => {
  let app: FastifyInstance
  let userId: string
  let token: string
  let svc: BackupService

  beforeAll(async () => {
    app = await getTestApp()
    const uid = Date.now()

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: `backupsvc+${uid}@example.com`,
        username: `backupsvc${uid}`,
        password: 'SecurePass123',
      },
    })
    token = res.json().token

    const meRes = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${token}` },
    })
    userId = meRes.json().id

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    svc = new BackupService((app as any).db)
  })

  afterAll(closeTestApp)

  describe('export()', () => {
    it('returns version 1 with empty lists array for a new user', async () => {
      const data = await svc.export(userId)
      expect(data.version).toBe(1)
      expect(data.exportedAt).toBeTruthy()
      expect(Array.isArray(data.lists)).toBe(true)
      expect(data.lists).toHaveLength(0)
    })

    it('includes list data after creating a list', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/lists',
        headers: { authorization: `Bearer ${token}` },
        payload: { title: 'Backup Test List', description: 'desc', defaultCurrency: 'USD' },
      })

      const data = await svc.export(userId)
      expect(data.lists.length).toBeGreaterThanOrEqual(1)
      const list = data.lists.find((l) => l.title === 'Backup Test List')
      expect(list).toBeDefined()
      expect(list?.description).toBe('desc')
      expect(list?.defaultCurrency).toBe('USD')
    })

    it('includes items nested inside their list', async () => {
      const data = await svc.export(userId)
      const list = data.lists.find((l) => l.title === 'Backup Test List')!
      expect(Array.isArray(list.items)).toBe(true)
    })

    it('includes item with completions and recurrence rule', async () => {
      // Create a list specifically for this test
      const listRes = await app.inject({
        method: 'POST',
        url: '/api/lists',
        headers: { authorization: `Bearer ${token}` },
        payload: { title: 'Recurrence Backup List' },
      })
      const listId = listRes.json().id

      const itemRes = await app.inject({
        method: 'POST',
        url: `/api/lists/${listId}/items`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          title: 'Recurring Item',
          dueDate: '2025-06-01T00:00:00Z',
          recurrenceRule: { type: 'weekly', weekdayMask: 0b0000010 },
        },
      })
      const itemId = itemRes.json().id

      // Mark complete to generate a completion
      await app.inject({
        method: 'POST',
        url: `/api/items/${itemId}/complete`,
        headers: { authorization: `Bearer ${token}` },
      })

      const data = await svc.export(userId)
      const list = data.lists.find((l) => l.title === 'Recurrence Backup List')!
      expect(list).toBeDefined()
      const item = list.items.find((i) => i.title === 'Recurring Item')!
      expect(item).toBeDefined()
      expect(item.recurrenceRule).not.toBeNull()
      expect(item.recurrenceRule?.type).toBe('weekly')
      expect(item.recurrenceRule?.weekdayMask).toBe(0b0000010)
      expect(item.completions.length).toBeGreaterThanOrEqual(1)
    })

    it('exportedAt is a valid ISO timestamp', async () => {
      const data = await svc.export(userId)
      const d = new Date(data.exportedAt)
      expect(d.getTime()).not.toBeNaN()
    })
  })

  describe('import()', () => {
    it('throws UNSUPPORTED_VERSION for version !== 1', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(
        svc.import(userId, { version: 2 as any, exportedAt: '', lists: [] })
      ).rejects.toThrow('UNSUPPORTED_VERSION')
    })

    it('returns { lists: 0, items: 0 } for empty backup', async () => {
      const result = await svc.import(userId, {
        version: 1,
        exportedAt: new Date().toISOString(),
        lists: [],
      })
      expect(result).toEqual({ lists: 0, items: 0 })
    })

    it('creates lists and items from backup data and returns counts', async () => {
      const result = await svc.import(userId, {
        version: 1,
        exportedAt: new Date().toISOString(),
        lists: [
          {
            title: 'Imported List',
            description: 'from backup',
            defaultCurrency: 'EUR',
            items: [
              {
                title: 'Imported Item A',
                description: null,
                startDate: null,
                startTime: null,
                endTime: null,
                dueDate: '2025-07-15T00:00:00.000Z',
                amount: null,
                currency: null,
                colorOverride: null,
                isArchived: false,
                sortOrder: 0,
                recurrenceRule: null,
                completions: [],
                comments: [],
              },
              {
                title: 'Imported Item B',
                description: 'with note',
                startDate: null,
                startTime: null,
                endTime: null,
                dueDate: null,
                amount: '42.50',
                currency: 'USD',
                colorOverride: null,
                isArchived: false,
                sortOrder: 1,
                recurrenceRule: null,
                completions: [],
                comments: [],
              },
            ],
          },
        ],
      })
      expect(result.lists).toBe(1)
      expect(result.items).toBe(2)
    })

    it('imports completions and comments', async () => {
      const result = await svc.import(userId, {
        version: 1,
        exportedAt: new Date().toISOString(),
        lists: [
          {
            title: 'List With History',
            description: null,
            defaultCurrency: null,
            items: [
              {
                title: 'Historical Item',
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
                completions: [
                  {
                    completedAt: '2025-05-01T12:00:00.000Z',
                    dueDateSnapshot: '2025-05-01T00:00:00.000Z',
                    note: 'done!',
                  },
                ],
                comments: [{ content: 'A comment', createdAt: '2025-05-01T10:00:00.000Z' }],
              },
            ],
          },
        ],
      })
      expect(result.lists).toBe(1)
      expect(result.items).toBe(1)
    })

    it('imports recurrence rules', async () => {
      const result = await svc.import(userId, {
        version: 1,
        exportedAt: new Date().toISOString(),
        lists: [
          {
            title: 'Recurrence Import List',
            description: null,
            defaultCurrency: null,
            items: [
              {
                title: 'Monthly Item',
                description: null,
                startDate: null,
                startTime: null,
                endTime: null,
                dueDate: '2025-08-01T00:00:00.000Z',
                amount: null,
                currency: null,
                colorOverride: null,
                isArchived: false,
                sortOrder: 0,
                recurrenceRule: {
                  type: 'monthly_on_day',
                  dayOfMonth: 1,
                  intervalDays: null,
                  weekdayMask: null,
                  anchorDate: null,
                },
                completions: [],
                comments: [],
              },
            ],
          },
        ],
      })
      expect(result.lists).toBe(1)
      expect(result.items).toBe(1)
    })

    it('round-trips: export then import preserves structure', async () => {
      const exported = await svc.export(userId)
      if (exported.lists.length === 0) return // skip if user has no data

      // Import into same user (creates duplicates but shouldn't throw)
      const result = await svc.import(userId, exported)
      expect(result.lists).toBe(exported.lists.length)
      expect(result.items).toBe(exported.lists.reduce((sum, l) => sum + l.items.length, 0))
    })
  })
})
