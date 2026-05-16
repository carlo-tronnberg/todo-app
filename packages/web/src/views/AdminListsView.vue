<template>
  <div class="admin-lists-page">
    <h1>All Lists</h1>

    <div v-if="loading" class="loading">Loading…</div>
    <div v-else-if="error" class="error-text">{{ error }}</div>

    <div v-else class="lists-table card">
      <table>
        <thead>
          <tr>
            <th>List</th>
            <th>Owner</th>
            <th>Shared With</th>
            <th class="count-col">Items</th>
            <th class="actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="list in lists" :key="list.id">
            <td class="list-title-cell">
              <span v-if="list.icon" class="list-icon">{{ list.icon }}</span>
              <span>{{ list.title }}</span>
            </td>
            <td>
              <div class="user-cell">
                <img
                  v-if="list.owner.avatarUrl"
                  :src="list.owner.avatarUrl"
                  class="user-avatar"
                  referrerpolicy="no-referrer"
                />
                <span v-else class="user-avatar user-avatar-fallback">{{
                  initial(list.owner)
                }}</span>
                <span class="user-label">{{ displayName(list.owner) }}</span>
              </div>
            </td>
            <td>
              <span v-if="list.shares.length === 0" class="muted">—</span>
              <div v-else class="shares-list">
                <div v-for="share in list.shares" :key="share.user.id" class="user-cell">
                  <img
                    v-if="share.user.avatarUrl"
                    :src="share.user.avatarUrl"
                    class="user-avatar"
                    referrerpolicy="no-referrer"
                  />
                  <span v-else class="user-avatar user-avatar-fallback">{{
                    initial(share.user)
                  }}</span>
                  <span class="user-label">{{ displayName(share.user) }}</span>
                  <span :class="['role-badge', `role-${share.role}`]">{{ share.role }}</span>
                </div>
              </div>
            </td>
            <td class="count-col">{{ list.itemCount }}</td>
            <td class="actions-cell">
              <button
                class="lock-toggle"
                :title="
                  isUnlocked(list.id) ? 'Lock — return row to read-only' : 'Unlock to manage shares'
                "
                @click="onLockToggle(list)"
              >
                {{ isUnlocked(list.id) ? '🔓' : '🔒' }}
              </button>
              <button
                v-if="isUnlocked(list.id)"
                class="manage-shares-btn"
                title="Manage shares"
                @click="openShareModal(list)"
              >
                🔧 Manage shares
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ── Unlock Confirmation Modal ───────────────────────────────────── -->
    <div v-if="pendingUnlock" class="modal-backdrop">
      <div
        class="modal modal--narrow card"
        role="dialog"
        aria-modal="true"
        aria-label="Confirm Unlock"
      >
        <div class="unlock-icon">🔓</div>
        <h2>Enable editing for "{{ pendingUnlock.title }}"?</h2>
        <p class="unlock-warning">
          You will be able to add or remove shares on
          <strong>{{ displayName(pendingUnlock.owner) }}</strong
          >'s list. This action is logged.
        </p>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="pendingUnlock = null">Cancel</button>
          <button class="btn btn-primary" @click="confirmUnlock">Continue</button>
        </div>
      </div>
    </div>

    <!-- ── Share Manage Modal ─────────────────────────────────────────── -->
    <ShareManageModal
      v-if="activeShareList"
      :shares="activeShareList.shares"
      @add="handleAddShare"
      @remove="handleRemoveShare"
      @update-role="handleUpdateRole"
      @close="activeShareList = null"
    />
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { adminApi, type AdminList, type AdminListUser } from '../api/admin.api'
  import { sharesApi } from '../api/shares.api'
  import ShareManageModal from '../components/ShareManageModal.vue'

  const lists = ref<AdminList[]>([])
  const loading = ref(true)
  const error = ref('')

  /** In-memory per-row unlock state. Resets on reload. */
  const unlockedIds = ref<Set<string>>(new Set())
  const pendingUnlock = ref<AdminList | null>(null)
  const activeShareList = ref<AdminList | null>(null)

  async function refresh() {
    lists.value = await adminApi.getLists()
    // Keep activeShareList in sync with the refreshed data so the modal
    // re-renders with up-to-date shares after a mutation.
    if (activeShareList.value) {
      const found = lists.value.find((l) => l.id === activeShareList.value!.id)
      activeShareList.value = found ?? null
    }
  }

  onMounted(async () => {
    try {
      await refresh()
    } catch {
      error.value = 'Access denied or failed to load lists.'
    } finally {
      loading.value = false
    }
  })

  function initial(user: AdminListUser) {
    return (user.firstName?.[0] || user.username[0] || '?').toUpperCase()
  }

  function displayName(user: AdminListUser) {
    return user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email
  }

  function isUnlocked(listId: string): boolean {
    return unlockedIds.value.has(listId)
  }

  function onLockToggle(list: AdminList) {
    if (isUnlocked(list.id)) {
      // Re-locking is immediate — no confirmation needed
      unlockedIds.value.delete(list.id)
      // If the share modal is open for this list, close it
      if (activeShareList.value?.id === list.id) activeShareList.value = null
      // Force reactivity (Set mutations aren't observed by Vue)
      unlockedIds.value = new Set(unlockedIds.value)
    } else {
      pendingUnlock.value = list
    }
  }

  function confirmUnlock() {
    if (!pendingUnlock.value) return
    unlockedIds.value.add(pendingUnlock.value.id)
    unlockedIds.value = new Set(unlockedIds.value)
    pendingUnlock.value = null
  }

  function openShareModal(list: AdminList) {
    activeShareList.value = list
  }

  async function handleAddShare(emailOrUsername: string, role: string) {
    if (!activeShareList.value) return
    await sharesApi.create(activeShareList.value.id, emailOrUsername, role)
    await refresh()
  }

  async function handleRemoveShare(shareId: string) {
    if (!activeShareList.value) return
    await sharesApi.remove(activeShareList.value.id, shareId)
    await refresh()
  }

  async function handleUpdateRole(payload: { shareId: string; role: string }) {
    if (!activeShareList.value) return
    await sharesApi.updateRole(activeShareList.value.id, payload.shareId, payload.role)
    await refresh()
  }
</script>

<style scoped>
  .admin-lists-page {
    max-width: 1000px;
  }
  h1 {
    margin-bottom: 1.5rem;
  }
  .lists-table {
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
    padding: 0.5rem 0.75rem;
    background: var(--color-surface-sunken);
    color: var(--color-text-muted);
    font-weight: 600;
    border-bottom: 1px solid var(--color-border);
  }
  td {
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid var(--color-border);
    vertical-align: top;
  }
  tr:last-child td {
    border-bottom: none;
  }
  .list-title-cell {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-weight: 500;
  }
  .list-icon {
    font-size: 1rem;
  }
  .user-cell {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    white-space: nowrap;
  }
  .shares-list {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }
  .user-avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
  }
  .user-avatar-fallback {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--color-surface-sunken);
    color: var(--color-text-muted);
    font-size: 0.7rem;
    font-weight: 600;
  }
  .user-label {
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }
  .role-badge {
    font-size: 0.7rem;
    padding: 0.1rem 0.4rem;
    border-radius: 999px;
    font-weight: 600;
    text-transform: capitalize;
  }
  .role-viewer {
    background: var(--color-surface-sunken);
    color: var(--color-text-muted);
  }
  .role-editor {
    background: #dbeafe;
    color: #1d4ed8;
  }
  .role-admin {
    background: #fef3c7;
    color: #92400e;
  }
  .count-col {
    text-align: right;
    width: 4rem;
    color: var(--color-text-muted);
  }
  .actions-col {
    width: 13rem;
  }
  .actions-cell {
    display: flex;
    gap: 0.4rem;
    align-items: center;
  }
  .lock-toggle {
    background: none;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    cursor: pointer;
    font-size: 1rem;
    padding: 0.2rem 0.45rem;
  }
  .lock-toggle:hover {
    background: var(--color-surface-sunken);
  }
  .manage-shares-btn {
    background: none;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.8rem;
    padding: 0.25rem 0.55rem;
    color: var(--color-text);
  }
  .manage-shares-btn:hover {
    background: var(--color-surface-sunken);
  }
  .muted {
    color: var(--color-text-faint);
  }
  .loading {
    text-align: center;
    padding: 2rem;
    color: var(--color-text-faint);
  }
  .error-text {
    color: var(--urgency-over-text);
    padding: 1rem;
  }

  /* ── Modal ───────────────────────────────────────────────────────── */
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
  }
  .modal--narrow {
    max-width: 420px;
    text-align: center;
  }
  .modal h2 {
    margin-bottom: 0.75rem;
    font-size: 1.1rem;
    font-weight: 600;
  }
  .modal-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
    margin-top: 1.25rem;
  }
  .unlock-icon {
    font-size: 2.2rem;
    margin-bottom: 0.5rem;
  }
  .unlock-warning {
    color: var(--color-text-muted);
    font-size: 0.88rem;
    line-height: 1.5;
  }
</style>
