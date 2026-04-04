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

    <!-- App info -->
    <section class="card settings-section">
      <h2>About</h2>
      <p class="section-hint">Version {{ version }}</p>
    </section>
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import { backupApi } from '../api/backup.api'

  declare const __APP_VERSION__: string
  const version = __APP_VERSION__

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
</style>
