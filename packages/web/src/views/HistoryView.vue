<template>
  <div>
    <router-link class="back-link" :to="listId ? `/lists/${listId}` : '/'">← Back</router-link>
    <h1 style="margin-bottom: 1.5rem">Completion History</h1>

    <div v-if="loading" class="loading">Loading…</div>

    <div v-else-if="completions.length === 0" class="empty-state card">
      <p>No completions recorded yet.</p>
    </div>

    <div v-else class="history-list">
      <div v-for="c in completions" :key="c.id" class="history-entry card">
        <div class="history-when">
          <strong>Completed:</strong> {{ formatDateTime(c.completedAt) }}
        </div>
        <div v-if="c.dueDateSnapshot" class="history-due">
          <strong>Was due:</strong> {{ formatDate(c.dueDateSnapshot) }}
        </div>
        <div v-if="c.note" class="history-note">{{ c.note }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { useRoute } from 'vue-router'
  import { format, parseISO } from 'date-fns'
  import { itemsApi } from '../api/items.api'
  import type { Completion } from '../types'

  const route = useRoute()
  const itemId = route.params.itemId as string
  const listId = route.query.listId as string | undefined

  const completions = ref<Completion[]>([])
  const loading = ref(true)

  onMounted(async () => {
    try {
      completions.value = await itemsApi.getCompletions(itemId)
      // Most recent first
      completions.value.sort(
        (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      )
    } finally {
      loading.value = false
    }
  })

  function formatDateTime(iso: string) {
    return format(parseISO(iso), 'dd MMM yyyy HH:mm')
  }
  function formatDate(iso: string) {
    return format(parseISO(iso), 'dd MMM yyyy')
  }
</script>

<style scoped>
  .back-link {
    font-size: 0.85rem;
    color: #64748b;
    display: block;
    margin-bottom: 0.5rem;
  }
  .history-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .history-entry {
    font-size: 0.9rem;
  }
  .history-when {
    margin-bottom: 0.25rem;
  }
  .history-due {
    color: #64748b;
  }
  .history-note {
    margin-top: 0.5rem;
    background: #f8fafc;
    border-left: 3px solid #e2e8f0;
    padding: 0.4rem 0.75rem;
    border-radius: 0 4px 4px 0;
    font-style: italic;
  }
  .empty-state {
    text-align: center;
    padding: 3rem;
    color: #64748b;
  }
  .loading {
    text-align: center;
    padding: 2rem;
    color: #94a3b8;
  }
</style>
