import { FastifyPluginAsync } from 'fastify'
import { AuthService, UpdateProfileInput } from '../../services/auth.service'

export const authRoutes: FastifyPluginAsync = async (app) => {
  const authService = new AuthService(app.db)

  // POST /api/auth/register
  app.post<{
    Body: { email: string; username: string; password: string }
  }>('/register', async (request, reply) => {
    const { email, username, password } = request.body

    if (!email || !username || !password) {
      return reply.badRequest('email, username and password are required')
    }

    if (password.length < 8) {
      return reply.badRequest('password must be at least 8 characters')
    }

    try {
      const user = await authService.register({ email, username, password })
      const token = app.jwt.sign({ sub: user.id, email: user.email, username: user.username })
      return reply.code(201).send({ user, token })
    } catch (err) {
      /* c8 ignore next */
      const message = err instanceof Error ? err.message : ''
      if (message === 'EMAIL_TAKEN') return reply.conflict('Email already in use')
      if (message === 'USERNAME_TAKEN') return reply.conflict('Username already in use')
      /* c8 ignore next 2 */
      throw err
    }
  })

  // POST /api/auth/login
  app.post<{
    Body: { email: string; password: string }
  }>('/login', async (request, reply) => {
    const { email, password } = request.body

    if (!email || !password) {
      return reply.badRequest('email and password are required')
    }

    try {
      const user = await authService.login({ email, password })
      const token = app.jwt.sign({ sub: user.id, email: user.email, username: user.username })
      return { user, token }
    } catch (err) {
      /* c8 ignore next */
      const message = err instanceof Error ? err.message : ''
      if (message === 'INVALID_CREDENTIALS') return reply.unauthorized('Invalid credentials')
      /* c8 ignore next 2 */
      throw err
    }
  })

  // GET /api/auth/me
  app.get('/me', { onRequest: [app.authenticate] }, async (request) => {
    const user = await authService.findById(request.user.sub)
    /* c8 ignore next */
    if (!user) return app.httpErrors.notFound()
    return user
  })

  // PATCH /api/auth/me — update profile fields
  app.patch<{ Body: UpdateProfileInput }>(
    '/me',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const updated = await authService.updateProfile(request.user.sub, request.body)
      /* c8 ignore next */
      if (!updated) return reply.notFound()
      return updated
    }
  )

  // PATCH /api/auth/password — change password
  app.patch<{ Body: { oldPassword: string; newPassword: string } }>(
    '/password',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { oldPassword, newPassword } = request.body
      if (!oldPassword || !newPassword) {
        return reply.badRequest('oldPassword and newPassword are required')
      }
      if (newPassword.length < 8) {
        return reply.badRequest('newPassword must be at least 8 characters')
      }
      try {
        await authService.changePassword(request.user.sub, oldPassword, newPassword)
        return reply.code(204).send()
      } catch (err) {
        const message = err instanceof Error ? err.message : ''
        if (message === 'WRONG_PASSWORD') return reply.unauthorized('Current password is incorrect')
        /* c8 ignore next 2 */
        throw err
      }
    }
  )
}
