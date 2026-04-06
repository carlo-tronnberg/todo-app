import { apiClient } from './client'
import type { ListShare } from '../types'

export const sharesApi = {
  getAll: (listId: string) =>
    apiClient.get<ListShare[]>(`/lists/${listId}/shares`).then((r) => r.data),

  create: (listId: string, email: string, role = 'editor') =>
    apiClient.post<ListShare>(`/lists/${listId}/shares`, { email, role }).then((r) => r.data),

  remove: (listId: string, shareId: string) =>
    apiClient.delete(`/lists/${listId}/shares/${shareId}`),
}
