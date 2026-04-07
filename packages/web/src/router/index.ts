import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth.store'

const router = createRouter({
  history: createWebHistory('/todo/'),
  scrollBehavior(to, _from, savedPosition) {
    /* c8 ignore next 3 */
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('../views/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/register',
      name: 'Register',
      component: () => import('../views/RegisterView.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      name: 'Dashboard',
      component: () => import('../views/DashboardView.vue'),
    },
    {
      path: '/lists/:listId',
      name: 'ListDetail',
      component: () => import('../views/ListDetailView.vue'),
    },
    {
      path: '/calendar',
      name: 'Calendar',
      component: () => import('../views/CalendarView.vue'),
    },
    {
      path: '/history/:itemId',
      name: 'ItemHistory',
      component: () => import('../views/HistoryView.vue'),
    },
    {
      path: '/profile',
      name: 'Profile',
      component: () => import('../views/ProfileView.vue'),
    },
    {
      path: '/audit',
      name: 'AuditLog',
      component: () => import('../views/AuditLogView.vue'),
    },
    {
      path: '/settings',
      name: 'Settings',
      component: () => import('../views/SettingsView.vue'),
    },
    {
      path: '/users',
      name: 'Users',
      component: () => import('../views/UsersView.vue'),
    },
    {
      path: '/about',
      name: 'About',
      component: () => import('../views/AboutView.vue'),
    },
    {
      path: '/changelog',
      name: 'Changelog',
      component: () => import('../views/ChangelogView.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  // Handle Google SSO callback: /?token=...
  const token = to.query.token as string | undefined
  if (token) {
    localStorage.setItem('auth_token', token)
    auth.token = token
    auth.fetchMe()
    // Remove token from URL and go to dashboard
    return { name: 'Dashboard' }
  }

  if (!to.meta.public && !auth.isAuthenticated) {
    return { name: 'Login' }
  }
  if (to.meta.public && auth.isAuthenticated) {
    return { name: 'Dashboard' }
  }
})

export default router
