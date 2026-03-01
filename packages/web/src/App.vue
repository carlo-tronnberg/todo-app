<template>
  <div id="app-root">
    <nav v-if="auth.isAuthenticated" class="nav-bar">
      <div class="nav-content">
        <span class="nav-brand">Todo Tracker</span>
        <div class="nav-links">
          <router-link to="/">Lists</router-link>
          <router-link to="/calendar">Calendar</router-link>
        </div>
        <div class="nav-user">
          <span class="nav-username">{{ auth.user?.username }}</span>
          <button class="btn-ghost" @click="auth.logout()">Logout</button>
        </div>
      </div>
    </nav>

    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
  import { onMounted } from 'vue'
  import { useAuthStore } from './stores/auth.store'

  const auth = useAuthStore()

  onMounted(() => {
    auth.fetchMe()
  })
</script>

<style scoped>
  .nav-bar {
    background: #3b82f6;
    color: white;
    padding: 0 1rem;
    position: sticky;
    top: 0;
    z-index: 100;
  }
  .nav-content {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    gap: 1rem;
    height: 56px;
  }
  .nav-brand {
    font-weight: 700;
    font-size: 1.1rem;
  }
  .nav-links {
    display: flex;
    gap: 1rem;
    flex: 1;
  }
  .nav-links a {
    color: rgba(255, 255, 255, 0.85);
    text-decoration: none;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    transition: background 0.15s;
  }
  .nav-links a:hover,
  .nav-links a.router-link-active {
    background: rgba(255, 255, 255, 0.2);
    color: white;
  }
  .nav-user {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .nav-username {
    font-size: 0.9rem;
    opacity: 0.9;
  }
  .btn-ghost {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.5);
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85rem;
    transition: background 0.15s;
  }
  .btn-ghost:hover {
    background: rgba(255, 255, 255, 0.15);
  }
  .main-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1.5rem 1rem;
  }
</style>
