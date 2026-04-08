import { apiClient } from './client'
import type { User } from '../types'

export interface AdminUser extends User {
  isAdmin: boolean
}

export interface AdminListUser {
  id: string
  email: string
  username: string
  firstName: string | null
  lastName: string | null
  avatarUrl: string | null
}

export interface AdminListShare {
  role: string
  user: AdminListUser
}

export interface AdminList {
  id: string
  title: string
  icon: string | null
  description: string | null
  createdAt: string
  owner: AdminListUser
  shares: AdminListShare[]
  itemCount: number
}

export const adminApi = {
  getUsers: () => apiClient.get<AdminUser[]>('/admin/users').then((r) => r.data),

  updateUser: (userId: string, data: { isAdmin?: boolean }) =>
    apiClient.patch<AdminUser>(`/admin/users/${userId}`, data).then((r) => r.data),

  getLists: () => apiClient.get<AdminList[]>('/admin/lists').then((r) => r.data),
}
