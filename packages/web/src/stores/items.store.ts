import { defineStore } from 'pinia'
import { ref } from 'vue'
import { listsApi } from '../api/lists.api'
import { itemsApi } from '../api/items.api'
import type { TodoItem, Completion } from '../types'

export const useItemsStore = defineStore('items', () => {
  const itemsByList = ref<Record<string, TodoItem[]>>({})
  const loading = ref(false)

  async function fetchItems(listId: string) {
    loading.value = true
    try {
      itemsByList.value[listId] = await listsApi.getItems(listId)
    } finally {
      loading.value = false
    }
  }

  async function createItem(listId: string, data: Partial<TodoItem> & { title: string }) {
    const item = await listsApi.createItem(listId, data)
    if (!itemsByList.value[listId]) itemsByList.value[listId] = []
    itemsByList.value[listId].push(item)
    return item
  }

  async function updateItem(listId: string, itemId: string, data: Partial<TodoItem>) {
    const updated = await itemsApi.update(itemId, data)
    if (itemsByList.value[listId]) {
      const idx = itemsByList.value[listId].findIndex((i) => i.id === itemId)
      if (idx !== -1) itemsByList.value[listId][idx] = updated
    }
    return updated
  }

  async function completeItem(
    listId: string,
    itemId: string,
    opts?: { note?: string; amount?: string; currency?: string; transactionType?: string }
  ): Promise<Completion> {
    const completion = await itemsApi.complete(itemId, opts)
    // Refresh the item to get the new due date after recurrence advance
    const updated = await itemsApi.getOne(itemId)
    if (itemsByList.value[listId]) {
      const idx = itemsByList.value[listId].findIndex((i) => i.id === itemId)
      if (idx !== -1) itemsByList.value[listId][idx] = updated
    }
    return completion
  }

  async function archiveItem(listId: string, itemId: string) {
    await itemsApi.archive(itemId)
    if (itemsByList.value[listId]) {
      itemsByList.value[listId] = itemsByList.value[listId].filter((i) => i.id !== itemId)
    }
  }

  async function duplicateItem(listId: string, itemId: string) {
    const copy = await itemsApi.duplicate(itemId)
    if (!itemsByList.value[listId]) itemsByList.value[listId] = []
    itemsByList.value[listId].push(copy)
    return copy
  }

  function getItems(listId: string): TodoItem[] {
    return itemsByList.value[listId] ?? []
  }

  return {
    itemsByList,
    loading,
    fetchItems,
    createItem,
    updateItem,
    completeItem,
    archiveItem,
    duplicateItem,
    getItems,
  }
})
