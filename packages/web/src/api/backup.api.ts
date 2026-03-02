import { apiClient } from './client'

export const backupApi = {
  /** Download backup JSON and trigger browser save-file dialog */
  async download(): Promise<void> {
    const response = await apiClient.get('/backup', { responseType: 'blob' })
    const url = URL.createObjectURL(response.data as Blob)
    const a = document.createElement('a')
    a.href = url
    const disposition = response.headers['content-disposition'] as string | undefined
    const match = disposition?.match(/filename="([^"]+)"/)
    a.download = match?.[1] ?? `todo-backup-${new Date().toISOString().substring(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  },

  /** Upload a backup file and restore its contents */
  restore(data: unknown): Promise<{ lists: number; items: number }> {
    return apiClient
      .post<{ lists: number; items: number }>('/backup/restore', data)
      .then((r) => r.data)
  },
}
