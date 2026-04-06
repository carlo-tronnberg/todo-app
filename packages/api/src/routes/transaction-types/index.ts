import { FastifyPluginAsync } from 'fastify'
import { eq, asc } from 'drizzle-orm'
import { transactionTypes } from '../../db'

const DEFAULT_TYPES = ['Autogiro', 'Bank card', 'Bank transfer', 'Manual', 'Swish']

export const transactionTypeRoutes: FastifyPluginAsync = async (app) => {
  const auth = { onRequest: [app.authenticate] }

  // GET /api/transaction-types — list user's transaction types (alphabetical)
  app.get('/', auth, async (request) => {
    const types = await app.db
      .select()
      .from(transactionTypes)
      .where(eq(transactionTypes.userId, request.user.sub))
      .orderBy(asc(transactionTypes.name))

    // Seed defaults on first access
    if (types.length === 0) {
      const seeded = await app.db
        .insert(transactionTypes)
        .values(DEFAULT_TYPES.map((name) => ({ userId: request.user.sub, name })))
        .returning()
      return seeded.sort((a, b) => a.name.localeCompare(b.name))
    }

    return types
  })

  // POST /api/transaction-types — add a new type
  app.post<{ Body: { name: string } }>('/', auth, async (request, reply) => {
    const name = request.body?.name?.trim()
    if (!name) return reply.badRequest('name is required')

    const [created] = await app.db
      .insert(transactionTypes)
      .values({ userId: request.user.sub, name })
      .returning()

    return reply.code(201).send(created)
  })

  // DELETE /api/transaction-types/:id
  app.delete<{ Params: { id: string } }>('/:id', auth, async (request, reply) => {
    await app.db.delete(transactionTypes).where(eq(transactionTypes.id, request.params.id))

    return reply.code(204).send()
  })
}
