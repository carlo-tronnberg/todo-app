import { eq, and, gte, lte, isNotNull, inArray, desc } from 'drizzle-orm'
import { Database, todoItems, todoLists, completions, recurrenceRules } from '../db'
import { generateIcs } from '../utils/ics'

export class CalendarService {
  constructor(private db: Database) {}

  /** Upcoming items (by dueDate) in range */
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

  /**
   * Completions (by dueDateSnapshot) in range, with enough item info for display
   * and for determining whether undo is the latest (so dueDate can be reverted).
   */
  async getCompletionsInRange(userId: string, from: Date, to: Date) {
    const rows = await this.db
      .select({
        completion: completions,
        itemTitle: todoItems.title,
        itemDescription: todoItems.description,
        itemRecurrenceRuleId: todoItems.recurrenceRuleId,
        listTitle: todoLists.title,
        listId: todoLists.id,
      })
      .from(completions)
      .innerJoin(todoItems, eq(completions.itemId, todoItems.id))
      .innerJoin(todoLists, eq(todoItems.listId, todoLists.id))
      .where(
        and(
          eq(todoLists.userId, userId),
          isNotNull(completions.dueDateSnapshot),
          gte(completions.dueDateSnapshot, from),
          lte(completions.dueDateSnapshot, to)
        )
      )
      .orderBy(desc(completions.completedAt))

    // Determine the latest completion per item (ordered desc so first = latest)
    const latestByItem = new Set<string>()
    const seenItems = new Set<string>()
    for (const row of rows) {
      const itemId = row.completion.itemId
      if (!seenItems.has(itemId)) {
        latestByItem.add(row.completion.id)
        seenItems.add(itemId)
      }
    }

    return rows.map((r) => ({
      id: r.completion.id,
      itemId: r.completion.itemId,
      completedAt: r.completion.completedAt,
      dueDateSnapshot: r.completion.dueDateSnapshot,
      note: r.completion.note,
      itemTitle: r.itemTitle,
      itemDescription: r.itemDescription,
      listId: r.listId,
      listTitle: r.listTitle,
      /** True when this is the most recent completion — undo can safely revert dueDate */
      isLatestCompletion: latestByItem.has(r.completion.id),
    }))
  }

  /** Export all upcoming (non-archived, has dueDate) items as ICS string */
  async exportIcs(userId: string): Promise<string> {
    const rows = await this.db
      .select({ item: todoItems })
      .from(todoItems)
      .innerJoin(todoLists, eq(todoItems.listId, todoLists.id))
      .where(
        and(
          eq(todoLists.userId, userId),
          eq(todoItems.isArchived, false),
          isNotNull(todoItems.dueDate)
        )
      )

    const ruleIds = rows.map((r) => r.item.recurrenceRuleId).filter(Boolean) as string[]
    let rulesById: Record<string, typeof recurrenceRules.$inferSelect> = {}

    if (ruleIds.length > 0) {
      const rules = await this.db
        .select()
        .from(recurrenceRules)
        .where(inArray(recurrenceRules.id, ruleIds))
      rulesById = Object.fromEntries(rules.map((r) => [r.id, r]))
    }

    const icsItems = rows.map((r) => ({
      id: r.item.id,
      title: r.item.title,
      description: r.item.description,
      dueDate: r.item.dueDate!,
      recurrenceRule: r.item.recurrenceRuleId ? (rulesById[r.item.recurrenceRuleId] ?? null) : null,
    }))

    return generateIcs(icsItems)
  }
}
