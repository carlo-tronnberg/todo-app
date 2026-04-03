import { FastifyRequest } from 'fastify'

export interface JwtPayload {
  sub: string // user id
  email: string
  username: string
  iat?: number
  exp?: number
}

export interface AuthenticatedRequest extends FastifyRequest {
  user: JwtPayload
}

export type RecurrenceType =
  | 'none'
  | 'daily'
  | 'weekly'
  | 'monthly_on_day'
  | 'custom_days'
  | 'yearly'
  | 'weekly_on_day'

export interface RecurrenceRuleInput {
  type: RecurrenceType
  dayOfMonth?: number
  intervalDays?: number
  weekdayMask?: number
  interval?: number // multiplier: every N weeks/months/years (default 1)
  anchorDate?: string // ISO string
}
