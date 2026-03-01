import { eq, and } from 'drizzle-orm'
import { Database, itemComments, todoItems, todoLists } from '../db'

export class CommentsService {
  constructor(private db: Database) {}

  async findByItemId(itemId: string, userId: string) {
    // Verify item ownership first
    const [item] = await this.db
      .select({ id: todoItems.id })
      .from(todoItems)
      .innerJoin(todoLists, eq(todoItems.listId, todoLists.id))
      .where(and(eq(todoItems.id, itemId), eq(todoLists.userId, userId)))
      .limit(1)

    if (!item) return null

    return this.db.select().from(itemComments).where(eq(itemComments.itemId, itemId))
  }

  async create(itemId: string, userId: string, content: string) {
    // Verify item ownership first
    const [item] = await this.db
      .select({ id: todoItems.id })
      .from(todoItems)
      .innerJoin(todoLists, eq(todoItems.listId, todoLists.id))
      .where(and(eq(todoItems.id, itemId), eq(todoLists.userId, userId)))
      .limit(1)

    if (!item) return null

    const [comment] = await this.db
      .insert(itemComments)
      .values({ itemId, userId, content })
      .returning()

    return comment
  }

  async delete(commentId: string, userId: string) {
    const [existing] = await this.db
      .select()
      .from(itemComments)
      .where(and(eq(itemComments.id, commentId), eq(itemComments.userId, userId)))
      .limit(1)

    if (!existing) return false

    await this.db.delete(itemComments).where(eq(itemComments.id, commentId))
    return true
  }
}
