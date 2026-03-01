import { ref, readonly } from 'vue'

// Module-level singleton so all callers share the same state
// Default is dark mode unless the user has explicitly chosen light
const isDark = ref(localStorage.getItem('theme') !== 'light')

function applyTheme(dark: boolean) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  localStorage.setItem('theme', dark ? 'dark' : 'light')
}

// Apply persisted preference immediately on module load
applyTheme(isDark.value)

export function useTheme() {
  function toggleDark() {
    isDark.value = !isDark.value
    applyTheme(isDark.value)
  }

  function setDark(value: boolean) {
    isDark.value = value
    applyTheme(value)
  }

  return {
    isDark: readonly(isDark),
    toggleDark,
    setDark,
  }
}
