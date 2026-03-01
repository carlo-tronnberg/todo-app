import { FastifyPluginAsync } from 'fastify'
import { CalendarService } from '../../services/calendar.service'
import { parseISO, isValid, startOfDay, endOfDay } from 'date-fns'

export const calendarRoutes: FastifyPluginAsync = async (app) => {
  const calendarService = new CalendarService(app.db)

  /**
   * GET /api/calendar?from=2024-01-01&to=2024-01-31
   * Returns upcoming items AND completions in the given date range.
   */
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

    const userId = request.user.sub
    const rangeFrom = startOfDay(from)
    const rangeTo = endOfDay(to)

    const [items, completions] = await Promise.all([
      calendarService.getItemsInRange(userId, rangeFrom, rangeTo),
      calendarService.getCompletionsInRange(userId, rangeFrom, rangeTo),
    ])

    return { items, completions }
  })

  /**
   * GET /api/calendar/ical?token=<jwt>
   * Returns an iCalendar (.ics) file for all non-archived items with a due date.
   * Uses a JWT query-param so calendar apps (e.g. Google Calendar) can subscribe
   * via URL without needing custom headers.
   */
  app.get<{ Querystring: { token?: string } }>(
    '/ical',
    // No app.authenticate here – auth is done via ?token= query param
    async (request, reply) => {
      const { token } = request.query

      if (!token) {
        reply.code(401)
        return reply.send({ error: 'Missing token' })
      }

      let userId: string
      try {
        const payload = app.jwt.verify<{ sub: string }>(token)
        userId = payload.sub
      } catch {
        reply.code(401)
        return reply.send({ error: 'Invalid or expired token' })
      }

      const ics = await calendarService.exportIcs(userId)

      reply.header('Content-Type', 'text/calendar; charset=utf-8')
      reply.header('Content-Disposition', 'attachment; filename="todo-tracker.ics"')
      reply.header('Cache-Control', 'no-store')
      return reply.send(ics)
    }
  )
}
