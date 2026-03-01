import { eq, desc } from 'drizzle-orm'
import { Database, auditLogs } from '../db'

export class AuditService {
  constructor(private db: Database) {}

  async log(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    summary?: string
  ) {
    await this.db.insert(auditLogs).values({ userId, action, entityType, entityId, summary })
  }

  async findByUser(userId: string, limit = 100, offset = 0) {
    return this.db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset)
  }
}
