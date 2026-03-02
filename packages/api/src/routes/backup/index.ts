import { FastifyPluginAsync } from 'fastify'
import { BackupService, BackupData } from '../../services/backup.service'

export const backupRoutes: FastifyPluginAsync = async (app) => {
  const backupService = new BackupService(app.db)
  const auth = { onRequest: [app.authenticate] }

  // GET /api/backup — download full data export as JSON
  app.get('/', auth, async (request, reply) => {
    const data = await backupService.export(request.user.sub)
    const filename = `todo-backup-${new Date().toISOString().substring(0, 10)}.json`
    reply.header('Content-Disposition', `attachment; filename="${filename}"`)
    reply.header('Content-Type', 'application/json')
    return data
  })

  // POST /api/restore — import a previously exported backup
  app.post<{ Body: BackupData }>('/restore', auth, async (request, reply) => {
    const body = request.body
    if (!body || body.version !== 1 || !Array.isArray(body.lists)) {
      return reply.badRequest('Invalid backup format: expected { version: 1, lists: [...] }')
    }
    try {
      const result = await backupService.import(request.user.sub, body)
      return reply.code(201).send(result)
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg === 'UNSUPPORTED_VERSION') return reply.badRequest('Unsupported backup version')
      throw err
    }
  })
}
