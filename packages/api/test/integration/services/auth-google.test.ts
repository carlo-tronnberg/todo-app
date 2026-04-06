import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import { getTestApp, closeTestApp } from '../../helpers/app'
import { AuthService } from '../../../src/services/auth.service'

describe('AuthService.findOrCreateByGoogle', () => {
  let app: FastifyInstance
  let authService: AuthService

  beforeAll(async () => {
    app = await getTestApp()
    authService = new AuthService(app.db)
  })

  afterAll(closeTestApp)

  it('creates a new user when email does not exist', async () => {
    const uid = Date.now()
    const email = `google-new+${uid}@example.com`
    const user = await authService.findOrCreateByGoogle({
      email,
      firstName: 'New',
      lastName: 'User',
      avatarUrl: 'https://example.com/photo.jpg',
    })

    expect(user.email).toBe(email)
    expect(user.firstName).toBe('New')
    expect(user.avatarUrl).toBe('https://example.com/photo.jpg')
  })

  it('returns existing user when email matches', async () => {
    const uid = Date.now()
    const email = `google-existing+${uid}@example.com`

    // Register a user first
    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email, username: `guser${uid}`, password: 'SecurePass123' },
    })

    const user = await authService.findOrCreateByGoogle({
      email,
      firstName: 'Updated',
      avatarUrl: 'https://example.com/updated.jpg',
    })

    expect(user.email).toBe(email)
  })

  it('updates avatar on existing user', async () => {
    const uid = Date.now()
    const email = `google-avatar+${uid}@example.com`

    // Create via Google
    await authService.findOrCreateByGoogle({
      email,
      firstName: 'First',
      avatarUrl: 'https://example.com/old.jpg',
    })

    // Login again with new avatar
    const user = await authService.findOrCreateByGoogle({
      email,
      firstName: 'First',
      avatarUrl: 'https://example.com/new.jpg',
    })

    expect(user.avatarUrl).toBe('https://example.com/new.jpg')
  })
})
