<template>
  <div class="profile-page">
    <h1>Profile</h1>

    <!-- Profile details form -->
    <section class="card profile-section">
      <h2>Personal details</h2>
      <form @submit.prevent="saveProfile">
        <div class="form-group">
          <label>First name</label>
          <input
            v-model="profileForm.firstName"
            type="text"
            class="form-input"
            placeholder="First name"
          />
        </div>
        <div class="form-group">
          <label>Last name</label>
          <input
            v-model="profileForm.lastName"
            type="text"
            class="form-input"
            placeholder="Last name"
          />
        </div>
        <div class="form-group">
          <label>Email</label>
          <input v-model="profileForm.email" type="email" class="form-input" required />
        </div>
        <div class="form-group">
          <label>Username</label>
          <input :value="auth.user?.username" type="text" class="form-input" disabled />
        </div>
        <div class="form-group">
          <label>Phone</label>
          <input
            v-model="profileForm.phone"
            type="tel"
            class="form-input"
            placeholder="+1 555 000 0000"
          />
        </div>
        <div v-if="profileSuccess" class="alert alert-success">Profile updated.</div>
        <div v-if="profileError" class="alert alert-error">{{ profileError }}</div>
        <button type="submit" class="btn btn-primary" :disabled="profileSaving">
          {{ profileSaving ? 'Saving…' : 'Save changes' }}
        </button>
      </form>
    </section>

    <!-- Change password form -->
    <section class="card profile-section">
      <h2>Change password</h2>
      <form @submit.prevent="changePassword">
        <div class="form-group">
          <label>Current password</label>
          <input
            v-model="pwForm.oldPassword"
            type="password"
            class="form-input"
            autocomplete="current-password"
          />
        </div>
        <div class="form-group">
          <label>New password</label>
          <input
            v-model="pwForm.newPassword"
            type="password"
            class="form-input"
            autocomplete="new-password"
          />
        </div>
        <div class="form-group">
          <label>Confirm new password</label>
          <input
            v-model="pwForm.confirmPassword"
            type="password"
            class="form-input"
            autocomplete="new-password"
          />
        </div>
        <div v-if="pwSuccess" class="alert alert-success">Password changed.</div>
        <div v-if="pwError" class="alert alert-error">{{ pwError }}</div>
        <button type="submit" class="btn btn-primary" :disabled="pwSaving">
          {{ pwSaving ? 'Changing…' : 'Change password' }}
        </button>
      </form>
    </section>
  </div>
</template>

<script setup lang="ts">
  import { reactive, ref, watch } from 'vue'
  import { useAuthStore } from '../stores/auth.store'
  import { authApi } from '../api/auth.api'

  const auth = useAuthStore()

  const profileForm = reactive({
    email: auth.user?.email ?? '',
    firstName: auth.user?.firstName ?? '',
    lastName: auth.user?.lastName ?? '',
    phone: auth.user?.phone ?? '',
  })

  const profileSaving = ref(false)
  const profileSuccess = ref(false)
  const profileError = ref('')

  const pwForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })
  const pwSaving = ref(false)
  const pwSuccess = ref(false)
  const pwError = ref('')

  // auth.user loads asynchronously (fetchMe); populate form when it arrives
  watch(
    () => auth.user,
    (user) => {
      if (user) {
        profileForm.email = user.email
        profileForm.firstName = user.firstName ?? ''
        profileForm.lastName = user.lastName ?? ''
        profileForm.phone = user.phone ?? ''
      }
    },
    { immediate: true }
  )

  async function saveProfile() {
    profileError.value = ''
    profileSuccess.value = false
    profileSaving.value = true
    try {
      await auth.updateProfile({
        email: profileForm.email || null,
        firstName: profileForm.firstName || null,
        lastName: profileForm.lastName || null,
        phone: profileForm.phone || null,
      })
      profileSuccess.value = true
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      profileError.value =
        msg === 'EMAIL_IN_USE' ? 'That email is already in use.' : 'Failed to save profile.'
    } finally {
      profileSaving.value = false
    }
  }

  async function changePassword() {
    pwError.value = ''
    pwSuccess.value = false
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      pwError.value = 'New passwords do not match.'
      return
    }
    if (pwForm.newPassword.length < 8) {
      pwError.value = 'New password must be at least 8 characters.'
      return
    }
    pwSaving.value = true
    try {
      await authApi.changePassword({
        oldPassword: pwForm.oldPassword,
        newPassword: pwForm.newPassword,
      })
      pwSuccess.value = true
      pwForm.oldPassword = ''
      pwForm.newPassword = ''
      pwForm.confirmPassword = ''
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status
      pwError.value =
        status === 401 ? 'Current password is incorrect.' : 'Failed to change password.'
    } finally {
      pwSaving.value = false
    }
  }
</script>

<style scoped>
  .profile-page {
    max-width: 520px;
  }
  h1 {
    margin-bottom: 1.5rem;
  }
  .profile-section {
    margin-bottom: 1.5rem;
  }
  .profile-section h2 {
    margin-top: 0;
    font-size: 1.05rem;
    margin-bottom: 1rem;
  }
  .form-group {
    margin-bottom: 0.85rem;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }
  .form-group label {
    font-size: 0.85rem;
    color: var(--color-text-muted);
    font-weight: 500;
  }
  .form-input {
    padding: 0.45rem 0.7rem;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background: var(--color-surface);
    color: var(--color-text);
    font-size: 0.9rem;
  }
  .form-input:disabled {
    opacity: 0.55;
    cursor: not-allowed;
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
