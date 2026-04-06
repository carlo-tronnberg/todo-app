<template>
  <div class="modal-backdrop">
    <div class="modal card" role="dialog" aria-modal="true" aria-label="Manage Sharing">
      <h2>Manage Sharing</h2>

      <form class="share-add-form" @submit.prevent="handleAdd">
        <input
          v-model="email"
          type="email"
          class="form-input"
          placeholder="Email address…"
          required
        />
        <button type="submit" class="btn btn-primary btn-sm" :disabled="adding || !email.trim()">
          {{ adding ? 'Adding…' : 'Share' }}
        </button>
      </form>
      <p v-if="addError" class="share-error">{{ addError }}</p>

      <div v-if="shares.length === 0" class="share-empty">Not shared with anyone yet.</div>
      <ul v-else class="share-list">
        <li v-for="share in shares" :key="share.id" class="share-item">
          <img
            v-if="share.user.avatarUrl"
            :src="share.user.avatarUrl"
            class="share-avatar"
            referrerpolicy="no-referrer"
          />
          <span v-else class="share-avatar share-avatar-fallback">{{
            (share.user.firstName?.[0] || share.user.username[0] || '?').toUpperCase()
          }}</span>
          <div class="share-info">
            <span class="share-name">{{
              share.user.firstName
                ? `${share.user.firstName} ${share.user.lastName || ''}`.trim()
                : share.user.username
            }}</span>
            <span class="share-email">{{ share.user.email }}</span>
          </div>
          <button class="share-remove" title="Remove" @click="$emit('remove', share.id)">✕</button>
        </li>
      </ul>

      <div class="modal-actions">
        <button class="btn btn-secondary" @click="$emit('close')">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import type { ListShare } from '../types'
  import { useEscapeKey } from '../composables/useEscapeKey'

  defineProps<{
    shares: ListShare[]
  }>()

  const emit = defineEmits<{
    add: [email: string]
    remove: [shareId: string]
    close: []
  }>()

  useEscapeKey(() => emit('close'))

  const email = ref('')
  const adding = ref(false)
  const addError = ref('')

  async function handleAdd() {
    if (!email.value.trim()) return
    adding.value = true
    addError.value = ''
    try {
      emit('add', email.value.trim())
      email.value = ''
    } finally {
      adding.value = false
    }
  }
</script>

<style scoped>
  .share-add-form {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }
  .share-add-form .form-input {
    flex: 1;
  }
  .share-error {
    color: var(--urgency-over-text);
    font-size: 0.82rem;
    margin: -0.5rem 0 0.5rem;
  }
  .share-empty {
    color: var(--color-text-faint);
    font-size: 0.85rem;
    padding: 0.5rem 0;
  }
  .share-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .share-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.4rem 0;
    border-bottom: 1px solid var(--color-border);
  }
  .share-item:last-child {
    border-bottom: none;
  }
  .share-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
  }
  .share-avatar-fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-surface-sunken);
    color: var(--color-text-muted);
    font-weight: 600;
    font-size: 0.85rem;
  }
  .share-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .share-name {
    font-size: 0.9rem;
    font-weight: 500;
  }
  .share-email {
    font-size: 0.78rem;
    color: var(--color-text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .share-remove {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-text-faint);
    font-size: 0.85rem;
    padding: 0.2rem 0.3rem;
  }
  .share-remove:hover {
    color: var(--urgency-over-text);
  }
  .btn-sm {
    font-size: 0.82rem;
    padding: 0.3rem 0.7rem;
  }
</style>
