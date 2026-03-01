import { FastifyPluginAsync } from 'fastify'
import { CalendarService } from '../../services/calendar.service'
import { parseISO, isValid, startOfDay, endOfDay } from 'date-fns'

export const calendarRoutes: FastifyPluginAsync = async (app) => {
  const calendarService = new CalendarService(app.db)

  // GET /api/calendar?from=2024-01-01&to=2024-01-31
  app.get<{
    Querystring: { from: string; to: string }
  }>('/', { onRequest: [app.authenticate] }, async (request, reply) => {
    const { from: fromStr, to: toStr } = request.query

    if (!fromStr || !toStr) {
      return reply.badRequest('from and to query parameters are required (ISO date strings)')
    }

    const from = parseISO(fromStr)
    const to = parseISO(toStr)

    if (!isValid(from) || !isValid(to)) {
      return reply.badRequest('from and to must be valid ISO date strings')
    }

    if (from > to) {
      return reply.badRequest('from must be before or equal to to')
    }

    const items = await calendarService.getItemsInRange(
      request.user.sub,
      startOfDay(from),
      endOfDay(to)
    )

    return items
  })
}
