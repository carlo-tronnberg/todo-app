<template>
  <div>
    <div class="list-header">
      <div>
        <router-link :to="backTo" class="back-link">← Back</router-link>
        <h1 v-if="list">{{ list.title }}</h1>
        <p v-if="list?.description" class="list-desc">{{ list.description }}</p>
      </div>
      <button class="btn btn-primary" @click="openAddModal">+ Add Item</button>
    </div>

    <div v-if="itemsStore.loading" class="loading">Loading…</div>

    <div v-else-if="items.length === 0" class="empty-state card">
      <p>No items yet. Add your first task!</p>
    </div>

    <div v-else class="items-list">
      <div v-for="item in sortedItems" :key="item.id" class="item-wrapper">
        <TodoItemComponent
          :item="item"
          @complete="handleComplete"
          @edit="handleEdit"
          @archive="handleArchive"
          @duplicate="handleDuplicate"
          @history="openHistoryModal"
        />

        <!-- Collapsible comments section -->
        <div class="comments-bar">
          <button class="comments-toggle" @click="toggleComments(item.id)">
            {{
              commentsOpen.has(item.id)
                ? '▲ Hide comments'
                : `▼ Comments${commentsByItem[item.id] ? ` (${commentsByItem[item.id].length})` : ''}`
            }}
          </button>
        </div>

        <div v-if="commentsOpen.has(item.id)" class="comments-section">
          <div v-if="commentsLoading.has(item.id)" class="comments-loading">Loading…</div>
          <template v-else>
            <div v-if="!commentsByItem[item.id]?.length" class="comments-empty">
              No comments yet.
            </div>
            <div v-for="c in commentsByItem[item.id]" :key="c.id" class="comment-row">
              <p class="comment-content">{{ c.content }}</p>
              <div class="comment-meta">
                <span>{{ formatCommentDate(c.createdAt) }}</span>
                <button
                  class="comment-delete"
                  title="Delete comment"
                  @click="deleteComment(item.id, c.id)"
                >
                  ✕
                </button>
              </div>
            </div>
            <form class="comment-form" @submit.prevent="addComment(item.id)">
              <input
                v-model="newCommentText[item.id]"
                type="text"
                class="form-input comment-input"
                placeholder="Add a comment…"
              />
              <button type="submit" class="btn btn-secondary btn-sm">Add</button>
            </form>
          </template>
        </div>
      </div>
    </div>

    <!-- Add/Edit Item Modal -->
    <div v-if="showAddModal || editingItem" class="modal-backdrop">
      <div
        class="modal card"
        role="dialog"
        aria-modal="true"
        :aria-label="editingItem ? 'Edit Item' : 'New Item'"
      >
        <h2>{{ editingItem ? 'Edit Item' : 'New Item' }}</h2>
        <form @submit.prevent="handleSaveItem">
          <!-- List selector — shown in both add and edit when multiple lists exist -->
          <div v-if="listsStore.lists.length > 1" class="form-group">
            <label class="form-label">List</label>
            <select v-model="form.targetListId" class="form-input">
              <option v-for="l in listsStore.lists" :key="l.id" :value="l.id">
                {{ l.title }}{{ l.id === listId ? ' ✓' : '' }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Title *</label>
            <input v-model="form.title" type="text" class="form-input" required autofocus />
          </div>

          <div class="form-group">
            <div class="form-label-row">
              <label class="form-label">Description</label>
              <button
                v-if="form.description"
                type="button"
                class="form-clear-btn"
                @click="form.description = ''"
              >
                ✕ Clear
              </button>
            </div>
            <textarea v-model="form.description" class="form-input" rows="2" />
          </div>

          <!-- Start date | Start time -->
          <div class="form-row">
            <div class="form-col">
              <div class="form-label-row">
                <label class="form-label">Start date</label>
                <button
                  v-if="form.startDate"
                  type="button"
                  class="form-clear-btn"
                  @click="form.startDate = ''"
                >
                  ✕ Clear
                </button>
              </div>
              <input v-model="form.startDate" type="date" class="form-input" />
            </div>
            <div class="form-col">
              <label class="form-label">Start time</label>
              <input v-model="form.startTime" type="time" class="form-input" />
            </div>
          </div>

          <!-- Due date | End time -->
          <div class="form-row">
            <div class="form-col">
              <div class="form-label-row">
                <label class="form-label">Due date</label>
                <button
                  v-if="form.dueDate"
                  type="button"
                  class="form-clear-btn"
                  @click="form.dueDate = ''"
                >
                  ✕ Clear
                </button>
              </div>
              <input v-model="form.dueDate" type="date" class="form-input" />
            </div>
            <div class="form-col">
              <label class="form-label">End time</label>
              <input v-model="form.endTime" type="time" class="form-input" />
            </div>
          </div>

          <!-- Amount | Currency -->
          <div class="form-row">
            <div class="form-col">
              <label class="form-label">Amount</label>
              <input
                v-model="form.amount"
                type="number"
                step="0.01"
                min="0"
                class="form-input"
                placeholder="0.00"
              />
            </div>
            <div class="form-col">
              <label class="form-label">Currency</label>
              <select v-model="form.currency" class="form-input">
                <option value="">— None —</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="SEK">SEK</option>
                <option value="DKK">DKK</option>
                <option value="HUF">HUF</option>
              </select>
            </div>
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
              <option :value="2">Monday</option>
              <option :value="4">Tuesday</option>
              <option :value="8">Wednesday</option>
              <option :value="16">Thursday</option>
              <option :value="32">Friday</option>
              <option :value="64">Saturday</option>
              <option :value="1">Sunday</option>
            </select>
          </div>

          <!-- Weekly multiple days: checkbox row -->
          <div v-if="form.recurrenceType === 'weekly'" class="form-group">
            <label class="form-label">Days of week</label>
            <div class="weekday-checkboxes">
              <label v-for="day in WEEKDAYS" :key="day.bit" class="weekday-check">
                <input v-model="form.weeklyDayBits" type="checkbox" :value="day.bit" />
                {{ day.label }}
              </label>
            </div>
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
    <div v-if="completingItemId" class="modal-backdrop">
      <div class="modal card" role="dialog" aria-modal="true" aria-label="Complete Item">
        <h2>Complete Item</h2>
        <div class="form-group completion-amount">
          <label class="form-label">Amount</label>
          <div class="form-row">
            <input
              ref="completionAmountRef"
              v-model="completionAmount"
              type="number"
              step="0.01"
              min="0"
              class="form-input"
              placeholder="0.00"
              @keydown.enter.prevent="confirmComplete"
            />
            <select v-model="completionCurrency" class="form-input" style="max-width: 6rem">
              <option value="">—</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="SEK">SEK</option>
              <option value="DKK">DKK</option>
              <option value="HUF">HUF</option>
            </select>
          </div>
        </div>
        <p style="margin-bottom: 0.5rem; color: #64748b">
          Add an optional note for this completion:
        </p>
        <div class="form-group">
          <textarea
            v-model="completionNote"
            class="form-input"
            rows="3"
            placeholder="Note (optional)"
            @keydown.enter.prevent="confirmComplete"
          />
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="completingItemId = null">Cancel</button>
          <button class="btn btn-primary" @click="confirmComplete">Complete</button>
        </div>
      </div>
    </div>

    <!-- History modal -->
    <div v-if="historyItemId" class="modal-backdrop">
      <div
        class="modal card history-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Completion History"
      >
        <h2>Completion History</h2>
        <div v-if="historyLoading" class="loading">Loading…</div>
        <div v-else-if="historyCompletions.length === 0" class="empty-state">
          <p>No completions recorded yet.</p>
        </div>
        <div v-else class="history-list">
          <div v-for="c in historyCompletions" :key="c.id" class="history-entry">
            <div class="history-when">
              <strong>Completed:</strong> {{ formatHistoryDate(c.completedAt) }}
            </div>
            <div v-if="c.dueDateSnapshot" class="history-due">
              <strong>Was due:</strong>
              {{ formatHistoryDate(c.dueDateSnapshot).split(' ').slice(0, 3).join(' ') }}
            </div>
            <div v-if="c.amount" class="history-amount">
              <strong>Amount:</strong> {{ c.amount }} {{ c.currency }}
            </div>
            <div v-if="c.note" class="history-note">{{ c.note }}</div>
            <div class="history-actions">
              <button class="btn btn-secondary btn-sm" @click="undoCompletion(c)">Undo</button>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="historyItemId = null">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, watch, nextTick } from 'vue'

  const WEEKDAYS = [
    { bit: 2, label: 'Mon' },
    { bit: 4, label: 'Tue' },
    { bit: 8, label: 'Wed' },
    { bit: 16, label: 'Thu' },
    { bit: 32, label: 'Fri' },
    { bit: 64, label: 'Sat' },
    { bit: 1, label: 'Sun' },
  ]

  function computeFirstOccurrence(
    type: string,
    weekdayMask: number,
    weeklyDayBits: number[],
    dayOfMonth: number,
    intervalDays: number
  ): string {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (type === 'daily') {
      const d = new Date(today)
      d.setDate(d.getDate() + 1)
      return d.toISOString().substring(0, 10)
    }

    if (type === 'weekly_on_day') {
      const targetDow = Math.round(Math.log2(weekdayMask)) // 0=Sun … 6=Sat
      const d = new Date(today)
      let diff = targetDow - today.getDay()
      if (diff <= 0) diff += 7
      d.setDate(d.getDate() + diff)
      return d.toISOString().substring(0, 10)
    }

    if (type === 'weekly') {
      if (!weeklyDayBits.length) return ''
      const todayDow = today.getDay()
      let minDiff = 7
      for (const b of weeklyDayBits) {
        let diff = Math.round(Math.log2(b)) - todayDow
        if (diff <= 0) diff += 7
        if (diff < minDiff) minDiff = diff
      }
      const d = new Date(today)
      d.setDate(d.getDate() + minDiff)
      return d.toISOString().substring(0, 10)
    }

    if (type === 'monthly_on_day') {
      const day = Math.max(1, Math.min(31, dayOfMonth))
      const d = new Date(today.getFullYear(), today.getMonth(), day)
      if (d <= today) {
        d.setMonth(d.getMonth() + 1)
        d.setDate(day)
      }
      return d.toISOString().substring(0, 10)
    }

    if (type === 'custom_days') {
      const d = new Date(today)
      d.setDate(d.getDate() + Math.max(1, intervalDays))
      return d.toISOString().substring(0, 10)
    }

    if (type === 'yearly') {
      const d = new Date(today)
      d.setFullYear(d.getFullYear() + 1)
      return d.toISOString().substring(0, 10)
    }

    return ''
  }
  import { useRoute, useRouter } from 'vue-router'
  import { listsApi } from '../api/lists.api'
  import { itemsApi } from '../api/items.api'
  import { useItemsStore } from '../stores/items.store'
  import { useListsStore } from '../stores/lists.store'
  import TodoItemComponent from '../components/todo/TodoItem.vue'
  import type { TodoItem, TodoList, ItemComment, Completion } from '../types'
  import { format, parseISO } from 'date-fns'
  import { computeUrgencyLevel } from '../composables/useUrgency'

  const route = useRoute()
  const router = useRouter()
  const itemsStore = useItemsStore()
  const listsStore = useListsStore()
  const listId = route.params.listId as string

  /** Back destination: go to the calendar (at unscheduled section) if we arrived from there */
  const backTo = computed(() => (route.query.from === 'calendar' ? '/calendar#unscheduled' : '/'))

  /** If opened via editItem query param, auto-navigate back when the modal is dismissed */
  const autoBack = ref(false)

  const list = ref<TodoList | null>(null)
  const showAddModal = ref(false)
  const editingItem = ref<TodoItem | null>(null)
  const completingItemId = ref<string | null>(null)
  const completionNote = ref('')
  const completionAmount = ref('')
  const completionCurrency = ref('')
  const completionAmountRef = ref<HTMLInputElement | null>(null)
  const saving = ref(false)
  const saveError = ref('')

  // History modal state
  const historyItemId = ref<string | null>(null)
  const historyCompletions = ref<Completion[]>([])
  const historyLoading = ref(false)

  // Comments state
  const commentsOpen = ref<Set<string>>(new Set())
  const commentsLoading = ref<Set<string>>(new Set())
  const commentsByItem = ref<Record<string, ItemComment[]>>({})
  const newCommentText = ref<Record<string, string>>({})

  async function toggleComments(itemId: string) {
    if (commentsOpen.value.has(itemId)) {
      commentsOpen.value = new Set([...commentsOpen.value].filter((id) => id !== itemId))
      return
    }
    commentsOpen.value = new Set([...commentsOpen.value, itemId])
    if (commentsByItem.value[itemId] !== undefined) return // already loaded
    commentsLoading.value = new Set([...commentsLoading.value, itemId])
    try {
      commentsByItem.value[itemId] = await itemsApi.getComments(itemId)
    } finally {
      commentsLoading.value = new Set([...commentsLoading.value].filter((id) => id !== itemId))
    }
  }

  async function addComment(itemId: string) {
    const text = (newCommentText.value[itemId] ?? '').trim()
    if (!text) return
    const comment = await itemsApi.addComment(itemId, text)
    commentsByItem.value[itemId] = [...(commentsByItem.value[itemId] ?? []), comment]
    newCommentText.value[itemId] = ''
  }

  async function deleteComment(itemId: string, commentId: string) {
    await itemsApi.deleteComment(commentId)
    commentsByItem.value[itemId] = (commentsByItem.value[itemId] ?? []).filter(
      (c) => c.id !== commentId
    )
  }

  function formatCommentDate(iso: string) {
    return format(parseISO(iso), 'dd MMM yyyy HH:mm')
  }

  const BLANK_FORM = () => ({
    title: '',
    description: '',
    startDate: '',
    startTime: '',
    endTime: '',
    dueDate: '',
    amount: '',
    currency: list.value?.defaultCurrency ?? '',
    recurrenceType: 'none' as string,
    dayOfMonth: 1,
    intervalDays: 30,
    weekdayMask: 2, // Monday by default
    weeklyDayBits: [] as number[],
    targetListId: listId,
  })

  const form = ref(BLANK_FORM())

  // When switching recurrence type: derive helper fields from an existing due date,
  // or auto-fill the due date when none is set yet.
  watch(
    () => form.value.recurrenceType,
    (type) => {
      if (form.value.dueDate) {
        const d = new Date(form.value.dueDate)
        if (!isNaN(d.getTime())) {
          if (type === 'monthly_on_day') form.value.dayOfMonth = d.getDate()
          else if (type === 'weekly_on_day') form.value.weekdayMask = 1 << d.getDay()
        }
      } else if (type !== 'none') {
        const first = computeFirstOccurrence(
          type,
          form.value.weekdayMask,
          form.value.weeklyDayBits,
          form.value.dayOfMonth,
          form.value.intervalDays
        )
        if (first) form.value.dueDate = first
      }
    }
  )

  const items = computed(() => itemsStore.getItems(listId))
  const sortedItems = computed(() =>
    [...items.value].sort((a, b) => {
      const order = { overdue: 0, high: 1, medium: 2, low: 3, none: 4 }
      const urgencyDiff =
        order[computeUrgencyLevel(a.dueDate)] - order[computeUrgencyLevel(b.dueDate)]
      if (urgencyDiff !== 0) return urgencyDiff
      // Within the same urgency group, sort by due date (closest first)
      const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity
      const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity
      return aDate - bDate || a.sortOrder - b.sortOrder
    })
  )

  onMounted(async () => {
    list.value = await listsApi.getOne(listId)
    await Promise.all([itemsStore.fetchItems(listId), listsStore.fetchLists()])

    // Open edit modal for a specific item (from unscheduled calendar click)
    const editItemId = route.query.editItem as string | undefined
    if (editItemId) {
      const item = itemsStore.getItems(listId).find((i) => i.id === editItemId)
      if (item) {
        handleEdit(item)
        autoBack.value = true
      }
    }

    // Pre-fill and open the add modal when navigated here from "New item from this"
    const prefillTitle = route.query.prefillTitle as string | undefined
    if (prefillTitle) {
      form.value.title = prefillTitle
      form.value.description = (route.query.prefillDesc as string | undefined) ?? ''
      showAddModal.value = true
    }
  })

  function openAddModal() {
    form.value = BLANK_FORM()
    showAddModal.value = true
  }

  function closeModal() {
    showAddModal.value = false
    editingItem.value = null
    form.value = BLANK_FORM()
    if (autoBack.value) {
      router.push(backTo.value)
    }
  }

  function handleEdit(item: TodoItem) {
    editingItem.value = item
    form.value = {
      title: item.title,
      description: item.description ?? '',
      startDate: item.startDate ? item.startDate.substring(0, 10) : '',
      startTime: item.startTime ?? '',
      endTime: item.endTime ?? '',
      dueDate: item.dueDate ? item.dueDate.substring(0, 10) : '',
      amount: item.amount ?? '',
      currency: item.currency ?? '',
      recurrenceType: item.recurrenceRule?.type ?? 'none',
      dayOfMonth: item.recurrenceRule?.dayOfMonth ?? 1,
      intervalDays: item.recurrenceRule?.intervalDays ?? 30,
      weekdayMask: item.recurrenceRule?.weekdayMask ?? 2, // default Monday
      weeklyDayBits: WEEKDAYS.filter((d) => (item.recurrenceRule?.weekdayMask ?? 0) & d.bit).map(
        (d) => d.bit
      ),
      targetListId: item.listId,
    }
  }

  function handleDuplicate(itemId: string) {
    const item = items.value.find((i) => i.id === itemId)
    if (!item) return
    form.value = {
      title: `Copy of ${item.title}`,
      description: item.description ?? '',
      startDate: item.startDate ? item.startDate.substring(0, 10) : '',
      startTime: item.startTime ?? '',
      endTime: item.endTime ?? '',
      dueDate: item.dueDate ? item.dueDate.substring(0, 10) : '',
      amount: item.amount ?? '',
      currency: item.currency ?? '',
      recurrenceType: item.recurrenceRule?.type ?? 'none',
      dayOfMonth: item.recurrenceRule?.dayOfMonth ?? 1,
      intervalDays: item.recurrenceRule?.intervalDays ?? 30,
      weekdayMask: item.recurrenceRule?.weekdayMask ?? 2,
      weeklyDayBits: WEEKDAYS.filter((d) => (item.recurrenceRule?.weekdayMask ?? 0) & d.bit).map(
        (d) => d.bit
      ),
      targetListId: item.listId,
    }
    showAddModal.value = true
  }

  function handleComplete(itemId: string) {
    completingItemId.value = itemId
    completionNote.value = ''
    const item = itemsStore.getItems(listId).find((i) => i.id === itemId)
    completionAmount.value = item?.amount ?? ''
    completionCurrency.value = item?.currency ?? list.value?.defaultCurrency ?? ''
    nextTick(() => completionAmountRef.value?.focus())
  }

  async function confirmComplete() {
    if (!completingItemId.value) return
    const opts: { note?: string; amount?: string; currency?: string } = {}
    if (completionNote.value) opts.note = completionNote.value
    if (completionAmount.value) {
      opts.amount = completionAmount.value
      opts.currency = completionCurrency.value || undefined
    }
    await itemsStore.completeItem(listId, completingItemId.value, opts)
    completingItemId.value = null
  }

  async function openHistoryModal(itemId: string) {
    historyItemId.value = itemId
    historyLoading.value = true
    try {
      const comps = await itemsApi.getCompletions(itemId)
      historyCompletions.value = comps.sort(
        (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      )
    } finally {
      historyLoading.value = false
    }
  }

  async function undoCompletion(completion: Completion) {
    await itemsApi.deleteCompletion(completion.id)
    historyCompletions.value = historyCompletions.value.filter((c) => c.id !== completion.id)
    // Refresh items to update due date if it was reverted
    await itemsStore.fetchItems(listId)
  }

  function formatHistoryDate(iso: string) {
    return format(parseISO(iso), 'dd MMM yyyy HH:mm')
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
      const isEdit = !!editingItem.value
      const payload: Record<string, unknown> = {
        title: form.value.title,
        // null clears the field; undefined leaves it unchanged (for new items: omit)
        description: isEdit ? form.value.description || null : form.value.description || undefined,
        dueDate: isEdit
          ? form.value.dueDate
            ? new Date(form.value.dueDate).toISOString()
            : null
          : form.value.dueDate
            ? new Date(form.value.dueDate).toISOString()
            : undefined,
        startDate: isEdit
          ? form.value.startDate
            ? new Date(form.value.startDate).toISOString()
            : null
          : form.value.startDate
            ? new Date(form.value.startDate).toISOString()
            : undefined,
        startTime: isEdit ? form.value.startTime || null : form.value.startTime || undefined,
        endTime: isEdit ? form.value.endTime || null : form.value.endTime || undefined,
        amount: isEdit ? form.value.amount || null : form.value.amount || undefined,
        currency: isEdit
          ? form.value.currency
            ? form.value.currency.toUpperCase()
            : null
          : form.value.currency
            ? form.value.currency.toUpperCase()
            : undefined,
      }

      if (form.value.recurrenceType !== 'none') {
        payload.recurrenceRule = {
          type: form.value.recurrenceType,
          dayOfMonth:
            form.value.recurrenceType === 'monthly_on_day' ? form.value.dayOfMonth : undefined,
          intervalDays:
            form.value.recurrenceType === 'custom_days' ? form.value.intervalDays : undefined,
          weekdayMask:
            form.value.recurrenceType === 'weekly_on_day'
              ? form.value.weekdayMask
              : form.value.recurrenceType === 'weekly'
                ? form.value.weeklyDayBits.reduce((acc, b) => acc | b, 0)
                : undefined,
        }
      } else {
        // Explicitly clear recurrence when "No recurrence" is chosen
        payload.recurrenceRule = null
      }

      if (isEdit) {
        const movingList = form.value.targetListId !== listId
        if (movingList) payload.listId = form.value.targetListId
        await itemsStore.updateItem(listId, editingItem.value!.id, payload as Partial<TodoItem>)
        if (movingList) {
          itemsStore.itemsByList[listId] = (itemsStore.itemsByList[listId] ?? []).filter(
            (i) => i.id !== editingItem.value!.id
          )
        }
      } else {
        await itemsStore.createItem(
          form.value.targetListId,
          payload as Partial<TodoItem> & { title: string }
        )
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
  .form-label-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.25rem;
  }
  .form-label-row .form-label {
    margin-bottom: 0;
  }
  .form-clear-btn {
    background: none;
    border: none;
    color: var(--color-text-faint);
    font-size: 0.75rem;
    cursor: pointer;
    padding: 0;
    line-height: 1;
  }
  .form-clear-btn:hover {
    color: var(--color-text-muted);
  }
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

  /* Two-column form row — intentionally NOT using .form-group to avoid global flex-direction:column */
  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  @media (max-width: 600px) {
    .modal {
      max-height: 95vh;
      padding: 0.75rem;
    }
    .modal h2 {
      font-size: 1rem;
      margin-bottom: 0.5rem;
    }
    .modal .form-group {
      margin-bottom: 0.5rem;
      gap: 0.2rem;
    }
    .modal .form-input {
      padding: 0.35rem 0.5rem;
      font-size: 0.875rem;
    }
    .form-row {
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }
    .modal-actions {
      margin-top: 0.5rem;
    }
  }
  .form-col {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  /* Weekday checkboxes */
  .weekday-checkboxes {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 0.75rem;
    margin-top: 0.25rem;
  }
  .weekday-check {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.875rem;
    cursor: pointer;
    user-select: none;
  }
  .weekday-check input[type='checkbox'] {
    cursor: pointer;
  }

  /* Comments */
  .item-wrapper {
    display: flex;
    flex-direction: column;
  }
  .comments-bar {
    display: flex;
    justify-content: flex-end;
    padding: 0.1rem 0.5rem 0;
  }
  .comments-toggle {
    background: none;
    border: none;
    font-size: 0.72rem;
    color: var(--color-text-faint);
    cursor: pointer;
    padding: 0.15rem 0.3rem;
  }
  .comments-toggle:hover {
    color: var(--color-text-muted);
  }
  .comments-section {
    background: var(--color-surface-sunken);
    border-radius: 0 0 8px 8px;
    padding: 0.6rem 0.85rem 0.75rem;
    border: 1px solid var(--color-border);
    border-top: none;
    font-size: 0.85rem;
  }
  .comments-loading,
  .comments-empty {
    color: var(--color-text-faint);
    font-size: 0.82rem;
    padding: 0.25rem 0;
  }
  .comment-row {
    padding: 0.3rem 0;
    border-bottom: 1px solid var(--color-border);
  }
  .comment-row:last-of-type {
    border-bottom: none;
  }
  .comment-content {
    margin: 0;
    color: var(--color-text);
    word-break: break-word;
  }
  .comment-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.75rem;
    color: var(--color-text-faint);
    margin-top: 0.15rem;
  }
  .comment-delete {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-text-faint);
    font-size: 0.75rem;
    padding: 0.1rem 0.2rem;
  }
  .comment-delete:hover {
    color: var(--urgency-over-text);
  }
  .comment-form {
    display: flex;
    gap: 0.4rem;
    margin-top: 0.5rem;
  }
  .comment-input {
    flex: 1;
    font-size: 0.82rem;
    padding: 0.3rem 0.55rem;
  }
</style>
