import { apiClient } from './client'
import type { TodoItem, Completion, ItemComment } from '../types'

export const itemsApi = {
  getOne: (id: string) => apiClient.get<TodoItem>(`/items/${id}`).then((r) => r.data),

  update: (id: string, data: Partial<TodoItem>) =>
    apiClient.patch<TodoItem>(`/items/${id}`, data).then((r) => r.data),

  archive: (id: string) => apiClient.delete(`/items/${id}`),

  complete: (id: string, opts?: { note?: string; amount?: string; currency?: string }) =>
    apiClient.post<Completion>(`/items/${id}/complete`, opts).then((r) => r.data),

  getCompletions: (id: string) =>
    apiClient.get<Completion[]>(`/items/${id}/completions`).then((r) => r.data),

  /** Undo a completion. Deletes the record and reverts dueDate for recurring items. */
  deleteCompletion: (completionId: string) => apiClient.delete(`/completions/${completionId}`),

  duplicate: (id: string) => apiClient.post<TodoItem>(`/items/${id}/duplicate`).then((r) => r.data),

  getComments: (id: string) =>
    apiClient.get<ItemComment[]>(`/items/${id}/comments`).then((r) => r.data),

  addComment: (id: string, content: string) =>
    apiClient.post<ItemComment>(`/items/${id}/comments`, { content }).then((r) => r.data),

  deleteComment: (commentId: string) => apiClient.delete(`/comments/${commentId}`),
}
