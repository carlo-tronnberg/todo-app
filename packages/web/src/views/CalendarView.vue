<template>
  <div>
    <!-- Header: navigation + Today + Add Item + iCal button -->
    <div class="cal-header">
      <button class="btn btn-secondary nav-btn" @click="prevMonth">‹</button>
      <button ref="headingBtn" class="cal-heading-btn" @click="toggleMonthPicker">
        {{ format(currentMonth, 'MMMM yyyy') }}
        <span class="cal-heading-caret">▾</span>
      </button>
      <button class="btn btn-secondary nav-btn" @click="nextMonth">›</button>
      <button
        class="btn btn-secondary today-btn"
        :class="{ 'today-btn-active': isCurrentMonth }"
        @click="goToToday"
      >
        Today
      </button>
      <button class="btn btn-primary add-btn" @click="openAddModal(null)">+ Add Item</button>
      <button
        class="btn btn-secondary ical-btn"
        title="Export / subscribe to calendar"
        @click="showIcalDialog = true"
      >
        📅 iCal
      </button>
    </div>

    <!-- Month/Year picker popup -->
    <Teleport to="body">
      <div
        v-if="showMonthPicker"
        ref="monthPickerEl"
        class="month-picker"
        :style="monthPickerStyle"
      >
        <div class="month-picker-year-row">
          <button class="month-picker-year-nav" @click="pickerYear--">‹</button>
          <span class="month-picker-year-label">{{ pickerYear }}</span>
          <button class="month-picker-year-nav" @click="pickerYear++">›</button>
        </div>
        <div class="month-picker-grid">
          <button
            v-for="(name, idx) in MONTH_NAMES"
            :key="idx"
            class="month-picker-btn"
            :class="{ active: isPickerSelected(idx) }"
            @click="selectPickerMonth(idx)"
          >
            {{ name }}
          </button>
        </div>
      </div>
    </Teleport>

    <!-- List filter toggles -->
    <div v-if="allLists.length > 1" class="cal-filters">
      <button
        v-for="list in allLists"
        :key="list.id"
        class="cal-filter-chip"
        :class="{ 'cal-filter-chip--active': visibleListIds.has(list.id) }"
        @click="toggleListFilter(list.id)"
      >
        {{ list.title }}
      </button>
    </div>

    <!-- Calendar grid -->
    <div class="cal-grid">
      <div v-for="day in weekDayLabels" :key="day" class="cal-day-label">{{ day }}</div>
      <div
        v-for="cell in calendarCells"
        :key="cell.key"
        class="cal-cell"
        :class="{
          'cal-cell-other': !cell.inMonth,
          'cal-cell-today': cell.isToday,
        }"
      >
        <div class="cal-cell-top">
          <span class="cal-date-num">{{ cell.day }}</span>
          <button
            class="cal-add-day-btn"
            title="Add item on this day"
            @click.stop="openAddModal(cell.date)"
          >
            +
          </button>
        </div>
        <div class="cal-items">
          <!-- Upcoming items -->
          <div
            v-for="item in cell.items"
            :key="item.id"
            class="cal-item"
            :class="`cal-item-${computeUrgencyLevel(item.dueDate)}`"
            @click="$router.push(`/lists/${item.listId}?from=calendar`)"
            @mouseenter="showItemHover($event, item)"
            @mouseleave="scheduleHide"
          >
            {{ item.title }}
          </div>

          <!-- Completed items -->
          <div
            v-for="c in cell.completions"
            :key="c.id"
            class="cal-item cal-item-done"
            @click="openUndoModal(c)"
            @mouseenter="showCompletionHover($event, c)"
            @mouseleave="scheduleHide"
          >
            ✓ {{ c.itemTitle }}
          </div>
        </div>
      </div>
    </div>

    <!-- Hover detail popup -->
    <Teleport to="body">
      <div
        v-if="hoverVisible && (hoverItem || hoverCompletion)"
        class="hover-popup"
        :style="{ left: hoverPos.x + 'px', top: hoverPos.y + 'px' }"
        @mouseenter="cancelHide"
        @mouseleave="scheduleHide"
      >
        <!-- Item hover -->
        <template v-if="hoverItem">
          <div class="hp-title">{{ hoverItem.title }}</div>
          <div class="hp-list">📋 {{ hoverItem.listTitle }}</div>
          <div v-if="hoverItem.description" class="hp-desc">{{ hoverItem.description }}</div>
          <div v-if="hoverItem.dueDate" class="hp-row">
            <span class="hp-label">Due</span>
            <span>{{ formatDate(hoverItem.dueDate) }}</span>
          </div>
          <div
            v-if="hoverItem.recurrenceRule && hoverItem.recurrenceRule.type !== 'none'"
            class="hp-row"
          >
            <span class="hp-label">Recurs</span>
            <span>{{ recurrenceText(hoverItem.recurrenceRule) }}</span>
          </div>
          <template v-if="latestCompletion(hoverItem.id)">
            <div class="hp-row">
              <span class="hp-label">Last done</span>
              <span>{{ formatDateTime(latestCompletion(hoverItem.id)!.completedAt) }}</span>
            </div>
          </template>
        </template>

        <!-- Completion hover -->
        <template v-if="hoverCompletion">
          <div class="hp-title hp-done">✓ {{ hoverCompletion.itemTitle }}</div>
          <div class="hp-list">📋 {{ hoverCompletion.listTitle }}</div>
          <div v-if="hoverCompletion.itemDescription" class="hp-desc">
            {{ hoverCompletion.itemDescription }}
          </div>
          <div class="hp-row">
            <span class="hp-label">Completed</span>
            <span>{{ formatDateTime(hoverCompletion.completedAt) }}</span>
          </div>
          <div v-if="hoverCompletion.dueDateSnapshot" class="hp-row">
            <span class="hp-label">Was due</span>
            <span>{{ formatDate(hoverCompletion.dueDateSnapshot) }}</span>
          </div>
          <div v-if="hoverCompletion.note" class="hp-row">
            <span class="hp-label">Note</span>
            <span class="hp-note">{{ hoverCompletion.note }}</span>
          </div>
          <p class="hp-hint">Click to undo</p>
        </template>
      </div>
    </Teleport>

    <!-- Add Item Modal -->
    <Teleport to="body">
      <div v-if="showAddModal" class="modal-overlay">
        <div class="modal card modal-wide">
          <h2>New Item</h2>
          <form @submit.prevent="handleAddItem">
            <div class="form-group">
              <label class="form-label">List *</label>
              <select v-model="addForm.listId" class="form-input" required>
                <option value="" disabled>— select a list —</option>
                <option v-for="list in allLists" :key="list.id" :value="list.id">
                  {{ list.title }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Title *</label>
              <input v-model="addForm.title" type="text" class="form-input" required autofocus />
            </div>
            <div class="form-group">
              <label class="form-label">Description</label>
              <textarea v-model="addForm.description" class="form-input" rows="2" />
            </div>
            <div class="form-group">
              <label class="form-label">Due Date</label>
              <input v-model="addForm.dueDate" type="date" class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label">Recurrence</label>
              <select v-model="addForm.recurrenceType" class="form-input">
                <option value="none">No recurrence</option>
                <option value="daily">Daily</option>
                <option value="weekly_on_day">Weekly – on a given day</option>
                <option value="weekly">Weekly – multiple days (bitmask)</option>
                <option value="monthly_on_day">Monthly on day</option>
                <option value="custom_days">Every N days</option>
                <option value="yearly">Yearly (same date every year)</option>
              </select>
            </div>
            <!-- weekly_on_day: single weekday selector -->
            <div v-if="addForm.recurrenceType === 'weekly_on_day'" class="form-group">
              <label class="form-label">Weekday</label>
              <select v-model.number="addForm.weekdayMask" class="form-input">
                <option :value="1">Sunday</option>
                <option :value="2">Monday</option>
                <option :value="4">Tuesday</option>
                <option :value="8">Wednesday</option>
                <option :value="16">Thursday</option>
                <option :value="32">Friday</option>
                <option :value="64">Saturday</option>
              </select>
            </div>
            <div v-if="addForm.recurrenceType === 'monthly_on_day'" class="form-group">
              <label class="form-label">Day of month (1–31)</label>
              <input
                v-model.number="addForm.dayOfMonth"
                type="number"
                min="1"
                max="31"
                class="form-input"
              />
            </div>
            <div v-if="addForm.recurrenceType === 'custom_days'" class="form-group">
              <label class="form-label">Interval (days)</label>
              <input
                v-model.number="addForm.intervalDays"
                type="number"
                min="1"
                class="form-input"
              />
            </div>

            <p v-if="addError" class="form-error">{{ addError }}</p>
            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" @click="closeAddModal">Cancel</button>
              <button type="submit" class="btn btn-primary" :disabled="adding">
                {{ adding ? 'Adding…' : 'Add Item' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Undo confirmation modal -->
    <Teleport to="body">
      <div v-if="undoTarget" class="modal-overlay">
        <div class="modal card">
          <h2>Undo completion?</h2>
          <p>
            Undo the completion of <strong>{{ undoTarget.itemTitle }}</strong>
            <span v-if="undoTarget.dueDateSnapshot">
              from {{ formatDate(undoTarget.dueDateSnapshot) }}
            </span>
            ?
          </p>
          <p v-if="undoTarget.isLatestCompletion && undoTarget.dueDateSnapshot" class="modal-hint">
            This was the latest completion — the due date will be reverted to
            {{ formatDate(undoTarget.dueDateSnapshot) }}.
          </p>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="undoTarget = null">Cancel</button>
            <button class="btn btn-danger" :disabled="undoing" @click="confirmUndo">
              {{ undoing ? 'Undoing…' : 'Undo completion' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- iCal / Google Calendar dialog -->
    <Teleport to="body">
      <div v-if="showIcalDialog" class="modal-overlay">
        <div class="modal card ical-dialog">
          <h2>📅 Calendar Subscription</h2>
          <p class="modal-hint">
            Subscribe to your tasks so they appear in Google Calendar, Apple Calendar, or any app
            that supports the iCalendar format. The link stays live — new tasks appear
            automatically.
          </p>

          <label class="ical-label">Subscription URL</label>
          <div class="ical-url-row">
            <input ref="icalInput" class="input ical-input" :value="icalUrls.webcal" readonly />
            <button class="btn btn-secondary" @click="copyUrl">
              {{ copied ? '✓ Copied' : 'Copy' }}
            </button>
          </div>

          <div class="ical-actions">
            <a
              :href="icalUrls.google"
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn-primary"
            >
              Add to Google Calendar
            </a>
            <a :href="icalUrls.https" class="btn btn-secondary" download="todo-tracker.ics">
              Download .ics
            </a>
          </div>

          <p class="modal-hint ical-tip">
            <strong>Apple Calendar / Outlook:</strong> Copy the URL above, then use "Subscribe to
            calendar" / "Add from URL".
          </p>

          <button class="btn btn-secondary modal-close-btn" @click="showIcalDialog = false">
            Close
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
  import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isToday,
    addMonths,
    subMonths,
    parseISO,
    isSameDay,
  } from 'date-fns'
  import { calendarApi } from '../api/calendar.api'
  import { itemsApi } from '../api/items.api'
  import { listsApi } from '../api/lists.api'
  import type { CalendarItem, CalendarCompletion, TodoList, RecurrenceRule } from '../types'
  import { computeUrgencyLevel } from '../composables/useUrgency'

  const currentMonth = ref(startOfMonth(new Date()))
  const items = ref<CalendarItem[]>([])
  const completionList = ref<CalendarCompletion[]>([])
  const weekDayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // ── Today button ───────────────────────────────────────────────────────────
  const isCurrentMonth = computed(() => {
    const now = startOfMonth(new Date())
    return (
      currentMonth.value.getFullYear() === now.getFullYear() &&
      currentMonth.value.getMonth() === now.getMonth()
    )
  })

  function goToToday() {
    currentMonth.value = startOfMonth(new Date())
  }

  // ── Month/Year picker ──────────────────────────────────────────────────────
  const MONTH_NAMES = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  const showMonthPicker = ref(false)
  const pickerYear = ref(new Date().getFullYear())
  const headingBtn = ref<HTMLButtonElement | null>(null)
  const monthPickerEl = ref<HTMLDivElement | null>(null)
  const monthPickerStyle = ref<{ left: string; top: string; transform: string }>({
    left: '0px',
    top: '0px',
    transform: 'translateX(-50%)',
  })

  function toggleMonthPicker() {
    if (showMonthPicker.value) {
      showMonthPicker.value = false
      return
    }
    pickerYear.value = currentMonth.value.getFullYear()
    if (headingBtn.value) {
      const rect = headingBtn.value.getBoundingClientRect()
      monthPickerStyle.value = {
        left: rect.left + rect.width / 2 + 'px',
        top: rect.bottom + 8 + 'px',
        transform: 'translateX(-50%)',
      }
    }
    showMonthPicker.value = true
  }

  function isPickerSelected(monthIdx: number): boolean {
    return (
      currentMonth.value.getMonth() === monthIdx &&
      currentMonth.value.getFullYear() === pickerYear.value
    )
  }

  function selectPickerMonth(monthIdx: number) {
    currentMonth.value = new Date(pickerYear.value, monthIdx, 1)
    showMonthPicker.value = false
  }

  function handleDocumentClick(e: MouseEvent) {
    if (!showMonthPicker.value) return
    const target = e.target as Node
    if (headingBtn.value?.contains(target) || monthPickerEl.value?.contains(target)) return
    showMonthPicker.value = false
  }

  // ── Lists + filter ─────────────────────────────────────────────────────────
  const allLists = ref<TodoList[]>([])
  const visibleListIds = ref<Set<string>>(new Set())

  function toggleListFilter(id: string) {
    const next = new Set(visibleListIds.value)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    visibleListIds.value = next
  }

  // ── iCal dialog state ──────────────────────────────────────────────────────
  const showIcalDialog = ref(false)
  const icalUrls = computed(() => calendarApi.getIcalUrls())
  const copied = ref(false)
  const icalInput = ref<HTMLInputElement | null>(null)

  // ── Undo modal state ───────────────────────────────────────────────────────
  const undoTarget = ref<CalendarCompletion | null>(null)
  const undoing = ref(false)

  // ── Add item modal state ───────────────────────────────────────────────────
  const showAddModal = ref(false)
  const adding = ref(false)
  const addError = ref('')

  const BLANK_ADD_FORM = () => ({
    listId: '',
    title: '',
    description: '',
    dueDate: '',
    recurrenceType: 'none' as string,
    dayOfMonth: 1,
    intervalDays: 30,
    weekdayMask: 2, // Monday by default
  })
  const addForm = ref(BLANK_ADD_FORM())

  function openAddModal(date: Date | null) {
    addForm.value = BLANK_ADD_FORM()
    // Pre-select the first list if only one exists
    if (allLists.value.length === 1) {
      addForm.value.listId = allLists.value[0].id
    }
    // Pre-fill due date if a specific day was clicked
    if (date) {
      addForm.value.dueDate = format(date, 'yyyy-MM-dd')
      // Default dayOfMonth to the clicked day so monthly recurrence makes sense
      addForm.value.dayOfMonth = date.getDate()
    }
    showAddModal.value = true
  }

  // When switching recurrence type, default derived fields from the selected due date
  watch(
    () => addForm.value.recurrenceType,
    (type) => {
      if (!addForm.value.dueDate) return
      const d = new Date(addForm.value.dueDate)
      if (isNaN(d.getTime())) return
      if (type === 'monthly_on_day') {
        addForm.value.dayOfMonth = d.getDate()
      } else if (type === 'weekly_on_day') {
        // Set bitmask to the weekday of the selected due date (Sun=1, Mon=2, …)
        addForm.value.weekdayMask = 1 << d.getDay()
      }
    }
  )

  function closeAddModal() {
    showAddModal.value = false
    addError.value = ''
    addForm.value = BLANK_ADD_FORM()
  }

  async function handleAddItem() {
    if (!addForm.value.listId) {
      addError.value = 'Please select a list.'
      return
    }
    adding.value = true
    addError.value = ''
    try {
      const payload: Record<string, unknown> = {
        title: addForm.value.title,
        description: addForm.value.description || undefined,
        dueDate: addForm.value.dueDate ? new Date(addForm.value.dueDate).toISOString() : undefined,
      }
      if (addForm.value.recurrenceType !== 'none') {
        payload.recurrenceRule = {
          type: addForm.value.recurrenceType,
          dayOfMonth:
            addForm.value.recurrenceType === 'monthly_on_day'
              ? addForm.value.dayOfMonth
              : undefined,
          intervalDays:
            addForm.value.recurrenceType === 'custom_days' ? addForm.value.intervalDays : undefined,
          weekdayMask:
            addForm.value.recurrenceType === 'weekly_on_day' ||
            addForm.value.recurrenceType === 'weekly'
              ? addForm.value.weekdayMask
              : undefined,
        }
      }
      await listsApi.createItem(
        addForm.value.listId,
        payload as Parameters<typeof listsApi.createItem>[1]
      )
      closeAddModal()
      await loadData()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string }
      addError.value =
        e?.response?.data?.message ?? e?.message ?? 'Failed to add item. Please try again.'
    } finally {
      adding.value = false
    }
  }

  // ── Hover popup state ──────────────────────────────────────────────────────
  const hoverItem = ref<CalendarItem | null>(null)
  const hoverCompletion = ref<CalendarCompletion | null>(null)
  const hoverPos = ref({ x: 0, y: 0 })
  const hoverVisible = ref(false)
  let hideTimer: ReturnType<typeof setTimeout> | null = null

  const POPUP_WIDTH = 260 // px – must match CSS max-width

  function positionFromRect(rect: DOMRect) {
    const vw = window.innerWidth
    const vh = window.innerHeight
    // Preferred: below the chip, left-aligned to it
    let x = rect.left
    let y = rect.bottom + 6
    // Clamp right edge
    if (x + POPUP_WIDTH > vw - 8) x = vw - POPUP_WIDTH - 8
    if (x < 8) x = 8
    // If would overflow bottom, show above
    const estimatedHeight = 140
    if (y + estimatedHeight > vh - 8) {
      y = rect.top - estimatedHeight - 6
    }
    return { x, y }
  }

  function showItemHover(event: MouseEvent, item: CalendarItem) {
    cancelHide()
    hoverItem.value = item
    hoverCompletion.value = null
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    hoverPos.value = positionFromRect(rect)
    hoverVisible.value = true
  }

  function showCompletionHover(event: MouseEvent, c: CalendarCompletion) {
    cancelHide()
    hoverCompletion.value = c
    hoverItem.value = null
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    hoverPos.value = positionFromRect(rect)
    hoverVisible.value = true
  }

  function scheduleHide() {
    hideTimer = setTimeout(() => {
      hoverVisible.value = false
    }, 180)
  }

  function cancelHide() {
    if (hideTimer !== null) {
      clearTimeout(hideTimer)
      hideTimer = null
    }
  }

  /** Returns the most recent completion for an item within the loaded calendar range */
  function latestCompletion(itemId: string): CalendarCompletion | undefined {
    return completionList.value
      .filter((c) => c.itemId === itemId)
      .sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1))[0]
  }

  // ── Weekday bitmask → human label ─────────────────────────────────────────
  const WEEKDAY_NAMES: Record<number, string> = {
    1: 'Sunday',
    2: 'Monday',
    4: 'Tuesday',
    8: 'Wednesday',
    16: 'Thursday',
    32: 'Friday',
    64: 'Saturday',
  }
  function bitmaskToLabels(mask: number | null | undefined): string {
    if (!mask) return 'Monday'
    const names = Object.entries(WEEKDAY_NAMES)
      .filter(([bit]) => mask & Number(bit))
      .map(([, name]) => name)
    return names.join(', ') || 'Monday'
  }

  function recurrenceText(rule: RecurrenceRule): string {
    switch (rule.type) {
      case 'daily':
        return 'Every day'
      case 'weekly':
        return `Every week on ${bitmaskToLabels(rule.weekdayMask)}`
      case 'weekly_on_day':
        return `Every ${WEEKDAY_NAMES[rule.weekdayMask ?? 2] ?? 'Monday'}`
      case 'monthly_on_day':
        return `Monthly on day ${rule.dayOfMonth ?? '?'}`
      case 'custom_days':
        return `Every ${rule.intervalDays ?? '?'} days`
      case 'yearly':
        return 'Once a year'
      default:
        return ''
    }
  }

  // ── Data loading ───────────────────────────────────────────────────────────
  async function loadData() {
    const from = startOfWeek(startOfMonth(currentMonth.value))
    const to = endOfWeek(endOfMonth(currentMonth.value))
    const { items: fetchedItems, completions: fetchedCompletions } = await calendarApi.getRange(
      from,
      to
    )
    items.value = fetchedItems
    completionList.value = fetchedCompletions
  }

  onMounted(async () => {
    document.addEventListener('click', handleDocumentClick, true)
    allLists.value = await listsApi.getAll()
    visibleListIds.value = new Set(allLists.value.map((l) => l.id))
    await loadData()
  })

  onUnmounted(() => {
    document.removeEventListener('click', handleDocumentClick, true)
  })

  watch(currentMonth, loadData)

  function prevMonth() {
    currentMonth.value = subMonths(currentMonth.value, 1)
  }
  function nextMonth() {
    currentMonth.value = addMonths(currentMonth.value, 1)
  }

  const calendarCells = computed(() => {
    const from = startOfWeek(startOfMonth(currentMonth.value))
    const to = endOfWeek(endOfMonth(currentMonth.value))
    return eachDayOfInterval({ start: from, end: to }).map((date) => ({
      key: date.toISOString(),
      date,
      day: date.getDate(),
      inMonth: isSameMonth(date, currentMonth.value),
      isToday: isToday(date),
      items: items.value.filter(
        (item) =>
          item.dueDate &&
          isSameDay(parseISO(item.dueDate), date) &&
          visibleListIds.value.has(item.listId)
      ),
      completions: completionList.value.filter(
        (c) =>
          c.dueDateSnapshot &&
          isSameDay(parseISO(c.dueDateSnapshot), date) &&
          visibleListIds.value.has(c.listId)
      ),
    }))
  })

  function formatDate(iso: string) {
    return format(parseISO(iso), 'dd MMM yyyy')
  }

  function formatDateTime(iso: string) {
    return format(parseISO(iso), 'dd MMM yyyy HH:mm')
  }

  function openUndoModal(completion: CalendarCompletion) {
    undoTarget.value = completion
  }

  async function confirmUndo() {
    if (!undoTarget.value) return
    undoing.value = true
    try {
      await itemsApi.deleteCompletion(undoTarget.value.id)
      undoTarget.value = null
      // Reload the full calendar data so the item reappears as an upcoming
      // (uncompleted) entry with its reverted due date.
      await loadData()
    } finally {
      undoing.value = false
    }
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(icalUrls.value.webcal)
      copied.value = true
      setTimeout(() => (copied.value = false), 2000)
    } catch {
      // Fallback: select the input text
      icalInput.value?.select()
    }
  }
</script>

<style scoped>
  .cal-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
    flex-wrap: wrap;
  }
  .cal-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-bottom: 1rem;
  }
  .cal-filter-chip {
    padding: 0.2rem 0.75rem;
    border-radius: 999px;
    border: 1px solid var(--color-border);
    background: var(--color-surface-sunken);
    color: var(--color-text-muted);
    font-size: 0.78rem;
    cursor: pointer;
    transition:
      background 0.15s,
      color 0.15s,
      border-color 0.15s;
  }
  .cal-filter-chip--active {
    background: #3b82f6;
    color: #fff;
    border-color: #3b82f6;
  }
  .cal-filter-chip:hover:not(.cal-filter-chip--active) {
    background: var(--color-surface);
    color: var(--color-text);
  }
  .nav-btn {
    font-size: 1.1rem;
    padding: 0.3rem 0.7rem;
  }
  /* Month/Year heading button */
  .cal-heading-btn {
    background: transparent;
    border: 1px solid transparent;
    border-radius: 6px;
    padding: 0.3rem 0.65rem;
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--color-text);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.35rem;
    transition:
      background 0.15s,
      border-color 0.15s;
  }
  .cal-heading-btn:hover {
    background: var(--color-surface-sunken);
    border-color: var(--color-border);
  }
  .cal-heading-caret {
    font-size: 0.7rem;
    color: var(--color-text-muted);
  }
  /* Today button – dimmed when already on current month */
  .today-btn {
    font-size: 0.82rem;
  }
  .today-btn-active {
    opacity: 0.45;
    pointer-events: none;
  }
  .add-btn {
    font-size: 0.85rem;
  }
  .ical-btn {
    margin-left: auto;
    font-size: 0.85rem;
  }

  /* ── Month/Year picker ────────────────────────────────────── */
  .month-picker {
    position: fixed;
    z-index: 600;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 10px;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
    padding: 0.75rem;
    min-width: 220px;
    animation: mp-in 0.1s ease;
  }
  @keyframes mp-in {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-6px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }
  .month-picker-year-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.6rem;
  }
  .month-picker-year-label {
    font-weight: 700;
    font-size: 0.95rem;
    color: var(--color-text);
  }
  .month-picker-year-nav {
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    width: 26px;
    height: 26px;
    cursor: pointer;
    font-size: 0.9rem;
    color: var(--color-text);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.12s;
  }
  .month-picker-year-nav:hover {
    background: var(--color-surface-sunken);
  }
  .month-picker-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
  }
  .month-picker-btn {
    background: transparent;
    border: 1px solid transparent;
    border-radius: 6px;
    padding: 0.35rem 0;
    font-size: 0.85rem;
    cursor: pointer;
    color: var(--color-text);
    text-align: center;
    transition:
      background 0.12s,
      border-color 0.12s;
  }
  .month-picker-btn:hover {
    background: var(--color-surface-sunken);
    border-color: var(--color-border);
  }
  .month-picker-btn.active {
    background: var(--color-primary);
    color: var(--color-primary-text, #fff);
    border-color: var(--color-primary);
    font-weight: 600;
  }

  /* ── Calendar grid ────────────────────────────────────────── */
  .cal-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
    background: var(--color-border);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    overflow: hidden;
  }
  .cal-day-label {
    background: var(--color-surface-sunken);
    text-align: center;
    padding: 0.4rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-text-muted);
  }
  .cal-cell {
    background: var(--color-surface);
    min-height: 90px;
    padding: 0.4rem;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }
  .cal-cell-other {
    background: var(--color-bg);
    opacity: 0.7;
  }
  .cal-cell-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.15rem;
  }
  .cal-cell-today .cal-date-num {
    background: var(--color-primary);
    color: var(--color-primary-text);
    border-radius: 50%;
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.8rem;
  }
  .cal-date-num {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-text);
  }
  /* Per-day "+" button — hidden until cell is hovered */
  .cal-add-day-btn {
    display: none;
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    width: 18px;
    height: 18px;
    font-size: 0.75rem;
    line-height: 1;
    cursor: pointer;
    color: var(--color-text-muted);
    padding: 0;
    align-items: center;
    justify-content: center;
    transition:
      background 0.12s,
      color 0.12s;
  }
  .cal-add-day-btn:hover {
    background: var(--color-primary);
    color: #fff;
    border-color: var(--color-primary);
  }
  .cal-cell:hover .cal-add-day-btn {
    display: flex;
  }
  .cal-items {
    display: flex;
    flex-direction: column;
    gap: 1px;
    overflow: hidden;
  }

  /* ── Calendar item chips ──────────────────────────────────── */
  .cal-item {
    font-size: 0.72rem;
    padding: 0.1rem 0.35rem;
    border-radius: 4px;
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: opacity 0.15s;
  }
  .cal-item:hover {
    opacity: 0.8;
  }

  /* Upcoming items – urgency colours */
  .cal-item-low {
    background: var(--urgency-low-bg);
    color: var(--urgency-low-text);
  }
  .cal-item-medium {
    background: var(--urgency-med-bg);
    color: var(--urgency-med-text);
  }
  .cal-item-high {
    background: var(--urgency-high-bg);
    color: var(--urgency-high-text);
  }
  .cal-item-overdue {
    background: var(--urgency-over-bg);
    color: var(--urgency-over-text);
  }
  .cal-item-none {
    background: var(--color-border);
    color: var(--color-text-muted);
  }

  /* Completed items – green with strikethrough */
  .cal-item-done {
    background: var(--color-done-bg, #bbf7d0);
    color: var(--color-done-text, #166534);
    text-decoration: line-through;
    opacity: 0.85;
  }
  [data-theme='dark'] .cal-item-done {
    background: var(--color-done-bg-dark, #14532d);
    color: var(--color-done-text-dark, #86efac);
  }

  /* ── Hover popup ──────────────────────────────────────────── */
  .hover-popup {
    position: fixed;
    z-index: 500;
    max-width: 260px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.18);
    padding: 0.65rem 0.85rem;
    pointer-events: auto;
    animation: hp-in 0.1s ease;
  }
  @keyframes hp-in {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .hp-title {
    font-weight: 600;
    font-size: 0.88rem;
    color: var(--color-text);
    margin-bottom: 0.25rem;
    word-break: break-word;
  }
  .hp-done {
    color: var(--urgency-low-text, #166534);
  }
  .hp-list {
    font-size: 0.78rem;
    color: var(--color-text-muted);
    margin-bottom: 0.4rem;
  }
  .hp-desc {
    font-size: 0.78rem;
    color: var(--color-text-muted);
    margin-bottom: 0.4rem;
    word-break: break-word;
  }
  .hp-row {
    display: flex;
    gap: 0.5rem;
    font-size: 0.78rem;
    color: var(--color-text);
    margin-top: 0.2rem;
  }
  .hp-label {
    color: var(--color-text-muted);
    min-width: 64px;
    flex-shrink: 0;
  }
  .hp-note {
    font-style: italic;
    word-break: break-word;
  }
  .hp-hint {
    font-size: 0.72rem;
    color: var(--color-text-faint);
    margin: 0.5rem 0 0;
    text-align: right;
  }

  /* ── Modals ───────────────────────────────────────────────── */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
    padding: 1rem;
  }
  .modal {
    max-width: 440px;
    width: 100%;
    animation: modal-in 0.15s ease;
    max-height: 90vh;
    overflow-y: auto;
  }
  .modal-wide {
    max-width: 520px;
  }
  @keyframes modal-in {
    from {
      opacity: 0;
      transform: translateY(-12px) scale(0.97);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  .modal h2 {
    margin-top: 0;
    font-size: 1.15rem;
  }
  .modal p {
    margin: 0.5rem 0;
  }
  .modal-hint {
    font-size: 0.82rem;
    color: var(--color-text-muted);
  }
  .modal-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
    margin-top: 1.25rem;
  }

  /* ── Form elements (reused in add modal) ─────────────────── */
  .form-group {
    margin-bottom: 0.85rem;
  }
  .form-label {
    display: block;
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--color-text-muted);
    margin-bottom: 0.3rem;
  }
  .form-input {
    width: 100%;
    padding: 0.45rem 0.65rem;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    font-size: 0.9rem;
    background: var(--color-surface);
    color: var(--color-text);
    box-sizing: border-box;
  }
  .form-input:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px var(--color-primary-ring, rgba(99, 102, 241, 0.15));
  }
  .form-error {
    font-size: 0.82rem;
    color: var(--urgency-over-text, #b91c1c);
    margin: 0.5rem 0 0;
  }

  /* ── iCal dialog extras ───────────────────────────────────── */
  .ical-dialog {
    max-width: 500px;
  }
  .ical-label {
    display: block;
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--color-text-muted);
    margin: 1rem 0 0.35rem;
  }
  .ical-url-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  .input {
    padding: 0.45rem 0.65rem;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    font-size: 0.9rem;
    background: var(--color-surface);
    color: var(--color-text);
  }
  .ical-input {
    flex: 1;
    font-size: 0.78rem;
    font-family: monospace;
    background: var(--color-surface-sunken);
    color: var(--color-text);
    cursor: text;
    user-select: all;
  }
  .ical-actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-top: 1rem;
  }
  .ical-tip {
    margin-top: 0.75rem;
    padding: 0.5rem 0.75rem;
    border-left: 3px solid var(--color-border);
    background: var(--color-surface-sunken);
    border-radius: 0 4px 4px 0;
  }
  .modal-close-btn {
    margin-top: 1.25rem;
    width: 100%;
  }

  /* ── Responsive ───────────────────────────────────────────── */
  @media (max-width: 640px) {
    .ical-btn {
      margin-left: 0;
    }
    .cal-cell {
      min-height: 60px;
    }
    .cal-item {
      display: none;
    }
    .cal-cell:has(.cal-item) .cal-date-num::after {
      content: '•';
      color: var(--color-primary);
    }
  }
</style>
