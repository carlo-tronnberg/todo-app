import { eq, and, inArray, gte, lte, sql } from 'drizzle-orm'
import { Database, todoLists, todoItems, recurrenceRules, completions, itemComments } from '../db'

export interface CreateListInput {
  title: string
  description?: string
  defaultCurrency?: string
  icon?: string
}

export interface UpdateListInput {
  title?: string
  description?: string
  defaultCurrency?: string | null
  icon?: string | null
}

export class ListsService {
  constructor(private db: Database) {}

  async findAll(userId: string) {
    const lists = await this.db.select().from(todoLists).where(eq(todoLists.userId, userId))
    if (lists.length === 0) return []

    const listIds = lists.map((l) => l.id)
    const now = new Date()
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    // Items due up to end of this month (non-archived) — includes overdue
    const itemsDueThisMonthOrBefore = await this.db
      .select()
      .from(todoItems)
      .where(
        and(
          inArray(todoItems.listId, listIds),
          eq(todoItems.isArchived, false),
          lte(todoItems.dueDate, monthEnd)
        )
      )

    const completedItemIds = await this.getCompletedItemIds(itemsDueThisMonthOrBefore)
    const upcomingByList = await this.getUpcomingByList(listIds, now)

    const uncompletedByList: Record<string, number> = {}
    for (const item of itemsDueThisMonthOrBefore) {
      if (!completedItemIds.has(item.id)) {
        uncompletedByList[item.listId] = (uncompletedByList[item.listId] ?? 0) + 1
      }
    }

    return lists.map((list) => ({
      ...list,
      uncompletedThisMonth: uncompletedByList[list.id] ?? 0,
      upcomingItems: upcomingByList[list.id] ?? [],
    }))
  }

  /**
   * Determine which items have been completed for their current due-date cycle.
   * For recurring items, only a completion whose dueDateSnapshot matches the
   * item's current dueDate counts.
   */
  private async getCompletedItemIds(
    items: { id: string; dueDate: Date | null }[]
  ): Promise<Set<string>> {
    const ids = items.map((i) => i.id)
    const result = new Set<string>()
    /* c8 ignore next */
    if (ids.length === 0) return result

    const comps = await this.db.select().from(completions).where(inArray(completions.itemId, ids))

    const dueDateByItem = new Map(items.map((i) => [i.id, i.dueDate?.getTime()]))

    for (const c of comps) {
      const itemDue = dueDateByItem.get(c.itemId)
      const snapTime = c.dueDateSnapshot?.getTime()
      if (itemDue != null && snapTime != null && snapTime === itemDue) {
        result.add(c.itemId)
      }
      if (itemDue == null) {
        result.add(c.itemId)
      }
    }
    return result
  }

  /** Get up to 3 upcoming items per list, sorted by due date. */
  private async getUpcomingByList(
    listIds: string[],
    now: Date
  ): Promise<Record<string, { id: string; title: string; dueDate: string }[]>> {
    const upcomingAll = await this.db
      .select({
        id: todoItems.id,
        listId: todoItems.listId,
        title: todoItems.title,
        dueDate: todoItems.dueDate,
      })
      .from(todoItems)
      .where(
        and(
          inArray(todoItems.listId, listIds),
          eq(todoItems.isArchived, false),
          gte(todoItems.dueDate, now)
        )
      )
      .orderBy(todoItems.dueDate)

    const result: Record<string, { id: string; title: string; dueDate: string }[]> = {}
    for (const item of upcomingAll) {
      /* c8 ignore next */
      if (!result[item.listId]) result[item.listId] = []
      if (result[item.listId].length < 3) {
        result[item.listId].push({
          id: item.id,
          title: item.title,
          dueDate: item.dueDate!.toISOString(),
        })
      }
    }
    return result
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
      .values({
        userId,
        title: input.title,
        description: input.description,
        defaultCurrency: input.defaultCurrency,
        icon: input.icon,
      })
      .returning()

    return list
  }

  async update(id: string, userId: string, input: UpdateListInput) {
    const [updated] = await this.db
      .update(todoLists)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(todoLists.id, id), eq(todoLists.userId, userId)))
      .returning()

    /* c8 ignore next */
    return updated ?? null
  }

  async delete(id: string, userId: string) {
    await this.db.delete(todoLists).where(and(eq(todoLists.id, id), eq(todoLists.userId, userId)))
  }

  async findItemsByListId(listId: string, userId: string) {
    // Verify ownership
    const list = await this.findById(listId, userId)
    if (!list) return null

    const items = await this.db
      .select()
      .from(todoItems)
      .where(and(eq(todoItems.listId, listId), eq(todoItems.isArchived, false)))

    // Attach recurrence rules in a single bulk query
    const ruleIds = items.map((i) => i.recurrenceRuleId).filter(Boolean) as string[]
    let rulesById: Record<string, typeof recurrenceRules.$inferSelect> = {}

    /* c8 ignore next */
    if (ruleIds.length > 0) {
      const rules = await this.db
        .select()
        .from(recurrenceRules)
        .where(inArray(recurrenceRules.id, ruleIds))
      rulesById = Object.fromEntries(rules.map((r) => [r.id, r]))
    }

    // Bulk-fetch comment counts
    const itemIds = items.map((i) => i.id)
    const commentCountById: Record<string, number> = {}
    if (itemIds.length > 0) {
      const counts = await this.db
        .select({
          itemId: itemComments.itemId,
          count: sql<number>`count(*)::int`,
        })
        .from(itemComments)
        .where(inArray(itemComments.itemId, itemIds))
        .groupBy(itemComments.itemId)
      for (const row of counts) {
        commentCountById[row.itemId] = row.count
      }
    }

    return items.map((item) => ({
      ...item,
      recurrenceRule: item.recurrenceRuleId ? (rulesById[item.recurrenceRuleId] ?? null) : null,
      commentCount: commentCountById[item.id] ?? 0,
    }))
  }
}
