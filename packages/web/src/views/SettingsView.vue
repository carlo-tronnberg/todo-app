<template>
  <div class="settings-page">
    <h1>Settings</h1>

    <!-- Backup / Restore -->
    <section class="card settings-section">
      <h2>Backup &amp; Restore</h2>
      <p class="section-hint">
        Download all your lists, items, completions, comments, and audit logs as a JSON file. You
        can restore it here to migrate to a new database or recover data.
      </p>

      <div class="backup-actions">
        <button class="btn btn-secondary" :disabled="backupBusy" @click="downloadBackup">
          {{ backupBusy ? 'Preparing…' : '⬇ Download backup' }}
        </button>

        <label class="btn btn-secondary restore-label">
          {{ restoreBusy ? 'Restoring…' : '⬆ Restore from file' }}
          <input
            type="file"
            accept=".json,application/json"
            class="restore-file-input"
            :disabled="restoreBusy"
            @change="handleRestoreFile"
          />
        </label>
      </div>

      <div v-if="backupError" class="alert alert-error">{{ backupError }}</div>
      <div v-if="restoreResult" class="alert alert-success">
        Restored {{ restoreResult.lists }} list(s) and {{ restoreResult.items }} item(s).
        <router-link to="/">Go to lists</router-link>
      </div>
      <div v-if="restoreError" class="alert alert-error">{{ restoreError }}</div>
    </section>

    <!-- Transaction Types -->
    <section class="card settings-section">
      <h2>Transaction Types</h2>
      <p class="section-hint">
        Configure the transaction types available when creating or completing items.
      </p>
      <div v-if="txTypesLoading" class="loading">Loading…</div>
      <ul v-else class="tx-list">
        <li v-for="tt in txTypes" :key="tt.id" class="tx-item">
          <span>{{ tt.name }}</span>
          <button class="tx-delete" title="Remove" @click="removeTxType(tt.id)">✕</button>
        </li>
      </ul>
      <form class="tx-add-form" @submit.prevent="addTxType">
        <input v-model="newTxName" type="text" class="form-input" placeholder="New type…" />
        <button type="submit" class="btn btn-secondary btn-sm" :disabled="!newTxName.trim()">
          Add
        </button>
      </form>
    </section>

    <!-- Appearance -->
    <section class="card settings-section">
      <h2>Appearance</h2>
      <div class="theme-toggle">
        <span>Theme</span>
        <button class="btn btn-secondary btn-sm" @click="theme.toggleDark()">
          {{ theme.isDark.value ? '☀️ Switch to light mode' : '🌙 Switch to dark mode' }}
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { backupApi } from '../api/backup.api'
  import { transactionTypesApi } from '../api/transaction-types.api'
  import { useTheme } from '../composables/useTheme'
  import type { TransactionType } from '../types'

  const theme = useTheme()

  // Transaction types
  const txTypes = ref<TransactionType[]>([])
  const txTypesLoading = ref(true)
  const newTxName = ref('')

  onMounted(async () => {
    try {
      txTypes.value = await transactionTypesApi.getAll()
    } finally {
      txTypesLoading.value = false
    }
  })

  async function addTxType() {
    const name = newTxName.value.trim()
    if (!name) return
    const created = await transactionTypesApi.create(name)
    txTypes.value = [...txTypes.value, created].sort((a, b) => a.name.localeCompare(b.name))
    newTxName.value = ''
  }

  async function removeTxType(id: string) {
    await transactionTypesApi.remove(id)
    txTypes.value = txTypes.value.filter((t) => t.id !== id)
  }

  const backupBusy = ref(false)
  const backupError = ref('')
  const restoreBusy = ref(false)
  const restoreResult = ref<{ lists: number; items: number } | null>(null)
  const restoreError = ref('')

  async function downloadBackup() {
    backupError.value = ''
    backupBusy.value = true
    try {
      await backupApi.download()
    } catch {
      backupError.value = 'Failed to download backup.'
    } finally {
      backupBusy.value = false
    }
  }

  async function handleRestoreFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return
    restoreError.value = ''
    restoreResult.value = null
    restoreBusy.value = true
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      restoreResult.value = await backupApi.restore(data)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } }; message?: string })
        ?.response?.data?.message
      restoreError.value = msg ?? 'Failed to restore backup. Make sure the file is a valid backup.'
    } finally {
      restoreBusy.value = false
      ;(event.target as HTMLInputElement).value = ''
    }
  }
</script>

<style scoped>
  .settings-page {
    max-width: 520px;
  }
  h1 {
    margin-bottom: 1.5rem;
  }
  .settings-section {
    margin-bottom: 1.5rem;
  }
  .settings-section h2 {
    margin-top: 0;
    font-size: 1.05rem;
    margin-bottom: 1rem;
  }
  .section-hint {
    font-size: 0.85rem;
    color: var(--color-text-muted);
    margin-bottom: 1rem;
    line-height: 1.5;
  }
  .backup-actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-bottom: 0.75rem;
  }
  .restore-label {
    cursor: pointer;
    position: relative;
  }
  .restore-file-input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
    width: 100%;
  }
  .alert {
    padding: 0.45rem 0.75rem;
    border-radius: 6px;
    font-size: 0.85rem;
    margin-bottom: 0.75rem;
  }
  .alert-success {
    background: var(--urgency-low-bg);
    color: var(--urgency-low-text);
  }
  .alert-error {
    background: var(--urgency-over-bg);
    color: var(--urgency-over-text);
  }
  .tx-list {
    list-style: none;
    padding: 0;
    margin: 0 0 0.75rem;
  }
  .tx-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.35rem 0;
    border-bottom: 1px solid var(--color-border);
    font-size: 0.9rem;
  }
  .tx-item:last-child {
    border-bottom: none;
  }
  .tx-delete {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-text-faint);
    font-size: 0.8rem;
    padding: 0.1rem 0.3rem;
  }
  .tx-delete:hover {
    color: var(--urgency-over-text);
  }
  .tx-add-form {
    display: flex;
    gap: 0.5rem;
  }
  .tx-add-form .form-input {
    flex: 1;
  }
  .btn-sm {
    font-size: 0.78rem;
    padding: 0.2rem 0.65rem;
  }
  .theme-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.9rem;
  }
</style>
