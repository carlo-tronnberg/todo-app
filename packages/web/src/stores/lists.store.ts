import { defineStore } from 'pinia'
import { ref } from 'vue'
import { listsApi } from '../api/lists.api'
import type { TodoList } from '../types'

export const useListsStore = defineStore('lists', () => {
  const lists = ref<TodoList[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchLists() {
    loading.value = true
    error.value = null
    try {
      lists.value = await listsApi.getAll()
    } catch {
      error.value = 'Failed to load lists'
    } finally {
      loading.value = false
    }
  }

  async function createList(title: string, description?: string, defaultCurrency?: string) {
    const list = await listsApi.create({ title, description, defaultCurrency })
    lists.value.push(list)
    return list
  }

  async function updateList(
    id: string,
    data: { title?: string; description?: string; defaultCurrency?: string | null }
  ) {
    const updated = await listsApi.update(id, data)
    const idx = lists.value.findIndex((l) => l.id === id)
    if (idx !== -1) lists.value[idx] = updated
    return updated
  }

  async function deleteList(id: string) {
    await listsApi.delete(id)
    lists.value = lists.value.filter((l) => l.id !== id)
  }

  return { lists, loading, error, fetchLists, createList, updateList, deleteList }
})
