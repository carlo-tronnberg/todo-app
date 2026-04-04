<template>
  <div
    class="todo-item"
    :class="[`urgency-${urgencyLevel}`]"
    :style="item.colorOverride ? { backgroundColor: item.colorOverride } : {}"
  >
    <!-- Complete button -->
    <button
      class="complete-btn"
      title="Mark complete"
      :aria-label="`Complete: ${item.title}`"
      @click.stop="$emit('complete', item.id)"
    >
      ✓
    </button>

    <!-- Body -->
    <div class="todo-item-body">
      <span class="todo-title">{{ item.title }}</span>
      <span v-if="item.description" class="todo-desc">{{ item.description }}</span>

      <div class="todo-meta">
        <!-- Due date + urgency badge -->
        <span v-if="item.dueDate" class="meta-pill" :class="`meta-urgency meta-${urgencyLevel}`">
          {{ urgencyIcon }} {{ dueDateLabel }}
        </span>

        <!-- Recurrence badge — always visible when rule exists -->
        <span
          v-if="item.recurrenceRule && item.recurrenceRule.type !== 'none'"
          class="meta-pill meta-recurrence"
          :title="recurrenceDetail"
        >
          ↻ {{ recurrenceLabel }}
        </span>

        <!-- Amount badge -->
        <span v-if="amountLabel" class="meta-pill meta-amount">
          {{ amountLabel }}
        </span>
      </div>
    </div>

    <!-- Actions -->
    <div class="todo-item-actions">
      <a
        v-if="item.url"
        :href="item.url"
        target="_blank"
        rel="noopener noreferrer"
        class="icon-btn url-link"
        title="Open link"
        @click.stop
      >
        🔗
      </a>
      <button
        class="icon-btn"
        title="View completion history"
        @click.stop="$emit('history', item.id)"
      >
        ⏱
      </button>
      <button class="icon-btn" title="Duplicate item" @click.stop="$emit('duplicate', item.id)">
        ⎘
      </button>
      <button class="icon-btn" title="Edit item" @click.stop="$emit('edit', item)">✎</button>
      <button
        class="icon-btn icon-btn-danger"
        title="Archive item"
        @click.stop="$emit('archive', item.id)"
      >
        🗑
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { format, parseISO, differenceInDays, startOfDay } from 'date-fns'
  import type { TodoItem, UrgencyLevel } from '../../types'

  const props = defineProps<{ item: TodoItem }>()
  defineEmits<{
    complete: [id: string]
    edit: [item: TodoItem]
    archive: [id: string]
    duplicate: [id: string]
    history: [id: string]
  }>()

  // ── Urgency ────────────────────────────────────────────────────────────────
  const urgencyLevel = computed<UrgencyLevel>(() => {
    if (!props.item.dueDate) return 'none'
    const days = differenceInDays(startOfDay(parseISO(props.item.dueDate)), startOfDay(new Date()))
    if (days < 0) return 'overdue'
    if (days === 0) return 'overdue'
    if (days <= 3) return 'high'
    if (days <= 7) return 'medium'
    return 'low'
  })

  const urgencyIcon = computed(() => {
    switch (urgencyLevel.value) {
      case 'overdue':
        return '🔴'
      case 'high':
        return '🟠'
      case 'medium':
        return '🟡'
      case 'low':
        return '🟢'
      default:
        return ''
    }
  })

  const dueDateLabel = computed(() => {
    if (!props.item.dueDate) return ''
    const date = parseISO(props.item.dueDate)
    const days = differenceInDays(startOfDay(date), startOfDay(new Date()))
    const formatted = format(date, 'dd MMM yyyy')
    if (days < 0) return `Overdue · ${formatted}`
    if (days === 0) return `Due today · ${formatted}`
    if (days === 1) return `Due tomorrow · ${formatted}`
    if (days <= 7) return `Due in ${days}d · ${formatted}`
    return `Due ${formatted}`
  })

  // ── Amount ─────────────────────────────────────────────────────────────────
  const amountLabel = computed(() => {
    const raw = props.item.amount
    if (raw == null || raw === '') return ''
    const num = parseFloat(raw)
    if (isNaN(num)) return ''
    const cur = props.item.currency
    if (cur) {
      try {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur }).format(num)
      } catch {
        // Invalid currency code — fall through to plain number
      }
    }
    return new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num)
  })

  // ── Recurrence ─────────────────────────────────────────────────────────────

  // Bitmask → human-readable weekday name (Sun=bit0, Mon=bit1 … Sat=bit6)
  const WEEKDAY_NAMES: Record<number, string> = {
    1: 'Sunday',
    2: 'Monday',
    4: 'Tuesday',
    8: 'Wednesday',
    16: 'Thursday',
    32: 'Friday',
    64: 'Saturday',
  }

  function weekdayName(mask: number | null | undefined): string {
    if (!mask) return 'Monday'
    return WEEKDAY_NAMES[mask] ?? 'Monday'
  }

  const recurrenceLabel = computed(() => {
    const rule = props.item.recurrenceRule
    if (!rule || rule.type === 'none') return ''
    const n = rule.interval ?? 1
    switch (rule.type) {
      case 'daily':
        return n === 1 ? 'Daily' : `Every ${n} days`
      case 'weekly':
        return n === 1 ? 'Weekly' : `Every ${n} weeks`
      case 'weekly_on_day':
        return n === 1 ? `Every ${weekdayName(rule.weekdayMask)}` : `Every ${n} weeks`
      case 'monthly_on_day':
        return n === 1
          ? `Monthly on day ${rule.dayOfMonth ?? '?'}`
          : `Every ${n} months on day ${rule.dayOfMonth ?? '?'}`
      case 'custom_days':
        return `Every ${rule.intervalDays ?? '?'} days`
      case 'yearly':
        return n === 1 ? 'Yearly' : `Every ${n} years`
      default:
        return ''
    }
  })

  // Full tooltip detail for the recurrence badge
  const recurrenceDetail = computed(() => {
    const rule = props.item.recurrenceRule
    if (!rule || rule.type === 'none') return ''
    switch (rule.type) {
      case 'daily':
        return 'Repeats every day'
      case 'weekly':
        return 'Repeats weekly (multiple days)'
      case 'weekly_on_day':
        return `Repeats every week on ${weekdayName(rule.weekdayMask)}`
      case 'monthly_on_day':
        return `Repeats monthly on day ${rule.dayOfMonth ?? '?'}`
      case 'custom_days':
        return `Repeats every ${rule.intervalDays ?? '?'} days`
      case 'yearly':
        return 'Repeats once a year on the same date'
      default:
        return ''
    }
  })
</script>

<style scoped>
  .todo-item {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    border: 1px solid rgba(0, 0, 0, 0.06);
    transition: background-color 0.25s ease;
  }

  [data-theme='dark'] .todo-item {
    border-color: rgba(255, 255, 255, 0.06);
  }

  /* ── Complete button ── */
  .complete-btn {
    width: 28px;
    height: 28px;
    flex-shrink: 0;
    margin-top: 2px;
    border-radius: 50%;
    border: 2px solid var(--color-text-faint);
    background: transparent;
    font-size: 0.85rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition:
      border-color 0.15s,
      background 0.15s,
      color 0.15s;
    color: transparent; /* hide checkmark until hover */
  }
  .complete-btn:hover {
    border-color: #22c55e;
    background: #f0fdf4;
    color: #22c55e;
  }
  [data-theme='dark'] .complete-btn:hover {
    background: #14532d;
    border-color: #4ade80;
    color: #4ade80;
  }

  /* ── Body ── */
  .todo-item-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }
  .todo-title {
    font-weight: 500;
    word-break: break-word;
    color: var(--color-text);
  }
  .todo-desc {
    font-size: 0.85rem;
    color: var(--color-text-muted);
    word-break: break-word;
  }

  /* ── Meta pills row ── */
  .todo-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-top: 0.3rem;
  }
  .meta-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.73rem;
    padding: 0.15rem 0.55rem;
    border-radius: 99px;
    background: var(--pill-default-bg);
    color: var(--color-text-muted);
    white-space: nowrap;
  }

  /* Urgency variants */
  .meta-overdue {
    background: var(--urgency-over-bg);
    color: var(--urgency-over-text);
    font-weight: 600;
  }
  .meta-high {
    background: var(--urgency-high-bg);
    color: var(--urgency-high-text);
    font-weight: 600;
  }
  .meta-medium {
    background: var(--urgency-med-bg);
    color: var(--urgency-med-text);
  }
  .meta-low {
    background: var(--urgency-low-bg);
    color: var(--urgency-low-text);
  }

  /* Amount badge */
  .meta-amount {
    background: var(--pill-default-bg);
    color: var(--color-text-muted);
    font-variant-numeric: tabular-nums;
  }

  /* Recurrence badge */
  .meta-recurrence {
    background: var(--pill-recurrence-bg);
    color: var(--pill-recurrence-text);
    font-weight: 500;
    cursor: help;
  }

  /* ── Actions ── */
  .todo-item-actions {
    display: flex;
    gap: 0.2rem;
    flex-shrink: 0;
    align-items: flex-start;
    padding-top: 2px;
  }
  .icon-btn {
    background: transparent;
    border: none;
    padding: 0.3rem 0.35rem;
    border-radius: 5px;
    cursor: pointer;
    font-size: 1rem;
    text-decoration: none;
    color: var(--color-text-muted);
    transition:
      background 0.15s,
      color 0.15s;
    line-height: 1;
  }
  .icon-btn:hover {
    background: var(--pill-default-bg);
    color: var(--color-text);
  }
  .icon-btn-danger:hover {
    background: var(--urgency-over-bg);
    color: var(--urgency-over-text);
  }

  @media (min-width: 768px) {
    .icon-btn {
      font-size: 1.15rem;
      padding: 0.35rem 0.4rem;
    }
  }
</style>
