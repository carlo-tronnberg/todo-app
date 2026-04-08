import { FastifyPluginAsync } from 'fastify'
import { ListsService } from '../../services/lists.service'
import { ItemsService } from '../../services/items.service'
import { CreateItemInput } from '../../services/items.service'
import { AuditService } from '../../services/audit.service'
import { getShareRole, canWrite } from '../shares'

export const listsRoutes: FastifyPluginAsync = async (app) => {
  const listsService = new ListsService(app.db)
  const itemsService = new ItemsService(app.db)
  const auditService = new AuditService(app.db)

  const auth = { onRequest: [app.authenticate] }

  // GET /api/lists
  app.get('/', auth, async (request) => {
    return listsService.findAll(request.user.sub)
  })

  // POST /api/lists
  app.post<{ Body: { title: string; description?: string } }>('/', auth, async (request, reply) => {
    if (!request.body.title) return reply.badRequest('title is required')
    const list = await listsService.create(request.user.sub, request.body)
    auditService
      .log(request.user.sub, 'list.create', 'todo_list', list.id, `Created list "${list.title}"`)
      .catch(() => {})
    return reply.code(201).send(list)
  })

  // GET /api/lists/:listId
  app.get<{ Params: { listId: string } }>('/:listId', auth, async (request, reply) => {
    const list = await listsService.findById(request.params.listId, request.user.sub)
    if (!list) return reply.notFound()
    return list
  })

  // PATCH /api/lists/:listId — owner/editor/admin only
  app.patch<{
    Params: { listId: string }
    Body: { title?: string; description?: string }
  }>('/:listId', auth, async (request, reply) => {
    const role = await getShareRole(app.db, request.params.listId, request.user.sub)
    if (!role) return reply.notFound()
    if (!canWrite(role)) return reply.forbidden('Viewer access is read-only')
    const updated = await listsService.update(request.params.listId, request.body)
    if (!updated) return reply.notFound()
    auditService
      .log(
        request.user.sub,
        'list.update',
        'todo_list',
        updated.id,
        `Updated list "${updated.title}"`
      )
      .catch(() => {})
    return updated
  })

  // DELETE /api/lists/:listId — owner only
  app.delete<{ Params: { listId: string } }>('/:listId', auth, async (request, reply) => {
    const role = await getShareRole(app.db, request.params.listId, request.user.sub)
    if (!role) return reply.notFound()
    if (role !== 'owner') return reply.forbidden('Only the list owner can delete it')
    const list = await listsService.findById(request.params.listId, request.user.sub)
    if (!list) return reply.notFound()
    await listsService.delete(request.params.listId, request.user.sub)
    auditService
      .log(request.user.sub, 'list.delete', 'todo_list', list.id, `Deleted list "${list.title}"`)
      .catch(() => {})
    return reply.code(204).send()
  })

  // GET /api/lists/:listId/items
  app.get<{ Params: { listId: string } }>('/:listId/items', auth, async (request, reply) => {
    const items = await listsService.findItemsByListId(request.params.listId, request.user.sub)
    /* c8 ignore next */
    if (items === null) return reply.notFound()
    return items
  })

  // POST /api/lists/:listId/items
  app.post<{ Params: { listId: string }; Body: CreateItemInput }>(
    '/:listId/items',
    auth,
    async (request, reply) => {
      if (!request.body.title) return reply.badRequest('title is required')
      const role = await getShareRole(app.db, request.params.listId, request.user.sub)
      if (!role) return reply.notFound()
      if (!canWrite(role)) return reply.forbidden('Viewer access is read-only')
      try {
        const item = await itemsService.create(
          request.params.listId,
          request.user.sub,
          request.body
        )
        auditService
          .log(
            request.user.sub,
            'item.create',
            'todo_item',
            item!.id,
            `Created item "${item!.title}"`
          )
          .catch(() => {})
        return reply.code(201).send(item)
      } catch (err) {
        /* c8 ignore next */
        const msg = err instanceof Error ? err.message : ''
        /* c8 ignore next */
        if (msg === 'LIST_NOT_FOUND') return reply.notFound()
        /* c8 ignore next 2 */
        throw err
      }
    }
  )
}
