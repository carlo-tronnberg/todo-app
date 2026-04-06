import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import { getTestApp, closeTestApp } from '../../helpers/app'

describe('Shares Routes', () => {
  let app: FastifyInstance
  let ownerToken: string
  let otherToken: string
  let otherEmail: string
  let listId: string

  beforeAll(async () => {
    app = await getTestApp()

    const uid = Date.now()

    // Register owner
    const ownerRes = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: `shareowner+${uid}@example.com`,
        username: `shareowner${uid}`,
        password: 'SecurePass123',
      },
    })
    ownerToken = ownerRes.json().token

    // Register other user
    otherEmail = `shareother+${uid}@example.com`
    const otherRes = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: otherEmail,
        username: `shareother${uid}`,
        password: 'SecurePass123',
      },
    })
    otherToken = otherRes.json().token

    // Create a list
    const listRes = await app.inject({
      method: 'POST',
      url: '/api/lists',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { title: 'Shared List' },
    })
    listId = listRes.json().id
  })

  afterAll(closeTestApp)

  const ownerAuth = () => ({ authorization: `Bearer ${ownerToken}` })
  const otherAuth = () => ({ authorization: `Bearer ${otherToken}` })

  it('GET /api/lists/:id/shares returns empty array initially', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/lists/${listId}/shares`,
      headers: ownerAuth(),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual([])
  })

  it('POST /api/lists/:id/shares shares a list by email', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/lists/${listId}/shares`,
      headers: ownerAuth(),
      payload: { email: otherEmail },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().user.email).toBe(otherEmail)
    expect(res.json().role).toBe('editor')
  })

  it('POST /api/lists/:id/shares rejects duplicate share', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/lists/${listId}/shares`,
      headers: ownerAuth(),
      payload: { email: otherEmail },
    })
    expect(res.statusCode).toBe(400)
  })

  it('POST /api/lists/:id/shares rejects self-share', async () => {
    const meRes = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: ownerAuth(),
    })
    const res = await app.inject({
      method: 'POST',
      url: `/api/lists/${listId}/shares`,
      headers: ownerAuth(),
      payload: { email: meRes.json().email },
    })
    expect(res.statusCode).toBe(400)
  })

  it('POST /api/lists/:id/shares rejects unknown email', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/lists/${listId}/shares`,
      headers: ownerAuth(),
      payload: { email: 'nonexistent@example.com' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('shared user can see the list', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/lists',
      headers: otherAuth(),
    })
    expect(res.statusCode).toBe(200)
    const lists = res.json()
    expect(lists.some((l: { id: string }) => l.id === listId)).toBe(true)
  })

  it('shared user can access list items', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/lists/${listId}/items`,
      headers: otherAuth(),
    })
    expect(res.statusCode).toBe(200)
  })

  it('GET /api/lists/:id/shares returns shares with user info', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/lists/${listId}/shares`,
      headers: ownerAuth(),
    })
    expect(res.statusCode).toBe(200)
    const shares = res.json()
    expect(shares.length).toBe(1)
    expect(shares[0].user.email).toBe(otherEmail)
  })

  it('DELETE /api/lists/:id/shares/:shareId removes the share', async () => {
    const sharesRes = await app.inject({
      method: 'GET',
      url: `/api/lists/${listId}/shares`,
      headers: ownerAuth(),
    })
    const shareId = sharesRes.json()[0].id

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/lists/${listId}/shares/${shareId}`,
      headers: ownerAuth(),
    })
    expect(res.statusCode).toBe(204)

    // Verify share is removed
    const afterRes = await app.inject({
      method: 'GET',
      url: `/api/lists/${listId}/shares`,
      headers: ownerAuth(),
    })
    expect(afterRes.json()).toEqual([])
  })
})
