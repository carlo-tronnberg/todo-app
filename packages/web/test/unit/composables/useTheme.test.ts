import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    vi.resetModules()
  })

  afterEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    vi.resetModules()
  })

  it('defaults to dark mode when no theme stored in localStorage', async () => {
    const { useTheme } = await import('../../../src/composables/useTheme')
    const { isDark } = useTheme()
    expect(isDark.value).toBe(true)
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(localStorage.getItem('theme')).toBe('dark')
  })

  it('starts in light mode when localStorage has theme=light', async () => {
    localStorage.setItem('theme', 'light')
    const { useTheme } = await import('../../../src/composables/useTheme')
    const { isDark } = useTheme()
    expect(isDark.value).toBe(false)
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('setDark(true) applies dark theme', async () => {
    const { useTheme } = await import('../../../src/composables/useTheme')
    const { setDark, isDark } = useTheme()
    setDark(true)
    expect(isDark.value).toBe(true)
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(localStorage.getItem('theme')).toBe('dark')
  })

  it('setDark(false) applies light theme', async () => {
    const { useTheme } = await import('../../../src/composables/useTheme')
    const { setDark, isDark } = useTheme()
    setDark(false)
    expect(isDark.value).toBe(false)
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(localStorage.getItem('theme')).toBe('light')
  })

  it('toggleDark() flips from dark to light', async () => {
    const { useTheme } = await import('../../../src/composables/useTheme')
    const { setDark, toggleDark, isDark } = useTheme()
    setDark(true)
    toggleDark()
    expect(isDark.value).toBe(false)
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('toggleDark() flips from light to dark', async () => {
    const { useTheme } = await import('../../../src/composables/useTheme')
    const { setDark, toggleDark, isDark } = useTheme()
    setDark(false)
    toggleDark()
    expect(isDark.value).toBe(true)
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })
})
