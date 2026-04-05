<template>
  <div>
    <div class="comments-bar">
      <button class="comments-toggle" @click="toggle">
        {{
          isOpen
            ? '▲ Hide comments'
            : `▼ Comments${comments.length || initialCount ? ` (${comments.length || initialCount})` : ''}`
        }}
      </button>
    </div>

    <div v-if="isOpen" class="comments-section">
      <div v-if="loading" class="comments-loading">Loading…</div>
      <template v-else>
        <div v-if="!comments.length" class="comments-empty">No comments yet.</div>
        <div v-for="c in comments" :key="c.id" class="comment-row">
          <p class="comment-content">{{ c.content }}</p>
          <div class="comment-meta">
            <span>{{ formatDate(c.createdAt) }}</span>
            <button class="comment-delete" title="Delete comment" @click="$emit('delete', c.id)">
              ✕
            </button>
          </div>
        </div>
        <form class="comment-form" @submit.prevent="handleAdd">
          <input
            v-model="newText"
            type="text"
            class="form-input comment-input"
            placeholder="Add a comment…"
          />
          <button type="submit" class="btn btn-secondary btn-sm">Add</button>
        </form>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import { format, parseISO } from 'date-fns'
  import type { ItemComment } from '../types'

  defineProps<{
    comments: ItemComment[]
    loading: boolean
    isOpen: boolean
    initialCount: number
  }>()

  const emit = defineEmits<{
    toggle: []
    add: [text: string]
    delete: [commentId: string]
  }>()

  const newText = ref('')

  function toggle() {
    emit('toggle')
  }

  function handleAdd() {
    const text = newText.value.trim()
    if (!text) return
    emit('add', text)
    newText.value = ''
  }

  function formatDate(iso: string) {
    return format(parseISO(iso), 'dd MMM yyyy HH:mm')
  }
</script>

<style scoped>
  .comments-bar {
    padding: 0 1rem;
  }
  .comments-toggle {
    background: none;
    border: none;
    font-size: 0.78rem;
    color: var(--color-text-faint);
    cursor: pointer;
    padding: 0.2rem 0;
  }
  .comments-toggle:hover {
    color: var(--color-text-muted);
  }
  .comments-section {
    padding: 0.5rem 1rem 0.75rem;
    border-top: 1px solid var(--color-border);
    margin-top: 0.35rem;
  }
  .comments-loading,
  .comments-empty {
    font-size: 0.82rem;
    color: var(--color-text-faint);
  }
  .comment-row {
    margin-bottom: 0.5rem;
  }
  .comment-content {
    margin: 0;
    font-size: 0.85rem;
  }
  .comment-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.72rem;
    color: var(--color-text-faint);
    margin-top: 0.1rem;
  }
  .comment-delete {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-text-faint);
    font-size: 0.7rem;
    padding: 0;
  }
  .comment-delete:hover {
    color: var(--urgency-over-text);
  }
  .comment-form {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }
  .comment-input {
    flex: 1;
    font-size: 0.85rem;
    padding: 0.3rem 0.5rem;
  }
  .btn-sm {
    font-size: 0.78rem;
    padding: 0.2rem 0.65rem;
  }
</style>
