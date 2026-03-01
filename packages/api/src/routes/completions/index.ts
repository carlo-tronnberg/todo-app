import { FastifyPluginAsync } from 'fastify'
import { eq, desc } from 'drizzle-orm'
import { completions, todoItems, todoLists } from '../../db'

export const completionsRoutes: FastifyPluginAsync = async (app) => {
  const auth = { onRequest: [app.authenticate] }

  /**
   * DELETE /api/completions/:completionId
   *
   * Undo a completion. Verifies the caller owns the item via todo_lists.user_id.
   * For the *latest* completion of a recurring item, reverts todo_items.due_date
   * back to the dueDateSnapshot so the task reappears on its original due date.
   */
  app.delete<{ Params: { completionId: string } }>(
    '/:completionId',
    auth,
    async (request, reply) => {
      const { completionId } = request.params
      const userId = request.user.sub

      // Load completion together with its item and the owning list's userId
      const [row] = await app.db
        .select({
          completion: completions,
          item: todoItems,
          listUserId: todoLists.userId,
        })
        .from(completions)
        .innerJoin(todoItems, eq(completions.itemId, todoItems.id))
        .innerJoin(todoLists, eq(todoItems.listId, todoLists.id))
        .where(eq(completions.id, completionId))
        .limit(1)

      if (!row) return reply.notFound('Completion not found')
      if (row.listUserId !== userId) return reply.forbidden()

      // Determine whether this is the most-recent completion for the item
      const [latestCompletion] = await app.db
        .select({ id: completions.id })
        .from(completions)
        .where(eq(completions.itemId, row.item.id))
        .orderBy(desc(completions.completedAt))
        .limit(1)

      const isLatest = latestCompletion?.id === completionId

      // Revert due date only when undoing the latest completion of a recurring item
      if (isLatest && row.item.recurrenceRuleId && row.completion.dueDateSnapshot) {
        await app.db
          .update(todoItems)
          .set({ dueDate: row.completion.dueDateSnapshot, updatedAt: new Date() })
          .where(eq(todoItems.id, row.item.id))
      }

      // Delete the completion record
      await app.db.delete(completions).where(eq(completions.id, completionId))

      return reply.code(204).send()
    }
  )
}
