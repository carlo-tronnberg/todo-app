import fp from 'fastify-plugin'
import jwt from '@fastify/jwt'
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { JwtPayload } from '../types'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: JwtPayload
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

export const authPlugin = fp(async (app: FastifyInstance) => {
  await app.register(jwt, {
    /* c8 ignore next */
    secret: process.env.JWT_SECRET ?? 'change-me-in-production',
    sign: {
      expiresIn: '15m',
    },
  })

  app.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        await request.jwtVerify()
      } catch {
        reply.unauthorized('Invalid or expired token')
      }
    }
  )
})
