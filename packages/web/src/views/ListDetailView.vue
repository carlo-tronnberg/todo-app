<template>
  <div>
    <!-- List tabs -->
    <div v-if="sortedAllLists.length > 1" class="list-tabs">
      <router-link
        v-for="l in sortedAllLists"
        :key="l.id"
        :to="`/lists/${l.id}`"
        class="list-tab"
        :class="{ active: l.id === listId }"
      >
        {{ l.icon ? `${l.icon} ` : '' }}{{ l.title }}
      </router-link>
    </div>

    <div class="list-header">
      <div>
        <router-link :to="backTo" class="back-link">← Back</router-link>
        <h1 v-if="list">{{ list.icon ? `${list.icon} ` : '' }}{{ list.title }}</h1>
        <p v-if="list?.description" class="list-desc">{{ list.description }}</p>
      </div>
      <button class="btn btn-primary" @click="openAddModal">+ Add Item</button>
    </div>

    <div v-if="itemsStore.loading" class="loading">Loading…</div>

    <div v-else-if="items.length === 0" class="empty-state card">
      <p>No items yet. Add your first task!</p>
    </div>

    <div v-else class="items-list">
      <div v-if="dueThisMonthCount > 0" class="due-this-month">
        {{ dueThisMonthCount }} due this month
      </div>
      <div v-for="item in sortedItems" :key="item.id" class="item-wrapper">
        <TodoItemComponent
          :item="item"
          @complete="handleComplete"
          @edit="handleEdit"
          @archive="handleArchive"
          @duplicate="handleDuplicate"
          @history="openHistoryModal"
        />

        <CommentsSection
          :comments="commentsByItem[item.id] ?? []"
          :loading="commentsLoading.has(item.id)"
          :is-open="commentsOpen.has(item.id)"
          :initial-count="item.commentCount ?? 0"
          @toggle="toggleComments(item.id)"
          @add="addComment(item.id, $event)"
          @delete="deleteComment(item.id, $event)"
        />
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

          <div class="form-group compact">
            <label class="form-label">Title *</label>
            <input v-model="form.title" type="text" class="form-input" required autofocus />
          </div>

          <div class="form-group compact">
            <label class="form-label">URL</label>
            <input v-model="form.url" type="url" class="form-input" placeholder="https://..." />
          </div>

          <div class="form-group compact">
            <label class="form-label">Description</label>
            <textarea
              v-model="form.description"
              class="form-input"
              rows="1"
              placeholder="Optional"
            />
          </div>

          <!-- Dates: Start date | Start time | Due date | End time -->
          <div class="form-row form-row-4">
            <div class="form-col">
              <label class="form-label">Start date</label>
              <input v-model="form.startDate" type="date" class="form-input" />
            </div>
            <div class="form-col">
              <label class="form-label">Start time</label>
              <input v-model="form.startTime" type="time" class="form-input" />
            </div>
            <div class="form-col">
              <label class="form-label">Due date</label>
              <input v-model="form.dueDate" type="date" class="form-input" />
            </div>
            <div class="form-col">
              <label class="form-label">End time</label>
              <input v-model="form.endTime" type="time" class="form-input" />
            </div>
          </div>

          <!-- Amount | Currency | Type -->
          <!-- Amount | Currency | Type -->
          <div class="form-row">
            <div class="form-col" style="flex: 2">
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
            <div class="form-col" style="flex: 0 0 5rem">
              <label class="form-label">Currency</label>
              <select v-model="form.currency" class="form-input">
                <option value="">—</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="SEK">SEK</option>
                <option value="DKK">DKK</option>
                <option value="HUF">HUF</option>
              </select>
            </div>
            <div class="form-col" style="flex: 3">
              <label class="form-label">Type</label>
              <select v-model="form.transactionType" class="form-input">
                <option value="">—</option>
                <option v-for="tt in transactionTypesList" :key="tt.id" :value="tt.name">
                  {{ tt.name }}
                </option>
              </select>
            </div>
          </div>

          <!-- Recurrence row: type + interval on same line -->
          <div class="form-row">
            <div class="form-col" style="flex: 2">
              <label class="form-label">Recurrence</label>
              <select v-model="form.recurrenceType" class="form-input">
                <option value="none">No recurrence</option>
                <option value="daily">Daily</option>
                <option value="weekly_on_day">Weekly – on a day</option>
                <option value="weekly">Weekly – multiple days</option>
                <option value="monthly_on_day">Monthly on day</option>
                <option value="custom_days">Every N days</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div
              v-if="form.recurrenceType === 'custom_days'"
              class="form-col"
              style="flex: 0 0 5rem"
            >
              <label class="form-label">Days</label>
              <input v-model.number="form.intervalDays" type="number" min="1" class="form-input" />
            </div>
            <div
              v-if="
                ['weekly_on_day', 'weekly', 'monthly_on_day', 'daily', 'yearly'].includes(
                  form.recurrenceType
                )
              "
              class="form-col"
              style="flex: 0 0 5rem"
            >
              <label class="form-label">Every</label>
              <input
                v-model.number="form.recurrenceInterval"
                type="number"
                min="1"
                class="form-input"
              />
            </div>
            <div
              v-if="
                ['weekly_on_day', 'weekly', 'monthly_on_day', 'daily', 'yearly'].includes(
                  form.recurrenceType
                )
              "
              class="form-col interval-unit-col"
            >
              <label class="form-label">&nbsp;</label>
              <span class="interval-unit">{{ recurrenceIntervalUnit }}</span>
            </div>
          </div>

          <!-- Recurrence details: weekday, day of month -->
          <div v-if="form.recurrenceType === 'weekly_on_day'" class="form-row">
            <div class="form-col">
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
          </div>
          <div v-if="form.recurrenceType === 'weekly'" class="form-group compact">
            <label class="form-label">Days of week</label>
            <div class="weekday-checkboxes">
              <label v-for="day in WEEKDAYS" :key="day.bit" class="weekday-check">
                <input v-model="form.weeklyDayBits" type="checkbox" :value="day.bit" />
                {{ day.label }}
              </label>
            </div>
          </div>
          <div v-if="form.recurrenceType === 'monthly_on_day'" class="form-row">
            <div class="form-col" style="flex: 0 0 6rem">
              <label class="form-label">Day (1–31)</label>
              <input
                v-model.number="form.dayOfMonth"
                type="number"
                min="1"
                max="31"
                class="form-input"
              />
            </div>
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

    <CompletionModal
      v-if="completingItemId"
      v-model:amount="completionAmount"
      v-model:currency="completionCurrency"
      v-model:transaction-type="completionTransactionType"
      v-model:note="completionNote"
      :transaction-types="transactionTypesList"
      @confirm="confirmComplete"
      @cancel="completingItemId = null"
    />

    <HistoryModal
      v-if="historyItemId"
      :completions="historyCompletions"
      :loading="historyLoading"
      @undo="undoCompletion"
      @close="historyItemId = null"
    />
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

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
  import { transactionTypesApi } from '../api/transaction-types.api'
  import type { TransactionType } from '../types'
  import { useItemsStore } from '../stores/items.store'
  import { useListsStore } from '../stores/lists.store'
  import TodoItemComponent from '../components/todo/TodoItem.vue'
  import CompletionModal from '../components/CompletionModal.vue'
  import HistoryModal from '../components/HistoryModal.vue'
  import CommentsSection from '../components/CommentsSection.vue'
  import type { TodoItem, TodoList, ItemComment, Completion } from '../types'
  import { computeUrgencyLevel } from '../composables/useUrgency'

  const route = useRoute()
  const router = useRouter()
  const itemsStore = useItemsStore()
  const listsStore = useListsStore()
  const listId = route.params.listId as string
  const sortedAllLists = computed(() =>
    [...listsStore.lists].sort((a, b) => a.title.localeCompare(b.title))
  )
  const transactionTypesList = ref<TransactionType[]>([])

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
  const completionTransactionType = ref('')
  const saving = ref(false)
  const saveError = ref('')

  // History modal state
  const historyItemId = ref<string | null>(null)
  const historyCompletions = ref<Completion[]>([])
  const historyLoading = ref(false)

  // Global Escape key — close the topmost open modal
  function handleEscape(e: KeyboardEvent) {
    if (e.key !== 'Escape') return
    e.preventDefault()
    if (historyItemId.value) {
      historyItemId.value = null
    } else if (completingItemId.value) {
      completingItemId.value = null
    } else if (showAddModal.value || editingItem.value) {
      closeModal()
    }
  }
  onMounted(() => document.addEventListener('keydown', handleEscape))
  onUnmounted(() => document.removeEventListener('keydown', handleEscape))

  // Comments state
  const commentsOpen = ref<Set<string>>(new Set())
  const commentsLoading = ref<Set<string>>(new Set())
  const commentsByItem = ref<Record<string, ItemComment[]>>({})

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

  async function addComment(itemId: string, text: string) {
    const comment = await itemsApi.addComment(itemId, text)
    commentsByItem.value[itemId] = [...(commentsByItem.value[itemId] ?? []), comment]
  }

  async function deleteComment(itemId: string, commentId: string) {
    await itemsApi.deleteComment(commentId)
    commentsByItem.value[itemId] = (commentsByItem.value[itemId] ?? []).filter(
      (c) => c.id !== commentId
    )
  }

  const BLANK_FORM = () => ({
    title: '',
    description: '',
    transactionType: '',
    url: '',
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
    recurrenceInterval: 1,
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

  const recurrenceIntervalUnit = computed(() => {
    const t = form.value.recurrenceType
    const n = form.value.recurrenceInterval
    if (t === 'daily') return n === 1 ? 'day' : 'days'
    if (t === 'weekly' || t === 'weekly_on_day') return n === 1 ? 'week' : 'weeks'
    if (t === 'monthly_on_day') return n === 1 ? 'month' : 'months'
    if (t === 'yearly') return n === 1 ? 'year' : 'years'
    return ''
  })

  const items = computed(() => itemsStore.getItems(listId))
  const dueThisMonthCount = computed(() => {
    const now = new Date()
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    return items.value.filter((i) => i.dueDate && new Date(i.dueDate) <= monthEnd).length
  })
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
    await Promise.all([
      itemsStore.fetchItems(listId),
      listsStore.fetchLists(),
      transactionTypesApi.getAll().then((t) => (transactionTypesList.value = t)),
    ])

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
      transactionType: item.transactionType ?? '',
      url: item.url ?? '',
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
      recurrenceInterval: item.recurrenceRule?.interval ?? 1,
      targetListId: item.listId,
    }
  }

  function handleDuplicate(itemId: string) {
    const item = items.value.find((i) => i.id === itemId)
    if (!item) return
    form.value = {
      title: `Copy of ${item.title}`,
      description: item.description ?? '',
      transactionType: item.transactionType ?? '',
      url: item.url ?? '',
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
      recurrenceInterval: item.recurrenceRule?.interval ?? 1,
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
    completionTransactionType.value = item?.transactionType ?? ''
  }

  async function confirmComplete() {
    if (!completingItemId.value) return
    const opts: {
      note?: string
      amount?: string
      currency?: string
      transactionType?: string
    } = {}
    if (completionNote.value) opts.note = completionNote.value
    if (completionAmount.value) {
      opts.amount = completionAmount.value
      opts.currency = completionCurrency.value || undefined
    }
    if (completionTransactionType.value) opts.transactionType = completionTransactionType.value
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
        transactionType: isEdit
          ? form.value.transactionType || null
          : form.value.transactionType || undefined,
        url: isEdit ? form.value.url || null : form.value.url || undefined,
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
          interval:
            form.value.recurrenceType !== 'custom_days' ? form.value.recurrenceInterval : undefined,
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
  .list-tabs {
    display: flex;
    gap: 0.25rem;
    overflow-x: auto;
    margin-bottom: 0.75rem;
    padding-bottom: 0.25rem;
    border-bottom: 1px solid var(--color-border);
  }
  .list-tab {
    padding: 0.35rem 0.75rem;
    font-size: 0.82rem;
    border-radius: 6px 6px 0 0;
    text-decoration: none;
    color: var(--color-text-muted);
    white-space: nowrap;
    border: 1px solid transparent;
    border-bottom: none;
    transition:
      background 0.15s,
      color 0.15s;
  }
  .list-tab:hover {
    background: var(--color-surface-sunken);
    color: var(--color-text);
  }
  .list-tab.active {
    background: var(--color-surface);
    color: var(--color-text);
    border-color: var(--color-border);
    font-weight: 600;
    margin-bottom: -1px;
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
  .due-this-month {
    display: inline-block;
    font-size: 0.8rem;
    font-weight: 600;
    padding: 0.2rem 0.65rem;
    border-radius: 99px;
    background: var(--urgency-high-bg);
    color: var(--urgency-high-text);
    margin-bottom: 0.5rem;
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
    max-width: 640px;
    max-height: 90vh;
    overflow-y: auto;
  }
  .modal h2 {
    margin-bottom: 0.5rem;
    font-size: 1.1rem;
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
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.6rem;
  }
  .form-row-4 {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr;
    gap: 0.5rem;
  }
  .compact {
    margin-bottom: 0.4rem;
  }
  .interval-unit-col {
    flex: 0 0 auto !important;
    justify-content: flex-end;
  }
  .interval-unit {
    font-size: 0.85rem;
    color: var(--color-text-muted);
    line-height: 2.2;
  }

  @media (max-width: 600px) {
    .modal {
      max-height: 95vh;
      padding: 0.75rem;
    }
    .modal h2 {
      font-size: 1rem;
      margin-bottom: 0.4rem;
    }
    .modal .form-group {
      margin-bottom: 0.35rem;
      gap: 0.15rem;
    }
    .modal .form-input {
      padding: 0.3rem 0.4rem;
      font-size: 0.82rem;
    }
    .modal .form-label {
      font-size: 0.75rem;
    }
    .form-row {
      gap: 0.35rem;
      margin-bottom: 0.35rem;
    }
    .form-row-4 {
      grid-template-columns: 1fr 1fr;
    }
    .modal-actions {
      margin-top: 0.5rem;
    }
  }
  .form-col {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    flex: 1;
    min-width: 0;
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

  .item-wrapper {
    display: flex;
    flex-direction: column;
  }
</style>
