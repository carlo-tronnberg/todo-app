<template>
  <div>
    <div class="dashboard-header">
      <h1>My Lists</h1>
      <button class="btn btn-primary" @click="showCreateModal = true">+ New List</button>
    </div>

    <div v-if="listsStore.loading" class="loading">Loading…</div>

    <div v-else-if="listsStore.lists.length === 0" class="empty-state card">
      <p>No lists yet. Create your first one!</p>
    </div>

    <div v-else class="lists-grid">
      <router-link
        v-for="list in listsStore.lists"
        :key="list.id"
        :to="`/lists/${list.id}`"
        class="list-card card"
      >
        <h2 class="list-title">{{ list.title }}</h2>
        <p v-if="list.description" class="list-desc">{{ list.description }}</p>
        <span class="list-date">Created {{ formatDate(list.createdAt) }}</span>
      </router-link>
    </div>

    <!-- Create List Modal -->
    <div v-if="showCreateModal" class="modal-backdrop" @click.self="showCreateModal = false">
      <div class="modal card">
        <h2>New List</h2>
        <form @submit.prevent="handleCreateList">
          <div class="form-group">
            <label class="form-label">Title</label>
            <input v-model="newList.title" type="text" class="form-input" required autofocus />
          </div>
          <div class="form-group">
            <label class="form-label">Description (optional)</label>
            <input v-model="newList.description" type="text" class="form-input" />
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="showCreateModal = false">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary">Create</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { format } from 'date-fns'
  import { useListsStore } from '../stores/lists.store'

  const listsStore = useListsStore()

  const showCreateModal = ref(false)
  const newList = ref({ title: '', description: '' })

  onMounted(() => listsStore.fetchLists())

  function formatDate(iso: string) {
    return format(new Date(iso), 'dd MMM yyyy')
  }

  async function handleCreateList() {
    await listsStore.createList(newList.value.title, newList.value.description || undefined)
    showCreateModal.value = false
    newList.value = { title: '', description: '' }
  }
</script>

<style scoped>
  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }
  .lists-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
  }
  .list-card {
    display: block;
    text-decoration: none;
    color: inherit;
    transition: box-shadow 0.15s, transform 0.15s;
  }
  .list-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }
  .list-title {
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 0.25rem;
  }
  .list-desc {
    color: #64748b;
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
  }
  .list-date {
    font-size: 0.8rem;
    color: #94a3b8;
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
    max-width: 480px;
  }
  .modal h2 {
    margin-bottom: 1rem;
    font-size: 1.2rem;
    font-weight: 600;
  }
  .modal-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
    margin-top: 1rem;
  }
</style>
