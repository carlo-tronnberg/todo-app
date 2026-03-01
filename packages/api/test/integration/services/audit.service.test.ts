import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import { getTestApp, closeTestApp } from '../../helpers/app'
import { AuditService } from '../../../src/services/audit.service'

// Uses the real DB to exercise AuditService.log() and findByUser() directly.
describe('AuditService', () => {
  let app: FastifyInstance
  let userId: string
  let svc: AuditService

  beforeAll(async () => {
    app = await getTestApp()
    const uid = Date.now()
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: `auditunit+${uid}@example.com`,
        username: `auditunit${uid}`,
        password: 'SecurePass123',
      },
    })
    const token = res.json().token

    const meRes = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${token}` },
    })
    userId = meRes.json().id

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    svc = new AuditService((app as any).db)
  })

  afterAll(closeTestApp)

  it('log() inserts an audit entry without throwing', async () => {
    await expect(
      svc.log(userId, 'unit.test', 'user', userId, 'direct log call')
    ).resolves.toBeUndefined()
  })

  it('log() without summary inserts entry with null summary', async () => {
    await expect(svc.log(userId, 'unit.nosummary', 'user', userId)).resolves.toBeUndefined()
  })

  it('findByUser() returns entries ordered newest-first', async () => {
    await svc.log(userId, 'order.first', 'entity', userId)
    await svc.log(userId, 'order.second', 'entity', userId)

    const entries = await svc.findByUser(userId, 50, 0)
    expect(Array.isArray(entries)).toBe(true)

    const ordered = entries.filter((e) => e.action.startsWith('order.'))
    expect(ordered.length).toBeGreaterThanOrEqual(2)

    // Newest-first: 'order.second' should appear before 'order.first'
    const idxFirst = ordered.findIndex((e) => e.action === 'order.first')
    const idxSecond = ordered.findIndex((e) => e.action === 'order.second')
    expect(idxSecond).toBeLessThan(idxFirst)
  })

  it('findByUser() respects limit and offset', async () => {
    const all = await svc.findByUser(userId, 1000, 0)
    const limited = await svc.findByUser(userId, 1, 0)
    expect(limited.length).toBe(1)

    if (all.length > 1) {
      const offset1 = await svc.findByUser(userId, 1, 1)
      expect(offset1[0].id).toBe(all[1].id)
    }
  })
})
