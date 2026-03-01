import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import LoginView from '../../../src/views/LoginView.vue'

const { mockAuthApi } = vi.hoisted(() => ({
  mockAuthApi: { login: vi.fn(), register: vi.fn(), me: vi.fn() },
}))

vi.mock('../../../src/api/auth.api', () => ({ authApi: mockAuthApi }))

const fakeUser = { id: 'u1', email: 'a@b.com', username: 'alice', createdAt: '2024-01-01' }

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div>Home</div>' } },
      { path: '/login', component: LoginView },
      { path: '/register', component: { template: '<div>Register</div>' } },
    ],
  })
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

function mountLogin() {
  const router = makeRouter()
  const pinia = createPinia()
  setActivePinia(pinia)
  return { wrapper: mount(LoginView, { global: { plugins: [pinia, router] } }), router }
}

describe('LoginView', () => {
  it('renders email and password inputs', () => {
    const { wrapper } = mountLogin()
    expect(wrapper.find('#email').exists()).toBe(true)
    expect(wrapper.find('#password').exists()).toBe(true)
  })

  it('renders the Sign In heading', () => {
    const { wrapper } = mountLogin()
    expect(wrapper.text()).toContain('Sign In')
  })

  it('calls auth.login with form values on submit', async () => {
    mockAuthApi.login.mockResolvedValue({ token: 'tok', user: fakeUser })
    const { wrapper } = mountLogin()
    await wrapper.find('#email').setValue('a@b.com')
    await wrapper.find('#password').setValue('pass1234')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(mockAuthApi.login).toHaveBeenCalledWith({ email: 'a@b.com', password: 'pass1234' })
  })

  it('navigates to / after successful login', async () => {
    mockAuthApi.login.mockResolvedValue({ token: 'tok', user: fakeUser })
    const { wrapper, router } = mountLogin()
    await wrapper.find('#email').setValue('a@b.com')
    await wrapper.find('#password').setValue('pass1234')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('shows error message on failed login', async () => {
    mockAuthApi.login.mockRejectedValue(new Error('INVALID_CREDENTIALS'))
    const { wrapper } = mountLogin()
    await wrapper.find('#email').setValue('bad@b.com')
    await wrapper.find('#password').setValue('wrong')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('Invalid email or password')
  })

  it('disables submit button while loading', async () => {
    let resolve!: (v: any) => void
    mockAuthApi.login.mockReturnValue(new Promise((r) => (resolve = r)))
    const { wrapper } = mountLogin()
    await wrapper.find('#email').setValue('a@b.com')
    await wrapper.find('#password').setValue('pass1234')
    await wrapper.find('form').trigger('submit')
    const btn = wrapper.find('button[type="submit"]')
    expect(btn.attributes('disabled')).toBeDefined()
    resolve({ token: 'tok', user: fakeUser })
    await flushPromises()
  })
})
