<template>
  <div class="auth-page">
    <div class="auth-card card">
      <h1 class="auth-title">Sign In</h1>
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label class="form-label" for="email">Email</label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            class="form-input"
            autocomplete="email"
            required
          />
        </div>
        <div class="form-group">
          <label class="form-label" for="password">Password</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            class="form-input"
            autocomplete="current-password"
            required
          />
        </div>
        <p v-if="errorMsg" class="error-text" style="margin-bottom: 0.75rem">{{ errorMsg }}</p>
        <button type="submit" class="btn btn-primary" style="width: 100%" :disabled="loading">
          {{ loading ? 'Signing in…' : 'Sign In' }}
        </button>
      </form>
      <div class="auth-divider"><span>or</span></div>
      <a href="/api/auth/google" class="btn btn-google">Sign in with Google</a>
      <p class="auth-footer">No account? <router-link to="/register">Register</router-link></p>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { useAuthStore } from '../stores/auth.store'

  const auth = useAuthStore()
  const router = useRouter()

  const form = ref({ email: '', password: '' })
  const loading = ref(false)
  const errorMsg = ref('')

  async function handleSubmit() {
    loading.value = true
    errorMsg.value = ''
    try {
      await auth.login(form.value.email, form.value.password)
      router.push('/')
    } catch {
      errorMsg.value = 'Invalid email or password'
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
  .auth-divider {
    display: flex;
    align-items: center;
    margin: 1.25rem 0;
    color: var(--color-text-faint);
    font-size: 0.8rem;
  }
  .auth-divider::before,
  .auth-divider::after {
    content: '';
    flex: 1;
    border-bottom: 1px solid var(--color-border);
  }
  .auth-divider span {
    padding: 0 0.75rem;
  }
  .btn-google {
    display: block;
    width: 100%;
    text-align: center;
    padding: 0.6rem;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background: var(--color-surface);
    color: var(--color-text);
    font-size: 0.9rem;
    font-weight: 500;
    text-decoration: none;
    cursor: pointer;
    transition: background 0.15s;
  }
  .btn-google:hover {
    background: var(--color-surface-sunken);
  }
  .auth-footer {
    text-align: center;
    margin-top: 1rem;
    font-size: 0.9rem;
    color: var(--color-text-muted);
  }
</style>
