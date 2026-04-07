import { FastifyPluginAsync } from 'fastify'
import { ItemsService, UpdateItemInput } from '../../services/items.service'
import { RecurrenceService } from '../../services/recurrence.service'
import { CommentsService } from '../../services/comments.service'
import { AuditService } from '../../services/audit.service'
import { getShareRole, canWrite } from '../shares'

export const itemsRoutes: FastifyPluginAsync = async (app) => {
  const itemsService = new ItemsService(app.db)
  const recurrenceService = new RecurrenceService()
  const commentsService = new CommentsService(app.db)
  const auditService = new AuditService(app.db)

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
      const item = await itemsService.findById(request.params.itemId, request.user.sub)
      if (!item) return reply.notFound()
      const role = await getShareRole(app.db, item.listId, request.user.sub)
      if (!canWrite(role)) return reply.forbidden('Viewer access is read-only')
      const updated = await itemsService.update(
        request.params.itemId,
        request.user.sub,
        request.body
      )
      if (!updated) return reply.notFound()
      auditService
        .log(
          request.user.sub,
          'item.update',
          'todo_item',
          updated.id,
          `Updated item "${updated.title}"`
        )
        .catch(() => {})
      return updated
    }
  )

  // DELETE /api/items/:itemId (soft-delete via archive)
  app.delete<{ Params: { itemId: string } }>('/:itemId', auth, async (request, reply) => {
    const item = await itemsService.findById(request.params.itemId, request.user.sub)
    if (!item) return reply.notFound()
    const role = await getShareRole(app.db, item.listId, request.user.sub)
    if (!canWrite(role)) return reply.forbidden('Viewer access is read-only')
    const result = await itemsService.archive(request.params.itemId, request.user.sub)
    if (!result) return reply.notFound()
    auditService
      .log(
        request.user.sub,
        'item.archive',
        'todo_item',
        request.params.itemId,
        `Archived item "${result.title}"`
      )
      .catch(() => {})
    return reply.code(204).send()
  })

  // POST /api/items/:itemId/complete
  app.post<{
    Params: { itemId: string }
    Body: { note?: string; amount?: string; currency?: string; transactionType?: string }
  }>('/:itemId/complete', auth, async (request, reply) => {
    const item = await itemsService.findById(request.params.itemId, request.user.sub)
    if (!item) return reply.notFound()
    const role = await getShareRole(app.db, item.listId, request.user.sub)
    if (!canWrite(role)) return reply.forbidden('Viewer access is read-only')

    const { note, amount, currency, transactionType } = request.body ?? {}

    // Record completion with timestamp and due-date snapshot
    const completion = await itemsService.complete(
      { id: item.id, dueDate: item.dueDate },
      { note, amount, currency, transactionType }
    )

    // Advance due date for recurring items
    if (item.recurrenceRule && item.recurrenceRule.type !== 'none') {
      const nextDueDate = recurrenceService.computeNextDueDate(item.recurrenceRule, item.dueDate)
      await itemsService.updateDueDate(item.id, nextDueDate)
    }

    auditService
      .log(
        request.user.sub,
        'item.complete',
        'todo_item',
        item.id,
        `Completed item "${item.title}"`
      )
      .catch(() => {})
    return reply.code(201).send(completion)
  })

  // POST /api/items/:itemId/duplicate
  app.post<{ Params: { itemId: string } }>('/:itemId/duplicate', auth, async (request, reply) => {
    const item = await itemsService.findById(request.params.itemId, request.user.sub)
    if (!item) return reply.notFound()
    const role = await getShareRole(app.db, item.listId, request.user.sub)
    if (!canWrite(role)) return reply.forbidden('Viewer access is read-only')
    const copy = await itemsService.duplicate(request.params.itemId, request.user.sub)
    if (!copy) return reply.notFound()
    auditService
      .log(
        request.user.sub,
        'item.duplicate',
        'todo_item',
        copy.id,
        `Duplicated item "${copy.title}"`
      )
      .catch(() => {})
    return reply.code(201).send(copy)
  })

  // GET /api/items/:itemId/completions
  app.get<{ Params: { itemId: string } }>('/:itemId/completions', auth, async (request, reply) => {
    const completions = await itemsService.findCompletions(request.params.itemId, request.user.sub)
    if (completions === null) return reply.notFound()
    return completions
  })

  // GET /api/items/:itemId/comments
  app.get<{ Params: { itemId: string } }>('/:itemId/comments', auth, async (request, reply) => {
    const comments = await commentsService.findByItemId(request.params.itemId, request.user.sub)
    if (comments === null) return reply.notFound()
    return comments
  })

  // POST /api/items/:itemId/comments
  app.post<{ Params: { itemId: string }; Body: { content: string } }>(
    '/:itemId/comments',
    auth,
    async (request, reply) => {
      const { content } = request.body
      if (!content?.trim()) return reply.badRequest('content is required')
      const item = await itemsService.findById(request.params.itemId, request.user.sub)
      if (!item) return reply.notFound()
      const role = await getShareRole(app.db, item.listId, request.user.sub)
      if (!canWrite(role)) return reply.forbidden('Viewer access is read-only')
      const comment = await commentsService.create(request.params.itemId, request.user.sub, content)
      if (!comment) return reply.notFound()
      return reply.code(201).send(comment)
    }
  )
}
