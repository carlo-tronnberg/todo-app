import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import { eq, inArray, and, sql } from 'drizzle-orm'
import { users, todoLists, todoItems, listShares } from '../../db'

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

  // GET /api/admin/lists — all lists with owner, shares, and item counts
  app.get('/lists', adminAuth, async () => {
    const allLists = await app.db
      .select({
        id: todoLists.id,
        title: todoLists.title,
        icon: todoLists.icon,
        description: todoLists.description,
        createdAt: todoLists.createdAt,
        ownerId: users.id,
        ownerEmail: users.email,
        ownerUsername: users.username,
        ownerFirstName: users.firstName,
        ownerLastName: users.lastName,
        ownerAvatarUrl: users.avatarUrl,
      })
      .from(todoLists)
      .innerJoin(users, eq(todoLists.userId, users.id))
      .orderBy(users.email, todoLists.title)

    if (allLists.length === 0) return []

    const listIds = allLists.map((l) => l.id)

    const [sharesResult, itemCounts] = await Promise.all([
      app.db
        .select({
          listId: listShares.listId,
          role: listShares.role,
          userId: users.id,
          email: users.email,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
          avatarUrl: users.avatarUrl,
        })
        .from(listShares)
        .innerJoin(users, eq(listShares.sharedWithUserId, users.id))
        .where(inArray(listShares.listId, listIds)),

      app.db
        .select({
          listId: todoItems.listId,
          count: sql<number>`cast(count(*) as int)`,
        })
        .from(todoItems)
        .where(and(inArray(todoItems.listId, listIds), eq(todoItems.isArchived, false)))
        .groupBy(todoItems.listId),
    ])

    return allLists.map((list) => ({
      id: list.id,
      title: list.title,
      icon: list.icon,
      description: list.description,
      createdAt: list.createdAt,
      owner: {
        id: list.ownerId,
        email: list.ownerEmail,
        username: list.ownerUsername,
        firstName: list.ownerFirstName,
        lastName: list.ownerLastName,
        avatarUrl: list.ownerAvatarUrl,
      },
      shares: sharesResult
        .filter((s) => s.listId === list.id)
        .map((s) => ({
          role: s.role,
          user: {
            id: s.userId,
            email: s.email,
            username: s.username,
            firstName: s.firstName,
            lastName: s.lastName,
            avatarUrl: s.avatarUrl,
          },
        })),
      itemCount: itemCounts.find((c) => c.listId === list.id)?.count ?? 0,
    }))
  })
}
