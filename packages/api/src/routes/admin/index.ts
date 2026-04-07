import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import { eq } from 'drizzle-orm'
import { users } from '../../db'

export const adminRoutes: FastifyPluginAsync = async (app) => {
  const adminAuth = {
    onRequest: [
      app.authenticate,
      async (request: FastifyRequest, reply: FastifyReply) => {
        const [user] = await app.db
          .select({ isAdmin: users.isAdmin })
          .from(users)
          .where(eq(users.id, request.user.sub))
          .limit(1)
        if (!user?.isAdmin) return reply.forbidden('Admin access required')
      },
    ],
  }

  // GET /api/admin/users — list all users
  app.get('/users', adminAuth, async () => {
    return app.db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        avatarUrl: users.avatarUrl,
        isAdmin: users.isAdmin,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(users.createdAt)
  })

  // PATCH /api/admin/users/:userId — update user (e.g., toggle admin)
  app.patch<{ Params: { userId: string }; Body: { isAdmin?: boolean } }>(
    '/users/:userId',
    adminAuth,
    async (request, reply) => {
      const { isAdmin } = request.body ?? {}
      if (isAdmin === undefined) return reply.badRequest('Nothing to update')

      const [updated] = await app.db
        .update(users)
        .set({ isAdmin, updatedAt: new Date() })
        .where(eq(users.id, request.params.userId))
        .returning({
          id: users.id,
          email: users.email,
          username: users.username,
          isAdmin: users.isAdmin,
        })

      return updated ?? reply.notFound()
    }
  )
}
