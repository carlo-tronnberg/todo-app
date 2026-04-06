import { onMounted, onUnmounted } from 'vue'

/** Calls the given callback when the Escape key is pressed anywhere on the page. */
export function useEscapeKey(callback: () => void) {
  function handler(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      callback()
    }
  }

  onMounted(() => document.addEventListener('keydown', handler))
  onUnmounted(() => document.removeEventListener('keydown', handler))
}
