<template>
  <div>
    <div class="cal-header">
      <button class="btn btn-secondary" @click="prevMonth">‹</button>
      <h1>{{ format(currentMonth, 'MMMM yyyy') }}</h1>
      <button class="btn btn-secondary" @click="nextMonth">›</button>
    </div>

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
        <span class="cal-date-num">{{ cell.day }}</span>
        <div class="cal-items">
          <div
            v-for="item in cell.items"
            :key="item.id"
            class="cal-item"
            :class="`cal-item-${computeUrgencyLevel(item.dueDate)}`"
            :title="item.title"
            @click="$router.push(`/lists/${item.listId}`)"
          >
            {{ item.title }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, watch } from 'vue'
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
  import type { CalendarItem } from '../types'
  import { computeUrgencyLevel } from '../composables/useUrgency'

  const currentMonth = ref(startOfMonth(new Date()))
  const items = ref<CalendarItem[]>([])
  const weekDayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  async function loadItems() {
    const from = startOfWeek(startOfMonth(currentMonth.value))
    const to = endOfWeek(endOfMonth(currentMonth.value))
    items.value = await calendarApi.getRange(from, to)
  }

  onMounted(loadItems)
  watch(currentMonth, loadItems)

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
      day: date.getDate(),
      inMonth: isSameMonth(date, currentMonth.value),
      isToday: isToday(date),
      items: items.value.filter((item) => item.dueDate && isSameDay(parseISO(item.dueDate), date)),
    }))
  })
</script>

<style scoped>
  .cal-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  .cal-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
    background: #e2e8f0;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
  }
  .cal-day-label {
    background: #f1f5f9;
    text-align: center;
    padding: 0.4rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: #475569;
  }
  .cal-cell {
    background: white;
    min-height: 90px;
    padding: 0.4rem;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }
  .cal-cell-other {
    background: #f8fafc;
    opacity: 0.6;
  }
  .cal-cell-today .cal-date-num {
    background: #3b82f6;
    color: white;
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
    color: #374151;
    margin-bottom: 0.2rem;
  }
  .cal-items {
    display: flex;
    flex-direction: column;
    gap: 1px;
    overflow: hidden;
  }
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
  .cal-item:hover { opacity: 0.8; }
  .cal-item-low      { background: #bbf7d0; color: #166534; }
  .cal-item-medium   { background: #fef08a; color: #854d0e; }
  .cal-item-high     { background: #fed7aa; color: #c2410c; }
  .cal-item-overdue  { background: #fecaca; color: #dc2626; }
  .cal-item-none     { background: #e2e8f0; color: #475569; }

  @media (max-width: 640px) {
    .cal-cell { min-height: 60px; }
    .cal-item { display: none; }
    .cal-cell:has(.cal-item) .cal-date-num::after {
      content: '•';
      color: #3b82f6;
    }
  }
</style>
