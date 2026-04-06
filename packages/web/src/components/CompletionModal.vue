<template>
  <div class="modal-backdrop" @keydown.escape="$emit('cancel')">
    <div class="modal card" role="dialog" aria-modal="true" aria-label="Complete Item">
      <h2>Complete Item</h2>
      <div class="form-group completion-amount">
        <label class="form-label">Amount</label>
        <div class="amount-row">
          <input
            ref="amountRef"
            :value="amount"
            type="number"
            step="0.01"
            min="0"
            class="form-input"
            placeholder="0.00"
            style="max-width: 8rem"
            @input="$emit('update:amount', ($event.target as HTMLInputElement).value)"
            @keydown.enter.prevent="$emit('confirm')"
          />
          <select
            :value="currency"
            class="form-input"
            style="max-width: 5.5rem"
            @change="$emit('update:currency', ($event.target as HTMLSelectElement).value)"
          >
            <option value="">—</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="SEK">SEK</option>
            <option value="DKK">DKK</option>
            <option value="HUF">HUF</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Transaction type</label>
        <select
          :value="transactionType"
          class="form-input"
          @change="$emit('update:transactionType', ($event.target as HTMLSelectElement).value)"
        >
          <option value="">— None —</option>
          <option v-for="tt in transactionTypes" :key="tt.id" :value="tt.name">
            {{ tt.name }}
          </option>
        </select>
      </div>
      <p style="margin-bottom: 0.5rem; color: #64748b">Add an optional note for this completion:</p>
      <div class="form-group">
        <textarea
          :value="note"
          class="form-input"
          rows="3"
          placeholder="Note (optional)"
          @input="$emit('update:note', ($event.target as HTMLTextAreaElement).value)"
          @keydown.enter.prevent="$emit('confirm')"
        />
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" @click="$emit('cancel')">Cancel</button>
        <button class="btn btn-primary" @click="$emit('confirm')">Complete</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import type { TransactionType } from '../types'

  defineProps<{
    amount: string
    currency: string
    transactionType: string
    transactionTypes: TransactionType[]
    note: string
  }>()

  defineEmits<{
    'update:amount': [value: string]
    'update:currency': [value: string]
    'update:transactionType': [value: string]
    'update:note': [value: string]
    confirm: []
    cancel: []
  }>()

  const amountRef = ref<HTMLInputElement | null>(null)

  onMounted(() => {
    amountRef.value?.focus()
  })
</script>

<style scoped>
  .amount-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
</style>
