import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import AboutView from '../../../src/views/AboutView.vue'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/about', component: AboutView },
      { path: '/changelog', component: { template: '<div />' } },
      { path: '/:pathMatch(.*)*', redirect: '/about' },
    ],
  })
}

describe('AboutView', () => {
  it('renders the heading', () => {
    const wrapper = mount(AboutView, { global: { plugins: [makeRouter()] } })
    expect(wrapper.text()).toContain('About Todo Tracker')
  })

  it('lists key features', () => {
    const wrapper = mount(AboutView, { global: { plugins: [makeRouter()] } })
    expect(wrapper.text()).toContain('Recurring tasks')
    expect(wrapper.text()).toContain('Calendar view')
    expect(wrapper.text()).toContain('Google SSO')
  })

  it('shows the version', () => {
    const wrapper = mount(AboutView, { global: { plugins: [makeRouter()] } })
    expect(wrapper.text()).toContain('Version')
  })

  it('has a link to the changelog', () => {
    const wrapper = mount(AboutView, { global: { plugins: [makeRouter()] } })
    expect(wrapper.find('a[href="/changelog"]').exists()).toBe(true)
  })
})
