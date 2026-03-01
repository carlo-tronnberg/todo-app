<template>
  <div
    class="todo-item"
    :class="[`urgency-${urgency.level.value}`]"
    :style="{ backgroundColor: urgency.backgroundColor.value }"
  >
    <div class="todo-item-left">
      <button
        class="complete-btn"
        :title="'Mark complete'"
        :aria-label="`Complete: ${item.title}`"
        @click.stop="$emit('complete', item.id)"
      >
        ✓
      </button>
      <div class="todo-item-body">
        <span class="todo-title">{{ item.title }}</span>
        <span v-if="item.description" class="todo-desc">{{ item.description }}</span>
        <div class="todo-meta">
          <span v-if="item.dueDate" class="meta-pill" :class="`meta-${urgency.level.value}`">
            {{ urgency.label.value || formatDueDate(item.dueDate) }}
            · {{ formatDueDate(item.dueDate) }}
          </span>
          <span v-if="item.recurrenceRule && item.recurrenceRule.type !== 'none'" class="meta-pill meta-recurrence">
            ↻ {{ recurrenceLabel(item.recurrenceRule) }}
          </span>
        </div>
      </div>
    </div>

    <div class="todo-item-actions">
      <router-link :to="`/history/${item.id}`" class="icon-btn" title="View history">⏱</router-link>
      <button class="icon-btn" title="Edit" @click.stop="$emit('edit', item)">✎</button>
      <button class="icon-btn icon-btn-danger" title="Archive" @click.stop="$emit('archive', item.id)">🗑</button>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { format, parseISO } from 'date-fns'
  import type { TodoItem, RecurrenceRule } from '../../types'
  import { useUrgency } from '../../composables/useUrgency'

  const props = defineProps<{ item: TodoItem }>()
  defineEmits<{
    complete: [id: string]
    edit: [item: TodoItem]
    archive: [id: string]
  }>()

  const urgency = useUrgency(props.item.dueDate, props.item.colorOverride)

  function formatDueDate(iso: string) {
    return format(parseISO(iso), 'dd MMM yyyy')
  }

  function recurrenceLabel(rule: RecurrenceRule): string {
    switch (rule.type) {
      case 'daily': return 'Daily'
      case 'weekly': return 'Weekly'
      case 'monthly_on_day': return `Monthly (day ${rule.dayOfMonth ?? '?'})`
      case 'custom_days': return `Every ${rule.intervalDays ?? '?'} days`
      default: return ''
    }
  }
</script>

<style scoped>
  .todo-item {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    border: 1px solid rgba(0, 0, 0, 0.06);
    transition: background-color 0.3s ease;
    gap: 0.75rem;
  }
  .todo-item-left {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    flex: 1;
    min-width: 0;
  }
  .complete-btn {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 2px solid #94a3b8;
    background: white;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 2px;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
  }
  .complete-btn:hover {
    border-color: #22c55e;
    background: #f0fdf4;
    color: #22c55e;
  }
  .todo-item-body {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
  }
  .todo-title {
    font-weight: 500;
    word-break: break-word;
  }
  .todo-desc {
    font-size: 0.85rem;
    color: #64748b;
    word-break: break-word;
  }
  .todo-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-top: 0.25rem;
  }
  .meta-pill {
    font-size: 0.75rem;
    padding: 0.1rem 0.5rem;
    border-radius: 99px;
    background: rgba(0, 0, 0, 0.06);
  }
  .meta-overdue { background: #fee2e2; color: #dc2626; }
  .meta-high    { background: #ffedd5; color: #c2410c; }
  .meta-medium  { background: #fef9c3; color: #854d0e; }
  .meta-low     { background: #dcfce7; color: #166534; }
  .meta-recurrence { background: #e0e7ff; color: #4338ca; }

  .todo-item-actions {
    display: flex;
    gap: 0.25rem;
    flex-shrink: 0;
  }
  .icon-btn {
    background: transparent;
    border: none;
    padding: 0.3rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
    text-decoration: none;
    color: inherit;
    transition: background 0.15s;
  }
  .icon-btn:hover {
    background: rgba(0, 0, 0, 0.07);
  }
  .icon-btn-danger:hover {
    background: #fee2e2;
  }
</style>
