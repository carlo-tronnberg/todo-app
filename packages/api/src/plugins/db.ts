import fp from 'fastify-plugin'
import { FastifyInstance } from 'fastify'
import { db, Database } from '../db'

declare module 'fastify' {
  interface FastifyInstance {
    db: Database
  }
}

export const dbPlugin = fp(async (app: FastifyInstance) => {
  app.decorate('db', db)
})
