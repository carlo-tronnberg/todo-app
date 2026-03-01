import { apiClient } from './client'
import type { User, AuditLog } from '../types'

interface AuthResponse {
  token: string
  user: User
}

export const authApi = {
  register: (data: { email: string; username: string; password: string }) =>
    apiClient.post<AuthResponse>('/auth/register', data).then((r) => r.data),

  login: (data: { email: string; password: string }) =>
    apiClient.post<AuthResponse>('/auth/login', data).then((r) => r.data),

  me: () => apiClient.get<User>('/auth/me').then((r) => r.data),

  updateProfile: (data: {
    firstName?: string | null
    lastName?: string | null
    phone?: string | null
  }) => apiClient.patch<User>('/auth/me', data).then((r) => r.data),

  changePassword: (data: { oldPassword: string; newPassword: string }) =>
    apiClient.patch('/auth/password', data),

  getAuditLog: (params?: { limit?: number; offset?: number }) =>
    apiClient.get<AuditLog[]>('/audit', { params }).then((r) => r.data),
}
