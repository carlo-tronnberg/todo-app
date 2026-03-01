import { eq, and, gte, lte, isNotNull } from 'drizzle-orm'
import { Database, todoItems, todoLists } from '../db'

export class CalendarService {
  constructor(private db: Database) {}

  async getItemsInRange(userId: string, from: Date, to: Date) {
    const rows = await this.db
      .select({
        item: todoItems,
        listTitle: todoLists.title,
        listId: todoLists.id,
      })
      .from(todoItems)
      .innerJoin(todoLists, eq(todoItems.listId, todoLists.id))
      .where(
        and(
          eq(todoLists.userId, userId),
          eq(todoItems.isArchived, false),
          isNotNull(todoItems.dueDate),
          gte(todoItems.dueDate, from),
          lte(todoItems.dueDate, to)
        )
      )

    return rows.map((r) => ({
      ...r.item,
      listTitle: r.listTitle,
      listId: r.listId,
    }))
  }
}
