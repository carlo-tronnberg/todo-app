import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { useEscapeKey } from '../../../src/composables/useEscapeKey'

function makeTestComponent(callback: () => void) {
  return defineComponent({
    setup() {
      useEscapeKey(callback)
      return {}
    },
    template: '<div>test</div>',
  })
}

describe('useEscapeKey', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls callback when Escape is pressed', async () => {
    const callback = vi.fn()
    const wrapper = mount(makeTestComponent(callback))
    await flushPromises()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(callback).toHaveBeenCalledOnce()

    wrapper.unmount()
  })

  it('does not call callback for other keys', async () => {
    const callback = vi.fn()
    const wrapper = mount(makeTestComponent(callback))
    await flushPromises()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
    expect(callback).not.toHaveBeenCalled()

    wrapper.unmount()
  })

  it('removes listener on unmount', async () => {
    const callback = vi.fn()
    const wrapper = mount(makeTestComponent(callback))
    await flushPromises()

    wrapper.unmount()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(callback).not.toHaveBeenCalled()
  })
})
