import Fastify from 'fastify'
import sensible from '@fastify/sensible'
import { authPlugin } from './plugins/auth'
import { corsPlugin } from './plugins/cors'
import { dbPlugin } from './plugins/db'
import { authRoutes } from './routes/auth'
import { listsRoutes } from './routes/lists'
import { itemsRoutes } from './routes/items'
import { calendarRoutes } from './routes/calendar'
import { completionsRoutes } from './routes/completions'
import { commentsRoutes } from './routes/comments'
import { auditRoutes } from './routes/audit'
import { backupRoutes } from './routes/backup'

export async function buildApp(opts: { logger?: boolean } = {}) {
  const app = Fastify({
    /* c8 ignore next */
    logger: opts.logger ?? process.env.NODE_ENV !== 'test',
  })

  // Core plugins
  await app.register(sensible)
  await app.register(corsPlugin)
  await app.register(authPlugin)
  await app.register(dbPlugin)

  // Feature routes
  await app.register(authRoutes, { prefix: '/api/auth' })
  await app.register(listsRoutes, { prefix: '/api/lists' })
  await app.register(itemsRoutes, { prefix: '/api/items' })
  await app.register(calendarRoutes, { prefix: '/api/calendar' })
  await app.register(completionsRoutes, { prefix: '/api/completions' })
  await app.register(commentsRoutes, { prefix: '/api/comments' })
  await app.register(auditRoutes, { prefix: '/api/audit' })
  await app.register(backupRoutes, { prefix: '/api/backup' })

  // Health check
  app.get('/health', async () => ({
    status: 'ok',
    /* c8 ignore next */
    environment: process.env.NODE_ENV ?? 'development',
    timestamp: new Date().toISOString(),
  }))

  return app
}
