<template>
  <div class="modal-backdrop" @keydown.escape="$emit('close')">
    <div
      class="modal card history-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Completion History"
    >
      <h2>Completion History</h2>
      <div v-if="loading" class="loading">Loading…</div>
      <div v-else-if="completions.length === 0" class="empty-state">
        <p>No completions recorded yet.</p>
      </div>
      <div v-else class="history-list">
        <div v-for="c in completions" :key="c.id" class="history-entry">
          <div class="history-when">
            <strong>Completed:</strong> {{ formatDate(c.completedAt) }}
          </div>
          <div v-if="c.dueDateSnapshot" class="history-due">
            <strong>Was due:</strong>
            {{ formatDate(c.dueDateSnapshot).split(' ').slice(0, 3).join(' ') }}
          </div>
          <div v-if="c.amount" class="history-amount">
            <strong>Amount:</strong> {{ c.amount }} {{ c.currency
            }}{{ c.transactionType ? ` · ${c.transactionType}` : '' }}
          </div>
          <div v-if="c.note" class="history-note">{{ c.note }}</div>
          <div class="history-actions">
            <button class="btn btn-secondary btn-sm" @click="$emit('undo', c)">Undo</button>
          </div>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" @click="$emit('close')">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { format, parseISO } from 'date-fns'
  import type { Completion } from '../types'

  defineProps<{
    completions: Completion[]
    loading: boolean
  }>()

  defineEmits<{
    undo: [completion: Completion]
    close: []
  }>()

  function formatDate(iso: string) {
    return format(parseISO(iso), 'dd MMM yyyy HH:mm')
  }
</script>

<style scoped>
  .history-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-height: 60vh;
    overflow-y: auto;
  }
  .history-entry {
    font-size: 0.9rem;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--color-border);
  }
  .history-entry:last-child {
    border-bottom: none;
  }
  .history-when {
    margin-bottom: 0.25rem;
  }
  .history-due {
    color: var(--color-text-muted);
  }
  .history-amount {
    margin-top: 0.25rem;
  }
  .history-note {
    margin-top: 0.5rem;
    background: var(--color-surface-sunken);
    border-left: 3px solid var(--color-border);
    padding: 0.4rem 0.75rem;
    border-radius: 0 4px 4px 0;
    font-style: italic;
    color: var(--color-text-muted);
  }
  .history-actions {
    margin-top: 0.4rem;
    display: flex;
    justify-content: flex-end;
  }
  .btn-sm {
    font-size: 0.78rem;
    padding: 0.2rem 0.65rem;
  }
</style>
