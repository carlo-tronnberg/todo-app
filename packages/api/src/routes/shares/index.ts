import { FastifyPluginAsync } from 'fastify'
import { eq, and } from 'drizzle-orm'
import { Database, listShares, users, todoLists } from '../../db'

export interface ShareInfo {
  id: string
  role: string
  createdAt: Date
  user: {
    id: string
    email: string
    username: string
    firstName: string | null
    lastName: string | null
    avatarUrl: string | null
  }
}

export const sharesRoutes: FastifyPluginAsync = async (app) => {
  const auth = { onRequest: [app.authenticate] }

  // GET /api/lists/:listId/shares — list all shares for a list
  app.get<{ Params: { listId: string } }>('/:listId/shares', auth, async (request, reply) => {
    // Verify the user owns the list or is shared with
    const hasAccess = await verifyListAccess(app.db, request.params.listId, request.user.sub)
    if (!hasAccess) return reply.notFound()

    const shares = await app.db
      .select({
        id: listShares.id,
        role: listShares.role,
        createdAt: listShares.createdAt,
        userId: users.id,
        email: users.email,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        avatarUrl: users.avatarUrl,
      })
      .from(listShares)
      .innerJoin(users, eq(listShares.sharedWithUserId, users.id))
      .where(eq(listShares.listId, request.params.listId))

    return shares.map((s) => ({
      id: s.id,
      role: s.role,
      createdAt: s.createdAt,
      user: {
        id: s.userId,
        email: s.email,
        username: s.username,
        firstName: s.firstName,
        lastName: s.lastName,
        avatarUrl: s.avatarUrl,
      },
    }))
  })

  // POST /api/lists/:listId/shares — share a list with a user by email
  app.post<{ Params: { listId: string }; Body: { email: string; role?: string } }>(
    '/:listId/shares',
    auth,
    async (request, reply) => {
      const { email, role } = request.body ?? {}
      if (!email) return reply.badRequest('email is required')

      // Must own the list to share it
      const [list] = await app.db
        .select()
        .from(todoLists)
        .where(and(eq(todoLists.id, request.params.listId), eq(todoLists.userId, request.user.sub)))
        .limit(1)
      if (!list) return reply.notFound()

      // Find the target user
      const [targetUser] = await app.db
        .select()
        .from(users)
        .where(eq(users.email, email.trim().toLowerCase()))
        .limit(1)
      if (!targetUser) return reply.badRequest('No user found with that email')

      if (targetUser.id === request.user.sub) {
        return reply.badRequest('You cannot share a list with yourself')
      }

      // Check if already shared
      const [existing] = await app.db
        .select()
        .from(listShares)
        .where(
          and(
            eq(listShares.listId, request.params.listId),
            eq(listShares.sharedWithUserId, targetUser.id)
          )
        )
        .limit(1)
      if (existing) return reply.badRequest('List is already shared with this user')

      const [share] = await app.db
        .insert(listShares)
        .values({
          listId: request.params.listId,
          sharedWithUserId: targetUser.id,
          sharedByUserId: request.user.sub,
          role: role ?? 'editor',
        })
        .returning()

      return reply.code(201).send({
        id: share.id,
        role: share.role,
        createdAt: share.createdAt,
        user: {
          id: targetUser.id,
          email: targetUser.email,
          username: targetUser.username,
          firstName: targetUser.firstName,
          lastName: targetUser.lastName,
          avatarUrl: targetUser.avatarUrl,
        },
      })
    }
  )

  // DELETE /api/lists/:listId/shares/:shareId — remove a share
  app.delete<{ Params: { listId: string; shareId: string } }>(
    '/:listId/shares/:shareId',
    auth,
    async (request, reply) => {
      // Must own the list to remove shares
      const [list] = await app.db
        .select()
        .from(todoLists)
        .where(and(eq(todoLists.id, request.params.listId), eq(todoLists.userId, request.user.sub)))
        .limit(1)
      if (!list) return reply.notFound()

      await app.db.delete(listShares).where(eq(listShares.id, request.params.shareId))
      return reply.code(204).send()
    }
  )
}

/** Check if a user owns the list or has a share */
export async function verifyListAccess(
  db: Database,
  listId: string,
  userId: string
): Promise<boolean> {
  const [owned] = await db
    .select({ id: todoLists.id })
    .from(todoLists)
    .where(and(eq(todoLists.id, listId), eq(todoLists.userId, userId)))
    .limit(1)
  if (owned) return true

  const [shared] = await db
    .select({ id: listShares.id })
    .from(listShares)
    .where(and(eq(listShares.listId, listId), eq(listShares.sharedWithUserId, userId)))
    .limit(1)
  return !!shared
}
