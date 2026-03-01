import { eq, and } from 'drizzle-orm'
import { Database, todoLists, todoItems } from '../db'

export interface CreateListInput {
  title: string
  description?: string
}

export interface UpdateListInput {
  title?: string
  description?: string
}

export class ListsService {
  constructor(private db: Database) {}

  async findAll(userId: string) {
    return this.db.select().from(todoLists).where(eq(todoLists.userId, userId))
  }

  async findById(id: string, userId: string) {
    const [list] = await this.db
      .select()
      .from(todoLists)
      .where(and(eq(todoLists.id, id), eq(todoLists.userId, userId)))
      .limit(1)

    return list ?? null
  }

  async create(userId: string, input: CreateListInput) {
    const [list] = await this.db
      .insert(todoLists)
      .values({ userId, title: input.title, description: input.description })
      .returning()

    return list
  }

  async update(id: string, userId: string, input: UpdateListInput) {
    const [updated] = await this.db
      .update(todoLists)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(todoLists.id, id), eq(todoLists.userId, userId)))
      .returning()

    return updated ?? null
  }

  async delete(id: string, userId: string) {
    await this.db
      .delete(todoLists)
      .where(and(eq(todoLists.id, id), eq(todoLists.userId, userId)))
  }

  async findItemsByListId(listId: string, userId: string) {
    // Verify ownership
    const list = await this.findById(listId, userId)
    if (!list) return null

    return this.db
      .select()
      .from(todoItems)
      .where(and(eq(todoItems.listId, listId), eq(todoItems.isArchived, false)))
  }
}
