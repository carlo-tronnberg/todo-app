import { FastifyPluginAsync } from 'fastify'
import { AuditService } from '../../services/audit.service'

export const auditRoutes: FastifyPluginAsync = async (app) => {
  const auditService = new AuditService(app.db)
  const auth = { onRequest: [app.authenticate] }

  // GET /api/audit?limit=100&offset=0
  app.get<{ Querystring: { limit?: string; offset?: string } }>('/', auth, async (request) => {
    const limit = Math.min(parseInt(request.query.limit ?? '100', 10) || 100, 500)
    const offset = parseInt(request.query.offset ?? '0', 10) || 0
    return auditService.findByUser(request.user.sub, limit, offset)
  })
}
