import Fastify from 'fastify'
import sensible from '@fastify/sensible'
import { authPlugin } from './plugins/auth'
import { corsPlugin } from './plugins/cors'
import { dbPlugin } from './plugins/db'
import { authRoutes } from './routes/auth'
import { listsRoutes } from './routes/lists'
import { itemsRoutes } from './routes/items'
import { calendarRoutes } from './routes/calendar'

export async function buildApp(opts: { logger?: boolean } = {}) {
  const app = Fastify({
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

  // Health check
  app.get('/health', async () => ({
    status: 'ok',
    environment: process.env.NODE_ENV ?? 'development',
    timestamp: new Date().toISOString(),
  }))

  return app
}
