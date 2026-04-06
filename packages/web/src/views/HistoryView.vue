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
        <div v-if="c.amount" class="history-amount">
          <strong>Amount:</strong> {{ c.amount }} {{ c.currency }}
        </div>
        <div v-if="c.note" class="history-note">{{ c.note }}</div>
        <div class="history-actions">
          <button
            v-if="listId"
            class="btn btn-secondary btn-sm"
            title="Create a new item pre-filled with this one's details"
            @click="createFromCompletion"
          >
            New item from this
          </button>
          <button class="btn btn-secondary btn-sm" @click="openUndoModal(c)">Undo</button>
        </div>
      </div>
    </div>

    <!-- Undo confirmation modal -->
    <Teleport to="body">
      <div v-if="undoTarget" class="modal-overlay">
        <div class="modal card" role="dialog" aria-modal="true" aria-label="Undo completion">
          <h2>Undo completion?</h2>
          <p>
            Remove the completion recorded on
            <strong>{{ formatDateTime(undoTarget.completedAt) }}</strong
            >?
          </p>
          <p v-if="undoTarget.dueDateSnapshot" class="modal-hint">
            If this is the latest completion and the task is recurring, the due date will be
            reverted to {{ formatDate(undoTarget.dueDateSnapshot) }}.
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
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { useEscapeKey } from '../composables/useEscapeKey'
  import { useRoute, useRouter } from 'vue-router'
  import { format, parseISO } from 'date-fns'
  import { itemsApi } from '../api/items.api'
  import type { Completion, TodoItem } from '../types'

  const route = useRoute()
  const router = useRouter()
  const itemId = route.params.itemId as string
  const listId = route.query.listId as string | undefined

  const completions = ref<Completion[]>([])
  const item = ref<TodoItem | null>(null)
  const loading = ref(true)

  // Undo state
  const undoTarget = ref<Completion | null>(null)
  const undoing = ref(false)

  onMounted(async () => {
    try {
      const [comps, fetchedItem] = await Promise.all([
        itemsApi.getCompletions(itemId),
        itemsApi.getOne(itemId),
      ])
      completions.value = comps
      item.value = fetchedItem
      // Most recent first
      completions.value.sort(
        (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      )
    } finally {
      loading.value = false
    }
  })

  function createFromCompletion() {
    if (!listId || !item.value) return
    const query: Record<string, string> = { prefillTitle: item.value.title }
    if (item.value.description) query.prefillDesc = item.value.description
    router.push({ path: `/lists/${listId}`, query })
  }

  function formatDateTime(iso: string) {
    return format(parseISO(iso), 'dd MMM yyyy HH:mm')
  }
  function formatDate(iso: string) {
    return format(parseISO(iso), 'dd MMM yyyy')
  }

  function openUndoModal(completion: Completion) {
    undoTarget.value = completion
  }

  useEscapeKey(() => {
    if (undoTarget.value) undoTarget.value = null
  })

  async function confirmUndo() {
    if (!undoTarget.value) return
    undoing.value = true
    try {
      await itemsApi.deleteCompletion(undoTarget.value.id)
      // Remove from list immediately
      completions.value = completions.value.filter((c) => c.id !== undoTarget.value!.id)
      undoTarget.value = null
    } finally {
      undoing.value = false
    }
  }
</script>

<style scoped>
  .back-link {
    font-size: 0.85rem;
    color: var(--color-text-muted);
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
    color: var(--color-text);
  }
  .history-when {
    margin-bottom: 0.25rem;
  }
  .history-due {
    color: var(--color-text-muted);
  }
  .history-amount {
    margin-top: 0.25rem;
    color: var(--color-text);
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
    margin-top: 0.6rem;
    display: flex;
    justify-content: flex-end;
  }
  .btn-sm {
    font-size: 0.78rem;
    padding: 0.2rem 0.65rem;
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

  /* ── Modal ── */
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
    max-width: 420px;
    width: 100%;
    animation: modal-in 0.15s ease;
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
</style>
