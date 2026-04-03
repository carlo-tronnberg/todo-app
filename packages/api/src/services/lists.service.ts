import { eq, and, inArray, gte, lte } from 'drizzle-orm'
import { Database, todoLists, todoItems, recurrenceRules, completions } from '../db'

export interface CreateListInput {
  title: string
  description?: string
  defaultCurrency?: string
}

export interface UpdateListInput {
  title?: string
  description?: string
  defaultCurrency?: string | null
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

    // Check which items have been completed for their CURRENT due date.
    // Recurring items have many completions; only the one matching the
    // current dueDate (via dueDateSnapshot) counts.
    const itemIdsDue = itemsDueThisMonthOrBefore.map((i) => i.id)
    const completedItemIds = new Set<string>()
    /* c8 ignore next */
    if (itemIdsDue.length > 0) {
      const comps = await this.db
        .select()
        .from(completions)
        .where(inArray(completions.itemId, itemIdsDue))

      // Build a map of item dueDate for comparison
      const dueDateByItem = new Map(
        itemsDueThisMonthOrBefore.map((i) => [i.id, i.dueDate?.getTime()])
      )

      for (const c of comps) {
        const itemDue = dueDateByItem.get(c.itemId)
        const snapTime = c.dueDateSnapshot?.getTime()
        // Match: completion's snapshot matches the item's current due date
        if (itemDue != null && snapTime != null && snapTime === itemDue) {
          completedItemIds.add(c.itemId)
        }
        // Non-recurring items without a due date: any completion means done
        if (itemDue == null) {
          completedItemIds.add(c.itemId)
        }
      }
    }

    // Upcoming items: due >= now, sorted ASC — take first 3 per list in memory
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

    // Aggregate per list
    const uncompletedByList: Record<string, number> = {}
    for (const item of itemsDueThisMonthOrBefore) {
      if (!completedItemIds.has(item.id)) {
        uncompletedByList[item.listId] = (uncompletedByList[item.listId] ?? 0) + 1
      }
    }

    const upcomingByList: Record<string, { id: string; title: string; dueDate: string }[]> = {}
    for (const item of upcomingAll) {
      /* c8 ignore next */
      if (!upcomingByList[item.listId]) upcomingByList[item.listId] = []
      if (upcomingByList[item.listId].length < 3) {
        upcomingByList[item.listId].push({
          id: item.id,
          title: item.title,
          dueDate: item.dueDate!.toISOString(),
        })
      }
    }

    return lists.map((list) => ({
      ...list,
      uncompletedThisMonth: uncompletedByList[list.id] ?? 0,
      upcomingItems: upcomingByList[list.id] ?? [],
    }))
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

    return items.map((item) => ({
      ...item,
      recurrenceRule: item.recurrenceRuleId ? (rulesById[item.recurrenceRuleId] ?? null) : null,
    }))
  }
}
