<template>
  <div>
    <div class="dashboard-header">
      <h1>My Lists</h1>
      <button class="btn btn-primary" @click="openCreate">+ New List</button>
    </div>

    <div v-if="listsStore.loading" class="loading">Loading…</div>

    <div v-else-if="listsStore.lists.length === 0" class="empty-state card">
      <p>No lists yet. Create your first one!</p>
    </div>

    <div v-else class="lists-grid">
      <div v-for="list in sortedLists" :key="list.id" class="list-card card">
        <!-- Clickable body navigates to the list -->
        <div class="list-card-body" @click="$router.push(`/lists/${list.id}`)">
          <h2 class="list-title">{{ list.icon ? `${list.icon} ` : '' }}{{ list.title }}</h2>
          <p v-if="list.description" class="list-desc">{{ list.description }}</p>
          <div class="list-stats">
            <span v-if="list.uncompletedThisMonth" class="stat-badge">
              {{ list.uncompletedThisMonth }} due this month
            </span>
          </div>
          <div v-if="list.upcomingItems?.length" class="upcoming-items">
            <div v-for="item in list.upcomingItems" :key="item.id" class="upcoming-chip">
              <span class="upcoming-title">{{ item.title }}</span>
              <span class="upcoming-date">{{ formatDate(item.dueDate) }}</span>
            </div>
          </div>
          <span class="list-date">Created {{ formatDate(list.createdAt) }}</span>
        </div>

        <!-- Per-card action bar -->
        <div class="list-card-actions">
          <button class="card-action-btn" title="Edit list" @click.stop="openEdit(list)">
            ✎ Edit
          </button>
          <button
            class="card-action-btn card-action-btn--danger"
            title="Delete list"
            @click.stop="openDelete(list)"
          >
            🗑 Delete
          </button>
        </div>
      </div>
    </div>

    <!-- ── Create Modal ───────────────────────────────────────────── -->
    <div v-if="showCreateModal" class="modal-backdrop">
      <div class="modal card" role="dialog" aria-modal="true" aria-label="New List">
        <h2>New List</h2>
        <form @submit.prevent="handleCreateList">
          <div class="form-group">
            <label class="form-label">Title *</label>
            <input
              ref="createTitleInput"
              v-model="form.title"
              type="text"
              class="form-input"
              required
              maxlength="255"
            />
          </div>
          <div class="form-group">
            <label class="form-label">Description (optional)</label>
            <input v-model="form.description" type="text" class="form-input" maxlength="1000" />
          </div>
          <div class="form-group">
            <label class="form-label">Default currency (optional)</label>
            <select v-model="form.defaultCurrency" class="form-input" style="max-width: 120px">
              <option value="">— None —</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="SEK">SEK</option>
              <option value="DKK">DKK</option>
              <option value="HUF">HUF</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Icon (emoji, optional)</label>
            <input
              v-model="form.icon"
              type="text"
              class="form-input"
              style="max-width: 80px"
              placeholder="🇸🇪"
              maxlength="4"
            />
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="closeModals">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="!form.title.trim()">
              Create
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ── Edit Modal ─────────────────────────────────────────────── -->
    <div v-if="showEditModal" class="modal-backdrop">
      <div class="modal card" role="dialog" aria-modal="true" aria-label="Edit List">
        <h2>Edit List</h2>
        <form @submit.prevent="handleUpdateList">
          <div class="form-group">
            <label class="form-label">Title *</label>
            <input
              ref="editTitleInput"
              v-model="form.title"
              type="text"
              class="form-input"
              required
              maxlength="255"
            />
          </div>
          <div class="form-group">
            <label class="form-label">Description (optional)</label>
            <input v-model="form.description" type="text" class="form-input" maxlength="1000" />
          </div>
          <div class="form-group">
            <label class="form-label">Default currency (optional)</label>
            <select v-model="form.defaultCurrency" class="form-input" style="max-width: 120px">
              <option value="">— None —</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="SEK">SEK</option>
              <option value="DKK">DKK</option>
              <option value="HUF">HUF</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Icon (emoji, optional)</label>
            <input
              v-model="form.icon"
              type="text"
              class="form-input"
              style="max-width: 80px"
              placeholder="🇸🇪"
              maxlength="4"
            />
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="closeModals">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="!form.title.trim()">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ── Delete Confirmation Modal ─────────────────────────────── -->
    <div v-if="showDeleteModal && deletingList" class="modal-backdrop">
      <div
        class="modal modal--narrow card"
        role="dialog"
        aria-modal="true"
        aria-label="Delete List"
      >
        <div class="delete-icon">🗑</div>
        <h2>Delete "{{ deletingList.title }}"?</h2>
        <p class="delete-warning">
          This will permanently delete the list and
          <strong>all its items and completion history</strong>. This action cannot be undone.
        </p>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="closeModals">Cancel</button>
          <button class="btn btn-danger" :disabled="deleting" @click="handleDeleteList">
            {{ deleting ? 'Deleting…' : 'Delete permanently' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, nextTick, onMounted } from 'vue'
  import { useEscapeKey } from '../composables/useEscapeKey'
  import { format } from 'date-fns'
  import { useListsStore } from '../stores/lists.store'
  import type { TodoList } from '../types'

  const listsStore = useListsStore()

  const sortedLists = computed(() =>
    [...listsStore.lists].sort((a, b) => a.title.localeCompare(b.title))
  )

  // ── Modal state ─────────────────────────────────────────────────────────────
  const showCreateModal = ref(false)
  const showEditModal = ref(false)
  const showDeleteModal = ref(false)

  const editingList = ref<TodoList | null>(null)
  const deletingList = ref<TodoList | null>(null)
  const deleting = ref(false)

  const form = ref({ title: '', description: '', defaultCurrency: '', icon: '' })

  const createTitleInput = ref<HTMLInputElement | null>(null)
  const editTitleInput = ref<HTMLInputElement | null>(null)

  // ── Lifecycle ───────────────────────────────────────────────────────────────
  onMounted(() => listsStore.fetchLists())

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function formatDate(iso: string) {
    return format(new Date(iso), 'dd MMM yyyy')
  }

  useEscapeKey(() => {
    if (showDeleteModal.value || showEditModal.value || showCreateModal.value) {
      closeModals()
    }
  })

  function closeModals() {
    showCreateModal.value = false
    showEditModal.value = false
    showDeleteModal.value = false
    editingList.value = null
    deletingList.value = null
    deleting.value = false
    form.value = { title: '', description: '', defaultCurrency: '', icon: '' }
  }

  // ── Open modals ──────────────────────────────────────────────────────────────
  function openCreate() {
    form.value = { title: '', description: '', defaultCurrency: '', icon: '' }
    showCreateModal.value = true
    nextTick(() => createTitleInput.value?.focus())
  }

  function openEdit(list: TodoList) {
    editingList.value = list
    form.value = {
      title: list.title,
      description: list.description ?? '',
      defaultCurrency: list.defaultCurrency ?? '',
      icon: list.icon ?? '',
    }
    showEditModal.value = true
    nextTick(() => editTitleInput.value?.focus())
  }

  function openDelete(list: TodoList) {
    deletingList.value = list
    showDeleteModal.value = true
  }

  // ── Actions ──────────────────────────────────────────────────────────────────
  async function handleCreateList() {
    if (!form.value.title.trim()) return
    await listsStore.createList(
      form.value.title.trim(),
      form.value.description.trim() || undefined,
      form.value.defaultCurrency.trim().toUpperCase() || undefined,
      form.value.icon.trim() || undefined
    )
    closeModals()
  }

  async function handleUpdateList() {
    if (!editingList.value || !form.value.title.trim()) return
    await listsStore.updateList(editingList.value.id, {
      title: form.value.title.trim(),
      description: form.value.description.trim() || undefined,
      defaultCurrency: form.value.defaultCurrency.trim().toUpperCase() || null,
      icon: form.value.icon.trim() || null,
    })
    closeModals()
  }

  async function handleDeleteList() {
    if (!deletingList.value) return
    deleting.value = true
    try {
      await listsStore.deleteList(deletingList.value.id)
      closeModals()
    } finally {
      deleting.value = false
    }
  }
</script>

<style scoped>
  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  /* ── Grid ── */
  .lists-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
  }

  /* ── Card ── */
  .list-card {
    display: flex;
    flex-direction: column;
    gap: 0;
    transition:
      box-shadow 0.15s,
      transform 0.15s;
    padding: 0;
    overflow: hidden;
  }
  .list-card:hover {
    box-shadow: var(--shadow-card-hover);
    transform: translateY(-2px);
  }

  .list-card-body {
    padding: 1rem;
    cursor: pointer;
    flex: 1;
  }
  .list-card-body:hover {
    background: rgba(59, 130, 246, 0.04);
  }

  .list-title {
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 0.25rem;
    color: var(--color-text);
  }
  .list-desc {
    color: var(--color-text-muted);
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
    /* Clamp to 2 lines */
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .list-date {
    font-size: 0.8rem;
    color: var(--color-text-faint);
  }

  /* ── Card action bar ── */
  .list-card-actions {
    display: flex;
    border-top: 1px solid var(--color-border);
  }
  .card-action-btn {
    flex: 1;
    background: transparent;
    border: none;
    padding: 0.5rem;
    font-size: 0.8rem;
    color: var(--color-text-muted);
    cursor: pointer;
    transition:
      background 0.15s,
      color 0.15s;
  }
  .card-action-btn:hover {
    background: var(--color-surface-sunken);
    color: var(--color-text);
  }
  .card-action-btn + .card-action-btn {
    border-left: 1px solid var(--color-border);
  }
  .card-action-btn--danger:hover {
    background: var(--urgency-over-bg);
    color: var(--urgency-over-text);
  }

  /* ── List stats ── */
  .list-stats {
    margin: 0.25rem 0 0.4rem;
    min-height: 1.2em;
  }
  .stat-badge {
    display: inline-block;
    font-size: 0.75rem;
    font-weight: 600;
    background: var(--urgency-high-bg, #fef3c7);
    color: var(--urgency-high-text, #92400e);
    border-radius: 999px;
    padding: 0.1rem 0.55rem;
  }
  .upcoming-items {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    margin-bottom: 0.5rem;
  }
  .upcoming-chip {
    display: flex;
    justify-content: space-between;
    font-size: 0.78rem;
    color: var(--color-text-muted);
    gap: 0.5rem;
    overflow: hidden;
  }
  .upcoming-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .upcoming-date {
    flex-shrink: 0;
    color: var(--color-text-faint);
  }

  /* ── Misc ── */
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

  /* ── Modals ── */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
    padding: 1rem;
  }
  .modal {
    width: 100%;
    max-width: 480px;
    animation: modal-in 0.15s ease;
  }
  .modal--narrow {
    max-width: 400px;
    text-align: center;
  }
  @keyframes modal-in {
    from {
      opacity: 0;
      transform: scale(0.96) translateY(8px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
  .modal h2 {
    margin-bottom: 1rem;
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--color-text);
  }
  .modal-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
    margin-top: 1.25rem;
  }
  .modal--narrow .modal-actions {
    justify-content: center;
  }

  /* Delete confirmation specifics */
  .delete-icon {
    font-size: 2.5rem;
    margin-bottom: 0.75rem;
  }
  .delete-warning {
    color: var(--color-text-muted);
    font-size: 0.9rem;
    line-height: 1.5;
    margin-bottom: 0.5rem;
  }
</style>
