import { FastifyPluginAsync } from 'fastify'
import { AuthService } from '../../services/auth.service'

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
      const message = err instanceof Error ? err.message : ''
      if (message === 'EMAIL_TAKEN') return reply.conflict('Email already in use')
      if (message === 'USERNAME_TAKEN') return reply.conflict('Username already in use')
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
      const message = err instanceof Error ? err.message : ''
      if (message === 'INVALID_CREDENTIALS') return reply.unauthorized('Invalid credentials')
      throw err
    }
  })

  // GET /api/auth/me
  app.get('/me', { onRequest: [app.authenticate] }, async (request) => {
    const user = await authService.findById(request.user.sub)
    if (!user) return app.httpErrors.notFound()
    return user
  })
}
