import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ChangelogView from '../../../src/views/ChangelogView.vue'

describe('ChangelogView', () => {
  it('renders the heading', () => {
    const wrapper = mount(ChangelogView)
    expect(wrapper.text()).toContain('Changelog')
  })

  it('shows the latest version', () => {
    const wrapper = mount(ChangelogView)
    expect(wrapper.text()).toContain('v0.6.0')
  })

  it('lists multiple versions', () => {
    const wrapper = mount(ChangelogView)
    expect(wrapper.text()).toContain('v0.5.0')
    expect(wrapper.text()).toContain('v0.4.0')
    expect(wrapper.text()).toContain('v0.1.0')
  })

  it('shows changes for a version', () => {
    const wrapper = mount(ChangelogView)
    expect(wrapper.text()).toContain('List sharing')
  })
})
