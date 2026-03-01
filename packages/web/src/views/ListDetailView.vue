<template>
  <div>
    <div class="list-header">
      <div>
        <router-link :to="backTo" class="back-link">← Back</router-link>
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
              <option value="weekly_on_day">Weekly – on a given day</option>
              <option value="weekly">Weekly – multiple days (bitmask)</option>
              <option value="monthly_on_day">Monthly on day</option>
              <option value="custom_days">Every N days</option>
              <option value="yearly">Yearly (same date every year)</option>
            </select>
          </div>

          <!-- Weekly on a given day: single weekday selector -->
          <div v-if="form.recurrenceType === 'weekly_on_day'" class="form-group">
            <label class="form-label">Weekday</label>
            <select v-model.number="form.weekdayMask" class="form-input">
              <option :value="1">Sunday</option>
              <option :value="2">Monday</option>
              <option :value="4">Tuesday</option>
              <option :value="8">Wednesday</option>
              <option :value="16">Thursday</option>
              <option :value="32">Friday</option>
              <option :value="64">Saturday</option>
            </select>
          </div>

          <div v-if="form.recurrenceType === 'monthly_on_day'" class="form-group">
            <label class="form-label">Day of month (1–31)</label>
            <input
              v-model.number="form.dayOfMonth"
              type="number"
              min="1"
              max="31"
              class="form-input"
            />
          </div>
          <div v-if="form.recurrenceType === 'custom_days'" class="form-group">
            <label class="form-label">Interval (days)</label>
            <input v-model.number="form.intervalDays" type="number" min="1" class="form-input" />
          </div>

          <p v-if="saveError" class="form-error">{{ saveError }}</p>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="closeModal">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? 'Saving…' : editingItem ? 'Save' : 'Add' }}
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
          <textarea
            v-model="completionNote"
            class="form-input"
            rows="3"
            placeholder="Note (optional)"
          />
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
  import { ref, computed, onMounted, watch } from 'vue'
  import { useRoute } from 'vue-router'
  import { listsApi } from '../api/lists.api'
  import { useItemsStore } from '../stores/items.store'
  import TodoItemComponent from '../components/todo/TodoItem.vue'
  import type { TodoItem, TodoList } from '../types'
  import { computeUrgencyLevel } from '../composables/useUrgency'

  const route = useRoute()
  const itemsStore = useItemsStore()
  const listId = route.params.listId as string

  /** Back destination: go to the calendar if we arrived from there, otherwise the dashboard */
  const backTo = computed(() => (route.query.from === 'calendar' ? '/calendar' : '/'))

  const list = ref<TodoList | null>(null)
  const showAddModal = ref(false)
  const editingItem = ref<TodoItem | null>(null)
  const completingItemId = ref<string | null>(null)
  const completionNote = ref('')
  const saving = ref(false)
  const saveError = ref('')

  const BLANK_FORM = () => ({
    title: '',
    description: '',
    dueDate: '',
    recurrenceType: 'none' as string,
    dayOfMonth: 1,
    intervalDays: 30,
    weekdayMask: 2, // Monday by default
  })

  const form = ref(BLANK_FORM())

  // When switching recurrence type, default derived fields from the selected due date
  watch(
    () => form.value.recurrenceType,
    (type) => {
      if (!form.value.dueDate) return
      const d = new Date(form.value.dueDate)
      if (isNaN(d.getTime())) return
      if (type === 'monthly_on_day') {
        form.value.dayOfMonth = d.getDate()
      } else if (type === 'weekly_on_day') {
        form.value.weekdayMask = 1 << d.getDay()
      }
    }
  )

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
    form.value = BLANK_FORM()
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
      weekdayMask: item.recurrenceRule?.weekdayMask ?? 2, // default Monday
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
    saving.value = true
    saveError.value = ''
    try {
      const payload: Record<string, unknown> = {
        title: form.value.title,
        description: form.value.description || undefined,
        dueDate: form.value.dueDate ? new Date(form.value.dueDate).toISOString() : undefined,
      }

      if (form.value.recurrenceType !== 'none') {
        payload.recurrenceRule = {
          type: form.value.recurrenceType,
          dayOfMonth:
            form.value.recurrenceType === 'monthly_on_day' ? form.value.dayOfMonth : undefined,
          intervalDays:
            form.value.recurrenceType === 'custom_days' ? form.value.intervalDays : undefined,
          weekdayMask:
            form.value.recurrenceType === 'weekly_on_day' || form.value.recurrenceType === 'weekly'
              ? form.value.weekdayMask
              : undefined,
        }
      } else {
        // Explicitly clear recurrence when "No recurrence" is chosen
        payload.recurrenceRule = null
      }

      if (editingItem.value) {
        await itemsStore.updateItem(listId, editingItem.value.id, payload as Partial<TodoItem>)
      } else {
        await itemsStore.createItem(listId, payload as Partial<TodoItem> & { title: string })
      }

      closeModal()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string }
      saveError.value =
        e?.response?.data?.message ?? e?.message ?? 'Failed to save item. Please try again.'
    } finally {
      saving.value = false
    }
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
    color: var(--color-text-muted);
    display: block;
    margin-bottom: 0.25rem;
  }
  .list-desc {
    color: var(--color-text-muted);
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
    color: var(--color-text-muted);
  }
  .loading {
    text-align: center;
    padding: 2rem;
    color: var(--color-text-faint);
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
    color: var(--color-text);
  }
  .modal-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
    margin-top: 1rem;
  }
</style>
