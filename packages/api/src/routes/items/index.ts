import { FastifyPluginAsync } from 'fastify'
import { ItemsService, UpdateItemInput } from '../../services/items.service'
import { RecurrenceService } from '../../services/recurrence.service'

export const itemsRoutes: FastifyPluginAsync = async (app) => {
  const itemsService = new ItemsService(app.db)
  const recurrenceService = new RecurrenceService()

  const auth = { onRequest: [app.authenticate] }

  // GET /api/items/:itemId
  app.get<{ Params: { itemId: string } }>('/:itemId', auth, async (request, reply) => {
    const item = await itemsService.findById(request.params.itemId, request.user.sub)
    if (!item) return reply.notFound()
    return item
  })

  // PATCH /api/items/:itemId
  app.patch<{ Params: { itemId: string }; Body: UpdateItemInput }>(
    '/:itemId',
    auth,
    async (request, reply) => {
      const updated = await itemsService.update(
        request.params.itemId,
        request.user.sub,
        request.body
      )
      if (!updated) return reply.notFound()
      return updated
    }
  )

  // DELETE /api/items/:itemId (soft-delete via archive)
  app.delete<{ Params: { itemId: string } }>('/:itemId', auth, async (request, reply) => {
    const result = await itemsService.archive(request.params.itemId, request.user.sub)
    if (!result) return reply.notFound()
    return reply.code(204).send()
  })

  // POST /api/items/:itemId/complete
  app.post<{ Params: { itemId: string }; Body: { note?: string } }>(
    '/:itemId/complete',
    auth,
    async (request, reply) => {
      const item = await itemsService.findById(request.params.itemId, request.user.sub)
      if (!item) return reply.notFound()

      // Record completion with timestamp and due-date snapshot
      const completion = await itemsService.complete(
        { id: item.id, dueDate: item.dueDate },
        request.body?.note
      )

      // Advance due date for recurring items
      if (item.recurrenceRule && item.recurrenceRule.type !== 'none') {
        const nextDueDate = recurrenceService.computeNextDueDate(
          item.recurrenceRule,
          item.dueDate
        )
        await itemsService.updateDueDate(item.id, nextDueDate)
      }

      return reply.code(201).send(completion)
    }
  )

  // GET /api/items/:itemId/completions
  app.get<{ Params: { itemId: string } }>(
    '/:itemId/completions',
    auth,
    async (request, reply) => {
      const completions = await itemsService.findCompletions(
        request.params.itemId,
        request.user.sub
      )
      if (completions === null) return reply.notFound()
      return completions
    }
  )
}
