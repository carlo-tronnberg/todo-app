<template>
  <div>
    <div class="list-header">
      <div>
        <router-link to="/" class="back-link">← Back</router-link>
        <h1 v-if="list">{{ list.title }}</h1>
        <p v-if="list?.description" class="list-desc">{{ list.description }}</p>
      </div>
      <button class="btn btn-primary" @click="showAddModal = true">+ Add Item</button>
    </div>

    <div v-if="itemsStore.loading" class="loading">Loading…</div>

    <div v-else-if="items.length === 0" class="empty-state card">
      <p>No items yet. Add your first task!</p>
    </div>

    <div v-else class="items-list">
      <TodoItemComponent
        v-for="item in sortedItems"
        :key="item.id"
        :item="item"
        @complete="handleComplete"
        @edit="handleEdit"
        @archive="handleArchive"
      />
    </div>

    <!-- Add/Edit Item Modal -->
    <div v-if="showAddModal || editingItem" class="modal-backdrop" @click.self="closeModal">
      <div class="modal card">
        <h2>{{ editingItem ? 'Edit Item' : 'New Item' }}</h2>
        <form @submit.prevent="handleSaveItem">
          <div class="form-group">
            <label class="form-label">Title *</label>
            <input v-model="form.title" type="text" class="form-input" required autofocus />
          </div>
          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea v-model="form.description" class="form-input" rows="2" />
          </div>
          <div class="form-group">
            <label class="form-label">Due Date</label>
            <input v-model="form.dueDate" type="date" class="form-input" />
          </div>
          <div class="form-group">
            <label class="form-label">Recurrence</label>
            <select v-model="form.recurrenceType" class="form-input">
              <option value="none">No recurrence</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly_on_day">Monthly on day</option>
              <option value="custom_days">Every N days</option>
            </select>
          </div>
          <div v-if="form.recurrenceType === 'monthly_on_day'" class="form-group">
            <label class="form-label">Day of month (1–31)</label>
            <input v-model.number="form.dayOfMonth" type="number" min="1" max="31" class="form-input" />
          </div>
          <div v-if="form.recurrenceType === 'custom_days'" class="form-group">
            <label class="form-label">Interval (days)</label>
            <input v-model.number="form.intervalDays" type="number" min="1" class="form-input" />
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="closeModal">Cancel</button>
            <button type="submit" class="btn btn-primary">
              {{ editingItem ? 'Save' : 'Add' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Complete confirmation modal -->
    <div v-if="completingItemId" class="modal-backdrop" @click.self="completingItemId = null">
      <div class="modal card">
        <h2>Complete Item</h2>
        <p style="margin-bottom: 1rem; color: #64748b">Add an optional note for this completion:</p>
        <div class="form-group">
          <textarea v-model="completionNote" class="form-input" rows="3" placeholder="Note (optional)" />
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="completingItemId = null">Cancel</button>
          <button class="btn btn-primary" @click="confirmComplete">Complete</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import { useRoute } from 'vue-router'
  import { listsApi } from '../api/lists.api'
  import { useItemsStore } from '../stores/items.store'
  import TodoItemComponent from '../components/todo/TodoItem.vue'
  import type { TodoItem, TodoList } from '../types'
  import { computeUrgencyLevel } from '../composables/useUrgency'

  const route = useRoute()
  const itemsStore = useItemsStore()
  const listId = route.params.listId as string

  const list = ref<TodoList | null>(null)
  const showAddModal = ref(false)
  const editingItem = ref<TodoItem | null>(null)
  const completingItemId = ref<string | null>(null)
  const completionNote = ref('')

  const form = ref({
    title: '',
    description: '',
    dueDate: '',
    recurrenceType: 'none' as string,
    dayOfMonth: 1,
    intervalDays: 30,
  })

  const items = computed(() => itemsStore.getItems(listId))
  const sortedItems = computed(() =>
    [...items.value].sort((a, b) => {
      const order = { overdue: 0, high: 1, medium: 2, low: 3, none: 4 }
      return (
        order[computeUrgencyLevel(a.dueDate)] - order[computeUrgencyLevel(b.dueDate)] ||
        a.sortOrder - b.sortOrder
      )
    })
  )

  onMounted(async () => {
    list.value = await listsApi.getOne(listId)
    await itemsStore.fetchItems(listId)
  })

  function closeModal() {
    showAddModal.value = false
    editingItem.value = null
    form.value = { title: '', description: '', dueDate: '', recurrenceType: 'none', dayOfMonth: 1, intervalDays: 30 }
  }

  function handleEdit(item: TodoItem) {
    editingItem.value = item
    form.value = {
      title: item.title,
      description: item.description ?? '',
      dueDate: item.dueDate ? item.dueDate.substring(0, 10) : '',
      recurrenceType: item.recurrenceRule?.type ?? 'none',
      dayOfMonth: item.recurrenceRule?.dayOfMonth ?? 1,
      intervalDays: item.recurrenceRule?.intervalDays ?? 30,
    }
  }

  function handleComplete(itemId: string) {
    completingItemId.value = itemId
    completionNote.value = ''
  }

  async function confirmComplete() {
    if (!completingItemId.value) return
    await itemsStore.completeItem(listId, completingItemId.value, completionNote.value || undefined)
    completingItemId.value = null
  }

  async function handleArchive(itemId: string) {
    if (confirm('Archive this item?')) {
      await itemsStore.archiveItem(listId, itemId)
    }
  }

  async function handleSaveItem() {
    const payload: any = {
      title: form.value.title,
      description: form.value.description || undefined,
      dueDate: form.value.dueDate ? new Date(form.value.dueDate).toISOString() : undefined,
    }

    if (form.value.recurrenceType !== 'none') {
      payload.recurrenceRule = {
        type: form.value.recurrenceType,
        dayOfMonth: form.value.recurrenceType === 'monthly_on_day' ? form.value.dayOfMonth : undefined,
        intervalDays: form.value.recurrenceType === 'custom_days' ? form.value.intervalDays : undefined,
      }
    }

    if (editingItem.value) {
      await itemsStore.updateItem(listId, editingItem.value.id, payload)
    } else {
      await itemsStore.createItem(listId, payload)
    }

    closeModal()
  }
</script>

<style scoped>
  .list-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.5rem;
    gap: 1rem;
  }
  .back-link {
    font-size: 0.85rem;
    color: #64748b;
    display: block;
    margin-bottom: 0.25rem;
  }
  .list-desc {
    color: #64748b;
    margin-top: 0.25rem;
  }
  .items-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .empty-state {
    text-align: center;
    padding: 3rem;
    color: #64748b;
  }
  .loading {
    text-align: center;
    padding: 2rem;
    color: #94a3b8;
  }
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
    padding: 1rem;
  }
  .modal {
    width: 100%;
    max-width: 520px;
    max-height: 90vh;
    overflow-y: auto;
  }
  .modal h2 {
    margin-bottom: 1rem;
    font-size: 1.2rem;
    font-weight: 600;
  }
  .modal-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
    margin-top: 1rem;
  }
</style>
