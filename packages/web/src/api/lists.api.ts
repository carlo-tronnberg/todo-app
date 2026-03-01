import { apiClient } from './client'
import type { TodoList, TodoItem } from '../types'

export const listsApi = {
  getAll: () => apiClient.get<TodoList[]>('/lists').then((r) => r.data),

  getOne: (id: string) => apiClient.get<TodoList>(`/lists/${id}`).then((r) => r.data),

  create: (data: { title: string; description?: string }) =>
    apiClient.post<TodoList>('/lists', data).then((r) => r.data),

  update: (id: string, data: Partial<Pick<TodoList, 'title' | 'description'>>) =>
    apiClient.patch<TodoList>(`/lists/${id}`, data).then((r) => r.data),

  delete: (id: string) => apiClient.delete(`/lists/${id}`),

  getItems: (listId: string) =>
    apiClient.get<TodoItem[]>(`/lists/${listId}/items`).then((r) => r.data),

  createItem: (listId: string, data: Partial<TodoItem> & { title: string }) =>
    apiClient.post<TodoItem>(`/lists/${listId}/items`, data).then((r) => r.data),
}
