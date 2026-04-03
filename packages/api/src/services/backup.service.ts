import { inArray, eq } from 'drizzle-orm'
import {
  Database,
  todoLists,
  todoItems,
  recurrenceRules,
  completions,
  itemComments,
  auditLogs,
} from '../db'
import type { RecurrenceType } from '../types'

// ── Backup format (version 1) ─────────────────────────────────────────────────

interface BackupRecurrenceRule {
  type: RecurrenceType
  dayOfMonth: number | null
  intervalDays: number | null
  weekdayMask: number | null
  interval: number
  anchorDate: string | null
}

interface BackupCompletion {
  completedAt: string
  dueDateSnapshot: string | null
  note: string | null
  amount: string | null
  currency: string | null
}

interface BackupComment {
  content: string
  createdAt: string
}

interface BackupItem {
  title: string
  description: string | null
  startDate: string | null
  startTime: string | null
  endTime: string | null
  dueDate: string | null
  amount: string | null
  currency: string | null
  colorOverride: string | null
  isArchived: boolean
  sortOrder: number
  recurrenceRule: BackupRecurrenceRule | null
  completions: BackupCompletion[]
  comments: BackupComment[]
}

interface BackupList {
  title: string
  description: string | null
  defaultCurrency: string | null
  items: BackupItem[]
}

interface BackupAuditLog {
  action: string
  entityType: string
  entityId: string
  summary: string | null
  createdAt: string
}

export interface BackupData {
  version: 1
  exportedAt: string
  lists: BackupList[]
  auditLogs?: BackupAuditLog[]
}

// ── Service ───────────────────────────────────────────────────────────────────

export class BackupService {
  constructor(private db: Database) {}

  async export(userId: string): Promise<BackupData> {
    const [lists, logs] = await Promise.all([
      this.db.select().from(todoLists).where(eq(todoLists.userId, userId)),
      this.db.select().from(auditLogs).where(eq(auditLogs.userId, userId)),
    ])

    if (lists.length === 0) {
      return {
        version: 1,
        exportedAt: new Date().toISOString(),
        lists: [],
        auditLogs: logs.map((l) => ({
          action: l.action,
          entityType: l.entityType,
          entityId: l.entityId,
          summary: l.summary,
          createdAt: l.createdAt.toISOString(),
        })),
      }
    }

    const listIds = lists.map((l) => l.id)
    const items = await this.db.select().from(todoItems).where(inArray(todoItems.listId, listIds))

    const itemIds = items.map((i) => i.id)
    const ruleIds = items.filter((i) => i.recurrenceRuleId).map((i) => i.recurrenceRuleId!)

    const [rules, comps, comments] = await Promise.all([
      ruleIds.length > 0
        ? this.db.select().from(recurrenceRules).where(inArray(recurrenceRules.id, ruleIds))
        : [],
      itemIds.length > 0
        ? this.db.select().from(completions).where(inArray(completions.itemId, itemIds))
        : [],
      itemIds.length > 0
        ? this.db.select().from(itemComments).where(inArray(itemComments.itemId, itemIds))
        : [],
    ])

    const rulesById = new Map(rules.map((r) => [r.id, r]))

    const compsByItem = new Map<string, typeof comps>()
    for (const c of comps) {
      const arr = compsByItem.get(c.itemId) ?? []
      arr.push(c)
      compsByItem.set(c.itemId, arr)
    }

    const commentsByItem = new Map<string, typeof comments>()
    for (const c of comments) {
      const arr = commentsByItem.get(c.itemId) ?? []
      arr.push(c)
      commentsByItem.set(c.itemId, arr)
    }

    const itemsByList = new Map<string, typeof items>()
    for (const item of items) {
      const arr = itemsByList.get(item.listId) ?? []
      arr.push(item)
      itemsByList.set(item.listId, arr)
    }

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      lists: lists.map((list) => ({
        title: list.title,
        description: list.description,
        defaultCurrency: list.defaultCurrency,
        items: (itemsByList.get(list.id) ?? []).map((item) => ({
          title: item.title,
          description: item.description,
          startDate: item.startDate?.toISOString() ?? null,
          startTime: item.startTime,
          endTime: item.endTime,
          dueDate: item.dueDate?.toISOString() ?? null,
          amount: item.amount,
          currency: item.currency,
          colorOverride: item.colorOverride,
          isArchived: item.isArchived,
          sortOrder: item.sortOrder,
          recurrenceRule: item.recurrenceRuleId
            ? (() => {
                const rule = rulesById.get(item.recurrenceRuleId!)
                if (!rule) return null
                return {
                  type: rule.type,
                  dayOfMonth: rule.dayOfMonth,
                  intervalDays: rule.intervalDays,
                  weekdayMask: rule.weekdayMask,
                  interval: rule.interval ?? 1,
                  anchorDate: rule.anchorDate?.toISOString() ?? null,
                }
              })()
            : null,
          completions: (compsByItem.get(item.id) ?? []).map((c) => ({
            completedAt: c.completedAt.toISOString(),
            dueDateSnapshot: c.dueDateSnapshot?.toISOString() ?? null,
            note: c.note,
            amount: c.amount,
            currency: c.currency,
          })),
          comments: (commentsByItem.get(item.id) ?? []).map((c) => ({
            content: c.content,
            createdAt: c.createdAt.toISOString(),
          })),
        })),
      })),
      auditLogs: logs.map((l) => ({
        action: l.action,
        entityType: l.entityType,
        entityId: l.entityId,
        summary: l.summary,
        createdAt: l.createdAt.toISOString(),
      })),
    }
  }

  async import(userId: string, data: BackupData): Promise<{ lists: number; items: number }> {
    if (data.version !== 1) throw new Error('UNSUPPORTED_VERSION')

    let listCount = 0
    let itemCount = 0

    await this.db.transaction(async (tx) => {
      for (const listData of data.lists ?? []) {
        const [list] = await tx
          .insert(todoLists)
          .values({
            userId,
            title: listData.title,
            description: listData.description ?? null,
            defaultCurrency: listData.defaultCurrency ?? null,
          })
          .returning()

        listCount++

        for (const itemData of listData.items ?? []) {
          let ruleId: string | null = null

          if (itemData.recurrenceRule && itemData.recurrenceRule.type !== 'none') {
            const [rule] = await tx
              .insert(recurrenceRules)
              .values({
                type: itemData.recurrenceRule.type,
                dayOfMonth: itemData.recurrenceRule.dayOfMonth ?? null,
                intervalDays: itemData.recurrenceRule.intervalDays ?? null,
                weekdayMask: itemData.recurrenceRule.weekdayMask ?? null,
                interval: itemData.recurrenceRule.interval ?? 1,
                anchorDate: itemData.recurrenceRule.anchorDate
                  ? new Date(itemData.recurrenceRule.anchorDate)
                  : null,
              })
              .returning()
            ruleId = rule.id
          }

          const [item] = await tx
            .insert(todoItems)
            .values({
              listId: list.id,
              recurrenceRuleId: ruleId,
              title: itemData.title,
              description: itemData.description ?? null,
              startDate: itemData.startDate ? new Date(itemData.startDate) : null,
              startTime: itemData.startTime ?? null,
              endTime: itemData.endTime ?? null,
              dueDate: itemData.dueDate ? new Date(itemData.dueDate) : null,
              amount: itemData.amount ?? null,
              currency: itemData.currency ?? null,
              colorOverride: itemData.colorOverride ?? null,
              isArchived: itemData.isArchived ?? false,
              sortOrder: itemData.sortOrder ?? 0,
            })
            .returning()

          itemCount++

          if (itemData.completions?.length) {
            await tx.insert(completions).values(
              itemData.completions.map((c) => ({
                itemId: item.id,
                completedAt: new Date(c.completedAt),
                dueDateSnapshot: c.dueDateSnapshot ? new Date(c.dueDateSnapshot) : null,
                note: c.note ?? null,
                amount: c.amount ?? null,
                currency: c.currency ?? null,
              }))
            )
          }

          if (itemData.comments?.length) {
            await tx.insert(itemComments).values(
              itemData.comments.map((c) => ({
                itemId: item.id,
                userId,
                content: c.content,
                createdAt: new Date(c.createdAt),
                updatedAt: new Date(c.createdAt),
              }))
            )
          }
        }
      }

      if (data.auditLogs?.length) {
        await tx.insert(auditLogs).values(
          data.auditLogs.map((l) => ({
            userId,
            action: l.action,
            entityType: l.entityType,
            entityId: l.entityId,
            summary: l.summary ?? null,
            createdAt: new Date(l.createdAt),
          }))
        )
      }
    })

    return { lists: listCount, items: itemCount }
  }
}
