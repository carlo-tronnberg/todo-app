import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import { getTestApp, closeTestApp } from '../../helpers/app'

describe('Transaction Types Routes', () => {
  let app: FastifyInstance
  let token: string

  beforeAll(async () => {
    app = await getTestApp()

    const uid = Date.now()
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: `txtype+${uid}@example.com`,
        username: `txtypeuser${uid}`,
        password: 'SecurePass123',
      },
    })
    token = res.json().token
  })

  afterAll(closeTestApp)

  const auth = () => ({ authorization: `Bearer ${token}` })

  it('GET /api/transaction-types seeds defaults on first access', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/transaction-types',
      headers: auth(),
    })
    expect(res.statusCode).toBe(200)
    const types = res.json()
    expect(types.length).toBe(5)
    const names = types.map((t: { name: string }) => t.name)
    expect(names).toContain('Autogiro')
    expect(names).toContain('Swish')
  })

  it('GET /api/transaction-types returns sorted list', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/transaction-types',
      headers: auth(),
    })
    const names = res.json().map((t: { name: string }) => t.name)
    const sorted = [...names].sort((a: string, b: string) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    )
    expect(names).toEqual(sorted)
  })

  it('POST /api/transaction-types creates a new type', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/transaction-types',
      headers: auth(),
      payload: { name: 'Invoice' },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().name).toBe('Invoice')
  })

  it('POST /api/transaction-types rejects empty name', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/transaction-types',
      headers: auth(),
      payload: { name: '' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('DELETE /api/transaction-types/:id removes a type', async () => {
    // Get current types
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/transaction-types',
      headers: auth(),
    })
    const invoiceType = listRes.json().find((t: { name: string }) => t.name === 'Invoice')

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/transaction-types/${invoiceType.id}`,
      headers: auth(),
    })
    expect(res.statusCode).toBe(204)
  })
})
