<template>
  <div class="users-page">
    <h1>Users</h1>

    <div v-if="loading" class="loading">Loading…</div>
    <div v-else-if="error" class="error-text">{{ error }}</div>

    <div v-else class="users-list card">
      <table>
        <thead>
          <tr>
            <th></th>
            <th>Name</th>
            <th>Email</th>
            <th>Username</th>
            <th>Admin</th>
            <th>Joined</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td>
              <img
                v-if="user.avatarUrl"
                :src="user.avatarUrl"
                class="user-avatar"
                referrerpolicy="no-referrer"
              />
              <span v-else class="user-avatar user-avatar-fallback">{{
                (user.firstName?.[0] || user.username[0] || '?').toUpperCase()
              }}</span>
            </td>
            <td>{{ user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : '—' }}</td>
            <td>{{ user.email }}</td>
            <td class="username-col">{{ user.username }}</td>
            <td>
              <input type="checkbox" :checked="user.isAdmin" @change="toggleAdmin(user)" />
            </td>
            <td class="date-col">{{ formatDate(user.createdAt) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { format, parseISO } from 'date-fns'
  import { adminApi, type AdminUser } from '../api/admin.api'

  const users = ref<AdminUser[]>([])
  const loading = ref(true)
  const error = ref('')

  onMounted(async () => {
    try {
      users.value = await adminApi.getUsers()
    } catch {
      error.value = 'Access denied or failed to load users.'
    } finally {
      loading.value = false
    }
  })

  async function toggleAdmin(user: AdminUser) {
    try {
      const updated = await adminApi.updateUser(user.id, { isAdmin: !user.isAdmin })
      user.isAdmin = updated.isAdmin
    } catch {
      error.value = 'Failed to update user.'
    }
  }

  function formatDate(iso: string) {
    return format(parseISO(iso), 'dd MMM yyyy')
  }
</script>

<style scoped>
  .users-page {
    max-width: 800px;
  }
  h1 {
    margin-bottom: 1.5rem;
  }
  .users-list {
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
    vertical-align: middle;
  }
  tr:last-child td {
    border-bottom: none;
  }
  .user-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    object-fit: cover;
  }
  .user-avatar-fallback {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--color-surface-sunken);
    color: var(--color-text-muted);
    font-size: 0.75rem;
    font-weight: 600;
  }
  .username-col {
    color: var(--color-text-muted);
    font-size: 0.8rem;
  }
  .date-col {
    color: var(--color-text-muted);
    font-size: 0.8rem;
    white-space: nowrap;
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
