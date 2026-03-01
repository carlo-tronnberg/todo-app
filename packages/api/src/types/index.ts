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

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly_on_day' | 'custom_days'

export interface RecurrenceRuleInput {
  type: RecurrenceType
  dayOfMonth?: number
  intervalDays?: number
  weekdayMask?: number
  anchorDate?: string // ISO string
}
