import { FastifyPluginAsync } from 'fastify'
import { CommentsService } from '../../services/comments.service'

export const commentsRoutes: FastifyPluginAsync = async (app) => {
  const commentsService = new CommentsService(app.db)
  const auth = { onRequest: [app.authenticate] }

  // DELETE /api/comments/:commentId
  app.delete<{ Params: { commentId: string } }>('/:commentId', auth, async (request, reply) => {
    const deleted = await commentsService.delete(request.params.commentId, request.user.sub)
    if (!deleted) return reply.notFound()
    return reply.code(204).send()
  })
}
