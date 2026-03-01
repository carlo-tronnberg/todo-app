import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  pgEnum,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ── Enums ─────────────────────────────────────────────────────────────────────

export const recurrenceTypeEnum = pgEnum('recurrence_type', [
  'none',
  'daily',
  'weekly',
  'monthly_on_day', // every month on a specific day (1–31)
  'custom_days', // every N days
  'yearly', // every year on the same month+day
  'weekly_on_day', // every week on a specific single weekday (weekdayMask holds one bit)
])

// ── users ─────────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ── todo_lists ────────────────────────────────────────────────────────────────

export const todoLists = pgTable('todo_lists', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ── recurrence_rules ──────────────────────────────────────────────────────────

export const recurrenceRules = pgTable('recurrence_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: recurrenceTypeEnum('type').notNull().default('none'),
  // monthly_on_day: target day 1–31
  dayOfMonth: integer('day_of_month'),
  // custom_days: advance every N days
  intervalDays: integer('interval_days'),
  // weekly: bitmask (Sun=1, Mon=2, Tue=4, Wed=8, Thu=16, Fri=32, Sat=64)
  weekdayMask: integer('weekday_mask'),
  // anchor date for custom_days calculation
  anchorDate: timestamp('anchor_date', { withTimezone: true }),
})

// ── todo_items ────────────────────────────────────────────────────────────────

export const todoItems = pgTable('todo_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  listId: uuid('list_id')
    .notNull()
    .references(() => todoLists.id, { onDelete: 'cascade' }),
  recurrenceRuleId: uuid('recurrence_rule_id').references(() => recurrenceRules.id, {
    onDelete: 'set null',
  }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  // Current due date; advanced by recurrence service on completion
  dueDate: timestamp('due_date', { withTimezone: true }),
  // Optional user-pinned color override (hex, e.g. #3b82f6)
  colorOverride: varchar('color_override', { length: 7 }),
  isArchived: boolean('is_archived').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ── completions ───────────────────────────────────────────────────────────────

export const completions = pgTable('completions', {
  id: uuid('id').primaryKey().defaultRandom(),
  itemId: uuid('item_id')
    .notNull()
    .references(() => todoItems.id, { onDelete: 'cascade' }),
  // Snapshot the due date at completion time so history is accurate
  dueDateSnapshot: timestamp('due_date_snapshot', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }).notNull().defaultNow(),
  note: text('note'),
})

// ── Relations ─────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  lists: many(todoLists),
}))

export const todoListsRelations = relations(todoLists, ({ one, many }) => ({
  user: one(users, { fields: [todoLists.userId], references: [users.id] }),
  items: many(todoItems),
}))

export const recurrenceRulesRelations = relations(recurrenceRules, ({ many }) => ({
  items: many(todoItems),
}))

export const todoItemsRelations = relations(todoItems, ({ one, many }) => ({
  list: one(todoLists, { fields: [todoItems.listId], references: [todoLists.id] }),
  recurrenceRule: one(recurrenceRules, {
    fields: [todoItems.recurrenceRuleId],
    references: [recurrenceRules.id],
  }),
  completions: many(completions),
}))

export const completionsRelations = relations(completions, ({ one }) => ({
  item: one(todoItems, { fields: [completions.itemId], references: [todoItems.id] }),
}))
