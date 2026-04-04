<template>
  <div>
    <h1 style="margin-bottom: 1.5rem">Change Log</h1>

    <div v-if="loading" class="loading">Loading…</div>

    <div v-else-if="entries.length === 0" class="empty-state card">
      <p>No activity recorded yet.</p>
    </div>

    <div v-else class="audit-table card">
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Action</th>
            <th>Type</th>
            <th>Summary</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="entry in entries"
            :key="entry.id"
            :class="{ clickable: isItemEntry(entry) }"
            @click="handleRowClick(entry)"
          >
            <td class="audit-time">{{ formatDateTime(entry.createdAt) }}</td>
            <td>
              <span class="audit-action">{{ entry.action }}</span>
            </td>
            <td class="audit-entity">{{ entry.entityType }}</td>
            <td class="audit-summary">
              {{ entry.summary ?? '—' }}
              <span v-if="isItemEntry(entry)" class="detail-hint">🔍</span>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="hasMore" class="load-more">
        <button class="btn btn-secondary" :disabled="loadingMore" @click="loadMore">
          {{ loadingMore ? 'Loading…' : 'Load more' }}
        </button>
      </div>
    </div>
    <!-- Item detail modal -->
    <div v-if="detailItem || detailLoading || detailNotFound" class="modal-backdrop">
      <div class="modal card" role="dialog" aria-modal="true" aria-label="Item Detail">
        <div v-if="detailLoading" class="loading">Loading…</div>

        <div v-else-if="detailNotFound">
          <h2>Item not found</h2>
          <p class="detail-not-found">
            This item has been deleted or archived and is no longer available.
          </p>
        </div>

        <template v-else-if="detailItem">
          <h2>{{ detailItem.title }}</h2>
          <div v-if="detailItem.description" class="detail-desc">{{ detailItem.description }}</div>

          <div class="detail-fields">
            <div v-if="detailItem.dueDate" class="detail-field">
              <strong>Due:</strong> {{ formatDate(detailItem.dueDate) }}
            </div>
            <div v-if="detailItem.amount" class="detail-field">
              <strong>Amount:</strong> {{ detailItem.amount }} {{ detailItem.currency }}
            </div>
            <div
              v-if="detailItem.recurrenceRule && detailItem.recurrenceRule.type !== 'none'"
              class="detail-field"
            >
              <strong>Recurrence:</strong> {{ detailItem.recurrenceRule.type }}
            </div>
          </div>

          <div v-if="detailCompletions.length > 0" class="detail-completions">
            <h3>Completions ({{ detailCompletions.length }})</h3>
            <div v-for="c in detailCompletions" :key="c.id" class="detail-completion-entry">
              <span class="detail-completion-date">{{ formatDateTime(c.completedAt) }}</span>
              <span v-if="c.amount" class="detail-completion-amount"
                >{{ c.amount }} {{ c.currency }}</span
              >
              <span v-if="c.note" class="detail-completion-note">{{ c.note }}</span>
            </div>
          </div>
          <div v-else class="detail-no-completions">No completions recorded.</div>
        </template>

        <div class="modal-actions">
          <button class="btn btn-secondary" @click="closeDetail">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { format, parseISO } from 'date-fns'
  import { authApi } from '../api/auth.api'
  import { itemsApi } from '../api/items.api'
  import type { AuditLog, TodoItem, Completion } from '../types'

  const PAGE = 100

  const entries = ref<AuditLog[]>([])
  const loading = ref(true)
  const loadingMore = ref(false)
  const hasMore = ref(false)

  onMounted(async () => {
    try {
      const data = await authApi.getAuditLog({ limit: PAGE })
      entries.value = data
      hasMore.value = data.length === PAGE
    } finally {
      loading.value = false
    }
  })

  async function loadMore() {
    loadingMore.value = true
    try {
      const data = await authApi.getAuditLog({ limit: PAGE, offset: entries.value.length })
      entries.value.push(...data)
      hasMore.value = data.length === PAGE
    } finally {
      loadingMore.value = false
    }
  }

  function formatDateTime(iso: string) {
    return format(parseISO(iso), 'dd MMM yyyy HH:mm')
  }

  function formatDate(iso: string) {
    return format(parseISO(iso), 'dd MMM yyyy')
  }

  function isItemEntry(entry: AuditLog) {
    return entry.entityType === 'todo_item'
  }

  function handleRowClick(entry: AuditLog) {
    if (isItemEntry(entry)) {
      openDetail(entry.entityId)
    }
  }

  // ── Item detail modal ──────────────────────────────────────────────────
  const detailItem = ref<TodoItem | null>(null)
  const detailCompletions = ref<Completion[]>([])
  const detailLoading = ref(false)
  const detailNotFound = ref(false)

  async function openDetail(itemId: string) {
    detailLoading.value = true
    detailNotFound.value = false
    detailCompletions.value = []
    detailItem.value = null
    try {
      const [item, completions] = await Promise.all([
        itemsApi.getOne(itemId),
        itemsApi.getCompletions(itemId),
      ])
      detailItem.value = item
      detailCompletions.value = completions.sort(
        (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      )
    } catch {
      detailNotFound.value = true
    } finally {
      detailLoading.value = false
    }
  }

  function closeDetail() {
    detailItem.value = null
    detailNotFound.value = false
  }
</script>

<style scoped>
  .loading {
    text-align: center;
    padding: 2rem;
    color: var(--color-text-faint);
  }
  .empty-state {
    text-align: center;
    padding: 3rem;
    color: var(--color-text-muted);
  }
  .audit-table {
    overflow-x: auto;
    padding: 0;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }
  th {
    text-align: left;
    padding: 0.6rem 0.9rem;
    background: var(--color-surface-sunken);
    color: var(--color-text-muted);
    font-weight: 600;
    border-bottom: 1px solid var(--color-border);
  }
  td {
    padding: 0.55rem 0.9rem;
    border-bottom: 1px solid var(--color-border);
    vertical-align: top;
  }
  tr:last-child td {
    border-bottom: none;
  }
  .audit-time {
    white-space: nowrap;
    color: var(--color-text-muted);
    font-size: 0.8rem;
  }
  .audit-action {
    font-family: monospace;
    font-size: 0.8rem;
    background: var(--pill-default-bg);
    padding: 0.1rem 0.45rem;
    border-radius: 4px;
  }
  .audit-entity {
    color: var(--color-text-muted);
    font-size: 0.8rem;
  }
  .audit-summary {
    color: var(--color-text);
  }
  .detail-hint {
    font-size: 0.75rem;
    margin-left: 0.3rem;
    opacity: 0.5;
  }
  .clickable:hover .detail-hint {
    opacity: 1;
  }
  .load-more {
    padding: 0.75rem;
    text-align: center;
  }
  .clickable {
    cursor: pointer;
  }
  .clickable:hover {
    background: var(--color-surface-sunken);
  }

  /* Item detail modal */
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
    margin-bottom: 0.5rem;
    font-size: 1.2rem;
    font-weight: 600;
  }
  .modal h3 {
    font-size: 0.95rem;
    margin: 1rem 0 0.5rem;
  }
  .modal-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
    margin-top: 1rem;
  }
  .detail-desc {
    color: var(--color-text-muted);
    font-size: 0.9rem;
    margin-bottom: 0.75rem;
  }
  .detail-fields {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.875rem;
  }
  .detail-completions {
    border-top: 1px solid var(--color-border);
    margin-top: 0.75rem;
    padding-top: 0.25rem;
  }
  .detail-completion-entry {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0.35rem 0;
    border-bottom: 1px solid var(--color-border);
    font-size: 0.85rem;
    align-items: baseline;
  }
  .detail-completion-entry:last-child {
    border-bottom: none;
  }
  .detail-completion-date {
    color: var(--color-text-muted);
    font-size: 0.8rem;
  }
  .detail-completion-amount {
    font-weight: 500;
  }
  .detail-completion-note {
    color: var(--color-text-muted);
    font-style: italic;
  }
  .detail-not-found {
    color: var(--color-text-muted);
    font-size: 0.9rem;
    margin: 0.5rem 0;
  }
  .detail-no-completions {
    color: var(--color-text-faint);
    font-size: 0.85rem;
    margin-top: 0.75rem;
  }

  @media (max-width: 600px) {
    table {
      font-size: 0.75rem;
    }
    th,
    td {
      padding: 0.35rem 0.5rem;
    }
    .audit-time {
      font-size: 0.7rem;
    }
    .audit-action {
      font-size: 0.7rem;
    }
    .audit-entity {
      font-size: 0.7rem;
    }
  }
</style>
