<template>
  <div class="auth-page">
    <div class="auth-card card">
      <h1 class="auth-title">Create Account</h1>
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label class="form-label" for="username">Username</label>
          <input id="username" v-model="form.username" type="text" class="form-input" required />
        </div>
        <div class="form-group">
          <label class="form-label" for="email">Email</label>
          <input id="email" v-model="form.email" type="email" class="form-input" required />
        </div>
        <div class="form-group">
          <label class="form-label" for="password">Password (min 8 chars)</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            class="form-input"
            minlength="8"
            required
          />
        </div>
        <p v-if="errorMsg" class="error-text" style="margin-bottom: 0.75rem">{{ errorMsg }}</p>
        <button type="submit" class="btn btn-primary" style="width: 100%" :disabled="loading">
          {{ loading ? 'Creating account…' : 'Register' }}
        </button>
      </form>
      <p class="auth-footer">
        Already have an account? <router-link to="/login">Sign in</router-link>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { useAuthStore } from '../stores/auth.store'

  const auth = useAuthStore()
  const router = useRouter()

  const form = ref({ username: '', email: '', password: '' })
  const loading = ref(false)
  const errorMsg = ref('')

  async function handleSubmit() {
    loading.value = true
    errorMsg.value = ''
    try {
      await auth.register(form.value.email, form.value.username, form.value.password)
      router.push('/')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      errorMsg.value = err?.response?.data?.message ?? 'Registration failed'
    } finally {
      loading.value = false
    }
  }
</script>

<style scoped>
  .auth-page {
    min-height: 80vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }
  .auth-card {
    width: 100%;
    max-width: 400px;
  }
  .auth-title {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 1.5rem;
    text-align: center;
  }
  .auth-footer {
    text-align: center;
    margin-top: 1rem;
    font-size: 0.9rem;
    color: var(--color-text-muted);
  }
</style>
