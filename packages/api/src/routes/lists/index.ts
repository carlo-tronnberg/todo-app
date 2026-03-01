import { FastifyPluginAsync } from 'fastify'
import { ListsService } from '../../services/lists.service'
import { ItemsService } from '../../services/items.service'
import { CreateItemInput } from '../../services/items.service'

export const listsRoutes: FastifyPluginAsync = async (app) => {
  const listsService = new ListsService(app.db)
  const itemsService = new ItemsService(app.db)

  const auth = { onRequest: [app.authenticate] }

  // GET /api/lists
  app.get('/', auth, async (request) => {
    return listsService.findAll(request.user.sub)
  })

  // POST /api/lists
  app.post<{ Body: { title: string; description?: string } }>('/', auth, async (request, reply) => {
    if (!request.body.title) return reply.badRequest('title is required')
    const list = await listsService.create(request.user.sub, request.body)
    return reply.code(201).send(list)
  })

  // GET /api/lists/:listId
  app.get<{ Params: { listId: string } }>('/:listId', auth, async (request, reply) => {
    const list = await listsService.findById(request.params.listId, request.user.sub)
    if (!list) return reply.notFound()
    return list
  })

  // PATCH /api/lists/:listId
  app.patch<{
    Params: { listId: string }
    Body: { title?: string; description?: string }
  }>('/:listId', auth, async (request, reply) => {
    const updated = await listsService.update(
      request.params.listId,
      request.user.sub,
      request.body
    )
    if (!updated) return reply.notFound()
    return updated
  })

  // DELETE /api/lists/:listId
  app.delete<{ Params: { listId: string } }>('/:listId', auth, async (request, reply) => {
    const list = await listsService.findById(request.params.listId, request.user.sub)
    if (!list) return reply.notFound()
    await listsService.delete(request.params.listId, request.user.sub)
    return reply.code(204).send()
  })

  // GET /api/lists/:listId/items
  app.get<{ Params: { listId: string } }>('/:listId/items', auth, async (request, reply) => {
    const items = await listsService.findItemsByListId(request.params.listId, request.user.sub)
    if (items === null) return reply.notFound()
    return items
  })

  // POST /api/lists/:listId/items
  app.post<{ Params: { listId: string }; Body: CreateItemInput }>(
    '/:listId/items',
    auth,
    async (request, reply) => {
      if (!request.body.title) return reply.badRequest('title is required')
      try {
        const item = await itemsService.create(
          request.params.listId,
          request.user.sub,
          request.body
        )
        return reply.code(201).send(item)
      } catch (err) {
        const msg = err instanceof Error ? err.message : ''
        if (msg === 'LIST_NOT_FOUND') return reply.notFound()
        throw err
      }
    }
  )
}
