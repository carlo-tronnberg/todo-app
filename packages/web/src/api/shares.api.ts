import { apiClient } from './client'
import type { ListShare } from '../types'

export const sharesApi = {
  getAll: (listId: string) =>
    apiClient.get<ListShare[]>(`/lists/${listId}/shares`).then((r) => r.data),

  create: (listId: string, emailOrUsername: string, role = 'editor') =>
    apiClient
      .post<ListShare>(`/lists/${listId}/shares`, { emailOrUsername, role })
      .then((r) => r.data),

  updateRole: (listId: string, shareId: string, role: string) =>
    apiClient.patch(`/lists/${listId}/shares/${shareId}`, { role }),

  remove: (listId: string, shareId: string) =>
    apiClient.delete(`/lists/${listId}/shares/${shareId}`),
}
