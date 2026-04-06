<template>
  <div id="app-root">
    <nav v-if="auth.isAuthenticated" class="nav-bar">
      <div class="nav-content">
        <router-link to="/" class="nav-brand">📋 Todo Tracker</router-link>

        <div class="nav-links">
          <router-link to="/">📋 Lists</router-link>
          <router-link to="/calendar">📅 Calendar</router-link>
          <router-link to="/audit">📜 Log</router-link>
        </div>

        <div class="nav-right">
          <button class="avatar-btn" @click="toggleMenu">
            <img
              v-if="auth.user?.avatarUrl"
              :src="auth.user.avatarUrl"
              :alt="auth.user?.firstName || 'User'"
              class="avatar-img"
              referrerpolicy="no-referrer"
            />
            <span v-else class="avatar-fallback">{{
              (auth.user?.firstName?.[0] || auth.user?.username?.[0] || '?').toUpperCase()
            }}</span>
          </button>

          <div v-if="menuOpen" class="dropdown avatar-dropdown" @click="menuOpen = false">
            <div class="dropdown-header">
              {{ auth.user?.firstName || auth.user?.username || 'User' }}
            </div>
            <router-link to="/profile" class="dropdown-item">👤 Profile</router-link>
            <router-link to="/settings" class="dropdown-item">⚙ Settings</router-link>
            <router-link to="/about" class="dropdown-item">ℹ️ About</router-link>
            <button class="dropdown-item dropdown-logout" @click="handleLogout">🚪 Logout</button>
          </div>
        </div>
      </div>
    </nav>

    <main class="main-content">
      <router-view :key="$route.fullPath" />
    </main>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted, onUnmounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { useAuthStore } from './stores/auth.store'
  import './composables/useTheme' // Initialize theme on app load

  const auth = useAuthStore()
  const router = useRouter()

  const menuOpen = ref(false)

  function closeMenu(e: MouseEvent) {
    const target = e.target as HTMLElement
    if (menuOpen.value && !target.closest('.avatar-dropdown') && !target.closest('.avatar-btn')) {
      menuOpen.value = false
    }
  }

  onMounted(() => {
    auth.fetchMe()
    document.addEventListener('click', closeMenu)
  })
  onUnmounted(() => document.removeEventListener('click', closeMenu))

  function toggleMenu() {
    menuOpen.value = !menuOpen.value
  }

  function handleLogout() {
    auth.logout()
    router.push('/login')
  }
</script>

<style>
  /* Prevent layout shift when scrollbar appears/disappears */
  html {
    overflow-y: scroll;
  }
</style>

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
    gap: 0.5rem 0.75rem;
    min-height: 48px;
  }
  .nav-brand {
    font-weight: 700;
    font-size: 1.05rem;
    white-space: nowrap;
    text-decoration: none;
    color: inherit;
  }

  /* Center: nav links */
  .nav-links {
    display: flex;
    gap: 0.25rem;
    flex: 1;
    justify-content: center;
  }
  .nav-links a {
    color: rgba(255, 255, 255, 0.85);
    text-decoration: none;
    padding: 0.25rem 0.6rem;
    border-radius: 4px;
    transition: background 0.15s;
    white-space: nowrap;
    font-size: 0.9rem;
  }
  .nav-links a:hover,
  .nav-links a.router-link-active {
    background: rgba(255, 255, 255, 0.2);
    color: white;
  }

  /* Right: avatar */
  .nav-right {
    position: relative;
    margin-left: auto;
  }
  .avatar-btn {
    background: none;
    border: 2px solid rgba(255, 255, 255, 0.5);
    border-radius: 50%;
    width: 36px;
    height: 36px;
    cursor: pointer;
    padding: 0;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: border-color 0.15s;
  }
  .avatar-btn:hover {
    border-color: white;
  }
  .avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .avatar-fallback {
    color: white;
    font-weight: 700;
    font-size: 0.9rem;
  }

  /* Dropdowns */
  .dropdown {
    position: absolute;
    background: var(--color-surface, white);
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    min-width: 180px;
    padding: 0.35rem 0;
    z-index: 200;
  }
  .avatar-dropdown {
    top: 100%;
    right: 0;
    margin-top: 0.25rem;
  }
  .dropdown-header {
    padding: 0.5rem 0.85rem 0.35rem;
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--color-text-muted);
    border-bottom: 1px solid var(--color-border);
    margin-bottom: 0.25rem;
  }
  .dropdown-item {
    display: block;
    width: 100%;
    padding: 0.45rem 0.85rem;
    font-size: 0.88rem;
    color: var(--color-text);
    text-decoration: none;
    background: none;
    border: none;
    text-align: left;
    cursor: pointer;
    transition: background 0.1s;
  }
  .dropdown-item:hover {
    background: var(--color-surface-sunken);
  }
  .dropdown-logout {
    border-top: 1px solid var(--color-border);
    margin-top: 0.25rem;
    padding-top: 0.5rem;
  }
  .main-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1.5rem 1rem;
  }

  @media (max-width: 600px) {
    .nav-content {
      gap: 0;
      padding: 0.25rem 0;
    }
    .nav-brand {
      order: 1;
    }
    .nav-right {
      order: 2;
      margin-left: auto;
    }
    .nav-links {
      order: 3;
      width: 100%;
      justify-content: center;
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      padding: 0.25rem 0;
      gap: 0;
    }
    .nav-links a {
      flex: 1;
      text-align: center;
      padding: 0.3rem 0.25rem;
      font-size: 0.82rem;
    }
    .main-content {
      padding: 1rem 0.75rem;
    }
  }
</style>
