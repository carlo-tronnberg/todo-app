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
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { adminApi, type AdminList, type AdminListUser } from '../api/admin.api'

  const lists = ref<AdminList[]>([])
  const loading = ref(true)
  const error = ref('')

  onMounted(async () => {
    try {
      lists.value = await adminApi.getLists()
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
</script>

<style scoped>
  .admin-lists-page {
    max-width: 900px;
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
</style>
