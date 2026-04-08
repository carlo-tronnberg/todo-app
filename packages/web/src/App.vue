<template>
  <div id="app-root">
    <nav v-if="auth.isAuthenticated" ref="navBar" class="nav-bar">
      <div class="nav-top-row">
        <router-link to="/" class="nav-brand">📋 Todo Tracker</router-link>
        <div class="nav-right">
          <span class="nav-username">{{ auth.user?.firstName || auth.user?.username || '' }}</span>
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
              {{
                auth.user?.firstName
                  ? `${auth.user.firstName} ${auth.user.lastName || ''}`.trim()
                  : auth.user?.username || 'User'
              }}
            </div>
            <router-link to="/profile" class="dropdown-item">👤 Profile</router-link>
            <router-link v-if="auth.user?.isAdmin" to="/users" class="dropdown-item">
              👥 All Users
            </router-link>
            <router-link v-if="auth.user?.isAdmin" to="/admin/lists" class="dropdown-item">
              📋 All Lists
            </router-link>
            <router-link to="/settings" class="dropdown-item">⚙ Settings</router-link>
            <router-link to="/about" class="dropdown-item">ℹ️ About</router-link>
            <button class="dropdown-item dropdown-logout" @click="handleLogout">🚪 Logout</button>
          </div>
        </div>
      </div>
      <div class="nav-links">
        <router-link to="/">📋 Lists</router-link>
        <router-link to="/calendar">📅 Calendar</router-link>
        <router-link to="/audit">📜 Log</router-link>
      </div>
    </nav>

    <main class="main-content">
      <router-view :key="$route.fullPath" />
    </main>
    <div class="app-version">v{{ appVersion }}</div>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted, onUnmounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { useAuthStore } from './stores/auth.store'
  import './composables/useTheme' // Initialize theme on app load

  const auth = useAuthStore()
  const router = useRouter()
  const appVersion = __APP_VERSION__

  const menuOpen = ref(false)
  const navBar = ref<HTMLElement | null>(null)

  function updateNavHeight() {
    if (navBar.value) {
      document.documentElement.style.setProperty('--nav-height', `${navBar.value.offsetHeight}px`)
    }
  }

  function closeMenu(e: MouseEvent) {
    const target = e.target as HTMLElement
    if (menuOpen.value && !target.closest('.avatar-dropdown') && !target.closest('.avatar-btn')) {
      menuOpen.value = false
    }
  }

  let resizeObserver: ResizeObserver | null = null

  onMounted(() => {
    auth.fetchMe()
    document.addEventListener('click', closeMenu)
    updateNavHeight()
    if (navBar.value) {
      resizeObserver = new ResizeObserver(updateNavHeight)
      resizeObserver.observe(navBar.value)
    }
  })
  onUnmounted(() => {
    document.removeEventListener('click', closeMenu)
    resizeObserver?.disconnect()
  })

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
  .nav-top-row {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 44px;
    padding: 0.2rem 0;
  }
  .nav-brand {
    font-weight: 700;
    font-size: 1.05rem;
    white-space: nowrap;
    text-decoration: none;
    color: inherit;
  }
  .nav-links {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    justify-content: center;
    gap: 0.25rem;
    border-top: 1px solid rgba(255, 255, 255, 0.15);
    padding: 0.2rem 0;
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
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .nav-username {
    color: rgba(255, 255, 255, 0.9);
    font-size: 0.88rem;
    white-space: nowrap;
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
  .app-version {
    position: fixed;
    bottom: 0.4rem;
    right: 0.6rem;
    font-size: 0.7rem;
    color: var(--color-text-muted, #94a3b8);
    pointer-events: none;
    z-index: 50;
  }

  @media (max-width: 600px) {
    .main-content {
      padding: 1rem 0.75rem;
    }
    .nav-links a {
      font-size: 0.82rem;
      padding: 0.25rem 0.35rem;
    }
  }
</style>
