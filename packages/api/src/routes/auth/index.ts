import { FastifyPluginAsync } from 'fastify'
import { AuthService, UpdateProfileInput } from '../../services/auth.service'
import { AuditService } from '../../services/audit.service'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? ''
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? ''
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI ?? ''

export const authRoutes: FastifyPluginAsync = async (app) => {
  const authService = new AuthService(app.db)
  const auditService = new AuditService(app.db)

  // GET /api/auth/google — redirect to Google OAuth consent screen
  app.get('/google', async (_request, reply) => {
    if (!GOOGLE_CLIENT_ID) return reply.badRequest('Google SSO is not configured')

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_REDIRECT_URI,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'online',
      prompt: 'select_account',
    })

    return reply.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
  })

  // GET /api/auth/google/callback — exchange code for tokens, find/create user
  app.get<{ Querystring: { code?: string; error?: string } }>(
    '/google/callback',
    async (request, reply) => {
      if (request.query.error) {
        return reply.redirect('/?error=google_denied')
      }

      const code = request.query.code
      if (!code) return reply.badRequest('Missing authorization code')

      // Exchange code for tokens
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: GOOGLE_REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
      })

      if (!tokenRes.ok) return reply.unauthorized('Failed to exchange authorization code')

      const tokens = (await tokenRes.json()) as { id_token?: string }
      if (!tokens.id_token) return reply.unauthorized('No ID token received')

      // Decode the ID token (JWT) to get user info — Google tokens are signed,
      // and we verified the exchange with client_secret, so this is safe.
      const payload = JSON.parse(
        Buffer.from(tokens.id_token.split('.')[1], 'base64url').toString()
      ) as { email?: string; given_name?: string; family_name?: string }

      if (!payload.email) return reply.unauthorized('No email in Google profile')

      const user = await authService.findOrCreateByGoogle({
        email: payload.email,
        firstName: payload.given_name,
        lastName: payload.family_name,
      })

      const token = app.jwt.sign({ sub: user.id, email: user.email, username: user.username })

      // Redirect to frontend with token — the frontend reads it from the URL
      return reply.redirect(`/?token=${encodeURIComponent(token)}`)
    }
  )

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
      /* c8 ignore next */
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
      /* c8 ignore next */
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
      try {
        const updated = await authService.updateProfile(request.user.sub, request.body)
        /* c8 ignore next */
        if (!updated) return reply.notFound()
        auditService
          .log(request.user.sub, 'profile.update', 'user', request.user.sub, 'Updated profile')
          .catch(() => {})
        return updated
      } catch (err: unknown) {
        if ((err as Error).message === 'EMAIL_IN_USE') {
          return reply.badRequest('EMAIL_IN_USE')
        }
        throw err
      }
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
        auditService
          .log(request.user.sub, 'password.change', 'user', request.user.sub, 'Changed password')
          .catch(() => {})
        return reply.code(204).send()
      } catch (err) {
        /* c8 ignore next */
        const message = err instanceof Error ? err.message : ''
        /* c8 ignore next */
        if (message === 'WRONG_PASSWORD') return reply.unauthorized('Current password is incorrect')
        /* c8 ignore next 2 */
        throw err
      }
    }
  )
}
