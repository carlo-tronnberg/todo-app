import { apiClient } from './client'
import type { User } from '../types'

export interface AdminUser extends User {
  isAdmin: boolean
}

export const adminApi = {
  getUsers: () => apiClient.get<AdminUser[]>('/admin/users').then((r) => r.data),

  updateUser: (userId: string, data: { isAdmin?: boolean }) =>
    apiClient.patch<AdminUser>(`/admin/users/${userId}`, data).then((r) => r.data),
}
