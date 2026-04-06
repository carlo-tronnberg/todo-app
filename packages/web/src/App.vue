<template>
  <div id="app-root">
    <nav v-if="auth.isAuthenticated" class="nav-bar">
      <div class="nav-content">
        <span class="nav-brand">📋 Todo Tracker</span>

        <div class="nav-links">
          <router-link to="/">📋 Lists</router-link>
          <router-link to="/calendar">📅 Calendar</router-link>
          <router-link to="/audit">📜 Log</router-link>
        </div>

        <div class="nav-user">
          <router-link
            to="/profile"
            class="nav-username"
            :title="auth.user?.firstName || auth.user?.username"
          >
            <span class="hide-mobile">{{
              auth.user?.firstName || auth.user?.username || 'Profile'
            }}</span>
            <span class="show-mobile" aria-hidden="true">👤</span>
          </router-link>

          <router-link to="/settings" class="btn-icon" title="Settings">⚙</router-link>

          <!-- Dark mode toggle -->
          <button
            class="btn-icon"
            :title="theme.isDark.value ? 'Switch to light mode' : 'Switch to dark mode'"
            :aria-label="theme.isDark.value ? 'Switch to light mode' : 'Switch to dark mode'"
            @click="theme.toggleDark()"
          >
            <span v-if="theme.isDark.value">☀️</span>
            <span v-else>🌙</span>
          </button>

          <button class="btn-ghost" @click="handleLogout">Logout</button>
        </div>
      </div>
    </nav>

    <main class="main-content">
      <router-view :key="$route.fullPath" />
    </main>

    <span class="app-version">v{{ appVersion }}</span>
  </div>
</template>

<script setup lang="ts">
  import { onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { useAuthStore } from './stores/auth.store'
  import { useTheme } from './composables/useTheme'

  const auth = useAuthStore()
  const theme = useTheme()
  const router = useRouter()
  const appVersion = __APP_VERSION__

  onMounted(() => {
    auth.fetchMe()
  })

  function handleLogout() {
    auth.logout()
    router.push('/login')
  }
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

  [data-theme='dark'] .nav-bar {
    background: #1e3a5f;
  }

  .nav-content {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem 1rem;
    min-height: 56px;
    padding: 0.4rem 0;
  }
  .nav-brand {
    font-weight: 700;
    font-size: 1.1rem;
    white-space: nowrap;
    order: 1;
  }
  .nav-links {
    display: flex;
    gap: 0.25rem;
    flex: 1;
    order: 2;
  }
  .nav-links a {
    color: rgba(255, 255, 255, 0.85);
    text-decoration: none;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    transition: background 0.15s;
    white-space: nowrap;
  }
  .nav-links a:hover,
  .nav-links a.router-link-active {
    background: rgba(255, 255, 255, 0.2);
    color: white;
  }
  .nav-user {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    order: 3;
    margin-left: auto;
  }

  /* ── Mobile: links move to a second row ── */
  @media (max-width: 600px) {
    .nav-content {
      gap: 0;
      padding: 0.3rem 0;
    }
    .nav-brand {
      order: 1;
      padding: 0.3rem 0;
    }
    .nav-user {
      order: 2;
      margin-left: auto;
      padding: 0.3rem 0;
    }
    .nav-links {
      order: 3;
      width: 100%;
      flex: none;
      gap: 0;
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      padding: 0.2rem 0;
    }
    .nav-links a {
      flex: 1;
      text-align: center;
      padding: 0.4rem 0.25rem;
    }
  }
  .nav-username {
    font-size: 0.9rem;
    opacity: 0.9;
    color: white;
    text-decoration: none;
  }
  .nav-username:hover {
    text-decoration: underline;
  }

  /* Dark mode toggle icon button */
  .btn-icon {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.35);
    color: white;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 1rem;
    transition:
      background 0.15s,
      border-color 0.15s;
    flex-shrink: 0;
  }
  .btn-icon:hover {
    background: rgba(255, 255, 255, 0.18);
    border-color: rgba(255, 255, 255, 0.6);
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

  @media (max-width: 600px) {
    .main-content {
      padding: 1rem 0.75rem;
    }
  }

  .app-version {
    position: fixed;
    bottom: 0.5rem;
    right: 0.75rem;
    font-size: 0.7rem;
    color: var(--color-text-muted, #999);
    opacity: 0.6;
    pointer-events: none;
    z-index: 1;
  }
</style>
