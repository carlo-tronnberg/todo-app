import { apiClient } from './client'
import type { TransactionType } from '../types'

export const transactionTypesApi = {
  getAll: () => apiClient.get<TransactionType[]>('/transaction-types').then((r) => r.data),

  create: (name: string) =>
    apiClient.post<TransactionType>('/transaction-types', { name }).then((r) => r.data),

  remove: (id: string) => apiClient.delete(`/transaction-types/${id}`),
}
