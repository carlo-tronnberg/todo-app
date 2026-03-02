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
          <tr v-for="entry in entries" :key="entry.id">
            <td class="audit-time">{{ formatDateTime(entry.createdAt) }}</td>
            <td>
              <span class="audit-action">{{ entry.action }}</span>
            </td>
            <td class="audit-entity">{{ entry.entityType }}</td>
            <td class="audit-summary">{{ entry.summary ?? '—' }}</td>
          </tr>
        </tbody>
      </table>

      <div v-if="hasMore" class="load-more">
        <button class="btn btn-secondary" :disabled="loadingMore" @click="loadMore">
          {{ loadingMore ? 'Loading…' : 'Load more' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { format, parseISO } from 'date-fns'
  import { authApi } from '../api/auth.api'
  import type { AuditLog } from '../types'

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
  .load-more {
    padding: 0.75rem;
    text-align: center;
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
