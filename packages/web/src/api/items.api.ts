import { apiClient } from './client'
import type { TodoItem, Completion } from '../types'

export const itemsApi = {
  getOne: (id: string) => apiClient.get<TodoItem>(`/items/${id}`).then((r) => r.data),

  update: (id: string, data: Partial<TodoItem>) =>
    apiClient.patch<TodoItem>(`/items/${id}`, data).then((r) => r.data),

  archive: (id: string) => apiClient.delete(`/items/${id}`),

  complete: (id: string, note?: string) =>
    apiClient.post<Completion>(`/items/${id}/complete`, { note }).then((r) => r.data),

  getCompletions: (id: string) =>
    apiClient.get<Completion[]>(`/items/${id}/completions`).then((r) => r.data),

  /** Undo a completion. Deletes the record and reverts dueDate for recurring items. */
  deleteCompletion: (completionId: string) => apiClient.delete(`/completions/${completionId}`),
}
