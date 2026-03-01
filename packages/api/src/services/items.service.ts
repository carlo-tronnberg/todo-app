import { eq, and } from 'drizzle-orm'
import { Database, todoItems, recurrenceRules, todoLists, completions } from '../db'
import { RecurrenceRuleInput } from '../types'
import { parseDateOrNull } from '../utils/date'

export interface CreateItemInput {
  title: string
  description?: string
  dueDate?: string
  colorOverride?: string
  sortOrder?: number
  recurrenceRule?: RecurrenceRuleInput
}

export interface UpdateItemInput {
  title?: string
  description?: string
  dueDate?: string | null
  colorOverride?: string | null
  sortOrder?: number
  recurrenceRule?: RecurrenceRuleInput | null
}

export class ItemsService {
  constructor(private db: Database) {}

  async findById(id: string, userId: string) {
    const [item] = await this.db
      .select()
      .from(todoItems)
      .innerJoin(todoLists, eq(todoItems.listId, todoLists.id))
      .where(and(eq(todoItems.id, id), eq(todoLists.userId, userId)))
      .limit(1)

    if (!item) return null

    let recurrenceRule = null
    if (item.todo_items.recurrenceRuleId) {
      const [rule] = await this.db
        .select()
        .from(recurrenceRules)
        .where(eq(recurrenceRules.id, item.todo_items.recurrenceRuleId))
        .limit(1)
      /* c8 ignore next */
      recurrenceRule = rule ?? null
    }

    return { ...item.todo_items, recurrenceRule }
  }

  async create(listId: string, userId: string, input: CreateItemInput) {
    // Verify list ownership
    const [list] = await this.db
      .select()
      .from(todoLists)
      .where(and(eq(todoLists.id, listId), eq(todoLists.userId, userId)))
      .limit(1)

    if (!list) throw new Error('LIST_NOT_FOUND')

    let recurrenceRuleId: string | undefined

    if (input.recurrenceRule && input.recurrenceRule.type !== 'none') {
      const [rule] = await this.db
        .insert(recurrenceRules)
        .values({
          type: input.recurrenceRule.type,
          dayOfMonth: input.recurrenceRule.dayOfMonth,
          intervalDays: input.recurrenceRule.intervalDays,
          weekdayMask: input.recurrenceRule.weekdayMask,
          anchorDate: parseDateOrNull(input.recurrenceRule.anchorDate),
        })
        .returning()
      recurrenceRuleId = rule.id
    }

    const [item] = await this.db
      .insert(todoItems)
      .values({
        listId,
        recurrenceRuleId,
        title: input.title,
        description: input.description,
        dueDate: parseDateOrNull(input.dueDate),
        colorOverride: input.colorOverride,
        sortOrder: input.sortOrder ?? 0,
      })
      .returning()

    // Return the full item including the joined recurrenceRule so callers
    // don't need a second round-trip to get the populated rule object.
    return this.findById(item.id, userId)
  }

  async update(id: string, userId: string, input: UpdateItemInput) {
    const existing = await this.findById(id, userId)
    if (!existing) return null

    // Handle recurrence rule upsert
    let recurrenceRuleId = existing.recurrenceRuleId

    if (input.recurrenceRule !== undefined) {
      if (input.recurrenceRule === null || input.recurrenceRule.type === 'none') {
        // Remove recurrence
        recurrenceRuleId = null
        if (existing.recurrenceRuleId) {
          await this.db
            .delete(recurrenceRules)
            .where(eq(recurrenceRules.id, existing.recurrenceRuleId))
        }
      } else if (existing.recurrenceRuleId) {
        // Update existing rule
        await this.db
          .update(recurrenceRules)
          .set({
            type: input.recurrenceRule.type,
            dayOfMonth: input.recurrenceRule.dayOfMonth ?? null,
            intervalDays: input.recurrenceRule.intervalDays ?? null,
            weekdayMask: input.recurrenceRule.weekdayMask ?? null,
            anchorDate: parseDateOrNull(input.recurrenceRule.anchorDate),
          })
          .where(eq(recurrenceRules.id, existing.recurrenceRuleId))
      } else {
        // Create new rule
        const [rule] = await this.db
          .insert(recurrenceRules)
          .values({
            type: input.recurrenceRule.type,
            dayOfMonth: input.recurrenceRule.dayOfMonth,
            intervalDays: input.recurrenceRule.intervalDays,
            weekdayMask: input.recurrenceRule.weekdayMask,
            anchorDate: parseDateOrNull(input.recurrenceRule.anchorDate),
          })
          .returning()
        recurrenceRuleId = rule.id
      }
    }

    const updateData: Partial<typeof todoItems.$inferInsert> = {
      recurrenceRuleId: recurrenceRuleId ?? undefined,
      updatedAt: new Date(),
    }

    if (input.title !== undefined) updateData.title = input.title
    if (input.description !== undefined) updateData.description = input.description
    if (input.dueDate !== undefined)
      updateData.dueDate = input.dueDate ? parseDateOrNull(input.dueDate) : null
    if (input.colorOverride !== undefined) updateData.colorOverride = input.colorOverride ?? null
    if (input.sortOrder !== undefined) updateData.sortOrder = input.sortOrder

    const [updated] = await this.db
      .update(todoItems)
      .set(updateData)
      .where(eq(todoItems.id, id))
      .returning()

    /* c8 ignore next */
    if (!updated) return null

    // Return the full item including the (possibly changed) recurrenceRule.
    return this.findById(id, userId)
  }

  async archive(id: string, userId: string) {
    const existing = await this.findById(id, userId)
    if (!existing) return null

    const [updated] = await this.db
      .update(todoItems)
      .set({ isArchived: true, updatedAt: new Date() })
      .where(eq(todoItems.id, id))
      .returning()

    return updated
  }

  async complete(item: { id: string; dueDate: Date | null }, note?: string) {
    const [completion] = await this.db
      .insert(completions)
      .values({
        itemId: item.id,
        dueDateSnapshot: item.dueDate,
        note,
      })
      .returning()

    return completion
  }

  async updateDueDate(id: string, newDueDate: Date | null) {
    const [updated] = await this.db
      .update(todoItems)
      .set({ dueDate: newDueDate, updatedAt: new Date() })
      .where(eq(todoItems.id, id))
      .returning()

    return updated
  }

  async findCompletions(itemId: string, userId: string) {
    // Verify ownership first
    const item = await this.findById(itemId, userId)
    if (!item) return null

    return this.db.select().from(completions).where(eq(completions.itemId, itemId))
  }
}
